import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenListAvatarsInGroup } from "@/lib/heygen";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data: any = await heygenListAvatarsInGroup(params.id);
    const avatars =
      data?.data?.avatars ||
      data?.avatars ||
      data?.data?.avatar_list ||
      data?.avatar_list ||
      [];
    return NextResponse.json({ data: { avatars } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
