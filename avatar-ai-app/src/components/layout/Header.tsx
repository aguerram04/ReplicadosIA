import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Header() {
  const session: any = await getServerSession(authOptions as any);
  const displayName = session?.user?.name || session?.user?.email || "Invitado";

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6e8eb] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/replicadosia-logo.png"
            alt="ReplicadosIA"
            width={140}
            height={28}
            priority
          />
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden gap-5 md:flex md:items-center">
          <Link
            href="/"
            className="inline-flex h-8 items-center text-sm font-medium text-[#2e5783] hover:text-[#1769c1]"
          >
            Inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center text-sm font-medium text-[#2e5783] hover:text-[#1769c1]"
          >
            Tablero
          </Link>
          <Link
            href="/create"
            className="inline-flex h-8 items-center text-sm font-medium text-[#2e5783] hover:text-[#1769c1]"
          >
            Crear
          </Link>
          <Link
            href="/translate"
            className="inline-flex h-8 items-center text-sm font-medium text-[#2e5783] hover:text-[#1769c1]"
          >
            Traducir
          </Link>
          <Link
            href="/avatarid"
            className="btn-accent h-8 inline-flex items-center py-1"
          >
            AvatarID
          </Link>
        </nav>

        {/* Right: User */}
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#454545] md:inline">
            {displayName}
          </span>
          {session ? (
            <a
              href="/api/auth/signout"
              className="rounded-md border border-[#e6e8eb] px-3 py-1.5 text-sm text-[#454545] hover:bg-[#f6f7f9]"
            >
              Salir
            </a>
          ) : (
            <a
              href="/login"
              className="rounded-md bg-[#007bff] px-3 py-1.5 text-sm text-white hover:bg-[#1769c1]"
            >
              Entrar
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
