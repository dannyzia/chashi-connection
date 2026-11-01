#!/usr/bin/env python3
"""PRD §13 APK byte gate — per-ABI sizes against the 6 MB absolute hard cap.

Walks the Gradle output tree, prints every produced APK/ABB with its exact byte
size and its ABI, and exits nonzero if any artifact is at or over the cap or if
no artifact was produced at all.

Usage (from apps/web):
    python scripts/check_apk.py [--root android/app/build/outputs] [--cap-bytes N]
"""

import argparse
import os
import sys

CAP_BYTES = 6 * 1024 * 1024  # 6 MB absolute hard cap, PRD §13 / CHC-D-008

# Split-ABI names come from android/app/build.gradle's `splits { abi { ... } }`.
ABI_TOKENS = ("arm64-v8a", "armeabi-v7a", "x86_64", "x86", "universal")
ARTIFACT_SUFFIXES = (".apk", ".aab")


def abi_of(name):
    for abi in ABI_TOKENS:
        if abi in name:
            return abi
    return "unknown"


def collect(root):
    found = []
    for dirpath, _dirnames, filenames in os.walk(root):
        for fname in sorted(filenames):
            if fname.lower().endswith(ARTIFACT_SUFFIXES):
                path = os.path.join(dirpath, fname)
                found.append((path, os.path.getsize(path)))
    return found


def main():
    parser = argparse.ArgumentParser(description="Per-ABI APK/ABB byte gate")
    parser.add_argument("--root", default=os.path.join("android", "app", "build", "outputs"))
    parser.add_argument("--cap-bytes", type=int, default=CAP_BYTES)
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        print(f"NO OUTPUT TREE: {args.root} does not exist")
        return 1

    artifacts = collect(args.root)
    if not artifacts:
        print(f"NO ARTIFACTS: no .apk/.aab under {args.root}")
        return 1

    print(f"root: {args.root}")
    print(f"cap:  {args.cap_bytes} bytes ({args.cap_bytes / 1024 / 1024:.2f} MB) absolute")
    print("")

    over = 0
    for path, size in artifacts:
        abi = abi_of(os.path.basename(path))
        verdict = "PASS" if size < args.cap_bytes else "FAIL"
        if size >= args.cap_bytes:
            over += 1
        print(
            f"{verdict}  {abi:<12} {size:>9} B  "
            f"({size / 1024 / 1024:.2f} MB, headroom {args.cap_bytes - size:>8} B)  {path}"
        )

    print("")
    print(f"artifacts: {len(artifacts)}  over cap: {over}")
    if over:
        print("================================================")
        print("APK CAP BREACH — 6 MB absolute hard cap exceeded")
        print("================================================")
        return 1
    print("ALL ARTIFACTS UNDER 6 MB CAP")
    return 0


if __name__ == "__main__":
    sys.exit(main())
