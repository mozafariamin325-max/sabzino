import { Component, type ErrorInfo, type ReactNode } from "react";

/** اگر یک صفحه خطای غیرمنتظره داد، به‌جای صفحهٔ سفید/بسته‌شدن اپ، پیام و دکمهٔ تلاش مجدد نشان می‌دهد. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-8 text-center bg-surface">
        <div className="text-5xl">😕</div>
        <p className="text-base font-bold text-ink-900">مشکلی پیش آمد</p>
        <p className="text-sm text-ink-500">صفحه را دوباره باز کن. اگر تکرار شد، اپ را ببند و دوباره باز کن.</p>
        <button
          className="rounded-full bg-primary text-on-primary px-6 py-3 text-sm font-medium"
          onClick={() => { this.setState({ failed: false }); window.location.assign("/"); }}
        >
          بازگشت به خانه
        </button>
      </div>
    );
  }
}
