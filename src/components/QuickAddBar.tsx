import React, { useState, useRef } from 'react';
import { Zap, Minus, Plus, Lock, KeyRound } from 'lucide-react';
import { playHapticSound } from '../utils/helpers';
import { PRESET_ITEM_NAMES } from '../data/initialData';

interface QuickAddBarProps {
  categories: string[];
  onAddQuickItem: (
    name: string,
    category: string,
    quantity: number,
    brandOrPreference?: string
  ) => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  categories,
  onAddQuickItem,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const [name, setName] = useState('');
  const [brandOrPreference, setBrandOrPreference] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Comum');
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 px-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm block text-amber-950">
              Modo Visualizador (Somente Leitura)
            </span>
            <span className="text-amber-800/90 text-xs">
              Apenas quem tem login de Admin pode adicionar novos itens ou modificar a lista.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRequireAdmin?.('adicionar itens à lista')}
          className="self-stretch sm:self-auto px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Fazer Login de Admin</span>
        </button>
      </div>
    );
  }

  const handleNameChange = (val: string) => {
    setName(val);
    const matched = PRESET_ITEM_NAMES.find(
      (p) => p.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched && categories.includes(matched.category)) {
      setCategory(matched.category);
    }
  };

  const getRaritySelectClass = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'comum':
        return 'bg-slate-50 text-slate-700 border-slate-300 focus:border-slate-500';
      case 'incomum':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:border-emerald-500';
      case 'raro':
        return 'bg-sky-50 text-sky-800 border-sky-300 focus:border-sky-500';
      case 'epic':
      case 'épico':
        return 'bg-purple-50 text-purple-800 border-purple-300 focus:border-purple-500';
      case 'lendario':
      case 'lendário':
        return 'bg-amber-50 text-amber-900 border-amber-300 focus:border-amber-500 font-bold';
      default:
        return 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] focus:border-[#4338ca]';
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      playHapticSound('click');
      inputRef.current?.focus();
      return;
    }
    playHapticSound('toggle');
    onAddQuickItem(
      trimmed,
      category,
      quantity,
      brandOrPreference.trim() || undefined
    );
    setName('');
    setBrandOrPreference('');
    setQuantity(1);
    inputRef.current?.focus();
  };

  const handleDecrease = () => {
    playHapticSound('click');
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    playHapticSound('click');
    setQuantity((prev) => prev + 1);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#e2e8f0] p-2.5 shadow-sm flex flex-wrap md:flex-nowrap items-center gap-2 transition-all focus-within:border-[#c7c4d7]"
    >
      {/* Quick Add icon */}
      <div className="w-9 h-9 rounded-xl bg-[#faf8ff] text-[#2a14b4] flex items-center justify-center shrink-0 ml-1">
        <Zap className="w-5 h-5 fill-[#2a14b4]" />
      </div>

      {/* Item Name Input */}
      <div className="flex-1 min-w-[180px]">
        <input
          ref={inputRef}
          type="text"
          list="quick-preset-names"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Adicionar item rápido (ex: Fragmento, Resquício...)"
          className="w-full px-3 py-2 text-sm text-[#131b2e] placeholder-[#94a3b8] bg-transparent focus:outline-none"
        />
        <datalist id="quick-preset-names">
          {PRESET_ITEM_NAMES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.category}
            </option>
          ))}
        </datalist>
      </div>

      {/* Brand / Preference Input */}
      <div className="w-48 sm:w-56 shrink-0">
        <input
          type="text"
          value={brandOrPreference}
          onChange={(e) => setBrandOrPreference(e.target.value)}
          placeholder="Observação / Detalhe (opcional)..."
          className="w-full px-3 py-1.5 text-xs text-[#131b2e] placeholder-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl transition-all focus:outline-none"
        />
      </div>

      {/* Category Dropdown */}
      <div className="shrink-0">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`border text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none transition-all shadow-2xs ${getRaritySelectClass(
            category
          )}`}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Stepper (- 1 +) */}
      <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-0.5 shrink-0">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={quantity <= 1}
          className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#e2e8f0] active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all"
          aria-label="Diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-[#131b2e]">
          {quantity}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#e2e8f0] active:scale-95 rounded-lg transition-all"
          aria-label="Aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full sm:w-auto bg-[#2a14b4] hover:bg-[#200e94] active:bg-[#190979] text-white px-5 py-2.5 h-10 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98] shrink-0 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Adicionar</span>
      </button>
    </form>
  );
};
