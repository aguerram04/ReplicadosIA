"use client";
import CloudinaryUploader from "@/components/uploads/CloudinaryUploader";

export default function MediaUploader({
  onAdd,
}: {
  onAdd: (urls: string[]) => void;
}) {
  return (
    <CloudinaryUploader accept="auto" multiple onChange={(urls) => onAdd(urls)}>
      Subir desde dispositivo/cámara
    </CloudinaryUploader>
  );
}
