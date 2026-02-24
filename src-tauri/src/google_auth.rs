// ============================================================================
// GOOGLE OAUTH FOR DESKTOP (Tauri)
// ============================================================================
// Since Tauri's webview blocks popups, we implement the standard desktop OAuth
// flow: open system browser → user signs in → redirect to localhost → capture
// auth code → exchange for tokens.
//
// This uses Google's OAuth 2.0 for Desktop Apps flow.
// ============================================================================

use reqwest;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;

// ============================================================================
// CONFIGURATION
// ============================================================================
// Secrets are loaded from the .env file at the project root.
// See .env.example for the required variables:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//
// To find these:
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Select your Firebase project
// 3. Find the Web client OAuth 2.0 Client ID
// 4. Copy the Client ID and Client Secret into .env
// ============================================================================

fn get_google_client_id() -> String {
    std::env::var("GOOGLE_CLIENT_ID")
        .expect("GOOGLE_CLIENT_ID not set in .env file")
}

fn get_google_client_secret() -> String {
    std::env::var("GOOGLE_CLIENT_SECRET")
        .expect("GOOGLE_CLIENT_SECRET not set in .env file")
}

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";

// Fixed port for the OAuth redirect so it can be pre-registered in Google Cloud Console.
// You MUST add http://127.0.0.1:19836 as an Authorized Redirect URI in your OAuth client.
const OAUTH_REDIRECT_PORT: u16 = 19836;

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleTokenResponse {
    pub access_token: String,
    pub id_token: Option<String>,
    pub token_type: String,
    pub expires_in: u64,
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OAuthResult {
    pub id_token: String,
    pub access_token: String,
    pub email: Option<String>,
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Start the Google OAuth flow for desktop:
/// 1. Bind a temporary local HTTP server
/// 2. Open system browser to Google's consent screen
/// 3. Wait for the redirect with the auth code
/// 4. Exchange the auth code for tokens
/// 5. Return the ID token to the frontend
#[tauri::command]
pub async fn start_google_oauth() -> Result<OAuthResult, String> {
    println!("[OAuth] Starting Google OAuth flow for desktop...");

    // Step 1: Bind a local TCP listener on the fixed OAuth port
    // Using a fixed port so the redirect URI can be pre-registered in Google Cloud Console
    let listener = TcpListener::bind(format!("127.0.0.1:{}", OAUTH_REDIRECT_PORT))
        .map_err(|e| format!("Failed to bind OAuth server on port {} (is another sign-in in progress?): {}", OAUTH_REDIRECT_PORT, e))?;
    let redirect_uri = format!("http://127.0.0.1:{}", OAUTH_REDIRECT_PORT);

    println!("[OAuth] Redirect URI: {}", redirect_uri);

    // Step 2: Construct the Google OAuth URL
    let client_id = get_google_client_id();
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&login_hint={}",
        GOOGLE_AUTH_URL,
        urlencoding(&client_id),
        urlencoding(&redirect_uri),
        urlencoding("openid email profile"),
        urlencoding("bscs23f05@namal.edu.pk")
    );

    println!("[OAuth] Opening browser for authentication...");

    // Step 3: Open the system browser
    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;

    // Step 4: Wait for the callback (with timeout)
    // Set a timeout so we don't block forever
    listener
        .set_nonblocking(false)
        .map_err(|e| format!("Failed to set blocking mode: {}", e))?;

    println!("[OAuth] Waiting for OAuth callback on port {}...", OAUTH_REDIRECT_PORT);

    // Loop to handle the OAuth callback — browsers may send extra requests (favicon etc.)
    let code;
    loop {
        let (mut stream, _) = listener
            .accept()
            .map_err(|e| format!("Failed to accept connection: {}", e))?;

        // Read the HTTP request
        let mut reader = BufReader::new(&stream);
        let mut request_line = String::new();
        reader
            .read_line(&mut request_line)
            .map_err(|e| format!("Failed to read request: {}", e))?;

        println!("[OAuth] Received request: {}", request_line.trim());

        // Skip non-OAuth requests (favicon, etc.)
        if !request_line.contains("code=") && !request_line.contains("error=") {
            let empty_response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(empty_response.as_bytes());
            let _ = stream.flush();
            continue;
        }

        // Extract the authorization code from the URL
        match extract_code_from_request(&request_line) {
            Ok(extracted_code) => {
                code = extracted_code;

                // Send a success response to the browser
                send_success_response(&mut stream);
                break;
            }
            Err(e) => {
                // Send error response and return the error
                let error_html = format!("<html><body><h1>Authentication Failed</h1><p>{}</p></body></html>", e);
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    error_html.len(), error_html
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();
                return Err(e);
            }
        }
    }

    // Drop the listener
    drop(listener);

    println!("[OAuth] Got authorization code, exchanging for tokens...");

    // Step 5: Exchange the authorization code for tokens
    let token_response = exchange_code_for_tokens(&code, &redirect_uri).await?;

    let id_token = token_response
        .id_token
        .ok_or("Google did not return an ID token. Make sure 'openid' scope is included.")?;

    // Decode the email from the ID token (JWT)
    let email = extract_email_from_id_token(&id_token);

    println!(
        "[OAuth] Successfully authenticated: {}",
        email.as_deref().unwrap_or("unknown")
    );

    Ok(OAuthResult {
        id_token,
        access_token: token_response.access_token,
        email,
    })
}

// ============================================================================
// HELPERS
// ============================================================================

/// Simple URL encoding (percent-encoding)
fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "%20".to_string(),
            '@' => "%40".to_string(),
            ':' => "%3A".to_string(),
            '/' => "%2F".to_string(),
            '+' => "%2B".to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
}

