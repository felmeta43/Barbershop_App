import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'am', label: 'አማ', full: 'አማርኛ' },
  { code: 'om', label: 'OO', full: 'Afaan Oromoo' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1">
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          title={lang.full}
          className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-200 ${
            current === lang.code
              ? 'bg-barber-500 text-dark-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
