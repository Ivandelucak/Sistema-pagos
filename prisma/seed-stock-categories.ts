import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const categories = [
  { codePrefix: "001", name: "Celulares", slug: "celulares" },
  { codePrefix: "002", name: "Parlantes", slug: "parlantes" },
  { codePrefix: "003", name: "Audio", slug: "audio" },
  { codePrefix: "004", name: "Tecnología", slug: "tecnologia" },
  { codePrefix: "005", name: "TV y video", slug: "tv-y-video" },
  { codePrefix: "006", name: "Electrodomésticos", slug: "electrodomesticos" },
  {
    codePrefix: "007",
    name: "Pequeños electrodomésticos",
    slug: "pequenos-electrodomesticos",
  },
  { codePrefix: "008", name: "Climatización", slug: "climatizacion" },
  { codePrefix: "009", name: "Hogar", slug: "hogar" },
  {
    codePrefix: "010",
    name: "Muebles y colchones",
    slug: "muebles-y-colchones",
  },
  { codePrefix: "011", name: "Herramientas", slug: "herramientas" },
  { codePrefix: "012", name: "Bicicletas", slug: "bicicletas" },
  { codePrefix: "013", name: "Cuidado personal", slug: "cuidado-personal" },
];

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.productCategory.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        codePrefix: category.codePrefix,
        name: category.name,
        displayOrder: index + 1,
        active: true,
      },
      create: {
        codePrefix: category.codePrefix,
        name: category.name,
        slug: category.slug,
        displayOrder: index + 1,
        active: true,
      },
    });
  }

  console.log("Categorías de productos creadas/actualizadas correctamente.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
