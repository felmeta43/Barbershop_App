import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { servicesApi, barbersApi, appointmentsApi, paymentApi, banksApi } from '../lib/api';
import { Service, Barber, BankAccount } from '../lib/types';
import { useShop } from '../context/ShopContext';

const FALLBACK_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

function generateTimeSlots(open: string, close: string, slotMinutes: number): string[] {
  const slots: string[] = [];
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  let mins = oh * 60 + om;
  const end = ch * 60 + cm;
  while (mins < end) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
    mins += slotMinutes;
  }
  return slots;
}

function getDayName(dateStr: string) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[new Date(dateStr + 'T00:00:00').getDay()];
}

function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STEPS = ['service', 'barber', 'datetime', 'details', 'payment', 'confirm'] as const;
type Step = typeof STEPS[number];

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface BookingData {
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  payment_method: 'chapa' | 'bank_transfer' | '';
  selected_bank: BankAccount | null;
  bank_screenshot: string; // base64
}

export default function Booking() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { shop, currencySymbol } = useShop();

  const [step, setStep] = useState<Step>('service');
  const [confirmed, setConfirmed] = useState<any>(null);
  const [data, setData] = useState<BookingData>({
    service_id: searchParams.get('service') || '',
    barber_id: searchParams.get('barber') || '',
    appointment_date: '',
    appointment_time: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    payment_method: '',
    selected_bank: null,
    bank_screenshot: '',
  });

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ['barbers'], queryFn: barbersApi.getAll });
  const { data: banks = [] } = useQuery<BankAccount[]>({ queryKey: ['banks'], queryFn: banksApi.getAll, refetchInterval: false });

  const { data: availability } = useQuery({
    queryKey: ['availability', data.appointment_date, data.barber_id],
    queryFn: () => appointmentsApi.checkAvailability(data.appointment_date, data.barber_id || undefined),
    enabled: !!data.appointment_date,
  });

  // Fetch unavailable barber IDs for the selected date
  const { data: unavailableBarberIds = [] } = useQuery<string[]>({
    queryKey: ['barber-unavailable-ids', data.appointment_date],
    queryFn: () => barbersApi.getUnavailableIds(data.appointment_date),
    enabled: !!data.appointment_date,
    refetchInterval: false, // no need to poll for this
  });

  const selectedBarberUnavailable =
    !!data.barber_id && !!data.appointment_date && unavailableBarberIds.includes(data.barber_id);

  const selectedService = services.find((s) => s.id === data.service_id);
  const selectedBarber = barbers.find((b) => b.id === data.barber_id);
  const bookedTimes: string[] = availability?.booked_times || [];

  // Compute available time slots from working hours
  const dayName = data.appointment_date ? getDayName(data.appointment_date) : null;
  const dayHours = dayName ? shop?.working_hours?.[dayName] : null;
  const isDayClosed = dayHours?.closed ?? false;
  const timeSlots = dayHours && !isDayClosed
    ? generateTimeSlots(dayHours.open, dayHours.close, shop?.slot_duration_minutes || 30)
    : FALLBACK_SLOTS;

  // Max bookable date
  const maxDate = shop?.advance_booking_days
    ? localDateStr(shop.advance_booking_days)
    : undefined;

  const getServiceName = (s: Service) =>
    lang === 'am' ? s.name_am || s.name : lang === 'om' ? s.name_om || s.name : s.name;
  const getBarberName = (b: Barber) =>
    lang === 'am' ? b.name_am || b.name : lang === 'om' ? b.name_om || b.name : b.name;

  useEffect(() => {
    if (data.service_id && step === 'service') setStep('barber');
  }, []);

  const bookMutation = useMutation({
    mutationFn: () => appointmentsApi.create({
      ...data,
      lang,
      payment_method: data.payment_method || 'chapa',
      bank_id: data.selected_bank?.id,
      bank_name: data.selected_bank?.bank_name,
      bank_account_number: data.selected_bank?.account_number,
      bank_account_name: data.selected_bank?.account_name,
      bank_transfer_screenshot: data.bank_screenshot || undefined,
    }),
    onSuccess: (result) => {
      setConfirmed(result);
      toast.success(t('booking.booking_confirmed'));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || t('common.error');
      toast.error(msg, { duration: 6000 });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.initialize(confirmed.id, confirmed.customer_email || undefined),
    onSuccess: (res) => { window.location.href = res.checkout_url; },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Payment initialization failed';
      toast.error(msg, { duration: 8000 });
    },
  });

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 'service') return !!data.service_id;
    if (step === 'barber') return true;
    if (step === 'datetime') return !!data.appointment_date && !!data.appointment_time && !isDayClosed && !selectedBarberUnavailable;
    if (step === 'details') return !!data.customer_name && data.customer_phone.length >= 9;
    if (step === 'payment') {
      if (!data.payment_method) return false;
      if (data.payment_method === 'bank_transfer') return !!data.selected_bank && !!data.bank_screenshot;
      return true; // chapa — no screenshot needed
    }
    return true;
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    else bookMutation.mutate();
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-dark-900 pt-20 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-dark-700 rounded-3xl p-8 border border-barber-500/30 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className={`text-2xl font-black text-white mb-2 ${lang === 'am' ? 'font-amharic' : ''}`}>
              {t('booking.booking_confirmed')}
            </h2>
            <div className="bg-barber-500/20 rounded-2xl p-6 my-6">
              <div className="text-barber-400 text-sm mb-2">{t('booking.queue_number')}</div>
              <div className="text-7xl font-black text-barber-400">#{confirmed.queue_number}</div>
            </div>
            <div className="space-y-3 text-left text-sm mb-6">
              {[
                { label: t('common.service'), val: confirmed.service_name },
                { label: t('common.barber'), val: confirmed.barber_name || t('booking.any_barber') },
                { label: t('common.date'), val: `${confirmed.appointment_date} ${confirmed.appointment_time}` },
                { label: t('payment.amount'), val: `${confirmed.payment_amount} ${currencySymbol}` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="text-white font-medium">{r.val}</span>
                </div>
              ))}
            </div>
            <p className={`text-gray-500 text-sm mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
              📱 {confirmed.sms_sent ? t('booking.sms_sent') : t('booking.sms_note')}
            </p>
            <div className="space-y-3">
              {confirmed.payment_method === 'bank_transfer' ? (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-300 text-sm text-center">
                  🏦 Bank transfer screenshot submitted.<br />
                  <span className="text-blue-400 font-semibold">The admin will verify your payment and confirm your appointment.</span>
                </div>
              ) : (
              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="w-full bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {payMutation.isPending ? t('payment.processing') : `💳 ${t('booking.pay_now')}`}
              </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full bg-dark-600 hover:bg-dark-500 text-gray-300 font-medium py-3 rounded-xl transition-colors"
              >
                {t('booking.pay_later')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-black text-white mb-2 ${lang === 'am' ? 'font-amharic' : ''}`}>
            {t('booking.title')}
          </h1>
          <div className="mt-6 h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full bg-barber-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className={`text-xs ${i <= stepIndex ? 'text-barber-400' : 'text-gray-600'}`}>
                {t(`booking.steps.${s}`)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-700 rounded-3xl p-6 sm:p-8 border border-dark-600">
          {/* Step 1: Service */}
          {step === 'service' && (
            <div className="animate-fade-in">
              <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('booking.steps.service')}
              </h2>
              <div className="space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setData((d) => ({ ...d, service_id: service.id }))}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                      data.service_id === service.id
                        ? 'bg-barber-500/20 border-barber-500 text-white'
                        : 'bg-dark-600 border-dark-500 text-gray-300 hover:border-barber-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-semibold ${lang === 'am' ? 'font-amharic' : ''}`}>
                          {getServiceName(service)}
                        </div>
                        <div className="text-sm text-gray-400 mt-0.5">⏱ {service.duration_minutes} {t('services.duration')}</div>
                      </div>
                      <div className="text-barber-400 font-bold text-lg">{service.price} {currencySymbol}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Barber */}
          {step === 'barber' && (
            <div className="animate-fade-in">
              <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('booking.steps.barber')}
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setData((d) => ({ ...d, barber_id: '' }))}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                    data.barber_id === ''
                      ? 'bg-barber-500/20 border-barber-500 text-white'
                      : 'bg-dark-600 border-dark-500 text-gray-300 hover:border-barber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dark-500 rounded-full flex items-center justify-center text-xl">✂️</div>
                    <div className={lang === 'am' ? 'font-amharic' : ''}>{t('booking.any_barber')}</div>
                  </div>
                </button>
                {barbers.map((barber) => {
                  const isUnavail = unavailableBarberIds.includes(barber.id);
                  return (
                    <button
                      key={barber.id}
                      onClick={() => !isUnavail && setData((d) => ({ ...d, barber_id: barber.id }))}
                      disabled={isUnavail}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                        isUnavail
                          ? 'bg-dark-800 border-dark-700 text-gray-600 cursor-not-allowed opacity-60'
                          : data.barber_id === barber.id
                          ? 'bg-barber-500/20 border-barber-500 text-white'
                          : 'bg-dark-600 border-dark-500 text-gray-300 hover:border-barber-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-500 flex items-center justify-center">
                          {barber.avatar
                            ? <img src={barber.avatar} alt="" className={`w-full h-full object-cover ${isUnavail ? 'grayscale' : ''}`} />
                            : <span>✂️</span>
                          }
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${lang === 'am' ? 'font-amharic' : ''}`}>{getBarberName(barber)}</div>
                          {isUnavail ? (
                            <div className="text-xs text-red-500/80">🚫 Not available on {data.appointment_date || 'selected date'}</div>
                          ) : barber.specialty ? (
                            <div className="text-xs text-barber-400">
                              {lang === 'am' ? barber.specialty_am || barber.specialty
                                : lang === 'om' ? barber.specialty_om || barber.specialty
                                : barber.specialty}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 'datetime' && (
            <div className="animate-fade-in">
              <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('booking.steps.datetime')}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">{t('booking.date_label')}</label>
                  <input
                    type="date"
                    value={data.appointment_date}
                    min={localDateStr()}
                    max={maxDate}
                    onChange={(e) => setData((d) => ({ ...d, appointment_date: e.target.value, appointment_time: '' }))}
                    className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-barber-500"
                  />
                </div>

                {data.appointment_date && isDayClosed && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-400 text-sm">
                    🚫 The shop is closed on this day. Please pick another date.
                  </div>
                )}

                {data.appointment_date && !isDayClosed && selectedBarberUnavailable && selectedBarber && (
                  <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl p-4 text-orange-400 text-sm space-y-2">
                    <p className="font-semibold">⚠️ {selectedBarber.name} is not available on {data.appointment_date}.</p>
                    <p className="text-orange-300/80">Please choose a different date, or go back and select "Any Barber".</p>
                    <button
                      onClick={() => setData((d) => ({ ...d, barber_id: '', appointment_time: '' }))}
                      className="mt-1 text-xs font-semibold bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ↺ Switch to Any Barber
                    </button>
                  </div>
                )}

                {data.appointment_date && !isDayClosed && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-3">{t('booking.time_label')}</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map((slot) => {
                        const isBooked = bookedTimes.includes(slot);
                        return (
                          <button
                            key={slot}
                            disabled={isBooked}
                            onClick={() => setData((d) => ({ ...d, appointment_time: slot }))}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                              data.appointment_time === slot
                                ? 'bg-barber-500 text-dark-900 font-bold'
                                : isBooked
                                ? 'bg-dark-800 text-gray-700 cursor-not-allowed line-through'
                                : 'bg-dark-600 text-gray-300 hover:bg-dark-500 hover:text-white border border-dark-500'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Customer Details */}
          {step === 'details' && (
            <div className="animate-fade-in">
              <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('booking.steps.details')}
              </h2>
              <div className="space-y-4">
                {[
                  { key: 'customer_name', label: t('booking.name_label'), type: 'text', required: true },
                  { key: 'customer_phone', label: t('booking.phone_label'), type: 'tel', required: true, placeholder: '+251...' },
                  { key: 'customer_email', label: t('booking.email_label'), type: 'email', required: false },
                  { key: 'notes', label: t('booking.notes_label'), type: 'text', required: false },
                ].map(({ key, label, type, required, placeholder }) => (
                  <div key={key}>
                    <label className="block text-gray-300 text-sm font-medium mb-2">{label}</label>
                    <input
                      type={type}
                      value={(data as any)[key]}
                      onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required={required}
                      className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-barber-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 'payment' && (
            <div className="animate-fade-in">
              <h2 className="text-white font-bold text-xl mb-6">Choose Payment Method</h2>

              {/* Method selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  { value: 'bank_transfer', icon: '🏦', label: 'Bank Transfer', sub: 'Transfer & upload screenshot' },
                  { value: 'chapa', icon: '💳', label: 'Pay Online', sub: 'Chapa — card / mobile money' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, payment_method: opt.value as any, selected_bank: null, bank_screenshot: '' }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      data.payment_method === opt.value
                        ? 'bg-barber-500/20 border-barber-500 text-white'
                        : 'bg-dark-600 border-dark-500 text-gray-300 hover:border-barber-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>

              {/* Bank transfer flow */}
              {data.payment_method === 'bank_transfer' && (
                <div className="space-y-4">
                  {banks.length === 0 ? (
                    <div className="bg-dark-600 rounded-xl p-4 text-gray-500 text-sm text-center">
                      No bank accounts configured yet. Please contact the shop.
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-400 text-sm font-medium">Select a bank to transfer to:</p>
                      <div className="space-y-2">
                        {banks.map((bank) => (
                          <button
                            key={bank.id}
                            onClick={() => setData((d) => ({ ...d, selected_bank: bank }))}
                            className={`w-full p-4 rounded-xl border text-left transition-all ${
                              data.selected_bank?.id === bank.id
                                ? 'bg-barber-500/20 border-barber-500'
                                : 'bg-dark-600 border-dark-500 hover:border-barber-500/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{bank.logo_emoji}</span>
                              <div>
                                <div className="text-white font-semibold">{bank.bank_name}</div>
                                <div className="text-gray-400 text-xs">{bank.account_name}</div>
                              </div>
                              <div className="ml-auto text-right">
                                <div className="text-barber-400 font-mono text-sm">{bank.account_number}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {data.selected_bank && (
                        <div className="bg-barber-500/10 border border-barber-500/30 rounded-xl p-4 space-y-2 text-sm">
                          <p className="text-barber-400 font-semibold">Transfer Details</p>
                          <div className="flex justify-between"><span className="text-gray-400">Bank</span><span className="text-white">{data.selected_bank.bank_name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Account No.</span><span className="text-white font-mono">{data.selected_bank.account_number}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Account Name</span><span className="text-white">{data.selected_bank.account_name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="text-barber-400 font-bold">{selectedService?.price} {currencySymbol}</span></div>
                          {data.selected_bank.instructions && (
                            <p className="text-gray-500 text-xs pt-1 border-t border-barber-500/20">{data.selected_bank.instructions}</p>
                          )}
                        </div>
                      )}

                      {data.selected_bank && (
                        <div>
                          <p className="text-gray-400 text-sm font-medium mb-2">Upload transfer screenshot:</p>
                          <label className={`flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                            data.bank_screenshot ? 'border-green-500/50 bg-green-500/10' : 'border-dark-500 bg-dark-600 hover:border-barber-500/50'
                          }`}>
                            {data.bank_screenshot ? (
                              <div className="flex flex-col items-center gap-2">
                                <img src={data.bank_screenshot} alt="screenshot" className="h-24 rounded-lg object-contain" />
                                <span className="text-green-400 text-xs">✓ Screenshot uploaded — click to change</span>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="text-3xl mb-1">📸</div>
                                <div className="text-gray-400 text-sm">Click to upload screenshot</div>
                                <div className="text-gray-600 text-xs mt-0.5">JPG, PNG or PDF</div>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const compressed = await compressImage(file);
                                  setData((d) => ({ ...d, bank_screenshot: compressed }));
                                } catch {
                                  toast.error('Failed to process image');
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {data.payment_method === 'chapa' && (
                <div className="bg-dark-600 rounded-xl p-4 text-gray-400 text-sm">
                  💳 You'll be redirected to Chapa to complete payment after confirming your booking.
                </div>
              )}
            </div>
          )}

          {/* Step 6: Confirm */}
          {step === 'confirm' && (
            <div className="animate-fade-in">
              <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('booking.steps.confirm')}
              </h2>
              <div className="space-y-3">
                {[
                  { label: t('common.service'), val: selectedService ? getServiceName(selectedService) : '-' },
                  { label: t('common.barber'), val: selectedBarber ? getBarberName(selectedBarber) : t('booking.any_barber') },
                  { label: t('common.date'), val: data.appointment_date },
                  { label: t('common.time'), val: data.appointment_time },
                  { label: t('admin.name'), val: data.customer_name },
                  { label: t('admin.phone'), val: data.customer_phone },
                  { label: t('payment.amount'), val: `${selectedService?.price || 0} ${currencySymbol}` },
                  { label: 'Payment', val: data.payment_method === 'bank_transfer' ? `🏦 Bank Transfer (${data.selected_bank?.bank_name})` : '💳 Pay Online (Chapa)' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between py-3 border-b border-dark-600">
                    <span className="text-gray-400">{r.label}</span>
                    <span className={`text-white font-medium ${lang === 'am' ? 'font-amharic' : ''}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
              >
                ← {t('booking.back')}
              </button>
            )}
            <button
              onClick={goNext}
              disabled={!canNext() || bookMutation.isPending}
              className="flex-1 bg-barber-500 hover:bg-barber-400 disabled:opacity-40 disabled:cursor-not-allowed text-dark-900 font-bold py-3 rounded-xl transition-all duration-200"
            >
              {bookMutation.isPending ? t('common.loading') :
               step === 'confirm' ? `✅ ${t('booking.confirm')}` :
               `${t('booking.next')} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
