import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, RefreshCw, X, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { ShoppingItem, AppSettings, ShoppingHistoryEntry, AdminAccount, BossEvent, BossCheckin, MemberStatus } from './types/shopping';
import { INITIAL_ITEMS, INITIAL_SETTINGS, INITIAL_HISTORY, PRESET_ITEM_NAMES } from './data/initialData';
import fragmentoImg from './assets/images/fragmento_relic_icon_1790391562071.jpg';
import resquicioImg from './assets/images/resquicio_relic_icon_1790391724781.jpg';
import laminaDouradaImg from './assets/images/lamina_dourada_icon_1790391871978.jpg';
import grimorioImg from './assets/images/grimorio_verde_icon_1790391884226.jpg';
import runaCelesteImg from './assets/images/runa_celeste_icon_1790392045461.jpg';
import { formatRelativeTime, playHapticSound } from './utils/helpers';
import { Sidebar, TabType } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { QuickAddBar } from './components/QuickAddBar';
import { FilterBar, FilterStatus } from './components/FilterBar';
import { BulkActionToolbar } from './components/BulkActionToolbar';
import { ShoppingItemCard } from './components/ShoppingItemCard';
import { SyncFooter } from './components/SyncFooter';
import { ItemModal } from './components/ItemModal';
import { NotesModal } from './components/NotesModal';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { BossCheckinView } from './components/BossCheckinView';
import { RankPontosView } from './components/RankPontosView';
import { StatusView } from './components/StatusView';
import { ProfileModal } from './components/ProfileModal';
import { ImportListModal } from './components/ImportListModal';
import { AuthModal } from './components/AuthModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ShareModal } from './components/ShareModal';
import { authService, itemsService, settingsService, historyService } from './services/firebase';
import { bossService } from './services/bossService';
import { statusService } from './services/statusService';
import { adminAuthService } from './services/adminAuth';
import { activityLogService } from './services/activityLogService';
import { User as FirebaseUser } from 'firebase/auth';

