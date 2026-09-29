import React, { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { ShoppingItem } from '../types/shopping';

interface NotesModalProps {
  item: ShoppingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (item) {
      setText(item.notes || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNotes(item.id, text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#faf8ff] text-[#2a14b4] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#131b2e]">{item.name}</h3>
              <p className="text-[11px] text-[#64748b]">Observações de compra</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#131b2e] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Pegar validade para depois do dia 30, escolher frutas mais verdes..."
            className="w-full p-3 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#4338ca] focus:bg-white rounded-xl text-xs text-[#131b2e] transition-all focus:outline-none"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#2a14b4] text-white rounded-lg hover:bg-[#200e94] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
