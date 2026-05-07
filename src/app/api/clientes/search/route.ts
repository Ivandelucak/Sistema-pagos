//src/app/api/clientes/search/route.ts

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const normalizedQuery = normalizeText(q);

    const clientes = await prisma.client.findMany({
      where: {
        activo: true,
        ...(user.rol === "VENDEDOR"
          ? {
              OR: [
                {
                  vendedorId: user.id,
                },
                {
                  credits: {
                    some: {
                      vendedorId: user.id,
                      activo: true,
                    },
                  },
                },
              ],
            }
          : {}),
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
      orderBy: {
        nombre: "asc",
      },
      take: 1500,
    });

    const filtered = clientes
      .filter((cliente) => {
        const fields = [
          cliente.nombre,
          cliente.telefono ?? "",
          cliente.direccion ?? "",
          cliente.vendedor.nombre,
        ];

        return fields.some((field) =>
          normalizeText(field).includes(normalizedQuery),
        );
      })
      .sort((a, b) => {
        const aName = normalizeText(a.nombre);
        const bName = normalizeText(b.nombre);

        const aExact = aName === normalizedQuery ? 0 : 1;
        const bExact = bName === normalizedQuery ? 0 : 1;

        if (aExact !== bExact) return aExact - bExact;

        const aStarts = aName.startsWith(normalizedQuery) ? 0 : 1;
        const bStarts = bName.startsWith(normalizedQuery) ? 0 : 1;

        if (aStarts !== bStarts) return aStarts - bStarts;

        return aName.localeCompare(bName);
      })
      .slice(0, 8);

    const results = filtered.map((cliente) => {
      const cuentasVisibles =
        user.rol === "VENDEDOR"
          ? cliente.credits.filter((cuenta) => cuenta.vendedorId === user.id)
          : cliente.credits;

      const cuentasActivas = cuentasVisibles.filter(
        (cuenta) => cuenta.saldo > 0,
      );

      const saldoPendiente = cuentasActivas.reduce(
        (acc, cuenta) => acc + cuenta.saldo,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al buscar clientes";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
