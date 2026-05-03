import Image from "next/image";

export default function LoginShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-900/95 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14">
              <Image
                src="/logo.png"
                alt="Credifer"
                fill
                priority
                className="object-contain"
              />
            </div>

            <div className="leading-tight">
              <p className="text-sm font-semibold leading-none text-slate-100">
                Credifer
              </p>
              <p className="text-xs text-slate-400">Sistema de gestión</p>
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
