import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './barbershop.db';
const db = new Database(path.resolve(DB_PATH));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS barbers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_am TEXT,
      name_om TEXT,
      phone TEXT,
      specialty TEXT,
      specialty_am TEXT,
      specialty_om TEXT,
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_am TEXT,
      name_om TEXT,
      description TEXT,
      description_am TEXT,
      description_om TEXT,
      price REAL NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      category TEXT DEFAULT 'haircut',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      barber_id TEXT,
      service_id TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      queue_number INTEGER,
      payment_status TEXT DEFAULT 'unpaid',
      payment_tx_ref TEXT,
      payment_amount REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (barber_id) REFERENCES barbers(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL UNIQUE,
      queue_position INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      called_at DATETIME,
      served_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      appointment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const DEFAULT_SETTINGS = {
  name: 'BarberShop', name_am: 'ባርበርሾፕ', name_om: 'Baarbar Shop',
  tagline: 'Premium Cuts & Grooming',
  tagline_am: 'ምርጥ ቁረጣ እና ማስዋቢያ',
  tagline_om: 'Muraa fi Miidhagina Oadaa',
  about: 'Experience the finest barbershop in town. Book your appointment online and skip the wait.',
  about_am: 'በከተማዎ ምርጡን ቦርደርሾፕ ይጎብኙ። ቀጠሮዎን በኦንላይን ይያዙ።',
  about_om: 'Baarbar shop caalu magaalaa kee. Beellama kee online qabadhu.',
  logo_emoji: '✂', logo_url: '',
  phone: '+251 911 000 000', email: 'info@barbershop.com',
  address: 'Addis Ababa, Ethiopia',
  address_am: 'አዲስ አበባ, ኢትዮጵያ',
  address_om: 'Finfinnee, Itoophiyaa',
  facebook: '', instagram: '', telegram: '', tiktok: '', twitter: '',
  theme_preset: 'gold', theme_color: '#e89b00',
  working_hours: {
    monday:    { open: '08:00', close: '18:00', closed: false },
    tuesday:   { open: '08:00', close: '18:00', closed: false },
    wednesday: { open: '08:00', close: '18:00', closed: false },
    thursday:  { open: '08:00', close: '18:00', closed: false },
    friday:    { open: '08:00', close: '18:00', closed: false },
    saturday:  { open: '08:00', close: '17:00', closed: false },
    sunday:    { open: '09:00', close: '14:00', closed: true },
  },
  currency: 'ETB', currency_symbol: 'ETB',
  advance_booking_days: 14, slot_duration_minutes: 30,
  stats_clients: '500+', stats_years: '5+',
};

const DEFAULT_BARBERS = [
  { name: 'Abebe Kebede', name_am: 'አበበ ከበደ', name_om: 'Abebe Kabadaa', phone: '+251911000001',
    specialty: 'Classic & Modern Cuts', specialty_am: 'ክላሲክ እና ዘመናዊ ቁረጣ', specialty_om: 'Muraa Klassikii fi Ammayyaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Abebe' },
  { name: 'Dawit Haile', name_am: 'ዳዊት ሃይሌ', name_om: 'Daawit Hayluu', phone: '+251911000002',
    specialty: 'Fades & Beard Styling', specialty_am: 'ፌዴ እና የጢም አስተካክያ', specialty_om: 'Fade fi Qaqqabaa Gadaamessaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Dawit' },
  { name: 'Yonas Tesfaye', name_am: 'ዮናስ ተስፋዬ', name_om: 'Yoonaas Taasfaayee', phone: '+251911000003',
    specialty: "Kids & Family Cuts", specialty_am: 'የልጆች እና የቤተሰብ ቁረጣ', specialty_om: "Muraa Daa'immanii fi Maatii",
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Yonas' },
];

const DEFAULT_SERVICES = [
  { name: 'Classic Haircut', name_am: 'ክላሲክ ፀጉር ቁረጣ', name_om: 'Muraa Rifeensaa Klassikii',
    description: 'Traditional haircut with scissors and comb',
    description_am: 'ባህላዊ ፀጉር ቁረጣ በቀናጢ እና ማበጠሪያ', description_om: 'Muraa rifeensaa aadaa',
    price: 150, duration_minutes: 30, category: 'haircut' },
  { name: 'Fade Cut', name_am: 'ፌዴ ቁረጣ', name_om: 'Muraa Fade',
    description: 'Modern fade haircut - low, mid, or high',
    description_am: 'ዘመናዊ ፌዴ ቁረጣ', description_om: 'Muraa fade ammayyaa',
    price: 200, duration_minutes: 45, category: 'haircut' },
  { name: 'Beard Trim & Shape', name_am: 'ጢም ቁረጣ እና አቀማምጥ', name_om: 'Muraa fi Tolcha Gadaamessaa',
    description: 'Professional beard trimming and shaping',
    description_am: 'ሙያዊ ጢም ቁረጣ', description_om: 'Muraa fi tolcha gadaamessaa',
    price: 100, duration_minutes: 20, category: 'beard' },
  { name: 'Hair & Beard Combo', name_am: 'ፀጉር እና ጢም ጥምር', name_om: 'Rifeensa fi Gadaamessa Walbira',
    description: 'Complete haircut plus beard grooming',
    description_am: 'ሙሉ ፀጉር ቁረጣ እና ጢም', description_om: 'Muraa rifeensaa guutuu fi gadaamessa',
    price: 280, duration_minutes: 60, category: 'combo' },
  { name: 'Kids Haircut', name_am: 'የልጆች ፀጉር ቁረጣ', name_om: "Muraa Rifeensaa Daa'immanii",
    description: 'Gentle haircut for children under 12',
    description_am: 'ለ12 ዓመት በታች ልጆች', description_om: "Muraa rifeensaa daa'imman",
    price: 100, duration_minutes: 25, category: 'kids' },
  { name: 'Hair Wash & Style', name_am: 'ፀጉር ማጠብ እና አስቀማጥ', name_om: 'Dhiquu fi Tolcha Rifeensaa',
    description: 'Shampoo, conditioning, and blow-dry styling',
    description_am: 'ሻምፑ, ኮንዲሽነር እና ጠምዘዛ', description_om: 'Shampoo fi blow-dry',
    price: 120, duration_minutes: 30, category: 'styling' },
];

// Runs on every server start — inserts defaults only when tables are empty
export function autoSeed() {
  const adminCount = (db.prepare('SELECT COUNT(*) as cnt FROM admin_users').get() as any).cnt;
  if (adminCount === 0) {
    const adminPwd = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (id, username, password, role) VALUES (?,?,?,?)').run(uuidv4(), 'admin', adminPwd, 'admin');
    console.log('✅ Default admin created: admin / admin123');
  }

  const barberCount = (db.prepare('SELECT COUNT(*) as cnt FROM barbers').get() as any).cnt;
  if (barberCount === 0) {
    const ins = db.prepare('INSERT INTO barbers (id,name,name_am,name_om,phone,specialty,specialty_am,specialty_om,avatar) VALUES (@id,@name,@name_am,@name_om,@phone,@specialty,@specialty_am,@specialty_om,@avatar)');
    for (const b of DEFAULT_BARBERS) ins.run({ id: uuidv4(), ...b });
    console.log(`✅ ${DEFAULT_BARBERS.length} sample barbers created`);
  }

  const serviceCount = (db.prepare('SELECT COUNT(*) as cnt FROM services').get() as any).cnt;
  if (serviceCount === 0) {
    const ins = db.prepare('INSERT INTO services (id,name,name_am,name_om,description,description_am,description_om,price,duration_minutes,category) VALUES (@id,@name,@name_am,@name_om,@description,@description_am,@description_om,@price,@duration_minutes,@category)');
    for (const s of DEFAULT_SERVICES) ins.run({ id: uuidv4(), ...s });
    console.log(`✅ ${DEFAULT_SERVICES.length} sample services created`);
  }

  const settingsCount = (db.prepare('SELECT COUNT(*) as cnt FROM shop_settings').get() as any).cnt;
  if (settingsCount === 0) {
    db.prepare('INSERT INTO shop_settings (id, data) VALUES (?, ?)').run('main', JSON.stringify(DEFAULT_SETTINGS));
    console.log('✅ Default shop settings created');
  }
}

export default db;
