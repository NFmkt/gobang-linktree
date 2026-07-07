import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/site/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3939",
  ),
  title: SITE_CONFIG.brandName,
  description: SITE_CONFIG.bio,
  openGraph: {
    title: SITE_CONFIG.brandName,
    description: SITE_CONFIG.bio,
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.brandName,
    description: SITE_CONFIG.bio,
    images: [{ url: "/opengraph-image" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
