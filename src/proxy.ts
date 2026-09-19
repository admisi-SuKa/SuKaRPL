import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-32.png|favicon-48.png|icon-192.png|icon-512.png|apple-touch-icon.png|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
