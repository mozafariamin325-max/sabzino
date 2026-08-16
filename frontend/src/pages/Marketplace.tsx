import { useState } from "react";
import { useListings, usePurchaseListing } from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatToman } from "../lib/format";
import type { Listing } from "../api/types";

export default function Marketplace() {
  const { data: listings, isLoading } = useListings();
  const [openUid, setOpenUid] = useState<string | null>(null);

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
              <ListingCard
                key={l.uid}
                listing={l}
                open={openUid === l.uid}
                onToggle={() => setOpenUid((cur) => (cur === l.uid ? null : l.uid))}
                onDone={() => setOpenUid(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({
  listing: l,
  open,
  onToggle,
  onDone,
}: {
  listing: Listing;
  open: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const purchase = usePurchaseListing();
  const defaultQty = Number(l.minimum_order_kg) > 0 ? l.minimum_order_kg : "1";
  const [qty, setQty] = useState(defaultQty);
  const [success, setSuccess] = useState(false);

  const qtyNum = Number(qty);
  const min = Number(l.minimum_order_kg) || 0;
  const max = Number(l.quantity_kg) || 0;
  const qtyError =
    !qty || Number.isNaN(qtyNum) || qtyNum <= 0
      ? "مقدار را وارد کنید"
      : qtyNum < min
      ? `حداقل سفارش ${formatKg(min)} کیلو است`
      : qtyNum > max
      ? `بیشتر از موجودی (${formatKg(max)} کیلو) نمی‌شود`
      : null;

  async function handlePurchase() {
    if (qtyError) return;
    try {
      await purchase.mutateAsync({ uid: l.uid, quantity_kg: qtyNum });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onDone();
      }, 1500);
    } catch {
      // error is surfaced via purchase.error below
    }
  }

  return (
    <Card className="p-3.5">
      <div className="w-full h-20 rounded-xl bg-brand-50 flex items-center justify-center text-3xl mb-2">
        ♻️
      </div>
      <p className="text-sm font-bold text-ink-900">{l.material_detail.name}</p>
      <p className="text-[11px] text-ink-500 mt-0.5">{l.seller_name}</p>
      <p className="text-xs text-ink-700 mt-1">موجودی: {formatKg(l.quantity_kg)} کیلو</p>
      {l.quality && <p className="text-[11px] text-ink-500 mt-0.5">کیفیت: {l.quality}</p>}
      {l.location && <p className="text-[11px] text-ink-500 mt-0.5">📍 {l.location}</p>}
      <p className="text-sm font-bold text-brand-600 mt-1">{formatToman(l.price_per_kg)} ت/کیلو</p>

      <Button variant="secondary" full className="mt-2.5 text-xs py-2" onClick={onToggle}>
        {open ? "انصراف" : "درخواست خرید"}
      </Button>

      {open && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {success ? (
            <p className="text-brand-600 text-xs font-medium text-center py-1">✅ درخواست خرید ثبت شد</p>
          ) : (
            <>
              <input
                type="number"
                className="rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
                value={qty}
                min={min || undefined}
                max={max || undefined}
                onChange={(e) => setQty(e.target.value)}
                placeholder="مقدار (کیلو)"
              />
              {qtyError && <p className="text-red-600 text-[11px]">{qtyError}</p>}
              {purchase.error && (
                <p className="text-red-600 text-[11px]">{(purchase.error as Error).message}</p>
              )}
              <Button
                full
                className="text-xs py-2"
                loading={purchase.isPending}
                disabled={!!qtyError}
                onClick={handlePurchase}
              >
                تأیید خرید
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
