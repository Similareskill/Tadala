import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import nightCrowsWallpaper from '../assets/images/night_crows_wallpaper_1792563471663.jpg';
import nightCrowsMist from '../assets/images/night_crows_bg_1792563011357.jpg';
import nightCrowsEclipse from '../assets/images/night_crows_eclipse_1792617324610.jpg';

export type ThemeMode = 'light' | 'dark';
export type BackgroundType = 'image' | 'gradient' | 'solid' | 'none';

export interface ThemeBackgroundConfig {
  type: BackgroundType;
  imageUrl: string;
  opacity: number; // 0.4 to 0.98, dark overlay intensity
  name?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  bgMain: string;
  bgCard: string;
  bgHeader: string;
  accent: string;
  previewColor: string;
  defaultBackground: ThemeBackgroundConfig;
  description?: string;
  isCustom?: boolean;
}

export interface BackgroundPresetOption {
  id: string;
  name: string;
  type: BackgroundType;
  imageUrl: string;
  previewThumbnail?: string;
  description: string;
  badge?: string;
}

export const BACKGROUND_PRESET_OPTIONS: BackgroundPresetOption[] = [
  {
    id: 'nc-eclipse',
    name: 'Night Crows - Eclipse Escarlate',
    type: 'image',
    imageUrl: nightCrowsEclipse,
    previewThumbnail: nightCrowsEclipse,
    description: 'Castelo gótico ancestral sob eclipse lunar rubro e revoada mística de corvos.',
    badge: 'Novo',
  },
  {
    id: 'nc-fortress',
    name: 'Night Crows - Fortaleza & Catedral',
    type: 'image',
    imageUrl: nightCrowsWallpaper,
    previewThumbnail: nightCrowsWallpaper,
    description: 'Catedral gótica, corvos voando e luar místico sobre a fortaleza.',
    badge: 'Oficial',
  },
  {
    id: 'nc-mist',
    name: 'Night Crows - Névoa & Batalha',
    type: 'image',
    imageUrl: nightCrowsMist,
    previewThumbnail: nightCrowsMist,
    description: 'Muralhas medievais sob névoa noturna e tochas de vigília.',
    badge: 'Gótico',
  },
  {
    id: 'theme-gradient',
    name: 'Gradiente Atmosférico do Tema',
    type: 'gradient',
    imageUrl: '',
    description: 'Luz ambiente e gradiente profundo combinando com a cor do tema.',
    badge: 'Dinâmico',
  },
  {
    id: 'pure-black',
    name: 'Preto Absoluto AMOLED',
    type: 'solid',
    imageUrl: '',
    description: 'Sem imagem. Contraste profundo, economia de bateria e nitidez total.',
    badge: 'AMOLED',
  },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'night-crows-eclipse',
    name: 'Night Crows (Eclipse)',
    mode: 'dark',
    bgMain: '#0b0609',
    bgCard: '#170b12',
    bgHeader: '#12080e',
    accent: '#e11d48',
    previewColor: '#e11d48',
    description: 'Atmosfera gótica com eclipse lunar escarlate, revoada de corvos e detalhes em rubi forjado.',
    defaultBackground: {
      type: 'image',
      imageUrl: nightCrowsEclipse,
      opacity: 0.82,
      name: 'Night Crows - Eclipse Escarlate',
    },
  },
  {
    id: 'night-crows',
    name: 'Night Crows (Oficial)',
    mode: 'dark',
    bgMain: '#080a0f',
    bgCard: '#0f131d',
    bgHeader: '#0b0e17',
    accent: '#c5a059',
    previewColor: '#c5a059',
    description: 'Aparência oficial Night Crows com detalhes em ouro antigo e fortaleza escura.',
    defaultBackground: {
      type: 'image',
      imageUrl: nightCrowsWallpaper,
      opacity: 0.84,
      name: 'Night Crows - Fortaleza & Catedral',
    },
  },
  {
    id: 'night-crows-mist',
    name: 'Night Crows (Névoa)',
    mode: 'dark',
    bgMain: '#090c13',
    bgCard: '#101522',
    bgHeader: '#0c101a',
    accent: '#d4af37',
    previewColor: '#d4af37',
    description: 'Muralhas sombrias e nevoeiro denso com detalhes em ouro rúnico.',
    defaultBackground: {
      type: 'image',
      imageUrl: nightCrowsMist,
      opacity: 0.86,
      name: 'Night Crows - Névoa & Batalha',
    },
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
    description: 'Preto puro absoluto sem papel de parede para contraste e economia OLED.',
    defaultBackground: {
      type: 'solid',
      imageUrl: '',
      opacity: 0.95,
      name: 'Preto Absoluto AMOLED',
    },
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
    description: 'Slate escuro balanceado com gradiente atmosférico azul índigo.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.88,
      name: 'Gradiente Índigo Noturno',
    },
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
    description: 'Tons oceânicos profundos com destaques em azul ciano brilhante.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.85,
      name: 'Gradiente Ciano Cósmico',
    },
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
    description: 'Floresta escura mística com acentos em verde esmeralda rúnico.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.86,
      name: 'Gradiente Floresta Mística',
    },
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
    description: 'Cidadela vampírica escarlate com detalhes em rubi forjado.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.88,
      name: 'Gradiente Rubro Carmim',
    },
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
    description: 'Salão imperial dos reis corvos com brilho âmbar acolhedor.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.85,
      name: 'Gradiente Âmbar Real',
    },
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
    description: 'Dimensão astral sombria com nébula violeta e magia cósmica.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.87,
      name: 'Gradiente Nébula Violeta',
    },
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
    description: 'Tema claro cristalino de gelo com alta legibilidade.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.5,
      name: 'Gradiente Gelo Ártico',
    },
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
    description: 'Tema claro suave com pétalas de sakura e tons quentes.',
    defaultBackground: {
      type: 'gradient',
      imageUrl: '',
      opacity: 0.5,
      name: 'Gradiente Rosa Sakura',
    },
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
  backgroundConfig: ThemeBackgroundConfig;
  backgroundStyle: React.CSSProperties;
  savedBackgroundsMap: Record<string, ThemeBackgroundConfig>;
  allThemes: ThemePreset[];
  customThemes: ThemePreset[];
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyThemePreset: (presetId: string) => void;
  setCustomTheme: (bgMain: string, bgCard: string) => void;
  setTextColor: (color: string) => void;
  setBackgroundConfig: (config: Partial<ThemeBackgroundConfig>) => void;
  saveBackgroundToCurrentTheme: (config: ThemeBackgroundConfig) => void;
  saveCustomThemePreset: (preset: Partial<ThemePreset> & { name: string; bgMain: string; bgCard: string; accent: string }) => ThemePreset;
  deleteCustomThemePreset: (id: string) => void;
  resetAllColors: () => void;
  resetCurrentThemeBackground: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_STORAGE_KEY = 'app_theme_mode';
