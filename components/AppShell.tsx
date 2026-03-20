"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/receipts", label: "Receipts" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  // Secondary pages (receipts, settings) go back to /studio
  // Studio goes back to / (home). Anywhere else: browser history.
  const handleBack = () => {
    if (pathname === "/receipts" || pathname === "/settings") {
      router.push("/studio");
    } else if (pathname === "/studio") {
      router.push("/");
    } else if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="relative min-h-screen px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      {/* Nav — max width centered, NUUL always absolutely centred */}
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between">
        {/* Back — left anchor */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-white/40 transition hover:text-white/80 z-10"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[0.6rem] uppercase tracking-[0.25em]">Back</span>
        </button>

        {/* NUUL — absolutely centred regardless of sibling widths */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 text-[0.7rem] font-semibold tracking-[0.5em] text-white/80 transition hover:text-white sm:text-xs"
        >
          NUUL
        </Link>

        {/* Right nav pills */}
        <div className="flex items-center gap-2 z-10">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] transition ${
                  active
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:bg-white/5 hover:text-white/75"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content — max width centered */}
      <main className="mx-auto mt-8 max-w-6xl sm:mt-10">
        {children}
      </main>
    </div>
  );
}
