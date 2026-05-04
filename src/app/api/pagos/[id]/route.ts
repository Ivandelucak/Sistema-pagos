import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateCredit } from "@/lib/recalculate-credit";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const paymentId = Number(id);

    if (!Number.isInteger(paymentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        creditId: true,
      },
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
    await requireAdmin();

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
      include: {
        credit: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 },
      );
    }

    const credit = payment.credit;

    const totalPagadoSinEstePago = credit.payments.reduce((acc, pago) => {
      if (pago.id === payment.id) return acc;

      return acc + pago.monto;
    }, 0);

    const nuevoTotalPagado = totalPagadoSinEstePago + monto;

    if (nuevoTotalPagado > credit.total) {
      return NextResponse.json(
        {
          error:
            "El nuevo monto hace que el total pagado supere el total de la cuenta",
        },
        { status: 400 },
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
