import { NextResponse } from "next/server";
import { heygenListTranslateLanguages } from "@/lib/heygen";

export async function GET() {
  try {
    const resp = await heygenListTranslateLanguages();
    const languages =
      (resp as any)?.data?.languages || (resp as any)?.languages || [];
    // Normalize to {code,label}
    const items = languages.map((name: string) => ({
      code: name,
      label: name,
    }));
    return NextResponse.json({ languages: items });
  } catch (e: any) {
    return NextResponse.json({ languages: [] }, { status: 200 });
  }
}
