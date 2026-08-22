import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#16a34a" : "#8a9a91"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function RequestsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#16a34a" : "#8a9a91"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#16a34a" : "#8a9a91"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20 3 17V5l6 3m0 12 6-3m-6 3V8m6 9 6 3V10l-6-3m0 12V5m0 3 6-3" />
    </svg>
  );
}
function LeafIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#16a34a" : "#8a9a91"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 3.5c-8 0-15 4-15 12a5.5 5.5 0 0 0 5.5 5.5c8 0 12-7 12-15a10 10 0 0 0-2.5-2.5Z" />
      <path d="M5.5 20.5c3-4 6-8 12-14" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#16a34a" : "#8a9a91"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

// فاز ۱۴: طبق درخواست کاربر، «اثر من» یکی از ۵ آیتم اصلی ناوبری پایین شد
// (به‌جای «کیف پول») تا اهمیت اثر سبز در معرض دید همیشگی باشد. کیف پول از
// ناوبری پایین حذف نشده، فقط جابه‌جا شده — همچنان از کارت پررنگ «اعتبار
// سبزینو» بالای صفحه خانه و از منوی پروفایل («کیف پول») همیشه در دسترس است.
const items: NavItem[] = [
  { to: "/", label: "خانه", icon: (a) => <HomeIcon active={a} /> },
  { to: "/requests/new", label: "درخواست", icon: (a) => <RequestsIcon active={a} /> },
  { to: "/green-impact", label: "اثر من", icon: (a) => <LeafIcon active={a} /> },
  { to: "/stations", label: "نقشه", icon: (a) => <MapIcon active={a} /> },
  { to: "/profile", label: "پروفایل", icon: (a) => <ProfileIcon active={a} /> },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-brand-100 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="flex flex-col items-center justify-center gap-1 py-2.5"
          >
            {({ isActive }) => (
              <>
                <div className={`relative ${item.to === "/" ? "w-11 h-11 -mt-4 rounded-full flex items-center justify-center shadow-lg" : ""} ${item.to === "/" ? (isActive ? "bg-brand-500" : "bg-brand-600") : ""}`}>
                  {item.to === "/" ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11.5 12 4l9 7.5" />
                      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
                    </svg>
                  ) : (
                    item.icon(isActive)
                  )}
                </div>
                <span className={`text-[11px] ${isActive ? "text-brand-600 font-medium" : "text-ink-500"}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
