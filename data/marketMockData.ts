import type {
  BaseCategoryRanking,
  BaseRankingItem,
  MarketData,
  MarketPeriodData,
  PeriodOption,
  RankingRange,
  RareModCategory,
  RareModItem,
  UniquePriceBandKey,
  UniqueRankingItem,
  UniqueRankingRange,
  UniqueRankingTabOption,
} from '../types/market';

export const periodOptions: PeriodOption[] = [
  { key: 'daily', label: '오늘' },
  { key: 'sevenDays', label: '7일' },
  { key: 'fifteenDays', label: '15일' },
  { key: 'thirtyDays', label: '30일' },
];

const rankingRanges: RankingRange[] = [30, 50, 100, 200];

const uniqueRankingRanges: UniqueRankingRange[] = [
  'exalted10',
  'divine1',
  'divine10',
  'divine30',
  'divine50',
];

export const uniqueRankingTabOptions: UniqueRankingTabOption[] = [
  { label: '10엑잘+', value: 'exalted10', disabled: false },
  { label: '1디바인+', value: 'divine1', disabled: false },
  { label: '10디바인+', value: 'divine10', disabled: false },
  { label: '30디바인+', value: 'divine30', disabled: false },
  { label: '50디바인+', value: 'divine50', disabled: false },
];

const itemCategories = [
  '활',
  '석궁',
  '창',
  '지팡이',
  '마법봉',
  '셉터',
  '육척봉',
  '한손철퇴',
  '양손철퇴',
  '부적',
  '화살통',
  '방패',
  '버클러',
  '집중구',
  '반지',
  '목걸이',
  '허리띠',
  '갑옷',
  '투구',
  '장갑',
  '장화',
];

const uniqueMockNames = [
  '최정점',
  '폴시르켈른',
  '키토코의 흐름',
  '마훅소틀의 계책',
  '모리오르 인빅투스',
  '샤브론의 가방',
  '앗지리의 멸시',
];

const uniqueMockBaseCounts: Record<
  UniquePriceBandKey,
  {
    priceLabel: string;
    previous: number[];
    current: number[];
    removed: number[];
    added: number[];
    kept: number[];
  }
> = {
  exalted10: {
    priceLabel: '10 exalted 이상',
    previous: [18, 15, 13, 11, 9, 8, 7],
    current: [12, 13, 10, 8, 8, 6, 6],
    removed: [9, 5, 6, 5, 3, 4, 3],
    added: [3, 3, 3, 2, 2, 2, 2],
    kept: [9, 10, 7, 6, 6, 4, 4],
  },
  divine1: {
    priceLabel: '1 divine 이상',
    previous: [16, 14, 12, 10, 8, 7, 6],
    current: [9, 11, 8, 7, 7, 5, 5],
    removed: [10, 6, 7, 5, 3, 4, 3],
    added: [3, 3, 3, 2, 2, 2, 2],
    kept: [6, 8, 5, 5, 5, 3, 3],
  },
  divine10: {
    priceLabel: '10 divine 이상',
    previous: [13, 11, 9, 8, 7, 6, 5],
    current: [7, 8, 6, 5, 5, 4, 4],
    removed: [8, 5, 5, 4, 3, 3, 2],
    added: [2, 2, 2, 1, 1, 1, 1],
    kept: [5, 6, 4, 4, 4, 3, 3],
  },
  divine30: {
    priceLabel: '30 divine 이상',
    previous: [9, 8, 7, 6, 5, 4, 4],
    current: [5, 6, 4, 4, 3, 3, 3],
    removed: [6, 4, 4, 3, 3, 2, 2],
    added: [2, 2, 1, 1, 1, 1, 1],
    kept: [3, 4, 3, 3, 2, 2, 2],
  },
  divine50: {
    priceLabel: '50 divine 이상',
    previous: [7, 6, 5, 4, 4, 3, 3],
    current: [3, 4, 3, 3, 2, 2, 2],
    removed: [5, 3, 3, 2, 2, 2, 2],
    added: [1, 1, 1, 1, 0, 1, 1],
    kept: [2, 3, 2, 2, 2, 1, 1],
  },
};

const highValueBaseTemplates = [
  { name: '고급 이중시위 활', category: '활', price: 18 },
  { name: '전문 공성 석궁', category: '석궁', price: 16 },
  { name: '전문 바알 창', category: '창', price: 14 },
  { name: '고급 전투 지팡이', category: '지팡이', price: 12 },
  { name: '고급 룬 마법봉', category: '마법봉', price: 11 },
  { name: '전문 의식 셉터', category: '셉터', price: 10 },
  { name: '고급 전쟁 육척봉', category: '육척봉', price: 9 },
];

