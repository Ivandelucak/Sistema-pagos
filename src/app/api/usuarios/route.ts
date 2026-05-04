import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const VALID_ROLES = ["ADMIN", "VENDEDOR"] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(value: string): value is ValidRole {
  return VALID_ROLES.includes(value as ValidRole);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    const nombre = String(body.nombre ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const rol = String(body.rol ?? "")
      .trim()
      .toUpperCase();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "El email es inválido" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    if (!isValidRole(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol,
        activo: true,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear usuario";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
