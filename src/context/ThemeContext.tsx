import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  bgMain: string;
  bgCard: string;
  bgHeader: string;
  accent: string;
  previewColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'night-crows',
    name: 'Night Crows (Oficial)',
    mode: 'dark',
    bgMain: '#080a0f',
    bgCard: '#0f131d',
    bgHeader: '#0b0e17',
    accent: '#c5a059',
    previewColor: '#c5a059',
  },
  {
    id: 'default-dark',
    name: 'Escuro Noturno',
    mode: 'dark',
    bgMain: '#0b0f19',
    bgCard: '#131826',
    bgHeader: '#131826',
    accent: '#4338ca',
    previewColor: '#131826',
  },
  {
    id: 'amoled-black',
    name: 'Onyx AMOLED',
    mode: 'dark',
    bgMain: '#000000',
    bgCard: '#0a0a0c',
    bgHeader: '#08080a',
    accent: '#6366f1',
    previewColor: '#050508',
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Azul',
    mode: 'dark',
    bgMain: '#040d1a',
    bgCard: '#08172e',
    bgHeader: '#07152b',
    accent: '#06b6d4',
    previewColor: '#08172e',
  },
  {
    id: 'emerald-forest',
    name: 'Verde Esmeralda',
    mode: 'dark',
    bgMain: '#04160d',
    bgCard: '#092416',
    bgHeader: '#082114',
    accent: '#10b981',
    previewColor: '#092416',
  },
  {
    id: 'crimson-ruby',
    name: 'Carmim Rubro',
    mode: 'dark',
    bgMain: '#14050a',
    bgCard: '#240b13',
    bgHeader: '#1f0910',
    accent: '#f43f5e',
    previewColor: '#240b13',
  },
  {
    id: 'amber-gold',
    name: 'Ouro Real / Âmbar',
    mode: 'dark',
    bgMain: '#140f02',
    bgCard: '#241a05',
    bgHeader: '#1f1604',
    accent: '#f59e0b',
    previewColor: '#241a05',
  },
  {
    id: 'purple-nebula',
    name: 'Roxo Cósmico',
    mode: 'dark',
    bgMain: '#0f051c',
    bgCard: '#1c0c30',
    bgHeader: '#180a2b',
    accent: '#a855f7',
    previewColor: '#1c0c30',
  },
  {
    id: 'ice-arctic',
    name: 'Gelo Polar',
    mode: 'light',
    bgMain: '#f0f7ff',
    bgCard: '#ffffff',
    bgHeader: '#ffffff',
    accent: '#0284c7',
    previewColor: '#bae6fd',
  },
  {
    id: 'sakura-rose',
    name: 'Sakura Rosa',
    mode: 'light',
    bgMain: '#fff5f8',
    bgCard: '#ffffff',
    bgHeader: '#ffffff',
    accent: '#ec4899',
    previewColor: '#fbcfe8',
  },
];

export interface TextColorPreset {
  id: string;
  name: string;
  color: string;
  previewBg: string;
  previewBorder?: string;
}

export const TEXT_COLOR_PRESETS: TextColorPreset[] = [
  { id: 'default', name: 'Padrão', color: '', previewBg: 'linear-gradient(135deg, #131b2e 50%, #f1f5f9 50%)' },
  { id: 'white', name: 'Branco Puro', color: '#ffffff', previewBg: '#ffffff' },
  { id: 'dark-slate', name: 'Preto Carvão', color: '#131b2e', previewBg: '#131b2e' },
  { id: 'gold', name: 'Dourado Brilhante', color: '#fbbf24', previewBg: '#fbbf24' },
  { id: 'cyan', name: 'Ciano Neon', color: '#38bdf8', previewBg: '#38bdf8' },
  { id: 'emerald', name: 'Verde Matrix', color: '#34d399', previewBg: '#34d399' },
  { id: 'purple', name: 'Violeta Cósmica', color: '#c084fc', previewBg: '#c084fc' },
  { id: 'rose', name: 'Rosa Neon', color: '#fb7185', previewBg: '#fb7185' },
  { id: 'amber', name: 'Âmbar Quente', color: '#fb923c', previewBg: '#fb923c' },
  { id: 'silver', name: 'Cinza Prata', color: '#cbd5e1', previewBg: '#cbd5e1' },
];

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  activeThemeId: string;
  currentTextColor: string;
  customBgMain: string;
  customBgCard: string;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyThemePreset: (presetId: string) => void;
  setCustomTheme: (bgMain: string, bgCard: string) => void;
  setTextColor: (color: string) => void;
  resetAllColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_STORAGE_KEY = 'app_theme_mode';
