import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useMaterialCategories } from "../api/queries";
import { Button, Card, CenterLoading, TopBar } from "../components/ui";
import { formatToman, toJalaliTime } from "../lib/format";

export default function StationOperator() {
  const { data: categories } = useMaterialCategories();
  const allMaterials = (categories || []).flatMap((c) => c.materials);
  const qc = useQueryClient();

  const [citizenIdentifier, setCitizenIdentifier] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [weight, setWeight] = useState("");
  const [lastResult, setLastResult] = useState<{ total_value: string; points_awarded: number; transaction_code: string } | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["station-transactions"],
    queryFn: async () => (await api.get("/stations/operator/transactions/")).data.results,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/stations/operator/transaction/", {
        citizen_identifier: citizenIdentifier,
        material: Number(materialId),
        weight_kg: Number(weight),
      });
      return data.transaction;
    },
    onSuccess: (tx) => {
      setLastResult(tx);
      setCitizenIdentifier("");
      setMaterialId("");
      setWeight("");
      qc.invalidateQueries({ queryKey: ["station-transactions"] });
    },
  });

  return (
    <div>
      <TopBar title="پنل اپراتور ایستگاه" subtitle="ثبت تراکنش تحویل حضوری" />

      <div className="px-4">
        <Card className="p-5">
          <div className="flex flex-col gap-3">
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="شماره موبایل شهروند (یا اسکن QR)"
              value={citizenIdentifier}
              onChange={(e) => setCitizenIdentifier(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
            />
            <select
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              <option value="">نوع ماده را انتخاب کنید</option>
              {allMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {formatToman(m.current_price)} ت/کیلو
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="وزن (کیلوگرم)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            {submit.error && <p className="text-red-600 text-xs">{(submit.error as Error).message}</p>}
            <Button
              full
              loading={submit.isPending}
              disabled={!citizenIdentifier || !materialId || !weight}
              onClick={() => submit.mutate()}
            >
              ثبت تراکنش و تسویه
            </Button>
          </div>
        </Card>

        {lastResult && (
          <Card className="p-4 mt-3 bg-brand-50 border border-brand-100">
            <p className="text-sm font-bold text-brand-700">رسید #{lastResult.transaction_code} صادر شد</p>
            <p className="text-xs text-ink-700 mt-1">
              مبلغ واریزی: {formatToman(lastResult.total_value)} تومان — امتیاز: {lastResult.points_awarded} 🌿
            </p>
          </Card>
        )}

        <div className="mt-6">
          <h2 className="font-bold text-sm text-ink-900 mb-3">تراکنش‌های اخیر ایستگاه</h2>
          {isLoading ? (
            <CenterLoading />
          ) : (
            <div className="flex flex-col gap-2">
              {(transactions || []).map((tx: { uid: string; transaction_code: string; citizen_name: string; material_name: string; weight_kg: string; total_value: string; created_at: string }) => (
                <Card key={tx.uid} className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tx.citizen_name || "شهروند"}</p>
                    <p className="text-[11px] text-ink-500">{tx.material_name} — {tx.weight_kg} کیلو</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">{toJalaliTime(tx.created_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-600">{formatToman(tx.total_value)} ت</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
