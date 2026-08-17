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
  requires_appraisal: boolean;
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
  items?: CollectionRequestItem[];
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

export interface Role {
  role: string;
  is_primary: boolean;
}

export interface OrganizationDetail {
  id: number;
  user: number;
  user_name: string;
  user_phone: string;
  center_name: string;
  manager_name: string;
  manager_phone: string;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  verification_note: string;
}

export interface User {
  id: number;
  uid: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  avatar: string | null;
  referral_code: string;
  customer_type: "INDIVIDUAL" | "ORGANIZATION";
  roles: Role[];
  organization_detail: OrganizationDetail | null;
  is_staff: boolean;
  date_joined: string;
}

export interface ProfileChangeRequest {
  uid: string;
  user_name?: string;
  field_name: string;
  field_display: string;
  old_value: string;
  new_value: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_note: string;
  reviewer_name?: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface CollectionRequestItem {
  material: number;
  material_name: string;
  material_detail: Material;
  weight_kg: string;
  is_exact: boolean;
}

export interface RecurringSchedule {
  uid: string;
  address: number;
  address_text: string;
  material_ids: number[];
  materials_detail: Material[];
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  frequency_display: string;
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_hour: number;
  is_active: boolean;
  next_run_date: string;
  created_at: string;
}

export const WEEKDAY_LABELS = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

export interface OrgProfile {
  id: number;
  uid: string;
  user: number;
  name: string;
  national_id: string;
  city: string;
  address: string;
  lat: string | null;
  lng: string | null;
  phone_number: string;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  documents: string | null;
}

export interface InventoryMovement {
  uid: string;
  material: number;
  material_detail: Material;
  direction: "IN" | "OUT";
  direction_display: string;
  weight_kg: string;
  unit_price_snapshot: string | null;
  total_value: string | null;
  counterparty_name: string;
  note: string;
  created_at: string;
}

export interface StockRow {
  material_id: number;
  material__name: string;
  material__unit: string;
  stock_kg: number;
  total_in: number;
  total_out: number;
}

export interface VerificationItem {
  type: string;
  id: number;
  label: string;
  detail: string;
  created_at: string;
  approve_url: string;
  reject_url?: string;
  action: string;
}

export const AMOUNT_RANGES: { value: string; label: string }[] = [
  { value: "UNDER_5", label: "کمتر از ۵ کیلو" },
  { value: "R5_10", label: "۵ تا ۱۰ کیلو" },
  { value: "R10_20", label: "۱۰ تا ۲۰ کیلو" },
  { value: "R20_50", label: "۲۰ تا ۵۰ کیلو" },
  { value: "R50_100", label: "۵۰ تا ۱۰۰ کیلو" },
  { value: "OVER_100", label: "بیشتر از ۱۰۰ کیلو" },
];

export interface Rating {
  uid: string;
  from_user_name: string;
  to_user: number;
  context_type: "COLLECTION" | "ORDER" | "STATION";
  context_type_display: string;
  reference: string;
  score: number;
  comment: string;
  created_at: string;
}

export interface SearchUserResult {
  id: number;
  uid: string;
  name: string;
  phone: string | null;
  email: string;
}

export interface SearchRequestResult {
  uid: string;
  code: string;
  citizen: string;
  status: string;
}

export interface SearchOrderResult {
  uid: string;
  code: string;
  buyer: string;
  seller: string;
  status: string;
  total: string;
}

export interface GlobalSearchResult {
  success: boolean;
  users: SearchUserResult[];
  requests: SearchRequestResult[];
  orders: SearchOrderResult[];
}

// ---------------- PRICING ("قیمت روز") ----------------
export interface MaterialPrice {
  id: number;
  material: number;
  material_name: string;
  material_icon: string;
  material_slug: string;
  category_name: string;
  unit: string;
  unit_display: string;
  price_per_unit: string;
  market_price: string | null;
  min_price: string | null;
  max_price: string | null;
  active: boolean;
  effective_from: string;
  effective_to: string | null;
}

// ---------------- CITIES / LOCAL IDENTITY ----------------
export interface City {
  id: number;
  name: string;
  province: number;
  lat: string | null;
  lng: string | null;
  has_identity: boolean;
  landmark_name: string;
  landmark_icon: string;
  theme_color_from: string;
  theme_color_to: string;
  hero_tagline: string;
}

// ---------------- GAMIFICATION / MISSIONS ----------------
export interface ChallengeProgress {
  progress_value: number;
  completed: boolean;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  type: "WEIGHT" | "TRANSACTIONS" | "STREAK" | "REFERRAL" | "NEIGHBORHOOD";
  target_value: string;
  reward_points: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  my_progress: ChallengeProgress | null;
}

// ---------------- LEADERBOARD ----------------
export interface LeaderboardRow {
  rank: number;
  name: string;
  points: number;
  level: number;
}

export interface NeighborhoodLeaderboardRow {
  rank: number;
  neighborhood: string;
  total_weight_kg: number;
  active_users: number;
}

// ---------------- ENVIRONMENTAL IMPACT ("اثر من") ----------------
export interface MyImpact {
  is_estimated: boolean;
  total_kg_recycled: number;
  co2_kg_saved_estimated: number;
  completed_requests: number;
  note: string;
}

// ---------------- AI WASTE CLASSIFICATION (mock) ----------------
export interface ClassifyResult {
  success: boolean;
  is_mock: boolean;
  material_id: number;
  material_name: string;
  material_slug: string;
  material_icon: string;
  category_name: string;
  recyclable: boolean;
  confidence: number;
  unit: string;
  approx_price_per_unit: number | null;
  note: string;
}

// ---------------- NEARBY COLLECTORS (map) ----------------
export interface NearbyCollector {
  id: number;
  name: string;
  lat: string;
  lng: string;
  rating_avg: string;
  distance_km: number | null;
}

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
