import fragmentoImg from '../assets/images/fragmento_relic_icon_1790391562071.jpg';
import resquicioImg from '../assets/images/resquicio_relic_icon_1790391724781.jpg';
import laminaDouradaImg from '../assets/images/lamina_dourada_icon_1790391871978.jpg';
import grimorioImg from '../assets/images/grimorio_verde_icon_1790391884226.jpg';
import runaCelesteImg from '../assets/images/runa_celeste_icon_1790392045461.jpg';
import ovosImg from '../assets/images/prod_ovos_caipiras_1790378506907.jpg';
import { ShoppingItem, AppSettings, ShoppingHistoryEntry } from '../types/shopping';

export const DEFAULT_CATEGORIES = [
  'Comum',
  'Incomum',
  'Raro',
  'Epic',
  'Lendario',
];

export const PRESET_IMAGES = [
  { name: 'Fragmento', url: fragmentoImg, category: 'Comum' },
  { name: 'Resquício', url: resquicioImg, category: 'Incomum' },
  { name: 'Lâmina Dourada', url: laminaDouradaImg, category: 'Raro' },
  { name: 'Grimório', url: grimorioImg, category: 'Epic' },
  { name: 'Runa Celeste', url: runaCelesteImg, category: 'Epic' },
  { name: 'Ovos', url: ovosImg, category: 'Lendario' },
];

export interface PresetItemName {
  name: string;
  category: string;
  imageUrl?: string;
  aliases?: string[];
}

export const PRESET_ITEM_NAMES: PresetItemName[] = [
  {
    name: 'Fragmento Ancestral',
    category: 'Comum',
    imageUrl: fragmentoImg,
    aliases: ['Fragmento de Relíquia', 'Fragmento Dourado', 'Fragmento Antigo'],
  },
  {
    name: 'Resquício Místico',
    category: 'Incomum',
    imageUrl: resquicioImg,
    aliases: ['Resquício Ancestral', 'Resquício das Sombras', 'Resquício Rúnico'],
  },
  {
    name: 'Lâmina Rúnica Dourada',
    category: 'Raro',
    imageUrl: laminaDouradaImg,
    aliases: ['Lâmina Dourada', 'Lâmina do Destino', 'Adaga Flamejante'],
  },
  {
    name: 'Grimório da Espada',
    category: 'Epic',
    imageUrl: grimorioImg,
    aliases: ['Tomo Antigo de Combate', 'Grimório dos Feitiços', 'Livro do Guerreiro'],
  },
  {
    name: 'Runa Celeste Diamantada',
    category: 'Epic',
    imageUrl: runaCelesteImg,
    aliases: ['Runa Celeste', 'Gema de Diamante Azul', 'Runa de Éter'],
  },
  {
    name: 'Ovos de Grifo Dourados',
    category: 'Lendario',
    imageUrl: ovosImg,
    aliases: ['Ovo de Fênix', 'Ovos Mágicos', 'Ovos Caipiras Selecionados'],
  },
  {
    name: 'Orbe de Sangue',
    category: 'Raro',
    aliases: ['Orbe Escarlate', 'Esfera Vampírica'],
  },
  {
    name: 'Cristal de Éter Puro',
    category: 'Incomum',
    aliases: ['Gema de Cristal', 'Cristal Energético'],
  },
  {
    name: 'Pó de Estrela Cadente',
    category: 'Lendario',
    aliases: ['Poeira Astral', 'Cinzas Celestiais'],
  },
  {
    name: 'Pergaminho Sagrado',
    category: 'Comum',
    aliases: ['Papiro de Invocação', 'Escritura Antiga'],
  },
];

