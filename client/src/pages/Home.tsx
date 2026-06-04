import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { servicesApi, barbersApi } from '../lib/api';
import { Service, Barber } from '../lib/types';

function ServiceCard({ service, lang }: { service: Service; lang: string }) {
  const { t } = useTranslation();
  const name = lang === 'am' ? service.name_am || service.name
    : lang === 'om' ? service.name_om || service.name
    : service.name;
  const desc = lang === 'am' ? service.description_am || service.description
    : lang === 'om' ? service.description_om || service.description
    : service.description;

  const categoryColors: Record<string, string> = {
    haircut: 'bg-blue-500/20 text-blue-400',
    beard: 'bg-green-500/20 text-green-400',
    combo: 'bg-purple-500/20 text-purple-400',
    kids: 'bg-pink-500/20 text-pink-400',
    styling: 'bg-orange-500/20 text-orange-400',
    other: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="bg-dark-700 rounded-2xl p-6 border border-dark-600 hover:border-barber-500/50 transition-all duration-300 group hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[service.category] || categoryColors.other}`}>
          {t(`services.categories.${service.category}`)}
        </span>
        <span className="text-barber-400 font-bold text-lg">{service.price} {t('common.etb')}</span>
      </div>
      <h3 className="text-white font-bold text-lg mb-2 group-hover:text-barber-300 transition-colors">
        {name}
      </h3>
      {desc && <p className="text-gray-400 text-sm mb-4 line-clamp-2">{desc}</p>}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">⏱ {service.duration_minutes} {t('services.duration')}</span>
        <Link
          to={`/book?service=${service.id}`}
          className="text-barber-400 hover:text-barber-300 text-sm font-medium transition-colors"
        >
          {t('services.book_now')} →
        </Link>
      </div>
    </div>
  );
}

function BarberCard({ barber, lang }: { barber: Barber; lang: string }) {
  const { t } = useTranslation();
  const name = lang === 'am' ? barber.name_am || barber.name
    : lang === 'om' ? barber.name_om || barber.name
    : barber.name;
  const specialty = lang === 'am' ? barber.specialty_am || barber.specialty
    : lang === 'om' ? barber.specialty_om || barber.specialty
    : barber.specialty;

  return (
    <div className="bg-dark-700 rounded-2xl p-6 border border-dark-600 hover:border-barber-500/50 transition-all duration-300 text-center group">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-dark-600 border-2 border-barber-500/30 group-hover:border-barber-500 transition-colors">
        {barber.avatar ? (
          <img src={barber.avatar} alt={name || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">✂️</div>
        )}
      </div>
      <h3 className="text-white font-bold text-lg mb-1">{name}</h3>
      {specialty && <p className="text-barber-400 text-sm mb-4">{specialty}</p>}
      <Link
        to={`/book?barber=${barber.id}`}
        className="inline-block bg-barber-500/20 hover:bg-barber-500 text-barber-400 hover:text-dark-900 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200"
      >
        {t('barbers.book_with')} {name}
      </Link>
    </div>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ['barbers'], queryFn: barbersApi.getAll });

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-barber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-barber-600/10 rounded-full blur-2xl" />
          {/* Barbershop pole animation */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
            <div className="w-16 h-64 rounded-full overflow-hidden border-4 border-dark-600 shadow-2xl">
              <div className="w-full h-full bg-gradient-to-b from-red-600 via-white to-blue-600 animate-pulse-slow" />
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-barber-500/20 text-barber-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <span>✂️</span>
              <span>Professional Barbershop</span>
            </div>
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight ${lang === 'am' ? 'font-amharic' : ''}`}>
              {t('hero.tagline')}
            </h1>
            <p className={`text-xl text-gray-400 mb-10 max-w-2xl ${lang === 'am' ? 'font-amharic' : ''}`}>
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/book"
                className="bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-barber-500/25 hover:shadow-barber-500/40 hover:-translate-y-0.5 text-center"
              >
                {t('hero.book_btn')}
              </Link>
              <Link
                to="/queue"
                className="bg-dark-700 hover:bg-dark-600 text-white font-bold text-lg px-8 py-4 rounded-xl border border-dark-500 hover:border-barber-500/50 transition-all duration-200 text-center"
              >
                {t('hero.queue_btn')}
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16">
              {[
                { num: '500+', label: t('hero.stats.clients') },
                { num: '3', label: t('hero.stats.barbers') },
                { num: '6+', label: t('hero.stats.services') },
                { num: '5+', label: t('hero.stats.years') },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-black text-barber-400">{stat.num}</div>
                  <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-slide-up">
            <h2 className={`text-4xl font-black text-white mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
              {t('services.title')}
            </h2>
            <p className="text-gray-400 text-lg">{t('services.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} lang={lang} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/services"
              className="inline-block text-barber-400 hover:text-barber-300 font-semibold border border-barber-500/30 hover:border-barber-500/60 px-6 py-3 rounded-lg transition-all"
            >
              {t('nav.services')} →
            </Link>
          </div>
        </div>
      </section>

      {/* Barbers */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-black text-white mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
              {t('barbers.title')}
            </h2>
            <p className="text-gray-400 text-lg">{t('barbers.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-barber-600 to-barber-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className={`text-4xl font-black text-dark-900 mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
            {t('hero.book_btn')}
          </h2>
          <p className="text-dark-800 text-lg mb-8">{t('hero.subtitle')}</p>
          <Link
            to="/book"
            className="bg-dark-900 text-barber-400 font-bold text-lg px-10 py-4 rounded-xl hover:bg-dark-800 transition-colors shadow-xl"
          >
            {t('hero.book_btn')} →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-800 border-t border-dark-600 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 BarberShop. All rights reserved.</p>
          <p className="mt-1">Addis Ababa, Ethiopia | +251 911 000 000</p>
        </div>
      </footer>
    </div>
  );
}
