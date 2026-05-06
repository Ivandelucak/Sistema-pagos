import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const ROOT_ADMIN_EMAIL = "ivan.admin@credifer";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const userId = Number(id);

    const body = await req.json();
    const password = String(body.password ?? "");

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
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
        {
          error:
            "No se puede modificar la contraseña del administrador principal",
        },
        { status: 403 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cambiar contraseña";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
