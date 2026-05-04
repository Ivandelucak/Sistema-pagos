import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import AppNav from "@/components/AppNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="group flex items-center gap-3 transition hover:opacity-90"
            >
              <div className="relative h-12 w-12 sm:h-14 sm:w-14">
                <Image
                  src="/logo.png"
                  alt="Credifer"
                  fill
                  priority
                  className="object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              <div className="leading-tight">
                <p className="text-sm font-semibold leading-none text-slate-100">
                  Credifer
                </p>
                <p className="text-xs text-slate-400">Sistema de gestión</p>
              </div>
            </Link>

            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <AppNav />

            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="animate-fade-in">{children}</div>
    </div>
  );
}
