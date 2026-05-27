'use client';

import { useMemo, useState } from 'react';

import type { RareModCategory, RankingRange } from '../types/market';

type Locale = 'ko' | 'en';

type RareModTrendSectionProps = {
  categories: RareModCategory[];
  locale?: Locale;
};

const ranges: RankingRange[] = [30, 50, 100];

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
              <span>
                {activeCategory ||
                  (isEnglish ? 'Select rare type' : '레어 종류 선택')}
              </span>
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
                    {category.category}
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
        {selectedRange?.mods.map((mod) => (
          <article
            className="rare-option-item"
            key={`${activeCategory}-${activeRange}-${mod.modName}`}
          >
            <div className="rank-number">#{mod.rank}</div>
            <div className="rank-main">
              <p className="rank-name">{mod.modName}</p>
            </div>
            <div className="rank-value">
              {isEnglish ? `${mod.count} repeats` : `${mod.count}회 반복`}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}