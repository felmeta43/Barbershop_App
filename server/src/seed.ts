import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db, { initializeDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

initializeDatabase();

const barbers = [
  {
    id: uuidv4(),
    name: 'Abebe Kebede',
    name_am: 'አበበ ከበደ',
    name_om: 'Abebe Kabadaa',
    phone: '+251911000001',
    specialty: 'Classic & Modern Cuts',
    specialty_am: 'ክላሲክ እና ዘመናዊ ቁረጣ',
    specialty_om: 'Muraa Klassikii fi Ammayyaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Abebe',
  },
  {
    id: uuidv4(),
    name: 'Dawit Haile',
    name_am: 'ዳዊት ሃይሌ',
    name_om: 'Daawit Hayluu',
    phone: '+251911000002',
    specialty: 'Fades & Beard Styling',
    specialty_am: 'ፌዴ እና የጢም አስተካክያ',
    specialty_om: 'Fade fi Qaqqabaa Gadaamessaa',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Dawit',
  },
  {
    id: uuidv4(),
    name: 'Yonas Tesfaye',
    name_am: 'ዮናስ ተስፋዬ',
    name_om: 'Yoonaas Taasfaayee',
    phone: '+251911000003',
    specialty: 'Kids & Family Cuts',
    specialty_am: 'የልጆች እና የቤተሰብ ቁረጣ',
    specialty_om: 'Muraa Daa\'immanii fi Maatii',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Yonas',
  },
];

const services = [
  {
    id: uuidv4(),
    name: 'Classic Haircut',
    name_am: 'ክላሲክ ፀጉር ቁረጣ',
    name_om: 'Muraa Rifeensaa Klassikii',
    description: 'Traditional haircut with scissors and comb',
    description_am: 'ባህላዊ ፀጉር ቁረጣ በቀናጢ እና ማበጠሪያ',
    description_om: 'Muraa rifeensaa aadaa makiyyaafi qaxamura waliin',
    price: 150,
    duration_minutes: 30,
    category: 'haircut',
  },
  {
    id: uuidv4(),
    name: 'Fade Cut',
    name_am: 'ፌዴ ቁረጣ',
    name_om: 'Muraa Fade',
    description: 'Modern fade haircut - low, mid, or high',
    description_am: 'ዘመናዊ ፌዴ ቁረጣ - ዝቅተኛ, መካከለኛ, ወይም ከፍተኛ',
    description_om: 'Muraa fade ammayyaa - gadi, giddu, ykn ol',
    price: 200,
    duration_minutes: 45,
    category: 'haircut',
  },
  {
    id: uuidv4(),
    name: 'Beard Trim & Shape',
    name_am: 'ጢም ቁረጣ እና አቀማምጥ',
    name_om: 'Muraa fi Tolcha Gadaamessaa',
    description: 'Professional beard trimming and shaping',
    description_am: 'ሙያዊ ጢም ቁረጣ እና አቀማምጥ',
    description_om: 'Muraa fi tolcha gadaamessaa ogummaadhaan',
    price: 100,
    duration_minutes: 20,
    category: 'beard',
  },
  {
    id: uuidv4(),
    name: 'Hair & Beard Combo',
    name_am: 'ፀጉር እና ጢም ጥምር',
    name_om: 'Rifeensa fi Gadaamessa Walbira',
    description: 'Complete haircut plus beard grooming',
    description_am: 'ሙሉ ፀጉር ቁረጣ እና ጢም ቁረጣ',
    description_om: 'Muraa rifeensaa guutuu fi gadaamessa',
    price: 280,
    duration_minutes: 60,
    category: 'combo',
  },
  {
    id: uuidv4(),
    name: 'Kids Haircut',
    name_am: 'የልጆች ፀጉር ቁረጣ',
    name_om: 'Muraa Rifeensaa Daa\'immanii',
    description: 'Gentle haircut for children under 12',
    description_am: 'ለ12 ዓመት በታች ልጆች ቀስ ያለ ቁረጣ',
    description_om: 'Muraa rifeensaa gara daa\'imman waggaa 12 gadi',
    price: 100,
    duration_minutes: 25,
    category: 'kids',
  },
  {
    id: uuidv4(),
    name: 'Hair Wash & Style',
    name_am: 'ፀጉር ማጠብ እና አስቀማጥ',
    name_om: 'Dhiquu fi Tolcha Rifeensaa',
    description: 'Shampoo, conditioning, and blow-dry styling',
    description_am: 'ሻምፑ, ኮንዲሽነር እና ጠምዘዛ',
    description_om: 'Shampoo, conditioning, fi blow-dry',
    price: 120,
    duration_minutes: 30,
    category: 'styling',
  },
];

// Insert barbers
const insertBarber = db.prepare(`
  INSERT OR IGNORE INTO barbers (id, name, name_am, name_om, phone, specialty, specialty_am, specialty_om, avatar)
  VALUES (@id, @name, @name_am, @name_om, @phone, @specialty, @specialty_am, @specialty_om, @avatar)
`);

for (const barber of barbers) {
  insertBarber.run(barber);
}

// Insert services
const insertService = db.prepare(`
  INSERT OR IGNORE INTO services (id, name, name_am, name_om, description, description_am, description_om, price, duration_minutes, category)
  VALUES (@id, @name, @name_am, @name_om, @description, @description_am, @description_om, @price, @duration_minutes, @category)
`);

for (const service of services) {
  insertService.run(service);
}

// Insert admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO admin_users (id, username, password, role)
  VALUES (@id, @username, @password, @role)
`);

insertAdmin.run({
  id: uuidv4(),
  username: 'admin',
  password: adminPassword,
  role: 'admin',
});

console.log('✅ Database seeded successfully!');
console.log('👤 Admin login: admin / admin123');
console.log(`✂️  ${barbers.length} barbers added`);
console.log(`💈 ${services.length} services added`);
