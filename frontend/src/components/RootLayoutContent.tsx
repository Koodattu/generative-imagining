"use client";

import { usePathname } from "next/navigation";

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't wrap /shared routes with container padding
  if (pathname.startsWith("/shared")) {
    return <>{children}</>;
  }

  return <main className="container mx-auto px-4 py-4 pb-20 md:py-8 md:pb-8">{children}</main>;
}
