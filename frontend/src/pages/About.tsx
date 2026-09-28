import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui";
import logo from "../assets/brand/logo-full.png";

const SECTIONS = [
  {
    icon: "♻️",
    title: "سبزینو چیست؟",
    text: "سبزینو بازار هوشمند پسماند خشک است. زباله‌های قابل بازیافت خانه و اداره‌ات را ثبت می‌کنی، جمع‌آور تا درِ منزل می‌آید و ارزش واقعی آن بعد از وزن‌کشی به کیف‌پولت واریز می‌شود.",
  },
  {
    icon: "🚚",
    title: "چطور کار می‌کند؟",
    text: "۱. پسماند و وزن تقریبی را انتخاب می‌کنی. ۲. آدرس و زمان مناسب را می‌دهی. ۳. نزدیک‌ترین جمع‌آور می‌پذیرد و می‌آید. ۴. پس از وزن‌کشی، پول به کیف‌پول تو می‌رسد و رسید دیجیتال دریافت می‌کنی.",
  },
  {
    icon: "🌱",
    title: "اثر سبز",
    text: "اگر بخواهی، می‌توانی بخشی از ارزش زباله‌ات را به طرح‌های اشتغال سبز، حمایت اجتماعی، محیط‌زیست یا توسعهٔ محلی اختصاص بدهی. این کار کاملاً اختیاری است و رسید هر مشارکت را داری.",
  },
  {
    icon: "🏔️",
    title: "حمایت از شهر و گردشگری",
    text: "بخشی از درآمد سبزینو صرف پاکسازی طبیعت و مسیرهای گردشگری، برگزاری برنامه‌های داوطلبانه و توسعهٔ محلی می‌شود تا شهرمان پاکیزه‌تر و مقصدی بهتر برای مسافران باشد.",
  },
  {
    icon: "🤝",
    title: "اشتغال",
    text: "شبکهٔ جمع‌آورها برای افراد شهر درآمد پایدار و قانونی ایجاد می‌کند. هر کسی که وسیلهٔ نقلیه دارد می‌تواند به‌عنوان راننده ثبت‌نام کند و با هر تحویل درآمد کسب کند.",
  },
];

export default function About() {
  const navigate = useNavigate();
  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 pt-5 pb-3">
        <button onClick={() => navigate(-1)} aria-label="بازگشت" className="w-9 h-9 rounded-full bg-white shadow-tinted-sm text-ink-700">›</button>
        <h1 className="text-lg font-bold text-ink-900">دربارهٔ سبزینو</h1>
      </div>
      <div className="px-4 flex flex-col gap-3">
        <Card className="p-6 text-center">
          <img src={logo} alt="سبزینو" className="w-32 mx-auto mb-3" draggable={false} />
          <p className="text-sm text-ink-700 font-medium">با بازیافت، آینده را سبز کنیم</p>
        </Card>
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-5">
            <h2 className="font-bold text-ink-900 mb-1.5"><span className="ml-1.5">{s.icon}</span>{s.title}</h2>
            <p className="text-sm text-ink-500 leading-7">{s.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
