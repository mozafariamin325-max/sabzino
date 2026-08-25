import { NavLink } from "react-router-dom";
import brandmark from "../assets/brand/brandmark-256.png";

/**
 * فاز ۳ (Stitch): لایهٔ ناوبری واقعیِ دسکتاپ/تبلت — سایدبار ثابت سمت راست
 * (هم‌جهت با RTL). فقط از md به بالا نمایش داده می‌شود؛ BottomNav (که خودش
 * md:hidden شده) هم‌چنان مسیر و منطق ناوبری موبایل را بدون تغییر حفظ می‌کند.
 * آیتم‌ها و مقصدها دقیقاً همان ۵ مسیر BottomNav هستند — هیچ مسیر جدیدی
 * اضافه نشده، فقط شکل نمایش برای صفحهٔ بزرگ عوض شده.
 */
interface NavItem {
  to: string;
  label: string;
  icon: string; // Material Symbols Outlined ligature name
}

const items: NavItem[] = [
  { to: "/", label: "خانه", icon: "home" },
  { to: "/green-impact", label: "اثر من", icon: "eco" },
  { to: "/requests/new", label: "ثبت درخواست", icon: "add_circle" },
  { to: "/stations", label: "نقشه", icon: "map" },
  { to: "/profile", label: "پروفایل", icon: "person" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col fixed top-0 right-0 h-dvh w-64 bg-surface-container-lowest border-l border-outline-variant/40 z-40">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-outline-variant/40">
        <img src={brandmark} alt="" className="w-8 h-8 object-contain" />
        <span className="font-bold text-primary text-lg">سبزینو</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant hover:bg-surface-container"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-outline-variant/40">
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-surface-container text-on-surface" : "text-on-surface-variant hover:bg-surface-container"
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          اعلان‌ها
        </NavLink>
      </div>
    </aside>
  );
}
