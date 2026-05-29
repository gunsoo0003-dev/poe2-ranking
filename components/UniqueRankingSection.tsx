'use client';

import { useState } from 'react';

import { uniqueRankingTabOptions } from '../data/marketMockData';
import type {
  UniqueRankingItem,
  UniqueRankingRange,
} from '../types/market';

type Locale = 'ko' | 'en';

type UniqueRankingSectionProps = {
  rankingsByRange: Record<UniqueRankingRange, UniqueRankingItem[]>;
  locale?: Locale;
};

const englishUniqueRangeLabels: Record<UniqueRankingRange, string> = {
  divine1: '1 Divine+',
  divine10: '10 Divine+',
  divine30: '30 Divine+',
  divine50: '50 Divine+',
};

export function UniqueRankingSection({
  rankingsByRange,
  locale = 'ko',
}: UniqueRankingSectionProps) {
  const [activeRange, setActiveRange] =
    useState<UniqueRankingRange>('divine1');

  const visibleItems = rankingsByRange[activeRange] ?? [];
  const isEnglish = locale === 'en';

  return (
    <section className="card card-padding">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">
            {isEnglish
              ? 'Unique Listing Movement Ranking'
              : '유니크 매도 랭킹'}
          </h2>
          <p className="section-desc">
            {isEnglish
              ? 'Unique items are sampled by price range and ranked by listings that disappeared compared with the previous collection data. Because unique listing data can be unstable, this should be used only as a rough reference.'
              : '전체 유니크를 가격구간별로 샘플링해 최근 수집 데이터 대비 빠진 매물 순으로 정리합니다. 유니크는 정보 수집이 불안정할 수 있어요ㅠㅠ 그냥 참고만...'}
          </p>
        </div>
      </div>

      <div className="control-block">
        <div>
          <div className="control-label">
            {isEnglish ? 'Price Range Sample' : '가격구간별 수집 기준'}
          </div>
          <div className="tab-row">
            {uniqueRankingTabOptions.map((option) => {
              const isActive = option.value === activeRange;

              return (
                <button
                  key={option.label}
                  className={`tab-button ${isActive ? 'active' : ''}`}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) {
                      setActiveRange(option.value);
                    }
                  }}
                >
                  {isEnglish
                    ? englishUniqueRangeLabels[option.value]
                    : option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ranking-list">
        {visibleItems.map((item) => (
          <article className="ranking-item" key={`${item.rank}-${item.name}`}>
            <div className="rank-number">#{item.rank}</div>

            <div className="rank-main">
              <p className="rank-name">{item.name}</p>
              <p className="rank-sub">
                {isEnglish
                  ? `Previous ${item.previousCount} → Current ${item.currentCount}`
                  : `이전 ${item.previousCount}개 → 현재 ${item.currentCount}개`}
              </p>
            </div>

            <div className="rank-value">
              {isEnglish
                ? `Removed ${item.removedCount}`
                : `빠진 매물 ${item.removedCount}개`}
              <br />
              {isEnglish
                ? `New ${item.newCount} / Net ${item.netChange}`
                : `신규 ${item.newCount}개 / 순변화 ${item.netChange}`}
            </div>
          </article>
        ))}

        {visibleItems.length === 0 ? (
          <div className="empty-ranking-message">
            {isEnglish
              ? 'No previous collection data is available yet. Please check again after the next update.'
              : '아직 비교할 이전 수집 데이터가 없습니다. 다음 수집 이후 다시 확인해주세요ㅠㅠ'}
          </div>
        ) : null}
      </div>
    </section>
  );
}