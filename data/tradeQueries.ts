export type TradeQueryKind = 'unique' | 'base' | 'rare';

export type TradeLocale = 'ko' | 'en';

export type TradeQueryConfig = {
  id: string;
  kind: TradeQueryKind;
  label: string;
  category?: string;
  limit: number;
  urlKo: string;
  urlEn: string;
};

export function getTradeQueryUrl(
  config: TradeQueryConfig,
  locale: TradeLocale,
) {
  return locale === 'en' ? config.urlEn : config.urlKo;
}

const tradeCategories = [
  { id: 'bow', label: '활' },
  { id: 'crossbow', label: '석궁' },
  { id: 'spear', label: '창' },
  { id: 'staff', label: '지팡이' },
  { id: 'wand', label: '마법봉' },
  { id: 'sceptre', label: '셉터' },
  { id: 'quarterstaff', label: '육척봉' },
  { id: 'one-hand-mace', label: '한손철퇴' },
  { id: 'two-hand-mace', label: '양손철퇴' },
  { id: 'talisman', label: '부적' },
  { id: 'quiver', label: '화살통' },
  { id: 'shield', label: '방패' },
  { id: 'buckler', label: '버클러' },
  { id: 'focus', label: '집중구' },
  { id: 'ring', label: '반지' },
  { id: 'amulet', label: '목걸이' },
  { id: 'belt', label: '허리띠' },
  { id: 'body-armour', label: '갑옷' },
  { id: 'helmet', label: '투구' },
  { id: 'gloves', label: '장갑' },
  { id: 'boots', label: '장화' },
];

const uniqueTradeUrlMapKo: Record<string, string> = {
  'unique-all':
    'https://poe.game.daum.net/trade2/search/poe2/Standard/OJ0wg7lCE',
};

const uniqueTradeUrlMapEn: Record<string, string> = {
  'unique-all':
    'https://www.pathofexile.com/trade2/search/poe2/Standard/OJ0wg7lCE',
};

const baseTradeUrlMapKo: Record<string, string> = {
  'base-bow':
    'https://poe.game.daum.net/trade2/search/poe2/Standard/9lmDp7YHK',
};

const baseTradeUrlMapEn: Record<string, string> = {
  'base-bow':
    'https://www.pathofexile.com/trade2/search/poe2/Standard/9lmDp7YHK',
};

const rareTradeUrlMapKo: Record<string, string> = {
  'rare-bow':
    'https://poe.game.daum.net/trade2/search/poe2/Standard/OJ0wnpzSE',
};

const rareTradeUrlMapEn: Record<string, string> = {
  'rare-bow':
    'https://www.pathofexile.com/trade2/search/poe2/Standard/OJ0wnpzSE',
};

export const uniqueTradeQueries: TradeQueryConfig[] = [
  {
    id: 'unique-all',
    kind: 'unique',
    label: '유니크 전체',
    limit: 300,
    urlKo: uniqueTradeUrlMapKo['unique-all'] ?? '',
    urlEn: uniqueTradeUrlMapEn['unique-all'] ?? '',
  },
];

export const baseTradeQueries: TradeQueryConfig[] = tradeCategories.map(
  (category) => {
    const id = `base-${category.id}`;

    return {
      id,
      kind: 'base',
      label: category.label,
      category: category.label,
      limit: 20,
      urlKo: baseTradeUrlMapKo[id] ?? '',
      urlEn: baseTradeUrlMapEn[id] ?? '',
    };
  },
);

export const rareTradeQueries: TradeQueryConfig[] = tradeCategories.map(
  (category) => {
    const id = `rare-${category.id}`;

    return {
      id,
      kind: 'rare',
      label: category.label,
      category: category.label,
      limit: 100,
      urlKo: rareTradeUrlMapKo[id] ?? '',
      urlEn: rareTradeUrlMapEn[id] ?? '',
    };
  },
);

export const allTradeQueries: TradeQueryConfig[] = [
  ...uniqueTradeQueries,
  ...baseTradeQueries,
  ...rareTradeQueries,
];