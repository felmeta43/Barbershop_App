import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { servicesApi, barbersApi, appointmentsApi, paymentApi } from '../lib/api';
import { Service, Barber } from '../lib/types';
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

const STEPS = ['service', 'barber', 'datetime', 'details', 'confirm'] as const;
type Step = typeof STEPS[number];

interface BookingData {
  service_id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
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
  });

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ['barbers'], queryFn: barbersApi.getAll });

  const { data: availability } = useQuery({
    queryKey: ['availability', data.appointment_date, data.barber_id],
    queryFn: () => appointmentsApi.checkAvailability(data.appointment_date, data.barber_id || undefined),
    enabled: !!data.appointment_date,
  });

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
    ? new Date(Date.now() + shop.advance_booking_days * 86400000).toISOString().split('T')[0]
    : undefined;

  const getServiceName = (s: Service) =>
    lang === 'am' ? s.name_am || s.name : lang === 'om' ? s.name_om || s.name : s.name;
  const getBarberName = (b: Barber) =>
    lang === 'am' ? b.name_am || b.name : lang === 'om' ? b.name_om || b.name : b.name;

  useEffect(() => {
    if (data.service_id && step === 'service') setStep('barber');
  }, []);

  const bookMutation = useMutation({
    mutationFn: () => appointmentsApi.create({ ...data, lang }),
    onSuccess: (result) => {
      setConfirmed(result);
      toast.success(t('booking.booking_confirmed'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.initialize(confirmed.id, confirmed.customer_email),
    onSuccess: (res) => { window.location.href = res.checkout_url; },
    onError: () => toast.error('Payment initialization failed'),
  });

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 'service') return !!data.service_id;
    if (step === 'barber') return true;
    if (step === 'datetime') return !!data.appointment_date && !!data.appointment_time && !isDayClosed;
    if (step === 'details') return !!data.customer_name && data.customer_phone.length >= 9;
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
              📱 {t('booking.sms_sent')}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="w-full bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {payMutation.isPending ? t('payment.processing') : `💳 ${t('booking.pay_now')}`}
              </button>
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
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => setData((d) => ({ ...d, barber_id: barber.id }))}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                      data.barber_id === barber.id
                        ? 'bg-barber-500/20 border-barber-500 text-white'
                        : 'bg-dark-600 border-dark-500 text-gray-300 hover:border-barber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-500 flex items-center justify-center">
                        {barber.avatar
                          ? <img src={barber.avatar} alt="" className="w-full h-full object-cover" />
                          : <span>✂️</span>
                        }
                      </div>
                      <div>
                        <div className={`font-semibold ${lang === 'am' ? 'font-amharic' : ''}`}>{getBarberName(barber)}</div>
                        {barber.specialty && (
                          <div className="text-xs text-barber-400">
                            {lang === 'am' ? barber.specialty_am || barber.specialty
                              : lang === 'om' ? barber.specialty_om || barber.specialty
                              : barber.specialty}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
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
                    min={new Date().toISOString().split('T')[0]}
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

          {/* Step 5: Confirm */}
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