export const INITIAL_ITEMS: ShoppingItem[] = [
  {
    id: 'item-1',
    name: 'Fragmento Ancestral',
    category: 'Comum',
    status: 'pendente',
    quantity: 4,
    unit: 'un',
    unitPrice: 5.49,
    packageInfo: 'Caixa 1L',
    brandOrPreference: 'Marca Preferida',
    notes: 'Priorizar data de validade mais longa',
    imageUrl: fragmentoImg,
    selected: false,
    nameList: ['Fragmento Ancestral', 'Fragmento de Relíquia', 'Fragmento Dourado'],
    order: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(), // ~14 min atrás
  },
  {
    id: 'item-2',
    name: 'Resquício Místico',
    category: 'Incomum',
    status: 'no_carrinho',
    quantity: 2,
    unit: 'un',
    unitPrice: 28.90,
    packageInfo: 'Pacote Tipo 1 • 5kg',
    brandOrPreference: 'Tio João ou Camil',
    notes: 'Grão longo polido tipo 1',
    imageUrl: resquicioImg,
    selected: true,
    nameList: ['Resquício Místico', 'Resquício Ancestral', 'Resquício das Sombras'],
    order: 1,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'item-3',
    name: 'Lâmina Rúnica Dourada',
    category: 'Raro',
    status: 'pendente',
    quantity: 1,
    unit: 'un',
    unitPrice: 150.00,
    packageInfo: 'Armamento Raro',
    brandOrPreference: 'Forja Arcana',
    notes: 'Lâmina afiada com encantamento ígneo',
    imageUrl: laminaDouradaImg,
    selected: false,
    nameList: ['Lâmina Rúnica Dourada', 'Lâmina Dourada', 'Lâmina do Destino'],
    order: 2,
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(),
  },
  {
    id: 'item-4',
    name: 'Grimório da Espada',
    category: 'Epic',
    status: 'pendente',
    quantity: 1,
    unit: 'un',
    unitPrice: 320.00,
    packageInfo: 'Tomo Encantado',
    brandOrPreference: 'Capa Verde em Couro',
    notes: 'Contém ensinamentos arcanos de combate',
    imageUrl: grimorioImg,
    selected: false,
    nameList: ['Grimório da Espada', 'Tomo Antigo de Combate', 'Grimório dos Feitiços'],
    order: 3,
    createdAt: new Date(Date.now() - 4000000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(),
  },
  {
    id: 'item-5',
    name: 'Runa Celeste Diamantada',
    category: 'Epic',
    status: 'no_carrinho',
    quantity: 1,
    unit: 'un',
    unitPrice: 420.00,
    packageInfo: 'Gema Arcana',
    brandOrPreference: 'Engaste Diamantado',
    notes: 'Runa reluzente com brilho azul cerúleo',
    imageUrl: runaCelesteImg,
    selected: true,
    nameList: ['Runa Celeste Diamantada', 'Runa Celeste', 'Gema de Diamante Azul'],
    order: 4,
    createdAt: new Date(Date.now() - 8000000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(),
  },
  {
    id: 'item-6',
    name: 'Ovos Caipiras',
    category: 'Lendario',
    status: 'pendente',
    quantity: 6,
    unit: 'un',
    unitPrice: 14.50,
    packageInfo: 'Estojo com 12 unidades',
    brandOrPreference: 'Vermelhos',
    notes: 'Verificar se nenhum está trincado no estojo',
    imageUrl: ovosImg,
    selected: false,
    nameList: ['Ovos Caipiras', 'Ovos de Grifo Dourados', 'Ovo de Fênix'],
    order: 5,
    createdAt: new Date(Date.now() - 9000000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(),
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  householdName: 'Despensa Central',
  listName: 'Lista De Itens',
  currencySymbol: 'R$',
  autoSync: true,
  soundFeedback: true,
  categories: DEFAULT_CATEGORIES,
};

export const INITIAL_HISTORY: ShoppingHistoryEntry[] = [
  {
    id: 'hist-1',
    date: '2026-09-18T14:30:00Z',
    title: 'Compras de Reposição Semanal',
    itemsCount: 5,
    totalUnits: 14,
    totalValue: 148.60,
    items: [
      {
        id: 'h1-1',
        name: 'Detergente Neutro',
        category: 'Limpeza',
        status: 'no_carrinho',
        quantity: 4,
        unit: 'un',
        unitPrice: 2.89,
        packageInfo: 'Frasco 500ml',
        brandOrPreference: 'Ypê',
        createdAt: '2026-09-18T13:00:00Z',
        updatedAt: '2026-09-18T14:30:00Z',
      },
      {
        id: 'h1-2',
        name: 'Manteiga com Sal',
        category: 'Laticínios',
        status: 'no_carrinho',
        quantity: 2,
        unit: 'un',
        unitPrice: 12.50,
        packageInfo: 'Pote 200g',
        brandOrPreference: 'Primeira Qualidade',
        createdAt: '2026-09-18T13:00:00Z',
        updatedAt: '2026-09-18T14:30:00Z',
      },
      {
        id: 'h1-3',
        name: 'Feijão Carioca',
        category: 'Mercearia',
        status: 'no_carrinho',
        quantity: 2,
        unit: 'un',
        unitPrice: 8.90,
        packageInfo: 'Pacote 1kg',
        brandOrPreference: 'Camil Tipo 1',
        createdAt: '2026-09-18T13:00:00Z',
        updatedAt: '2026-09-18T14:30:00Z',
      },
      {
        id: 'h1-4',
        name: 'Papel Higiênico Folha Dupla',
        category: 'Higiene Pessoal',
        status: 'no_carrinho',
        quantity: 2,
        unit: 'un',
        unitPrice: 24.90,
        packageInfo: 'Fardo 12 rolos',
        brandOrPreference: 'Neve',
        createdAt: '2026-09-18T13:00:00Z',
        updatedAt: '2026-09-18T14:30:00Z',
      },
      {
        id: 'h1-5',
        name: 'Banana Prata',
        category: 'Hortifruti',
        status: 'no_carrinho',
        quantity: 4,
        unit: 'kg',
        unitPrice: 7.90,
        packageInfo: 'Palma madura',
        brandOrPreference: 'Orgânica',
        createdAt: '2026-09-18T13:00:00Z',
        updatedAt: '2026-09-18T14:30:00Z',
      }
    ]
  },
  {
    id: 'hist-2',
    date: '2026-09-10T18:15:00Z',
    title: 'Feira & Hortifruti',
    itemsCount: 4,
    totalUnits: 9,
    totalValue: 64.20,
    items: [
      {
        id: 'h2-1',
        name: 'Tomate Italiano',
        category: 'Hortifruti',
        status: 'no_carrinho',
        quantity: 3,
        unit: 'kg',
        unitPrice: 8.50,
        packageInfo: 'Maduros para molho',
        createdAt: '2026-09-10T17:00:00Z',
        updatedAt: '2026-09-10T18:15:00Z',
      },
      {
        id: 'h2-2',
        name: 'Cenoura Especial',
        category: 'Hortifruti',
        status: 'no_carrinho',
        quantity: 2,
        unit: 'kg',
        unitPrice: 5.90,
        packageInfo: 'Frescas e crocantes',
        createdAt: '2026-09-10T17:00:00Z',
        updatedAt: '2026-09-10T18:15:00Z',
      }
    ]
  }
];
