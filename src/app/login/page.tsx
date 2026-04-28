import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-950">Iniciar sesión</h1>

        <p className="mt-2 text-sm text-slate-600">
          Ingresá con tu usuario para acceder al sistema.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
