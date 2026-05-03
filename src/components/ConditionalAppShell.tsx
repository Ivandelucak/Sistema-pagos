"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/components/AppShell";
import LoginShell from "@/components/LoginShell";

export default function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <LoginShell>{children}</LoginShell>;
  }

  return <AppShell>{children}</AppShell>;
}
