//src/lib/balance-permissions.ts

type UserForBalancePermissions = {
  email: string;
  rol: "ADMIN" | "VENDEDOR";
};

const FALLBACK_PENDING_BALANCES_ADMIN_EMAILS = ["ivan.admin@credifer"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAllowedEmails() {
  const fromEnv = process.env.PENDING_BALANCES_ADMIN_EMAILS;

  if (!fromEnv) {
    return FALLBACK_PENDING_BALANCES_ADMIN_EMAILS.map(normalizeEmail);
  }

  return fromEnv.split(",").map(normalizeEmail).filter(Boolean);
}

export function canViewPendingBalances(user: UserForBalancePermissions) {
  if (user.rol !== "ADMIN") return false;

  const allowedEmails = getAllowedEmails();

  return allowedEmails.includes(normalizeEmail(user.email));
}
