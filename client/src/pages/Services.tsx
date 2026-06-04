import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../lib/api';
import { Service } from '../lib/types';

export default function Services() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const categories = ['all', 'haircut', 'beard', 'combo', 'kids', 'styling'];
  const filtered = activeCategory === 'all' ? services : services.filter((s) => s.category === activeCategory);

  const getName = (s: Service) =>
    lang === 'am' ? s.name_am || s.name : lang === 'om' ? s.name_om || s.name : s.name;
  const getDesc = (s: Service) =>
    lang === 'am' ? s.description_am || s.description : lang === 'om' ? s.description_om || s.description : s.description;

  const categoryIcons: Record<string, string> = {
    haircut: '✂️', beard: '🪒', combo: '💈', kids: '👦', styling: '💇', other: '⭐',
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className={`text-4xl font-black text-white mb-3 ${lang === 'am' ? 'font-amharic' : ''}`}>
            {t('services.title')}
          </h1>
          <p className="text-gray-400 text-lg">{t('services.subtitle')}</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-barber-500 text-dark-900'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white border border-dark-600'
              }`}
            >
              {t(`services.categories.${cat}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-dark-700 rounded-2xl p-6 animate-pulse h-48" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((service) => (
              <div
                key={service.id}
                className="bg-dark-700 rounded-2xl p-6 border border-dark-600 hover:border-barber-500/50 transition-all duration-300 group hover:-translate-y-1 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{categoryIcons[service.category] || '⭐'}</div>
                  <div className="text-right">
                    <div className="text-barber-400 font-black text-2xl">{service.price}</div>
                    <div className="text-gray-500 text-xs">{t('common.etb')}</div>
                  </div>
                </div>
                <h3 className={`text-white font-bold text-xl mb-2 group-hover:text-barber-300 transition-colors ${lang === 'am' ? 'font-amharic' : ''}`}>
                  {getName(service)}
                </h3>
                <p className={`text-gray-400 text-sm flex-grow mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
                  {getDesc(service) || ''}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-dark-600">
                  <span className="text-gray-500 text-sm">⏱ {service.duration_minutes} {t('services.duration')}</span>
                  <Link
                    to={`/book?service=${service.id}`}
                    className="bg-barber-500 hover:bg-barber-400 text-dark-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    {t('services.book_now')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
