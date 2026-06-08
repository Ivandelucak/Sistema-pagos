import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();

    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
    }

    const body = await req.json();

    const stock = Number(body.stock);
    const lowStockAlert = Number(body.lowStockAlert);
    const note = String(body.note ?? "").trim();

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
    }

    if (!Number.isInteger(lowStockAlert) || lowStockAlert < 0) {
      return NextResponse.json(
        { error: "Alerta de stock bajo inválida" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.stockProduct.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          stock: true,
          lowStockAlert: true,
        },
      });

      if (!product) {
        throw new Error("Producto no encontrado");
      }

      const previousStock = product.stock;
      const quantity = stock - previousStock;
      const stockChanged = stock !== previousStock;
      const alertChanged = lowStockAlert !== product.lowStockAlert;

      const updated = await tx.stockProduct.update({
        where: {
          id: productId,
        },
        data: {
          stock,
          lowStockAlert,
        },
      });

      if (stockChanged) {
        await tx.stockMovement.create({
          data: {
            productId,
            type: "ADJUSTMENT",
            quantity,
            previousStock,
            newStock: stock,
            userId: user.id,
            note: note || "Ajuste manual de stock",
          },
        });
      } else if (alertChanged) {
        await tx.stockMovement.create({
          data: {
            productId,
            type: "EDIT",
            quantity: 0,
            previousStock,
            newStock: stock,
            userId: user.id,
            note: note || "Cambio de alerta de stock bajo",
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ ok: true, product: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al ajustar stock";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
