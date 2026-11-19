import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/entrar", "/criar-conta", "/convite", "/offline.html", "/manifest.webmanifest", "/sw.js"];

/** Barreira leve: sem cookie de sessão, vai para o login. As permissões reais são verificadas no servidor. */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (!req.cookies.get("trilha_session")) {
    if (pathname.startsWith("/api/")) return new NextResponse("Não autorizado", { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons/|favicon).*)"],
};
