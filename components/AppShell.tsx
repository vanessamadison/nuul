"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/receipts", label: "Receipts" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen px-4 pb-12 pt-6 sm:px-6 lg:px-12">
      <nav className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 transition hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] sm:text-xs">Back</span>
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.4em] text-white/80 transition hover:text-white sm:text-sm"
        >
          NUUL
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[0.6rem] uppercase tracking-[0.15em] transition sm:text-[0.65rem] sm:tracking-[0.2em] ${
                pathname === link.href
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mt-8 sm:mt-10">{children}</main>
    </div>
  );
}
