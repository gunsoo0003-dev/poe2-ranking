import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  baseTradeQueries,
  rareTradeQueries,
  type TradeLocale,
} from '../../data/tradeQueries';
import type {
  BaseCategoryRanking,
  BaseRankingItem,
  MarketData,
  MarketPeriodData,
  RankingRange,
  RareModCategory,
  RareModItem,
  UniquePriceBandKey,
  UniqueRankingItem,
  UniqueRankingRange,
} from '../../types/market';
import {
  getRawPoe2MarketDataDir,
  type RawMarketItem,
} from './collect-poe2-market';

type BaseGroupSummary = {
  baseName: string;
  category: string;
  items: RawMarketItem[];
  sampleItems: RawMarketItem[];
  representativeItem: RawMarketItem;
  representativeScore: number;
};

type UniquePriceBand = {
  key: UniquePriceBandKey;
  label: string;
  min: number;
  currency: string;
};

type UniqueHistoryItem = {
  bandKey: UniqueRankingRange;
  itemName: string;
  listingId: string;
  priceLabel: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceScore: number | null;
  indexed: string;
};

type UniqueHistorySnapshot = {
  date: string;
  locale: TradeLocale;
  bands: Record<UniqueRankingRange, UniqueHistoryItem[]>;
};

type RawCollectionFile = {
  target: 'unique' | 'base' | 'rare';
  group?: number;
  locale?: TradeLocale;
  generatedAt: string;
  itemCount: number;
  failedCount?: number;
  items: RawMarketItem[];
};

const uniquePriceBands: UniquePriceBand[] = [
  {
    key: 'divine1',
    label: '1 divine 이상',
    min: 1,
    currency: 'divine',
  },
  {
    key: 'divine10',
    label: '10 divine 이상',
    min: 10,
    currency: 'divine',
  },
  {
    key: 'divine30',
    label: '30 divine 이상',
    min: 30,
    currency: 'divine',
  },
  {
    key: 'divine50',
    label: '50 divine 이상',
    min: 50,
    currency: 'divine',
  },
];

const uniqueRankingRanges: UniqueRankingRange[] = [
  'divine1',
  'divine10',
  'divine30',
  'divine50',
];

const rankingRanges: RankingRange[] = [30, 50, 100];

const periods = ['daily', 'sevenDays', 'fifteenDays', 'thirtyDays'] as const;

const BASE_SAMPLE_SIZE = 5;
const BASE_DETAIL_SAMPLE_SIZE = 15;
const UNIQUE_FALSE_LISTING_MIRROR_LIMIT = 100;
const UNIQUE_FALSE_LISTING_AMOUNT_LIMIT = 999999;

function getKoreaDateString(offsetDays = 0) {
  const now = new Date();
  const koreaTime = new Date(
    now.getTime() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000,
  );

  return koreaTime.toISOString().slice(0, 10);
}

function getUniqueHistoryPath(locale: TradeLocale, date: string) {
  return path.join(
    process.cwd(),
    'data',
    'generated',
    'history',
    locale,
    `unique-${date}.json`,
  );
}

function getOutputPath(locale: TradeLocale) {
  return path.join(
    process.cwd(),
    'data',
    'generated',
    `poe2-market-${locale}.json`,
  );
}

async function writeJsonFile(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch {
    return null;
  }
}

async function readRawMarketItems(locale: TradeLocale) {
  const rawItems: RawMarketItem[] = [];
  const rawFiles: RawCollectionFile[] = [];
  const rawDataDir = getRawPoe2MarketDataDir(locale);

  let fileNames: string[] = [];

  try {
    fileNames = await readdir(rawDataDir);
  } catch {
    throw new Error(`raw 데이터 폴더를 찾을 수 없습니다: ${rawDataDir}`);
  }

  const jsonFileNames = fileNames
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => fileName !== 'failed-queries.json')
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of jsonFileNames) {
    const filePath = path.join(rawDataDir, fileName);
    const fileData = await readJsonFile<RawCollectionFile>(filePath);

    if (!fileData) {
      console.log(`[RAW SKIP] ${fileName}: invalid`);
      continue;
    }

    rawFiles.push(fileData);

    if (!fileData.items?.length) {
      console.log(`[RAW SKIP] ${fileName}: empty`);
      continue;
    }

    rawItems.push(...fileData.items);
    console.log(`[RAW READ] ${fileName}: ${fileData.items.length}`);
  }

  validateRawFiles(rawFiles, rawItems);

  return rawItems;
}

