import { prisma } from "./prisma";

export async function getCreditsDueToday(vendedorId?: number) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  return prisma.credit.findMany({
    where: {
      activo: true,
      ...(vendedorId ? { vendedorId } : {}),
      proximoVencimiento: {
        gte: hoy,
        lt: manana,
      },
      saldo: {
        gt: 0,
      },
    },
    include: {
      client: true,
      vendedor: true,
    },
    orderBy: {
      proximoVencimiento: "asc",
    },
  });
}

export async function getOverdueCredits(vendedorId?: number) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return prisma.credit.findMany({
    where: {
      activo: true,
      ...(vendedorId ? { vendedorId } : {}),
      proximoVencimiento: {
        lt: hoy,
      },
      saldo: {
        gt: 0,
      },
    },
    include: {
      client: true,
      vendedor: true,
    },
    orderBy: {
      proximoVencimiento: "asc",
    },
  });
}

export async function getClientsBySeller(vendedorId: number) {
  return prisma.client.findMany({
    where: {
      vendedorId,
      activo: true,
    },
    include: {
      credits: true,
      vendedor: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });
}
