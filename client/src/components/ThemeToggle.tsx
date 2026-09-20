import { useTheme, Theme } from '../context/ThemeContext';

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'light',  icon: '☀️', label: 'Light'  },
  { value: 'dark',   icon: '🌙', label: 'Dark'   },
  { value: 'system', icon: '⚙️', label: 'Auto'   },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex bg-dark-800 rounded-lg p-0.5 border border-dark-600 gap-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
            theme === opt.value
              ? 'bg-barber-500 text-dark-900'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>{opt.icon}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
