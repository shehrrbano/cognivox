import os, subprocess

project = r"c:\Users\USER\OneDrive\Desktop\AIproject"
tauri = os.path.join(project, "src-tauri")

# Check if exe exists
exe = os.path.join(tauri, "target", "debug", "cognivox.exe")
print(f"EXE_EXISTS: {os.path.exists(exe)}")

# Read build log
log_path = os.path.join(project, "build_log.txt")
if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    print(f"LOG_SIZE: {len(content)} chars")
    # Print last 3000 chars to see end of build
    if len(content) > 3000:
        print("... (showing last 3000 chars)")
        print(content[-3000:])
    else:
        print(content)
else:
    print("NO_BUILD_LOG")

# Check running processes
for name in ['cargo', 'rustc', 'cmake', 'cl']:
    r = subprocess.run(['tasklist', '/FI', f'IMAGENAME eq {name}.exe'], capture_output=True, text=True)
    lines = [l for l in r.stdout.strip().split('\n') if name in l.lower()]
    if lines:
        print(f"RUNNING: {name} - {lines}")
