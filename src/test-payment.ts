import { registerPayment } from "./lib/payments";

async function main() {
  const result = await registerPayment({
    creditId: 1,
    monto: 10000,
    userId: 2, // Dani
  });

  console.log("PAGO REGISTRADO:", result);
}

main();
