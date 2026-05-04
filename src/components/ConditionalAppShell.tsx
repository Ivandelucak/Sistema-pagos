import AppShell from "@/components/AppShell";
import LoginShell from "@/components/LoginShell";
import { getCurrentUser } from "@/lib/auth";

export default async function ConditionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return <LoginShell>{children}</LoginShell>;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
