//src/app/api/creditos/[id]/productos/route.ts

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
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
    const products = parseProducts(body.products);

    const result = await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: {
          id: creditId,
        },
        select: {
          id: true,
          activo: true,
          products: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              productCodeSnapshot: true,
              productNameSnapshot: true,
              cashPriceSnapshot: true,
              financedPriceSnapshot: true,
              costSnapshot: true,
            },
          },
        },
      });

      if (!credit) {
        throw new Error("Cuenta no encontrada");
      }

      const oldProductsById = new Map(
        credit.products.map((item) => [item.productId, item]),
      );

      const newProductsById = new Map(
        products.map((item) => [item.productId, item]),
      );

      const productIds = Array.from(
        new Set([
          ...credit.products.map((item) => item.productId),
          ...products.map((item) => item.productId),
        ]),
      );

      const stockProducts =
        productIds.length > 0
          ? await tx.stockProduct.findMany({
              where: {
                id: {
                  in: productIds,
                },
              },
              select: {
                id: true,
                code: true,
                name: true,
                cost: true,
                cashPrice: true,
                financedPrice: true,
                stock: true,
                active: true,
              },
            })
          : [];

      if (stockProducts.length !== productIds.length) {
        throw new Error("Uno o más productos seleccionados no existen.");
      }

      const stockProductById = new Map(
        stockProducts.map((product) => [product.id, product]),
      );

      for (const selectedProduct of products) {
        const product = stockProductById.get(selectedProduct.productId);

        if (!product) {
          throw new Error("Producto inválido.");
        }

        const oldQuantity =
          oldProductsById.get(selectedProduct.productId)?.quantity ?? 0;

        if (!product.active && selectedProduct.quantity > oldQuantity) {
          throw new Error(
            `El producto ${product.code} · ${product.name} está dado de baja. Solo podés quitarlo o reducir su cantidad.`,
          );
        }
      }

      if (credit.activo) {
        for (const productId of productIds) {
          const product = stockProductById.get(productId);

          if (!product) {
            throw new Error("Producto inválido.");
          }

          const oldQuantity = oldProductsById.get(productId)?.quantity ?? 0;
          const newQuantity = newProductsById.get(productId)?.quantity ?? 0;

          const finalStock = product.stock + oldQuantity - newQuantity;

          if (finalStock < 0) {
            throw new Error(
              `Stock insuficiente para ${product.code} · ${product.name}. Stock actual: ${product.stock}, asignado en esta cuenta: ${oldQuantity}, requerido nuevo: ${newQuantity}.`,
            );
          }
        }
      }

      await tx.creditProduct.deleteMany({
        where: {
          creditId,
        },
      });

      for (const selectedProduct of products) {
        const product = stockProductById.get(selectedProduct.productId);

        if (!product) {
          throw new Error("Producto inválido.");
        }

        const oldSnapshot = oldProductsById.get(selectedProduct.productId);

        await tx.creditProduct.create({
          data: {
            creditId,
            productId: product.id,
            quantity: selectedProduct.quantity,
            productCodeSnapshot:
              oldSnapshot?.productCodeSnapshot ?? product.code,
            productNameSnapshot:
              oldSnapshot?.productNameSnapshot ?? product.name,
            cashPriceSnapshot:
              oldSnapshot?.cashPriceSnapshot ?? product.cashPrice,
            financedPriceSnapshot:
              oldSnapshot?.financedPriceSnapshot ?? product.financedPrice,
            costSnapshot: oldSnapshot?.costSnapshot ?? product.cost,
          },
        });
      }

      if (credit.activo) {
        for (const productId of productIds) {
          const product = stockProductById.get(productId);

          if (!product) {
            throw new Error("Producto inválido.");
          }

          const oldQuantity = oldProductsById.get(productId)?.quantity ?? 0;
          const newQuantity = newProductsById.get(productId)?.quantity ?? 0;

          const stockDelta = oldQuantity - newQuantity;

          if (stockDelta === 0) continue;

          const previousStock = product.stock;
          const newStock = previousStock + stockDelta;

          await tx.stockProduct.update({
            where: {
              id: product.id,
            },
            data: {
              stock: newStock,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "EDIT",
              quantity: stockDelta,
              previousStock,
              newStock,
              creditId,
              userId: user.id,
              note: `Edición de productos asociados a cuenta #${creditId}`,
            },
          });
        }
      }

      return {
        ok: true,
        activeCredit: credit.activo,
        productsCount: products.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al editar productos de la cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
