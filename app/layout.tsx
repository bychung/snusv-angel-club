import AuthProvider from '@/components/auth/AuthProvider';
import BlynxLabChatWidget from '@/components/external/BlynxLabChatWidget';
import { getBrandingConfig } from '@/lib/branding';
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

const branding = getBrandingConfig();

export const metadata: Metadata = {
  title: branding.title,
  description: branding.description,
  themeColor: '#ffffff',

  openGraph: {
    images: ['/meta-image.png'],
    title: branding.ogTitle,
    description: branding.ogDescription,
    url: branding.domain,
    siteName: branding.title,
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
          {branding.chatbotSlug && (
            <BlynxLabChatWidget
              slug={branding.chatbotSlug}
              includePaths={['/']}
            />
          )}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
