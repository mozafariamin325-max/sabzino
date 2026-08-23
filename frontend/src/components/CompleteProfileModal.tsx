import { useState } from "react";
import { useCompleteOtpProfile } from "../api/queries";
import { Button } from "./ui";
import CityPicker from "./CityPicker";
import { isValidIranianNationalId } from "../lib/nationalId";

/**
 * فاز ۱۵ — مرحلهٔ سوم ورود با موبایل (فقط کاربر جدید): شمارهٔ موبایل با
 * OTP تأیید شده و registration_token کوتاه‌عمر (۱۰ دقیقه، از
 * django.core.signing) در دست است؛ این فرم نام/کدملی/شهر را می‌گیرد و
 * حساب واقعی را می‌سازد. کد ملی پیش از ارسال با همان الگوریتم چک‌سام سرور
 * اعتبارسنجی می‌شود تا خطا فوری نشان داده شود.
 */
export default function CompleteProfileModal({
  registrationToken,
  onDone,
  onCancel,
}: {
  registrationToken: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [city, setCity] = useState("");
  const complete = useCompleteOtpProfile();

  const nationalIdValid = isValidIranianNationalId(nationalId);
  const canSubmit = !!firstName.trim() && !!lastName.trim() && nationalIdValid && !!city;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await complete.mutateAsync({
        registration_token: registrationToken,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        national_id: nationalId,
        city,
      });
      onDone();
    } catch {
      /* error surfaced below via complete.error */
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={onCancel} className="text-xs text-ink-500">
            انصراف
          </button>
          <span className="text-[11px] text-brand-600 font-medium">مرحله آخر</span>
        </div>

        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🌱</div>
          <h2 className="font-bold text-ink-900">فقط چند قدم تا تکمیل ثبت‌نام</h2>
          <p className="text-xs text-ink-500 mt-1">شماره‌ات تأیید شد — این اطلاعات فقط یک‌بار لازم است.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="نام"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="نام خانوادگی"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="کد ملی (۱۰ رقم)"
              value={nationalId}
              dir="ltr"
              style={{ textAlign: "right" }}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              required
            />
            {nationalId.length === 10 && !nationalIdValid && (
              <p className="text-red-600 text-[11px] mt-1">کد ملی وارد شده معتبر نیست.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-ink-700 mb-2">شهر</p>
            <CityPicker value={city} onChange={setCity} />
          </div>

          {complete.error && <p className="text-red-600 text-xs">{(complete.error as Error).message}</p>}

          <Button type="submit" full loading={complete.isPending} disabled={!canSubmit} className="mt-1">
            تکمیل ثبت‌نام و ورود
          </Button>
        </form>
      </div>
    </div>
  );
}
