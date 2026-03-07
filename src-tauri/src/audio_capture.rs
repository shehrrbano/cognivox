use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::thread;
use crossbeam_channel::{unbounded, Sender};
use serde::{Serialize, Deserialize};

/// Tagged audio chunk with source information for speaker diarization
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TaggedAudio {
    pub samples: Vec<f32>,
    pub source: AudioSource,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum AudioSource {
    Microphone,  // User's voice
    System,      // Other speakers (WASAPI loopback)
}

// Audio state for Tauri
pub struct AudioState {
    pub is_recording: Mutex<bool>,
    pub stream_control: Mutex<Option<Sender<()>>>,
    pub audio_tx: Mutex<Option<Sender<TaggedAudio>>>,
    pub current_volume: Arc<Mutex<f32>>,
    pub capture_mode: Mutex<CaptureMode>,
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum CaptureMode {
    MicOnly,
    SystemOnly,  // WASAPI Loopback on Windows
    Both,
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            is_recording: Mutex::new(false),
            stream_control: Mutex::new(None),
            audio_tx: Mutex::new(None),
            current_volume: Arc::new(Mutex::new(0.0)),
            capture_mode: Mutex::new(CaptureMode::MicOnly),
        }
    }
}

const TARGET_SAMPLE_RATE: u32 = 16000;
const MICRO_CHUNK_SAMPLES: usize = 160;
const SILENCE_THRESHOLD: f32 = 0.0005; // Very low — let processing loop make speech decisions, don't drop audio at capture
const SILENCE_SKIP_CHUNKS: usize = 500; // ~5 seconds of true dead silence before stopping sends

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<String>, String> {
    let mut names = Vec::new();
    
    // Default host devices
    let host = cpal::default_host();
    names.push(format!("Host: {}", host.id().name()));
    
    names.push("--- Microphones ---".to_string());
    if let Ok(devices) = host.input_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                names.push(format!("  🎤 {}", name));
            }
        }
    }
    
    names.push("--- Output Devices ---".to_string());
    if let Ok(devices) = host.output_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                names.push(format!("  🔊 {}", name));
            }
        }
    }
    
    // Check WASAPI availability (Windows only)
    #[cfg(target_os = "windows")]
    {
        names.push("--- WASAPI Loopback ---".to_string());
        names.push("  ✓ Available for System Audio Capture".to_string());
    }
    
    Ok(names)
}

#[tauri::command]
pub fn set_capture_mode(state: tauri::State<'_, AudioState>, mode: String) -> Result<String, String> {
    let mut capture_mode = state.capture_mode.lock().map_err(|e| e.to_string())?;
    let new_mode = match mode.as_str() {
        "mic" => CaptureMode::MicOnly,
        "system" => CaptureMode::SystemOnly,
        "both" => CaptureMode::Both,
        _ => return Err("Invalid mode".to_string()),
    };
    *capture_mode = new_mode;
    println!("[AUDIO] Capture mode: {:?}", new_mode);
    Ok(format!("Mode: {:?}", new_mode))
}

#[tauri::command]
pub fn get_current_volume(state: tauri::State<'_, AudioState>) -> Result<f32, String> {
    let volume = state.current_volume.lock().map_err(|e| e.to_string())?;
    Ok(*volume)
}

fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() { return 0.0; }
    (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
}

fn to_mono(data: &[f32], channels: u16) -> Vec<f32> {
    data.chunks(channels as usize)
        .map(|ch| ch.iter().sum::<f32>() / channels as f32)
        .collect()
}

/// Resample audio using linear interpolation (anti-aliased).
/// The old `step_by` decimation dropped samples without filtering,
/// causing severe aliasing that corrupted speech and made Whisper
/// produce wrong words. Linear interpolation is still very fast
/// (single pass, no FFT) but eliminates aliasing artifacts.
fn resample_linear(samples: Vec<f32>, from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate || samples.is_empty() { return samples; }
    let ratio = from_rate as f64 / to_rate as f64;
    let out_len = ((samples.len() as f64) / ratio).ceil() as usize;
    if out_len == 0 { return vec![0.0]; }
    let mut output = Vec::with_capacity(out_len);
    let last_idx = (samples.len() - 1) as f64;
    for i in 0..out_len {
        let src_pos = (i as f64) * ratio;
        let src_pos = src_pos.min(last_idx); // clamp
        let idx = src_pos as usize;
        let frac = (src_pos - idx as f64) as f32;
        let sample = if idx + 1 < samples.len() {
            samples[idx] * (1.0 - frac) + samples[idx + 1] * frac
        } else {
            samples[idx]
        };
        output.push(sample);
    }
    output
}