/// Extract the authorization code from the HTTP request line
fn extract_code_from_request(request_line: &str) -> Result<String, String> {
    // Request line looks like: GET /?code=4/xxx&scope=... HTTP/1.1
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return Err("Invalid HTTP request".to_string());
    }

    let path = parts[1]; // e.g., /?code=4/xxx&scope=...

    // Check for error
    if path.contains("error=") {
        let error = path
            .split('&')
            .find(|p| p.contains("error="))
            .and_then(|p| p.split('=').nth(1))
            .unwrap_or("unknown_error");
        return Err(format!("OAuth error: {}", error));
    }

    // Extract code parameter
    let query = path.split('?').nth(1).ok_or("No query parameters in callback")?;
    
    for param in query.split('&') {
        if let Some(code) = param.strip_prefix("code=") {
            // URL-decode the code — Google encodes characters like / as %2F
            let decoded = urldecoding(code);
            return Ok(decoded);
        }
    }

    Err("No authorization code found in callback".to_string())
}

/// Simple URL decoding (percent-decoding)
fn urldecoding(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            } else {
                result.push('%');
                result.push_str(&hex);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

/// Exchange the authorization code for access token + ID token
async fn exchange_code_for_tokens(
    code: &str,
    redirect_uri: &str,
) -> Result<GoogleTokenResponse, String> {
    let client = reqwest::Client::new();

    println!("[OAuth] Exchanging code (len={}) for redirect_uri={}", code.len(), redirect_uri);

    let client_id = get_google_client_id();
    let client_secret = get_google_client_secret();
    let params = [
        ("code", code),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {}", e))?;

    let status = response.status();
    println!("[OAuth] Token endpoint responded with status: {}", status);

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        println!("[OAuth] Token exchange error: {}", error_text);
        return Err(format!("Token exchange failed ({}): {}", status, error_text));
    }

    let token_response: GoogleTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    println!("[OAuth] Token exchange successful, got id_token={}", token_response.id_token.is_some());
    Ok(token_response)
}

/// Send a styled success response to the browser
fn send_success_response(stream: &mut std::net::TcpStream) {
    let success_html = r#"<!DOCTYPE html>
<html>
<head>
    <title>Cognivox - Sign In Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
        }
        .card {
            text-align: center; padding: 3rem;
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 1rem;
            box-shadow: 0 0 40px rgba(6, 182, 212, 0.1);
        }
        h1 { color: #06b6d4; margin-bottom: 0.5rem; }
        p { color: #94a3b8; }
        .checkmark { font-size: 4rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <div class="checkmark">&#10003;</div>
        <h1>Signed In Successfully!</h1>
        <p>You can close this tab and return to Cognivox.</p>
        <p style="margin-top: 1rem; font-size: 0.8rem; color: #64748b;">
            Session data will be stored in Google Cloud Firestore.
        </p>
    </div>
</body>
</html>"#;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        success_html.len(),
        success_html
    );

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

/// Extract email from a JWT ID token (without verification - Firebase will verify)
fn extract_email_from_id_token(id_token: &str) -> Option<String> {
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }

    // Decode the payload (second part)
    let payload = parts[1];
    // Add padding if necessary
    let padded = match payload.len() % 4 {
        2 => format!("{}==", payload),
        3 => format!("{}=", payload),
        _ => payload.to_string(),
    };

    let decoded = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload,
    )
    .or_else(|_| {
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &padded)
    })
    .ok()?;

    let json_str = String::from_utf8(decoded).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&json_str).ok()?;

    parsed.get("email").and_then(|e| e.as_str()).map(String::from)
}
