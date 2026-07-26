"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Stock" },
  { href: "/specs", label: "Spec Sheets" },
  { href: "/archive", label: "Archive" },
]

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation">
      <Link href="/" className="brand" aria-label="BatchBrain home">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span>BatchBrain</span>
      </Link>
      <div className="nav-links">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link key={link.href} href={link.href} className={isActive ? "active" : undefined} aria-current={isActive ? "page" : undefined}>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