function validateRawFiles(
  rawFiles: RawCollectionFile[],
  rawItems: RawMarketItem[],
) {
  const hasUniqueFile = rawFiles.some((file) => file.target === 'unique');
  const hasBaseFile = rawFiles.some((file) => file.target === 'base');
  const hasRareFile = rawFiles.some((file) => file.target === 'rare');

  const hasUniqueItems = rawItems.some((item) => item.kind === 'unique');
  const hasBaseItems = rawItems.some((item) => item.kind === 'base');
  const hasRareItems = rawItems.some((item) => item.kind === 'rare');

  if (rawItems.length === 0) {
    throw new Error('raw item이 0개입니다. 최종 JSON 생성을 중단합니다.');
  }

  if (!hasBaseFile || !hasBaseItems) {
    throw new Error('base raw 데이터가 없습니다. 최종 JSON 생성을 중단합니다.');
  }

  if (!hasUniqueFile || !hasUniqueItems) {
    throw new Error('unique raw 데이터가 없습니다. 최종 JSON 생성을 중단합니다.');
  }

  if (!hasRareFile || !hasRareItems) {
    console.warn('[WARN] rare raw 데이터가 없습니다. rare 없이 build를 진행합니다.');
  }
}

function toBaseRankingItem(
  rawItem: RawMarketItem,
  rank: number,
  category: string,
): BaseRankingItem {
  return {
    rank,
    name: rawItem.baseName,
    category,
    listedPrice: rawItem.priceLabel,
    priceScore: rawItem.priceScore ?? undefined,
  };
}

function isLikelyFalseUniqueListing(item: RawMarketItem) {
  const amount = item.priceAmount;
  const currency = item.priceCurrency?.toLowerCase() ?? '';

  if (amount === null) {
    return false;
  }

  if (amount >= UNIQUE_FALSE_LISTING_AMOUNT_LIMIT) {
    return true;
  }

  if (currency === 'mirror' && amount >= UNIQUE_FALSE_LISTING_MIRROR_LIMIT) {
    return true;
  }

  return false;
}

function getUniqueBandLabel(range: UniqueRankingRange) {
  return (
    uniquePriceBands.find((band) => band.key === range)?.label ??
    '가격구간 미확인'
  );
}

function toUniqueHistoryItem(item: RawMarketItem): UniqueHistoryItem | null {
  if (!item.listingId || isLikelyFalseUniqueListing(item)) {
    return null;
  }

  return {
    bandKey: item.category as UniqueRankingRange,
    itemName: item.itemName || item.baseName,
    listingId: item.listingId,
    priceLabel: item.priceLabel,
    priceAmount: item.priceAmount,
    priceCurrency: item.priceCurrency,
    priceScore: item.priceScore,
    indexed: item.indexed,
  };
}

function buildUniqueHistorySnapshot(
  date: string,
  locale: TradeLocale,
  rawItems: RawMarketItem[],
): UniqueHistorySnapshot {
  const bands = uniqueRankingRanges.reduce(
    (acc, range) => {
      acc[range] = [];
      return acc;
    },
    {} as Record<UniqueRankingRange, UniqueHistoryItem[]>,
  );

  rawItems
    .filter((item) => item.kind === 'unique')
    .forEach((item) => {
      const historyItem = toUniqueHistoryItem(item);

      if (!historyItem) {
        return;
      }

      if (!bands[historyItem.bandKey]) {
        return;
      }

      bands[historyItem.bandKey].push(historyItem);
    });

  return {
    date,
    locale,
    bands,
  };
}

function groupUniqueItemsByName(items: UniqueHistoryItem[]) {
  const groupMap = new Map<string, UniqueHistoryItem[]>();

  items.forEach((item) => {
    const currentItems = groupMap.get(item.itemName) ?? [];
    currentItems.push(item);
    groupMap.set(item.itemName, currentItems);
  });

  return groupMap;
}

