#!/usr/bin/env python3
"""PRD §13 APK byte gate — per-ABI sizes against the 6 MB absolute hard cap.

Walks the Gradle output tree, prints every produced APK/ABB with its exact byte
size and its ABI, and exits nonzero if any artifact is at or over the cap or if
no artifact was produced at all.

Usage (from apps/web):
    python scripts/check_apk.py [--root android/app/build/outputs] [--cap-bytes N]
    python scripts/check_apk.py --variant release

--variant (CHC-T-040) filters artifacts by a path substring before judging, so a
single tree holding both variants can be checked one variant at a time. This
matters because `apk/debug/` and `apk/release/` live side by side under the same
root: debug artifacts are structurally over the cap by design (unminified
multidex) and are exempt per CHC-D-046, so a default run over the mixed tree
exits 1 even when the release set is compliant. Default behavior is unchanged:
no --variant means every artifact under the root is judged.
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
    parser.add_argument(
        "--variant",
        default=None,
        help="only judge artifacts whose path contains this substring (e.g. release)",
    )
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        print(f"NO OUTPUT TREE: {args.root} does not exist")
        return 1

    artifacts = collect(args.root)
    if args.variant:
        artifacts = [(path, size) for path, size in artifacts if args.variant in path]
    if not artifacts:
        scope = f" matching --variant {args.variant!r}" if args.variant else ""
        print(f"NO ARTIFACTS: no .apk/.aab under {args.root}{scope}")
        return 1

    print(f"root: {args.root}")
    if args.variant:
        print(f"variant filter: {args.variant!r}")
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
