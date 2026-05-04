import "dotenv/config";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { calculateCreditTracking } from "../src/lib/credit-calculations";

type VendorName = "Dani" | "Nico" | "Violeta" | "Paola" | "Gustavo";

type ImportSource = {
  fileName: string;
  sheets: {
    sheetAliases: string[];
    vendedor: VendorName;
  }[];
};

type ParsedRow = {
  fileName: string;
  sheetName: string;
  rowNumber: number;
  vendedor: VendorName;
  cliente: string;
  clienteKey: string;
  fechaInicio: Date;
  tipo: string;
  frecuenciaDias: number;
  valorCuota: number;
  total: number;
  montoPagado: number;
  cantidadCuotas: number;
};

type InvalidRow = {
  fileName: string;
  sheetName: string;
  rowNumber: number;
  vendedor: VendorName;
  cliente: string;
  reason: string;
};

const IMPORT_DIR = path.join(process.cwd(), "prisma", "imports");

const SOURCES: ImportSource[] = [
  {
    fileName: "Sistema clientes dani.xlsx",
    sheets: [
      {
        sheetAliases: ["clientes dani", "dani"],
        vendedor: "Dani",
      },
    ],
  },
  {
    fileName: "Sistema clientes (1).xlsx",
    sheets: [
      {
        sheetAliases: ["nico", "clientes nico"],
        vendedor: "Nico",
      },
      {
        sheetAliases: ["clientes violeta", "violeta"],
        vendedor: "Violeta",
      },
      {
        sheetAliases: ["clientes paola", "paola"],
        vendedor: "Paola",
      },
      {
        sheetAliases: ["clientes gustavo", "gustavo"],
        vendedor: "Gustavo",
      },
    ],
  },
];

const VENDORS: Record<
  VendorName,
  {
    nombre: string;
    email: string;
    defaultPassword: string;
  }
> = {
  Dani: {
    nombre: "Dani",
    email: "dani.cobrador@sistema.local",
    defaultPassword: "dani123",
  },
  Nico: {
    nombre: "Nico",
    email: "nico.cobrador@sistema.local",
    defaultPassword: "nico123",
  },
  Violeta: {
    nombre: "Violeta",
    email: "violeta.cobrador@sistema.local",
    defaultPassword: "violeta123",
  },
  Paola: {
    nombre: "Paola",
    email: "paola.cobrador@sistema.local",
    defaultPassword: "paola123",
  },
  Gustavo: {
    nombre: "Gustavo",
    email: "gustavo.cobrador@sistema.local",
    defaultPassword: "gustavo123",
  },
};

const COL = {
  CLIENTE: 0,
  FECHA: 1,
  TIPO: 2,
  FRECUENCIA: 3,
  VALOR_CUOTA: 4,
  SALDO: 5,
  TOTAL: 6,
  PAGO: 7,
  CUOTAS_PAGADAS: 11,
  CUOTAS_RESTANTES: 12,
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeSheetName(value: string) {
  return normalizeText(value);
}

function findSheetName({
  workbook,
  fileName,
  sheetAliases,
}: {
  workbook: XLSX.WorkBook;
  fileName: string;
  sheetAliases: string[];
}) {
  const availableSheets = workbook.SheetNames;

  const normalizedAliases = sheetAliases.map(normalizeSheetName);

  const found = availableSheets.find((sheetName) =>
    normalizedAliases.includes(normalizeSheetName(sheetName)),
  );

  if (!found) {
    throw new Error(
      [
        `No se encontró una hoja válida en ${fileName}.`,
        `Busqué: ${sheetAliases.join(" / ")}`,
        `Hojas disponibles: ${availableSheets.join(" / ")}`,
      ].join("\n"),
    );
  }

  return found;
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }

  const normalized = String(value)
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function excelSerialToLocalDate(serial: number) {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch);

  date.setDate(epoch.getDate() + Math.floor(serial));
  date.setHours(0, 0, 0, 0);

  return date;
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToLocalDate(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      const day = Number(iso[3]);

      return new Date(year, month - 1, day);
    }

    const arg = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (arg) {
      const day = Number(arg[1]);
      const month = Number(arg[2]);
      const year = Number(arg[3]);

      return new Date(year, month - 1, day);
    }
  }

  return null;
}

function getCantidadCuotas({
  total,
  valorCuota,
  cuotasPagadasExcel,
  cuotasRestantesExcel,
}: {
  total: number;
  valorCuota: number;
  cuotasPagadasExcel: number | null;
  cuotasRestantesExcel: number | null;
}) {
  if (
    cuotasPagadasExcel !== null &&
    cuotasRestantesExcel !== null &&
    cuotasPagadasExcel >= 0 &&
    cuotasRestantesExcel >= 0
  ) {
    const cantidad = Math.round(cuotasPagadasExcel + cuotasRestantesExcel);

    if (cantidad > 0) return cantidad;
  }

  return Math.max(Math.ceil(total / valorCuota), 1);
}

