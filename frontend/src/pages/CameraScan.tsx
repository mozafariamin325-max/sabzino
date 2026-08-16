import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useClassifyWaste } from "../api/queries";
import { Button, Card, CenterLoading, DemoBadge, TopBar } from "../components/ui";
import { formatToman } from "../lib/format";

export default function CameraScan() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  const classify = useClassifyWaste();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    classify.reset();
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  }

  function handleReset() {
    setImageFile(null);
    setImagePreview(null);
    setHint("");
    classify.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    await classify.mutateAsync({
      image: imageFile || undefined,
      hint: hint.trim() || undefined,
    });
  }

  const canSubmit = !!imageFile || hint.trim().length > 0;
  const result = classify.data;

  return (
    <div>
      <TopBar title="تشخیص با دوربین" subtitle="نوع پسماند را با عکس یا توضیح شناسایی کنید" />

      <div className="px-4 pb-32 flex flex-col gap-4">
        {!result && (
          <>
            <Card className="p-4 flex flex-col items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="پیش‌نمایش عکس پسماند"
                  className="w-full max-h-64 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-40 rounded-xl bg-brand-50 flex flex-col items-center justify-center text-brand-400">
                  <span className="text-4xl">📷</span>
                  <span className="text-xs mt-2">هنوز عکسی گرفته نشده</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="camera-scan-input"
              />
              <div className="w-full flex gap-2">
                <Button full variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  {imageFile ? "گرفتن عکس دیگر" : "گرفتن عکس با دوربین"}
                </Button>
                {imageFile && (
                  <Button variant="ghost" onClick={handleReset}>
                    حذف
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-ink-500 text-center">
                اگر به دوربین دسترسی ندارید، می‌توانید فقط با توضیح متنی هم تشخیص را امتحان کنید.
              </p>
            </Card>

            <Card className="p-4">
              <label className="text-xs text-ink-500 mb-1 block">توضیح یا نوع حدسی پسماند (اختیاری)</label>
              <input
                type="text"
                className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                placeholder="مثلا: بطری پلاستیکی، قوطی فلزی..."
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />
            </Card>

            {classify.isPending ? (
              <CenterLoading />
            ) : (
              <Button full disabled={!canSubmit} onClick={handleSubmit}>
                تشخیص نوع پسماند
              </Button>
            )}

            {classify.isError && (
              <p className="text-red-600 text-xs text-center bg-white rounded-lg py-2">
                {(classify.error as Error)?.message || "خطا در تشخیص پسماند. دوباره تلاش کنید."}
              </p>
            )}
          </>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {imagePreview && (
              <img src={imagePreview} alt="عکس پسماند" className="w-full max-h-56 object-cover rounded-2xl" />
            )}

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{result.material_icon || "♻️"}</span>
                  <div>
                    <p className="font-bold text-ink-900">{result.material_name}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">{result.category_name}</p>
                  </div>
                </div>
                {result.is_mock && <DemoBadge />}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-xl bg-brand-50 p-3 text-center">
                  <p className="text-[11px] text-ink-500">قابل بازیافت</p>
                  <p className={`text-sm font-bold mt-1 ${result.recyclable ? "text-brand-600" : "text-red-500"}`}>
                    {result.recyclable ? "بله ✓" : "خیر ✗"}
                  </p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3 text-center">
                  <p className="text-[11px] text-ink-500">دقت تشخیص</p>
                  <p className="text-sm font-bold text-brand-600 mt-1">{Math.round(result.confidence * 100)}٪</p>
                </div>
              </div>

              {result.approx_price_per_unit !== null && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 p-3">
                  <span className="text-[11px] text-ink-500">قیمت تقریبی</span>
                  <span className="text-sm font-bold text-brand-700">
                    {formatToman(result.approx_price_per_unit)} تومان / {result.unit}
                  </span>
                </div>
              )}

              {result.note && (
                <p className="text-[11px] text-ink-500 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-3">
                  {result.note}
                </p>
              )}
            </Card>

            <Link to="/requests/new">
              <Button full>ثبت درخواست جمع‌آوری</Button>
            </Link>
            <Button full variant="secondary" onClick={handleReset}>
              تشخیص دوباره
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
