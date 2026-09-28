import { Capacitor } from "@capacitor/core";

/**
 * فاز ۱۹ — لایهٔ نازک بین اپ وب و پوستهٔ بومی اندروید (Capacitor).
 * در مرورگر/PWA همهٔ این توابع بی‌اثر یا معادل وب هستند، پس کد صفحات هرگز
 * نباید مستقیم به Capacitor وابسته شود.
 */
export const isNative = Capacitor.isNativePlatform();

/** یک‌بار بعد از اولین رندر صدا زده می‌شود: Splash را مخفی و نوار وضعیت را تنظیم می‌کند. */
export async function initNativeShell() {
  if (!isNative) return;
  try {
    const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: "#002d1c" }).catch(() => {});
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    /* پوستهٔ بومی اختیاری است؛ خطا نباید اپ را متوقف کند */
  }
}

/** اشتراک‌گذاری: در اندروید sheet بومی، در وب navigator.share، و در نهایت کپی کلیپ‌بورد. */
export async function shareText(opts: { title?: string; text: string; url?: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    if (isNative) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    }
    await navigator.clipboard.writeText([opts.text, opts.url].filter(Boolean).join("\n"));
    return "copied";
  } catch {
    return "failed";
  }
}
