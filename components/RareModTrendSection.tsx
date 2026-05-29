'use client';

import { useMemo, useState } from 'react';

import { getCategoryName } from '../data/categoryNameMap';
import type { RareModCategory, RankingRange } from '../types/market';

type Locale = 'ko' | 'en';

type RareModTrendSectionProps = {
  categories: RareModCategory[];
  locale?: Locale;
};

const ranges: RankingRange[] = [30, 50, 100];

function extractNumberTokens(value: string) {
  return value.match(/\d+(?:\.\d+)?/g) ?? [];
}

function normalizeText(value: string) {
  return value
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/–/g, '-')
    .replace(/〜/g, '~')
    .replace(/～/g, '~')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateModifierToEn(value: string) {
  const text = normalizeText(value);
  const numbers = extractNumberTokens(text);

  const hasAttack = text.includes('Attack');
  const hasProjectile = text.includes('Projectile');
  const hasCritical = text.includes('Critical');
  const hasPhysical = text.includes('Physical');
  const hasElemental = text.includes('Elemental');
  const hasFire = text.includes('Fire');
  const hasCold = text.includes('Cold');
  const hasLightning = text.includes('Lightning');
  const hasChaos = text.includes('Chaos');
  const hasSpell = text.includes('Spell');
  const hasHitDamage = text.includes('HitDamage');
  const hasOnslaught = text.includes('Onslaught');
  const hasSurpassChance = text.includes('SurpassChance');

  if (
    text.includes('모든') &&
    hasAttack &&
    text.includes('스킬 레벨') &&
    numbers[0]
  ) {
    return `+${numbers[0]} to Level of all Attack Skills`;
  }

  if (
    text.includes('모든') &&
    hasProjectile &&
    text.includes('스킬 레벨') &&
    numbers[0]
  ) {
    return `+${numbers[0]} to Level of all Projectile Skills`;
  }

  if (
    text.includes('모든') &&
    hasSpell &&
    text.includes('스킬 레벨') &&
    numbers[0]
  ) {
    return `+${numbers[0]} to Level of all Spell Skills`;
  }

  if (hasAttack && text.includes('속도') && text.includes('증가') && numbers[0]) {
    return `${numbers[0]}% increased Attack Speed`;
  }

  if (
    hasPhysical &&
    text.includes('피해') &&
    text.includes('추가') &&
    numbers[0] &&
    numbers[1]
  ) {
    return `Adds ${numbers[0]} to ${numbers[1]} Physical Damage`;
  }

  if (hasPhysical && text.includes('피해') && text.includes('추가') && numbers[0]) {
    return `Adds ${numbers[0]} Physical Damage`;
  }

  if (
    text.includes('투사체') &&
    text.includes('사거리') &&
    text.includes('감소') &&
    numbers[0]
  ) {
    return `${numbers[0]}% reduced Projectile Distance`;
  }

  if (
    text.includes('투사체') &&
    text.includes('속도') &&
    text.includes('증가') &&
    numbers[0]
  ) {
    return `${numbers[0]}% increased Projectile Speed`;
  }

  if (
    text.includes('투사체') &&
    text.includes('피해') &&
    text.includes('증가') &&
    numbers[0]
  ) {
    return `${numbers[0]}% increased Projectile Damage`;
  }

  if (hasCritical && text.includes('확률') && numbers[0]) {
    return `+${numbers[0]}% to Critical Hit Chance`;
  }

  if (hasCritical && text.includes('피해 보너스') && numbers[0]) {
    return `+${numbers[0]}% to Critical Damage Bonus`;
  }

  if (
    hasElemental &&
    hasAttack &&
    text.includes('피해') &&
    text.includes('증가') &&
    numbers[0]
  ) {
    return `${numbers[0]}% increased Elemental Damage with Attack Skills`;
  }

  if (text.includes('추가 화살') && hasSurpassChance && numbers[0]) {
    return `+${numbers[0]}% chance to fire an additional Arrow`;
  }

  if (
    text.includes('활') &&
    hasAttack &&
    text.includes('화살') &&
    text.includes('추가 발사') &&
    numbers[0]
  ) {
    return `Bow Attacks fire ${numbers[0]} additional Arrows`;
  }

  if (
    text.includes('이 무기로') &&
    hasHitDamage &&
    text.includes('처치') &&
    hasOnslaught &&
    numbers[0]
  ) {
    return `${numbers[0]}% chance to gain Onslaught on Kill with this Weapon`;
  }

  if (
    hasFire &&
    text.includes('피해') &&
    text.includes('추가') &&
    numbers[0] &&
    numbers[1]
  ) {
    return `Adds ${numbers[0]} to ${numbers[1]} Fire Damage`;
  }

  if (
    hasCold &&
    text.includes('피해') &&
    text.includes('추가') &&
    numbers[0] &&
    numbers[1]
  ) {
    return `Adds ${numbers[0]} to ${numbers[1]} Cold Damage`;
  }

  if (
    hasLightning &&
    text.includes('피해') &&
    text.includes('추가') &&
    numbers[0] &&
    numbers[1]
  ) {
    return `Adds ${numbers[0]} to ${numbers[1]} Lightning Damage`;
  }

  if (
    hasChaos &&
    text.includes('피해') &&
    text.includes('추가') &&
    numbers[0] &&
    numbers[1]
  ) {
    return `Adds ${numbers[0]} to ${numbers[1]} Chaos Damage`;
  }

  if (text.includes('정확도') && numbers[0]) {
    return `+${numbers[0]} to Accuracy Rating`;
  }

  if (text.includes('힘') && numbers[0]) {
    return `+${numbers[0]} to Strength`;
  }

  if (text.includes('민첩') && numbers[0]) {
    return `+${numbers[0]} to Dexterity`;
  }

  if (text.includes('지능') && numbers[0]) {
    return `+${numbers[0]} to Intelligence`;
  }

  if (text.includes('최대 생명력') && numbers[0]) {
    return `+${numbers[0]} to maximum Life`;
  }

  if (text.includes('최대 마나') && numbers[0]) {
    return `+${numbers[0]} to maximum Mana`;
  }

  if (hasFire && text.includes('저항') && numbers[0]) {
    return `+${numbers[0]}% to Fire Resistance`;
  }

  if (hasCold && text.includes('저항') && numbers[0]) {
    return `+${numbers[0]}% to Cold Resistance`;
  }

  if (hasLightning && text.includes('저항') && numbers[0]) {
    return `+${numbers[0]}% to Lightning Resistance`;
  }

  if (hasChaos && text.includes('저항') && numbers[0]) {
    return `+${numbers[0]}% to Chaos Resistance`;
  }

  return value;
}

