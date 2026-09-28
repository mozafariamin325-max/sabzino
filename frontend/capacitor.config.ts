import type { CapacitorConfig } from '@capacitor/cli';

/**
 * فاز ۱۹ — نسخهٔ اندروید سبزینو (Capacitor).
 * webDir همان خروجی بیلد Vite است (vite.config.ts → outDir: 'build').
 * androidScheme=https یعنی اپ از https://localhost سرو می‌شود؛ پس درخواست به
 * بک‌اند https هیچ مشکل mixed-content ندارد و نیازی به cleartext نیست.
 */
const config: CapacitorConfig = {
  appId: 'ir.sabzino.app',
  appName: 'سبزینو',
  webDir: 'build',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // بعد از آماده‌شدن React دستی مخفی می‌شود (lib/native.ts)
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
    // محتوا بین نوار وضعیت (دوربین) و نوار ناوبری سیستم قرار می‌گیرد؛ آیکون‌های نوار وضعیت تیره.
    SystemBars: {
      insetsHandling: 'native',
      style: 'LIGHT',
    },
  },
};

export default config;
