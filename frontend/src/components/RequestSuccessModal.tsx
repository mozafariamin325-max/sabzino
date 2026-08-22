import { useNavigate } from "react-router-dom";
import { formatNumber, formatToman } from "../lib/format";
import { Button } from "./ui";

const BUBBLES = [
  { left: "12%", delay: "0s", size: 46 },
  { left: "68%", delay: "0.5s", size: 34 },
  { left: "38%", delay: "1s", size: 40 },
  { left: "82%", delay: "1.6s", size: 28 },
  { left: "22%", delay: "2.1s", size: 30 },
];

/**
 * صفحهٔ موفقیت بعد از «ثبت نهایی درخواست» (فاز ۱۴). قبل از این فقط بی‌صدا
 * به صفحهٔ جزئیات هدایت می‌کرد — که کاربر آن را «بی‌واکنش» توصیف کرد. حالا
 * بلافاصله همان‌جا مبلغ و امتیاز تخمینی (پیش از وزن‌کشی نهایی) را با چند
 * حباب شناور نشان می‌دهد، و اگر «کمک به اثر سبز» انتخاب شده بود، یک پیام
 * دلگرم‌کننده جدا هم دارد.
 */
export default function RequestSuccessModal({
  estimatedValue, estimatedPoints, greenIntent, requestUid, recurring, onClose,
}: {
  estimatedValue: number;
  estimatedPoints: number;
  greenIntent: "SELL" | "DONATE";
  requestUid?: string;
  recurring?: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center relative overflow-hidden animate-impact-sheet">
        {/* حباب‌های شناور امتیاز/درآمد */}
        <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none overflow-hidden" aria-hidden="true">
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="absolute bottom-0 rounded-full bg-brand-100/70 flex items-center justify-center animate-bubble-rise"
              style={{ left: b.left, width: b.size, height: b.size, animationDelay: b.delay }}
            >
              <span style={{ fontSize: b.size * 0.45 }}>{i % 2 === 0 ? "🌿" : "✨"}</span>
            </span>
          ))}
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 flex items-center justify-center text-3xl animate-success-pop">
            ✅
          </div>

          <p className="font-extrabold text-ink-900 text-base mt-3">
            {recurring ? "جمع‌آوری دوره‌ای شما فعال شد!" : "درخواست شما با موفقیت ثبت شد!"}
          </p>
          <p className="text-xs text-ink-500 mt-1">
            {recurring ? "طبق دوره انتخابی خودکار برای شما ثبت خواهد شد." : "یک جمع‌آور به‌زودی برای دریافت پسماند شما می‌آید."}
          </p>

          <div className="grid grid-cols-2 gap-2.5 mt-5">
            <div className="rounded-2xl bg-brand-50 p-3.5">
              <p className="text-lg font-extrabold text-brand-700">{formatToman(estimatedValue)}</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">تومان (تخمینی)</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3.5">
              <p className="text-lg font-extrabold text-amber-700">{formatNumber(estimatedPoints)} 🌿</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">امتیاز (تخمینی)</p>
            </div>
          </div>
          <p className="text-[10.5px] text-ink-400 mt-2">
            عدد قطعی پس از وزن‌کشی واقعی توسط جمع‌آور محاسبه و به کیف‌پول و امتیازتان اضافه می‌شود.
          </p>

          {greenIntent === "DONATE" && (
            <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-3.5 text-right">
              <p className="text-xs font-bold text-rose-700">🌍 ممنون که انتخاب کردی کمک کنی</p>
              <p className="text-[11px] text-ink-600 mt-1 leading-relaxed">
                ارزش این تحویل می‌تواند به اشتغال سبز، حمایت از کودکان یا محیط‌زیست کمک کند. بعد از وزن‌کشی، تا یک هفته فرصت داری خودت تعیین کنی این کمک دقیقاً کجا خرج شود — از صفحهٔ «اثر سبز من».
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-5">
            {requestUid && (
              <Button
                full
                onClick={() => {
                  onClose();
                  navigate(`/requests/${requestUid}`, { replace: true });
                }}
              >
                مشاهده جزئیات درخواست
              </Button>
            )}
            <Button
              full
              variant="secondary"
              onClick={() => {
                onClose();
                navigate("/", { replace: true });
              }}
            >
              بازگشت به خانه
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
