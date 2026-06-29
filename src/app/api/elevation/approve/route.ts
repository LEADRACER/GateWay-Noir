import { NextRequest, NextResponse } from "next/server";
import { approveElevation } from "@/lib/elevation-actions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    const cookie = req.cookies.get("noirgateway_id")?.value;

    // Look up admin by session cookie or fallback to any BRU user
    let admin = null;
    if (cookie) {
      admin = await prisma.user.findFirst({
        where: {
          OR: [
            { linkedIds: { contains: cookie } },
            { badgeCode: cookie },
          ],
        },
      });
    }

    if (!admin || admin.role !== "BUREAU") {
      admin = await prisma.user.findFirst({ where: { role: "BUREAU" } });
    }

    if (!admin) return NextResponse.json({ error: "No BRU user found" }, { status: 401 });
    if (admin.role !== "BUREAU") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const result = await approveElevation(requestId, admin.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to approve" }, { status: 500 });
  }
}
