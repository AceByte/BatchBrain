"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const links = [
  { href: "/", label: "Stock" },
  { href: "/specs", label: "Spec Sheets" },
  { href: "/archive", label: "Archive" },
  { href: "/analytics", label: "Analytics" },
]

export function SiteNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav aria-label="Main navigation">
      <div className="nav-bar">
        <Link href="/" className="brand" aria-label="BatchBrain home" onClick={() => setIsOpen(false)}>
          <span className="brand-mark" aria-hidden="true">B</span>
          <span>BatchBrain</span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={isOpen}
          aria-controls="main-nav-links"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true" className="nav-toggle-icon" />
        </button>
      </div>
      <div id="main-nav-links" className={`nav-links${isOpen ? " is-open" : ""}`}>
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={isActive ? "active" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
