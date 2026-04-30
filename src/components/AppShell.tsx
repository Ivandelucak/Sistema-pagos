import Link from "next/link";
import Image from "next/image";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="group flex items-center gap-3 transition hover:opacity-90"
          >
            <div className="relative h-12 w-12 sm:h-14 sm:w-14">
              <Image
                src="/logo.png"
                alt="Credifer"
                fill
                className="object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>

            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold leading-none text-slate-100">
                Credifer
              </p>
              <p className="text-xs text-slate-400">Sistema de gestión</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <NavItem href="/" label="Inicio" />
            <NavItem href="/hoy" label="Cobros del Día" />
            <NavItem href="/clientes" label="Clientes" />
          </nav>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="animate-fade-in">{children}</div>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 font-medium text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-900"
    >
      {label}
    </Link>
  );
}
