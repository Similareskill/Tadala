import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Check,
  RotateCcw,
  Sparkles,
  Type,
  Sliders,
  X,
  MousePointerClick,
} from 'lucide-react';
import {
  useTheme,
  THEME_PRESETS,
  TEXT_COLOR_PRESETS,
  BUTTON_COLOR_PRESETS,
} from '../context/ThemeContext';
import { playHapticSound } from '../utils/helpers';

interface ThemeToggleButtonProps {
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  showLabel = false,
  className = '',
  size = 'md',
}) => {
  const {
    theme,
    isDark,
    activeThemeId,
    currentTextColor,
    currentButtonColor,
    customBgMain,
    toggleTheme,
    applyThemePreset,
    setCustomTheme,
    setTextColor,
    setButtonColor,
    getButtonGradient,
    getButtonTextColor,
    resetAllColors,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tema' | 'letras' | 'botoes'>('tema');
  const [customThemeBgInput, setCustomThemeBgInput] = useState(customBgMain || (isDark ? '#0b0f19' : '#faf8ff'));
  const [customTextInput, setCustomTextInput] = useState(currentTextColor || (isDark ? '#ffffff' : '#131b2e'));
  const [customBtnInput, setCustomBtnInput] = useState(currentButtonColor || '#c5a059');

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleMenu = () => {
    try {
      playHapticSound('toggle');
    } catch {}
    setIsOpen((prev) => !prev);
  };

  const handleSelectPreset = (presetId: string) => {
    try {
      playHapticSound('click');
    } catch {}
    applyThemePreset(presetId);
  };

  const handleSelectTextColor = (color: string) => {
    try {
      playHapticSound('click');
    } catch {}
    setTextColor(color);
  };

  const handleApplyCustomThemeColor = (color: string) => {
    setCustomThemeBgInput(color);
    // calculate a slightly offset card color
    setCustomTheme(color, color);
  };

  const handleApplyCustomTextColor = (color: string) => {
    setCustomTextInput(color);
    setTextColor(color);
  };

  const handleSelectButtonColor = (color: string) => {
    try {
      playHapticSound('click');
    } catch {}
    setButtonColor(color);
  };

  const handleApplyCustomButtonColor = (color: string) => {
    setCustomBtnInput(color);
    setButtonColor(color);
  };

  const handleReset = () => {
    try {
      playHapticSound('delete');
    } catch {}
    resetAllColors();
    setCustomThemeBgInput('#faf8ff');
    setCustomTextInput('');
    setCustomBtnInput('#c5a059');
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizes = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-2.5 rounded-2xl',
  };

  const titleText = 'Personalizar cores do tema e das letras';

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      {showLabel ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleMenu}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 cursor-pointer ${
            isDark
              ? 'bg-[#1e2638] text-amber-300 hover:bg-[#253047] border border-amber-500/20'
              : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] border border-[#cbd5e1]/40'
          } ${className}`}
          title={titleText}
          aria-label={titleText}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-300 ${
                isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-indigo-100 text-[#2a14b4]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs text-inherit">Cores & Tema</span>
          </div>
          <div className="flex items-center gap-1.5">
            {currentTextColor && (
              <span
                className="w-3 h-3 rounded-full border border-white/40 shadow-xs"
                style={{ backgroundColor: currentTextColor }}
                title="Cor das letras ativa"
              />
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              Personalizar
            </span>
          </div>
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleMenu}
          className={`relative inline-flex items-center justify-center transition-all duration-200 cursor-pointer border ${buttonSizes[size]} ${
            isOpen
              ? 'ring-2 ring-[#2a14b4] bg-[#eaedff] dark:bg-[#1e293b] text-[#2a14b4] dark:text-amber-300 border-[#2a14b4] shadow-md'
              : isDark
              ? 'bg-[#182030] hover:bg-[#202b40] text-amber-300 border-amber-400/30 hover:border-amber-400/60 shadow-xs shadow-amber-900/20'
              : 'bg-[#faf8ff] hover:bg-[#f2f3ff] text-[#2a14b4] border-[#d2d9f4] hover:border-[#2a14b4]/40 shadow-xs'
          } ${className}`}
          title={titleText}
          aria-label={titleText}
        >
          <span className="sr-only">{titleText}</span>
          <div className="flex items-center gap-1">
            <Palette className={`${iconSizes[size]} transition-transform duration-200 ${isOpen ? 'scale-110 rotate-12' : ''}`} />
            {/* Color preview indicator pip */}
            <span className="flex items-center -space-x-1 ml-0.5">
              <span
                className="w-2 h-2 rounded-full border border-black/20 shadow-2xs"
                style={{
                  backgroundColor:
                    THEME_PRESETS.find((p) => p.id === activeThemeId)?.accent ||
                    (isDark ? '#4338ca' : '#2a14b4'),
                }}
              />
              {currentTextColor && (
                <span
                  className="w-2 h-2 rounded-full border border-black/20 shadow-2xs z-1"
                  style={{ backgroundColor: currentTextColor }}
                />
              )}
            </span>
          </div>
        </button>
      )}

      {/* Floating Color Menu Popover */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#131826] rounded-3xl shadow-2xl border border-[#e2e8f0] dark:border-[#2a3449] p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#131b2e] dark:text-[#f1f5f9]"
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] dark:border-[#222b3e]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2a14b4] to-indigo-500 text-white flex items-center justify-center shadow-xs">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm font-display leading-tight">
                  Menu de Cores
                </h3>
                <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                  Mude a cor do tema e das letras
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick Dark/Light Toggle */}
              <button
                type="button"
                onClick={() => {
                  try {
                    playHapticSound('toggle');
                  } catch {}
                  toggleTheme();
                }}
                className="p-1.5 rounded-xl bg-[#f8fafc] dark:bg-[#1c2438] hover:bg-[#e2e8f0] dark:hover:bg-[#253047] text-[#475569] dark:text-amber-300 transition-colors cursor-pointer border border-[#e2e8f0] dark:border-[#2a3449]"
                title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-700" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#f1f5f9] dark:hover:bg-[#1c2438] text-[#94a3b8] hover:text-[#131b2e] dark:hover:text-white transition-colors cursor-pointer"
                title="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Tema vs Letras vs Cor do Botão) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#f8fafc] dark:bg-[#0d121e] rounded-2xl my-3 border border-[#e2e8f0] dark:border-[#222b3e]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('tema');
                try {
                  playHapticSound('click');
                } catch {}
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'tema'
                  ? 'bg-white dark:bg-[#1c2438] text-[#2a14b4] dark:text-amber-300 shadow-xs'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#131b2e] dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Tema</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('letras');
                try {
                  playHapticSound('click');
                } catch {}
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'letras'
                  ? 'bg-white dark:bg-[#1c2438] text-[#2a14b4] dark:text-amber-300 shadow-xs'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#131b2e] dark:hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span>Letras</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('botoes');
                try {
                  playHapticSound('click');
                } catch {}
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'botoes'
                  ? 'bg-white dark:bg-[#1c2438] text-[#2a14b4] dark:text-amber-300 shadow-xs'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#131b2e] dark:hover:text-white'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
              <span>Botão</span>
            </button>
          </div>

          {/* TAB 1: COR DO TEMA */}
          {activeTab === 'tema' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <span className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider block mb-2">
                  Temas e Ambientes Prontos:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = activeThemeId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-[#2a14b4] border-[#2a14b4] bg-[#eaedff]/50 dark:bg-indigo-950/40 shadow-xs'
                            : 'border-[#e2e8f0] dark:border-[#222b3e] bg-[#f8fafc] dark:bg-[#171f2f] hover:border-[#cbd5e1] dark:hover:border-[#334155]'
                        }`}
                      >
                        {/* Theme preview swatch */}
                        <div
                          className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center border shadow-xs"
                          style={{
                            backgroundColor: preset.bgMain,
                            borderColor: preset.accent,
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate text-[#131b2e] dark:text-white">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] capitalize">
                            {preset.mode === 'dark' ? 'Escuro' : 'Claro'}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#2a14b4] dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Cor Livre do Tema */}
              <div className="p-3 bg-[#f8fafc] dark:bg-[#171f2f] rounded-2xl border border-[#e2e8f0] dark:border-[#222b3e] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#2a14b4]" />
                    <span>Cor Personalizada Livre:</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                    Qualquer cor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customThemeBgInput}
                    onChange={(e) => handleApplyCustomThemeColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] cursor-pointer p-0.5 bg-white dark:bg-[#131826]"
                    title="Escolha uma cor de fundo livre"
                  />
                  <input
                    type="text"
                    value={customThemeBgInput}
                    onChange={(e) => handleApplyCustomThemeColor(e.target.value)}
                    placeholder="#0b0f19"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-[#cbd5e1] dark:border-[#2a3449] bg-white dark:bg-[#131826] text-[#131b2e] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2a14b4]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COR DAS LETRAS */}
          {activeTab === 'letras' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <span className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider block mb-2">
                  Cores de Letras Prontas:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  {TEXT_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      (preset.color === '' && !currentTextColor) ||
                      (currentTextColor.toLowerCase() === preset.color.toLowerCase());

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectTextColor(preset.color)}
                        className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-[#2a14b4] border-[#2a14b4] bg-[#eaedff]/50 dark:bg-indigo-950/40 shadow-xs'
                            : 'border-[#e2e8f0] dark:border-[#222b3e] bg-[#f8fafc] dark:bg-[#171f2f] hover:border-[#cbd5e1] dark:hover:border-[#334155]'
                        }`}
                      >
                        {/* Letter preview swatch */}
                        <div
                          className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center font-black text-xs border border-black/10 dark:border-white/10 shadow-xs"
                          style={{
                            background: preset.previewBg,
                            color: preset.color || (isDark ? '#ffffff' : '#131b2e'),
                          }}
                        >
                          Aa
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-bold truncate"
                            style={{ color: preset.color || undefined }}
                          >
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                            {preset.color || 'Automático'}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#2a14b4] dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Cor Livre das Letras */}
              <div className="p-3 bg-[#f8fafc] dark:bg-[#171f2f] rounded-2xl border border-[#e2e8f0] dark:border-[#222b3e] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#2a14b4]" />
                    <span>Cor das Letras Livre:</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                    Qualquer cor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customTextInput || (isDark ? '#ffffff' : '#131b2e')}
                    onChange={(e) => handleApplyCustomTextColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] cursor-pointer p-0.5 bg-white dark:bg-[#131826]"
                    title="Escolha qualquer cor para as letras"
                  />
                  <input
                    type="text"
                    value={customTextInput}
                    onChange={(e) => handleApplyCustomTextColor(e.target.value)}
                    placeholder="#fbbf24"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-[#cbd5e1] dark:border-[#2a3449] bg-white dark:bg-[#131826] text-[#131b2e] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2a14b4]"
                  />
                </div>
              </div>

              {/* Amostra / Live Preview */}
              <div
                className="p-3 rounded-2xl border border-dashed border-[#cbd5e1] dark:border-[#334155] text-center space-y-1"
                style={{
                  backgroundColor: isDark ? '#0b0f19' : '#f8fafc',
                }}
              >
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  Pré-visualização do Texto:
                </div>
                <div
                  className="text-base font-extrabold font-display"
                  style={{ color: currentTextColor || (isDark ? '#ffffff' : '#131b2e') }}
                >
                  TADALA FILA • Gestão de Craft
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: currentTextColor || (isDark ? '#cbd5e1' : '#475569') }}
                >
                  As letras de todos os títulos e quadros usarão esta cor.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COR DO BOTÃO */}
          {activeTab === 'botoes' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <span className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider block mb-2">
                  Cores de Botão Prontas:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUTTON_COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      (!currentButtonColor && preset.id === 'gold') ||
                      (currentButtonColor.toLowerCase() === preset.color.toLowerCase());

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectButtonColor(preset.color)}
                        className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-[#2a14b4] dark:ring-[#c5a059] border-[#2a14b4] dark:border-[#c5a059] bg-[#eaedff]/50 dark:bg-amber-950/40 shadow-xs'
                            : 'border-[#e2e8f0] dark:border-[#222b3e] bg-[#f8fafc] dark:bg-[#171f2f] hover:border-[#cbd5e1] dark:hover:border-[#334155]'
                        }`}
                      >
                        {/* Button preview swatch */}
                        <div
                          className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center border border-black/10 shadow-xs"
                          style={{
                            background: preset.gradient,
                          }}
                        >
                          <MousePointerClick
                            className="w-3.5 h-3.5"
                            style={{ color: preset.textColor }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-bold truncate text-[#131b2e] dark:text-white"
                          >
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-mono">
                            {preset.color}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#2a14b4] dark:text-[#c5a059] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Cor Livre do Botão */}
              <div className="p-3 bg-[#f8fafc] dark:bg-[#171f2f] rounded-2xl border border-[#e2e8f0] dark:border-[#222b3e] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b] dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#2a14b4]" />
                    <span>Cor do Botão Livre:</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                    Qualquer cor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customBtnInput || '#c5a059'}
                    onChange={(e) => handleApplyCustomButtonColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] cursor-pointer p-0.5 bg-white dark:bg-[#131826]"
                    title="Escolha qualquer cor para os botões"
                  />
                  <input
                    type="text"
                    value={customBtnInput}
                    onChange={(e) => handleApplyCustomButtonColor(e.target.value)}
                    placeholder="#c5a059"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-[#cbd5e1] dark:border-[#2a3449] bg-white dark:bg-[#131826] text-[#131b2e] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2a14b4]"
                  />
                </div>
              </div>

              {/* Amostra / Live Preview dos Botões */}
              <div
                className="p-3 rounded-2xl border border-dashed border-[#cbd5e1] dark:border-[#334155] space-y-2 text-center"
                style={{
                  backgroundColor: isDark ? '#0b0f19' : '#f8fafc',
                }}
              >
                <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  Pré-visualização dos Botões ao Vivo:
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                    style={{
                      background: getButtonGradient(currentButtonColor),
                      color: getButtonTextColor(currentButtonColor),
                    }}
                  >
                    <span>+ Novo Item</span>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                    style={{
                      background: getButtonGradient(currentButtonColor),
                      color: getButtonTextColor(currentButtonColor),
                    }}
                  >
                    <span>Lista de Craft (Ativo)</span>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                    style={{
                      background: getButtonGradient(currentButtonColor),
                      color: getButtonTextColor(currentButtonColor),
                    }}
                  >
                    <span>Salvar Alterações</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] pt-1">
                  Os botões de navegação, ações e menus do app usarão esta tonalidade.
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-[#222b3e] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#131b2e] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1c2438] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Restaurar cores originais do aplicativo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  playHapticSound('toggle');
                } catch {}
                setIsOpen(false);
              }}
              className="px-4 py-1.5 rounded-xl bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
