import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateCredit } from "@/lib/recalculate-credit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const paymentId = Number(id);

    if (!Number.isInteger(paymentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 },
      );
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    await recalculateCredit(payment.creditId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const paymentId = Number(id);
    const body = await req.json();
    const monto = Number(body.monto);

    if (!Number.isInteger(paymentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 },
      );
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { monto },
    });

    await recalculateCredit(payment.creditId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al editar pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
