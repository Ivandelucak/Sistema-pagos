import { prisma } from "./prisma";
import {
  addDaysToDateOnly,
  getBusinessTodayDateOnly,
} from "./credit-calculations";

export async function getCreditsDueToday(vendedorId?: number) {
  const hoy = getBusinessTodayDateOnly();
  const manana = addDaysToDateOnly(hoy, 1);

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
  const hoy = getBusinessTodayDateOnly();

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
      activo: true,
      OR: [
        {
          vendedorId,
        },
        {
          credits: {
            some: {
              vendedorId,
            },
          },
        },
      ],
    },
    include: {
      credits: {
        where: {
          vendedorId,
        },
      },
      vendedor: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });
}
