import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  basePriceBands,
  type BasePriceBand,
} from '../../data/basePriceBands';
import {
  baseTradeQueries,
  getTradeQueryUrl,
  rareTradeQueries,
  uniqueTradeQueries,
  type TradeLocale,
  type TradeQueryConfig,
} from '../../data/tradeQueries';
import type { UniquePriceBandKey } from '../../types/market';

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

export type RawMarketItem = {
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

type UniquePriceBand = {
  key: UniquePriceBandKey;
  label: string;
  min: number;
  currency: string;
};

type CollectTarget = 'unique' | 'base' | 'rare';

type CollectOptions = {
  target: CollectTarget;
  group?: number;
  locale?: TradeLocale;
};

type ResolvedCollectOptions = {
  target: CollectTarget;
  group?: number;
  locale: TradeLocale;
};

type FailedQueryRecord = {
  id: string;
  label: string;
  kind: TradeQueryConfig['kind'];
  category?: string;
  target: CollectTarget;
  group?: number;
  locale: TradeLocale;
  failedAt: string;
  message: string;
};

type RawCollectionFile = {
  target: CollectTarget;
  group?: number;
  locale: TradeLocale;
  generatedAt: string;
  itemCount: number;
  failedCount: number;
  items: RawMarketItem[];
  failedQueries: FailedQueryRecord[];
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

const GROUP_SIZE = 3;
const UNIQUE_BAND_SAMPLE_SIZE = 50;
const FETCH_CHUNK_SIZE = 10;

const NORMAL_FETCH_DELAY_MS = 1000;
const BASE_FETCH_DELAY_MS = 2500;
const BASE_SEGMENT_DELAY_MS = 5000;
const UNIQUE_SEGMENT_DELAY_MS = 5000;

const RETRY_DELAYS_MS = [30_000, 120_000, 300_000];

const currencyToDivineRate: Record<string, number> = {
  divine: 1,
  mirror: 500,
  exalted: 1 / 120,
  chaos: 1 / 600,
};

const failedQueries: FailedQueryRecord[] = [];

export function getRawPoe2MarketDataDir(locale: TradeLocale = 'ko') {
  return path.join(process.cwd(), 'data', 'generated', 'raw', locale);
}

function normalizeCollectOptions(options: CollectOptions): ResolvedCollectOptions {
  return {
    ...options,
    locale: options.locale ?? 'ko',
  };
}

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

async function runWithRetry<T>(
  label: string,
  task: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      if (attempt > 0) {
        console.log(`[RETRY] ${label}: attempt ${attempt + 1}`);
      }

      return await task();
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAIL] ${label}: ${message}`);

      const delay = RETRY_DELAYS_MS[attempt];

      if (typeof delay === 'number') {
        console.log(`[WAIT] ${label}: ${Math.round(delay / 1000)}s`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
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

    const response = await runWithRetry(
      `fetch chunk ${index / FETCH_CHUNK_SIZE + 1}`,
      () => fetchJson<PoeTradeFetchResponse>(fetchUrl),
    );

    fetchedItems.push(...(response.result ?? []));

    const fetchedCount = Math.min(index + FETCH_CHUNK_SIZE, resultIds.length);

    console.log(`[FETCH] ${fetchedCount} / ${resultIds.length}`);

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

  const rawName = item.item?.name?.trim() ?? '';
  const rawTypeLine = item.item?.typeLine?.trim() ?? '';
  const rawBaseType = item.item?.baseType?.trim() ?? '';

  const itemName =
    config.kind === 'unique' && rawName && rawTypeLine
      ? `${rawName} (${rawTypeLine})`
      : rawName || rawTypeLine || rawBaseType || '이름 없는 아이템';

  const baseName = rawTypeLine || rawBaseType || itemName;

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

async function collectBaseQuery(
  config: TradeQueryConfig,
  locale: TradeLocale,
): Promise<RawMarketItem[]> {
  console.log(
    `[BASE START] ${config.label} / locale ${locale} / price bands ${basePriceBands.length}`,
  );

  const tradeUrl = getTradeQueryUrl(config, locale);

  if (!tradeUrl.trim()) {
    console.log(`[SKIP] ${config.label}: ${locale} 거래소 URL 없음`);
    return [];
  }

  const imported = await runWithRetry(`import ${config.label}`, () =>
    importTradeQuery(tradeUrl),
  );

  await sleep(1000);

  const rawItemsById = new Map<string, RawMarketItem>();

  for (const band of basePriceBands) {
    const bandQuery = applyBasePriceBand(imported.query, band);

    const searchResult = await runWithRetry(
      `base search ${config.label} / ${band.label}`,
      () =>
        searchTradeItems(
          imported.origin,
          imported.league,
          bandQuery,
          config.kind,
        ),
    );

    const resultIds = (searchResult.result ?? []).slice(0, config.limit);
    const newResultIds = resultIds.filter((id) => !rawItemsById.has(id));

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

  console.log(`[BASE DONE] ${config.label}: fetched unique ${rawItems.length}`);

  return rawItems;
}

async function collectUniqueQuery(
  config: TradeQueryConfig,
  locale: TradeLocale,
): Promise<RawMarketItem[]> {
  console.log(
    `[UNIQUE START] ${config.label} / locale ${locale} / price bands ${uniquePriceBands.length}`,
  );

  const tradeUrl = getTradeQueryUrl(config, locale);

  if (!tradeUrl.trim()) {
    console.log(`[SKIP] ${config.label}: ${locale} 거래소 URL 없음`);
    return [];
  }

  const imported = await runWithRetry(`import ${config.label}`, () =>
    importTradeQuery(tradeUrl),
  );

  await sleep(1000);

  const rawItemsById = new Map<string, RawMarketItem>();

  for (const band of uniquePriceBands) {
    const bandQuery = applyUniquePriceBand(imported.query, band);

    const searchResult = await runWithRetry(
      `unique search ${config.label} / ${band.label}`,
      () =>
        searchTradeItems(
          imported.origin,
          imported.league,
          bandQuery,
          config.kind,
        ),
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
  locale: TradeLocale,
): Promise<RawMarketItem[]> {
  console.log(`[START] ${config.label} / locale ${locale} / limit ${config.limit}`);

  const tradeUrl = getTradeQueryUrl(config, locale);

  if (!tradeUrl.trim()) {
    console.log(`[SKIP] ${config.label}: ${locale} 거래소 URL 없음`);
    return [];
  }

  const imported = await runWithRetry(`import ${config.label}`, () =>
    importTradeQuery(tradeUrl),
  );

  await sleep(1000);

  const searchResult = await runWithRetry(`search ${config.label}`, () =>
    searchTradeItems(
      imported.origin,
      imported.league,
      imported.query,
      config.kind,
    ),
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

  await sleep(1000);

  const fetchedItems = await fetchTradeItems(
    imported.origin,
    resultIds,
    searchResult.id ?? '',
    config.kind,
  );

  console.log(`[DONE] ${config.label}: fetched ${fetchedItems.length}`);

  return fetchedItems.map((item) => toRawMarketItem(config, item));
}

async function collectQuery(
  config: TradeQueryConfig,
  locale: TradeLocale,
): Promise<RawMarketItem[]> {
  if (config.kind === 'base') {
    return collectBaseQuery(config, locale);
  }

  if (config.kind === 'unique') {
    return collectUniqueQuery(config, locale);
  }

  return collectNormalQuery(config, locale);
}

async function collectQuerySafely(
  config: TradeQueryConfig,
  options: ResolvedCollectOptions,
): Promise<RawMarketItem[]> {
  try {
    return await collectQuery(config, options.locale);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    failedQueries.push({
      id: config.id,
      label: config.label,
      kind: config.kind,
      category: config.category,
      target: options.target,
      group: options.group,
      locale: options.locale,
      failedAt: new Date().toISOString(),
      message,
    });

    console.error(`[QUERY FAILED] ${config.label}: ${message}`);

    return [];
  }
}

function getGroupQueries(
  queries: TradeQueryConfig[],
  group: number | undefined,
) {
  if (!group) {
    return queries;
  }

  const startIndex = (group - 1) * GROUP_SIZE;
  const endIndex = startIndex + GROUP_SIZE;

  return queries.slice(startIndex, endIndex);
}

function getQueriesForTarget(options: ResolvedCollectOptions) {
  if (options.target === 'unique') {
    return uniqueTradeQueries;
  }

  if (options.target === 'base') {
    return getGroupQueries(baseTradeQueries, options.group);
  }

  return getGroupQueries(rareTradeQueries, options.group);
}

function getRawFileName(options: ResolvedCollectOptions) {
  if (options.target === 'unique') {
    return 'unique.json';
  }

  if (!options.group) {
    return `${options.target}-all.json`;
  }

  return `${options.target}-${options.group}.json`;
}

async function writeRawCollectionFile(
  options: ResolvedCollectOptions,
  items: RawMarketItem[],
) {
  const rawDataDir = getRawPoe2MarketDataDir(options.locale);

  const fileData: RawCollectionFile = {
    target: options.target,
    group: options.group,
    locale: options.locale,
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    failedCount: failedQueries.length,
    items,
    failedQueries: failedQueries.filter(
      (query) =>
        query.target === options.target &&
        query.group === options.group &&
        query.locale === options.locale,
    ),
  };

  const filePath = path.join(rawDataDir, getRawFileName(options));

  await writeJsonFile(filePath, fileData);

  console.log(`[RAW SAVED] ${filePath}`);
}

async function appendFailedQueriesFile(locale: TradeLocale) {
  if (failedQueries.length === 0) {
    return;
  }

  const rawDataDir = getRawPoe2MarketDataDir(locale);
  const failedPath = path.join(rawDataDir, 'failed-queries.json');
  const existingFailed = await readJsonFile<FailedQueryRecord[]>(failedPath);
  const nextFailed = [...(existingFailed ?? []), ...failedQueries];

  await writeJsonFile(failedPath, nextFailed);

  console.log(`[FAILED SAVED] ${failedPath}`);
}

export async function cleanRawPoe2MarketData(locale: TradeLocale = 'ko') {
  const rawDataDir = getRawPoe2MarketDataDir(locale);

  await rm(rawDataDir, { recursive: true, force: true });
  await mkdir(rawDataDir, { recursive: true });
  console.log(`[RAW CLEANED] ${rawDataDir}`);
}

export async function collectPoe2Market(options: CollectOptions) {
  failedQueries.length = 0;

  const resolvedOptions = normalizeCollectOptions(options);
  const queries = getQueriesForTarget(resolvedOptions);
  const rawItems: RawMarketItem[] = [];

  console.log('========================================');
  console.log('POE2 raw collection start');
  console.log(`locale: ${resolvedOptions.locale}`);
  console.log(`target: ${resolvedOptions.target}`);
  console.log(`group: ${resolvedOptions.group ?? 'all'}`);
  console.log(`queries: ${queries.length}`);
  console.log('========================================');

  for (const query of queries) {
    const items = await collectQuerySafely(query, resolvedOptions);
    rawItems.push(...items);
    await sleep(1500);
  }

  await writeRawCollectionFile(resolvedOptions, rawItems);
  await appendFailedQueriesFile(resolvedOptions.locale);

  console.log('========================================');
  console.log(`POE2 raw collection done: ${rawItems.length}`);
  console.log(`failed queries: ${failedQueries.length}`);
  console.log('========================================');
}

export function getBaseGroupCount() {
  return Math.ceil(baseTradeQueries.length / GROUP_SIZE);
}

export function getRareGroupCount() {
  return Math.ceil(rareTradeQueries.length / GROUP_SIZE);
}