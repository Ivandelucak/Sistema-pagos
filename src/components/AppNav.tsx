"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    mobileLabel: "Inicio",
  },
  {
    href: "/hoy",
    label: "Cobros del día",
    mobileLabel: "Cobros",
  },
  {
    href: "/clientes",
    label: "Clientes",
    mobileLabel: "Clientes",
  },
  {
    href: "/productos",
    label: "Productos",
    mobileLabel: "Productos",
  },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full items-center gap-1 overflow-x-auto text-sm md:w-auto md:overflow-visible">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-2 font-medium transition-all ${
              active
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-300 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="sm:hidden">{item.mobileLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
