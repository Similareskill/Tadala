import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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
  const { theme, isDark, toggleTheme } = useTheme();

  const handleToggle = () => {
    try {
      playHapticSound('toggle');
    } catch {
      // ignore
    }
    toggleTheme();
  };

  const titleText = isDark
    ? 'Alternar para tema claro'
    : 'Alternar para tema escuro';

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={handleToggle}
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
              isDark ? 'bg-amber-400/20 text-amber-300 rotate-12' : 'bg-indigo-100 text-[#2a14b4] -rotate-12'
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-700" />}
          </div>
          <span className="font-semibold text-xs text-inherit">
            {isDark ? 'Tema Escuro' : 'Tema Claro'}
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            isDark
              ? 'bg-amber-400/20 text-amber-300'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {isDark ? 'Escuro' : 'Claro'}
        </span>
      </button>
    );
  }

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

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center transition-all duration-200 cursor-pointer border ${buttonSizes[size]} ${
        isDark
          ? 'bg-[#182030] hover:bg-[#202b40] text-amber-300 border-amber-400/30 hover:border-amber-400/60 shadow-xs shadow-amber-900/20'
          : 'bg-[#faf8ff] hover:bg-[#f2f3ff] text-[#2a14b4] border-[#d2d9f4] hover:border-[#2a14b4]/40 shadow-xs'
      } ${className}`}
      title={titleText}
      aria-label={titleText}
    >
      <span className="sr-only">{titleText}</span>
      <div className={`transition-transform duration-300 ${isDark ? 'rotate-90' : 'rotate-0'}`}>
        {isDark ? (
          <Sun className={`${iconSizes[size]} text-amber-300 fill-amber-300/20`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-indigo-700 fill-indigo-700/10`} />
        )}
      </div>
    </button>
  );
};
