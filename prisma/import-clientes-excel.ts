import "dotenv/config";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { calculateCreditTracking } from "../src/lib/credit-calculations";

type SellerConfig = {
  nombre: string;
  email: string;
  password: string;
  fileCandidates: string[];
  sheetName: string;
};

type ParsedExcelRow = {
  sourceName: string;
  sellerName: string;
  sheetName: string;
  rowNumber: number;
  cliente: string;
  fechaInicio: Date;
  tipo: string;
  frecuenciaDias: number;
  valorCuota: number;
  total: number;
  montoPagado: number;
  cantidadCuotas: number;
};

type SkippedRow = {
  sourceName: string;
  sheetName: string;
  rowNumber: number;
  cliente: string;
  reason: string;
};

const SELLERS: SellerConfig[] = [
  {
    nombre: "Dani",
    email: "dani.cobrador@credifer",
    password: "dani123",
    fileCandidates: ["Sistema clientes dani.xlsx"],
    sheetName: "clientes dani",
  },
  {
    nombre: "Nico",
    email: "nico.cobrador@credifer",
    password: "nico123",
    fileCandidates: [
      "Sistema clientes definitivo 1.xlsx",
      "Sistema clientes definitivo.xlsx",
    ],
    sheetName: "nico",
  },
  {
    nombre: "Violeta",
    email: "violeta.cobrador@credifer",
    password: "violeta123",
    fileCandidates: [
      "Sistema clientes definitivo 1.xlsx",
      "Sistema clientes definitivo.xlsx",
    ],
    sheetName: "clientes violeta",
  },
  {
    nombre: "Paola",
    email: "paola.cobrador@credifer",
    password: "paola123",
    fileCandidates: [
      "Sistema clientes definitivo 1.xlsx",
      "Sistema clientes definitivo.xlsx",
    ],
    sheetName: "clientes paola",
  },
  {
    nombre: "Gustavo",
    email: "gustavo.cobrador@credifer",
    password: "gustavo123",
    fileCandidates: [
      "Sistema clientes definitivo 1.xlsx",
      "Sistema clientes definitivo.xlsx",
    ],
    sheetName: "clientes gustavo",
  },
];

const ROOT_ADMIN = {
  nombre: "Ivan Admin",
  email: "ivan.admin@credifer",
  password: "admin123",
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeHeader(value: unknown) {
  return normalizeText(String(value ?? ""))
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function cleanName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanType(value: unknown) {
  const tipo = String(value ?? "").trim();

  return tipo || "cred";
}

function dateOnlyUTC(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function parseExcelDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateOnlyUTC(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return null;

    return dateOnlyUTC(parsed.y, parsed.m, parsed.d);
  }

  if (typeof value === "string") {
    const raw = value.trim();

    if (!raw) return null;

    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return dateOnlyUTC(
        Number(isoMatch[1]),
        Number(isoMatch[2]),
        Number(isoMatch[3]),
      );
    }

    const slashMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]);
      let year = Number(slashMatch[3]);

      if (year < 100) year += 2000;

      return dateOnlyUTC(year, month, day);
    }

    const parsedDate = new Date(raw);

    if (!Number.isNaN(parsedDate.getTime())) {
      return dateOnlyUTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth() + 1,
        parsedDate.getDate(),
      );
    }
  }

  return null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim();

  if (!raw) return null;

  let normalized = raw
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!normalized) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);

  if (parsed === null) return null;

  return Math.trunc(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findExistingFile(fileCandidates: string[]) {
  const searchDirs = [
    process.cwd(),
    path.join(process.cwd(), "prisma"),
    path.join(process.cwd(), "prisma", "imports"),
  ];

  for (const dir of searchDirs) {
    for (const fileName of fileCandidates) {
      const fullPath = path.join(dir, fileName);

      if (fs.existsSync(fullPath)) return fullPath;
    }
  }

  throw new Error(
    `No se encontró ninguno de estos archivos: ${fileCandidates.join(", ")}`,
  );
}

function findSheetName(workbook: XLSX.WorkBook, requestedSheetName: string) {
  const requested = normalizeText(requestedSheetName);

  const exact = workbook.SheetNames.find(
    (sheetName) => normalizeText(sheetName) === requested,
  );

  if (exact) return exact;

  const available = workbook.SheetNames.join(", ");

  throw new Error(
    `No existe la hoja "${requestedSheetName}". Hojas disponibles: ${available}`,
  );
}

function getHeaderIndexMap(headerRow: unknown[]) {
  const map = new Map<string, number>();

  headerRow.forEach((cell, index) => {
    const header = normalizeHeader(cell);

    if (!header) return;

    map.set(header, index);
  });

  return {
    cliente: findHeaderIndex(map, ["cliente"]),
    fecha: findHeaderIndex(map, ["fecha"]),
    tipo: findHeaderIndex(map, ["tipo"]),
    frecuencia: findHeaderIndex(map, ["frecuencia"]),
    valorCuota: findHeaderIndex(map, ["valorcuota", "valorcuotas"]),
    saldo: findHeaderIndex(map, ["saldo"]),
    total: findHeaderIndex(map, ["total"]),
    pago: findHeaderIndex(map, ["pago"]),
    proximoVencimiento: findHeaderIndex(map, [
      "proxvto",
      "proximovencimiento",
      "proxvencimiento",
    ]),
    cuotasPagadas: findHeaderIndex(map, ["cuotaspagadas", "cp", "cspagadas"]),
    cuotasRestantes: findHeaderIndex(map, [
      "cuotasrestantes",
      "cres",
      "res",
      "cuotasres",
    ]),
  };
}

function findHeaderIndex(map: Map<string, number>, candidates: string[]) {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);

    if (map.has(normalizedCandidate)) {
      return map.get(normalizedCandidate)!;
    }
  }

  return -1;
}

