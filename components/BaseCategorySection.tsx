'use client';

import { useState } from 'react';

import { getCategoryName } from '../data/categoryNameMap';
import type { BaseCategoryRanking, BaseRankingItem } from '../types/market';

type Locale = 'ko' | 'en';

type BaseCategorySectionProps = {
  categories: BaseCategoryRanking[];
  locale?: Locale;
};

type RankingListProps = {
  title: string;
  description: string;
  items: BaseRankingItem[];
  locale: Locale;
  activeItemName?: string;
  onItemClick?: (item: BaseRankingItem) => void;
};

function RankingList({
  title,
  description,
  items,
  locale,
  activeItemName,
  onItemClick,
}: RankingListProps) {
  const isEnglish = locale === 'en';

  return (
    <div className="base-detail-panel">
      <div className="base-detail-panel-header">
        <h4 className="base-detail-title">{title}</h4>
        <p className="base-detail-desc">{description}</p>
      </div>

      <div className="mini-list">
        {items.slice(0, 15).map((item) => {
          const isActive = activeItemName === item.name;
          const isClickable = Boolean(onItemClick);

          return (
            <div
              className={`mini-item ${isClickable ? 'clickable' : ''} ${
                isActive ? 'active' : ''
              }`}
              key={`${title}-${item.rank}-${item.name}-${item.listedPrice}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => {
                onItemClick?.(item);
              }}
              onKeyDown={(event) => {
                if (!isClickable) {
                  return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onItemClick?.(item);
                }
              }}
            >
              <div className="mini-rank">#{item.rank}</div>
              <div className="mini-name">{item.name}</div>
              <div className="mini-value">{item.listedPrice}</div>
            </div>
          );
        })}

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
  const [selectedBaseByCategory, setSelectedBaseByCategory] = useState<
    Record<string, string>
  >({});
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
              ? 'Ranked by the highest lowest-listed price by base type.'
              : '베이스별 최저가가 높은 순으로 정리한 랭킹입니다.'}
          </p>
        </div>
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.category;
          const topItem = category.previewItem;
          const displayCategoryName = getCategoryName(
            category.category,
            locale,
          );

          const selectedBaseName =
            selectedBaseByCategory[category.category] ??
            category.filteredItems[0]?.name ??
            '';

          const selectedBaseItems =
            category.baseSampleItems?.[selectedBaseName] ??
            category.rawItems ??
            [];

          return (
            <article
              className={`category-card ${isExpanded ? 'expanded' : ''}`}
              key={category.category}
            >
              {!isExpanded ? (
                <div className="category-preview-row">
                  <div className="category-preview-type">
                    {displayCategoryName}
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
                    <h3 className="category-title">{displayCategoryName}</h3>
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
                          ? 'Highest lowest-listed price by base type'
                          : '종류별 최저가가 높은 가격'
                      }
                      items={category.filteredItems}
                      locale={locale}
                      activeItemName={selectedBaseName}
                      onItemClick={(item) => {
                        setSelectedBaseByCategory((current) => ({
                          ...current,
                          [category.category]: item.name,
                        }));
                      }}
                    />

                    <RankingList
                      title={
                        isEnglish
                          ? 'Selected Base Lowest Samples'
                          : '선택 베이스 최저가 샘플'
                      }
                      description={
                        isEnglish
                          ? 'Lowest listing samples for the selected base item'
                          : '왼쪽에서 선택한 베이스템의 실제 거래소 최저가 샘플'
                      }
                      items={selectedBaseItems}
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