const THEME_PRESET_STORAGE_KEY = 'app_theme_preset_id';
const THEME_TEXT_COLOR_STORAGE_KEY = 'app_theme_text_color';
const THEME_CUSTOM_BG_STORAGE_KEY = 'app_theme_custom_bg';
const THEME_CUSTOM_CARD_STORAGE_KEY = 'app_theme_custom_card';
const THEME_SAVED_BG_MAP_STORAGE_KEY = 'app_theme_saved_bg_map_v2';
const THEME_ACTIVE_BG_CONFIG_KEY = 'app_theme_active_bg_config_v2';
const THEME_CUSTOM_PRESETS_STORAGE_KEY = 'app_custom_theme_presets_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme Mode (light vs dark) - defaults to dark for Night Crows
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'dark';
  });

  // Custom User Themes saved in the color menu
  const [customThemes, setCustomThemes] = useState<ThemePreset[]>(() => {
    try {
      const saved = localStorage.getItem(THEME_CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  // All themes available in the color menu
  const allThemes = useMemo(() => {
    return [...THEME_PRESETS, ...customThemes];
  }, [customThemes]);

  // Active theme preset - defaults to Night Crows Eclipse or saved
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
      if (saved && saved !== 'default-light') return saved;
      return 'night-crows-eclipse';
    } catch {
      return 'night-crows-eclipse';
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

  // Map of saved backgrounds per theme preset ID: "salvar fundo junto com o tema de cor"
  const [savedBackgroundsMap, setSavedBackgroundsMap] = useState<Record<string, ThemeBackgroundConfig>>(() => {
    try {
      const saved = localStorage.getItem(THEME_SAVED_BG_MAP_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    // Defaults populated from THEME_PRESETS
    const initialMap: Record<string, ThemeBackgroundConfig> = {};
    THEME_PRESETS.forEach((preset) => {
      initialMap[preset.id] = { ...preset.defaultBackground };
    });
    return initialMap;
  });

  // Current active background configuration
  const [backgroundConfig, setBackgroundConfigState] = useState<ThemeBackgroundConfig>(() => {
    try {
      const activeSaved = localStorage.getItem(THEME_ACTIVE_BG_CONFIG_KEY);
      if (activeSaved) {
        return JSON.parse(activeSaved);
      }
      const savedMapStr = localStorage.getItem(THEME_SAVED_BG_MAP_STORAGE_KEY);
      if (savedMapStr) {
        const parsedMap = JSON.parse(savedMapStr);
        const presetId = localStorage.getItem(THEME_PRESET_STORAGE_KEY) || 'night-crows-eclipse';
        if (parsedMap[presetId]) {
          return parsedMap[presetId];
        }
      }
    } catch {}
    return {
      type: 'image',
      imageUrl: nightCrowsEclipse,
      opacity: 0.82,
      name: 'Night Crows - Eclipse Escarlate',
    };
  });

  // Helper to persist the theme-to-background map
  const persistBackgroundMap = useCallback((newMap: Record<string, ThemeBackgroundConfig>) => {
    try {
      localStorage.setItem(THEME_SAVED_BG_MAP_STORAGE_KEY, JSON.stringify(newMap));
    } catch (e) {
      console.warn('Failed to persist background map:', e);
    }
  }, []);

  // Update background config and immediately save it linked to the active theme
  const saveBackgroundToCurrentTheme = useCallback(
    (config: ThemeBackgroundConfig) => {
      setBackgroundConfigState(config);
      setSavedBackgroundsMap((prev) => {
        const updated = {
          ...prev,
          [activeThemeId]: config,
        };
        persistBackgroundMap(updated);
        return updated;
      });
      try {
        localStorage.setItem(THEME_ACTIVE_BG_CONFIG_KEY, JSON.stringify(config));
      } catch {}
    },
    [activeThemeId, persistBackgroundMap]
  );

  // Partial update helper
  const setBackgroundConfig = useCallback(
    (partial: Partial<ThemeBackgroundConfig>) => {
      setBackgroundConfigState((prev) => {
        const next = { ...prev, ...partial };
        setSavedBackgroundsMap((mapPrev) => {
          const updated = {
            ...mapPrev,
            [activeThemeId]: next,
          };
          persistBackgroundMap(updated);
          return updated;
        });
        try {
          localStorage.setItem(THEME_ACTIVE_BG_CONFIG_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [activeThemeId, persistBackgroundMap]
  );

  // Reset the active theme's background to its default
  const resetCurrentThemeBackground = useCallback(() => {
    const preset = allThemes.find((p) => p.id === activeThemeId);
    if (preset) {
      saveBackgroundToCurrentTheme(preset.defaultBackground);
    }
  }, [activeThemeId, allThemes, saveBackgroundToCurrentTheme]);

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
      const matchedPreset = allThemes.find((p) => p.id === activeThemeId);
      const isCustomTheme =
        (matchedPreset && !matchedPreset.id.startsWith('default-')) ||
        (customBgMain && customBgMain.trim() !== '');

      if (isCustomTheme) {
        root.setAttribute('data-has-custom-theme', 'true');
        const bg = customBgMain || matchedPreset?.bgMain || (theme === 'dark' ? '#080a0f' : '#faf8ff');
        const card = customBgCard || matchedPreset?.bgCard || (theme === 'dark' ? '#0f131d' : '#ffffff');
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
  }, [theme, activeThemeId, currentTextColor, customBgMain, customBgCard, allThemes]);

  // Compute the live backgroundStyle object for App container
  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    const matchedPreset = allThemes.find((p) => p.id === activeThemeId);
    const bgBaseColor = customBgMain || matchedPreset?.bgMain || (theme === 'dark' ? '#080a0f' : '#f0f7ff');
    const accentColor = matchedPreset?.accent || '#c5a059';

    if (backgroundConfig.type === 'image' && backgroundConfig.imageUrl) {
      const op = typeof backgroundConfig.opacity === 'number' ? backgroundConfig.opacity : 0.84;
      const opMid = Math.min(0.98, op + 0.08);
      const opEnd = Math.min(0.99, op + 0.12);

      return {
        backgroundImage: `linear-gradient(to bottom, rgba(5, 7, 12, ${op}) 0%, rgba(8, 11, 18, ${opMid}) 45%, rgba(5, 7, 12, ${opEnd}) 100%), url(${backgroundConfig.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundColor: bgBaseColor,
      };
    }

    if (backgroundConfig.type === 'gradient') {
      if (theme === 'dark') {
        return {
          backgroundImage: `radial-gradient(circle at 50% 0%, ${accentColor}25 0%, transparent 60%), linear-gradient(to bottom, ${bgBaseColor} 0%, rgba(5, 7, 12, 0.98) 100%)`,
          backgroundColor: bgBaseColor,
          backgroundAttachment: 'fixed',
        };
      }
      return {
        backgroundImage: `radial-gradient(circle at 50% 0%, ${accentColor}18 0%, transparent 55%), linear-gradient(to bottom, ${bgBaseColor} 0%, #ffffff 100%)`,
        backgroundColor: bgBaseColor,
        backgroundAttachment: 'fixed',
      };
    }

    if (backgroundConfig.type === 'solid' || backgroundConfig.type === 'none') {
      return {
        backgroundColor: bgBaseColor,
        backgroundImage: 'none',
      };
    }

    // Default fallback: Night Crows Eclipse with wallpaper
    return {
      backgroundImage: `linear-gradient(to bottom, rgba(5, 7, 12, 0.82) 0%, rgba(8, 11, 18, 0.88) 45%, rgba(5, 7, 12, 0.96) 100%), url(${nightCrowsEclipse})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundAttachment: 'fixed',
      backgroundColor: bgBaseColor,
    };
  }, [activeThemeId, customBgMain, theme, backgroundConfig, allThemes]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      const targetPresetId = next === 'dark' ? 'night-crows-eclipse' : 'ice-arctic';
      setActiveThemeId(targetPresetId);
      // Restore the background saved for the target theme
      const savedForTarget = savedBackgroundsMap[targetPresetId];
      if (savedForTarget) {
        setBackgroundConfigState(savedForTarget);
      }
      return next;
    });
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    const targetPresetId = newTheme === 'dark' ? 'night-crows-eclipse' : 'ice-arctic';
    setActiveThemeId(targetPresetId);
    const savedForTarget = savedBackgroundsMap[targetPresetId];
    if (savedForTarget) {
      setBackgroundConfigState(savedForTarget);
    }
  };

  // Crucial: When applying a preset, automatically load the background saved with THAT preset!
  const applyThemePreset = useCallback(
    (presetId: string) => {
      const preset = allThemes.find((p) => p.id === presetId);
      if (!preset) return;

      setActiveThemeId(preset.id);
      setThemeState(preset.mode);
      setCustomBgMain(preset.bgMain);
      setCustomBgCard(preset.bgCard);

      // Retrieve saved background for this theme preset, or fallback to preset default
      const savedBg = savedBackgroundsMap[preset.id] || preset.defaultBackground;
      setBackgroundConfigState(savedBg);

      try {
        localStorage.setItem(THEME_ACTIVE_BG_CONFIG_KEY, JSON.stringify(savedBg));
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, preset.id);
        localStorage.setItem(THEME_CUSTOM_BG_STORAGE_KEY, preset.bgMain);
        localStorage.setItem(THEME_CUSTOM_CARD_STORAGE_KEY, preset.bgCard);
      } catch {}
    },
    [allThemes, savedBackgroundsMap]
  );

  // Save a new or edited custom theme directly into the color menu!
  const saveCustomThemePreset = useCallback(
    (themeData: Partial<ThemePreset> & { name: string; bgMain: string; bgCard: string; accent: string }) => {
      const newId = themeData.id || `custom-theme-${Date.now()}`;
      const bgConfig: ThemeBackgroundConfig = themeData.defaultBackground || { ...backgroundConfig };

      const newPreset: ThemePreset = {
        id: newId,
        name: themeData.name.trim() || 'Meu Tema Personalizado',
        mode: themeData.mode || (theme === 'dark' ? 'dark' : 'light'),
        bgMain: themeData.bgMain || (theme === 'dark' ? '#080a0f' : '#ffffff'),
        bgCard: themeData.bgCard || (theme === 'dark' ? '#0f131d' : '#ffffff'),
        bgHeader: themeData.bgHeader || themeData.bgCard || (theme === 'dark' ? '#0b0e17' : '#ffffff'),
        accent: themeData.accent || '#c5a059',
        previewColor: themeData.accent || '#c5a059',
        description: themeData.description || 'Tema personalizado salvo diretamente no menu de cores.',
        defaultBackground: bgConfig,
        isCustom: true,
      };

      setCustomThemes((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === newId);
        let nextList: ThemePreset[];
        if (existingIdx >= 0) {
          nextList = [...prev];
          nextList[existingIdx] = newPreset;
        } else {
          nextList = [...prev, newPreset];
        }
        try {
          localStorage.setItem(THEME_CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(nextList));
        } catch (e) {
          console.warn('Failed to save custom theme preset:', e);
        }
        return nextList;
      });

      // Link background to this theme preset
      setSavedBackgroundsMap((prev) => {
        const updated = {
          ...prev,
          [newId]: bgConfig,
        };
        persistBackgroundMap(updated);
        return updated;
      });

      // Immediately activate this preset
      setActiveThemeId(newId);
      setThemeState(newPreset.mode);
      setCustomBgMain(newPreset.bgMain);
      setCustomBgCard(newPreset.bgCard);
      setBackgroundConfigState(bgConfig);

      try {
        localStorage.setItem(THEME_ACTIVE_BG_CONFIG_KEY, JSON.stringify(bgConfig));
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, newId);
        localStorage.setItem(THEME_CUSTOM_BG_STORAGE_KEY, newPreset.bgMain);
        localStorage.setItem(THEME_CUSTOM_CARD_STORAGE_KEY, newPreset.bgCard);
      } catch {}

      return newPreset;
    },
    [backgroundConfig, theme, persistBackgroundMap]
  );

  const deleteCustomThemePreset = useCallback(
    (presetId: string) => {
      setCustomThemes((prev) => {
        const nextList = prev.filter((p) => p.id !== presetId);
        try {
          localStorage.setItem(THEME_CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(nextList));
        } catch {}
        return nextList;
      });

      if (activeThemeId === presetId) {
        applyThemePreset('night-crows-eclipse');
      }
    },
    [activeThemeId, applyThemePreset]
  );

  const setCustomTheme = (bgMain: string, bgCard: string) => {
    setCustomBgMain(bgMain);
    setCustomBgCard(bgCard);
    setActiveThemeId('custom');
  };

  const setTextColor = (color: string) => {
    setCurrentTextColor(color);
  };

  const resetAllColors = () => {
    setThemeState('dark');
    setActiveThemeId('night-crows-eclipse');
    setCurrentTextColor('');
    setCustomBgMain('');
    setCustomBgCard('');
    const defaultBg: ThemeBackgroundConfig = {
      type: 'image',
      imageUrl: nightCrowsEclipse,
      opacity: 0.82,
      name: 'Night Crows - Eclipse Escarlate',
    };
    setBackgroundConfigState(defaultBg);

    const initialMap: Record<string, ThemeBackgroundConfig> = {};
    THEME_PRESETS.forEach((preset) => {
      initialMap[preset.id] = { ...preset.defaultBackground };
    });
    setSavedBackgroundsMap(initialMap);

    try {
      localStorage.removeItem(THEME_MODE_STORAGE_KEY);
      localStorage.removeItem(THEME_PRESET_STORAGE_KEY);
      localStorage.removeItem(THEME_TEXT_COLOR_STORAGE_KEY);
      localStorage.removeItem(THEME_CUSTOM_BG_STORAGE_KEY);
      localStorage.removeItem(THEME_CUSTOM_CARD_STORAGE_KEY);
      localStorage.removeItem(THEME_SAVED_BG_MAP_STORAGE_KEY);
      localStorage.removeItem(THEME_ACTIVE_BG_CONFIG_KEY);
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
        backgroundConfig,
        backgroundStyle,
        savedBackgroundsMap,
        allThemes,
        customThemes,
        toggleTheme,
        setTheme,
        applyThemePreset,
        setCustomTheme,
        setTextColor,
        setBackgroundConfig,
        saveBackgroundToCurrentTheme,
        saveCustomThemePreset,
        deleteCustomThemePreset,
        resetAllColors,
        resetCurrentThemeBackground,
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
