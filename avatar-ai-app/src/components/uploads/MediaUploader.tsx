"use client";
import CloudinaryUploader from "@/components/uploads/CloudinaryUploader";

export default function MediaUploader({
  onAdd,
  children,
}: {
  onAdd: (urls: string[]) => void;
  children?: React.ReactNode;
}) {
  return (
    <CloudinaryUploader accept="auto" multiple onChange={(urls) => onAdd(urls)}>
      {children || "Subir desde dispositivo/cámara"}
    </CloudinaryUploader>
  );
}
