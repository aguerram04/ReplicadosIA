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
  createdAt: string;
};

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  async function load() {
    const r = await fetch("/api/jobs", { cache: "no-store" });
    const j = await r.json();
    setJobs(j.jobs || []);
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
                  Ver video traducido
                </a>
              )}
            {(job.status === "draft" || job.status === "error") && (
              <button
                className="btn-accent"
                onClick={() =>
                  fetch(`/api/jobs/${job._id}/start`, { method: "POST" })
                }
              >
                Generar video avatar
              </button>
            )}
            <a href={`/jobs/${job._id}`} className="btn-outline">
              Detalles
            </a>
            <button
              className="btn-outline"
              onClick={() => syncTranslate(job._id)}
            >
              Actualizar traducción
            </button>
            <button className="btn-outline" onClick={() => remove(job._id)}>
              Borrar
            </button>
            <button className="btn-outline" onClick={load}>
              Refrescar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
