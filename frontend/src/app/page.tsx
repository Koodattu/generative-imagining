"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";

export default function Home() {
  const { locale, setLocale, t } = useLocale();

  const options = [
    {
      href: "/create",
      icon: "➕",
      title: t("home.create"),
      description: t("home.create.desc"),
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      href: "/edit",
      icon: "🖼️",
      title: t("home.edit"),
      description: t("home.edit.desc"),
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      href: "/gallery",
      icon: "🖥️",
      title: t("home.gallery"),
      description: t("home.gallery.desc"),
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4">
        <div className="text-center mb-8">
          {/* Language Selector */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => setLocale("fi")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                locale === "fi" ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
              }`}
              aria-label="Finnish"
            >
              <span className="text-2xl">🇫🇮</span>
              <span className="font-medium">Suomi</span>
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                locale === "en" ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
              }`}
              aria-label="English"
            >
              <span className="text-2xl">🇬🇧</span>
              <span className="font-medium">English</span>
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">{t("home.title")}</h1>
          <p className="text-gray-400 text-lg">{t("home.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((option) => (
            <Link key={option.href} href={option.href} className={`${option.color} rounded-lg p-8 md:p-12 text-center transition-all transform hover:scale-105 active:scale-95`}>
              <div className="text-6xl mb-4">{option.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{option.title}</h2>
              <p className="text-white text-opacity-90 text-sm md:text-base">{option.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
