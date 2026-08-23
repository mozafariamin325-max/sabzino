import { useNavigate } from "react-router-dom";
import { Button, Card } from "./ui";

/**
 * فاز ۱۵: کاربر مهمان وقتی روی یک اقدام واقعی (ثبت درخواست جمع‌آوری،
 * کیف‌پول) کلیک می‌کند، به‌جای ریدایرکت خشک به /login، همین پیام دوستانه
 * را می‌بیند — دقیقاً طبق متن درخواستی کاربر: «برای ثبت درخواست فقط یک قدم
 * فاصله داری! 🌱» + دکمهٔ «ورود / ثبت‌نام سریع».
 */
export default function GuestGateNotice() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-[#f4faf6]">
      <Card className="p-7 text-center max-w-sm animate-fade-up">
        <div className="text-5xl mb-3">🌱</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">
          برای ثبت درخواست فقط یک قدم فاصله داری!
        </h2>
        <p className="text-sm text-ink-500 mb-6 leading-6">
          با شماره موبایلت در چند ثانیه ثبت‌نام کن تا بتوانی درخواست جمع‌آوری
          ثبت کنی و از کیف‌پول سبزینو استفاده کنی.
        </p>
        <Button full onClick={() => navigate("/login")}>
          ورود / ثبت‌نام سریع
        </Button>
        <button
          onClick={() => navigate(-1)}
          className="w-full text-center text-xs text-ink-500 mt-4"
        >
          بازگشت
        </button>
      </Card>
    </div>
  );
}