function getCell(row: unknown[], index: number) {
  if (index < 0) return null;

  return row[index] ?? null;
}

function isEmptyRow(row: unknown[]) {
  return row.every((cell) => {
    if (cell === null || cell === undefined) return true;

    if (typeof cell === "string" && cell.trim() === "") return true;

    return false;
  });
}

function parseRowsFromSheet({
  sourceName,
  sellerName,
  sheetName,
  worksheet,
}: {
  sourceName: string;
  sellerName: string;
  sheetName: string;
  worksheet: XLSX.WorkSheet;
}) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const parsedRows: ParsedExcelRow[] = [];
  const skippedRows: SkippedRow[] = [];

  if (rows.length === 0) {
    return { parsedRows, skippedRows };
  }

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === "cliente"),
  );

  if (headerRowIndex < 0) {
    throw new Error(
      `No se encontró encabezado con columna CLIENTE en ${sourceName} / ${sheetName}`,
    );
  }

  const headerMap = getHeaderIndexMap(rows[headerRowIndex]);

  if (
    headerMap.cliente < 0 ||
    headerMap.fecha < 0 ||
    headerMap.frecuencia < 0 ||
    headerMap.valorCuota < 0 ||
    headerMap.saldo < 0 ||
    headerMap.total < 0 ||
    headerMap.pago < 0
  ) {
    throw new Error(
      `Faltan columnas obligatorias en ${sourceName} / ${sheetName}`,
    );
  }

  for (let index = headerRowIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 1;

    if (isEmptyRow(row)) continue;

    const cliente = cleanName(getCell(row, headerMap.cliente));

    if (!cliente) continue;

    const fechaInicio = parseExcelDate(getCell(row, headerMap.fecha));
    const frecuenciaDias = parseInteger(getCell(row, headerMap.frecuencia));
    const valorCuota = parseNumber(getCell(row, headerMap.valorCuota));
    const saldoExcel = parseNumber(getCell(row, headerMap.saldo));
    const totalExcel = parseNumber(getCell(row, headerMap.total));
    const pagoExcel = parseNumber(getCell(row, headerMap.pago));

    if (!fechaInicio) {
      skippedRows.push({
        sourceName,
        sheetName,
        rowNumber,
        cliente,
        reason: "Fecha inválida",
      });
      continue;
    }

    if (
      frecuenciaDias === null ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0
    ) {
      skippedRows.push({
        sourceName,
        sheetName,
        rowNumber,
        cliente,
        reason: "Frecuencia inválida",
      });
      continue;
    }

    const frecuenciaDiasFinal = frecuenciaDias;

    if (
      valorCuota === null ||
      !Number.isFinite(valorCuota) ||
      valorCuota <= 0
    ) {
      skippedRows.push({
        sourceName,
        sheetName,
        rowNumber,
        cliente,
        reason: "Valor de cuota inválido",
      });
      continue;
    }

    let total = totalExcel;
    let pago = pagoExcel;
    let saldo = saldoExcel;

    if ((total === null || total <= 0) && saldo !== null && pago !== null) {
      total = saldo + pago;
    }

    if (total === null || !Number.isFinite(total) || total <= 0) {
      skippedRows.push({
        sourceName,
        sheetName,
        rowNumber,
        cliente,
        reason: "Total inválido",
      });
      continue;
    }

    if (pago === null && saldo !== null) {
      pago = total - saldo;
    }

    if (saldo === null && pago !== null) {
      saldo = total - pago;
    }

    if (pago === null || !Number.isFinite(pago)) {
      pago = 0;
    }

    pago = clamp(pago, 0, total);

    const cuotasPagadasExcel = parseInteger(
      getCell(row, headerMap.cuotasPagadas),
    );

    const cuotasRestantesExcel = parseInteger(
      getCell(row, headerMap.cuotasRestantes),
    );

    const cantidadCuotasDesdeExcel =
      cuotasPagadasExcel !== null &&
      cuotasRestantesExcel !== null &&
      cuotasPagadasExcel >= 0 &&
      cuotasRestantesExcel >= 0 &&
      cuotasPagadasExcel + cuotasRestantesExcel > 0
        ? cuotasPagadasExcel + cuotasRestantesExcel
        : null;

    const cantidadCuotas =
      cantidadCuotasDesdeExcel ?? Math.max(Math.ceil(total / valorCuota), 1);

    parsedRows.push({
      sourceName,
      sellerName,
      sheetName,
      rowNumber,
      cliente,
      fechaInicio,
      tipo: cleanType(getCell(row, headerMap.tipo)),
      frecuenciaDias: frecuenciaDiasFinal,
      valorCuota,
      total,
      montoPagado: pago,
      cantidadCuotas,
    });
  }

  return { parsedRows, skippedRows };
}

