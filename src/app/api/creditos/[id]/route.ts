//src/app/api/creditos/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  calculateCreditTracking,
  parseDateInputAsDateOnly,
} from "@/lib/credit-calculations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();

    const { id } = await params;
    const creditId = Number(id);

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    const body = await req.json();

    const existingCredit = await prisma.credit.findUnique({
      where: { id: creditId },
      select: {
        id: true,
        clientId: true,
        montoPagado: true,
        activo: true,
      },
    });

    if (!existingCredit) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 },
      );
    }

    const isOnlyStatusUpdate =
      typeof body.activo === "boolean" &&
      body.tipo === undefined &&
      body.fechaInicio === undefined &&
      body.frecuenciaDias === undefined &&
      body.total === undefined &&
      body.cantidadCuotas === undefined &&
      body.vendedorId === undefined;

    if (isOnlyStatusUpdate) {
      const nextActivo = Boolean(body.activo);

      if (nextActivo === existingCredit.activo) {
        return NextResponse.json({
          ok: true,
          message: "La cuenta ya tiene ese estado.",
        });
      }

      const credit = await prisma.$transaction(async (tx) => {
        const creditWithProducts = await tx.credit.findUnique({
          where: {
            id: creditId,
          },
          select: {
            id: true,
            activo: true,
            products: {
              select: {
                productId: true,
                quantity: true,
                productCodeSnapshot: true,
                productNameSnapshot: true,
                product: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    stock: true,
                  },
                },
              },
            },
          },
        });

        if (!creditWithProducts) {
          throw new Error("Cuenta no encontrada");
        }

        if (nextActivo) {
          for (const item of creditWithProducts.products) {
            if (item.product.stock < item.quantity) {
              throw new Error(
                `Stock insuficiente para reactivar la cuenta. Producto ${item.productCodeSnapshot} · ${item.productNameSnapshot}. Stock actual: ${item.product.stock}, requerido: ${item.quantity}.`,
              );
            }
          }
        }

        const updatedCredit = await tx.credit.update({
          where: {
            id: creditId,
          },
          data: {
            activo: nextActivo,
          },
        });

        for (const item of creditWithProducts.products) {
          const previousStock = item.product.stock;

          if (nextActivo) {
            const newStock = previousStock - item.quantity;

            await tx.stockProduct.update({
              where: {
                id: item.productId,
              },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "SALE",
                quantity: -item.quantity,
                previousStock,
                newStock,
                creditId,
                userId: user.id,
                note: `Reactivación de cuenta #${creditId}`,
              },
            });
          } else {
            const newStock = previousStock + item.quantity;

            await tx.stockProduct.update({
              where: {
                id: item.productId,
              },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "RETURN",
                quantity: item.quantity,
                previousStock,
                newStock,
                creditId,
                userId: user.id,
                note: `Baja de cuenta #${creditId}`,
              },
            });
          }
        }

        return updatedCredit;
      });

      return NextResponse.json({ ok: true, credit });
    }

    const tipo = String(body.tipo ?? "").trim();
    const fechaInicio = parseDateInputAsDateOnly(body.fechaInicio);
    const frecuenciaDias = Number(body.frecuenciaDias);
    const total = Number(body.total);
    const cantidadCuotas = Number(body.cantidadCuotas);
    const vendedorId = Number(body.vendedorId);

    if (
      !tipo ||
      !fechaInicio ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0 ||
      !Number.isInteger(vendedorId)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (total < existingCredit.montoPagado) {
      return NextResponse.json(
        {
          error: "El total no puede ser menor al monto ya pagado de la cuenta.",
        },
        { status: 400 },
      );
    }

    const vendedor = await prisma.user.findFirst({
      where: {
        id: vendedorId,
        rol: "VENDEDOR",
        activo: true,
      },
      select: {
        id: true,
      },
    });

    if (!vendedor) {
      return NextResponse.json(
        { error: "El vendedor seleccionado no existe o no está activo" },
        { status: 400 },
      );
    }

    const valorCuota = total / cantidadCuotas;

    const tracking = calculateCreditTracking({
      fechaInicio,
      frecuenciaDias,
      valorCuota,
      total,
      montoPagado: existingCredit.montoPagado,
    });

    const credit = await prisma.credit.update({
      where: { id: creditId },
      data: {
        vendedorId,
        tipo,
        fechaInicio,
        frecuenciaDias,
        cantidadCuotas,
        valorCuota,
        total,
        saldo: tracking.saldo,
        cuotasPagadas: tracking.cuotasPagadas,
        cuotasRestantes: tracking.cuotasRestantes,
        proximoVencimiento: tracking.proximoVencimiento,
        estado: tracking.estado,
      },
    });

    return NextResponse.json({ ok: true, credit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
