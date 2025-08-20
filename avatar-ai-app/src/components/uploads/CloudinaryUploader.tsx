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
  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
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
