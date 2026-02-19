import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tabula Web — PDF から表を抽出",
  description: "PDF ファイルにある表データを CSV・Excel・JSON に変換できる無料ウェブツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://auth.dataviz.jp/lib/supabase.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://auth.dataviz.jp/lib/dataviz-auth-client.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-60MRJQRNK9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-60MRJQRNK9');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
