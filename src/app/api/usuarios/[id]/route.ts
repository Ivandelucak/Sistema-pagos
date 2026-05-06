import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const ROOT_ADMIN_EMAIL = "ivan.admin@credifer";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireAdmin();

    const { id } = await params;
    const userId = Number(id);

    const body = await req.json();
    const activo = Boolean(body.activo);

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    if (user.email === ROOT_ADMIN_EMAIL && !activo) {
      return NextResponse.json(
        { error: "No se puede desactivar el administrador principal" },
        { status: 403 },
      );
    }

    if (userId === currentUser.id && !activo) {
      return NextResponse.json(
        { error: "No podés desactivar tu propio usuario" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        activo,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al modificar usuario";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireAdmin();

    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "No podés eliminar tu propio usuario" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        rol: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    if (user.email === ROOT_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "No se puede eliminar el administrador principal" },
        { status: 403 },
      );
    }

    const clientsCount = await prisma.client.count({
      where: {
        vendedorId: userId,
      },
    });

    const creditsCount = await prisma.credit.count({
      where: {
        vendedorId: userId,
      },
    });

    const paymentsCount = await prisma.payment.count({
      where: {
        registradoPor: userId,
      },
    });

    if (clientsCount > 0 || creditsCount > 0 || paymentsCount > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar este usuario porque tiene clientes, cuentas o pagos asociados. Podés desactivarlo para que no pueda ingresar.",
        },
        { status: 400 },
      );
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al eliminar usuario";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
