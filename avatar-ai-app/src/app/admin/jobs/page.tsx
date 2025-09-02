import { connectToDatabase } from "@/lib/mongodb";
import { VideoJob, User } from "@/models";
import { estimateHeygenCreditsForJob } from "@/lib/heygen";

export const dynamic = "force-dynamic";

export default async function AdminJobs() {
  await connectToDatabase();
  const jobs = await VideoJob.find().sort({ createdAt: -1 }).limit(200).lean();
  const userIds = jobs.map((j: any) => j.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const byId = new Map(users.map((u: any) => [String(u._id), u]));
  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Trabajos — Costos</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Créditos (estimado)</th>
              <th className="px-3 py-2">Créditos (real)</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: any) => (
              <tr key={String(j._id)} className="border-t border-white/10">
                <td className="px-3 py-2 text-xs opacity-70">
                  {new Date(j.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {byId.get(String(j.userId))?.email || "usuario"}
                </td>
                <td className="px-3 py-2">{j.status}</td>
                <td className="px-3 py-2">{j.title || "—"}</td>
                <td className="px-3 py-2">{estimateHeygenCreditsForJob(j)}</td>
                <td className="px-3 py-2">
                  {typeof j.actualCredits === "number" ? (
                    <span
                      className={
                        j.actualCredits !== estimateHeygenCreditsForJob(j)
                          ? "text-yellow-300"
                          : "opacity-80"
                      }
                    >
                      {j.actualCredits}
                    </span>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.length === 0 && <div className="opacity-70">Sin trabajos</div>}
      <p className="text-xs opacity-60 mt-2">
        Ajusta el costo por job con `HEYGEN_COST_CREDITS_PER_JOB`.
      </p>
    </main>
  );
}
