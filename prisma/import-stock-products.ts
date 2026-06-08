//prisma/import-stock-products.ts

import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import { importStockProductsFromWorkbook } from "../src/lib/stock-products-importer";

const EXCEL_FILE_CANDIDATES = [
  "credifer_catalogo_completo_2026-06-07.xlsx",
  "catalogo.xlsx",
  "productos.xlsx",
];

function findExistingFile() {
  const importsDir = path.join(process.cwd(), "prisma", "imports");

  for (const fileName of EXCEL_FILE_CANDIDATES) {
    const filePath = path.join(importsDir, fileName);

    if (existsSync(filePath)) return filePath;
  }

  throw new Error(
    `No se encontró ningún Excel en prisma/imports. Archivos buscados: ${EXCEL_FILE_CANDIDATES.join(
      ", ",
    )}`,
  );
}

async function main() {
  const filePath = findExistingFile();
  const workbook = XLSX.readFile(filePath);

  const result = await importStockProductsFromWorkbook({
    db: prisma,
    workbook,
  });

  console.log("");
  console.log("IMPORTACIÓN DE PRODUCTOS FINALIZADA");
  console.log("-----------------------------------");
  console.log(`Archivo: ${path.basename(filePath)}`);
  console.log(`Hoja: ${result.sheetName}`);
  console.log(`Filas leídas: ${result.rowsRead}`);
  console.log(`Productos válidos procesados: ${result.validRows}`);
  console.log(`Productos creados: ${result.created}`);
  console.log(`Productos actualizados: ${result.updated}`);
  console.log(`Stock inicial nuevos productos: ${result.stockInitial}`);
  console.log(
    `Alerta stock bajo nuevos productos: ${result.lowStockAlertInitial}`,
  );
  console.log("");
  console.log("Imágenes:");
  console.log(`- Con imagen principal: ${result.withMainImage}`);
  console.log(`- Con fallback desde imágenes: ${result.withFallbackImage}`);
  console.log(`- Sin imagen: ${result.withoutImage}`);
  console.log("");
  console.log("Productos por categoría interna:");

  Object.entries(result.byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([categoryName, count]) => {
      console.log(`- ${categoryName}: ${count}`);
    });

  console.log("");
  console.log(`Filas salteadas: ${result.skippedRows.length}`);

  result.skippedRows.slice(0, 30).forEach((row) => {
    console.log(`- Fila ${row.rowNumber} / ${row.name}: ${row.reason}`);
  });

  if (result.skippedRows.length > 30) {
    console.log(`... y ${result.skippedRows.length - 30} más.`);
  }

  console.log("");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("");
    console.error("ERROR EN IMPORTACIÓN DE PRODUCTOS");
    console.error("--------------------------------");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
