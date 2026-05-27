import type { PeriodKey, PeriodOption } from '../types/market';

type Locale = 'ko' | 'en';

type PeriodTabsProps = {
  activePeriod: PeriodKey;
  options: PeriodOption[];
  onChange: (period: PeriodKey) => void;
  locale?: Locale;
};

const englishPeriodLabelMap: Record<string, string> = {
  오늘: 'Today',
  '7일': '7D',
  '15일': '15D',
  '30일': '30D',
};

export function PeriodTabs({
  activePeriod,
  options,
  onChange,
  locale = 'ko',
}: PeriodTabsProps) {
  const isEnglish = locale === 'en';

  return (
    <section className="card card-padding">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">
            {isEnglish ? 'Period' : '기간 선택'}
          </h2>
          <p className="section-desc">
            {isEnglish
              ? 'Check ranking data by today, 7 days, 15 days, and 30 days.'
              : '오늘, 7일, 15일, 30일 기준으로 랭킹 데이터를 확인합니다.'}
          </p>
        </div>
        <div
          className="tab-row"
          aria-label={isEnglish ? 'Period selection' : '기간 선택'}
        >
          {options.map((option) => (
            <button
              key={option.key}
              className={`tab-button ${
                activePeriod === option.key ? 'active' : ''
              }`}
              type="button"
              onClick={() => onChange(option.key)}
            >
              {isEnglish
                ? englishPeriodLabelMap[option.label] ?? option.label
                : option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}