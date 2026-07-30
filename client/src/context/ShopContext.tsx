import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import { ShopSettings } from '../lib/types';

const PRESETS: Record<string, Record<string, string>> = {
  gold: {
    '50': '254 249 236', '100': '254 240 199', '200': '254 215 90', '300': '254 201 53',
    '400': '254 182 10', '500': '232 155 0', '600': '204 122 0', '700': '163 88 0',
    '800': '134 68 0', '900': '113 58 0',
  },
  blue: {
    '50': '239 246 255', '100': '219 234 254', '200': '191 219 254', '300': '147 197 253',
    '400': '96 165 250', '500': '59 130 246', '600': '37 99 235', '700': '29 78 216',
    '800': '30 64 175', '900': '30 58 138',
  },
  green: {
    '50': '240 253 244', '100': '220 252 231', '200': '187 247 208', '300': '134 239 172',
    '400': '74 222 128', '500': '34 197 94', '600': '22 163 74', '700': '21 128 61',
    '800': '22 101 52', '900': '20 83 45',
  },
  red: {
    '50': '254 242 242', '100': '254 226 226', '200': '254 202 202', '300': '252 165 165',
    '400': '248 113 113', '500': '239 68 68', '600': '220 38 38', '700': '185 28 28',
    '800': '153 27 27', '900': '127 29 29',
  },
  purple: {
    '50': '250 245 255', '100': '243 232 255', '200': '233 213 255', '300': '216 180 254',
    '400': '192 132 252', '500': '168 85 247', '600': '147 51 234', '700': '126 34 206',
    '800': '107 33 168', '900': '88 28 135',
  },
  teal: {
    '50': '240 253 250', '100': '204 251 241', '200': '153 246 228', '300': '94 234 212',
    '400': '45 212 191', '500': '20 184 166', '600': '13 148 136', '700': '15 118 110',
    '800': '17 94 89', '900': '19 78 74',
  },
  orange: {
    '50': '255 247 237', '100': '255 237 213', '200': '254 215 170', '300': '253 186 116',
    '400': '251 146 60', '500': '249 115 22', '600': '234 88 12', '700': '194 65 12',
    '800': '154 52 18', '900': '124 45 18',
  },
  pink: {
    '50': '253 242 248', '100': '252 231 243', '200': '251 207 232', '300': '249 168 212',
    '400': '244 114 182', '500': '236 72 153', '600': '219 39 119', '700': '190 24 93',
    '800': '157 23 77', '900': '131 24 67',
  },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

function blendChannel(base: number, target: number, ratio: number) {
  return Math.round(base + (target - base) * ratio);
}

function shadesFromHex(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex);
  if (!rgb) return PRESETS.gold;
  const [r, g, b] = rgb;
  const s = (tr: number, tg: number, tb: number) => `${tr} ${tg} ${tb}`;
  const light = (ratio: number) =>
    s(blendChannel(r, 255, ratio), blendChannel(g, 255, ratio), blendChannel(b, 255, ratio));
  const dark = (ratio: number) =>
    s(blendChannel(r, 0, ratio), blendChannel(g, 0, ratio), blendChannel(b, 0, ratio));
  return {
    '50':  light(0.95), '100': light(0.85), '200': light(0.70), '300': light(0.50),
    '400': light(0.25), '500': s(r, g, b),   '600': dark(0.15), '700': dark(0.30),
    '800': dark(0.50),  '900': dark(0.65),
  };
}

export function applyTheme(preset: string, customHex?: string) {
  const shades =
    preset === 'custom' && customHex
      ? shadesFromHex(customHex)
      : (PRESETS[preset] ?? PRESETS.gold);
  const root = document.documentElement;
  Object.entries(shades).forEach(([shade, rgb]) => {
    root.style.setProperty(`--barber-${shade}`, rgb);
  });
}

interface ShopContextValue {
  shop: ShopSettings | null;
  isLoading: boolean;
  shopT: (field: string, lang: string) => string;
  currencySymbol: string;
}

const ShopContext = createContext<ShopContextValue>({
  shop: null,
  isLoading: true,
  shopT: (field) => field,
  currencySymbol: 'ETB',
});

export function ShopProvider({ children }: { children: ReactNode }) {
  const { data: shop, isLoading } = useQuery<ShopSettings>({
    queryKey: ['shop-settings'],
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (shop) {
      applyTheme(shop.theme_preset || 'gold', shop.theme_color);
    }
  }, [shop?.theme_preset, shop?.theme_color]);

  function shopT(field: string, lang: string): string {
    if (!shop) return '';
    const localized = lang === 'am'
      ? (shop as any)[`${field}_am`]
      : lang === 'om'
      ? (shop as any)[`${field}_om`]
      : null;
    return localized || (shop as any)[field] || '';
  }

  return (
    <ShopContext.Provider value={{
      shop: shop ?? null,
      isLoading,
      shopT,
      currencySymbol: shop?.currency_symbol || 'ETB',
    }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
