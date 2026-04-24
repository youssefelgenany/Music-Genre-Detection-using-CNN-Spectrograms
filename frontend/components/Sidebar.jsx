"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, History, Library, Plus } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onLibrary =
    pathname === "/library" || pathname.startsWith("/library/");

  const base =
    "mx-2 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition";
  const inactive =
    "bg-surface-container-high text-on-background shadow-sm hover:bg-surface-container-highest hover:shadow-md";
  const active =
    "bg-gradient-to-br from-primary to-primary-container text-white shadow-lg shadow-accent/25 hover:translate-x-0.5 hover:shadow-xl hover:brightness-110";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col gap-2 border-r border-outline/20 bg-background/50 py-6 md:flex">
      <div className="mb-8 px-4">
        <h2 className="font-headline font-black text-accent">Gen Scope</h2>
        <p className="text-xs font-medium text-on-surface-variant">
          Sonic Curator
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Link href="/" className={`${base} ${onHome ? active : inactive}`}>
          <Activity className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="font-body">Analyze</span>
        </Link>
        <Link href="/library" className={`${base} ${onLibrary ? active : inactive}`}>
          <Library className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="font-body">Library</span>
        </Link>
        <span
          className={`${base} cursor-not-allowed bg-surface-container-high/50 text-on-surface-variant`}
          title="Coming soon"
        >
          <History className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="font-body">History</span>
        </span>
      </div>
      <div className="mt-12 px-2">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
        >
          <Plus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
          New Analysis
        </Link>
      </div>
    </aside>
  );
}
