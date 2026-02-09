@echo off
echo === COGNIVOX BUILD STARTED ===
set LIBCLANG_PATH=D:\llvm\bin
set PATH=C:\Program Files\CMake\bin;C:\msys64\mingw64\bin;C:\msys64\usr\bin;%PATH%
cd /d c:\Users\USER\OneDrive\Desktop\AIproject\src-tauri

echo.
echo Checking tools:
where cmake 2>nul && echo [OK] cmake found || echo [FAIL] cmake not found
where gcc 2>nul && echo [OK] gcc found || echo [FAIL] gcc not found
where cl 2>nul && echo [OK] cl (MSVC) found || echo [FAIL] cl not found (may need VS Developer prompt)
echo LIBCLANG_PATH=%LIBCLANG_PATH%
echo.

echo Starting cargo build...
cargo build 2>&1
echo.
echo === BUILD EXIT CODE: %ERRORLEVEL% ===
if exist target\debug\cognivox.exe (
    echo [SUCCESS] cognivox.exe exists!
    dir target\debug\cognivox.exe
) else (
    echo [FAIL] cognivox.exe not found
)
echo === BUILD COMPLETE ===
pause
