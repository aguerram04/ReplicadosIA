"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { HEYGEN_LANGUAGES } from "@/config/heygen-languages";
import { useEffect as useClientEffect } from "react";

type Option = { code: string; label: string };

const FALLBACK: Option[] = [
  { code: "auto", label: "Auto" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "Chinese (Zh)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "ko", label: "한국어 (Korean)" },
  { code: "ru", label: "Русский (Russian)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "tr", label: "Türkçe" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "pl", label: "Polski" },
  { code: "no", label: "Norsk" },
  { code: "da", label: "Dansk" },
  { code: "fi", label: "Suomi" },
  { code: "el", label: "Ελληνικά (Greek)" },
  { code: "he", label: "עברית (Hebrew)" },
  { code: "th", label: "ไทย (Thai)" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "ro", label: "Română" },
  { code: "cs", label: "Čeština" },
  { code: "hu", label: "Magyar" },
  { code: "uk", label: "Українська" },
  { code: "bg", label: "Български" },
  { code: "hr", label: "Hrvatski" },
  { code: "sk", label: "Slovenčina" },
  { code: "sl", label: "Slovenščina" },
  { code: "lt", label: "Lietuvių" },
  { code: "lv", label: "Latviešu" },
  { code: "et", label: "Eesti" },
  { code: "fa", label: "فارسی (Farsi)" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "si", label: "සිංහල (Sinhala)" },
  { code: "am", label: "አማርኛ (Amharic)" },
  { code: "sw", label: "Kiswahili" },
  { code: "zu", label: "Zulu" },
  { code: "af", label: "Afrikaans" },
  { code: "fil", label: "Filipino" },
];

export default function LanguageSelect({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const [remote, setRemote] = useState<Option[] | null>(null);
  useClientEffect(() => {
    fetch("/api/heygen/translate/languages")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.languages) && j.languages.length)
          setRemote(j.languages);
      })
      .catch(() => {});
  }, []);
  const base =
    (remote && remote.length ? remote : null) ||
    (HEYGEN_LANGUAGES && HEYGEN_LANGUAGES.length ? HEYGEN_LANGUAGES : FALLBACK);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [query, base]);

  const selected = useMemo(
    () =>
      base.find((l) => l.code === value) || {
        code: value || "",
        label: value || "",
      },
    [value, base]
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full rounded-2xl border border-border bg-transparent p-3 text-left"
      >
        {selected?.label || placeholder || "Seleccionar idioma"}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-white shadow">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar idioma..."
              className="w-full rounded-xl border border-border bg-transparent p-2 text-sm"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {options.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => {
                  onChange(o.code);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f6f7f9]"
              >
                <span>{o.label}</span>
                <span className="opacity-60">{o.code}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm opacity-60">Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
