import React from 'react';
import { Search } from 'lucide-react';
import { ItemStatus } from '../types/shopping';

export type FilterStatus = 'todos' | 'pendente' | 'no_carrinho';

interface FilterBarProps {
  filterSearch: string;
  onFilterSearchChange: (text: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  selectedCategory: string;
  onSelectedCategoryChange: (category: string) => void;
  categories: string[];
  counts: {
    total: number;
    pending: number;
    cart: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterSearch,
  onFilterSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCategory,
  onSelectedCategoryChange,
  categories,
  counts,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
      {/* Search Input within list */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748b]">
          <Search className="w-4 h-4 text-[#c5a059]" />
        </div>
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => onFilterSearchChange(e.target.value)}
          placeholder="Filtrar nesta lista de craft..."
          className="w-full pl-10 pr-3 py-2 bg-[#0c1018]/90 border border-[#222c40] focus:border-[#c5a059] focus:bg-[#111724] rounded-xl text-sm text-[#f1f5f9] placeholder-[#64748b] transition-all focus:outline-none shadow-inner"
        />
        {filterSearch && (
          <button
            onClick={() => onFilterSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#8e9cb3] hover:text-[#f3e8c7] cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div className="flex items-center bg-[#0c1018]/90 p-1 rounded-xl border border-[#222c40] shrink-0">
          <button
            type="button"
            onClick={() => onStatusFilterChange('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all font-cinzel cursor-pointer ${
              statusFilter === 'todos'
                ? 'bg-gradient-to-r from-[#c5a059] to-[#9e7d38] text-[#080a0f] shadow-sm'
                : 'text-[#8e9cb3] hover:text-[#f3e8c7] hover:bg-[#151c2a]'
            }`}
          >
            Todos ({counts.total})
          </button>
        </div>

        {/* Category filter dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => onSelectedCategoryChange(e.target.value)}
          className="bg-[#0c1018]/90 border border-[#222c40] text-xs font-bold font-cinzel text-[#f3e8c7] rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[#c5a059] shrink-0 shadow-inner"
        >
          <option value="all" className="bg-[#0c1018] text-[#f3e8c7]">Todas as raridades</option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-[#0c1018] text-[#f3e8c7]">
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
