export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-logo">FIXLGS</div>
          <nav className="site-nav" aria-label="메인 메뉴">
            <a href="/poe2">POE2 아이템시세랭킹</a>
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
            현재는 POE2 아이템시세랭킹을 먼저 테스트 중입니다. 이후 계산기,
            데이터 도구, 개발일지 등 FIXLGS 서비스가 순차적으로 연결될
            예정입니다.
          </p>

          <div className="home-link-box">
            <a className="home-main-link" href="/poe2">
              POE2 아이템시세랭킹 바로가기
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}