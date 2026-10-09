import React, { useState } from 'react';
import {
  Check,
  Minus,
  Plus,
  FileText,
  Trash2,
  Image as ImageIcon,
  Tag,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  GripVertical,
  X,
  Sparkles,
} from 'lucide-react';
import { ShoppingItem } from '../types/shopping';
import { playHapticSound } from '../utils/helpers';
import { PRESET_ITEM_NAMES } from '../data/initialData';

interface ShoppingItemCardProps {
  item: ShoppingItem;
  currencySymbol?: string;
  onToggleStatus: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onDeleteItem: (id: string) => void;
  onOpenNotes: (item: ShoppingItem) => void;
  onOpenEdit: (item: ShoppingItem) => void;
  onToggleSelect: (id: string) => void;
  onUpdateItem?: (id: string, patch: Partial<ShoppingItem>) => void;
  // Marker swapping & reordering props
  itemIndex?: number;
  totalItems?: number;
  allItems?: ShoppingItem[];
  onSwapItems?: (idA: string, idB: string) => void;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  // Drag and drop
  isDragging?: boolean;
  onDragStartCard?: (id: string, e: React.DragEvent) => void;
  onDropCard?: (targetId: string, e: React.DragEvent) => void;
  onDragEndCard?: () => void;
  isAdmin?: boolean;
  onRequireAdmin?: (reason: string) => void;
}

