"use client";
import { CldUploadWidget } from "next-cloudinary";
import { useState } from "react";

type Props = {
  onChange(urls: string[]): void;
  accept?: "image" | "video" | "auto";
  multiple?: boolean;
  children?: React.ReactNode;
};

export default function CloudinaryUploader({
  onChange,
  accept = "auto",
  multiple = true,
  children,
}: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return (
      <div className="inline-flex flex-col gap-2">
        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-md border border-white/20 opacity-60 cursor-not-allowed"
        >
          Configurar Cloudinary
        </button>
        <p className="text-xs opacity-70">
          Define NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y
          NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en .env.local
        </p>
      </div>
    );
  }
  return (
    <CldUploadWidget
      uploadPreset={uploadPreset}
      options={{
        cloudName,
        multiple,
        clientAllowedFormats: accept === "auto" ? undefined : [accept],
        resourceType:
          accept === "image"
            ? "image"
            : accept === "video"
            ? "video"
            : undefined,
      }}
      onSuccess={(result: any) => {
        const secureUrl = result?.info?.secure_url as string | undefined;
        if (secureUrl) {
          const next = [...urls, secureUrl];
          setUrls(next);
          onChange(next);
        }
      }}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => open?.()}
          className="px-4 py-2 rounded-md border border-white/20"
        >
          {children || "Subir archivos"}
        </button>
      )}
    </CldUploadWidget>
  );
}
