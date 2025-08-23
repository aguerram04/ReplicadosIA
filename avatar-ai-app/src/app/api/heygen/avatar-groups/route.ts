import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenListAvatarGroups } from "@/lib/heygen";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data: any = await heygenListAvatarGroups();
    const groups =
      data?.data?.groups ||
      data?.groups ||
      data?.data?.avatar_group_list ||
      data?.avatar_group_list ||
      [];
    return NextResponse.json({ data: { groups } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
