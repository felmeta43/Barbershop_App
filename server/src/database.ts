import { db } from './firebase';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_SETTINGS = {
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
  { name: 'Beard Trim and Shape', name_am: 'ጢም ቁረጣ እና አቀማምጥ', name_om: 'Muraa fi Tolcha Gadaamessaa',
    description: 'Professional beard trimming and shaping',
    description_am: 'ሙያዊ ጢም ቁረጣ', description_om: 'Muraa fi tolcha gadaamessaa',
    price: 100, duration_minutes: 20, category: 'beard' },
  { name: 'Hair and Beard Combo', name_am: 'ፀጉር እና ጢም ጥምር', name_om: 'Rifeensa fi Gadaamessa Walbira',
    description: 'Complete haircut plus beard grooming',
    description_am: 'ሙሉ ፀጉር ቁረጣ እና ጢም', description_om: 'Muraa rifeensaa guutuu fi gadaamessa',
    price: 280, duration_minutes: 60, category: 'combo' },
  { name: 'Kids Haircut', name_am: 'የልጆች ፀጉር ቁረጣ', name_om: "Muraa Rifeensaa Daa'immanii",
    description: 'Gentle haircut for children under 12',
    description_am: 'ለ12 ዓመት በታች ልጆች', description_om: "Muraa rifeensaa daa'imman",
    price: 100, duration_minutes: 25, category: 'kids' },
  { name: 'Hair Wash and Style', name_am: 'ፀጉር ማጠብ እና አስቀማጥ', name_om: 'Dhiquu fi Tolcha Rifeensaa',
    description: 'Shampoo, conditioning, and blow-dry styling',
    description_am: 'ሻምፑ, ኮንዲሽነር እና ጠምዘዛ', description_om: 'Shampoo fi blow-dry',
    price: 120, duration_minutes: 30, category: 'styling' },
];

// Seeds Firestore on every startup — inserts defaults only when collections are empty
export async function autoSeed() {
  const adminSnap = await db.collection('admin_users').limit(1).get();
  if (adminSnap.empty) {
    const adminPwd = bcrypt.hashSync('admin123', 10);
    const id = uuidv4();
    await db.collection('admin_users').doc(id).set({
      id, username: 'admin', password: adminPwd, role: 'admin',
      created_at: new Date().toISOString(),
    });
    console.log('✅ Default admin created: admin / admin123');
  }

  const barbersSnap = await db.collection('barbers').limit(1).get();
  if (barbersSnap.empty) {
    const batch = db.batch();
    for (const b of DEFAULT_BARBERS) {
      const id = uuidv4();
      batch.set(db.collection('barbers').doc(id), {
        id, ...b, is_active: true, created_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ ${DEFAULT_BARBERS.length} sample barbers created`);
  }

  const servicesSnap = await db.collection('services').limit(1).get();
  if (servicesSnap.empty) {
    const batch = db.batch();
    for (const s of DEFAULT_SERVICES) {
      const id = uuidv4();
      batch.set(db.collection('services').doc(id), {
        id, ...s, is_active: true, created_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ ${DEFAULT_SERVICES.length} sample services created`);
  }

  const settingsSnap = await db.collection('shop_settings').doc('main').get();
  if (!settingsSnap.exists) {
    await db.collection('shop_settings').doc('main').set({
      ...DEFAULT_SETTINGS, updated_at: new Date().toISOString(),
    });
    console.log('✅ Default shop settings created');
  }
}
