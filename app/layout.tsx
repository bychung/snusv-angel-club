import AuthProvider from '@/components/auth/AuthProvider';
import BlynxLabChatWidget from '@/components/external/BlynxLabChatWidget';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SNUSV 엔젤클럽',
  description: '서울대 벤처창업동아리 SNUSV Alumni 기반의 엔젤클럽',
  themeColor: '#ffffff',

  openGraph: {
    images: ['/meta-image.png'],
    title: 'SNUSV 엔젤클럽',
    description: '서울대 벤처창업동아리 SNUSV Alumni 기반의 엔젤클럽',
    url: 'https://snusv.angel-club.kr',
    siteName: 'SNUSV 엔젤클럽',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  // icons: {
  //   icon: '/favicon.ico',
  // }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <BlynxLabChatWidget slug="3um3" includePaths={['/']} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
