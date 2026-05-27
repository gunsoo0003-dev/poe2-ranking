const POLICY_LINKS = [
  {
    label: '개인정보처리방침',
    href: 'https://fixlgs.com/privacy',
  },
  {
    label: '이용약관',
    href: 'https://fixlgs.com/terms',
  },
  {
    label: '문의하기',
    href: 'https://fixlgs.com/contact',
  },
];

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-brand">© FIXLGS DATA.</div>
            <div className="footer-desc">
              기준이 필요한 데이터를 수집하고 정리합니다.
            </div>
          </div>

          <nav className="footer-links" aria-label="사이트 정책 링크">
            {POLICY_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-notice">
          POE2 아이템시세랭킹은 공개 등록 매물 데이터를 기준으로 만든 참고용
          정보입니다. 실제 체결가, 판매 확정, 투자 또는 거래 추천을 의미하지
          않습니다.
        </div>
      </div>
    </footer>
  );
}