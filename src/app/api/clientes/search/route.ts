import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EstadoCuenta = "pendientes" | "saldadas" | "todas";

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

    const estadoParam = searchParams.get("estado");
    const estado: EstadoCuenta =
      estadoParam === "saldadas" || estadoParam === "todas"
        ? estadoParam
        : "pendientes";

    const vendedorIdParam = searchParams.get("vendedorId");
    const vendedorIdFromQuery = vendedorIdParam
      ? Number(vendedorIdParam)
      : null;

    const vendedorIdFiltro =
      user.rol === "VENDEDOR"
        ? user.id
        : vendedorIdFromQuery !== null &&
            Number.isInteger(vendedorIdFromQuery) &&
            vendedorIdFromQuery > 0
          ? vendedorIdFromQuery
          : undefined;

    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const normalizedQuery = normalizeText(q);

    const clientes = await prisma.client.findMany({
      where: {
        activo: true,
        ...(Number.isInteger(vendedorIdFiltro)
          ? {
              OR: [
                {
                  vendedorId: vendedorIdFiltro,
                },
                {
                  credits: {
                    some: {
                      vendedorId: vendedorIdFiltro,
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
        const cuentasVisibles = Number.isInteger(vendedorIdFiltro)
          ? cliente.credits.filter(
              (cuenta) => cuenta.vendedorId === vendedorIdFiltro,
            )
          : cliente.credits;

        const tienePendientes = cuentasVisibles.some(
          (cuenta) => cuenta.saldo > 0,
        );

        const tieneSaldadas = cuentasVisibles.some(
          (cuenta) => cuenta.saldo <= 0,
        );

        if (estado === "pendientes" && !tienePendientes) return false;
        if (estado === "saldadas" && !tieneSaldadas) return false;
        if (estado === "todas" && cuentasVisibles.length === 0) return false;

        const fields = [
          cliente.nombre,
          cliente.telefono ?? "",
          cliente.direccion ?? "",
          cliente.vendedor.nombre,
          ...cuentasVisibles.map((cuenta) => cuenta.tipo),
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
      const cuentasVisibles = Number.isInteger(vendedorIdFiltro)
        ? cliente.credits.filter(
            (cuenta) => cuenta.vendedorId === vendedorIdFiltro,
          )
        : cliente.credits;

      const cuentasPendientes = cuentasVisibles.filter(
        (cuenta) => cuenta.saldo > 0,
      );

      const cuentasSaldadas = cuentasVisibles.filter(
        (cuenta) => cuenta.saldo <= 0,
      );

      const saldoPendiente = cuentasPendientes.reduce(
        (acc, cuenta) => acc + cuenta.saldo,
        0,
      );

      return {
        id: cliente.id,
        nombre: cliente.nombre,
        vendedor: cliente.vendedor.nombre,
        cuentasActivas: cuentasPendientes.length,
        cuentasSaldadas: cuentasSaldadas.length,
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
