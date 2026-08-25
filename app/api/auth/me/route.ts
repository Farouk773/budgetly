import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/backend/auth";

export async function GET(request: NextRequest) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = rawToken ? await validateSessionToken(rawToken) : null;

  return NextResponse.json({ user }, { status: 200 });
}
