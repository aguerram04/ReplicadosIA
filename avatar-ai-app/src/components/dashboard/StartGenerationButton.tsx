"use client";
import axios from "axios";

export default function StartGenerationButton({ jobId }: { jobId: string }) {
  return (
    <button
      className="btn-outline"
      onClick={async () => {
        const r = await axios.post("/api/heygen/create", { jobId });
        alert(`Tarea enviada: ${r.data?.taskId || "OK"}`);
      }}
    >
      Generar en HeyGen
    </button>
  );
}
