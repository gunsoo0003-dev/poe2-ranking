import { getCategoryName } from '../data/categoryNameMap';
import type { BaseRankingItem } from '../types/market';

type Locale = 'ko' | 'en';

type BaseRankingSectionProps = {
  items: BaseRankingItem[];
  locale?: Locale;
};

export function BaseRankingSection({
  items,
  locale = 'ko',
}: BaseRankingSectionProps) {
  const isEnglish = locale === 'en';

  return (
    <section className="card card-padding">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">
            {isEnglish ? 'Base Sample Price Top 7' : '베이스 샘플가 TOP 7'}
          </h2>
          <p className="section-desc">
            {isEnglish
              ? 'Top 7 comparison of each category’s leading base item using representative sample prices.'
              : '카테고리별 1위 베이스를 샘플 대표가 기준으로 비교한 TOP 7입니다.'}
          </p>
        </div>
      </div>

      <div className="ranking-list">
        {items.slice(0, 7).map((item) => (
          <article className="ranking-item" key={`${item.rank}-${item.name}`}>
            <div className="rank-number">#{item.rank}</div>
            <div className="rank-main">
              <p className="rank-name">{item.name}</p>
              <div className="rank-meta">
                {getCategoryName(item.category, locale)}
              </div>
            </div>
            <div className="rank-value">{item.listedPrice}</div>
          </article>
        ))}
      </div>
    </section>
  );
}