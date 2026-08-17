import { useMaterialCategories } from "../api/queries";
import { Card, CenterLoading, DemoBadge, TopBar } from "../components/ui";
import { formatToman } from "../lib/format";

export default function Materials() {
  const { data: categories, isLoading } = useMaterialCategories();

  return (
    <div>
      <TopBar title="دسته‌بندی و قیمت‌ها" right={<DemoBadge />} />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : (
          <div className="flex flex-col gap-5">
            {(categories || []).map((cat) => (
              <div key={cat.id}>
                <p className="text-sm font-bold text-ink-800 mb-2">
                  {cat.icon} {cat.name}
                </p>
                <div className="flex flex-col gap-2">
                  {cat.materials.map((m) => (
                    <Card key={m.id} className="p-3.5 flex items-center justify-between">
                      <span className="text-sm text-ink-800">{m.name}</span>
                      {m.requires_appraisal || !m.current_price ? (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                          قیمت پس از کارشناسی
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-brand-600">
                          {formatToman(m.current_price)} <span className="text-[11px] font-normal text-ink-500">تومان/کیلو</span>
                        </span>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
