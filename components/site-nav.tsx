"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Archive, BarChart3, FileText, Package } from "lucide-react"

const links = [
  { href: "/", label: "Stock", Icon: Package },
  { href: "/specs", label: "Spec Sheets", Icon: FileText },
  { href: "/archive", label: "Archive", Icon: Archive },
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
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
              <link.Icon className="nav-icon" aria-hidden="true" />
              <span className="nav-label">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
