import { useState } from "react";
import { useContribute } from "../api/queries";
import { IMPACT_CATEGORY_LABELS, type ImpactContribution, type ImpactProject } from "../api/types";
import { formatToman } from "../lib/format";
import { Button } from "./ui";

/**
 * Shared "مشارکت" modal — contributes from the citizen's general wallet
 * balance to a single project (used both from the projects list and the
 * project detail page). The per-delivery, multi-project split flow lives
 * separately in RequestDetail's GreenImpactChoice.
 */
export default function ImpactContributeModal({ project, walletBalance, onClose, onDone }: {
  project: ImpactProject;
  walletBalance: number;
  onClose: () => void;
  onDone: (contributions: ImpactContribution[]) => void;
}) {
  const [amount, setAmount] = useState("");
  const contribute = useContribute();
  const numAmount = Number(amount);
  const canSubmit = numAmount > 0 && numAmount <= walletBalance;

  async function handleSubmit() {
    if (!canSubmit) return;
    const res = await contribute.mutateAsync({ allocations: [{ project: project.uid, amount: numAmount }] });
    onDone(res.contributions);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 animate-impact-sheet">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-xl shrink-0">
            {project.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 truncate">{project.title}</p>
            <p className="text-[11px] text-ink-500">{IMPACT_CATEGORY_LABELS[project.category]}</p>
          </div>
        </div>

        <p className="text-[11px] text-ink-500 mb-1">موجودی کیف پول شما: {formatToman(walletBalance)} تومان</p>
        <input
          type="number"
          inputMode="numeric"
          className="w-full rounded-xl border border-brand-100 px-3.5 py-3 text-sm mt-1"
          placeholder="مبلغ مشارکت (تومان)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {numAmount > walletBalance && (
          <p className="text-red-600 text-[11px] mt-1.5">مبلغ بیشتر از موجودی کیف پول شماست.</p>
        )}
        {contribute.error && (
          <p className="text-red-600 text-[11px] mt-1.5">{(contribute.error as Error).message}</p>
        )}

        <p className="text-[10.5px] text-ink-400 mt-3 leading-relaxed">
          این مشارکت کاملاً اختیاری است و از کیف پول فعلی شما کسر می‌شود؛ هیچ مبلغی بدون تأیید شما جابه‌جا نمی‌شود.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <Button full loading={contribute.isPending} disabled={!canSubmit} onClick={handleSubmit}>
            تأیید مشارکت
          </Button>
          <Button full variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </div>
  );
}
