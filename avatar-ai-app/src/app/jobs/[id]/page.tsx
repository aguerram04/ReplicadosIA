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

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Detalle del Job</h1>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">ID:</span> {String(job._id)}
        </div>
        <div>
          <span className="font-medium">Título:</span> {job.title}
        </div>
        <div>
          <span className="font-medium">Estado:</span> {job.status}
        </div>
        {job.resultUrl && (
          <div>
            <span className="font-medium">Resultado:</span>{" "}
            {job.status === "done" ? (
              <a className="btn-primary" href={job.resultUrl} target="_blank">
                Abrir
              </a>
            ) : (
              <a
                className="underline opacity-60"
                href={job.resultUrl}
                target="_blank"
              >
                Abrir
              </a>
            )}
          </div>
        )}
        {job.translateUrl && (
          <div>
            <span className="font-medium">Traducción:</span>{" "}
            {job.status === "done" ? (
              <a
                className="btn-primary"
                href={job.translateUrl}
                target="_blank"
              >
                Abrir
              </a>
            ) : (
              <a
                className="underline opacity-60"
                href={job.translateUrl}
                target="_blank"
              >
                Abrir
              </a>
            )}
          </div>
        )}
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
    </main>
  );
}
