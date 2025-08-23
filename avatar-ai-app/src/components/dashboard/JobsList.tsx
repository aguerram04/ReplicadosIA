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
          <div className="flex items-center gap-2">
            {job.status === "done" &&
              (job.translateUrl || job.outputUrl || job.resultUrl) && (
                <a
                  href={
                    job.translateUrl ||
                    job.outputUrl ||
                    (job.resultUrl as string)
                  }
                  target="_blank"
                  className="btn-primary"
                >
                  {job.translateUrl
                    ? "Ver video traducido"
                    : "Ver video Avatar"}
                </a>
              )}
            {!job.translateTaskId && job.status !== "done" && (
              <button className="btn-accent" onClick={() => startJob(job)}>
                Generar video avatar
              </button>
            )}
            <a href={`/jobs/${job._id}`} className="btn-outline">
              Detalles
            </a>
            <button className="btn-outline" onClick={() => remove(job._id)}>
              Borrar
            </button>
            <button className="btn-outline" onClick={() => syncJob(job)}>
              Actualizar estado
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
