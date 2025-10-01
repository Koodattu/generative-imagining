"use client";

import Link from "next/link";

export default function Home() {
  const options = [
    {
      href: "/create",
      icon: "➕",
      title: "Create",
      description: "Generate new images with AI",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      href: "/edit",
      icon: "🖼️",
      title: "Edit",
      description: "Modify existing images",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      href: "/gallery",
      icon: "🖥️",
      title: "Gallery",
      description: "View your creations",
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Generative Imagining</h1>
          <p className="text-gray-400 text-lg">AI-powered image generation and editing</p>
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
