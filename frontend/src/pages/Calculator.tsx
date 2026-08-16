import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePricing } from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatToman } from "../lib/format";
import type { MaterialPrice } from "../api/types";

export default function Calculator() {
  const { data: prices, isLoading } = usePricing();
  const [weights, setWeights] = useState<Record<number, string>>({});

  const activePrices = useMemo(() => (prices || []).filter((p) => p.active), [prices]);

  const grouped = useMemo(() => {
    const map = new Map<string, MaterialPrice[]>();
    activePrices.forEach((p) => {
      const key = p.category_name || "سایر";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries());
  }, [activePrices]);

  const selectedItems = useMemo(
    () =>
      activePrices
        .map((p) => {
          const weight = Number(weights[p.id] || 0);
          return { price: p, weight, value: weight > 0 ? weight * Number(p.price_per_unit) : 0 };
        })
        .filter((item) => item.weight > 0),
    [activePrices, weights]
  );

  const total = selectedItems.reduce((sum, item) => sum + item.value, 0);

  const handleWeightChange = (id: number, value: string) => {
    setWeights((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div>
      <TopBar title="ضایعاتت چقدر می‌ارزه؟" subtitle="وزن هر ضایعات رو وارد کن و ارزش کل رو همین الان ببین" />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : activePrices.length === 0 ? (
          <EmptyState icon="🧮" title="قیمتی برای محاسبه موجود نیست" subtitle="بعدا دوباره امتحان کن" />
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-l from-brand-700 to-emerald-800 text-white mb-5">
              <p className="text-xs text-brand-50/90">ارزش تخمینی ضایعات شما</p>
              <p className="text-2xl font-extrabold mt-1">
                {formatToman(total)} <span className="text-sm font-normal">تومان</span>
              </p>
              {selectedItems.length > 0 && (
                <p className="text-[11px] text-brand-50/80 mt-1">
                  {selectedItems.length} نوع ضایعات انتخاب شده — مجموع {formatKg(selectedItems.reduce((s, i) => s + i.weight, 0))} کیلو
                </p>
              )}
            </Card>

            <div className="flex flex-col gap-5">
              {grouped.map(([category, list]) => (
                <div key={category}>
                  <p className="text-sm font-bold text-ink-800 mb-2">{category}</p>
                  <div className="flex flex-col gap-2">
                    {list.map((p) => {
                      const weight = weights[p.id] || "";
                      const value = weight ? Number(weight) * Number(p.price_per_unit) : 0;
                      return (
                        <Card key={p.id} className="p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg">{p.material_icon || "♻️"}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink-800 truncate">{p.material_name}</p>
                                <p className="text-[11px] text-ink-500 mt-0.5">
                                  {formatToman(p.price_per_unit)} تومان / {p.unit_display}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.1"
                                value={weight}
                                onChange={(e) => handleWeightChange(p.id, e.target.value)}
                                placeholder="۰"
                                className="w-16 text-center text-sm rounded-lg border border-black/10 py-1.5 px-1 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                              />
                              <span className="text-[11px] text-ink-500">{p.unit_display}</span>
                            </div>
                          </div>
                          {value > 0 && (
                            <p className="text-xs font-bold text-brand-600 mt-2 text-left">
                              ارزش: {formatToman(value)} تومان
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 mb-6">
              <Link to="/requests/new">
                <Button full>ثبت درخواست جمع‌آوری</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
