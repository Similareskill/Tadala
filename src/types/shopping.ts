export type ItemStatus = 'pendente' | 'no_carrinho';

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  status: ItemStatus;
  quantity: number;
  unit: string; // 'un' | 'kg' | 'g' | 'L' | 'ml' | 'pct' | 'cx'
  unitPrice?: number;
  packageInfo?: string;
  brandOrPreference?: string;
  notes?: string;
  imageUrl?: string;
  selected?: boolean;
  nameList?: string[]; // Lista de nomes / variantes / apelidos associados ao item
  order?: number; // Ordem de exibição e troca de lugar dos marcadores
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
}

export interface ShoppingHistoryEntry {
  id: string;
  date: string;
  title: string;
  itemsCount: number;
  totalUnits: number;
  totalValue: number;
  items: ShoppingItem[];
}

export interface AppSettings {
  householdName: string;
  listName: string;
  currencySymbol: string;
  autoSync: boolean;
  soundFeedback: boolean;
  categories: string[];
}

export interface AdminAccount {
  email: string;
  name?: string;
  role: 'admin';
  createdAt: string;
  lastLogin?: string;
}

export interface BossEvent {
  id: string;
  bossName: string;
  scheduledTime: string; // ISO string for boss spawn / battle time
  checkinStartTime?: string; // Manual start time
  checkinEndTime?: string; // Manual end time for check-in window
  points: number; // Points granted for check-in
  description?: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
  createdBy?: string;
}

export interface BossCheckin {
  id: string;
  bossId: string;
  bossName: string;
  userName: string; // Player nickname / visitor name
  points: number;
  checkedInAt: string; // ISO string
  isAutoCheckin?: boolean; // Automatic confirmation flag (e.g. member Ella)
}

export interface UserRankEntry {
  userName: string;
  totalPoints: number;
  totalCheckins: number;
  checkins: BossCheckin[];
  lastCheckinAt: string;
}
