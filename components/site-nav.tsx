"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Stock", icon: "▣" },
  { href: "/specs", label: "Spec Sheets", icon: "☷" },
  { href: "/archive", label: "Archive", icon: "□" },
  { href: "/analytics", label: "Analytics", icon: "◔" },
]

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation">
      <Link href="/" className="brand" aria-label="BatchBrain home">
        <span>BatchBrain</span>
      </Link>
      <div className="nav-links">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link key={link.href} href={link.href} className={isActive ? "active" : undefined} aria-current={isActive ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