function parseRowsFromSheet({
  workbook,
  fileName,
  sheetAliases,
  vendedor,
}: {
  workbook: XLSX.WorkBook;
  fileName: string;
  sheetAliases: string[];
  vendedor: VendorName;
}) {
  const sheetName = findSheetName({
    workbook,
    fileName,
    sheetAliases,
  });

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`No existe la hoja "${sheetName}" en ${fileName}`);
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const parsedRows: ParsedRow[] = [];
  const invalidRows: InvalidRow[] = [];

  for (let index = 1; index < rawRows.length; index++) {
    const row = rawRows[index];
    const rowNumber = index + 1;

    const cliente = cleanText(row[COL.CLIENTE]);

    if (!cliente) continue;

    const fechaInicio = parseExcelDate(row[COL.FECHA]);
    const frecuenciaDias = parseNumber(row[COL.FRECUENCIA]);
    const valorCuota = parseNumber(row[COL.VALOR_CUOTA]);
    const total = parseNumber(row[COL.TOTAL]);
    const saldoExcel = parseNumber(row[COL.SALDO]);
    const pagoExcel = parseNumber(row[COL.PAGO]);
    const cuotasPagadasExcel = parseNumber(row[COL.CUOTAS_PAGADAS]);
    const cuotasRestantesExcel = parseNumber(row[COL.CUOTAS_RESTANTES]);

    const tipoRaw = cleanText(row[COL.TIPO]);
    const tipo = tipoRaw || "Cuenta";

    function reject(reason: string) {
      invalidRows.push({
        fileName,
        sheetName,
        rowNumber,
        vendedor,
        cliente,
        reason,
      });
    }

    if (!fechaInicio) {
      reject("Fecha inválida");
      continue;
    }

    if (
      frecuenciaDias === null ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0
    ) {
      reject("Frecuencia inválida");
      continue;
    }

    if (valorCuota === null || valorCuota <= 0) {
      reject("Valor de cuota inválido");
      continue;
    }

    if (total === null || total <= 0) {
      reject("Total inválido");
      continue;
    }

    const montoPagado =
      pagoExcel !== null
        ? pagoExcel
        : saldoExcel !== null
          ? Math.max(total - saldoExcel, 0)
          : 0;

    if (montoPagado < 0) {
      reject("Monto pagado negativo");
      continue;
    }

    if (montoPagado > total) {
      reject("Monto pagado mayor al total");
      continue;
    }

    const cantidadCuotas = getCantidadCuotas({
      total,
      valorCuota,
      cuotasPagadasExcel,
      cuotasRestantesExcel,
    });

    parsedRows.push({
      fileName,
      sheetName,
      rowNumber,
      vendedor,
      cliente,
      clienteKey: normalizeText(cliente),
      fechaInicio,
      tipo,
      frecuenciaDias,
      valorCuota,
      total,
      montoPagado,
      cantidadCuotas,
    });
  }

  return { parsedRows, invalidRows };
}

function loadExcelRows() {
  const allRows: ParsedRow[] = [];
  const allInvalidRows: InvalidRow[] = [];

  for (const source of SOURCES) {
    const filePath = path.join(IMPORT_DIR, source.fileName);

    const workbook = XLSX.readFile(filePath, {
      cellDates: false,
      raw: true,
    });

    for (const sheet of source.sheets) {
      const { parsedRows, invalidRows } = parseRowsFromSheet({
        workbook,
        fileName: source.fileName,
        sheetAliases: sheet.sheetAliases,
        vendedor: sheet.vendedor,
      });

      allRows.push(...parsedRows);
      allInvalidRows.push(...invalidRows);
    }
  }

  return {
    rows: allRows,
    invalidRows: allInvalidRows,
  };
}

async function ensureUsers() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "ivan.admin@sistema.local",
    },
    update: {
      nombre: "Ivan Admin",
      rol: "ADMIN",
      activo: true,
    },
    create: {
      nombre: "Ivan Admin",
      email: "ivan.admin@sistema.local",
      password: adminPassword,
      rol: "ADMIN",
      activo: true,
    },
  });

  const vendorIdByName = new Map<VendorName, number>();
  const canonicalVendorEmails = Object.values(VENDORS).map((v) => v.email);

  for (const [vendorName, config] of Object.entries(VENDORS) as [
    VendorName,
    (typeof VENDORS)[VendorName],
  ][]) {
    const password = await bcrypt.hash(config.defaultPassword, 10);

    const user = await prisma.user.upsert({
      where: {
        email: config.email,
      },
      update: {
        nombre: config.nombre,
        rol: "VENDEDOR",
        activo: true,
      },
      create: {
        nombre: config.nombre,
        email: config.email,
        password,
        rol: "VENDEDOR",
        activo: true,
      },
    });

    vendorIdByName.set(vendorName, user.id);
  }

  await prisma.user.updateMany({
    where: {
      rol: "VENDEDOR",
      email: {
        notIn: canonicalVendorEmails,
      },
    },
    data: {
      activo: false,
    },
  });

  return {
    admin,
    vendorIdByName,
  };
}

async function resetOperationalData() {
  await prisma.payment.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.client.deleteMany();
}

