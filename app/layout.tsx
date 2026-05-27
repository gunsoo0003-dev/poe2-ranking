import type { Metadata } from 'next';
import Script from 'next/script';

import { SiteFooter } from '../components/SiteFooter';

import './globals.css';

export const metadata: Metadata = {
  title: 'POE2 아이템시세랭킹｜베이스 시세·유니크·레어 옵션 트렌드',
  description:
    '공개 거래소 등록 데이터를 기준으로 고가 베이스, 인기 유니크, 레어 옵션 흐름을 랭킹으로 확인합니다.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EPCCGBTPH9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-EPCCGBTPH9');
          `}
        </Script>

        {children}
        <SiteFooter />
      </body>
    </html>
  );
}