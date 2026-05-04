import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserStatusButton from "@/components/UserStatusButton";
import ChangeUserPasswordButton from "@/components/ChangeUserPasswordButton";
import DeleteUserButton from "@/components/DeleteUserButton";

const ROOT_ADMIN_EMAIL = "ivan.admin@sistema.local";

type EstadoFiltro = "activos" | "inactivos" | "todos";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: EstadoFiltro;
  }>;
}) {
  const currentUser = await requireAdmin();
  const { estado } = await searchParams;

  const filtro: EstadoFiltro =
    estado === "inactivos" || estado === "todos" ? estado : "activos";

  const todosLosUsuarios = await prisma.user.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
    },
    orderBy: [
      {
        rol: "asc",
      },
      {
        nombre: "asc",
      },
    ],
  });

  const usuarios =
    filtro === "activos"
      ? todosLosUsuarios.filter((usuario) => usuario.activo)
      : filtro === "inactivos"
        ? todosLosUsuarios.filter((usuario) => !usuario.activo)
        : todosLosUsuarios;

  const admins = todosLosUsuarios.filter((usuario) => usuario.rol === "ADMIN");
  const vendedores = todosLosUsuarios.filter(
    (usuario) => usuario.rol === "VENDEDOR",
  );
  const activos = todosLosUsuarios.filter((usuario) => usuario.activo);
  const inactivos = todosLosUsuarios.filter((usuario) => !usuario.activo);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Administración de usuarios
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Gestioná los usuarios que pueden ingresar al sistema. Los usuarios
              vendedores solo consultan su cartera asignada; los administradores
              pueden cargar y modificar información.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sesión: {currentUser.nombre} · {currentUser.rol}
            </p>
          </div>

          <Link
            href="/usuarios/nuevo"
            className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
          >
            Nuevo usuario
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Activos" value={activos.length} />
          <SummaryCard title="Inactivos" value={inactivos.length} />
          <SummaryCard title="Administradores" value={admins.length} />
          <SummaryCard title="Vendedores" value={vendedores.length} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Filtro de usuarios
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Por defecto se muestran solo usuarios activos. Los usuarios
                inactivos quedan ocultos del uso diario, pero conservan su
                historial.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <FilterLink
                href="/usuarios?estado=activos"
                active={filtro === "activos"}
              >
                Activos
              </FilterLink>

              <FilterLink
                href="/usuarios?estado=inactivos"
                active={filtro === "inactivos"}
              >
                Inactivos
              </FilterLink>

              <FilterLink
                href="/usuarios?estado=todos"
                active={filtro === "todos"}
              >
                Todos
              </FilterLink>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Usuarios del sistema
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filtro === "activos"
                  ? "Mostrando usuarios activos."
                  : filtro === "inactivos"
                    ? "Mostrando usuarios inactivos."
                    : "Mostrando todos los usuarios."}
              </p>
            </div>

            <span className="text-sm font-medium text-slate-600">
              {usuarios.length} usuario{usuarios.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {usuarios.map((usuario) => {
              const isCurrentUser = usuario.id === currentUser.id;
              const isRootAdmin = usuario.email === ROOT_ADMIN_EMAIL;
              const protectedUser = isCurrentUser || isRootAdmin;

              return (
                <div
                  key={usuario.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ring-1 ${
                    usuario.activo
                      ? "border-slate-200 border-l-4 border-l-slate-500 ring-slate-100"
                      : "border-slate-200 border-l-4 border-l-slate-300 bg-slate-50 ring-slate-100"
                  }`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_1.8fr] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          {usuario.nombre}
                        </p>

                        {isRootAdmin && (
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                            PRINCIPAL
                          </span>
                        )}

                        {isCurrentUser && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            ACTUAL
                          </span>
                        )}

                        {!usuario.activo && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                            OCULTO
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {usuario.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Rol</p>
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {usuario.rol === "ADMIN" ? "ADMIN" : "VENDEDOR"}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Estado</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          usuario.activo
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {usuario.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                      <UserStatusButton
                        userId={usuario.id}
                        activo={usuario.activo}
                        disabled={protectedUser}
                      />

                      <ChangeUserPasswordButton
                        userId={usuario.id}
                        disabled={isRootAdmin}
                      />

                      <DeleteUserButton
                        userId={usuario.id}
                        disabled={protectedUser}
                      />
                    </div>
                  </div>

                  {isRootAdmin && (
                    <p className="mt-3 text-xs text-slate-500">
                      Usuario principal protegido: no se puede eliminar,
                      desactivar ni cambiar su contraseña desde el sistema.
                    </p>
                  )}

                  {isCurrentUser && !isRootAdmin && (
                    <p className="mt-3 text-xs text-slate-500">
                      Es tu usuario actual: no podés desactivarlo ni eliminarlo.
                    </p>
                  )}

                  {!usuario.activo && (
                    <p className="mt-3 text-xs text-slate-500">
                      Usuario inactivo: no puede ingresar, no aparece en
                      selectores operativos y queda oculto de la vista
                      principal.
                    </p>
                  )}
                </div>
              );
            })}

            {usuarios.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                {filtro === "activos"
                  ? "No hay usuarios activos."
                  : filtro === "inactivos"
                    ? "No hay usuarios inactivos."
                    : "No hay usuarios cargados."}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-center text-sm font-medium transition-all ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
