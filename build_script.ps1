$ErrorActionPreference = "Continue"
$logFile = "C:\Users\USER\OneDrive\Desktop\AIproject\buildlog.txt"

"=== BUILD START $(Get-Date) ===" | Out-File $logFile

$env:LIBCLANG_PATH = "D:\llvm\bin"
$env:PATH = "C:\Program Files\CMake\bin;C:\msys64\mingw64\bin;C:\msys64\usr\bin;" + $env:PATH

Set-Location "C:\Users\USER\OneDrive\Desktop\AIproject\src-tauri"

# Check tools
"Checking tools..." | Tee-Object -FilePath $logFile -Append
$cmakePath = Get-Command cmake -ErrorAction SilentlyContinue
if ($cmakePath) { "  cmake: $($cmakePath.Source)" | Tee-Object -FilePath $logFile -Append }
else { "  cmake: NOT FOUND" | Tee-Object -FilePath $logFile -Append }

$gccPath = Get-Command gcc -ErrorAction SilentlyContinue  
if ($gccPath) { "  gcc: $($gccPath.Source)" | Tee-Object -FilePath $logFile -Append }
else { "  gcc: NOT FOUND" | Tee-Object -FilePath $logFile -Append }

"  LIBCLANG_PATH: $env:LIBCLANG_PATH" | Tee-Object -FilePath $logFile -Append
"" | Tee-Object -FilePath $logFile -Append

# Run cargo build
"Running cargo build..." | Tee-Object -FilePath $logFile -Append
$buildOutput = & cargo build 2>&1 | Out-String
$buildOutput | Out-File $logFile -Append
$exitCode = $LASTEXITCODE
"EXIT CODE: $exitCode" | Tee-Object -FilePath $logFile -Append

# Check result
if (Test-Path "target\debug\cognivox.exe") {
    "SUCCESS: cognivox.exe exists!" | Tee-Object -FilePath $logFile -Append
} else {
    "FAIL: cognivox.exe not found" | Tee-Object -FilePath $logFile -Append
}
"=== BUILD END $(Get-Date) ===" | Out-File $logFile -Append
