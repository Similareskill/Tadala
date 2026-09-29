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
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => onFilterSearchChange(e.target.value)}
          placeholder="Filtrar nesta lista de compras..."
          className="w-full pl-10 pr-3 py-2 bg-white border border-[#e2e8f0] focus:border-[#4338ca] rounded-xl text-sm text-[#131b2e] placeholder-[#94a3b8] transition-colors focus:outline-none"
        />
        {filterSearch && (
          <button
            onClick={() => onFilterSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#94a3b8] hover:text-[#475569]"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div className="flex items-center bg-white p-1 rounded-xl border border-[#e2e8f0] shrink-0">
          <button
            type="button"
            onClick={() => onStatusFilterChange('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'todos'
                ? 'bg-[#3b2fc4] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#1e293b] hover:bg-[#f1f5f9]'
            }`}
          >
            Todos ({counts.total})
          </button>
        </div>

        {/* Category filter dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => onSelectedCategoryChange(e.target.value)}
          className="bg-white border border-[#e2e8f0] text-xs font-semibold text-[#334155] rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-[#4338ca] shrink-0"
        >
          <option value="all">Todas as raridades</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
