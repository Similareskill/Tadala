import React, { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Sparkles, Check, Tag, Plus } from 'lucide-react';
import { ShoppingItem } from '../types/shopping';
import { PRESET_IMAGES, PRESET_ITEM_NAMES } from '../data/initialData';

interface ItemModalProps {
  isOpen: boolean;
  item: ShoppingItem | null; // null means create new
  categories: string[];
  currencySymbol: string;
  onClose: () => void;
  onSave: (itemData: Partial<ShoppingItem>) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  item,
  categories,
  currencySymbol,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [nameList, setNameList] = useState<string[]>([]);
  const [newAliasInput, setNewAliasInput] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Comum');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('un');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [packageInfo, setPackageInfo] = useState('');
  const [brandOrPreference, setBrandOrPreference] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload' | 'presets'>('url');
  const [rawHtmlOrUrl, setRawHtmlOrUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setNameList(item.nameList && item.nameList.length > 0 ? item.nameList : item.name ? [item.name] : []);
      setNewAliasInput('');
      setCategory(item.category || categories[0] || 'Comum');
      setQuantity(item.quantity || 1);
      setUnit(item.unit || 'un');
      setUnitPrice(item.unitPrice !== undefined ? String(item.unitPrice) : '');
      setPackageInfo(item.packageInfo || '');
      setBrandOrPreference(item.brandOrPreference || '');
      setNotes(item.notes || '');
      setImageUrl(item.imageUrl || '');
      setRawHtmlOrUrl(item.imageUrl || '');
    } else {
      setName('');
      setNameList([]);
      setNewAliasInput('');
      setCategory(categories[0] || 'Comum');
      setQuantity(1);
      setUnit('un');
      setUnitPrice('');
      setPackageInfo('');
      setBrandOrPreference('');
      setNotes('');
      setImageUrl('');
      setRawHtmlOrUrl('');
    }
    setPreviewError(false);
  }, [item, isOpen, categories]);

  if (!isOpen) return null;

  // Parser that handles direct URL OR HTML <img> tag (e.g. `<img src="https://..." />` or pure URL)
  const handleHtmlOrUrlChange = (value: string) => {
    setRawHtmlOrUrl(value);
    setPreviewError(false);
    
    // Check if input is HTML tag with src
    const imgTagMatch = value.match(/src=["'](.*?)["']/i);
    if (imgTagMatch && imgTagMatch[1]) {
      setImageUrl(imgTagMatch[1].trim());
    } else {
      setImageUrl(value.trim());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
          setRawHtmlOrUrl(file.name);
          setPreviewError(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (url: string) => {
    setImageUrl(url);
    setRawHtmlOrUrl(url);
    setPreviewError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalNameList = Array.from(new Set([...nameList, name.trim()])).filter(Boolean);

    onSave({
      name: name.trim(),
      nameList: finalNameList,
      category,
      quantity: Number(quantity) || 1,
      unit,
      unitPrice: unitPrice ? parseFloat(unitPrice.replace(',', '.')) : undefined,
      packageInfo: packageInfo.trim() || undefined,
      brandOrPreference: brandOrPreference.trim() || undefined,
      notes: notes.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });
    onClose();
  };

  const handleSelectPresetName = (preset: { name: string; category: string; imageUrl?: string }) => {
    setName(preset.name);
    setCategory(preset.category);
    if (preset.imageUrl) {
      setImageUrl(preset.imageUrl);
      setRawHtmlOrUrl(preset.imageUrl);
    }
    setNameList((prev) => Array.from(new Set([...prev, preset.name])));
  };

  const handleAddAliasName = () => {
    const trimmed = newAliasInput.trim();
    if (!trimmed) return;
    setNameList((prev) => Array.from(new Set([...prev, trimmed])));
    setNewAliasInput('');
  };

  const handleRemoveAliasName = (aliasToRemove: string) => {
    setNameList((prev) => prev.filter((a) => a !== aliasToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8f0]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f1f5f9] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#131b2e] font-display">
              {item ? 'Editar Item' : 'Novo Item na Lista'}
            </h2>
            <p className="text-xs text-[#64748b]">
              {item
                ? 'Atualize os dados e a foto associada ao produto'
                : 'Adicione um novo produto com detalhes e imagem'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-[#131b2e] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Item Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#334155]">
                Nome do Item <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-[#64748b]">
                Sugestões da lista abaixo
              </span>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fragmento, Resquício, Relíquia..."
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
            />

            {/* Quick Catalog / Preset Names */}
            <div className="mt-2">
              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block mb-1">
                Escolher da Lista de Nomes (Raridades):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {PRESET_ITEM_NAMES.map((preset) => {
                  const isSelected = name === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPresetName(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#2a14b4] text-white border-[#2a14b4] shadow-2xs font-bold'
                          : 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0] hover:border-[#c7d2fe] hover:bg-[#eaedff]'
                      }`}
                    >
                      {preset.imageUrl && (
                        <img
                          src={preset.imageUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded object-cover"
                        />
                      )}
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name List / Alternate Names for this Item */}
            <div className="mt-3 p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#2a14b4] flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Lista de Nomes / Variantes deste Item:
                </span>
                <span className="text-[10px] text-[#64748b]">
                  {nameList.length} nome(s) associado(s)
                </span>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {nameList.length === 0 && (
                  <span className="text-xs text-[#94a3b8] italic">
                    Nenhum nome adicional adicionado ainda.
                  </span>
                )}
                {nameList.map((alias) => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#d2d9f4] text-[#131b2e] rounded-lg text-xs font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => setName(alias)}
                      className="hover:text-[#2a14b4] cursor-pointer"
                      title="Usar como nome principal"
                    >
                      {alias}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAliasName(alias)}
                      className="text-[#94a3b8] hover:text-rose-600 cursor-pointer ml-0.5"
                      title="Remover nome da lista"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add alias field */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newAliasInput}
                  onChange={(e) => setNewAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAliasName();
                    }
                  }}
                  placeholder="Adicionar outro nome à lista..."
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#e2e8f0] focus:border-[#2a14b4] rounded-lg text-[#131b2e] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddAliasName}
                  disabled={!newAliasInput.trim()}
                  className="px-2.5 py-1 bg-[#2a14b4] text-white rounded-lg text-xs font-semibold hover:bg-[#1f0e8a] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Raridade */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Raridade
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-bold text-[#131b2e] transition-all focus:outline-none tabular-nums"
            />
          </div>

          {/* Marca de Preferência */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Marca de Preferência
            </label>
            <input
              type="text"
              value={brandOrPreference}
              onChange={(e) => setBrandOrPreference(e.target.value)}
              placeholder="Ex: Marca Preferida, Moagem Média"
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
            />
          </div>

          {/* IMAGE ASSOCIATION SECTION (HIGHLIGHTED USER FEATURE) */}
          <div className="pt-2 border-t border-[#f1f5f9]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1e1b4b] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#2a14b4]" />
                Associar Imagem do Produto
              </label>
              <span className="text-[11px] text-[#64748b]">URL, HTML ou Arquivo</span>
            </div>

            {/* Mode switch tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#f1f5f9] rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setImageInputMode('url')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  imageInputMode === 'url'
                    ? 'bg-white text-[#2a14b4] shadow-xs'
                    : 'text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                <LinkIcon className="w-3 h-3" />
                URL / HTML
              </button>

              <button
                type="button"
                onClick={() => setImageInputMode('upload')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  imageInputMode === 'upload'
                    ? 'bg-white text-[#2a14b4] shadow-xs'
                    : 'text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                <Upload className="w-3 h-3" />
                Carregar Arquivo
              </button>

              <button
                type="button"
                onClick={() => setImageInputMode('presets')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  imageInputMode === 'presets'
                    ? 'bg-white text-[#2a14b4] shadow-xs'
                    : 'text-[#64748b] hover:text-[#1e293b]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Galeria Pronta
              </button>
            </div>

            {/* URL or HTML Input Mode */}
            {imageInputMode === 'url' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={rawHtmlOrUrl}
                  onChange={(e) => handleHtmlOrUrlChange(e.target.value)}
                  placeholder="Cole aqui a URL da imagem ou tag HTML (ex: https://... ou <img src='...'>)"
                  className="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs font-mono text-[#131b2e] transition-all focus:outline-none"
                />
                <p className="text-[11px] text-[#94a3b8]">
                  Aceita links diretos de imagens (.jpg, .png, .webp) ou código HTML copiado de páginas web.
                </p>
              </div>
            )}

            {/* File Upload Mode */}
            {imageInputMode === 'upload' && (
              <div className="border-2 border-dashed border-[#cbd5e1] hover:border-[#4338ca] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#faf8ff]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-file-input"
                />
                <label htmlFor="image-file-input" className="cursor-pointer block">
                  <Upload className="w-6 h-6 text-[#4338ca] mx-auto mb-1" />
                  <span className="text-xs font-semibold text-[#1e293b] block">
                    Clique para selecionar imagem do seu dispositivo
                  </span>
                  <span className="text-[11px] text-[#64748b]">PNG, JPG, WEBP até 5MB</span>
                </label>
              </div>
            )}

            {/* Preset Gallery Mode */}
            {imageInputMode === 'presets' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`p-1 rounded-xl border transition-all text-center relative group ${
                      imageUrl === preset.url
                        ? 'border-[#2a14b4] ring-2 ring-[#2a14b4]/20 bg-[#faf8ff]'
                        : 'border-[#e2e8f0] hover:border-[#cbd5e1] bg-white'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-12 object-cover rounded-lg mb-1"
                    />
                    <span className="text-[10px] font-semibold text-[#334155] block truncate">
                      {preset.name}
                    </span>
                    {imageUrl === preset.url && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-[#2a14b4] text-white rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Live Image Preview & Clear option */}
            {imageUrl && (
              <div className="mt-3 flex items-center gap-3 p-2.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[#e2e8f0] shrink-0">
                  {!previewError ? (
                    <img
                      src={imageUrl}
                      alt="Pré-visualização"
                      onError={() => setPreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-rose-500 font-bold">
                      Erro
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#131b2e] block">
                    {previewError ? 'URL de imagem inválida' : 'Imagem associada com sucesso!'}
                  </span>
                  <span className="text-[11px] text-[#64748b] truncate block">
                    {imageUrl.startsWith('data:') ? 'Imagem carregada localmente' : imageUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setRawHtmlOrUrl('');
                    setPreviewError(false);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="pt-2 border-t border-[#f1f5f9]">
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Observações / Instruções de Compra
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Verificar data de validade, escolher maçãs bem vermelhas..."
              className="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs text-[#131b2e] transition-all focus:outline-none"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#2a14b4] hover:bg-[#200e94] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              {item ? 'Salvar Alterações' : 'Adicionar à Lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