function buildUniqueRankings(
  currentSnapshot: UniqueHistorySnapshot,
  previousSnapshot: UniqueHistorySnapshot | null,
): Record<UniqueRankingRange, UniqueRankingItem[]> {
  return uniqueRankingRanges.reduce(
    (acc, range) => {
      const currentItems = currentSnapshot.bands[range] ?? [];
      const previousItems = previousSnapshot?.bands[range] ?? [];

      const currentGroups = groupUniqueItemsByName(currentItems);
      const previousGroups = groupUniqueItemsByName(previousItems);

      const uniqueNames = new Set<string>([
        ...currentGroups.keys(),
        ...previousGroups.keys(),
      ]);

      const rankingItems: UniqueRankingItem[] = [...uniqueNames]
        .map((name) => {
          const currentGroup = currentGroups.get(name) ?? [];
          const previousGroup = previousGroups.get(name) ?? [];

          const currentIds = new Set(
            currentGroup.map((item) => item.listingId),
          );
          const previousIds = new Set(
            previousGroup.map((item) => item.listingId),
          );

          const removedCount = [...previousIds].filter(
            (id) => !currentIds.has(id),
          ).length;
          const newCount = [...currentIds].filter(
            (id) => !previousIds.has(id),
          ).length;
          const keptCount = [...currentIds].filter((id) =>
            previousIds.has(id),
          ).length;

          return {
            rank: 0,
            name,
            priceLabel: getUniqueBandLabel(range),
            previousCount: previousIds.size,
            currentCount: currentIds.size,
            removedCount,
            newCount,
            keptCount,
            netChange: currentIds.size - previousIds.size,
          };
        })
        .filter((item) => item.removedCount > 0)
        .sort((a, b) => {
          if (b.removedCount !== a.removedCount) {
            return b.removedCount - a.removedCount;
          }

          if (a.netChange !== b.netChange) {
            return a.netChange - b.netChange;
          }

          return b.previousCount - a.previousCount;
        })
        .slice(0, 7)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      acc[range] = rankingItems;
      return acc;
    },
    {} as Record<UniqueRankingRange, UniqueRankingItem[]>,
  );
}

function groupBaseItems(
  category: string,
  rawItems: RawMarketItem[],
): BaseGroupSummary[] {
  const groupMap = new Map<string, RawMarketItem[]>();

  rawItems.forEach((item) => {
    if (item.priceScore === null) {
      return;
    }

    const currentItems = groupMap.get(item.baseName) ?? [];
    currentItems.push(item);
    groupMap.set(item.baseName, currentItems);
  });

  return [...groupMap.entries()]
    .map<BaseGroupSummary | null>(([baseName, items]) => {
      const sortedItems = [...items].sort(
        (a, b) => (a.priceScore ?? 0) - (b.priceScore ?? 0),
      );

      const sampleItems = sortedItems.slice(0, BASE_SAMPLE_SIZE);
      const representativeItem = sampleItems[0];

      if (!representativeItem || representativeItem.priceScore === null) {
        return null;
      }

      return {
        baseName,
        category,
        items: sortedItems,
        sampleItems,
        representativeItem,
        representativeScore: representativeItem.priceScore,
      };
    })
    .filter((group): group is BaseGroupSummary => Boolean(group));
}

function buildFilteredBaseItems(
  category: string,
  groups: BaseGroupSummary[],
): BaseRankingItem[] {
  return [...groups]
    .sort((a, b) => b.representativeScore - a.representativeScore)
    .slice(0, 15)
    .map((group, index) => ({
      rank: index + 1,
      name: group.baseName,
      category,
      listedPrice: group.representativeItem.priceLabel,
      priceScore: group.representativeScore,
      sampleCount: group.sampleItems.length,
    }));
}

function buildTopBaseRawItems(
  category: string,
  groups: BaseGroupSummary[],
): BaseRankingItem[] {
  const sortedGroups = [...groups].sort(
    (a, b) => b.representativeScore - a.representativeScore,
  );

  const topGroup = sortedGroups[0];

  if (!topGroup) {
    return [];
  }

  return topGroup.items.slice(0, BASE_DETAIL_SAMPLE_SIZE).map((item, index) =>
    toBaseRankingItem(item, index + 1, category),
  );
}

function buildBaseSampleItems(
  category: string,
  groups: BaseGroupSummary[],
): Record<string, BaseRankingItem[]> {
  return groups.reduce<Record<string, BaseRankingItem[]>>((acc, group) => {
    acc[group.baseName] = group.items
      .slice(0, BASE_DETAIL_SAMPLE_SIZE)
      .map((item, index) => toBaseRankingItem(item, index + 1, category));

    return acc;
  }, {});
}

function buildBaseCategoryRanking(
  category: string,
  rawItems: RawMarketItem[],
): BaseCategoryRanking {
  const groups = groupBaseItems(category, rawItems);
  const filteredItems = buildFilteredBaseItems(category, groups);
  const rawItemsForTopBase = buildTopBaseRawItems(category, groups);
  const baseSampleItems = buildBaseSampleItems(category, groups);

  return {
    category,
    previewItem: filteredItems[0],
    filteredItems,
    rawItems: rawItemsForTopBase,
    baseSampleItems,
  };
}

