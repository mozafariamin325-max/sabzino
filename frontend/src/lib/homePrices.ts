import type { MaterialPrice } from "../api/types";

/**
 * The 11 fixed categories for the "قیمت روز" home widget (product spec).
 * slug must match Material.slug seeded in backend/core/management/commands/seed_demo.py.
 * label overrides the material's full name with the short spec wording where they differ
 * (e.g. "پت (PET)" -> "PET").
 */
export const HOME_PRICE_SLUGS: { slug: string; label: string }[] = [
  { slug: "آهن", label: "آهن" },
  { slug: "مس", label: "مس" },
  { slug: "آلومینیوم", label: "آلومینیوم" },
  { slug: "برنج", label: "برنج" },
  { slug: "کارتن", label: "کارتن" },
  { slug: "کاغذ", label: "کاغذ" },
  { slug: "پت-PET", label: "PET" },
  { slug: "پلاستیک", label: "پلاستیک" },
  { slug: "نایلون", label: "نایلون" },
  { slug: "باتری", label: "باتری" },
  { slug: "ضایعات-الکترونیکی", label: "ضایعات الکترونیکی" },
];

export function curatedHomePrices(all: MaterialPrice[] | undefined): (MaterialPrice & { label: string })[] {
  if (!all) return [];
  const bySlug = new Map(all.map((p) => [p.material_slug, p]));
  return HOME_PRICE_SLUGS.map((entry) => {
    const p = bySlug.get(entry.slug);
    return p ? { ...p, label: entry.label } : null;
  }).filter((x): x is MaterialPrice & { label: string } => !!x);
}
