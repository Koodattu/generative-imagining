import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { PasswordProvider } from "@/contexts/PasswordContext";
import Navigation from "@/components/Navigation";
import PasswordDialog from "@/components/PasswordDialog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generative Imagining",
  description: "AI-powered image generation and editing platform",
};

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
              <main className="container mx-auto px-4 py-4 pb-20 md:py-8 md:pb-8">{children}</main>
              <PasswordDialog />
            </UserProvider>
          </PasswordProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
