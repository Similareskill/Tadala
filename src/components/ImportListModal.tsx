import React, { useState } from 'react';
import { X, Upload, History, FileText, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { ShoppingItem, ShoppingHistoryEntry } from '../types/shopping';

interface ImportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ShoppingHistoryEntry[];
  onImportItems: (newItems: ShoppingItem[], replace: boolean) => void;
}

export const ImportListModal: React.FC<ImportListModalProps> = ({
  isOpen,
  onClose,
  history,
  onImportItems,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'history' | 'text'>('file');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [textInput, setTextInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>(history[0]?.id || '');
  const [parsedItemsPreview, setParsedItemsPreview] = useState<ShoppingItem[] | null>(null);

  if (!isOpen) return null;

  // Handle JSON file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setParsedItemsPreview(null);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize items
          const validItems: ShoppingItem[] = parsed.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: item.name || `Item ${idx + 1}`,
            category: item.category || 'Mercearia',
            status: 'pendente' as const,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'un',
            unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
            packageInfo: item.packageInfo || undefined,
            brandOrPreference: item.brandOrPreference || undefined,
            notes: item.notes || undefined,
            imageUrl: item.imageUrl || undefined,
            selected: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          setParsedItemsPreview(validItems);
        } else {
          setFileError('O arquivo JSON não contém uma lista válida de produtos.');
        }
      } catch {
        setFileError('Erro ao processar arquivo JSON. Verifique se o formato é válido.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Text import (line by line)
  const handleParseText = () => {
    if (!textInput.trim()) return [];
    const lines = textInput.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line, idx) => {
      const cleanLine = line.replace(/^[•\-\*\[\]\d\.\)]+\s*/, '').trim();
      // Match pattern like "Leite 2 un" or "Arroz - 2kg"
      const qtyMatch = cleanLine.match(/(\d+)\s*(un|kg|g|L|ml|pct|cx)?$/i);
      let name = cleanLine;
      let qty = 1;
      let unit = 'un';

      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10) || 1;
        unit = qtyMatch[2]?.toLowerCase() || 'un';
        name = cleanLine.substring(0, qtyMatch.index).replace(/[\-\–\:]\s*$/, '').trim();
      }

      return {
        id: `item-${Date.now()}-${idx}`,
        name: name || cleanLine,
        category: 'Mercearia',
        status: 'pendente' as const,
        quantity: qty,
        unit: unit,
        selected: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleConfirmImport = () => {
    let itemsToImport: ShoppingItem[] = [];

    if (activeTab === 'file' && parsedItemsPreview) {
      itemsToImport = parsedItemsPreview;
    } else if (activeTab === 'history') {
      const hist = history.find((h) => h.id === selectedHistoryId);
      if (hist) {
        itemsToImport = hist.items.map((i, idx) => ({
          ...i,
          id: `item-${Date.now()}-${idx}`,
          status: 'pendente' as const,
          selected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    } else if (activeTab === 'text') {
      itemsToImport = handleParseText();
    }

    if (itemsToImport.length > 0) {
      onImportItems(itemsToImport, importMode === 'replace');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8f0]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f1f5f9] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#131b2e] font-display">
              Importar Cópia da Lista
            </h2>
            <p className="text-xs text-[#64748b]">
              Restaurar cópia de segurança, compras anteriores ou colar texto
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-[#131b2e] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="p-4 border-b border-[#f1f5f9] bg-[#faf8ff]">
          <div className="flex rounded-xl bg-[#eaedff] p-1 gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'file'
                  ? 'bg-white text-[#2a14b4] shadow-xs'
                  : 'text-[#475569] hover:text-[#131b2e]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Arquivo JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-[#2a14b4] shadow-xs'
                  : 'text-[#475569] hover:text-[#131b2e]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Do Histórico
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'text'
                  ? 'bg-white text-[#2a14b4] shadow-xs'
                  : 'text-[#475569] hover:text-[#131b2e]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Colar Texto
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: File JSON */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-[#cbd5e1] hover:border-[#4338ca] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#f8fafc]">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-json-file"
                />
                <label htmlFor="import-json-file" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-[#2a14b4] mx-auto mb-2" />
                  <span className="font-bold text-sm text-[#131b2e] block">
                    Clique para selecionar arquivo de backup (.json)
                  </span>
                  <span className="text-[#64748b] block mt-1">
                    Suporta arquivos exportados pelo botão de backup da aplicação
                  </span>
                </label>
              </div>

              {fileError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {parsedItemsPreview && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {parsedItemsPreview.length} produtos prontos para importação!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: History Entry */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-6 text-[#64748b]">
                  Nenhuma compra arquivada encontrada no histórico.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-bold text-[#334155] block">
                    Escolha qual compra anterior deseja clonar para a lista:
                  </label>
                  {history.map((entry) => (
                    <label
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedHistoryId === entry.id
                          ? 'border-[#2a14b4] bg-[#faf8ff] ring-2 ring-[#2a14b4]/20'
                          : 'border-[#e2e8f0] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="history-selection"
                          checked={selectedHistoryId === entry.id}
                          onChange={() => setSelectedHistoryId(entry.id)}
                          className="accent-[#2a14b4]"
                        />
                        <div>
                          <span className="font-bold text-[#131b2e] block">{entry.title}</span>
                          <span className="text-[#64748b]">{entry.itemsCount} itens ({entry.totalUnits} un)</span>
                        </div>
                      </div>
                      <span className="font-bold text-[#2a14b4]">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Text Paste */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="font-bold text-[#334155] block">
                Cole sua lista de compras (um produto por linha):
              </label>
              <textarea
                rows={6}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Exemplo:&#10;Leite Integral 2 un&#10;Arroz Branco 1 pacote&#10;Café Torrado 500g&#10;Maçã Fuji 6 un"
                className="w-full p-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs text-[#131b2e] transition-all focus:outline-none"
              />
              <p className="text-[#94a3b8]">
                As quantidades e unidades serão detectadas automaticamente.
              </p>
            </div>
          )}

          {/* Replacement Mode */}
          <div className="pt-3 border-t border-[#f1f5f9] flex flex-col gap-2">
            <span className="font-bold text-[#334155]">Modo de importação:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#475569]">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="accent-[#2a14b4]"
                />
                <span>Adicionar aos itens atuais</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#475569]">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-[#2a14b4]"
                />
                <span>Substituir lista existente</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f1f5f9] flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#64748b] hover:text-[#131b2e] hover:bg-[#f1f5f9] rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={
              (activeTab === 'file' && !parsedItemsPreview) ||
              (activeTab === 'history' && !selectedHistoryId) ||
              (activeTab === 'text' && !textInput.trim())
            }
            className="px-5 py-2.5 bg-[#2a14b4] hover:bg-[#200e94] disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            <span>Importar Agora</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
