import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "BatchBrain",
  description: "Premix stock, spec sheets, and recipe archive",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <strong>BatchBrain</strong>
          <Link href="/">Stock</Link>
          <Link href="/specs">Spec Sheets</Link>
          <Link href="/archive">Archive</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
