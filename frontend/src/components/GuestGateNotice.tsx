import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card } from "./ui";

/**
 * فاز ۱۵ / ۱۹: کاربر مهمان وقتی به یک اقدام واقعی (کیف‌پول، خریدها،
 * اعلان‌ها، ...) می‌رسد، به‌جای ریدایرکت خشک، این پیام دوستانه را می‌بیند.
 * فاز ۱۹: متن قابل‌تنظیم است و دکمهٔ ورود، مسیر فعلی را به‌عنوان `from`
 * می‌فرستد تا بعد از ورود موفق، کاربر دقیقاً به همین صفحه برگردد.
 */
export default function GuestGateNotice({
  icon = "🌱",
  title = "برای ثبت درخواست فقط یک قدم فاصله داری!",
  description = "با شماره موبایلت در چند ثانیه ثبت‌نام کن تا بتوانی درخواست جمع‌آوری ثبت کنی و از کیف‌پول سبزینو استفاده کنی.",
}: {
  icon?: string;
  title?: string;
  description?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-6">
      <Card className="p-7 text-center max-w-sm animate-fade-up">
        <div className="text-5xl mb-3">{icon}</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">{title}</h2>
        <p className="text-sm text-ink-500 mb-6 leading-6">{description}</p>
        <Button full onClick={() => navigate("/login", { state: { from: location } })}>
          ورود / ثبت‌نام سریع
        </Button>
        <button onClick={() => navigate(-1)} className="w-full text-center text-xs text-ink-500 mt-4">
          بازگشت
        </button>
      </Card>
    </div>
  );
}