function loadExcelRows() {
  const allRows: ParsedExcelRow[] = [];
  const allSkippedRows: SkippedRow[] = [];

  for (const seller of SELLERS) {
    const fullPath = findExistingFile(seller.fileCandidates);
    const sourceName = path.basename(fullPath);

    const workbook = XLSX.readFile(fullPath, {
      cellDates: true,
    });

    const realSheetName = findSheetName(workbook, seller.sheetName);
    const worksheet = workbook.Sheets[realSheetName];

    const { parsedRows, skippedRows } = parseRowsFromSheet({
      sourceName,
      sellerName: seller.nombre,
      sheetName: realSheetName,
      worksheet,
    });

    allRows.push(...parsedRows);
    allSkippedRows.push(...skippedRows);
  }

  return { rows: allRows, skippedRows: allSkippedRows };
}

async function upsertUsers() {
  const adminPassword = await bcrypt.hash(ROOT_ADMIN.password, 10);

  const admin = await prisma.user.upsert({
    where: {
      email: ROOT_ADMIN.email,
    },
    update: {
      nombre: ROOT_ADMIN.nombre,
      password: adminPassword,
      rol: "ADMIN",
      activo: true,
    },
    create: {
      nombre: ROOT_ADMIN.nombre,
      email: ROOT_ADMIN.email,
      password: adminPassword,
      rol: "ADMIN",
      activo: true,
    },
  });

  const sellersByName = new Map<string, { id: number; nombre: string }>();

  for (const seller of SELLERS) {
    const password = await bcrypt.hash(seller.password, 10);

    const user = await prisma.user.upsert({
      where: {
        email: seller.email,
      },
      update: {
        nombre: seller.nombre,
        password,
        rol: "VENDEDOR",
        activo: true,
      },
      create: {
        nombre: seller.nombre,
        email: seller.email,
        password,
        rol: "VENDEDOR",
        activo: true,
      },
    });

    sellersByName.set(seller.nombre, {
      id: user.id,
      nombre: user.nombre,
    });
  }

  return { admin, sellersByName };
}

