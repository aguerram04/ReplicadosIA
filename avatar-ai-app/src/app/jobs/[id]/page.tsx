import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await connectToDatabase();
  const job = await Job.findById(params.id).lean();
  if (!job) {
    return (
      <main className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Job no encontrado</h1>
      </main>
    );
  }

  const openUrl = (job as any).translateUrl || (job as any).resultUrl || "";
  const isReady = job.status === "done" && !!openUrl;

  return (
    <main className="container mx-auto p-8 flex justify-center">
      <div className="w-full max-w-3xl rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2 text-sm">
            <h1 className="text-2xl font-bold mb-2">Detalle del Job</h1>
            <div>
              <span className="font-medium">ID:</span> {String(job._id)}
            </div>
            <div>
              <span className="font-medium">Título:</span> {job.title}
            </div>
            <div>
              <span className="font-medium">Estado:</span> {job.status}
            </div>
            {job.mediaUrls?.length ? (
              <div className="mt-2">
                <div className="font-medium">Media:</div>
                <ul className="list-disc pl-5">
                  {job.mediaUrls.map((u: string) => (
                    <li key={u}>
                      <a className="underline" href={u} target="_blank">
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 flex items-start">
            {openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                className={isReady ? "btn-primary" : "btn-outline opacity-60"}
              >
                Abrir
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
