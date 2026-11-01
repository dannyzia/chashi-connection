# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor SQLite (@capacitor-community/sqlite) — SQLCipher/Tink annotations R8-এ নেই, শুধু সতর্কতা
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy

# ---------------------------------------------------------------------------
# Capacitor প্লাগিন অ্যানোটেশন R8 থেকে বাঁচাতে হবে (Ctrl+F: ডিভাইস প্রমাণ)।
#
# ২০২৬-১১-০১-এর রিলিজ APK-তে dexdump দেখিয়েছে @CapacitorPlugin অ্যানোটেশন
# com.capacitorjs.plugins.camera.CameraPlugin ক্লাস থেকে পুরোপুরি স্ট্রিপ হয়ে গেছে।
# ফলে রানটাইমে Bridge.getPermissionStates() খালি ম্যাপ দেয় →
# getPermissionState("saveGallery") null → getPhoto() ভেতরে
# NullPointerException: getPermissionState(...) must not be null,
# আর [ছবি তুলুন] চাপলেই অ্যাপ ক্র্যাশ করে (ডিভাইসে পুনরুৎপাদিত)।
#
# ব্রাইট-লাইন: এখানে শুধু মিনিফায়ার কনফিগ — কোনো নির্ভরতা, প্লাগইন বা কোড যোগ হয় না।
#
# বাইট-হিসাব (লুকানো নয়): এই keepগুলো বিনামূল্যে নয়, কিন্তু ব্যয়টাও ছোট।
# ওয়েব পেলোড ও বাকি সব হুবহু এক রেখে শুধু নিচের পাঁচটি লাইন বন্ধ করে একটি
# কন্ট্রোল রিলিজ বানিয়ে মাপা হয়েছে (২০২৬-১১-০১):
#   keep ছাড়া  arm64-v8a 4,103,391 B  | armeabi-v7a 3,740,135 B
#   keep সহ    arm64-v8a 4,104,007 B  | armeabi-v7a 3,740,747 B
#   ⇒ খরচ       +616 বাইট             | +612 বাইট
# keep-সহ চূড়ান্ত বিল্ড: arm64-v8a 4,104,007 B / armeabi-v7a 3,740,747 B
# (৩.৯১ / ৩.৫৭ MB), scripts/check_apk.py --variant release exit 0 — ৬ MB ক্যাপের
# নিচে, হেডরুম 2,187,449 / 2,550,709 B।
#
# কনট্র্যাক্ট-যুগের 3,731,526 / 3,368,864 B-এর সঙ্গে যে ~৩৭২ KB ব্যবধান, তার কারণ
# এই keep নয় — মাঝের কাজ থেকে জমা: পুশ প্লাগিন, google-services রিসোর্স, আর
# ওয়েব পেলোড 771,752 → 781,067 B। (এখানে ~৩৭০ KB লেখা ভুল হবে; মাপা সংখ্যাই
# রাখা হলো — report CHC-T-043।)
# ---------------------------------------------------------------------------
-keepattributes *Annotation*
-keepattributes RuntimeVisible*Annotation*,AnnotationDefault,Signature
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }
-keep @interface com.getcapacitor.annotation.** { *; }
