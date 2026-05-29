import {
  cleanRawPoe2MarketData,
  collectPoe2Market,
  getBaseGroupCount,
  getRareGroupCount,
} from './poe2/collect-poe2-market';
import { buildPoe2Market } from './poe2/build-poe2-market';
import type { TradeLocale } from '../data/tradeQueries';

type RunMode = 'full' | 'clean' | 'collect' | 'build';

type CollectTarget = 'unique' | 'base' | 'rare';

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));

  if (!arg) {
    return undefined;
  }

  return arg.slice(prefix.length);
}

function parseMode(): RunMode {
  const mode = getArgValue('mode');

  if (!mode) {
    return 'full';
  }

  if (mode === 'full' || mode === 'clean' || mode === 'collect' || mode === 'build') {
    return mode;
  }

  throw new Error(`지원하지 않는 mode입니다: ${mode}`);
}

function parseLocale(): TradeLocale {
  const locale = getArgValue('locale');

  if (!locale) {
    return 'ko';
  }

  if (locale === 'ko' || locale === 'en') {
    return locale;
  }

  throw new Error(`지원하지 않는 locale입니다: ${locale}`);
}

function parseTarget(): CollectTarget {
  const target = getArgValue('target');

  if (target === 'unique' || target === 'base' || target === 'rare') {
    return target;
  }

  throw new Error(
    'collect mode에서는 --target=unique | --target=base | --target=rare 중 하나가 필요합니다.',
  );
}

function parseGroup() {
  const groupValue = getArgValue('group');

  if (!groupValue) {
    return undefined;
  }

  const group = Number(groupValue);

  if (!Number.isInteger(group) || group <= 0) {
    throw new Error(`group 값이 올바르지 않습니다: ${groupValue}`);
  }

  return group;
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runFullFetch(locale: TradeLocale) {
  await cleanRawPoe2MarketData(locale);

  const baseGroupCount = getBaseGroupCount();

  for (let group = 1; group <= baseGroupCount; group += 1) {
    await collectPoe2Market({
      target: 'base',
      group,
      locale,
    });

    if (group < baseGroupCount) {
      console.log('[WAIT] next base group: 15 minutes');
      await sleep(15 * 60 * 1000);
    }
  }

  await collectPoe2Market({
    target: 'unique',
    locale,
  });

  console.log('[WAIT] before rare groups: 10 minutes');
  await sleep(10 * 60 * 1000);

  const rareGroupCount = getRareGroupCount();

  for (let group = 1; group <= rareGroupCount; group += 1) {
    await collectPoe2Market({
      target: 'rare',
      group,
      locale,
    });

    if (group < rareGroupCount) {
      console.log('[WAIT] next rare group: 10 minutes');
      await sleep(10 * 60 * 1000);
    }
  }

  await buildPoe2Market(locale);
}

async function main() {
  const mode = parseMode();
  const locale = parseLocale();

  console.log('========================================');
  console.log('POE2 fetch script start');
  console.log(`mode: ${mode}`);
  console.log(`locale: ${locale}`);
  console.log('========================================');

  if (mode === 'clean') {
    await cleanRawPoe2MarketData(locale);
    return;
  }

  if (mode === 'collect') {
    const target = parseTarget();
    const group = parseGroup();

    await collectPoe2Market({
      target,
      group,
      locale,
    });

    return;
  }

  if (mode === 'build') {
    await buildPoe2Market(locale);
    return;
  }

  await runFullFetch(locale);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});