function buildHighValueBases(
  baseCategories: BaseCategoryRanking[],
): BaseRankingItem[] {
  return baseCategories
    .flatMap((category) => category.filteredItems)
    .sort((a, b) => (b.priceScore ?? 0) - (a.priceScore ?? 0))
    .slice(0, 7)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

function buildRareModItems(rawItems: RawMarketItem[], range: RankingRange) {
  const slicedItems = rawItems.slice(0, range);
  const countMap = new Map<string, number>();

  slicedItems.forEach((item) => {
    item.mods.forEach((mod) => {
      countMap.set(mod, (countMap.get(mod) ?? 0) + 1);
    });
  });

  return [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map<RareModItem>(([modName, count], index) => ({
      rank: index + 1,
      modName,
      count,
    }));
}

function buildRareModCategory(
  category: string,
  rawItems: RawMarketItem[],
): RareModCategory {
  return {
    category,
    ranges: rankingRanges.map((range) => ({
      range,
      mods: buildRareModItems(rawItems, range),
    })),
  };
}

function buildMarketPeriodData({
  rawItems,
  currentUniqueSnapshot,
  previousUniqueSnapshot,
}: {
  rawItems: RawMarketItem[];
  currentUniqueSnapshot: UniqueHistorySnapshot;
  previousUniqueSnapshot: UniqueHistorySnapshot | null;
}): MarketPeriodData {
  const baseCategories = baseTradeQueries.map((query) => {
    const category = query.category ?? query.label;
    const items = rawItems.filter(
      (item) => item.kind === 'base' && item.queryId === query.id,
    );

    return buildBaseCategoryRanking(category, items);
  });

  const rareModTrends = rareTradeQueries.map((query) => {
    const category = query.category ?? query.label;
    const items = rawItems.filter(
      (item) => item.kind === 'rare' && item.queryId === query.id,
    );

    return buildRareModCategory(category, items);
  });

  return {
    uniqueRankings: buildUniqueRankings(
      currentUniqueSnapshot,
      previousUniqueSnapshot,
    ),
    highValueBases: buildHighValueBases(baseCategories),
    baseCategories,
    rareModTrends,
  };
}

function buildMarketData({
  rawItems,
  currentUniqueSnapshot,
  previousUniqueSnapshot,
}: {
  rawItems: RawMarketItem[];
  currentUniqueSnapshot: UniqueHistorySnapshot;
  previousUniqueSnapshot: UniqueHistorySnapshot | null;
}): MarketData {
  const periodData = buildMarketPeriodData({
    rawItems,
    currentUniqueSnapshot,
    previousUniqueSnapshot,
  });

  return periods.reduce((acc, period) => {
    acc[period] = periodData;
    return acc;
  }, {} as MarketData);
}

export async function buildPoe2Market(locale: TradeLocale = 'ko') {
  const today = getKoreaDateString(0);
  const yesterday = getKoreaDateString(-1);

  const rawDataDir = getRawPoe2MarketDataDir(locale);
  const outputPath = getOutputPath(locale);
  const currentUniqueHistoryPath = getUniqueHistoryPath(locale, today);
  const previousUniqueHistoryPath = getUniqueHistoryPath(locale, yesterday);

  const previousUniqueSnapshot =
    await readJsonFile<UniqueHistorySnapshot>(previousUniqueHistoryPath);

  console.log('========================================');
  console.log('POE2 final market data build start');
  console.log(`locale: ${locale}`);
  console.log(`today: ${today}`);
  console.log(`raw dir: ${rawDataDir}`);
  console.log(`output: ${outputPath}`);
  console.log(`previous unique history: ${previousUniqueHistoryPath}`);
  console.log('========================================');

  const rawItems = await readRawMarketItems(locale);

  const currentUniqueSnapshot = buildUniqueHistorySnapshot(
    today,
    locale,
    rawItems,
  );

  const marketData = buildMarketData({
    rawItems,
    currentUniqueSnapshot,
    previousUniqueSnapshot,
  });

  await writeJsonFile(outputPath, marketData);
  await writeJsonFile(currentUniqueHistoryPath, currentUniqueSnapshot);

  console.log('========================================');
  console.log(`raw items: ${rawItems.length}`);
  console.log(`saved: ${outputPath}`);
  console.log(`unique history saved: ${currentUniqueHistoryPath}`);
  console.log('POE2 final market data build done');
  console.log('========================================');
}