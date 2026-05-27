'use client';

import { useState } from 'react';

import type { BaseCategoryRanking, BaseRankingItem } from '../types/market';

type Locale = 'ko' | 'en';

type BaseCategorySectionProps = {
  categories: BaseCategoryRanking[];
  locale?: Locale;
};

function RankingList({
  title,
  description,
  items,
  locale,
}: {
  title: string;
  description: string;
  items: BaseRankingItem[];
  locale: Locale;
}) {
  const isEnglish = locale === 'en';

  return (
    <div className="base-detail-panel">
      <div className="base-detail-panel-header">
        <h4 className="base-detail-title">{title}</h4>
        <p className="base-detail-desc">{description}</p>
      </div>

      <div className="mini-list">
        {items.slice(0, 15).map((item) => (
          <div
            className="mini-item"
            key={`${title}-${item.rank}-${item.name}-${item.listedPrice}`}
          >
            <div className="mini-rank">#{item.rank}</div>
            <div className="mini-name">{item.name}</div>
            <div className="mini-value">{item.listedPrice}</div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="empty-ranking-message">
            {isEnglish ? 'No data collected yet.' : '수집된 데이터가 없습니다.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BaseCategorySection({
  categories,
  locale = 'ko',
}: BaseCategorySectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const isEnglish = locale === 'en';

  const toggleCategory = (categoryName: string) => {
    setExpandedCategory((currentCategory) =>
      currentCategory === categoryName ? null : categoryName,
    );
  };

  return (
    <section className="card card-padding">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">
            {isEnglish ? 'Base Type Price Ranking' : '종류별 베이스 시세 랭킹'}
          </h2>
          <p className="section-desc">
            {isEnglish
              ? 'Ranked by representative sample prices from the lowest listed prices by base type.'
              : '베이스별 최저가 샘플 대표가 기준'}
          </p>
        </div>
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.category;
          const topItem = category.previewItem;

          return (
            <article
              className={`category-card ${isExpanded ? 'expanded' : ''}`}
              key={category.category}
            >
              {!isExpanded ? (
                <div className="category-preview-row">
                  <div className="category-preview-type">
                    {category.category}
                  </div>

                  {topItem ? (
                    <>
                      <div className="mini-rank">#{topItem.rank}</div>
                      <div className="category-preview-name">
                        {topItem.name}
                      </div>
                      <div className="category-preview-price">
                        {topItem.listedPrice}
                      </div>
                    </>
                  ) : (
                    <div className="category-preview-empty">
                      {isEnglish
                        ? 'No data collected yet.'
                        : '수집된 데이터가 없습니다.'}
                    </div>
                  )}

                  <button
                    className="detail-toggle-button"
                    type="button"
                    onClick={() => toggleCategory(category.category)}
                  >
                    {isEnglish ? 'View Top 15' : 'TOP 15 보기'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="category-card-header">
                    <h3 className="category-title">{category.category}</h3>
                    <button
                      className="detail-toggle-button"
                      type="button"
                      onClick={() => toggleCategory(category.category)}
                    >
                      {isEnglish ? 'Close' : '접기'}
                    </button>
                  </div>

                  <div className="base-detail-grid">
                    <RankingList
                      title={
                        isEnglish
                          ? 'Base Ranking Top 15'
                          : '베이스 랭킹 TOP 15'
                      }
                      description={
                        isEnglish
                          ? 'Highest sample prices by base type'
                          : '종류별 최저가 높은순 가격'
                      }
                      items={category.filteredItems}
                      locale={locale}
                    />

                    <RankingList
                      title={isEnglish ? 'Top Base Item' : '1위 베이스'}
                      description={
                        isEnglish
                          ? 'Actual collected lowest listing samples for the top base item'
                          : '베이스템의 실제 거래소 최저가격'
                      }
                      items={category.rawItems}
                      locale={locale}
                    />
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}