import type { Metadata } from "next"
import "./globals.css"
import { SiteNav } from "@/components/site-nav"

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
        <SiteNav />
        <main>{children}</main>
      </body>
    </html>
  )
}