export default function App() {
  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<TabType>('lista');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [localNick, setLocalNick] = useState<string | null>(() => {
    try {
      return localStorage.getItem('shopping_user_name');
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Admin auth state (Admin-only modification control)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => adminAuthService.isAdmin());
  const [adminUser, setAdminUser] = useState<AdminAccount | null>(() => adminAuthService.getCurrentAdmin());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminActionReason, setAdminActionReason] = useState<string | undefined>(undefined);

  const effectiveUser = user || (localNick ? { displayName: localNick, email: null, isAnonymous: true } : null);

  // Data persistence states
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem('shopping_items_v2');
      if (saved) {
        const parsed: ShoppingItem[] = JSON.parse(saved);
        return parsed.map((item) => {
          if (item.category === 'Mercearia' || item.category === 'Laticínios' || item.category === 'Padaria & Doces') {
            return { ...item, category: 'Comum' };
          }
          if (item.category === 'Hortifruti' || item.category === 'Limpeza') {
            return { ...item, category: 'Incomum' };
          }
          if (item.category === 'Bebidas' || item.category === 'Higiene Pessoal') {
            return { ...item, category: 'Raro' };
          }
          if (item.category === 'Carnes & Peixes' || item.category === 'Congelados') {
            return { ...item, category: 'Epic' };
          }
          if (item.category === 'Pet Shop') {
            return { ...item, category: 'Lendario' };
          }
          if (item.id === 'item-1' || (item.imageUrl && item.imageUrl.includes('prod_leite_carton'))) {
            return { ...item, imageUrl: fragmentoImg, name: item.name === 'Leite Integral' ? 'Fragmento Ancestral' : item.name };
          }
          if (item.id === 'item-2' || (item.imageUrl && item.imageUrl.includes('prod_arroz_pacote'))) {
            return { ...item, imageUrl: resquicioImg, name: item.name === 'Arroz Branco' ? 'Resquício Místico' : item.name };
          }
          if (item.id === 'item-3' || (item.imageUrl && item.imageUrl.includes('prod_cafe_torrado'))) {
            return { ...item, imageUrl: laminaDouradaImg, name: item.name === 'Café Torrado e Moído' ? 'Lâmina Rúnica Dourada' : item.name };
          }
          if (item.id === 'item-4' || (item.imageUrl && item.imageUrl.includes('prod_maca_fuji'))) {
            return { ...item, imageUrl: grimorioImg, name: item.name === 'Maçã Fuji Selecionada' ? 'Grimório da Espada' : item.name, category: 'Epic' };
          }
          if (item.id === 'item-5' || (item.imageUrl && item.imageUrl.includes('prod_azeite_vidro'))) {
            item = { ...item, imageUrl: runaCelesteImg, name: item.name === 'Azeite Extra Virgem' ? 'Runa Celeste Diamantada' : item.name, category: 'Epic' };
          }
          if (!item.nameList || item.nameList.length === 0) {
            const matched = PRESET_ITEM_NAMES.find(
              (p) => p.name.toLowerCase() === item.name.toLowerCase()
            );
            item = {
              ...item,
              nameList: matched?.aliases ? [item.name, ...matched.aliases] : [item.name],
            };
          }
          if (item.order === undefined) {
            item = { ...item, order: parsed.indexOf(item) };
          }
          return item;
        });
      }
    } catch {}
    return INITIAL_ITEMS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('shopping_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.listName === 'Minha Lista de Compras') {
          parsed.listName = 'Lista De Itens';
        }
        if (!parsed.categories || parsed.categories.includes('Mercearia')) {
          parsed.categories = INITIAL_SETTINGS.categories;
        }
        return parsed;
      }
    } catch {}
    return INITIAL_SETTINGS;
  });

  const [history, setHistory] = useState<ShoppingHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('shopping_history_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_HISTORY;
  });

  // Filter & Search states
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('todos');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | null>(null);
  const [notesItem, setNotesItem] = useState<ShoppingItem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem('shopping_items_v2', JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('shopping_settings_v2', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('shopping_history_v2', JSON.stringify(history));
    } catch {}
  }, [history]);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsub = authService.subscribe((currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Subscribe to Admin status
  useEffect(() => {
    const unsub = adminAuthService.subscribe((currentIsAdmin, currentAdmin) => {
      setIsAdmin(currentIsAdmin);
      setAdminUser(currentAdmin);
    });
    return () => unsub();
  }, []);

  const handleAdminLogout = async () => {
    try {
      await adminAuthService.logout();
      activityLogService.log({
        type: 'admin_logout',
        title: 'Logout de Administrador Realizado',
        description: 'Sessão administrativa encerrada pelo usuário.',
        userName: adminUser?.email || 'Admin',
        userRole: 'admin',
      });
      showToast('Sessão de Administrador encerrada. Agora em Modo Visualizador.');
    } catch (err) {
      console.error('Logout admin error:', err);
    }
  };

  const requireAdmin = (reason?: string): boolean => {
    if (isAdmin) return true;
    setAdminActionReason(reason || 'Apenas quem tem login de Admin pode modificar a lista, histórico ou configurações.');
    setIsAdminModalOpen(true);
    playHapticSound('toggle');
    return false;
  };

  // Real-time synchronization with Firestore (multi-device)
  useEffect(() => {
    // Seed initial items if Firestore collection is empty
    itemsService.seedInitialIfEmpty(INITIAL_ITEMS);

    const unsubItems = itemsService.subscribe(
      (firestoreItems) => {
        setItems((prevLocal) => {
          const selectedMap = new Set(prevLocal.filter((i) => i.selected).map((i) => i.id));
          return firestoreItems.map((fi) => ({
            ...fi,
            selected: selectedMap.has(fi.id),
          }));
        });
      },
      (err) => {
        console.warn('Real-time items sync notice:', err);
      }
    );

    const unsubSettings = settingsService.subscribe((remoteSettings) => {
      setSettings(remoteSettings);
    });

    const unsubHistory = historyService.subscribe((remoteHistory) => {
      setHistory(remoteHistory);
    });

    return () => {
      unsubItems();
      unsubSettings();
      unsubHistory();
    };
  }, []);

  // Boss Check-in and Rank Real-time Subscriptions
  const [bossEvents, setBossEvents] = useState<BossEvent[]>([]);
  const [checkins, setCheckins] = useState<BossCheckin[]>([]);

  // Member Statuses Real-time Subscription (Dano, Defesa, Acerto, Power)
  const [memberStatuses, setMemberStatuses] = useState<MemberStatus[]>([]);

  useEffect(() => {
    const unsubBosses = bossService.subscribeBossEvents((events) => {
      setBossEvents(events);
    });
    const unsubCheckins = bossService.subscribeCheckins((chks) => {
      setCheckins(chks);
    });
    const unsubStatuses = statusService.subscribe((statuses) => {
      setMemberStatuses(statuses);
    });

    return () => {
      unsubBosses();
      unsubCheckins();
      unsubStatuses();
    };
  }, []);

  const openBossesCount = useMemo(() => {
    return bossEvents.filter(
      (b) => bossService.getCheckinWindowStatus(b.scheduledTime).isOpen
    ).length;
  }, [bossEvents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Metrics computation
  const totalUnits = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const totalProducts = items.length;

  const pendingItems = useMemo(() => {
    return items.filter((i) => i.status === 'pendente');
  }, [items]);

  const cartItems = useMemo(() => {
    return items.filter((i) => i.status === 'no_carrinho');
  }, [items]);

  const totalEstimatedPrice = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = item.unitPrice || 0;
      return acc + price * item.quantity;
    }, 0);
  }, [items]);

  // Last updated relative time (from latest item update)
  const lastUpdatedText = useMemo(() => {
    if (items.length === 0) return 'Atualizado agora';
    const latest = items.reduce((latestTime, item) => {
      const t = new Date(item.updatedAt || item.createdAt).getTime();
      return Math.max(latestTime, t);
    }, 0);
    return `Atualizado ${formatRelativeTime(new Date(latest).toISOString())}`;
  }, [items]);

  // Filtered Items for List View
  const filteredItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      const timeA = new Date(b.createdAt || 0).getTime();
      const timeB = new Date(a.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return sorted.filter((item) => {
      // Global search filter
      if (globalSearch.trim()) {
        const query = globalSearch.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCat = item.category.toLowerCase().includes(query);
        const matchBrand = (item.brandOrPreference || '').toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchBrand) return false;
      }

      // Local search filter
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCat = item.category.toLowerCase().includes(query);
        const matchBrand = (item.brandOrPreference || '').toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchBrand) return false;
      }

      // Status filter
      if (statusFilter === 'pendente' && item.status !== 'pendente') return false;
      if (statusFilter === 'no_carrinho' && item.status !== 'no_carrinho') return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      return true;
    });
  }, [items, globalSearch, filterSearch, statusFilter, selectedCategory]);

  // Bulk actions status
  const visibleSelectedCount = useMemo(() => {
    return filteredItems.filter((i) => i.selected).length;
  }, [filteredItems]);

  const allVisibleSelected = filteredItems.length > 0 && visibleSelectedCount === filteredItems.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  // Handlers for Items
  const handleToggleStatus = (id: string) => {
    if (!requireAdmin('Apenas o Administrador pode marcar itens como coletados ou pendentes.')) return;
    let updatedItem: ShoppingItem | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'pendente' ? 'no_carrinho' : 'pendente';
          updatedItem = {
            ...item,
            status: nextStatus,
            selected: nextStatus === 'no_carrinho', // auto select/check in sync with screenshot
            updatedAt: new Date().toISOString(),
          };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      itemsService.saveItem(updatedItem).catch((err) => console.warn('Sync error:', err));
    }
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (!requireAdmin('Apenas o Administrador pode alterar a quantidade dos itens.')) return;
    if (newQty < 1) return;
    let updatedItem: ShoppingItem | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = { ...item, quantity: newQty, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      itemsService.saveItem(updatedItem).catch((err) => console.warn('Sync error:', err));
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!requireAdmin('Apenas o Administrador pode remover itens da lista.')) return;
    const itemToDelete = items.find((i) => i.id === id);
    // Immediate optimistic update
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast(`"${itemToDelete?.name || 'Item'}" removido`);
    activityLogService.log({
      type: 'item_delete',
      title: 'Item Removido da Lista',
      description: `Item "${itemToDelete?.name || id}" excluído da lista de compras.`,
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });
    // Delete in Firestore
    try {
      await itemsService.deleteItem(id);
    } catch (err) {
      console.error('Erro ao excluir item no Firestore:', err);
    }
  };

  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleSelectAll = () => {
    const targetState = !allVisibleSelected;
    setItems((prev) =>
      prev.map((item) => {
        if (filteredItems.some((f) => f.id === item.id)) {
          return { ...item, selected: targetState };
        }
        return item;
      })
    );
  };

  const handleMarkSelectedAsCollected = () => {
    if (!requireAdmin('Apenas o Administrador pode mover itens selecionados para o carrinho.')) return;
    playHapticSound('toggle');
    const updatedItems: ShoppingItem[] = [];
    setItems((prev) =>
      prev.map((item) => {
        if (item.selected) {
          const upd: ShoppingItem = {
            ...item,
            status: 'no_carrinho',
            updatedAt: new Date().toISOString(),
          };
          updatedItems.push(upd);
          return upd;
        }
        return item;
      })
    );
    showToast('Itens marcados no carrinho');
    for (const item of updatedItems) {
      itemsService.saveItem(item).catch((err) => console.warn('Sync error:', err));
    }
  };

  const handleDeleteSelected = async () => {
    if (!requireAdmin('Apenas o Administrador pode excluir itens da lista.')) return;
    playHapticSound('delete');
    const selectedIds = items.filter((i) => i.selected).map((i) => i.id);
    const toDeleteCount = selectedIds.length;
    if (toDeleteCount === 0) return;

    // Optimistic local deletion
    setItems((prev) => prev.filter((item) => !item.selected));
    showToast(`${toDeleteCount} itens excluídos`);

    // Delete in Firestore
    try {
      await itemsService.deleteMultipleItems(selectedIds);
    } catch (err) {
      console.error('Erro ao excluir múltiplos itens no Firestore:', err);
    }
  };

  // Quick Add Item handler
  const handleQuickAdd = async (
    name: string,
    category: string,
    quantity: number,
    brandOrPreference?: string
  ) => {
    if (!requireAdmin('Apenas o Administrador pode adicionar novos itens à lista.')) return;
    const matchedPreset = PRESET_ITEM_NAMES.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    const initialNameList = matchedPreset?.aliases
      ? Array.from(new Set([name, ...matchedPreset.aliases]))
      : [name];

    const minOrder = items.length > 0 ? Math.min(...items.map((i) => i.order ?? 0)) : 0;
    const newItem: ShoppingItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      quantity,
      unit: 'un',
      brandOrPreference,
      status: 'pendente',
      imageUrl: matchedPreset?.imageUrl,
      nameList: initialNameList,
      selected: false,
      order: minOrder - 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid,
      createdByName: user?.displayName || user?.email || undefined,
    };
    setItems((prev) => [newItem, ...prev]);
    showToast(`"${name}" adicionado à lista`);
    activityLogService.log({
      type: 'item_add',
      title: 'Item Adicionado',
      description: `Item "${name}" (${quantity} un, ${category}) adicionado à lista.`,
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });

    try {
      await itemsService.saveItem(newItem);
    } catch (err) {
      console.warn('Sync error:', err);
    }
  };

  // Full Save / Edit modal handler
  const handleSaveItemModal = async (itemData: Partial<ShoppingItem>) => {
    if (!requireAdmin('Apenas o Administrador pode cadastrar ou modificar itens.')) return;
    if (itemToEdit) {
      // Edit existing
      const updated: ShoppingItem = {
        ...itemToEdit,
        ...itemData,
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) =>
        prev.map((i) => (i.id === itemToEdit.id ? updated : i))
      );
      showToast(`"${itemData.name}" atualizado`);
      activityLogService.log({
        type: 'item_update',
        title: 'Item Atualizado',
        description: `Item "${itemData.name || itemToEdit.name}" atualizado no catálogo.`,
        userName: adminUser?.email || 'Admin',
        userRole: 'admin',
      });
      try {
        await itemsService.saveItem(updated);
      } catch (err) {
        console.warn('Sync error:', err);
      }
    } else {
      // Create new
      const minOrder = items.length > 0 ? Math.min(...items.map((i) => i.order ?? 0)) : 0;
      const newItem: ShoppingItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: itemData.name || 'Novo Produto',
        category: itemData.category || 'Comum',
        status: 'pendente',
        quantity: itemData.quantity || 1,
        unit: itemData.unit || 'un',
        unitPrice: itemData.unitPrice,
        packageInfo: itemData.packageInfo,
        brandOrPreference: itemData.brandOrPreference,
        notes: itemData.notes,
        imageUrl: itemData.imageUrl,
        nameList: itemData.nameList || (itemData.name ? [itemData.name] : ['Novo Produto']),
        selected: false,
        order: minOrder - 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email || undefined,
      };
      setItems((prev) => [newItem, ...prev]);
      showToast(`"${newItem.name}" adicionado com foto associada`);
      activityLogService.log({
        type: 'item_add',
        title: 'Novo Item Cadastrado',
        description: `Item "${newItem.name}" (${newItem.quantity} ${newItem.unit}, ${newItem.category}) cadastrado.`,
        userName: adminUser?.email || 'Admin',
        userRole: 'admin',
      });
      try {
        await itemsService.saveItem(newItem);
      } catch (err) {
        console.warn('Sync error:', err);
      }
    }
  };

  // Save quick note
  const handleSaveNotes = async (id: string, notes: string) => {
    if (!requireAdmin('Apenas o Administrador pode salvar observações no item.')) return;
    let updatedItem: ShoppingItem | null = null;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          updatedItem = { ...i, notes, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return i;
      })
    );
    showToast('Observação salva');
    if (updatedItem) {
      try {
        await itemsService.saveItem(updatedItem);
      } catch (err) {
        console.warn('Sync error:', err);
      }
    }
  };

  // Update item properties (e.g. from Lista de Nomes, image, rarity)
  const handleUpdateItem = async (id: string, patch: Partial<ShoppingItem>) => {
    const isJustSelectingName =
      patch.name &&
      Object.keys(patch).every((k) =>
        ['name', 'nameList', 'imageUrl', 'category'].includes(k)
      );
    if (
      !isJustSelectingName &&
      !requireAdmin('Apenas o Administrador pode modificar detalhes dos itens e marcadores.')
    ) {
      return;
    }
    let updatedItem: ShoppingItem | null = null;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          updatedItem = { ...i, ...patch, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return i;
      })
    );
    if (patch.name) {
      showToast(`Nome alterado para "${patch.name}"`);
    }
    if (updatedItem) {
      try {
        await itemsService.saveItem(updatedItem);
      } catch (err) {
        console.warn('Sync error:', err);
      }
    }
  };

  // Swap positions of two items / markers in the list
  const handleSwapItems = async (idA: string, idB: string) => {
    if (!idA || !idB || idA === idB) return;
    if (!requireAdmin('Apenas o Administrador pode trocar o lugar de um marcador na lista.')) return;
    playHapticSound('toggle');

    const indexA = items.findIndex((i) => i.id === idA);
    const indexB = items.findIndex((i) => i.id === idB);
    if (indexA === -1 || indexB === -1) return;

    const itemA = items[indexA];
    const itemB = items[indexB];

    const updated = [...items];
    updated[indexA] = { ...itemB, order: indexA, updatedAt: new Date().toISOString() };
    updated[indexB] = { ...itemA, order: indexB, updatedAt: new Date().toISOString() };

    // Normalize order index across all items
    const normalized = updated.map((it, idx) => ({ ...it, order: idx }));

    setItems(normalized);
    showToast(`Marcadores trocados: "${itemA.name}" ⇄ "${itemB.name}"`);

    try {
      await Promise.all([
        itemsService.saveItem(normalized[indexA]),
        itemsService.saveItem(normalized[indexB]),
      ]);
    } catch (err) {
      console.warn('Sync swap error:', err);
    }
  };

  // Move marker one position up or down
  const handleMoveItem = async (id: string, direction: 'up' | 'down') => {
    if (!requireAdmin('Apenas o Administrador pode reorganizar marcadores na lista.')) return;
    const currentIndex = items.findIndex((i) => i.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    await handleSwapItems(items[currentIndex].id, items[targetIndex].id);
  };

  // Clear collected items from active list
  const handleClearCollected = async () => {
    if (!requireAdmin('Apenas o Administrador pode limpar itens coletados.')) return;
    const collectedCount = cartItems.length;
    if (collectedCount === 0) return;
    playHapticSound('delete');
    const collectedIds = cartItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => i.status !== 'no_carrinho'));
    showToast(`${collectedCount} itens coletados removidos da lista`);
    try {
      await itemsService.deleteMultipleItems(collectedIds);
    } catch (err) {
      console.error('Erro ao remover itens coletados no Firestore:', err);
    }
  };

  // Finalize shopping run: archive in history
  const handleFinishShopping = async () => {
    if (!requireAdmin('Apenas o Administrador pode finalizar compras e arquivar no histórico.')) return;
    if (cartItems.length === 0) return;

    const newHistoryEntry: ShoppingHistoryEntry = {
      id: `hist-${Date.now()}`,
      date: new Date().toISOString(),
      title: `Compras em ${new Date().toLocaleDateString('pt-BR')}`,
      itemsCount: cartItems.length,
      totalUnits: cartItems.reduce((acc, i) => acc + i.quantity, 0),
      totalValue: cartItems.reduce((acc, i) => acc + (i.unitPrice || 0) * i.quantity, 0),
      items: cartItems,
    };

    setHistory((prev) => [newHistoryEntry, ...prev]);
    const collectedIds = cartItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => i.status !== 'no_carrinho'));
    showToast('Compra finalizada e arquivada no Histórico!');
    setCurrentTab('historico');

    try {
      await historyService.addEntry(newHistoryEntry);
      await itemsService.deleteMultipleItems(collectedIds);
    } catch (err) {
      console.warn('Sync error finalizing shopping:', err);
    }
  };

  // Restore items from history back into current list
  const handleRestoreItems = async (historyItems: ShoppingItem[]) => {
    if (!requireAdmin('Apenas o Administrador pode restaurar itens do histórico para a lista.')) return;
    playHapticSound('toggle');
    const newItems = historyItems.map((hi) => ({
      ...hi,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pendente' as const,
      selected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setItems((prev) => [...newItems, ...prev]);
    showToast(`${newItems.length} itens adicionados de volta à lista ativa`);
    setCurrentTab('lista');

    try {
      await itemsService.syncAllItems(newItems, false);
    } catch (err) {
      console.warn('Sync error restoring items:', err);
    }
  };

  const handleDeleteHistoryEntry = async (id: string) => {
    if (!requireAdmin('Apenas o Administrador pode excluir registros do histórico.')) return;
    setHistory((prev) => prev.filter((h) => h.id !== id));
    showToast('Registro de histórico excluído');

    try {
      await historyService.deleteEntry(id);
    } catch (err) {
      console.warn('Sync error deleting history:', err);
    }
  };

  // Import a copy of list items (from JSON backup, history, or text)
  const handleImportItems = async (newItems: ShoppingItem[], replace: boolean) => {
    if (!requireAdmin('Apenas o Administrador pode importar ou substituir dados da lista.')) return;
    playHapticSound('toggle');
    if (replace) {
      setItems(newItems);
      showToast(`${newItems.length} itens importados (lista substituída)!`);
      await itemsService.syncAllItems(newItems, true);
    } else {
      setItems((prev) => [...newItems, ...prev]);
      showToast(`${newItems.length} itens adicionados à lista atual!`);
      await itemsService.syncAllItems(newItems, false);
    }
    setCurrentTab('lista');
  };

  // Save a snapshot copy of current list to history
  const handleSaveCopyToHistory = async () => {
    if (!requireAdmin('Apenas o Administrador pode salvar cópias da lista no histórico.')) return;
    if (items.length === 0) {
      showToast('A lista está vazia para salvar uma cópia.');
      return;
    }
    playHapticSound('toggle');
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newEntry: ShoppingHistoryEntry = {
      id: `hist-${Date.now()}`,
      date: now.toISOString(),
      title: `Cópia: ${settings.listName} (${dateFormatted})`,
      itemsCount: items.length,
      totalUnits: items.reduce((acc, i) => acc + i.quantity, 0),
      totalValue: items.reduce((acc, i) => acc + (i.unitPrice || 0) * i.quantity, 0),
      items: JSON.parse(JSON.stringify(items)),
    };

    setHistory((prev) => [newEntry, ...prev]);
    showToast(`Cópia da lista guardada no Histórico! (${items.length} itens)`);

    try {
      await historyService.addEntry(newEntry);
    } catch (err) {
      console.warn('Sync error saving copy:', err);
    }
  };

  // Reset to initial demo data from screenshot
  const handleResetDemoData = async () => {
    if (!requireAdmin('Apenas o Administrador pode restaurar configurações ou dados de demonstração.')) return;
    playHapticSound('toggle');
    setItems(INITIAL_ITEMS);
    setSettings(INITIAL_SETTINGS);
    setHistory(INITIAL_HISTORY);
    showToast('Dados restaurados com base no ecrã de demonstração');
    activityLogService.log({
      type: 'item_restore',
      title: 'Restauração de Dados de Demonstração',
      description: 'Itens da lista, configurações e histórico restaurados para os padrões.',
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });
    setCurrentTab('lista');

    try {
      await itemsService.syncAllItems(INITIAL_ITEMS, true);
      await settingsService.saveSettings(INITIAL_SETTINGS);
    } catch (err) {
      console.warn('Sync error resetting data:', err);
    }
  };

  const handleClearAllItems = async () => {
    if (!requireAdmin('Apenas o Administrador pode apagar todos os itens da lista.')) return;
    playHapticSound('delete');
    setItems([]);
    showToast('Todos os itens foram removidos');
    activityLogService.log({
      type: 'item_clear',
      title: 'Todos os Itens Foram Removidos',
      description: 'A lista inteira de itens da despensa foi limpa pelo Administrador.',
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });

    try {
      await itemsService.clearAllItems();
    } catch (err) {
      console.warn('Sync error clearing items:', err);
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    if (!requireAdmin('Apenas o Administrador pode modificar as configurações.')) return;
    setSettings(newSettings);
    showToast('Configurações atualizadas com sucesso!');
    activityLogService.log({
      type: 'settings_update',
      title: 'Configurações Atualizadas',
      description: `Despensa: "${newSettings.householdName}" | Lista: "${newSettings.listName}" | Moeda: ${newSettings.currencySymbol}`,
      userName: adminUser?.email || 'Admin',
      userRole: 'admin',
    });

    try {
      await settingsService.saveSettings(newSettings);
    } catch (err) {
      console.warn('Sync error updating settings:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      localStorage.removeItem('shopping_user_name');
      setLocalNick(null);
      showToast('Você saiu da sua conta');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] dark:bg-[#0b0f19] text-[#131b2e] dark:text-[#f1f5f9] flex flex-col antialiased transition-colors duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#131b2e] dark:bg-white text-white dark:text-[#0b0f19] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            pendingCount={pendingItems.length}
            openBossesCount={openBossesCount}
            cartCount={cartItems.length}
            totalUnits={totalUnits}
            user={effectiveUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            isAdmin={isAdmin}
            adminUser={adminUser}
            onOpenAdminLogin={() => {
              setAdminActionReason(undefined);
              setIsAdminModalOpen(true);
            }}
            onAdminLogout={handleAdminLogout}
          />
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-64 bg-white dark:bg-[#131826] h-full flex flex-col border-r border-[#e2e8f0] dark:border-[#222b3e]">
              <div className="p-4 flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#222b3e]">
                <span className="font-bold text-base text-[#131b2e] dark:text-[#f1f5f9] font-display">Navegação</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] dark:hover:bg-[#1c2438] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar
                currentTab={currentTab}
                onSelectTab={(tab) => {
                  setCurrentTab(tab);
                  setMobileMenuOpen(false);
                }}
                pendingCount={pendingItems.length}
                openBossesCount={openBossesCount}
                cartCount={cartItems.length}
                totalUnits={totalUnits}
                user={effectiveUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onSignOut={handleSignOut}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                isAdmin={isAdmin}
                adminUser={adminUser}
                onOpenAdminLogin={() => {
                  setAdminActionReason(undefined);
                  setIsAdminModalOpen(true);
                }}
                onAdminLogout={handleAdminLogout}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-10">
          {/* Top Bar matching screenshot */}
          <TopHeader
            searchQuery={globalSearch}
            onSearchChange={setGlobalSearch}
            onOpenNewItem={() => {
              if (!requireAdmin('Apenas o Administrador pode adicionar novos itens.')) return;
              setItemToEdit(null);
              setIsItemModalOpen(true);
            }}
            onOpenProfile={() => setIsProfileOpen(true)}
            onToggleMobileMenu={() => setMobileMenuOpen(true)}
            user={effectiveUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            isAdmin={isAdmin}
            adminUser={adminUser}
            onOpenAdminLogin={() => {
              setAdminActionReason(undefined);
              setIsAdminModalOpen(true);
            }}
            onAdminLogout={handleAdminLogout}
          />

          {/* Subheader / Main Content Viewport */}
          <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
            {/* VIEW 1: MINHA LISTA DE COMPRAS (EXACT REFERENCE SCREEN) */}
            {currentTab === 'lista' && (
              <div className="space-y-5">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-semibold text-[#64748b]">
                  <span className="hover:text-[#2a14b4] cursor-pointer">
                    {settings.householdName}
                  </span>
                  <span>&gt;</span>
                  <span className="text-[#131b2e] font-bold">
                    {settings.listName}
                  </span>
                </div>

                {/* Title + Stats Badge + Last Updated */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1
                      className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#131b2e] tracking-tight font-display hover:text-[#2a14b4] transition-colors cursor-pointer select-text"
                      title={isAdmin ? "Clique duas vezes para renomear" : "Apenas Administrador pode renomear a lista"}
                      onDoubleClick={() => {
                        if (!requireAdmin('Apenas o Administrador pode renomear o título da lista.')) return;
                        const newName = prompt('Renomear lista de itens:', settings.listName);
                        if (newName && newName.trim()) {
                          setSettings((prev) => ({ ...prev, listName: newName.trim() }));
                          showToast('Título da lista atualizado!');
                        }
                      }}
                    >
                      {settings.listName}
                    </h1>

                    {/* Stats pill matching screenshot */}
                    <div className="inline-flex items-center gap-2 bg-[#eaedff] text-[#2a14b4] px-3 py-1 rounded-full text-xs font-bold border border-[#d2d9f4]">
                      <span className="w-2 h-2 rounded-full bg-[#2a14b4]"></span>
                      <span className="tabular-nums">
                        {totalUnits} unidades • {totalProducts} produtos
                      </span>
                    </div>
                  </div>

                  {/* Updated time info */}
                  <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lastUpdatedText}</span>
                  </div>
                </div>

                {/* Quick Add Bar matching screenshot */}
                <QuickAddBar
                  categories={settings.categories}
                  onAddQuickItem={handleQuickAdd}
                  isAdmin={isAdmin}
                  onRequireAdmin={requireAdmin}
                />

                {/* Filter and Category bar */}
                <FilterBar
                  filterSearch={filterSearch}
                  onFilterSearchChange={setFilterSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  selectedCategory={selectedCategory}
                  onSelectedCategoryChange={setSelectedCategory}
                  categories={settings.categories}
                  counts={{
                    total: items.length,
                    pending: pendingItems.length,
                    cart: cartItems.length,
                  }}
                />

                {/* Bulk Actions Toolbar */}
                <BulkActionToolbar
                  allSelected={allVisibleSelected}
                  someSelected={someVisibleSelected}
                  selectedCount={visibleSelectedCount}
                  collectedCount={cartItems.length}
                  totalVisibleCount={filteredItems.length}
                  onToggleSelectAll={handleToggleSelectAll}
                  onMarkSelectedAsCollected={handleMarkSelectedAsCollected}
                  onDeleteSelected={handleDeleteSelected}
                  onAddNewItem={() => {
                    if (requireAdmin('Apenas o Administrador pode adicionar novos itens.')) {
                      setItemToEdit(null);
                      setIsItemModalOpen(true);
                    }
                  }}
                  isAdmin={isAdmin}
                  onRequireAdmin={requireAdmin}
                />

                {/* List Items Cards */}
                {filteredItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#faf8ff] text-[#2a14b4] flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base text-[#131b2e] mb-1">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-xs text-[#64748b] mb-4">
                      {filterSearch || globalSearch
                        ? 'Tente ajustar os filtros de busca para encontrar o item desejado.'
                        : 'Sua lista está vazia. Adicione produtos acima ou restaure os dados de exemplo.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireAdmin('Apenas o Administrador pode adicionar novos itens.')) return;
                        setItemToEdit(null);
                        setIsItemModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#2a14b4] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#200e94] transition-colors"
                    >
                      + Novo Item com Imagem
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredItems.map((item, index) => (
                      <ShoppingItemCard
                        key={item.id}
                        item={item}
                        itemIndex={index}
                        totalItems={filteredItems.length}
                        allItems={items}
                        currencySymbol={settings.currencySymbol}
                        onToggleStatus={handleToggleStatus}
                        onUpdateQuantity={handleUpdateQuantity}
                        onDeleteItem={handleDeleteItem}
                        onOpenNotes={(it) => setNotesItem(it)}
                        onOpenEdit={(it) => {
                          if (!requireAdmin('Apenas o Administrador pode editar itens da lista.')) return;
                          setItemToEdit(it);
                          setIsItemModalOpen(true);
                        }}
                        onToggleSelect={handleToggleSelect}
                        onUpdateItem={handleUpdateItem}
                        onSwapItems={handleSwapItems}
                        onMoveItem={handleMoveItem}
                        isAdmin={isAdmin}
                        onRequireAdmin={requireAdmin}
                        isDragging={draggedItemId === item.id}
                        onDragStartCard={(id, e) => {
                          if (!isAdmin) {
                            e.preventDefault();
                            requireAdmin('Apenas o Administrador pode reorganizar marcadores.');
                            return;
                          }
                          setDraggedItemId(id);
                          e.dataTransfer.setData('text/plain', id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDropCard={(targetId) => {
                          if (!isAdmin) {
                            requireAdmin('Apenas o Administrador pode reorganizar marcadores.');
                            return;
                          }
                          if (draggedItemId && draggedItemId !== targetId) {
                            handleSwapItems(draggedItemId, targetId);
                          }
                          setDraggedItemId(null);
                        }}
                        onDragEndCard={() => setDraggedItemId(null)}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Synchronization Info Box */}
                <SyncFooter
                  onNavigateHistory={() => setCurrentTab('historico')}
                  onClearCollected={handleClearCollected}
                  onOpenImport={() => setIsImportModalOpen(true)}
                  onSaveCopyToHistory={handleSaveCopyToHistory}
                  collectedCount={cartItems.length}
                />
              </div>
            )}

            {/* VIEW 2: HISTÓRICO */}
            {currentTab === 'historico' && (
              <HistoryView
                history={history}
                currencySymbol={settings.currencySymbol}
                onRestoreItems={handleRestoreItems}
                onDeleteHistoryEntry={handleDeleteHistoryEntry}
                onNavigateToList={() => setCurrentTab('lista')}
                isAdmin={isAdmin}
                onRequireAdmin={requireAdmin}
              />
            )}

            {/* VIEW 3: CHECK-IN DE BOSS */}
            {currentTab === 'checkin' && (
              <BossCheckinView
                bossEvents={bossEvents}
                checkins={checkins}
                isAdmin={isAdmin}
                onRequireAdmin={requireAdmin}
                onNavigateToRank={() => setCurrentTab('rank')}
                onShowToast={showToast}
              />
            )}

            {/* VIEW 4: RANK DE PONTOS */}
            {currentTab === 'rank' && (
              <RankPontosView
                checkins={checkins}
                bossEvents={bossEvents}
                isAdmin={isAdmin}
                onRequireAdmin={requireAdmin}
                onNavigateToCheckin={() => setCurrentTab('checkin')}
                onShowToast={showToast}
              />
            )}

            {/* VIEW 5: STATUS (Dano, Defesa, Acerto, Power) */}
            {currentTab === 'status' && (
              <StatusView
                statuses={memberStatuses}
                isAdmin={isAdmin}
                onOpenAdminLogin={() => {
                  setAdminActionReason('A visualização de todos os status da guilda é reservada aos administradores.');
                  setIsAdminModalOpen(true);
                }}
                onRequireAdmin={requireAdmin}
                onShowToast={showToast}
                currentUserName={effectiveUser?.displayName || localNick}
              />
            )}

            {/* VIEW 6: CONFIGURAÇÕES */}
            {currentTab === 'configuracoes' && (
              <SettingsView
                settings={settings}
                items={items}
                onUpdateSettings={handleUpdateSettings}
                onResetDemoData={handleResetDemoData}
                onClearAllItems={handleClearAllItems}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                isAdmin={isAdmin}
                adminUser={adminUser}
                onOpenAdminLogin={() => {
                  setAdminActionReason(undefined);
                  setIsAdminModalOpen(true);
                }}
                onAdminLogout={handleAdminLogout}
                onRequireAdmin={requireAdmin}
              />
            )}
          </main>
        </div>
      </div>

      {/* Item Modal (Create or Edit with Image association) */}
      <ItemModal
        isOpen={isItemModalOpen}
        item={itemToEdit}
        categories={settings.categories}
        currencySymbol={settings.currencySymbol}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItemModal}
      />

      {/* Notes / Details Modal */}
      <NotesModal
        isOpen={!!notesItem}
        item={notesItem}
        onClose={() => setNotesItem(null)}
        onSaveNotes={handleSaveNotes}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        settings={settings}
        totalProducts={totalProducts}
      />

      {/* Import List Modal */}
      <ImportListModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        history={history}
        onImportItems={handleImportItems}
      />

      {/* Login & Password Auth Modal (Standard Device Nickname & Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          try {
            setLocalNick(localStorage.getItem('shopping_user_name'));
          } catch {}
        }}
      />

      {/* Admin Login Modal (Email & Password for Admin Access Control) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminActionReason(undefined);
        }}
        actionReason={adminActionReason}
        onSuccess={(msg) => {
          showToast(msg);
          setIsAdminModalOpen(false);
          setAdminActionReason(undefined);
        }}
      />

      {/* Share / Open on Mobile Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentNickname={localNick || 'Dispositivo'}
        onUpdateNickname={(newNick) => {
          setLocalNick(newNick);
          try {
            localStorage.setItem('shopping_user_name', newNick);
          } catch {}
          showToast(`Nome do dispositivo atualizado para "${newNick}"`);
        }}
        onOpenAuthModal={() => {
          setIsShareModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />
    </div>
  );
}
