export interface Service {
  id: string;
  name: string;
  name_am?: string;
  name_om?: string;
  description?: string;
  description_am?: string;
  description_om?: string;
  price: number;
  duration_minutes: number;
  category: 'haircut' | 'beard' | 'combo' | 'kids' | 'styling' | 'other';
  is_active: number;
}

export interface Barber {
  id: string;
  name: string;
  name_am?: string;
  name_om?: string;
  phone?: string;
  specialty?: string;
  specialty_am?: string;
  specialty_om?: string;
  avatar?: string;
  is_active: number;
}

export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  barber_id?: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  queue_number?: number;
  payment_status: 'unpaid' | 'paid' | 'declined';
  payment_method?: 'chapa' | 'bank_transfer';
  payment_tx_ref?: string;
  payment_amount?: number;
  bank_id?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  verified_at?: string;
  notes?: string;
  service_name?: string;
  service_price?: number;
  barber_name?: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  logo_emoji: string;
  instructions?: string;
  is_active: boolean;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  appointment_id: string;
  queue_position: number;
  status: 'waiting' | 'called' | 'served' | 'skipped';
  called_at?: string;
  served_at?: string;
  customer_name: string;
  customer_phone: string;
  appointment_time: string;
  appointment_status: string;
  payment_status: string;
  service_name: string;
  duration_minutes: number;
  barber_name?: string;
}

export interface QueueStats {
  total: number;
  waiting: number;
  called: number;
  served: number;
  cancelled: number;
}

export interface WorkingDay {
  open: string;
  close: string;
  closed: boolean;
}

export interface ShopSettings {
  name: string;
  name_am: string;
  name_om: string;
  tagline: string;
  tagline_am: string;
  tagline_om: string;
  about: string;
  about_am: string;
  about_om: string;
  logo_emoji: string;
  logo_url: string;
  phone: string;
  email: string;
  address: string;
  address_am: string;
  address_om: string;
  facebook: string;
  instagram: string;
  telegram: string;
  tiktok: string;
  twitter: string;
  theme_preset: string;
  theme_color: string;
  working_hours: {
    monday: WorkingDay;
    tuesday: WorkingDay;
    wednesday: WorkingDay;
    thursday: WorkingDay;
    friday: WorkingDay;
    saturday: WorkingDay;
    sunday: WorkingDay;
  };
  currency: string;
  currency_symbol: string;
  advance_booking_days: number;
  slot_duration_minutes: number;
  stats_clients: string;
  stats_years: string;
}

export type Language = 'en' | 'am' | 'om';
