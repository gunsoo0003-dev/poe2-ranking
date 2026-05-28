import { BaseCategorySection } from '../../components/BaseCategorySection';
import { BaseRankingSection } from '../../components/BaseRankingSection';
import { RareModTrendSection } from '../../components/RareModTrendSection';
import { UniqueRankingSection } from '../../components/UniqueRankingSection';
import generatedMarketData from '../../data/generated/poe2-market-ko.json';
import type { MarketData } from '../../types/market';

const marketData = generatedMarketData as unknown as MarketData;
const currentData = marketData.daily;

export default function Poe2Page() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-logo">FIXLGS</div>
          <nav className="site-nav" aria-label="메인 메뉴">
            <a href="/">홈</a>
            <a href="/poe2">POE2 아이템시세랭킹</a>
            <a href="/poe2/en">English</a>
          </nav>
        </div>
      </header>

      <div className="main-wrap">
        <section className="hero-card">
          <div className="kicker">FIXLGS DATA</div>
          <h1 className="hero-title">POE2 아이템시세랭킹</h1>
          <p className="hero-subtitle">
            공개 거래소 등록 매물을 직접 하나씩 확인하기 번거로운 유저를
            위해, 베이스 샘플가, 유니크 매도 흐름, 레어 옵션 흐름을 구간별
            랭킹으로 정리합니다.
          </p>
          <p className="notice-text">
            이 데이터는 실제 체결가나 추천 정보가 아니라 공개 등록 매물 기준의
            수집·정리 데이터입니다. 실시간 거래소 검색 결과와 다를 수 있습니다.
          </p>
        </section>

        <section className="card card-padding">
          <div className="section-title-row">
            <div>
              <h2 className="section-title">업데이트 안내</h2>
              <p className="section-desc">
                한국어 데이터는 매주 월요일, 수요일, 금요일에 업데이트됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className="section-stack">
          <BaseCategorySection
            categories={currentData.baseCategories}
            locale="ko"
          />
          <RareModTrendSection
            categories={currentData.rareModTrends}
            locale="ko"
          />
        </section>

        <section className="section-grid">
          <UniqueRankingSection
            rankingsByRange={currentData.uniqueRankings}
            locale="ko"
          />
          <BaseRankingSection items={currentData.highValueBases} locale="ko" />
        </section>
      </div>
    </main>
  );
}