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
      <div className="bg-[#0f131d]/90 border border-[#c5a059]/30 rounded-2xl p-3 px-4 shadow-lg shadow-black/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8e9cb3]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1a2233] text-[#c5a059] flex items-center justify-center shrink-0 border border-[#c5a059]/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm block text-[#f3e8c7] font-cinzel">
              Modo Visualizador (Somente Leitura)
            </span>
            <span className="text-[#8e9cb3] text-xs">
              Apenas quem tem login de Admin pode adicionar novos itens de craft ou modificar a lista.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRequireAdmin?.('adicionar itens à lista')}
          className="self-stretch sm:self-auto px-4 py-2 bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] font-bold font-cinzel rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-black/40 transition-all cursor-pointer whitespace-nowrap"
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
        return 'bg-[#121622] text-[#94a3b8] border-[#334155] focus:border-[#c5a059]';
      case 'incomum':
        return 'bg-[#091a14] text-[#34d399] border-[#065f46] focus:border-[#34d399]';
      case 'raro':
        return 'bg-[#0b172a] text-[#38bdf8] border-[#0369a1] focus:border-[#38bdf8]';
      case 'epic':
      case 'épico':
        return 'bg-[#1c0d29] text-[#c084fc] border-[#7e22ce] focus:border-[#c084fc]';
      case 'lendario':
      case 'lendário':
        return 'bg-[#221606] text-[#fbbf24] border-[#b45309] focus:border-[#fbbf24] font-bold';
      default:
        return 'bg-[#121622] text-[#cbd5e1] border-[#252e42] focus:border-[#c5a059]';
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
      className="bg-[#0f131d]/95 rounded-2xl border border-[#222a3d] p-2.5 shadow-lg shadow-black/50 flex flex-wrap md:flex-nowrap items-center gap-2 transition-all focus-within:border-[#c5a059]/70"
    >
      {/* Quick Add icon */}
      <div className="w-9 h-9 rounded-xl bg-[#161d2d] text-[#c5a059] flex items-center justify-center shrink-0 ml-1 border border-[#c5a059]/20">
        <Zap className="w-5 h-5 fill-[#c5a059]" />
      </div>

      {/* Item Name Input */}
      <div className="flex-1 min-w-[180px]">
        <input
          ref={inputRef}
          type="text"
          list="quick-preset-names"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Adicionar item de craft (ex: Fragmento, Resquício, Lâmina...)"
          className="w-full px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] bg-transparent focus:outline-none"
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
          className="w-full px-3 py-1.5 text-xs text-[#f1f5f9] placeholder-[#64748b] bg-[#080a0f] border border-[#1f2738] focus:border-[#c5a059] rounded-xl transition-all focus:outline-none shadow-inner"
        />
      </div>

      {/* Category Dropdown */}
      <div className="shrink-0">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`border text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none transition-all shadow-sm ${getRaritySelectClass(
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
      <div className="flex items-center bg-[#080a0f] border border-[#1f2738] rounded-xl p-0.5 shrink-0">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={quantity <= 1}
          className="w-8 h-8 flex items-center justify-center text-[#8e9cb3] hover:bg-[#151c2a] hover:text-[#f1f5f9] active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all"
          aria-label="Diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-[#f3e8c7]">
          {quantity}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          className="w-8 h-8 flex items-center justify-center text-[#8e9cb3] hover:bg-[#151c2a] hover:text-[#f1f5f9] active:scale-95 rounded-lg transition-all"
          aria-label="Aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full sm:w-auto bg-gradient-to-r from-[#c5a059] to-[#9e7d38] hover:from-[#dfb96c] hover:to-[#b38e44] text-[#080a0f] px-5 py-2.5 h-10 rounded-xl text-xs sm:text-sm font-bold font-cinzel transition-all active:scale-[0.98] shrink-0 cursor-pointer shadow-md shadow-black/50 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Adicionar</span>
      </button>
    </form>
  );
};
