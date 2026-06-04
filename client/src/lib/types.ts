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
  payment_status: 'unpaid' | 'paid';
  payment_tx_ref?: string;
  payment_amount?: number;
  notes?: string;
  service_name?: string;
  service_price?: number;
  barber_name?: string;
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

export type Language = 'en' | 'am' | 'om';
