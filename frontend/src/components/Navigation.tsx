"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
// Emoji icons for navigation

export default function Navigation() {
  const pathname = usePathname();
  const { t } = useLocale();

  const navItems = [
    { href: "/create", label: t("nav.create"), emoji: "✨" },
    { href: "/edit", label: t("nav.edit"), emoji: "🎨" },
    { href: "/gallery", label: t("nav.gallery"), emoji: "🖼️" },
    { href: "/admin", label: t("nav.admin"), emoji: "🛠️" },
  ];

  // Mobile navigation items (no admin)
  const mobileNavItems = navItems.filter((item) => item.href !== "/admin");

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block bg-[#2a2a2a] border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🖼️</span>
              <span className="text-xl font-bold text-gray-100">{t("nav.appName")}</span>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="flex space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                let activeColor = "bg-blue-600";
                if (item.href === "/create") activeColor = "bg-orange-600";
                else if (item.href === "/edit") activeColor = "bg-purple-600";
                else if (item.href === "/gallery") activeColor = "bg-green-600";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      isActive ? `${activeColor} text-white` : "text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
                    }`}
                  >
                    <span className="text-xl" aria-label={item.label}>
                      {item.emoji}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom App Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#2a2a2a] border-t border-gray-700 z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            let activeColor = "orange";
            let bgColor = "bg-orange-600";
            if (item.href === "/create") {
              activeColor = "orange";
              bgColor = "bg-orange-600";
            } else if (item.href === "/edit") {
              activeColor = "purple";
              bgColor = "bg-purple-600";
            } else if (item.href === "/gallery") {
              activeColor = "green";
              bgColor = "bg-green-600";
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 px-2 rounded-lg mx-1 transition-all ${
                  isActive ? `${bgColor} text-white scale-105` : "text-gray-400 hover:text-gray-200 hover:bg-[#3a3a3a] active:scale-95"
                }`}
              >
                <span className="text-2xl mb-1" aria-label={item.label}>
                  {item.emoji}
                </span>
                <span className={`text-xs font-medium ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
