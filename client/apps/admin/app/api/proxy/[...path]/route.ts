import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("cg_access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Middleware already verified the JWT and injected this header
  const tenantId = request.headers.get("x-tenant-id");

  if (!tenantId || tenantId === "undefined" || tenantId === "null") {
    return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });
  }

  const { path } = await params;
  const search = request.nextUrl.search;
  const url = `${BACKEND}/${path.join("/")}${search}`;

  const headers: HeadersInit = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
    "X-Tenant-Id":   tenantId,
  };

  const init: RequestInit = { method: request.method, headers };
  if (!["GET", "DELETE", "HEAD"].includes(request.method)) {
    init.body = await request.text();
  }

  // const res = await fetch(url, init);
  // const data = await res.text();

  // return new NextResponse(data, {
  //   status: res.status,
  //   headers: { "Content-Type": "application/json" },
  // });
  const res = await fetch(url, init);
const data = await res.text();

// If backend says Unauthorized, clear auth cookies
if (res.status === 401) {
  const response = new NextResponse(data, {
    status: 401,
    headers: {
      "Content-Type": "application/json",
    },
  });

  response.cookies.set("cg_access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("cg_refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}

return new NextResponse(data, {
  status: res.status,
  headers: {
    "Content-Type": "application/json",
  },
});
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;