//src/app/api/creditos/route.ts

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  calculateCreditTracking,
  parseDateInputAsDateOnly,
} from "@/lib/credit-calculations";
import { prisma } from "@/lib/prisma";

type ProductInput = {
  productId: number;
  quantity: number;
};

function parseProducts(value: unknown): ProductInput[] {
  if (!Array.isArray(value)) return [];

  const grouped = new Map<number, number>();

  for (const item of value) {
    const raw = item as {
      productId?: unknown;
      quantity?: unknown;
    };

    const productId = Number(raw.productId);
    const quantity = Number(raw.quantity);

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      continue;
    }

    grouped.set(productId, (grouped.get(productId) ?? 0) + quantity);
  }

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();

    const body = await req.json();

    const clientId = Number(body.clientId);
    const vendedorId = Number(body.vendedorId);
    const tipo = String(body.tipo ?? "").trim();
    const fechaInicio = parseDateInputAsDateOnly(body.fechaInicio);
    const frecuenciaDias = Number(body.frecuenciaDias);
    const total = Number(body.total);
    const cantidadCuotas = Number(body.cantidadCuotas);
    const products = parseProducts(body.products);

    if (
      !Number.isInteger(clientId) ||
      !Number.isInteger(vendedorId) ||
      !tipo ||
      !fechaInicio ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        activo: true,
      },
    });

    if (!cliente || !cliente.activo) {
      return NextResponse.json(
        { error: "Cliente inválido o dado de baja" },
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
      montoPagado: 0,
    });

    const result = await prisma.$transaction(async (tx) => {
      const stockProducts =
        products.length > 0
          ? await tx.stockProduct.findMany({
              where: {
                id: {
                  in: products.map((product) => product.productId),
                },
                active: true,
              },
              select: {
                id: true,
                code: true,
                name: true,
                cost: true,
                cashPrice: true,
                financedPrice: true,
                stock: true,
              },
            })
          : [];

      if (stockProducts.length !== products.length) {
        throw new Error(
          "Uno o más productos seleccionados no existen o están inactivos",
        );
      }

      const productById = new Map(
        stockProducts.map((product) => [product.id, product]),
      );

      for (const selectedProduct of products) {
        const product = productById.get(selectedProduct.productId);

        if (!product) {
          throw new Error("Producto inválido");
        }

        if (product.stock < selectedProduct.quantity) {
          throw new Error(
            `Stock insuficiente para ${product.code} · ${product.name}. Stock actual: ${product.stock}`,
          );
        }
      }

      const credit = await tx.credit.create({
        data: {
          clientId,
          vendedorId,
          createdById: user.id,
          tipo,
          fechaInicio,
          frecuenciaDias,
          cantidadCuotas,
          valorCuota,
          total,
          montoPagado: 0,
          saldo: tracking.saldo,
          cuotasPagadas: 0,
          cuotasRestantes: cantidadCuotas,
          proximoVencimiento: tracking.proximoVencimiento,
          estado: tracking.estado,
          activo: true,
        },
      });

      for (const selectedProduct of products) {
        const product = productById.get(selectedProduct.productId);

        if (!product) {
          throw new Error("Producto inválido");
        }

        const previousStock = product.stock;
        const newStock = previousStock - selectedProduct.quantity;

        await tx.creditProduct.create({
          data: {
            creditId: credit.id,
            productId: product.id,
            quantity: selectedProduct.quantity,
            productCodeSnapshot: product.code,
            productNameSnapshot: product.name,
            cashPriceSnapshot: product.cashPrice,
            financedPriceSnapshot: product.financedPrice,
            costSnapshot: product.cost,
          },
        });

        await tx.stockProduct.update({
          where: {
            id: product.id,
          },
          data: {
            stock: {
              decrement: selectedProduct.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "SALE",
            quantity: -selectedProduct.quantity,
            previousStock,
            newStock,
            creditId: credit.id,
            userId: user.id,
            note: `Venta asociada a cuenta #${credit.id}`,
          },
        });
      }

      return credit;
    });

    return NextResponse.json({ ok: true, creditId: result.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
