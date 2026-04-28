import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold text-slate-950">
            Sistema de pagos
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Inicio
            </Link>

            <Link
              href="/hoy"
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Cobros del día
            </Link>

            <Link
              href="/clientes"
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Clientes
            </Link>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
