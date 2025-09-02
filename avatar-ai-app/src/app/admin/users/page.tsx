import { connectToDatabase } from "@/lib/mongodb";
import { User, UserSummary } from "@/models";
import UserPctControl from "@/components/admin/UserPctControl";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  await connectToDatabase();
  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .select({ email: 1, name: 1, role: 1, isAdmin: 1, dollarToCreditPct: 1 })
    .lean();
  const summaries = await UserSummary.find()
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Usuarios</h1>
      <div className="space-y-2">
        {users.map((u: any) => (
          <div
            key={String(u._id)}
            className="rounded-md border p-3 flex justify-between"
          >
            <div>
              <div className="font-medium">{u.email}</div>
              <div className="text-xs opacity-70">{u.name || "Sin nombre"}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs opacity-70">
                rol: {u.role || "user"} — isAdmin: {String(!!u.isAdmin)}
              </div>
              <UserPctControl
                userId={String(u._id)}
                initialPercent={u.dollarToCreditPct ?? 50}
                email={u.email}
              />
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="opacity-70">Sin usuarios</div>}
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">
        Resumen (UserSummary)
      </h2>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3">Créditos</th>
              <th className="py-2 pr-3">$→Créditos</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s: any) => (
              <tr key={String(s._id)} className="border-b last:border-0">
                <td className="py-2 pr-3">{s.email}</td>
                <td className="py-2 pr-3">{s.name || "—"}</td>
                <td className="py-2 pr-3">{s.totalCredits ?? 0}</td>
                <td className="py-2 pr-3">
                  <UserPctControl
                    userId={String(s.userId)}
                    initialPercent={s.dollarToCreditPct ?? 50}
                    email={s.email}
                  />
                </td>
              </tr>
            ))}
            {summaries.length === 0 && (
              <tr>
                <td className="py-3 opacity-70" colSpan={4}>
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
