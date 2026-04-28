import NuevaCuentaForm from "@/components/NuevaCuentaForm";

export default async function NuevaCuentaPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const id = Number(clientId);

  if (!Number.isInteger(id)) {
    return <div className="p-8">Cliente inválido</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <section className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate-900">Nueva cuenta</h1>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <NuevaCuentaForm clientId={id} />
        </div>
      </section>
    </main>
  );
}
