#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Noto Sans Bengali থেকে সত্যিকারের WOFF2 সাবসেট তৈরি করার স্ক্রিপ্ট।

কেন এই স্ক্রিপ্ট লেখা হলো:
    আগের সংস্করণ ফন্টটিকে সত্যিকারের WOFF2 কন্টেইনারে না রেখে হাতে বানানো
    ভুয়া কন্টেইনারে রাখত — কোনো টেবিল ডিরেক্টরি ছিল না। ব্রাউজার ফন্টটি
    প্রত্যাখ্যান করত ("invalid sfntVersion"), তাই বাংলা লেখা সবসময়
    সিস্টেম ফন্টে ফলব্যাক করত। এখন সাবসেট তৈরি করে fontTools, অর্থাৎ আসল WOFF2।

কেন এই স্ক্রিপ্ট এখন static/-এর বাইরে:
    SvelteKit static/ ফোল্ডারের সব কিছু হুবহু web build-এ কপি করে। তাই
    scripts/-এ থাকলে এই পাইথন ফাইল আর ব্যবহারকারীর কাছে যায় না (৫,৪১০ বাইট
    সাশ্রয়)। রেন্ডার হওয়া ফন্ট আর fonts.css অবশ্যই static/fonts/-এ থাকে।

ভার্চুয়াল এনভায়রনমেন্ট (venv) — এটি কখনো APK বা web bundle-এ যায় না:
    পথ          : apps/web/.venv-font/   (এই স্ক্রিপ্ট থেকে এক ধাপ উপরে)
    পিন করা      : fonttools==4.67.0, brotli==1.2.1
    চালু করা     : apps/web/.venv-font/Scripts/Activate.ps1      (PowerShell)
                   source apps/web/.venv-font/Scripts/activate     (Git Bash)
    অথবা সরাসরি  : apps/web/.venv-font/Scripts/python.exe

তৈরি করার নিয়ম (একবার):
    python -m venv apps/web/.venv-font
    apps/web/.venv-font/Scripts/python.exe -m pip install fonttools==4.67.0 brotli==1.2.1

ব্যবহার (apps/web থেকে):
    python scripts/subset-font.py <source.ttf> [output.woff2]
    output না দিলে static/fonts/NotoSansBengali.woff2-এ লেখা হয়।

সতর্কতা:
    --layout-features=* এবং U+200C-200D কখনো বাদ দেওয়া চলবে না।
    বাদ দিলে যুক্তাক্ষর (ক্ষ, ত্র) ও ZWJ/ZWNJ গঠন নীরবে ভেঙে যাবে —
    কনসোলে কোনো ত্রুটি দেখাবে না, শুধু লেখা ভুল দেখাবে।
"""

from __future__ import annotations

import os
import subprocess
import sys

এখানে = os.path.dirname(os.path.abspath(__file__))
# স্ক্রিপ্ট থাকে apps/web/scripts/ — venv থাকে apps/web/.venv-font/
ভেনেভ = os.path.abspath(os.path.join(এখানে, "..", ".venv-font"))
ভেনেভ_পাইথন = os.path.join(ভেনেভ, "Scripts", "python.exe")

ফন্টটুলস_পিন = "4.67.0"
ব্রটলি_পিন = "1.2.1"

# বাংলা ব্লক + অ্যাপে ব্যবহৃত ল্যাটিন/যতিচিহ্ন; ZWJ/ZWNJ অবশ্যই থাকবে।
ইউনিকোড_রেঞ্জ = (
    "U+0020-007E,U+00A0,U+00B7,U+0980-09FF,U+200C-200D,"
    "U+2013,U+2014,U+2018-201D,U+2026"
)
লেআউট_ফিচার = "*"
# রেন্ডার হওয়া ফন্ট served asset — static/fonts/-এ থাকতেই হবে।
ডিফল্ট_আউটপুট = os.path.abspath(
    os.path.join(এখানে, "..", "static", "fonts", "NotoSansBengali.woff2")
)
WOFF2_ম্যাজিক = b"wOF2"


def মূল(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python scripts/subset-font.py <source.ttf> [output.woff2]")
        return 2

    উৎস = argv[1]
    আউটপুট = argv[2] if len(argv) > 2 else ডিফল্ট_আউটপুট

    if not os.path.isfile(উৎস):
        print(f"error: source TTF not found: {উৎস}")
        return 2

    if not os.path.isfile(ভেনেভ_পাইথন):
        print(f"error: venv python not found: {ভেনেভ_পাইথন}")
        print("  create it: python -m venv apps/web/.venv-font")
        print(
            "  install:   apps/web/.venv-font/Scripts/python.exe -m pip install "
            f"fonttools=={ফন্টটুলস_পিন} brotli=={ব্রটলি_পিন}"
        )
        return 2

    আদেশ = [
        ভেনেভ_পাইথন,
        "-m",
        "fontTools.subset",
        উৎস,
        "--flavor=woff2",
        f"--layout-features={লেআউট_ফিচার}",
        f"--unicodes={ইউনিকোড_রেঞ্জ}",
        "--no-hinting",
        f"--output-file={আউটপুট}",
    ]
    print("running:", " ".join(আদেশ))

    ফলাফল = subprocess.run(আদেশ, check=False)
    if ফলাফল.returncode != 0:
        print(f"error: pyftsubset exited with code {ফলাফল.returncode}")
        return ফলাফল.returncode

    with open(আউটপুট, "rb") as তৈরি:
        ম্যাজিক = তৈরি.read(4)
    আকার = os.path.getsize(আউটপুট)

    print(f"written: {আউটপুট}")
    print(f"magic:   {ম্যাজিক.hex()} (expected {WOFF2_ম্যাজিক.hex()})")
    print(f"size:    {আকার} bytes")

    if ম্যাজিক != WOFF2_ম্যাজিক:
        print("error: output is not WOFF2 (magic mismatch)")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(মূল(sys.argv))
