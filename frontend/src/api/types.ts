export interface Material {
  id: number;
  name: string;
  slug: string;
  category: number;
  category_name: string;
  unit: string;
  description: string;
  icon: string;
  is_active: boolean;
  accepted_at_stations: boolean;
  co2_kg_saved_per_kg: string;
  current_price: string | null;
}

export interface MaterialCategory {
  id: number;
  name: string;
  icon: string;
  order: number;
  materials: Material[];
}

export interface Address {
  id: number;
  title: string;
  province: string;
  city: string;
  district: string;
  full_address: string;
  postal_code: string;
  lat: string | null;
  lng: string | null;
  is_default: boolean;
}

export interface Wallet {
  balance: string;
  pending_balance: string;
  withdrawable_balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  uid: string;
  type: string;
  amount: string;
  balance_after: string;
  description: string;
  reference: string;
  created_at: string;
}

export interface GreenPoints {
  points: number;
  level: number;
  xp: number;
}

export interface StatusLog {
  status: string;
  note: string;
  created_at: string;
}

export interface Assignment {
  collector: number;
  collector_name: string;
  collector_phone: string;
  collector_rating: string;
  accepted_at: string | null;
  on_the_way_at: string | null;
  arrived_at: string | null;
  collected_at: string | null;
}

export interface WeighingRecord {
  uid: string;
  material: number;
  material_name: string;
  weight_kg: string;
  unit_price_snapshot: string;
  total_value: string;
  points_awarded: number;
  created_at: string;
}

export interface CollectionRequest {
  uid: string;
  code: string;
  materials: Material[];
  amount_range: string;
  amount_range_display: string;
  address_text_snapshot: string;
  lat: string | null;
  lng: string | null;
  preferred_time: string | null;
  description: string;
  photo: string | null;
  estimated_value: string;
  status: string;
  status_display: string;
  status_logs: StatusLog[];
  assignment: Assignment | null;
  weighing: WeighingRecord | null;
  created_at: string;
}

export interface RecyclingStation {
  uid: string;
  name: string;
  address: string;
  lat: string | null;
  lng: string | null;
  working_hours: string;
  accepted_materials: Material[];
  capacity_kg_per_day: string;
  phone_number: string;
  image: string | null;
  is_active: boolean;
  distance_km?: number;
}

export interface Listing {
  uid: string;
  seller: number;
  seller_name: string;
  material: number;
  material_detail: Material;
  quantity_kg: string;
  price_per_kg: string;
  minimum_order_kg: string;
  quality: string;
  location: string;
  description: string;
  status: string;
  images: { id: number; image: string }[];
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const AMOUNT_RANGES: { value: string; label: string }[] = [
  { value: "UNDER_5", label: "کمتر از ۵ کیلو" },
  { value: "R5_10", label: "۵ تا ۱۰ کیلو" },
  { value: "R10_20", label: "۱۰ تا ۲۰ کیلو" },
  { value: "R20_50", label: "۲۰ تا ۵۰ کیلو" },
  { value: "R50_100", label: "۵۰ تا ۱۰۰ کیلو" },
  { value: "OVER_100", label: "بیشتر از ۱۰۰ کیلو" },
];

export const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "ثبت شده",
  SEARCHING_COLLECTOR: "در جستجوی جمع‌آور",
  ASSIGNED: "تخصیص یافته",
  ACCEPTED: "پذیرفته شده",
  ON_THE_WAY: "در مسیر",
  ARRIVED: "رسیده",
  COLLECTED: "جمع‌آوری شده",
  WEIGHING: "در حال وزن‌کشی",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
};