async function importRows({
  rows,
  adminId,
  vendorIdByName,
}: {
  rows: ParsedRow[];
  adminId: number;
  vendorIdByName: Map<VendorName, number>;
}) {
  const clientIdByKey = new Map<string, number>();

  const summary = {
    clientsCreated: 0,
    creditsCreated: 0,
    paymentsCreated: 0,
    byVendor: new Map<
      VendorName,
      {
        clients: number;
        credits: number;
        payments: number;
      }
    >(),
  };

  function vendorSummary(vendedor: VendorName) {
    if (!summary.byVendor.has(vendedor)) {
      summary.byVendor.set(vendedor, {
        clients: 0,
        credits: 0,
        payments: 0,
      });
    }

    return summary.byVendor.get(vendedor)!;
  }

  for (const row of rows) {
    const vendedorId = vendorIdByName.get(row.vendedor);

    if (!vendedorId) {
      throw new Error(`No existe vendedor para ${row.vendedor}`);
    }

    const clientKey = `${row.vendedor}::${row.clienteKey}`;

    let clientId = clientIdByKey.get(clientKey);

    if (!clientId) {
      const client = await prisma.client.create({
        data: {
          nombre: row.cliente,
          vendedorId,
          activo: true,
        },
      });

      clientId = client.id;
      clientIdByKey.set(clientKey, clientId);

      summary.clientsCreated += 1;
      vendorSummary(row.vendedor).clients += 1;
    }

    const tracking = calculateCreditTracking({
      fechaInicio: row.fechaInicio,
      frecuenciaDias: row.frecuenciaDias,
      valorCuota: row.valorCuota,
      total: row.total,
      montoPagado: row.montoPagado,
    });

    const credit = await prisma.credit.create({
      data: {
        clientId,
        vendedorId,
        fechaInicio: row.fechaInicio,
        tipo: row.tipo,
        frecuenciaDias: row.frecuenciaDias,
        valorCuota: row.valorCuota,
        total: row.total,
        montoPagado: row.montoPagado,
        saldo: tracking.saldo,
        proximoVencimiento: tracking.proximoVencimiento,
        cuotasPagadas: tracking.cuotasPagadas,
        cuotasRestantes: tracking.cuotasRestantes,
        cantidadCuotas: row.cantidadCuotas,
        estado: tracking.estado,
        activo: true,
      },
    });

    summary.creditsCreated += 1;
    vendorSummary(row.vendedor).credits += 1;

    if (row.montoPagado > 0) {
      await prisma.payment.create({
        data: {
          creditId: credit.id,
          monto: row.montoPagado,
          fechaPago: row.fechaInicio,
          registradoPor: adminId,
        },
      });

      summary.paymentsCreated += 1;
      vendorSummary(row.vendedor).payments += 1;
    }
  }

  return summary;
}

function printSummary({
  rows,
  invalidRows,
  summary,
}: {
  rows: ParsedRow[];
  invalidRows: InvalidRow[];
  summary: Awaited<ReturnType<typeof importRows>>;
}) {
  console.log("");
  console.log("IMPORTACIÓN FINALIZADA");
  console.log("----------------------");
  console.log(`Filas válidas procesadas: ${rows.length}`);
  console.log(`Clientes creados: ${summary.clientsCreated}`);
  console.log(`Cuentas creadas: ${summary.creditsCreated}`);
  console.log(`Pagos iniciales creados: ${summary.paymentsCreated}`);

  console.log("");
  console.log("Resumen por vendedor:");

  for (const [vendedor, data] of summary.byVendor.entries()) {
    console.log(
      `- ${vendedor}: ${data.clients} clientes, ${data.credits} cuentas, ${data.payments} pagos iniciales`,
    );
  }

  console.log("");
  console.log(`Filas salteadas: ${invalidRows.length}`);

  for (const invalid of invalidRows.slice(0, 20)) {
    console.log(
      `- ${invalid.vendedor} / ${invalid.sheetName} / fila ${invalid.rowNumber} / ${invalid.cliente}: ${invalid.reason}`,
    );
  }

  if (invalidRows.length > 20) {
    console.log(`... y ${invalidRows.length - 20} filas más.`);
  }

  console.log("");
  console.log("Usuarios vendedores de demo:");
  for (const vendor of Object.values(VENDORS)) {
    console.log(
      `- ${vendor.nombre}: ${vendor.email} / ${vendor.defaultPassword}`,
    );
  }
}

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (!shouldReset) {
    throw new Error(
      "Este importador borra clientes/cuentas/pagos existentes. Ejecutalo con: npm run import:clientes -- --reset",
    );
  }

  const { rows, invalidRows } = loadExcelRows();

  const { admin, vendorIdByName } = await ensureUsers();

  console.log("Eliminando datos operativos actuales...");
  await resetOperationalData();

  console.log("Importando clientes, cuentas y pagos iniciales...");
  const summary = await importRows({
    rows,
    adminId: admin.id,
    vendorIdByName,
  });

  printSummary({
    rows,
    invalidRows,
    summary,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("");
    console.error("ERROR EN IMPORTACIÓN");
    console.error("--------------------");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
