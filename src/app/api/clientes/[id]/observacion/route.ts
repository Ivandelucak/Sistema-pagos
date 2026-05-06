import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const clientId = Number(id);

    const body = await req.json();
    const observacion = String(body.observacion ?? "").trim();

    if (!Number.isInteger(clientId)) {
      return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
    }

    if (observacion.length > 2000) {
      return NextResponse.json(
        { error: "La observación no puede superar los 2000 caracteres" },
        { status: 400 },
      );
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        observacion: observacion || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al guardar observación";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
