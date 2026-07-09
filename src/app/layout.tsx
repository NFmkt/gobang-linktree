import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site/getSiteConfig";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3939",
    ),
    title: siteConfig.brandName,
    description: siteConfig.bio,
    openGraph: {
      title: siteConfig.brandName,
      description: siteConfig.bio,
      type: "website",
      locale: "ko_KR",
      images: [{ url: "/opengraph-image" }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.brandName,
      description: siteConfig.bio,
      images: [{ url: "/opengraph-image" }],
    },
  };
}

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
