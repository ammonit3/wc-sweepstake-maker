"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Football } from "./Decor";

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand"><Football size={26} /> Sweepstake <span className="u">Maker</span></Link>
        <div style={{ flex: 1 }} />
        <Link href="/new" className={path === "/new" ? "active" : ""}>Create</Link>
      </div>
    </nav>
  );
}
