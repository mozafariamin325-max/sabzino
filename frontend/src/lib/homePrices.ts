import type { MaterialPrice } from "../api/types";

/**
 * The curated set of items for the "قیمت روز" home widget — one representative,
 * commonly-collected grade per major category (the full granular catalog, split by
 * grade, lives on the Materials/Calculator pages). slug must match Material.slug
 * seeded in backend/core/management/commands/seed_demo.py (پ‌ران‌ضایعات-based pricing,
 * ۱۴۰۵/۰۵/۲۵). label overrides the material's full name with a shorter home-widget wording.
 */
export const HOME_PRICE_SLUGS: { slug: string; label: string }[] = [
  { slug: "آهن-درجه-۱", label: "آهن درجه ۱" },
  { slug: "مس-کابلی-قرمز", label: "مس کابلی قرمز" },
  { slug: "آلومینیوم-خشک", label: "آلومینیوم خشک" },
  { slug: "برنج-زردبار", label: "برنج" },
  { slug: "کارتن-فله", label: "کارتن" },
  { slug: "کاغذ-سفید-و-فرم", label: "کاغذ سفید" },
  { slug: "PET-درجه-۱", label: "PET" },
  { slug: "نایلون-درجه-۱", label: "نایلون" },
  { slug: "باتری-خشک-ایرانی", label: "باتری خشک" },
  { slug: "بطری-شیشه‌ای-سفید", label: "بطری شیشه‌ای" },
  { slug: "قوطی-نوشابه", label: "قوطی نوشابه" },
];

export function curatedHomePrices(all: MaterialPrice[] | undefined): (MaterialPrice & { label: string })[] {
  if (!all) return [];
  const bySlug = new Map(all.map((p) => [p.material_slug, p]));
  return HOME_PRICE_SLUGS.map((entry) => {
    const p = bySlug.get(entry.slug);
    return p ? { ...p, label: entry.label } : null;
  }).filter((x): x is MaterialPrice & { label: string } => !!x);
}
