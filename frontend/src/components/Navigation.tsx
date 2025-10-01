"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Temporary simple icons until lucide-react is installed
const ImageIcon = () => <span>🖼️</span>;
const PlusIcon = () => <span>➕</span>;
const GalleryIcon = () => <span>🖥️</span>;
const Settings = () => <span>⚙️</span>;

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/create", label: "Create", icon: PlusIcon },
    { href: "/edit", label: "Edit", icon: ImageIcon },
    { href: "/gallery", label: "Gallery", icon: GalleryIcon },
    { href: "/admin", label: "Admin", icon: Settings },
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
              <ImageIcon />
              <span className="text-xl font-bold text-gray-100">Generative Imagining</span>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
                    }`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom App Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#2a2a2a] border-t border-gray-700 z-50">
        <div className="flex justify-around items-center h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded text-xs font-medium transition-colors ${
                  isActive ? "text-blue-500" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
