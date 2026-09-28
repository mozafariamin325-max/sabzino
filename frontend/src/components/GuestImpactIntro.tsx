import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, TopBar } from "./ui";

/** فاز ۱۹: تب «اثر من» برای مهمان — معرفی مفهوم اثر سبز + مشاهدهٔ آزاد پروژه‌ها + دکمهٔ ورود. */
export default function GuestImpactIntro() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <TopBar title="اثر سبز من" subtitle="هر تحویل، یک اثر" />
      <div className="px-4 flex flex-col gap-3 pb-6">
        <Card className="p-6 text-center">
          <div className="text-5xl mb-3">🌳</div>
          <h2 className="font-bold text-ink-900 mb-2">زباله‌ات فقط فروخته نمی‌شود؛ اثر می‌گذارد</h2>
          <p className="text-xs text-ink-500 leading-6">
            بعد از هر تحویل، می‌توانی اختیاری بخشی از ارزش پسماندت را به طرح‌های اشتغال سبز، حمایت اجتماعی،
            محیط‌زیست یا توسعهٔ محلی اختصاص بدهی. رتبهٔ اثر سبز، مجموع مشارکت و رسیدهایت بعد از ورود اینجا نمایش داده می‌شود.
          </p>
          <Button full className="mt-4" onClick={() => navigate("/login", { state: { from: location } })}>
            ورود برای دیدن اثر من
          </Button>
        </Card>

        <Link to="/green-impact/projects">
          <Card className="p-4 flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-900">مشاهدهٔ پروژه‌های اثر سبز</p>
              <p className="text-[11px] text-ink-500 mt-0.5">بدون نیاز به ورود قابل مشاهده است</p>
            </div>
            <span className="text-ink-300">‹</span>
          </Card>
        </Link>
      </div>
    </div>
  );
}
