import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  basePriceBands,
  type BasePriceBand,
} from '../data/basePriceBands';
import {
  allTradeQueries,
  baseTradeQueries,
  rareTradeQueries,
  type TradeQueryConfig,
} from '../data/tradeQueries';
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
} from '../types/market';

type PoeTradeImportResponse = {
  query?: unknown;
  sort?: unknown;
};

type PoeTradeSearchResponse = {
  id?: string;
  result?: string[];
  total?: number;
  error?: unknown;
};

type PoeTradeFetchResponse = {
  result?: PoeTradeFetchedItem[];
  error?: unknown;
};

type PoeTradeFetchedItem = {
  id?: string;
  item?: {
    name?: string;
    typeLine?: string;
    baseType?: string;
    rarity?: string;
    ilvl?: number;
    implicitMods?: string[];
    explicitMods?: string[];
    fracturedMods?: string[];
    craftedMods?: string[];
    pseudoMods?: string[];
  };
  listing?: {
    indexed?: string;
    price?: {
      type?: string;
      amount?: number;
      currency?: string;
    };
    account?: {
      name?: string;
    };
  };
};

type ImportedTradeQuery = {
  origin: string;
  league: string;
  query: unknown;
};

type RawMarketItem = {
  queryId: string;
  kind: TradeQueryConfig['kind'];
  category: string;
  itemName: string;
  baseName: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceLabel: string;
  priceScore: number | null;
  sellerName: string;
  indexed: string;
  listingId: string;
  mods: string[];
};

type BaseGroupSummary = {
  baseName: string;
  category: string;
  items: RawMarketItem[];
  sampleItems: RawMarketItem[];
  representativeItem: RawMarketItem;
  representativeScore: number;
};

type BaseBandSearchSummary = {
  label: string;
  min?: number;
  currency?: string;
  total: number;
  resultCount: number;
  newResultCount: number;
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
  bands: Record<UniqueRankingRange, UniqueHistoryItem[]>;
};

const uniquePriceBands: UniquePriceBand[] = [
  {
    key: 'exalted10',
    label: '10 exalted 이상',
    min: 10,
    currency: 'exalted',
  },
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
  'exalted10',
  'divine1',
  'divine10',
  'divine30',
  'divine50',
];

const rankingRanges: RankingRange[] = [30, 50, 100, 200];

const periods = ['daily', 'sevenDays', 'fifteenDays', 'thirtyDays'] as const;

const BASE_SAMPLE_SIZE = 5;
const BASE_MIN_SAMPLE_COUNT = 3;
const UNIQUE_BAND_SAMPLE_SIZE = 100;
const FETCH_CHUNK_SIZE = 10;
const NORMAL_FETCH_DELAY_MS = 350;
const BASE_FETCH_DELAY_MS = 1200;
const BASE_SEGMENT_DELAY_MS = 1500;
const UNIQUE_SEGMENT_DELAY_MS = 1200;
const UNIQUE_FALSE_LISTING_MIRROR_LIMIT = 100;
const UNIQUE_FALSE_LISTING_AMOUNT_LIMIT = 999999;