function formatDivine(price: number) {
  const roundedPrice = Number(price.toFixed(1));

  if (Number.isInteger(roundedPrice)) {
    return `${roundedPrice} Divine`;
  }

  return `${roundedPrice.toFixed(1)} Divine`;
}

function buildUniqueRankings(
  periodMultiplier: number,
): Record<UniqueRankingRange, UniqueRankingItem[]> {
  return uniqueRankingRanges.reduce(
    (acc, range) => {
      const baseData = uniqueMockBaseCounts[range];

      acc[range] = uniqueMockNames.map((name, index) => {
        const previousCount = Math.max(
          0,
          Math.round(baseData.previous[index] * periodMultiplier),
        );
        const currentCount = Math.max(
          0,
          Math.round(baseData.current[index] * periodMultiplier),
        );
        const removedCount = Math.max(
          0,
          Math.round(baseData.removed[index] * periodMultiplier),
        );
        const newCount = Math.max(
          0,
          Math.round(baseData.added[index] * periodMultiplier),
        );
        const keptCount = Math.max(
          0,
          Math.round(baseData.kept[index] * periodMultiplier),
        );

        return {
          rank: index + 1,
          name,
          priceLabel: baseData.priceLabel,
          previousCount,
          currentCount,
          removedCount,
          newCount,
          keptCount,
          netChange: currentCount - previousCount,
        };
      });

      return acc;
    },
    {} as Record<UniqueRankingRange, UniqueRankingItem[]>,
  );
}

function buildHighValueBases(periodMultiplier: number): BaseRankingItem[] {
  return highValueBaseTemplates.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    category: item.category,
    listedPrice: formatDivine(item.price * periodMultiplier),
  }));
}

function buildBaseItems(
  category: string,
  periodMultiplier: number,
): BaseRankingItem[] {
  return Array.from({ length: 15 }, (_, index) => {
    const basePrice = Math.max(1.2, 18 - index * 0.75);

    return {
      rank: index + 1,
      name: `${category} 베이스 ${index + 1}`,
      category,
      listedPrice: formatDivine(basePrice * periodMultiplier),
      priceScore: basePrice * periodMultiplier,
      sampleCount: 5,
    };
  });
}

function buildRawBaseItems(
  category: string,
  periodMultiplier: number,
): BaseRankingItem[] {
  return Array.from({ length: 15 }, (_, index) => {
    const rawPrice = Math.max(1.2, 18 - index);

    return {
      rank: index + 1,
      name: `${category} 베이스 ${index + 1}`,
      category,
      listedPrice: formatDivine(rawPrice * periodMultiplier),
      priceScore: rawPrice * periodMultiplier,
    };
  });
}

function buildBaseCategories(periodMultiplier: number): BaseCategoryRanking[] {
  return itemCategories.map((category) => {
    const filteredItems = buildBaseItems(category, periodMultiplier);
    const rawItems = buildRawBaseItems(category, periodMultiplier);

    return {
      category,
      previewItem: filteredItems[0],
      filteredItems,
      rawItems,
    };
  });
}

function buildRareMods(
  periodMultiplier: number,
  range: RankingRange,
  category: string,
): RareModItem[] {
  const modNames = [
    `${category} 피해 증가`,
    `${category} 공격 속도 증가`,
    `${category} 치명타 확률 증가`,
    `${category} 치명타 피해 배율`,
    `${category} 스킬 레벨 증가`,
    `${category} 생명력 최대치`,
    `${category} 모든 원소 저항`,
    `${category} 카오스 저항`,
    `${category} 정확도 증가`,
    `${category} 원소 피해 추가`,
  ];

  const rangeWeight = range / 5;

  return modNames.map((modName, index) => ({
    rank: index + 1,
    modName,
    count: Math.max(
      3,
      Math.round((44 - index * 4 + rangeWeight) * periodMultiplier),
    ),
  }));
}

function buildRareModTrends(periodMultiplier: number): RareModCategory[] {
  return itemCategories.map((category) => ({
    category,
    ranges: rankingRanges.map((range) => ({
      range,
      mods: buildRareMods(periodMultiplier, range, category),
    })),
  }));
}

function makeMarketData(periodMultiplier: number): MarketPeriodData {
  const baseCategories = buildBaseCategories(periodMultiplier);

  return {
    uniqueRankings: buildUniqueRankings(periodMultiplier),
    highValueBases: buildHighValueBases(periodMultiplier),
    baseCategories,
    rareModTrends: buildRareModTrends(periodMultiplier),
  };
}

export const marketData: MarketData = {
  daily: makeMarketData(1),
  sevenDays: makeMarketData(1.18),
  fifteenDays: makeMarketData(1.35),
  thirtyDays: makeMarketData(1.6),
};