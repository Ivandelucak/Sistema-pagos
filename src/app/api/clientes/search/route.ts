import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const clientes = await prisma.client.findMany({
      where: {
        activo: true,
        ...(user.rol === "VENDEDOR" ? { vendedorId: user.id } : {}),
        nombre: {
          contains: q,
        },
      },
      include: {
        vendedor: true,
        credits: {
          where: {
            activo: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      take: 8,
      orderBy: {
        nombre: "asc",
      },
    });

    const results = clientes.map((cliente) => {
      const cuentasActivas = cliente.credits.filter((c) => c.saldo > 0);

      const saldoPendiente = cuentasActivas.reduce(
        (acc, c) => acc + c.saldo,
        0,
      );

      return {
        id: cliente.id,
        nombre: cliente.nombre,
        vendedor: cliente.vendedor.nombre,
        cuentasActivas: cuentasActivas.length,
        saldoPendiente,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
