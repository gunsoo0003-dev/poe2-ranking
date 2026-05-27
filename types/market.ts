export type PeriodKey = 'daily' | 'sevenDays' | 'fifteenDays' | 'thirtyDays';

export type RankingRange = 30 | 50 | 100;

export type UniquePriceBandKey =
  | 'exalted10'
  | 'divine1'
  | 'divine10'
  | 'divine30'
  | 'divine50';

export type UniqueRankingRange = UniquePriceBandKey;

export type PeriodOption = {
  key: PeriodKey;
  label: string;
};

export type UniqueRankingTabOption = {
  label: string;
  value: UniqueRankingRange;
  disabled: boolean;
};

export type UniqueRankingItem = {
  rank: number;
  name: string;
  priceLabel: string;
  previousCount: number;
  currentCount: number;
  removedCount: number;
  newCount: number;
  keptCount: number;
  netChange: number;
};

export type BaseRankingItem = {
  rank: number;
  name: string;
  category: string;
  listedPrice: string;
  priceScore?: number;
  sampleCount?: number;
};

export type BaseCategoryRanking = {
  category: string;
  previewItem?: BaseRankingItem;
  filteredItems: BaseRankingItem[];
  rawItems: BaseRankingItem[];
};

export type RareModItem = {
  rank: number;
  modName: string;
  count: number;
};

export type RareModRangeData = {
  range: RankingRange;
  mods: RareModItem[];
};

export type RareModCategory = {
  category: string;
  ranges: RareModRangeData[];
};

export type MarketPeriodData = {
  uniqueRankings: Record<UniqueRankingRange, UniqueRankingItem[]>;
  highValueBases: BaseRankingItem[];
  baseCategories: BaseCategoryRanking[];
  rareModTrends: RareModCategory[];
};

export type MarketData = Record<PeriodKey, MarketPeriodData>;