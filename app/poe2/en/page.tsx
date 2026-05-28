import { BaseCategorySection } from '../../../components/BaseCategorySection';
import { BaseRankingSection } from '../../../components/BaseRankingSection';
import { RareModTrendSection } from '../../../components/RareModTrendSection';
import { UniqueRankingSection } from '../../../components/UniqueRankingSection';
import generatedMarketData from '../../../data/generated/poe2-market-ko.json';
import type { MarketData } from '../../../types/market';

const marketData = generatedMarketData as unknown as MarketData;
const currentData = marketData.daily;

export default function Poe2EnglishPage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-logo">FIXLGS</div>
          <nav className="site-nav" aria-label="Main menu">
            <a href="/">Home</a>
            <a href="/poe2">한국어</a>
            <a href="/poe2/en">English</a>
          </nav>
        </div>
      </header>

      <div className="main-wrap">
        <section className="hero-card">
          <div className="kicker">FIXLGS DATA</div>
          <h1 className="hero-title">POE2 Item Price Ranking</h1>
          <p className="hero-subtitle">
            This page summarizes public POE2 trade listings into base item
            sample rankings, unique listing movement rankings, and rare modifier
            trend data.
          </p>
          <p className="notice-text">
            This page uses Korean trade listing data as the main data source.
            Some item names, base types, and modifier labels may appear in
            Korean.
          </p>
        </section>

        <section className="card card-padding">
          <div className="section-title-row">
            <div>
              <h2 className="section-title">Data Update Notice</h2>
              <p className="section-desc">
                Korean market data is updated every Monday, Wednesday, and
                Friday.
              </p>
              <p className="section-desc">
                This English page uses the same Korean market data with an
                English interface.
              </p>
            </div>
          </div>
        </section>

        <section className="section-stack">
          <BaseCategorySection
            categories={currentData.baseCategories}
            locale="en"
          />
          <RareModTrendSection
            categories={currentData.rareModTrends}
            locale="en"
          />
        </section>

        <section className="section-grid">
          <UniqueRankingSection
            rankingsByRange={currentData.uniqueRankings}
            locale="en"
          />
          <BaseRankingSection items={currentData.highValueBases} locale="en" />
        </section>
      </div>
    </main>
  );
}