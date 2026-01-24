import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { PasswordProvider } from "@/contexts/PasswordContext";
import Navigation from "@/components/Navigation";
import PasswordDialog from "@/components/PasswordDialog";
import RootLayoutContent from "@/components/RootLayoutContent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Generative Imagining - AI Image Creation Platform",
    template: "%s | Generative Imagining",
  },
  description:
    "Turn imagination into images with AI. Create and edit stunning images using natural language. Perfect for education, creativity, and exploring AI art generation. Powered by Google Gemini.",
  keywords: ["AI image generation", "text to image", "AI art", "image editing", "Gemini AI", "creative tool", "educational platform", "generative AI"],
  authors: [{ name: "Generative Imagining Team" }],
  creator: "Generative Imagining",
  publisher: "Generative Imagining",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),

  // Open Graph (for Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["fi_FI"],
    url: "/",
    siteName: "Generative Imagining",
    title: "Generative Imagining - AI Image Creation Platform",
    description:
      "Turn imagination into images with AI. Create and edit stunning images using natural language. Perfect for education, creativity, and exploring AI art generation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Generative Imagining - AI Image Creation",
        type: "image/png",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Generative Imagining - AI Image Creation Platform",
    description: "Turn imagination into images with AI. Create and edit stunning images using natural language.",
    images: ["/twitter-image.png"],
    creator: "@yourtwitterhandle", // Replace with your Twitter handle
  },

  // App-specific metadata
  applicationName: "Generative Imagining",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Generative Imagining",
  },

  // Additional SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Icons and favicons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
      },
    ],
  },

  // Web app manifest
  manifest: "/site.webmanifest",

  // Verification (add your verification codes)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
};

export function generateViewport() {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1a1a1a] min-h-screen overflow-x-hidden`}>
        <LocaleProvider>
          <PasswordProvider>
            <UserProvider>
              <Navigation />
              <RootLayoutContent>{children}</RootLayoutContent>
              <PasswordDialog />
            </UserProvider>
          </PasswordProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
