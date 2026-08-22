import { useState } from "react";
import { useMyStoreRedemptions, useRequestStoreRedemption, useStorePartners, useWallet } from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { formatToman, toJalaliTime } from "../lib/format";
import type { StorePartner, StorePartnerCategory } from "../api/types";

const CATEGORY_LABELS: Record<StorePartnerCategory, string> = {
  FOOD: "خوراکی و سوپرمارکت",
  HOUSEHOLD: "لوازم خانه",
  DIGITAL: "دیجیتال و شارژ",
  HEALTH: "سلامت و آرایشی",
  SERVICES: "خدمات",
  OTHER: "سایر",
};

const CATEGORY_ICONS: Record<StorePartnerCategory, string> = {
  FOOD: "🛒",
  HOUSEHOLD: "🏠",
  DIGITAL: "📱",
  HEALTH: "💊",
  SERVICES: "🛠️",
  OTHER: "🏪",
};

const REDEMPTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "رد شده", FULFILLED: "استفاده‌شده",
};
const REDEMPTION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-sky-50 text-sky-700",
  REJECTED: "bg-slate-100 text-ink-500", FULFILLED: "bg-brand-50 text-brand-700",
};

function RedeemModal({ partner, balance, onClose }: { partner: StorePartner; balance: number; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const redeem = useRequestStoreRedemption();
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await redeem.mutateAsync({ partner: partner.uid, amount: Number(amount) });
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6">
        {done ? (
          <div className="text-center py-3">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm font-bold text-ink-900">درخواست خرید شما ثبت شد</p>
            <p className="text-[11px] text-ink-500 mt-2 leading-relaxed">
              مبلغ از کیف‌پول شما رزرو شد. پس از بررسی و تأیید سبزینو، کد استفاده صادر می‌شود و می‌توانید در بخش «خریدهای من» آن را ببینید.
            </p>
            <Button full className="mt-4" onClick={onClose}>متوجه شدم</Button>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-ink-900 mb-1">خرید از {partner.name}</p>
            <p className="text-[11px] text-ink-500 mb-4">
              مبلغ مورد نظر از موجودی کیف‌پول شما رزرو می‌شود و پس از تأیید سبزینو، کد استفاده صادر می‌شود.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                type="number"
                required
                min={1}
                max={balance}
                placeholder="مبلغ (تومان)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              />
              <p className="text-[10.5px] text-ink-400">موجودی قابل استفاده: {formatToman(balance)} تومان</p>
              {redeem.error && <p className="text-red-600 text-xs">{(redeem.error as Error).message}</p>}
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>انصراف</Button>
                <Button type="submit" className="flex-1" loading={redeem.isPending} disabled={!amount || Number(amount) > balance}>
                  ثبت درخواست
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function Store() {
  const { data: wallet } = useWallet();
  const [category, setCategory] = useState<string>("");
  const { data: partners, isLoading } = useStorePartners(category ? { category } : undefined);
  const { data: redemptions } = useMyStoreRedemptions();
  const [selected, setSelected] = useState<StorePartner | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const balance = Number(wallet?.balance || 0);

  return (
    <div>
      <TopBar title="فروشگاه سبزینو" subtitle="با موجودی کیف‌پولت از فروشگاه‌های همکار خرید کن" />

      <div className="px-4">
        <div className="rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 p-5 text-white shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-50/90">موجودی قابل استفاده</p>
            <p className="text-xl font-extrabold mt-1">{formatToman(balance)} تومان</p>
          </div>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="bg-white text-brand-700 text-xs font-medium px-3.5 py-2 rounded-xl"
          >
            خریدهای من
          </button>
        </div>

        {showHistory && (
          <div className="mt-3 flex flex-col gap-2">
            {!redemptions || redemptions.length === 0 ? (
              <Card className="p-4 text-center text-xs text-ink-500">هنوز درخواست خریدی ثبت نکرده‌اید.</Card>
            ) : (
              redemptions.map((r) => (
                <Card key={r.uid} className="p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ink-900">{r.partner_name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${REDEMPTION_STATUS_COLORS[r.status]}`}>
                      {REDEMPTION_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10.5px] text-ink-400">{toJalaliTime(r.created_at)}</p>
                    <p className="text-sm font-extrabold text-brand-700">{formatToman(r.amount)} ت</p>
                  </div>
                  {r.status === "APPROVED" && r.redemption_code && (
                    <p className="text-[11px] text-sky-700 bg-sky-50 rounded-lg px-2.5 py-1.5 mt-2" dir="ltr">
                      کد استفاده: <b>{r.redemption_code}</b>
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 mt-4">
          {(["", "FOOD", "HOUSEHOLD", "DIGITAL", "HEALTH", "SERVICES", "OTHER"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${category === c ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
            >
              {c === "" ? "همه" : `${CATEGORY_ICONS[c]} ${CATEGORY_LABELS[c]}`}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {isLoading ? (
            <CenterLoading />
          ) : !partners || partners.length === 0 ? (
            <EmptyState
              icon="🏪"
              title="هنوز فروشگاهی افزوده نشده"
              subtitle="به‌زودی فروشگاه‌های همکار واقعی شهر شما اینجا اضافه می‌شوند."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {partners.map((p) => (
                <button key={p.uid} type="button" onClick={() => setSelected(p)} className="text-right">
                  <Card className="p-3.5 h-full flex flex-col">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl overflow-hidden mb-2">
                      {p.logo ? <img src={p.logo} alt={p.name} className="w-full h-full object-cover" /> : CATEGORY_ICONS[p.category]}
                    </div>
                    <p className="text-xs font-bold text-ink-900 truncate">{p.name}</p>
                    <p className="text-[10.5px] text-ink-500 mt-0.5">{CATEGORY_LABELS[p.category]}</p>
                    {p.description && <p className="text-[10.5px] text-ink-400 mt-1 line-clamp-2 leading-4">{p.description}</p>}
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <RedeemModal partner={selected} balance={balance} onClose={() => setSelected(null)} />}
    </div>
  );
}
