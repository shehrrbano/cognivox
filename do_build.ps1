$ErrorActionPreference = "Continue"
$logFile = "C:\Users\USER\OneDrive\Desktop\AIproject\cargo_build_result.txt"

"=== BUILD START $(Get-Date) ===" > $logFile

$env:LIBCLANG_PATH = "D:\llvm\bin"
$env:PATH = "C:\Program Files\CMake\bin;C:\msys64\mingw64\bin;C:\msys64\usr\bin;" + $env:PATH

Set-Location "C:\Users\USER\OneDrive\Desktop\AIproject\src-tauri"

# Kill any stale processes
Get-Process -Name cargo,rustc,cmake -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

"Tools:" >> $logFile
"  cmake: $((Get-Command cmake -EA SilentlyContinue).Source)" >> $logFile  
"  gcc: $((Get-Command gcc -EA SilentlyContinue).Source)" >> $logFile
"  LIBCLANG_PATH: $env:LIBCLANG_PATH" >> $logFile

"Starting build..." >> $logFile
& cargo build 2>&1 | ForEach-Object { $_ >> $logFile; $_ }
"EXIT: $LASTEXITCODE" >> $logFile

if (Test-Path "target\debug\cognivox.exe") {
    "SUCCESS" >> $logFile
} else {
    "FAILED - no exe" >> $logFile
}
"=== BUILD END $(Get-Date) ===" >> $logFile
