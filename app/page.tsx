export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-logo">FIXLGS</div>
          <nav className="site-nav" aria-label="메인 메뉴">
            <a href="/poe2">POE2 아이템시세랭킹</a>
            <a href="https://poe2.fixlgs.com">POE Radar</a>
          </nav>
        </div>
      </header>

      <div className="main-wrap">
        <section className="hero-card">
          <div className="kicker">FIXLGS DATA</div>
          <h1 className="hero-title">FIXLGS 데이터 도구</h1>
          <p className="hero-subtitle">
            필요한 데이터를 직접 확인하기 번거로운 유저를 위해, 공개 데이터를
            수집하고 보기 쉽게 정리하는 도구를 만듭니다.
          </p>
          <p className="notice-text">
            현재는 POE2 아이템시세랭킹과 POE Radar를 데이터 도구로 연결해
            테스트 중입니다. 이후 계산기, 데이터 도구, 개발일지 등 FIXLGS
            서비스가 순차적으로 연결될 예정입니다.
          </p>
        </section>

        <section className="section-grid">
          <a className="card card-padding data-tool-card" href="/poe2">
            <div>
              <div className="kicker">POE2 RANKING</div>
              <h2 className="section-title">POE2 아이템시세랭킹</h2>
              <p className="section-desc">
                공개 거래소 등록 매물 기준으로 베이스 시세, 유니크 매도 흐름,
                레어 옵션 트렌드를 정리합니다.
              </p>
            </div>

            <div className="home-link-box">
              <span className="home-main-link">랭킹 보러가기</span>
            </div>
          </a>

          <a
            className="card card-padding data-tool-card"
            href="https://poe2.fixlgs.com"
          >
            <div>
              <div className="kicker">POE RADAR</div>
              <h2 className="section-title">POE Radar</h2>
              <p className="section-desc">
                POE2 거래소 검색 흐름을 기준으로 아이템 시세와 변동 흐름을
                추적하는 레이더 도구입니다.
              </p>
            </div>

            <div className="home-link-box">
              <span className="home-main-link">레이더 보러가기</span>
            </div>
          </a>
        </section>
      </div>
    </main>
  );
}