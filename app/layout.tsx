import type { Metadata } from "next"
import "./globals.css"
import { SiteNav } from "@/components/site-nav"
import { OfflineSupport } from "@/components/offline-support"

export const metadata: Metadata = {
  title: "BatchBrain",
  description: "Premix stock, spec sheets, and recipe archive",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BatchBrain" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <OfflineSupport />
        <SiteNav />
        <main>{children}</main>
      </body>
    </html>
  )
}
