"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Library } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onLibrary =
    pathname === "/library" || pathname.startsWith("/library/");

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-outline/25 bg-surface/95 backdrop-blur-md">
        <div className="flex h-16 w-full min-w-0 items-center justify-start px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-headline text-2xl font-black tracking-tight text-on-background transition hover:text-accent sm:gap-2.5"
          >
            <img
              src="/logo.png"
              alt=""
              className="h-[36px] w-auto shrink-0 object-contain"
              decoding="async"
              aria-hidden
            />
            <span className="truncate">Gen Scope</span>
          </Link>
        </div>
      </header>

      <nav className="glass-card fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-20 border-t border-outline/30 px-4 py-3 sm:gap-24 md:hidden">
        <Link
          href="/"
          className={`flex min-w-[5.5rem] flex-col items-center gap-1 rounded-full px-4 py-2.5 shadow-md transition-all duration-300 ease-out ${
            onHome
              ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-500 hover:to-blue-700 hover:shadow-lg"
              : "border border-outline/20 bg-surface-container-high/90 text-on-background shadow-sm hover:border-outline/30 hover:bg-surface-container-highest"
          }`}
        >
          <Activity className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Analyze
          </span>
        </Link>
        <Link
          href="/library"
          className={`flex min-w-[5.5rem] flex-col items-center gap-1 rounded-full px-4 py-2.5 shadow-md transition-all duration-300 ease-out ${
            onLibrary
              ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-500 hover:to-blue-700 hover:shadow-lg"
              : "border border-outline/20 bg-surface-container-high/90 text-on-background shadow-sm hover:border-outline/30 hover:bg-surface-container-highest"
          }`}
        >
          <Library className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Library
          </span>
        </Link>
      </nav>
    </>
  );
}