const THEME_PRESET_STORAGE_KEY = 'app_theme_preset_id';
const THEME_TEXT_COLOR_STORAGE_KEY = 'app_theme_text_color';
const THEME_CUSTOM_BG_STORAGE_KEY = 'app_theme_custom_bg';
const THEME_CUSTOM_CARD_STORAGE_KEY = 'app_theme_custom_card';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme Mode (light vs dark) - defaults to dark for Night Crows
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'dark';
  });

  // Active theme preset - defaults to Night Crows
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
      if (saved && saved !== 'default-light') return saved;
      return 'night-crows';
    } catch {
      return 'night-crows';
    }
  });

  // Custom text color (hex or empty for default)
  const [currentTextColor, setCurrentTextColor] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_TEXT_COLOR_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Custom background color
  const [customBgMain, setCustomBgMain] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_CUSTOM_BG_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Custom card color
  const [customBgCard, setCustomBgCard] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_CUSTOM_CARD_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Synchronize DOM classes, data attributes, and CSS variables
  useEffect(() => {
    try {
      const root = document.documentElement;

      // 1. Dark / Light class
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
      }
      localStorage.setItem(THEME_MODE_STORAGE_KEY, theme);

      // 2. Custom text color
      if (currentTextColor && currentTextColor.trim() !== '') {
        root.setAttribute('data-has-custom-text', 'true');
        root.style.setProperty('--custom-text-color', currentTextColor);
        localStorage.setItem(THEME_TEXT_COLOR_STORAGE_KEY, currentTextColor);
      } else {
        root.removeAttribute('data-has-custom-text');
        root.style.removeProperty('--custom-text-color');
        localStorage.removeItem(THEME_TEXT_COLOR_STORAGE_KEY);
      }

      // 3. Custom theme colors
      const matchedPreset = THEME_PRESETS.find((p) => p.id === activeThemeId);
      const isCustomTheme =
        (matchedPreset && !matchedPreset.id.startsWith('default-')) ||
        (customBgMain && customBgMain.trim() !== '');

      if (isCustomTheme) {
        root.setAttribute('data-has-custom-theme', 'true');
        const bg = customBgMain || matchedPreset?.bgMain || (theme === 'dark' ? '#0b0f19' : '#faf8ff');
        const card = customBgCard || matchedPreset?.bgCard || (theme === 'dark' ? '#131826' : '#ffffff');
        const header = matchedPreset?.bgHeader || card;

        root.style.setProperty('--custom-bg-main', bg);
        root.style.setProperty('--custom-bg-card', card);
        root.style.setProperty('--custom-bg-header', header);

        if (customBgMain) localStorage.setItem(THEME_CUSTOM_BG_STORAGE_KEY, customBgMain);
        if (customBgCard) localStorage.setItem(THEME_CUSTOM_CARD_STORAGE_KEY, customBgCard);
      } else {
        root.removeAttribute('data-has-custom-theme');
        root.style.removeProperty('--custom-bg-main');
        root.style.removeProperty('--custom-bg-card');
        root.style.removeProperty('--custom-bg-header');
        localStorage.removeItem(THEME_CUSTOM_BG_STORAGE_KEY);
        localStorage.removeItem(THEME_CUSTOM_CARD_STORAGE_KEY);
      }

      localStorage.setItem(THEME_PRESET_STORAGE_KEY, activeThemeId);
    } catch (e) {
      console.warn('Failed to apply theme variables:', e);
    }
  }, [theme, activeThemeId, currentTextColor, customBgMain, customBgCard]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setActiveThemeId(next === 'dark' ? 'default-dark' : 'default-light');
      return next;
    });
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setActiveThemeId(newTheme === 'dark' ? 'default-dark' : 'default-light');
  };

  const applyThemePreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActiveThemeId(preset.id);
    setThemeState(preset.mode);
    setCustomBgMain(preset.bgMain);
    setCustomBgCard(preset.bgCard);
  };

  const setCustomTheme = (bgMain: string, bgCard: string) => {
    setCustomBgMain(bgMain);
    setCustomBgCard(bgCard);
    setActiveThemeId('custom');
  };

  const setTextColor = (color: string) => {
    setCurrentTextColor(color);
  };

  const resetAllColors = () => {
    setThemeState('light');
    setActiveThemeId('default-light');
    setCurrentTextColor('');
    setCustomBgMain('');
    setCustomBgCard('');
    try {
      localStorage.removeItem(THEME_MODE_STORAGE_KEY);
      localStorage.removeItem(THEME_PRESET_STORAGE_KEY);
      localStorage.removeItem(THEME_TEXT_COLOR_STORAGE_KEY);
      localStorage.removeItem(THEME_CUSTOM_BG_STORAGE_KEY);
      localStorage.removeItem(THEME_CUSTOM_CARD_STORAGE_KEY);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        activeThemeId,
        currentTextColor,
        customBgMain,
        customBgCard,
        toggleTheme,
        setTheme,
        applyThemePreset,
        setCustomTheme,
        setTextColor,
        resetAllColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
