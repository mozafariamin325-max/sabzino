import { useListings } from "../api/queries";
import { Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatToman } from "../lib/format";

export default function Marketplace() {
  const { data: listings, isLoading } = useListings();

  return (
    <div>
      <TopBar title="فروشگاه سبزینو" subtitle="بازارگاه خرید و فروش مواد قابل بازیافت" />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : !listings || listings.length === 0 ? (
          <EmptyState icon="🛍️" title="فعلاً آگهی فعالی وجود ندارد" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((l) => (
              <Card key={l.uid} className="p-3.5">
                <div className="w-full h-20 rounded-xl bg-brand-50 flex items-center justify-center text-3xl mb-2">
                  ♻️
                </div>
                <p className="text-sm font-bold text-ink-900">{l.material_detail.name}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{l.seller_name}</p>
                <p className="text-xs text-ink-700 mt-1">موجودی: {formatKg(l.quantity_kg)} کیلو</p>
                <p className="text-sm font-bold text-brand-600 mt-1">{formatToman(l.price_per_kg)} ت/کیلو</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
