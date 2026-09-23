import { SiteHeader } from "./SiteHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Синтетический датасет HackAlem AI. Числа считает код, тексты пишет LLM.
        </p>
      </footer>
    </>
  );
}
