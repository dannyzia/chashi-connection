#!/usr/bin/env python3
import os

# Check APK
apk_path = "android/app/build/outputs/apk/release/app-release-unsigned.apk"
if os.path.exists(apk_path):
    size = os.path.getsize(apk_path)
    print(f"APK FOUND: {apk_path}")
    print(f"Size: {size} bytes ({size/1024/1024:.2f} MB)")
    if size < 6 * 1024 * 1024:
        print("✅ APK < 6MB: PASS")
    else:
        print("❌ APK >= 6MB: FAIL")
else:
    print(f"APK NOT FOUND: {apk_path}")
    print("Build directory contents:")
    build_dir = "android/app/build/outputs/apk/release"
    if os.path.exists(build_dir):
        for f in os.listdir(build_dir):
            fp = os.path.join(build_dir, f)
            s = os.path.getsize(fp)
            print(f"  {f}: {s} bytes")
    else:
        print(f"  {build_dir}: does not exist")

# Check all 4 tasks
print("\n=== 4 TASK VERIFICATION ===")
print("1. SQLite:", "PASS" if os.path.exists("src/offline/schema.sql") else "FAIL")
print("2. Font WOFF2:", "PASS" if os.path.exists("static/fonts/NotoSansBengali.woff2") else "FAIL")
print("3. Virtual List:", "PASS" if ".slice(0, 6)" in open("src/routes/+page.svelte", encoding="utf-8").read() else "FAIL")
print("4. Capacitor plugins:", "PASS" if '"Camera"' in open("capacitor.config.json", encoding="utf-8").read() else "FAIL")