async function resetOperationalData() {
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.credit.deleteMany(),
    prisma.client.deleteMany(),
  ]);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (!shouldReset) {
    throw new Error(
      "Este importador borra clientes/cuentas/pagos existentes. Ejecutalo con: npm run import:clientes:reset",
    );
  }

  const { rows, skippedRows } = loadExcelRows();

  if (rows.length === 0) {
    throw new Error("No se encontraron filas válidas para importar.");
  }

  const { admin, sellersByName } = await upsertUsers();

  await resetOperationalData();

  const clientsByNormalizedName = new Map<string, { id: number }>();

  const summary = new Map<
    string,
    {
      clientes: Set<number>;
      cuentas: number;
      pagosIniciales: number;
    }
  >();

  for (const seller of SELLERS) {
    summary.set(seller.nombre, {
      clientes: new Set<number>(),
      cuentas: 0,
      pagosIniciales: 0,
    });
  }

  for (const row of rows) {
    const seller = sellersByName.get(row.sellerName);

    if (!seller) {
      skippedRows.push({
        sourceName: row.sourceName,
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        cliente: row.cliente,
        reason: `Vendedor no encontrado: ${row.sellerName}`,
      });
      continue;
    }

    const normalizedClientName = normalizeText(row.cliente);

    let client = clientsByNormalizedName.get(normalizedClientName);

    if (!client) {
      const createdClient = await prisma.client.create({
        data: {
          nombre: row.cliente,
          vendedorId: seller.id,
          activo: true,
        },
        select: {
          id: true,
        },
      });

      client = createdClient;
      clientsByNormalizedName.set(normalizedClientName, client);
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
        clientId: client.id,
        vendedorId: seller.id,
        fechaInicio: row.fechaInicio,
        tipo: row.tipo,
        frecuenciaDias: row.frecuenciaDias,
        cantidadCuotas: row.cantidadCuotas,
        valorCuota: row.valorCuota,
        total: row.total,
        montoPagado: row.montoPagado,
        saldo: tracking.saldo,
        proximoVencimiento: tracking.proximoVencimiento,
        cuotasPagadas: tracking.cuotasPagadas,
        cuotasRestantes: tracking.cuotasRestantes,
        estado: tracking.estado,
        activo: true,
      },
      select: {
        id: true,
      },
    });

    const sellerSummary = summary.get(row.sellerName);

    if (sellerSummary) {
      sellerSummary.clientes.add(client.id);
      sellerSummary.cuentas += 1;
    }

    if (row.montoPagado > 0) {
      await prisma.payment.create({
        data: {
          creditId: credit.id,
          monto: row.montoPagado,
          fechaPago: row.fechaInicio,
          registradoPor: admin.id,
        },
      });

      if (sellerSummary) {
        sellerSummary.pagosIniciales += 1;
      }
    }
  }

  console.log("");
  console.log("IMPORTACIÓN FINALIZADA");
  console.log("----------------------");

  for (const seller of SELLERS) {
    const sellerSummary = summary.get(seller.nombre);

    console.log(
      `- ${seller.nombre}: ${sellerSummary?.clientes.size ?? 0} clientes, ${
        sellerSummary?.cuentas ?? 0
      } cuentas, ${sellerSummary?.pagosIniciales ?? 0} pagos iniciales`,
    );
  }

  console.log("");
  console.log(`Clientes únicos importados: ${clientsByNormalizedName.size}`);
  console.log(`Filas válidas procesadas: ${rows.length}`);

  if (skippedRows.length > 0) {
    console.log("");
    console.log(`Filas salteadas: ${skippedRows.length}`);

    for (const skipped of skippedRows.slice(0, 50)) {
      console.log(
        `- ${skipped.sourceName} / ${skipped.sheetName} / fila ${skipped.rowNumber} / ${skipped.cliente}: ${skipped.reason}`,
      );
    }

    if (skippedRows.length > 50) {
      console.log(`... y ${skippedRows.length - 50} filas salteadas más.`);
    }
  }

  console.log("");
  console.log("Usuarios vendedores:");
  for (const seller of SELLERS) {
    console.log(`- ${seller.nombre}: ${seller.email} / ${seller.password}`);
  }

  console.log("");
  console.log(`Admin: ${ROOT_ADMIN.email} / ${ROOT_ADMIN.password}`);
  console.log(`Fecha de importación: ${formatDate(new Date())}`);
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
