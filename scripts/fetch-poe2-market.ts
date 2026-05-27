import {
  cleanRawPoe2MarketData,
  collectPoe2Market,
  getBaseGroupCount,
  getRareGroupCount,
} from './poe2/collect-poe2-market';
import { buildPoe2Market } from './poe2/build-poe2-market';

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

async function runFullFetch() {
  await cleanRawPoe2MarketData();

  const baseGroupCount = getBaseGroupCount();

  for (let group = 1; group <= baseGroupCount; group += 1) {
    await collectPoe2Market({
      target: 'base',
      group,
    });

    if (group < baseGroupCount) {
      console.log('[WAIT] next base group: 15 minutes');
      await sleep(15 * 60 * 1000);
    }
  }

  await collectPoe2Market({
    target: 'unique',
  });

  console.log('[WAIT] before rare groups: 10 minutes');
  await sleep(10 * 60 * 1000);

  const rareGroupCount = getRareGroupCount();

  for (let group = 1; group <= rareGroupCount; group += 1) {
    await collectPoe2Market({
      target: 'rare',
      group,
    });

    if (group < rareGroupCount) {
      console.log('[WAIT] next rare group: 10 minutes');
      await sleep(10 * 60 * 1000);
    }
  }

  await buildPoe2Market();
}

async function main() {
  const mode = parseMode();

  if (mode === 'clean') {
    await cleanRawPoe2MarketData();
    return;
  }

  if (mode === 'collect') {
    const target = parseTarget();
    const group = parseGroup();

    await collectPoe2Market({
      target,
      group,
    });

    return;
  }

  if (mode === 'build') {
    await buildPoe2Market();
    return;
  }

  await runFullFetch();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});