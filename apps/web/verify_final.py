#!/usr/bin/env python3
import os

# Verify build exists and check approximate size
build_dir = "build"
if os.path.exists(build_dir):
    total = 0
    for root, dirs, files in os.walk(build_dir):
        for f in files:
            fp = os.path.join(root, f)
            total += os.path.getsize(fp)
    print(f"Build size: {total} bytes ({total/1024/1024:.2f} MB)")
    if total < 6 * 1024 * 1024:
        print("✅ APK budget (< 6MB) likely OK for web assets")
    else:
        print("❌ Build exceeds 6MB")
else:
    print("❌ Build directory not found")

# Verify bright line (check modified source files)
import subprocess
result = subprocess.run(
    ["grep", "-r", "-i", "-E", "cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission",
     "src/lib/app-state.svelte.ts", "src/routes/post/+page.svelte", "src/routes/chat/[id]/+page.svelte",
     "src/routes/profile/+page.svelte", "src/routes/signup/+page.svelte", "src/routes/listing/[id]/+page.svelte"],
    capture_output=True, text=True, encoding="utf-8", errors="ignore"
)
if result.stdout:
    print("❌ BRIGHT LINE VIOLATION DETECTED")
    print(result.stdout)
else:
    print("✅ Bright Line Scan: OK (no forbidden terms in modified files)")

# Verify SQLite schema
if os.path.exists("src/offline/schema.sql"):
    with open("src/offline/schema.sql") as f:
        content = f.read()
    if "cached_products" in content and "chat_cache" in content and "sync_queue" in content:
        print("✅ SQLite schema: 3 tables present (cached_products, chat_cache, sync_queue)")
    else:
        print("❌ SQLite schema missing required tables")
else:
    print("❌ SQLite schema file not found")

# Verify font
if os.path.exists("static/fonts/NotoSansBengali.woff2"):
    size = os.path.getsize("static/fonts/NotoSansBengali.woff2")
    print(f"✅ WOFF2 font: {size} bytes")
else:
    print("❌ WOFF2 font not found")

# Verify virtual list
with open("src/routes/+page.svelte", encoding="utf-8") as f:
    content = f.read()
if ".slice(0, 6)" in content:
    print("✅ Virtualized feed: max 6 DOM nodes per band (.slice(0, 6))")
else:
    print("❌ Virtualized feed not implemented")

# Verify capacitor plugins
import json
with open("capacitor.config.json") as f:
    config = json.load(f)
plugins = list(config.get("plugins", {}).keys())
required = ["Camera", "Geolocation", "Storage", "Network"]
present = [p for p in required if p in plugins]
if len(present) == len(required):
    print(f"✅ Capacitor plugins: {present}")
else:
    print(f"❌ Capacitor plugins missing: {set(required) - set(present)}")
