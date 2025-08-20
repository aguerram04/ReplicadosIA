"use client";
import { useEffect, useState } from "react";
import StartGenerationButton from "@/components/dashboard/StartGenerationButton";

type Job = {
  _id: string;
  title: string;
  status: string;
  outputUrl?: string;
  createdAt: string;
};

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  async function load() {
    const r = await fetch("/api/jobs", { cache: "no-store" });
    const j = await r.json();
    setJobs(j.jobs || []);
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
            <div className="text-sm opacity-75">Estado: {job.status}</div>
            {job.outputUrl && (
              <a
                href={job.outputUrl}
                target="_blank"
                className="text-sm underline"
              >
                Ver video
              </a>
            )}
          </div>
          <div className="flex gap-2">
            {(job.status === "draft" || job.status === "error") && (
              <StartGenerationButton jobId={job._id} />
            )}
            <button className="btn-outline" onClick={load}>
              Refrescar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
