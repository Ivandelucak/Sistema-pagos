import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const creditId = Number(id);
    const body = await req.json();

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    if (typeof body.activo !== "boolean") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const credit = await prisma.credit.update({
      where: { id: creditId },
      data: {
        activo: body.activo,
      },
    });

    return NextResponse.json({ ok: true, credit });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al actualizar cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
