import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { MonthSwitcher } from "@/components/month-switcher";
import { SideNav } from "@/components/side-nav";

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-line bg-spine px-4 py-6 lg:flex">
        <div>
          <Brand />
          <Suspense fallback={null}>
            <SideNav />
          </Suspense>
        </div>
        <div className="px-2">
          <p className="truncate text-xs text-muted">{email}</p>
          <a href="/sair" className="mt-3 inline-flex text-sm text-muted hover:text-ink">
            Sair
          </a>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden lg:block" />
            <Suspense fallback={<div className="mx-auto h-12 w-48" />}>
              <MonthSwitcher />
            </Suspense>
            <a href="/sair" className="text-right text-sm text-muted lg:hidden">
              Sair
            </a>
            <div className="hidden lg:block" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
        <Suspense fallback={null}>
          <SideNav mobile />
        </Suspense>
      </div>
    </div>
  );
}
