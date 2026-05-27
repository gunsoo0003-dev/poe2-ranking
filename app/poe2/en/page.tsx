'use client';

import { useState } from 'react';

import { BaseCategorySection } from '../../../components/BaseCategorySection';
import { BaseRankingSection } from '../../../components/BaseRankingSection';
import { PeriodTabs } from '../../../components/PeriodTabs';
import { RareModTrendSection } from '../../../components/RareModTrendSection';
import { UniqueRankingSection } from '../../../components/UniqueRankingSection';
import generatedMarketData from '../../../data/generated/poe2-market-ko.json';
import { periodOptions } from '../../../data/marketMockData';
import type { MarketData, PeriodKey } from '../../../types/market';

const marketData = generatedMarketData as unknown as MarketData;

export default function Poe2EnglishPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('daily');
  const currentData = marketData[activePeriod];

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
            This data is based on publicly listed trade items. It does not
            represent confirmed sales, real-time transaction prices, or trading
            recommendations. Some item names and modifier labels may currently
            appear in Korean because the test data is collected from the Korean
            trade site.
          </p>
        </section>

        <PeriodTabs
          activePeriod={activePeriod}
          options={periodOptions}
          onChange={setActivePeriod}
          locale="en"
        />

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