function translateIfEnglish(value: string, isEnglish: boolean) {
  if (!isEnglish) return value;

  return translateModifierToEn(value);
}

export function RareModTrendSection({
  categories,
  locale = 'ko',
}: RareModTrendSectionProps) {
  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.category ?? '',
  );
  const [activeRange, setActiveRange] = useState<RankingRange>(30);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const isEnglish = locale === 'en';

  const selectedCategory = useMemo(
    () => categories.find((category) => category.category === activeCategory),
    [categories, activeCategory],
  );

  const selectedRange = useMemo(
    () => selectedCategory?.ranges.find((range) => range.range === activeRange),
    [selectedCategory, activeRange],
  );

  const activeCategoryName =
    activeCategory !== ''
      ? getCategoryName(activeCategory, locale)
      : isEnglish
        ? 'Select rare type'
        : '레어 종류 선택';

  return (
    <section className="card card-padding">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">
            {isEnglish ? 'Rare Modifier Trend' : '레어 옵션 트렌드'}
          </h2>
          <p className="section-desc">
            {isEnglish
              ? 'This section counts repeatedly appearing modifiers from high-listed rare items. It is collected listing data, not a recommended modifier list.'
              : '공개 등록가 상위 레어 아이템 기준으로 반복 등장한 옵션을 집계합니다. 실제 추천 옵션이 아니라, 공개 등록 매물 기준의 수집·정리 데이터입니다.'}
          </p>
        </div>
      </div>

      <div className="control-block rare-control-grid">
        <div className="control-panel">
          <div className="control-label">
            {isEnglish ? 'Rare Type' : '레어 종류'}
          </div>

          <div className="rare-select-box">
            <button
              className="rare-select-button"
              type="button"
              onClick={() => setIsCategoryPickerOpen((current) => !current)}
            >
              <span>{activeCategoryName}</span>
              <span className="rare-select-arrow">
                {isCategoryPickerOpen ? '▲' : '▼'}
              </span>
            </button>

            {isCategoryPickerOpen ? (
              <div className="rare-category-picker">
                {categories.map((category) => (
                  <button
                    key={category.category}
                    className={`rare-category-option ${
                      activeCategory === category.category ? 'active' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.category);
                      setIsCategoryPickerOpen(false);
                    }}
                  >
                    {getCategoryName(category.category, locale)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="control-panel">
          <div className="control-label">
            {isEnglish ? 'Listing Sample Range' : '등록 매물 기준'}
          </div>
          <div className="tab-row">
            {ranges.map((range) => (
              <button
                key={range}
                className={`tab-button ${
                  activeRange === range ? 'active' : ''
                }`}
                type="button"
                onClick={() => setActiveRange(range)}
              >
                TOP {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rare-option-grid">
        {selectedRange?.mods.map((mod) => {
          const modName = translateIfEnglish(mod.modName, isEnglish);

          return (
            <article
              className="rare-option-item"
              key={`${activeCategory}-${activeRange}-${mod.modName}`}
            >
              <div className="rank-number">#{mod.rank}</div>
              <div className="rank-main">
                <p className="rank-name">{modName}</p>
              </div>
              <div className="rank-value">
                {isEnglish ? `${mod.count} repeats` : `${mod.count}회 반복`}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}