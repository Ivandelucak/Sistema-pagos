import { NextResponse } from "next/server";
import { registerPayment } from "@/lib/payments";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const creditId = Number(body.creditId);
    const monto = Number(body.monto);

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    await registerPayment({
      creditId,
      monto,
      userId: 2,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al registrar cobro";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
