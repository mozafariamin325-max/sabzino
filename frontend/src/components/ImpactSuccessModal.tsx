import { IMPACT_CATEGORY_LABELS, type ImpactContribution } from "../api/types";
import { formatToman } from "../lib/format";
import { Button } from "./ui";

const SHARE_TEXT = "من امروز در سبزینو اثر سبز ایجاد کردم 🌱";

/**
 * Shown right after a successful green-impact allocation (RequestDetail's
 * per-delivery flow, or the standalone Projects page). Deliberately calm —
 * one soft ripple + a leaf pop, no confetti/bounce — matches the "مدرن،
 * انسانی، قابل اعتماد" tone the product asked for.
 */
export default function ImpactSuccessModal({
  open, onClose, contributions,
}: {
  open: boolean;
  onClose: () => void;
  contributions: ImpactContribution[];
}) {
  if (!open) return null;

  const totalAmount = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const single = contributions.length === 1 ? contributions[0] : null;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: SHARE_TEXT });
        return;
      } catch {
        // user cancelled — fall through to clipboard as a no-op
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(SHARE_TEXT);
      } catch {
        // clipboard unavailable — silently ignore, sharing is a nice-to-have
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center relative overflow-hidden animate-impact-sheet">
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-impact-ripple" />
          <span className="absolute inset-0 rounded-full bg-brand-400 animate-impact-ripple" style={{ animationDelay: "0.5s" }} />
          <span className="relative w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-3xl animate-impact-leaf">
            🌱
          </span>
        </div>

        <p className="font-extrabold text-ink-900 text-base">مشارکت شما ثبت شد</p>

        <p className="text-2xl font-extrabold text-brand-600 mt-3">
          {formatToman(totalAmount)} <span className="text-sm font-normal text-ink-500">تومان</span>
        </p>

        {single ? (
          <p className="text-sm text-ink-600 mt-1.5">
            از ارزش پسماند شما به «{single.project_title}» ({IMPACT_CATEGORY_LABELS[single.project_category]}) اختصاص یافت.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            {contributions.map((c) => (
              <p key={c.uid} className="text-xs text-ink-600">
                {formatToman(c.amount)} تومان → «{c.project_title}»
              </p>
            ))}
          </div>
        )}

        <p className="text-xs text-ink-500 mt-4 leading-relaxed">
          ممنون که فقط زباله تحویل نمی‌دهی؛
          <br />
          اثر ایجاد می‌کنی.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <Button variant="secondary" full onClick={handleShare}>
            اشتراک‌گذاری اثر سبز 🌱
          </Button>
          <Button full onClick={onClose}>
            متوجه شدم
          </Button>
        </div>
      </div>
    </div>
  );
}
