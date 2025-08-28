"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function MobileNavSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState<string>("");

  const options = useMemo(
    () => [
      { label: "Inicio", href: "/" },
      { label: "Tablero", href: "/dashboard" },
      { label: "Video", href: "/create" },
      { label: "Fotos", href: "/photos" },
      { label: "Traducir", href: "/translate" },
      { label: "Templete", href: "/template" },
      { label: "Studio", href: "/studio" },
      { label: "Interactivo", href: "/interactivo" },
      { label: "AvatarID", href: "/avatarid" },
    ],
    []
  );

  useEffect(() => {
    const match = options.find((o) => o.href === pathname);
    setValue(match ? match.href : "");
  }, [pathname, options]);

  return (
    <div className="w-44">
      <label htmlFor="mobile-nav" className="sr-only">
        Navegar
      </label>
      <select
        id="mobile-nav"
        className="w-full rounded-md border border-[#e6e8eb] bg-white px-3 py-1.5 text-sm text-[#2e5783]"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (next) router.push(next);
        }}
      >
        <option value="">Navegar…</option>
        {options.map((opt) => (
          <option key={opt.href} value={opt.href}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
