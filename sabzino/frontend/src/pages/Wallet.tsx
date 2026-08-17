import { useState } from "react";
import { useRequestWithdrawal, useWallet, useWalletTransactions } from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { formatToman, toJalaliTime } from "../lib/format";

const TX_LABELS: Record<string, { label: string; sign: string; color: string }> = {
  CREDIT: { label: "واریز", sign: "+", color: "text-brand-600" },
  DEBIT: { label: "برداشت", sign: "-", color: "text-red-500" },
  WITHDRAWAL: { label: "درخواست برداشت", sign: "-", color: "text-red-500" },
  PURCHASE: { label: "خرید", sign: "-", color: "text-red-500" },
  SALE: { label: "فروش", sign: "+", color: "text-brand-600" },
  REWARD: { label: "پاداش", sign: "+", color: "text-brand-600" },
  COMMISSION: { label: "کمیسیون", sign: "-", color: "text-red-500" },
  REFUND: { label: "بازگشت وجه", sign: "+", color: "text-brand-600" },
};

export default function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: transactions } = useWalletTransactions();
  const withdraw = useRequestWithdrawal();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [sheba, setSheba] = useState("");

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    await withdraw.mutateAsync({ amount: Number(amount), sheba_number: sheba });
    setShowForm(false);
    setAmount("");
    setSheba("");
  }

  return (
    <div>
      <TopBar title="کیف پول سبزینو" />

      <div className="px-4">
        <div className="rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 p-5 text-white shadow-lg">
          <p className="text-xs text-brand-50/90">موجودی قابل برداشت</p>
          {isLoading ? (
            <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-extrabold mt-1">{formatToman(wallet?.balance)} تومان</p>
          )}
          <button
            onClick={() => setShowForm((s) => !s)}
            className="mt-4 bg-white text-brand-700 text-sm font-medium px-4 py-2 rounded-xl"
          >
            درخواست برداشت وجه
          </button>
        </div>

        {showForm && (
          <Card className="p-4 mt-3">
            <form onSubmit={submitWithdrawal} className="flex flex-col gap-3">
              <input
                type="number"
                required
                placeholder="مبلغ (تومان)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              />
              <input
                placeholder="شماره شبا (IR...)"
                value={sheba}
                onChange={(e) => setSheba(e.target.value)}
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                dir="ltr"
              />
              {withdraw.error && <p className="text-red-600 text-xs">{(withdraw.error as Error).message}</p>}
              <Button type="submit" full loading={withdraw.isPending}>
                ثبت درخواست
              </Button>
            </form>
          </Card>
        )}

        <div className="mt-6">
          <h2 className="font-bold text-sm text-ink-900 mb-3">تراکنش‌ها</h2>
          {!transactions ? (
            <CenterLoading />
          ) : transactions.length === 0 ? (
            <EmptyState icon="👛" title="هنوز تراکنشی ثبت نشده" />
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => {
                const meta = TX_LABELS[tx.type] || { label: tx.type, sign: "", color: "text-ink-700" };
                return (
                  <Card key={tx.uid} className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-[11px] text-ink-500 mt-0.5">{tx.description || toJalaliTime(tx.created_at)}</p>
                    </div>
                    <p className={`text-sm font-bold ${meta.color}`}>
                      {meta.sign}
                      {formatToman(Math.abs(Number(tx.amount)))}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
