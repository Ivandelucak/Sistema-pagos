import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "26Mar2004",
  database: "sistema_pagos",
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  // 1. Clientes que vencen hoy
  const hoyClientes = await prisma.credit.findMany({
    where: {
      proximoVencimiento: {
        gte: hoy,
        lt: manana,
      },
    },
    include: {
      client: true,
    },
  });

  console.log("CLIENTES DEL DÍA:", hoyClientes.length);

  // 2. Clientes vencidos
  const vencidos = await prisma.credit.findMany({
    where: {
      proximoVencimiento: {
        lt: hoy,
      },
      saldo: {
        gt: 0,
      },
    },
    include: {
      client: true,
    },
  });

  console.log("CLIENTES VENCIDOS:", vencidos.length);

  // 3. Clientes de un vendedor (ej: Dani id = 2)
  const misClientes = await prisma.client.findMany({
    where: {
      vendedorId: 2,
    },
  });

  console.log("MIS CLIENTES:", misClientes.length);
}

main();
