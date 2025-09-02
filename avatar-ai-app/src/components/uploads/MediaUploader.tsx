"use client";
import CloudinaryUploader from "@/components/uploads/CloudinaryUploader";

export default function MediaUploader({
  onAdd,
  children,
  accept = "auto",
}: {
  onAdd: (urls: string[]) => void;
  children?: React.ReactNode;
  accept?: "image" | "video" | "auto";
}) {
  return (
    <CloudinaryUploader
      accept={accept}
      multiple
      onChange={(urls) => onAdd(urls)}
    >
      {children || "Subir desde dispositivo/cámara"}
    </CloudinaryUploader>
  );
}
