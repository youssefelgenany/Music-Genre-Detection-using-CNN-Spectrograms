"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleUser, History, Library } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onLibrary =
    pathname === "/library" || pathname.startsWith("/library/");

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-outline/25 bg-surface/95 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-headline text-2xl font-black tracking-tight text-on-background transition hover:text-accent"
            >
              Gen Scope
            </Link>
            <nav className="hidden items-center gap-3 md:flex">
              <Link
                href="/"
                className={`rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition hover:shadow-md ${
                  onHome
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-surface-container-high font-medium text-on-background hover:bg-surface-container-highest"
                }`}
              >
                Analyze
              </Link>
              <Link
                href="/library"
                className={`rounded-lg px-4 py-2 text-sm shadow-sm transition hover:shadow-md ${
                  onLibrary
                    ? "bg-blue-600 font-bold text-white hover:bg-blue-700"
                    : "bg-surface-container-high font-medium text-on-background hover:bg-surface-container-highest"
                }`}
              >
                Library
              </Link>
              <span
                className="cursor-not-allowed rounded-lg bg-surface-container-high/60 px-4 py-2 text-sm font-medium text-on-surface-variant"
                title="Coming soon"
              >
                History
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full bg-surface-container-high p-2 text-accent shadow-sm transition hover:bg-surface-container-highest hover:text-blue-300 hover:shadow-md active:scale-95"
              aria-label="Account"
            >
              <CircleUser
                className="h-7 w-7 shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </header>

      <nav className="glass-card fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-outline/30 px-2 py-3 sm:px-8 md:hidden">
        <Link
          href="/"
          className={`flex min-w-[4.75rem] flex-col items-center gap-1 rounded-xl px-3 py-2.5 shadow-md transition hover:shadow-lg ${
            onHome
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-surface-container-high text-on-background shadow-sm hover:bg-surface-container-highest"
          }`}
        >
          <Activity className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Analyze
          </span>
        </Link>
        <Link
          href="/library"
          className={`flex min-w-[4.75rem] flex-col items-center gap-1 rounded-xl px-3 py-2.5 shadow-md transition hover:shadow-md ${
            onLibrary
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-surface-container-high text-on-background shadow-sm hover:bg-surface-container-highest"
          }`}
        >
          <Library className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Library
          </span>
        </Link>
        <span
          className="flex min-w-[4.75rem] cursor-not-allowed flex-col items-center gap-1 rounded-xl bg-surface-container-high/60 px-3 py-2.5 text-on-surface-variant opacity-80"
          title="Coming soon"
        >
          <History className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            History
          </span>
        </span>
      </nav>
    </>
  );
}
