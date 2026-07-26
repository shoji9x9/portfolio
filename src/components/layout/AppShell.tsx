import { Link } from "@tanstack/react-router";
import { type PropsWithChildren } from "react";

import { getCurrentYear } from "@/lib/date";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-6">
          <Link className="font-semibold tracking-tight" to="/">
            portfolio
          </Link>
          <nav aria-label="メインナビゲーション">
            <ul className="flex items-center gap-1">
              <li>
                <Link
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  to="/"
                >
                  Home
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-12">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">
          © {getCurrentYear()} portfolio
        </div>
      </footer>
    </div>
  );
}
