"use client";
import { useEffect, useState } from "react";
import StartGenerationButton from "@/components/dashboard/StartGenerationButton";

type Job = {
  _id: string;
  title: string;
  status: string;
  outputUrl?: string;
  resultUrl?: string;
  translateUrl?: string;
  translateTaskId?: string;
  providerJobId?: string;
  error?: string;
  createdAt: string;
};

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function fetchJobsList(): Promise<Job[]> {
    const r = await fetch("/api/jobs", { cache: "no-store" });
    const j = await r.json();
    return j.jobs || [];
  }

  async function load() {
    const list = await fetchJobsList();
    setJobs(list);
  }
  async function syncTranslate(id: string) {
    await fetch(`/api/heygen/translate/status?jobId=${id}`);
    await load();
  }
  async function remove(id: string) {
    if (!confirm("¿Borrar este job?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    await load();
  }
  async function syncJob(job: Job) {
    try {
      if (job.translateTaskId) {
        await fetch(`/api/heygen/translate/status?jobId=${job._id}`);
      } else if (job.providerJobId) {
        await fetch(`/api/heygen/video/status?jobId=${job._id}`);
      }
    } catch {}
    const list = await fetchJobsList();
    setJobs(list);
    const updated = list.find((j) => j._id === job._id);
    const newStatus = updated?.status || job.status;
    showToast(`Estado actualizado: ${job.title} → ${newStatus}`);
  }

  async function startJob(job: Job) {
    const previousStatus = job.status;
    try {
      const res = await fetch(`/api/jobs/${job._id}/process`, {
        method: "POST",
      });
      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = j?.error || "";
        } catch {}
        showToast(
          `Error al generar: ${job.title}${detail ? ` — ${detail}` : ""}`
        );
      }
    } catch (e: any) {
      showToast(`Error de red al generar: ${job.title}`);
    }
    const list = await fetchJobsList();
    setJobs(list);
    const updated = list.find((j) => j._id === job._id);
    const newStatus = updated?.status || job.status;
    if (previousStatus === "draft" && newStatus !== "draft") {
      showToast(`Video enviado a producción: ${job.title} → ${newStatus}`);
    } else {
      const err = updated?.error;
      showToast(
        `Estado actualizado: ${job.title} → ${newStatus}${
          err ? ` — ${err}` : ""
        }`
      );
    }
  }
  useEffect(() => {
    load();
    // Reduce el polling para no saturar el servidor en dev
    const intervalMs = 10000; // 10s
    let t = setInterval(load, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearInterval(t);
      } else {
        load();
        t = setInterval(load, intervalMs);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job._id}
          className="border border-border rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div>
            <div className="font-semibold">{job.title}</div>
            <div className="text-xs font-mono opacity-70">ID: {job._id}</div>
            <div className="text-sm opacity-75">Estado: {job.status}</div>
          </div>
          <div className="flex items-center gap-2 justify-end w-full">
            {/* Outline buttons primero (a la izquierda) */}
            <a href={`/jobs/${job._id}`} className="btn-outline">
              Detalles
            </a>
            <button className="btn-outline" onClick={() => syncJob(job)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>

            {/* Botones con color al extremo derecho y misma anchura */}
            {job.status === "done" &&
              (job.translateUrl || job.outputUrl || job.resultUrl) && (
                <>
                  <a
                    href={
                      job.translateUrl ||
                      job.outputUrl ||
                      (job.resultUrl as string)
                    }
                    target="_blank"
                    className="btn-primary w-[180px] text-center"
                  >
                    {job.translateUrl
                      ? "Ver video traducido"
                      : "Ver video Avatar"}
                  </a>
                </>
              )}
            {!job.translateTaskId && job.status !== "done" && (
              <button
                className="btn-accent w-[180px] text-center"
                onClick={() => startJob(job)}
              >
                Generar video avatar
              </button>
            )}

            {/* Botón borrar al extremo derecho con relleno rojo */}
            <button
              className="w-[40px] text-center rounded-2xl px-2 py-2 bg-red-600 text-white hover:bg-red-700"
              onClick={() => remove(job._id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