export const ShoppingItemCard: React.FC<ShoppingItemCardProps> = ({
  item,
  currencySymbol = 'R$',
  onToggleStatus,
  onUpdateQuantity,
  onDeleteItem,
  onOpenNotes,
  onOpenEdit,
  onToggleSelect,
  onUpdateItem,
  itemIndex = 0,
  totalItems = 1,
  allItems = [],
  onSwapItems,
  onMoveItem,
  isDragging = false,
  onDragStartCard,
  onDropCard,
  onDragEndCard,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const [imgError, setImgError] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isAddingName, setIsAddingName] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const isCompleted = item.status === 'no_carrinho';

  // Fallback to item.name if nameList is not populated
  const currentNameList = item.nameList && item.nameList.length > 0
    ? item.nameList
    : [item.name];

  const handleSelectName = (selectedName: string) => {
    playHapticSound('toggle');
    const matchedPreset = PRESET_ITEM_NAMES.find(
      (p) => p.name.toLowerCase() === selectedName.toLowerCase()
    );

    const updatedList = Array.from(new Set([...currentNameList, selectedName]));
    const patch: Partial<ShoppingItem> = {
      name: selectedName,
      nameList: updatedList,
    };

    if (matchedPreset) {
      if (matchedPreset.imageUrl) {
        patch.imageUrl = matchedPreset.imageUrl;
      }
      if (matchedPreset.category) {
        patch.category = matchedPreset.category;
      }
    }

    if (onUpdateItem) {
      onUpdateItem(item.id, patch);
    }
    setShowNameDropdown(false);
  };

  const handleAddCustomName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.('adicionar novos nomes ao item');
      return;
    }
    const trimmed = newCustomName.trim();
    if (!trimmed) return;
    playHapticSound('click');
    const updatedList = Array.from(new Set([...currentNameList, trimmed]));
    if (onUpdateItem) {
      onUpdateItem(item.id, {
        name: trimmed,
        nameList: updatedList,
      });
    }
    setNewCustomName('');
    setIsAddingName(false);
  };

  const handleRemoveNameFromList = (nameToRemove: string) => {
    if (!isAdmin) {
      onRequireAdmin?.('remover nomes da lista');
      return;
    }
    if (currentNameList.length <= 1) return;
    playHapticSound('delete');
    const updatedList = currentNameList.filter((n) => n !== nameToRemove);
    const newActiveName = item.name === nameToRemove ? updatedList[0] : item.name;
    if (onUpdateItem) {
      onUpdateItem(item.id, {
        name: newActiveName,
        nameList: updatedList,
      });
    }
  };

  const handleSwapNames = (idxA: number, idxB: number) => {
    if (!isAdmin) {
      onRequireAdmin?.('trocar a ordem dos nomes');
      return;
    }
    if (idxA < 0 || idxB < 0 || idxA >= currentNameList.length || idxB >= currentNameList.length) return;
    playHapticSound('click');
    const updated = [...currentNameList];
    const temp = updated[idxA];
    updated[idxA] = updated[idxB];
    updated[idxB] = temp;
    if (onUpdateItem) {
      onUpdateItem(item.id, {
        nameList: updated,
      });
    }
  };

  const otherItemsToSwap = allItems.filter((other) => other.id !== item.id);

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      onRequireAdmin?.('alterar a quantidade deste produto');
      return;
    }
    playHapticSound('click');
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onDeleteItem(item.id);
    }
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      onRequireAdmin?.('alterar a quantidade deste produto');
      return;
    }
    playHapticSound('click');
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      onRequireAdmin?.('marcar produtos como comprados');
      return;
    }
    playHapticSound('toggle');
    onToggleStatus(item.id);
  };

  // Color mapping for category/rarity tags
  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'comum':
        return 'bg-slate-100 text-slate-700 border border-slate-300 font-bold';
      case 'incomum':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
      case 'raro':
        return 'bg-sky-50 text-sky-800 border border-sky-300 font-bold';
      case 'epic':
      case 'épico':
        return 'bg-purple-50 text-purple-800 border border-purple-300 font-bold';
      case 'lendario':
      case 'lendário':
        return 'bg-amber-50 text-amber-900 border border-amber-300 font-bold shadow-2xs';
      case 'laticínios':
        return 'bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]';
      case 'mercearia':
        return 'bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]';
      case 'bebidas':
        return 'bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]';
      case 'hortifruti':
        return 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]';
      case 'carnes & peixes':
      case 'carnes':
        return 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]';
      case 'limpeza':
        return 'bg-[#e0f2fe] text-[#075985] border border-[#bae6fd]';
      case 'higiene pessoal':
      case 'higiene':
        return 'bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]';
      default:
        return 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDropTarget) setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        onDropCard?.(item.id, e);
      }}
      className={`group relative bg-white rounded-2xl border transition-all duration-150 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs hover:shadow-sm ${
        isDragging ? 'opacity-40 scale-[0.98] border-dashed border-[#2a14b4]' : ''
      } ${
        isDropTarget
          ? 'ring-2 ring-[#2a14b4] bg-[#eaedff]/40 border-[#2a14b4] scale-[1.01]'
          : isCompleted
          ? 'border-[#86efac]/50 bg-[#fafdfa]/70'
          : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
      }`}
    >
      {/* Left zone: Drag Handle + Checkbox + Thumbnail + Info */}
      <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0">
        {/* Drag handle to swap marker by dragging (Admin only) */}
        {isAdmin && (
          <div
            draggable
            onDragStart={(e) => onDragStartCard?.(item.id, e)}
            onDragEnd={onDragEndCard}
            title="Arraste para trocar o lugar deste marcador pelo outro"
            className="hidden sm:flex items-center justify-center p-1 text-[#94a3b8] hover:text-[#2a14b4] hover:bg-[#eaedff] rounded-lg cursor-grab active:cursor-grabbing transition-colors shrink-0 mt-1 select-none"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Bulk select check + Cart checkmark button */}
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <input
            type="checkbox"
            checked={!!item.selected}
            onChange={() => onToggleSelect(item.id)}
            title="Selecionar este produto"
            className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 cursor-pointer accent-[#2a14b4]"
          />

          <button
            type="button"
            onClick={handleToggle}
            aria-label={isCompleted ? 'Desmarcar como concluído' : 'Marcar como concluído'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isCompleted
                ? 'bg-[#006c4a] text-white shadow-xs'
                : 'bg-[#f8fafc] border-2 border-[#cbd5e1] hover:border-[#2a14b4]'
            }`}
          >
            {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
          </button>
        </div>

        {/* Thumbnail with click to edit/view image */}
        <button
          type="button"
          onClick={() => {
            if (!isAdmin) {
              onRequireAdmin?.('editar dados ou imagem deste produto');
              return;
            }
            onOpenEdit(item);
          }}
          className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#f1f5f9] border border-[#e2e8f0] shrink-0 group/img cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2a14b4] mt-0.5"
          title={isAdmin ? "Clique para editar dados ou imagem do item" : "Apenas Administrador pode editar"}
        >
          {item.imageUrl && !imgError ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f8fafc] text-[#94a3b8]">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
          {isAdmin && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
              Editar
            </div>
          )}
        </button>

        {/* Text Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3
              onClick={() => {
                if (!isAdmin) {
                  onRequireAdmin?.('editar detalhes deste produto');
                  return;
                }
                onOpenEdit(item);
              }}
              className={`font-bold text-sm sm:text-base leading-snug cursor-pointer hover:text-[#2a14b4] transition-colors truncate max-w-[280px] ${
                isCompleted ? 'line-through text-[#64748b]' : 'text-[#131b2e]'
              }`}
            >
              {item.name}
            </h3>

            {/* Category tag */}
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${getCategoryBadgeClass(
                item.category
              )}`}
            >
              {item.category}
            </span>

            {/* Swap Places Option Button (Trocar de Lugar) */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAdmin) {
                    onRequireAdmin?.('trocar o lugar deste marcador');
                    return;
                  }
                  setShowSwapModal(!showSwapModal);
                }}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  showSwapModal
                    ? 'bg-[#2a14b4] text-white shadow-xs'
                    : 'bg-[#eaedff] text-[#2a14b4] hover:bg-[#dbe1ff] border border-[#c7d2fe]'
                }`}
                title="Trocar o lugar deste marcador pelo outro na lista"
              >
                <ArrowLeftRight className="w-3 h-3 text-current" />
                <span>Trocar Lugar</span>
                <span className="text-[10px] font-bold opacity-80 px-1 rounded bg-black/10">
                  #{itemIndex + 1}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showSwapModal ? 'rotate-180' : ''}`} />
              </button>

              {/* Direct Up / Down quick swap buttons */}
              <div className="inline-flex items-center ml-1 border border-[#e2e8f0] rounded-md bg-[#f8fafc] overflow-hidden align-middle">
                <button
                  type="button"
                  disabled={itemIndex === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin) {
                      onRequireAdmin?.('trocar o lugar deste marcador');
                      return;
                    }
                    onMoveItem?.(item.id, 'up');
                  }}
                  className="p-0.5 px-1 text-[#64748b] hover:text-[#2a14b4] hover:bg-[#eaedff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#64748b] cursor-pointer"
                  title="Subir marcador (trocar com o anterior)"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={itemIndex >= totalItems - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin) {
                      onRequireAdmin?.('trocar o lugar deste marcador');
                      return;
                    }
                    onMoveItem?.(item.id, 'down');
                  }}
                  className="p-0.5 px-1 text-[#64748b] hover:text-[#2a14b4] hover:bg-[#eaedff] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#64748b] cursor-pointer"
                  title="Descer marcador (trocar com o seguinte)"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Popover / Modal to swap place directly with any other marker */}
              {showSwapModal && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSwapModal(false)}
                  />
                  <div
                    className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-84 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-3 text-left animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9] mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#131b2e]">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#2a14b4]" />
                        <span>Trocar Lugar do Marcador</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSwapModal(false)}
                        className="text-[#94a3b8] hover:text-[#131b2e] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[11px] text-[#64748b] mb-2.5">
                      Marcador atual: <span className="font-bold text-[#131b2e]">#{itemIndex + 1} {item.name}</span>
                    </div>

                    {/* Quick Step Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                      <button
                        type="button"
                        disabled={itemIndex === 0}
                        onClick={() => {
                          onMoveItem?.(item.id, 'up');
                          setShowSwapModal(false);
                        }}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eaedff] hover:border-[#c7d2fe] hover:text-[#2a14b4] text-xs font-semibold text-[#475569] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Subir (▲)</span>
                      </button>
                      <button
                        type="button"
                        disabled={itemIndex >= totalItems - 1}
                        onClick={() => {
                          onMoveItem?.(item.id, 'down');
                          setShowSwapModal(false);
                        }}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eaedff] hover:border-[#c7d2fe] hover:text-[#2a14b4] text-xs font-semibold text-[#475569] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Descer (▼)</span>
                      </button>
                    </div>

                    <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                      Trocar diretamente com:
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                      {otherItemsToSwap.length === 0 ? (
                        <p className="text-xs text-[#94a3b8] py-3 text-center">
                          Não há outros marcadores na lista.
                        </p>
                      ) : (
                        otherItemsToSwap.map((other) => {
                          const otherPos = (allItems || []).findIndex((x) => x.id === other.id) + 1;
                          return (
                            <button
                              key={other.id}
                              type="button"
                              onClick={() => {
                                onSwapItems?.(item.id, other.id);
                                setShowSwapModal(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl border border-[#e2e8f0] hover:border-[#2a14b4] hover:bg-[#f0f4ff] transition-all text-left cursor-pointer group/opt"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-[#eaedff] text-[#2a14b4] text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{otherPos}
                                </span>
                                {other.imageUrl ? (
                                  <img
                                    src={other.imageUrl}
                                    alt=""
                                    className="w-6 h-6 rounded-md object-cover border border-[#e2e8f0] shrink-0"
                                  />
                                ) : (
                                  <Tag className="w-4 h-4 text-[#94a3b8] shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-[#131b2e] group-hover/opt:text-[#2a14b4] truncate max-w-[130px]">
                                    {other.name}
                                  </div>
                                  <div className="text-[10px] text-[#64748b]">
                                    {other.category}
                                  </div>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a14b4] bg-white group-hover/opt:bg-[#2a14b4] group-hover/opt:text-white px-2 py-0.5 rounded-lg border border-[#c7d2fe] transition-colors shrink-0">
                                <ArrowLeftRight className="w-2.5 h-2.5" />
                                <span>Trocar</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lista de Nomes Dropdown Toggle */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNameDropdown(!showNameDropdown);
                }}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  showNameDropdown
                    ? 'bg-[#2a14b4] text-white shadow-xs'
                    : 'bg-[#eaedff] text-[#2a14b4] hover:bg-[#dbe1ff] border border-[#c7d2fe]'
                }`}
                title="Abrir catálogo e lista de nomes deste item"
              >
                <Tag className="w-3 h-3" />
                <span>Lista de Nomes ({currentNameList.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showNameDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showNameDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowNameDropdown(false)}
                  />
                  <div
                    className="absolute left-0 top-full mt-1.5 z-40 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-3 text-left animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9] mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#131b2e]">
                        <Tag className="w-3.5 h-3.5 text-[#2a14b4]" />
                        <span>Lista de Nomes do Item</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNameDropdown(false)}
                        className="text-[#94a3b8] hover:text-[#131b2e] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Current item's names */}
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                        Nomes Associados a Este Item:
                      </div>
                      <div className="space-y-1">
                        {currentNameList.map((nameOpt, nameIdx) => {
                          const isActive = nameOpt === item.name;
                          return (
                            <div
                              key={nameOpt}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                                isActive
                                  ? 'bg-[#eaedff] text-[#2a14b4] font-bold'
                                  : 'hover:bg-[#f8fafc] text-[#334155]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectName(nameOpt)}
                                className="flex-1 text-left flex items-center gap-1.5 cursor-pointer truncate"
                              >
                                {isActive ? (
                                  <Check className="w-3.5 h-3.5 text-[#2a14b4] shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-[#cbd5e1] shrink-0" />
                                )}
                                <span className="truncate">{nameOpt}</span>
                              </button>

                              {/* Reorder / Swap name markers */}
                              {currentNameList.length > 1 && (
                                <div className="flex items-center gap-0.5 ml-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={nameIdx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwapNames(nameIdx, nameIdx - 1);
                                    }}
                                    className="p-1 text-[#94a3b8] hover:text-[#2a14b4] hover:bg-white rounded disabled:opacity-20 cursor-pointer transition-colors"
                                    title={`Subir marcador "${nameOpt}" (trocar de lugar)`}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={nameIdx === currentNameList.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwapNames(nameIdx, nameIdx + 1);
                                    }}
                                    className="p-1 text-[#94a3b8] hover:text-[#2a14b4] hover:bg-white rounded disabled:opacity-20 cursor-pointer transition-colors"
                                    title={`Descer marcador "${nameOpt}" (trocar de lugar)`}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              {currentNameList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNameFromList(nameOpt)}
                                  className="text-[#94a3b8] hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer shrink-0 ml-1"
                                  title={`Remover "${nameOpt}" da lista`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Add Custom Name */}
                    <form
                      onSubmit={handleAddCustomName}
                      className="flex items-center gap-1.5 mb-3 pt-2 border-t border-[#f1f5f9]"
                    >
                      <input
                        type="text"
                        value={newCustomName}
                        onChange={(e) => setNewCustomName(e.target.value)}
                        placeholder="Digitar novo nome..."
                        className="flex-1 px-2.5 py-1.5 text-xs bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] rounded-lg text-[#131b2e] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newCustomName.trim()}
                        className="px-2.5 py-1.5 bg-[#2a14b4] text-white rounded-lg text-xs font-semibold hover:bg-[#1f0e8a] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                      >
                        + Adicionar
                      </button>
                    </form>

                    {/* Preset Names Catalogue */}
                    <div>
                      <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Escolher do Catálogo de Nomes:</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {PRESET_ITEM_NAMES.map((preset) => {
                          const isAlreadyInList = currentNameList.includes(preset.name);
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleSelectName(preset.name)}
                              className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs hover:bg-[#f8fafc] transition-colors cursor-pointer group/opt text-left"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {preset.imageUrl ? (
                                  <img
                                    src={preset.imageUrl}
                                    alt=""
                                    className="w-4 h-4 rounded-md object-cover border border-[#e2e8f0]"
                                  />
                                ) : (
                                  <Tag className="w-3.5 h-3.5 text-[#94a3b8]" />
                                )}
                                <span className={`truncate ${isAlreadyInList ? 'font-semibold text-[#2a14b4]' : 'text-[#334155]'}`}>
                                  {preset.name}
                                </span>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${getCategoryBadgeClass(preset.category)}`}>
                                {preset.category}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status tag */}
            {isCompleted ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#82f5c1]/30 text-[#00714e] border border-[#82f5c1]/60 flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                Concluído
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f1f5f9] text-[#64748b]">
                Pendente
              </span>
            )}
          </div>

          {/* Interactive Name List Chips Row */}
          <div className="flex flex-wrap items-center gap-1.5 my-1.5">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1 mr-0.5">
              <Tag className="w-2.5 h-2.5 text-[#2a14b4]" />
              Nomes:
            </span>

            {currentNameList.map((nameOpt, nameIdx) => {
              const isActive = nameOpt === item.name;
              return (
                <div
                  key={nameOpt}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#2a14b4] text-white font-semibold shadow-2xs'
                      : 'bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0] border border-[#e2e8f0]'
                  }`}
                >
                  {/* Left shift arrow for swapping name marker position */}
                  {currentNameList.length > 1 && (
                    <button
                      type="button"
                      disabled={nameIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwapNames(nameIdx, nameIdx - 1);
                      }}
                      className={`p-0.5 rounded transition-opacity disabled:opacity-20 cursor-pointer ${
                        isActive ? 'text-white/80 hover:text-white' : 'text-[#64748b] hover:text-[#2a14b4]'
                      }`}
                      title={`Mover marcador "${nameOpt}" para a esquerda (trocar de lugar)`}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectName(nameOpt);
                    }}
                    className="cursor-pointer flex items-center gap-1"
                    title={isActive ? 'Nome atualmente selecionado' : `Ativar nome "${nameOpt}"`}
                  >
                    {isActive && <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />}
                    <span>{nameOpt}</span>
                  </button>

                  {/* Right shift arrow for swapping name marker position */}
                  {currentNameList.length > 1 && (
                    <button
                      type="button"
                      disabled={nameIdx === currentNameList.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwapNames(nameIdx, nameIdx + 1);
                      }}
                      className={`p-0.5 rounded transition-opacity disabled:opacity-20 cursor-pointer ${
                        isActive ? 'text-white/80 hover:text-white' : 'text-[#64748b] hover:text-[#2a14b4]'
                      }`}
                      title={`Mover marcador "${nameOpt}" para a direita (trocar de lugar)`}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {currentNameList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNameFromList(nameOpt);
                      }}
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        isActive
                          ? 'hover:bg-white/20 text-white/80'
                          : 'hover:bg-[#cbd5e1] text-[#94a3b8] hover:text-rose-600'
                      }`}
                      title={`Remover "${nameOpt}" da lista de nomes`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Inline Quick Add button */}
            {isAddingName ? (
              <form
                onSubmit={handleAddCustomName}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1"
              >
                <input
                  type="text"
                  autoFocus
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Novo nome..."
                  className="px-2 py-0.5 text-xs bg-white border border-[#2a14b4] rounded-md text-[#131b2e] focus:outline-none w-28 shadow-xs"
                />
                <button
                  type="submit"
                  className="px-1.5 py-0.5 bg-[#2a14b4] text-white rounded-md text-[11px] font-bold cursor-pointer"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingName(false)}
                  className="text-[#94a3b8] hover:text-[#131b2e] p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingName(true);
                }}
                className="inline-flex items-center gap-0.5 text-[11px] text-[#2a14b4] hover:text-[#1e0e80] bg-[#faf8ff] hover:bg-[#eaedff] px-2 py-0.5 rounded-lg border border-dashed border-[#c7d2fe] font-semibold transition-colors cursor-pointer"
                title="Adicionar outro nome à lista deste item"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar nome</span>
              </button>
            )}
          </div>

          {/* Details row: brand preference & unit price */}
          <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
            {item.unitPrice !== undefined && item.unitPrice > 0 && (
              <span className="font-semibold text-[#0f172a] bg-[#f8fafc] px-2 py-0.5 rounded-md border border-[#e2e8f0]">
                {currencySymbol} {item.unitPrice.toFixed(2)} / {item.unit}
              </span>
            )}
            {item.packageInfo && (
              <span className="text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-md">
                {item.packageInfo}
              </span>
            )}
            {item.brandOrPreference ? (
              <div className="flex items-center gap-1">
                <span className="text-[#64748b] font-medium">Preferência:</span>
                <span className="font-semibold text-[#1e293b] bg-[#f1f5f9] px-2 py-0.5 rounded-md border border-[#e2e8f0]/80">
                  {item.brandOrPreference}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    onRequireAdmin?.('adicionar preferência ao produto');
                    return;
                  }
                  onOpenEdit(item);
                }}
                className="text-[11px] text-[#2a14b4] hover:text-[#1e0e80] hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                + Adicionar preferência
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right zone: Stepper + Notes Button + Trash Button */}
      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f1f5f9]">
        {/* Stepper (- quantity +) */}
        <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-0.5">
          <button
            type="button"
            onClick={handleDecrease}
            className="w-9 h-9 flex items-center justify-center text-[#475569] hover:bg-[#e2e8f0] active:scale-95 rounded-lg transition-all cursor-pointer"
            aria-label="Diminuir quantidade"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                onRequireAdmin?.('editar quantidade ou dados do produto');
                return;
              }
              onOpenEdit(item);
            }}
            className="px-2.5 min-w-[42px] text-center font-bold text-xs text-[#131b2e] hover:text-[#2a14b4] cursor-pointer tabular-nums flex flex-col items-center justify-center"
            title="Clique para editar quantidade ou unidade"
          >
            <span>{item.quantity}</span>
            <span className="text-[10px] text-[#64748b] block font-normal -mt-0.5">{item.unit}</span>
          </button>

          <button
            type="button"
            onClick={handleIncrease}
            className="w-9 h-9 flex items-center justify-center text-[#059669] hover:bg-[#ecfdf5] active:scale-95 rounded-lg transition-all cursor-pointer"
            aria-label="Aumentar quantidade"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Notes Button */}
        <button
          type="button"
          onClick={() => onOpenNotes(item)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
            item.notes
              ? 'bg-[#eaedff] border-[#c7d2fe] text-[#2a14b4]'
              : 'bg-white border-[#e2e8f0] text-[#64748b] hover:text-[#131b2e] hover:bg-[#f8fafc]'
          }`}
          title={item.notes ? `Observação: ${item.notes}` : 'Adicionar observação'}
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Delete item button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!isAdmin) {
              onRequireAdmin?.('excluir produtos da lista');
              return;
            }
            playHapticSound('delete');
            onDeleteItem(item.id);
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#e2e8f0] bg-white text-[#94a3b8] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
          title={isAdmin ? "Remover este item" : "Apenas Administrador pode remover itens"}
          aria-label={`Remover item ${item.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
