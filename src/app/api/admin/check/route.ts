import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("noirgateway_admin")?.value;
  const cookieAdmin = token === "authenticated";

  // Also check for badge-based admin
  const anonymousId = req.nextUrl.searchParams.get("anonymousId");
  let badgeAdmin = false;
  let badgeCode = null;

  if (anonymousId) {
    const user = await prisma.user.findFirst({
      where: { linkedIds: { has: anonymousId } },
      select: { badgeCode: true, isAdmin: true, role: true },
    });
    if (user) {
      badgeAdmin = user.isAdmin || user.role === "BUREAU";
      badgeCode = user.badgeCode;
    }
  }

  const isAdmin = cookieAdmin || badgeAdmin;

  return NextResponse.json({
    admin: isAdmin,
    badgeAdmin,
    badgeCode,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { password, badgeCode, anonymousId } = await req.json();

    // Badge-based admin verification
    if (badgeCode && anonymousId) {
      const user = await prisma.user.findUnique({
        where: { badgeCode },
        select: { isAdmin: true, linkedIds: true },
      });
      if (user && user.isAdmin) {
        const ids: string[] = Array.isArray(user.linkedIds) ? user.linkedIds : [];
        if (ids.includes(anonymousId)) {
          const res = NextResponse.json({ success: true, admin: true, badgeAdmin: true });
          res.cookies.set("noirgateway_admin", "authenticated", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          });
          return res;
        }
      }
    }

    // Fallback: password-based admin
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "noir2024";
    if (password === ADMIN_PASSWORD) {
      const res = NextResponse.json({ success: true, admin: true });
      res.cookies.set("noirgateway_admin", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }
    return NextResponse.json({ success: false, admin: false, error: "Invalid credentials" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, admin: false });
  res.cookies.set("noirgateway_admin", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
