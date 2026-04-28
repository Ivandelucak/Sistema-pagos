import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const token = req.cookies.get("sistema_pagos_session");

  // Si NO está logueado y quiere ir a ruta privada → login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Si está logueado y va a /login → lo mandamos al inicio
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: ["/", "/clientes/:path*", "/cuentas/:path*", "/hoy", "/api/:path*"],
};
