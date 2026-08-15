import { useAuthStore } from "../store/auth";
import { getAvailableViews } from "../lib/roles";

/**
 * Lets a multi-role account (e.g. citizen + collector, or citizen + factory)
 * pick which dashboard opens on "/". Hidden entirely for single-role
 * accounts so a plain citizen never sees an irrelevant control.
 */
export default function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const activeView = useAuthStore((s) => s.activeView);
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const views = getAvailableViews(user);

  if (views.length < 2) return null;

  return (
    <div className={compact ? "px-4 mb-3" : "px-4 pt-4 mb-1"}>
      {!compact && <p className="text-[11px] text-ink-500 mb-2">با کدام نما وارد شوم؟</p>}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`whitespace-nowrap text-xs px-3 py-2 rounded-xl font-medium border transition ${
              activeView === v.key ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink-600 border-brand-100"
            }`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