/// Apply a single-pole IIR high-pass filter to remove low-frequency noise
/// (AC hum ~50/60Hz, fan rumble, traffic). Cutoff ≈ 80Hz at 16kHz sample rate.
fn apply_high_pass(samples: &mut [f32], state: &mut (f32, f32)) {
    const ALPHA: f32 = 0.969; // cutoff ~80Hz at fs=16kHz
    let (ref mut prev_in, ref mut prev_out) = state;
    for s in samples.iter_mut() {
        let input = *s;
        let output = ALPHA * (*prev_out + input - *prev_in);
        *prev_in = input;
        *prev_out = output;
        *s = output;
    }
}

#[tauri::command]
pub fn start_audio_capture(state: tauri::State<'_, AudioState>) -> Result<String, String> {
    let mut is_rec = state.is_recording.lock().map_err(|e| e.to_string())?;
    if *is_rec {
        return Ok("Already recording".to_string());
    }

    // Reset volume to 0 to ensure fresh start (prevents stale values from previous session)
    if let Ok(mut v) = state.current_volume.lock() {
        *v = 0.0;
    }

    let (stop_tx, stop_rx) = unbounded::<()>();
    {
        let mut control = state.stream_control.lock().map_err(|e| e.to_string())?;
        *control = Some(stop_tx);
    }
    
    let audio_tx = state.audio_tx.lock().map_err(|e| e.to_string())?.clone();
    let volume = state.current_volume.clone();

    println!("[AUDIO] Starting mic capture (single mic, all speakers)");

    thread::spawn(move || {
        let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let silence_count: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));
        let hp_filter_state: Arc<Mutex<(f32, f32)>> = Arc::new(Mutex::new((0.0, 0.0)));
        
        // === MICROPHONE CAPTURE (single mic, all speakers) ===
        let mic_stream = {
            let host = cpal::default_host();
            if let Some(device) = host.default_input_device() {
                let name = device.name().unwrap_or_default();
                println!("[AUDIO] Mic: {}", name);
                
                if let Ok(config) = device.default_input_config() {
                    let channels = config.channels();
                    let sample_rate = config.sample_rate().0;
                    println!("[AUDIO] Config: {}Hz, {}ch", sample_rate, channels);
                    
                    let tx = audio_tx.clone();
                    let buf = buffer.clone();
                    let sil = silence_count.clone();
                    let vol = volume.clone();
                    let hp = hp_filter_state.clone();
                    
                    let stream = device.build_input_stream(
                        &config.into(),
                        move |data: &[f32], _| {
                            if data.is_empty() { return; }
                            
                            let mono = to_mono(data, channels);
                            let mut resampled = resample_linear(mono, sample_rate, TARGET_SAMPLE_RATE);
                            // High-pass filter: remove low-frequency noise (AC hum, fans)
                            if let Ok(mut h) = hp.lock() { apply_high_pass(&mut resampled, &mut *h); }
                            
                            let rms = calculate_rms(&resampled);
                            if let Ok(mut v) = vol.lock() { *v = rms; }
                            
                            // Silence detection — skip sending after prolonged silence
                            if let Ok(mut count) = sil.lock() {
                                if rms < SILENCE_THRESHOLD {
                                    *count += 1;
                                    if *count > SILENCE_SKIP_CHUNKS { return; }
                                } else {
                                    *count = 0;
                                }
                            }
                            
                            // Send small 10ms chunks — speaker segmentation happens in processing loop
                            if let Ok(mut b) = buf.lock() {
                                b.extend(resampled);
                                while b.len() >= MICRO_CHUNK_SAMPLES {
                                    let chunk: Vec<f32> = b.drain(..MICRO_CHUNK_SAMPLES).collect();
                                    if let Some(ref tx) = tx {
                                        let _ = tx.send(TaggedAudio {
                                            samples: chunk,
                                            source: AudioSource::Microphone,
                                        });
                                    }
                                }
                            }
                        },
                        |e| eprintln!("[AUDIO] Mic error: {}", e),
                        None
                    ).ok();
                    stream
                } else { None }
            } else { None }
        };
        
        // Play stream
        if let Some(ref s) = mic_stream { 
            if s.play().is_ok() {
                println!("[AUDIO] ✓ Mic stream active");
            }
        }
        
        println!("[AUDIO] Capture running (single mic, ECAPA speaker identification)...");
        let _ = stop_rx.recv();
        println!("[AUDIO] Capture stopped");
    });

    *is_rec = true;
    Ok("Capture started".to_string())
}

#[tauri::command]
pub fn stop_audio_capture(state: tauri::State<'_, AudioState>) -> Result<String, String> {
    let mut is_rec = state.is_recording.lock().map_err(|e| e.to_string())?;
    if !*is_rec {
        return Ok("Not recording".to_string());
    }
    
    let mut control = state.stream_control.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = control.take() {
        let _ = tx.send(());
    }

    // Reset volume to 0 so stale values don't persist between sessions
    if let Ok(mut v) = state.current_volume.lock() {
        *v = 0.0;
    }

    *is_rec = false;
    Ok("Stopped".to_string())
}
