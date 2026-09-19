/**
 * Reseed barbers and services — adds all DEFAULT samples, skipping any whose
 * name already exists. Safe to run multiple times.
 */
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../../.env') });
config();

import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

const BARBERS = [
  { name: 'Abebe Kebede', name_am: 'አበበ ከበደ', name_om: 'Abebe Kabadaa', phone: '+251911000001',
    specialty: 'Classic & Modern Cuts', specialty_am: 'ክላሲክ እና ዘመናዊ ቁረጣ', specialty_om: 'Muraa Klassikii fi Ammayyaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Abebe' },
  { name: 'Dawit Haile', name_am: 'ዳዊት ሃይሌ', name_om: 'Daawit Hayluu', phone: '+251911000002',
    specialty: 'Fades & Beard Styling', specialty_am: 'ፌዴ እና የጢም አስተካክያ', specialty_om: 'Fade fi Qaqqabaa Gadaamessaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Dawit' },
  { name: 'Yonas Tesfaye', name_am: 'ዮናስ ተስፋዬ', name_om: 'Yoonaas Taasfaayee', phone: '+251911000003',
    specialty: "Kids & Family Cuts", specialty_am: 'የልጆች እና የቤተሰብ ቁረጣ', specialty_om: "Muraa Daa'immanii fi Maatii",
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Yonas' },
  { name: 'Samuel Girma', name_am: 'ሳሙኤል ግርማ', name_om: 'Saamueel Girmaa', phone: '+251911000004',
    specialty: 'Hot Towel Shave & Grooming', specialty_am: 'ሞቅ ጨርቅ ላጨት እና ማስዋቢያ', specialty_om: 'Haaduu fi Miidhagina',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Samuel' },
  { name: 'Biruk Alemu', name_am: 'ብሩክ አለሙ', name_om: 'Biruuk Alemuu', phone: '+251911000005',
    specialty: 'Skin Fade & Line-ups', specialty_am: 'ስኪን ፌዴ እና ላይን አፕ', specialty_om: 'Skin Fade fi Line-up',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Biruk' },
  { name: 'Henok Tadesse', name_am: 'ሄኖክ ታደሰ', name_om: 'Heenok Taaddasaa', phone: '+251911000006',
    specialty: 'Dreadlocks & Braids', specialty_am: 'ድሬድ ሎክ እና ፍታ', specialty_om: 'Dreadlocks fi Braids',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Henok' },
  { name: 'Mikias Worku', name_am: 'ሚኪያስ ወርቁ', name_om: 'Mikiyas Worquu', phone: '+251911000007',
    specialty: 'Hair Coloring & Treatment', specialty_am: 'ፀጉር ቀለም እና ሕክምና', specialty_om: 'Halluu Rifeensaa fi Yaalii',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Mikias' },
  { name: 'Robel Desta', name_am: 'ሮቤል ደስታ', name_om: 'Robeel Dastaa', phone: '+251911000008',
    specialty: 'Afro & Natural Styles', specialty_am: 'አፍሮ እና ተፈጥሯዊ አስቀማጥ', specialty_om: 'Afro fi Haala Uumamaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Robel' },
];

const SERVICES = [
  { name: 'Classic Haircut', name_am: 'ክላሲክ ፀጉር ቁረጣ', name_om: 'Muraa Rifeensaa Klassikii',
    description: 'Traditional haircut with scissors and comb',
    description_am: 'ባህላዊ ፀጉር ቁረጣ በቀናጢ እና ማበጠሪያ', description_om: 'Muraa rifeensaa aadaa',
    price: 150, duration_minutes: 30, category: 'haircut' },
  { name: 'Skin Fade', name_am: 'ስኪን ፌዴ', name_om: 'Skin Fade',
    description: 'Sharp skin fade — low, mid, or high',
    description_am: 'ሹል ስኪን ፌዴ', description_om: 'Skin fade cilee',
    price: 220, duration_minutes: 45, category: 'haircut' },
  { name: 'Taper Fade', name_am: 'ቴፐር ፌዴ', name_om: 'Taper Fade',
    description: 'Gradual taper fade for a clean look',
    description_am: 'ቀስ በቀስ ፌዴ ቁረጣ', description_om: 'Taper fade karaa qulqulluu',
    price: 200, duration_minutes: 40, category: 'haircut' },
  { name: 'Beard Trim & Shape', name_am: 'ጢም ቁረጣ እና አቀማምጥ', name_om: 'Muraa fi Tolcha Gadaamessaa',
    description: 'Professional beard trimming and shaping',
    description_am: 'ሙያዊ ጢም ቁረጣ', description_om: 'Muraa fi tolcha gadaamessaa',
    price: 100, duration_minutes: 20, category: 'beard' },
  { name: 'Hot Towel Shave', name_am: 'ሞቅ ጨርቅ ላጨት', name_om: 'Haaduu Uffata Ho\'aa',
    description: 'Luxurious straight-razor shave with hot towel',
    description_am: 'የቅንጦት ቀጥ ላጨት', description_om: 'Haaduu luxury',
    price: 150, duration_minutes: 30, category: 'beard' },
  { name: 'Hair & Beard Combo', name_am: 'ፀጉር እና ጢም ጥምር', name_om: 'Rifeensa fi Gadaamessa Walbira',
    description: 'Complete haircut plus beard grooming',
    description_am: 'ሙሉ ፀጉር ቁረጣ እና ጢም', description_om: 'Muraa rifeensaa guutuu fi gadaamessa',
    price: 280, duration_minutes: 60, category: 'combo' },
  { name: 'Fade & Beard Combo', name_am: 'ፌዴ እና ጢም ጥምር', name_om: 'Fade fi Gadaamessa',
    description: 'Skin fade haircut with full beard service',
    description_am: 'ስኪን ፌዴ እና ሙሉ ጢም ሕክምና', description_om: 'Fade fi tajaajila gadaamessa',
    price: 320, duration_minutes: 75, category: 'combo' },
  { name: 'Kids Haircut', name_am: 'የልጆች ፀጉር ቁረጣ', name_om: "Muraa Rifeensaa Daa'immanii",
    description: 'Gentle haircut for children under 12',
    description_am: 'ለ12 ዓመት በታች ልጆች', description_om: "Muraa rifeensaa daa'imman",
    price: 100, duration_minutes: 25, category: 'kids' },
  { name: 'Hair Wash & Style', name_am: 'ፀጉር ማጠብ እና አስቀማጥ', name_om: 'Dhiquu fi Tolcha Rifeensaa',
    description: 'Shampoo, conditioning, and blow-dry styling',
    description_am: 'ሻምፑ, ኮንዲሽነር እና ጠምዘዛ', description_om: 'Shampoo fi blow-dry',
    price: 120, duration_minutes: 30, category: 'styling' },
  { name: 'Hair Coloring', name_am: 'ፀጉር ቀለም መቀባት', name_om: 'Halluu Rifeensaa',
    description: 'Full hair coloring or highlights',
    description_am: 'ሙሉ ፀጉር ቀለም', description_om: 'Halluu rifeensaa guutuu',
    price: 400, duration_minutes: 90, category: 'styling' },
  { name: 'Scalp Treatment', name_am: 'የራስ ቆዳ ሕክምና', name_om: 'Yaalii Gogaa Mataa',
    description: 'Deep scalp massage and moisturizing treatment',
    description_am: 'ጥልቅ የራስ ቆዳ ሕክምና', description_om: 'Yaalii gogaa mataa',
    price: 180, duration_minutes: 30, category: 'treatment' },
  { name: 'Line-up & Edge', name_am: 'ላይን አፕ እና ጥርት አጨዳ', name_om: 'Line-up fi Edge',
    description: 'Crisp hairline and edge definition',
    description_am: 'ሹል ፀጉር ድንበር', description_om: 'Line-up cilee',
    price: 80, duration_minutes: 15, category: 'haircut' },
];

async function reseed() {
  // Barbers — skip names that already exist
  const existingBarbers = await db.collection('barbers').get();
  const existingBarberNames = new Set(existingBarbers.docs.map((d) => d.data().name));
  const newBarbers = BARBERS.filter((b) => !existingBarberNames.has(b.name));
  if (newBarbers.length > 0) {
    const batch = db.batch();
    for (const b of newBarbers) {
      const id = uuidv4();
      batch.set(db.collection('barbers').doc(id), { id, ...b, is_active: true, created_at: new Date().toISOString() });
    }
    await batch.commit();
    console.log(`✅ Added ${newBarbers.length} new barbers`);
  } else {
    console.log('ℹ️  All barbers already exist — nothing added');
  }

  // Services — skip names that already exist
  const existingServices = await db.collection('services').get();
  const existingServiceNames = new Set(existingServices.docs.map((d) => d.data().name));
  const newServices = SERVICES.filter((s) => !existingServiceNames.has(s.name));
  if (newServices.length > 0) {
    const batch = db.batch();
    for (const s of newServices) {
      const id = uuidv4();
      batch.set(db.collection('services').doc(id), { id, ...s, is_active: true, created_at: new Date().toISOString() });
    }
    await batch.commit();
    console.log(`✅ Added ${newServices.length} new services`);
  } else {
    console.log('ℹ️  All services already exist — nothing added');
  }

  console.log('Done!');
  process.exit(0);
}

reseed().catch((err) => { console.error(err); process.exit(1); });