const currencyToDivineRate: Record<string, number> = {
  divine: 1,
  mirror: 500,
  exalted: 1 / 120,
  chaos: 1 / 600,
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getTradeOrigin(tradeUrl: string) {
  const url = new URL(tradeUrl);
  return url.origin;
}

function extractSearchId(tradeUrl: string) {
  const url = new URL(tradeUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const searchId = parts[parts.length - 1];

  if (!searchId) {
    throw new Error(`검색 ID를 찾을 수 없습니다: ${tradeUrl}`);
  }

  return searchId;
}

function extractLeague(tradeUrl: string) {
  const url = new URL(tradeUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const poe2Index = parts.findIndex((part) => part === 'poe2');

  if (poe2Index === -1 || !parts[poe2Index + 1]) {
    throw new Error(`리그 정보를 찾을 수 없습니다: ${tradeUrl}`);
  }

  return decodeURIComponent(parts[poe2Index + 1]);
}

function buildImportUrl(origin: string, league: string, searchId: string) {
  return `${origin}/api/trade2/search/poe2/${encodeURIComponent(
    league,
  )}/${searchId}`;
}

function buildSearchUrl(origin: string, league: string) {
  return `${origin}/api/trade2/search/poe2/${encodeURIComponent(league)}`;
}

function buildFetchUrl(
  origin: string,
  resultIds: string[],
  searchResultId: string,
) {
  const ids = resultIds.join(',');
  return `${origin}/api/trade2/fetch/${ids}?query=${searchResultId}&realm=poe2`;
}

function getPriceSortDirection(kind: TradeQueryConfig['kind']) {
  if (kind === 'base' || kind === 'unique') {
    return 'asc';
  }

  return 'desc';
}

function getFetchDelay(kind: TradeQueryConfig['kind']) {
  if (kind === 'base') {
    return BASE_FETCH_DELAY_MS;
  }

  return NORMAL_FETCH_DELAY_MS;
}

function getPriceScore(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return null;
  }

  const rate = currencyToDivineRate[currency];

  if (!rate) {
    return null;
  }

  return amount * rate;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureRecord(
  target: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (!isRecord(target[key])) {
    target[key] = {};
  }

  return target[key] as Record<string, unknown>;
}

function applyPriceFilter(
  query: unknown,
  min: number | undefined,
  currency: string | undefined,
) {
  const clonedQuery = deepClone(query);

  if (!min || !currency) {
    return clonedQuery;
  }

  if (!isRecord(clonedQuery)) {
    return clonedQuery;
  }

  const filters = ensureRecord(clonedQuery, 'filters');
  const tradeFilters = ensureRecord(filters, 'trade_filters');
  const tradeInnerFilters = ensureRecord(tradeFilters, 'filters');

  tradeFilters.disabled = false;
  tradeInnerFilters.price = {
    min,
    option: currency,
  };

  return clonedQuery;
}

function applyBasePriceBand(query: unknown, band: BasePriceBand) {
  return applyPriceFilter(query, band.min, band.currency);
}

function applyUniquePriceBand(query: unknown, band: UniquePriceBand) {
  return applyPriceFilter(query, band.min, band.currency);
}

function getKoreaDateString(offsetDays = 0) {
  const now = new Date();
  const koreaTime = new Date(
    now.getTime() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000,
  );

  return koreaTime.toISOString().slice(0, 10);
}

function getUniqueHistoryPath(date: string) {
  return path.join(
    process.cwd(),
    'data',
    'generated',
    'history',
    `unique-${date}.json`,
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'FIXLGS-POE2-Ranking/0.1',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`요청 실패 ${response.status}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as T;
}

async function importTradeQuery(
  tradeUrl: string,
): Promise<ImportedTradeQuery> {
  const origin = getTradeOrigin(tradeUrl);
  const searchId = extractSearchId(tradeUrl);
  const league = extractLeague(tradeUrl);
  const importUrl = buildImportUrl(origin, league, searchId);

  console.log(`[ORIGIN] ${origin}`);
  console.log(`[IMPORT] league: ${league} / searchId: ${searchId}`);

  const imported = await fetchJson<PoeTradeImportResponse>(importUrl);

  if (!imported.query) {
    throw new Error('공식 거래소 검색조건 query를 가져오지 못했습니다.');
  }

  return {
    origin,
    league,
    query: imported.query,
  };
}

async function searchTradeItems(
  origin: string,
  league: string,
  query: unknown,
  kind: TradeQueryConfig['kind'],
): Promise<PoeTradeSearchResponse> {
  const searchUrl = buildSearchUrl(origin, league);
  const sortDirection = getPriceSortDirection(kind);

  const response = await fetchJson<PoeTradeSearchResponse>(searchUrl, {
    method: 'POST',
    body: JSON.stringify({
      query,
      sort: {
        price: sortDirection,
      },
    }),
  });

  if (response.error) {
    throw new Error(`거래소 검색 오류: ${JSON.stringify(response.error)}`);
  }

  return response;
}

async function fetchTradeItems(
  origin: string,
  resultIds: string[],
  searchResultId: string,
  kind: TradeQueryConfig['kind'],
): Promise<PoeTradeFetchedItem[]> {
  const fetchedItems: PoeTradeFetchedItem[] = [];
  const delay = getFetchDelay(kind);

  for (let index = 0; index < resultIds.length; index += FETCH_CHUNK_SIZE) {
    const chunk = resultIds.slice(index, index + FETCH_CHUNK_SIZE);
    const fetchUrl = buildFetchUrl(origin, chunk, searchResultId);

    const response = await fetchJson<PoeTradeFetchResponse>(fetchUrl);
    fetchedItems.push(...(response.result ?? []));

    const fetchedCount = Math.min(index + FETCH_CHUNK_SIZE, resultIds.length);

    if (kind === 'base') {
      console.log(`[BASE FETCH] ${fetchedCount} / ${resultIds.length}`);
    }

    await sleep(delay);
  }

  return fetchedItems;
}

function formatPrice(item: PoeTradeFetchedItem) {
  const amount = item.listing?.price?.amount;
  const currency = item.listing?.price?.currency;

  if (typeof amount !== 'number' || !currency) {
    return {
      priceAmount: null,
      priceCurrency: null,
      priceLabel: '가격 미표시',
      priceScore: null,
    };
  }

  return {
    priceAmount: amount,
    priceCurrency: currency,
    priceLabel: `${amount} ${currency}`,
    priceScore: getPriceScore(amount, currency),
  };
}

function parseMods(item: PoeTradeFetchedItem) {
  return [
    ...(item.item?.implicitMods ?? []),
    ...(item.item?.explicitMods ?? []),
    ...(item.item?.fracturedMods ?? []),
    ...(item.item?.craftedMods ?? []),
    ...(item.item?.pseudoMods ?? []),
  ];
}

function toRawMarketItem(
  config: TradeQueryConfig,
  item: PoeTradeFetchedItem,
): RawMarketItem {
  const price = formatPrice(item);

  const itemName =
    item.item?.name?.trim() ||
    item.item?.typeLine?.trim() ||
    item.item?.baseType?.trim() ||
    '이름 없는 아이템';

  const baseName =
    item.item?.baseType?.trim() ||
    item.item?.typeLine?.trim() ||
    itemName;

  return {
    queryId: config.id,
    kind: config.kind,
    category: config.category ?? config.label,
    itemName,
    baseName,
    priceAmount: price.priceAmount,
    priceCurrency: price.priceCurrency,
    priceLabel: price.priceLabel,
    priceScore: price.priceScore,
    sellerName: item.listing?.account?.name ?? '',
    indexed: item.listing?.indexed ?? '',
    listingId: item.id ?? '',
    mods: parseMods(item),
  };
}

async function saveRawArtifacts({
  config,
  imported,
  searchResult,
  rawItems,
  baseBandSummaries,
}: {
  config: TradeQueryConfig;
  imported: ImportedTradeQuery;
  searchResult: PoeTradeSearchResponse;
  rawItems: RawMarketItem[];
  baseBandSummaries?: BaseBandSearchSummary[];
}) {
  if (config.kind !== 'base') {
    return;
  }

  const rawDir = path.join(process.cwd(), 'data', 'generated', 'raw');

  await writeJsonFile(path.join(rawDir, `${config.id}-search-result.json`), {
    queryId: config.id,
    label: config.label,
    origin: imported.origin,
    league: imported.league,
    importedQuery: imported.query,
    total: searchResult.total ?? 0,
    resultCount: searchResult.result?.length ?? 0,
    resultIds: searchResult.result ?? [],
    baseBandSummaries: baseBandSummaries ?? [],
  });

  await writeJsonFile(path.join(rawDir, `${config.id}-fetched-items.json`), {
    queryId: config.id,
    label: config.label,
    fetchedCount: rawItems.length,
    items: rawItems,
  });
}

async function collectBaseQuery(
  config: TradeQueryConfig,
): Promise<RawMarketItem[]> {
  console.log(`[BASE START] ${config.label} / price bands ${basePriceBands.length}`);

  const imported = await importTradeQuery(config.url);
  await sleep(500);

  const firstQuery = applyBasePriceBand(imported.query, basePriceBands[0]);
  const firstSearchResult = await searchTradeItems(
    imported.origin,
    imported.league,
    firstQuery,
    config.kind,
  );

  const rawItemsById = new Map<string, RawMarketItem>();
  const baseBandSummaries: BaseBandSearchSummary[] = [];

  for (const band of basePriceBands) {
    const bandQuery = applyBasePriceBand(imported.query, band);

    const searchResult = await searchTradeItems(
      imported.origin,
      imported.league,
      bandQuery,
      config.kind,
    );

    const resultIds = (searchResult.result ?? []).slice(0, config.limit);
    const newResultIds = resultIds.filter((id) => !rawItemsById.has(id));

    baseBandSummaries.push({
      label: band.label,
      min: band.min,
      currency: band.currency,
      total: searchResult.total ?? 0,
      resultCount: resultIds.length,
      newResultCount: newResultIds.length,
    });

    console.log(
      `[BASE BAND] ${config.label} / ${band.label}: total ${
        searchResult.total ?? 0
      }, result ${resultIds.length}, new ${newResultIds.length}`,
    );

    if (newResultIds.length > 0) {
      const fetchedItems = await fetchTradeItems(
        imported.origin,
        newResultIds,
        searchResult.id ?? '',
        config.kind,
      );

      fetchedItems.forEach((item) => {
        const rawItem = toRawMarketItem(config, item);

        if (rawItem.listingId) {
          rawItemsById.set(rawItem.listingId, rawItem);
        }
      });
    }

    await sleep(BASE_SEGMENT_DELAY_MS);
  }

  const rawItems = [...rawItemsById.values()].sort(
    (a, b) => (a.priceScore ?? 0) - (b.priceScore ?? 0),
  );

  await saveRawArtifacts({
    config,
    imported,
    searchResult: firstSearchResult,
    rawItems,
    baseBandSummaries,
  });

  console.log(`[BASE DONE] ${config.label}: fetched unique ${rawItems.length}`);

  return rawItems;
}

async function collectUniqueQuery(
  config: TradeQueryConfig,
): Promise<RawMarketItem[]> {
  console.log(
    `[UNIQUE START] ${config.label} / price bands ${uniquePriceBands.length}`,
  );

  const imported = await importTradeQuery(config.url);
  await sleep(500);

  const rawItemsById = new Map<string, RawMarketItem>();

  for (const band of uniquePriceBands) {
    const bandQuery = applyUniquePriceBand(imported.query, band);

    const searchResult = await searchTradeItems(
      imported.origin,
      imported.league,
      bandQuery,
      config.kind,
    );

    const resultIds = (searchResult.result ?? []).slice(
      0,
      UNIQUE_BAND_SAMPLE_SIZE,
    );
    const newResultIds = resultIds.filter((id) => !rawItemsById.has(id));

    console.log(
      `[UNIQUE BAND] ${band.label}: total ${
        searchResult.total ?? 0
      }, result ${resultIds.length}, new ${newResultIds.length}`,
    );

    if (newResultIds.length > 0) {
      const fetchedItems = await fetchTradeItems(
        imported.origin,
        newResultIds,
        searchResult.id ?? '',
        config.kind,
      );

      fetchedItems.forEach((item) => {
        const rawItem = toRawMarketItem(config, item);
        rawItem.category = band.key;

        if (rawItem.listingId) {
          rawItemsById.set(`${band.key}-${rawItem.listingId}`, rawItem);
        }
      });
    }

    await sleep(UNIQUE_SEGMENT_DELAY_MS);
  }

  const rawItems = [...rawItemsById.values()].sort(
    (a, b) => (a.priceScore ?? 0) - (b.priceScore ?? 0),
  );

  console.log(`[UNIQUE DONE] ${config.label}: fetched unique ${rawItems.length}`);

  return rawItems;
}

async function collectNormalQuery(
  config: TradeQueryConfig,
): Promise<RawMarketItem[]> {
  console.log(`[START] ${config.label} / limit ${config.limit}`);

  const imported = await importTradeQuery(config.url);
  await sleep(500);

  const searchResult = await searchTradeItems(
    imported.origin,
    imported.league,
    imported.query,
    config.kind,
  );

  const resultIds = (searchResult.result ?? []).slice(0, config.limit);

  console.log(
    `[SEARCH] ${config.label}: total ${searchResult.total ?? 0}, resultCount ${
      searchResult.result?.length ?? 0
    }, fetch ${resultIds.length}`,
  );

  if (resultIds.length === 0) {
    return [];
  }

  await sleep(500);

  const fetchedItems = await fetchTradeItems(
    imported.origin,
    resultIds,
    searchResult.id ?? '',
    config.kind,
  );

  console.log(`[DONE] ${config.label}: fetched ${fetchedItems.length}`);

  return fetchedItems.map((item) => toRawMarketItem(config, item));
}

async function collectQuery(config: TradeQueryConfig): Promise<RawMarketItem[]> {
  if (!config.url.trim()) {
    console.log(`[SKIP] ${config.label}: 거래소 URL 없음`);
    return [];
  }

  if (config.kind === 'base') {
    return collectBaseQuery(config);
  }

  if (config.kind === 'unique') {
    return collectUniqueQuery(config);
  }

  return collectNormalQuery(config);
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

      if (sampleItems.length < BASE_MIN_SAMPLE_COUNT) {
        return null;
      }

      const representativeIndex = Math.floor(sampleItems.length / 2);
      const representativeItem = sampleItems[representativeIndex];

      if (representativeItem.priceScore === null) {
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
  return groups
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

  return topGroup.items.slice(0, 15).map((item, index) =>
    toBaseRankingItem(item, index + 1, category),
  );
}

function buildBaseCategoryRanking(
  category: string,
  rawItems: RawMarketItem[],
): BaseCategoryRanking {
  const groups = groupBaseItems(category, rawItems);
  const filteredItems = buildFilteredBaseItems(category, groups);
  const rawItemsForTopBase = buildTopBaseRawItems(category, groups);

  return {
    category,
    previewItem: filteredItems[0],
    filteredItems,
    rawItems: rawItemsForTopBase,
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

async function main() {
  const today = getKoreaDateString(0);
  const yesterday = getKoreaDateString(-1);

  const outputPath = path.join(
    process.cwd(),
    'data',
    'generated',
    'poe2-market-ko.json',
  );

  const currentUniqueHistoryPath = getUniqueHistoryPath(today);
  const previousUniqueHistoryPath = getUniqueHistoryPath(yesterday);

  const previousUniqueSnapshot =
    await readJsonFile<UniqueHistorySnapshot>(previousUniqueHistoryPath);

  const enabledQueries = allTradeQueries.filter((query) => query.url.trim());

  console.log('========================================');
  console.log('POE2 Ranking data fetch start');
  console.log(`enabled queries: ${enabledQueries.length}`);
  console.log(`today: ${today}`);
  console.log(`previous unique history: ${previousUniqueHistoryPath}`);
  console.log('========================================');

  const rawItems: RawMarketItem[] = [];

  for (const query of allTradeQueries) {
    try {
      const items = await collectQuery(query);
      rawItems.push(...items);
      await sleep(800);
    } catch (error) {
      console.error(
        `[ERROR] ${query.label}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const currentUniqueSnapshot = buildUniqueHistorySnapshot(today, rawItems);
  const marketData = buildMarketData({
    rawItems,
    currentUniqueSnapshot,
    previousUniqueSnapshot,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(marketData, null, 2), 'utf-8');

  await writeJsonFile(currentUniqueHistoryPath, currentUniqueSnapshot);

  console.log('========================================');
  console.log(`raw items: ${rawItems.length}`);
  console.log(`saved: ${outputPath}`);
  console.log(`unique history saved: ${currentUniqueHistoryPath}`);
  console.log('POE2 Ranking data fetch done');
  console.log('========================================');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});