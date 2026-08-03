import type { Metadata } from "next"
import { Manrope, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { SiteNav } from "@/components/site-nav"

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
})

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const metadata: Metadata = {
  title: "BatchBrain",
  description: "Premix stock, spec sheets, and recipe archive",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <SiteNav />
        <main>{children}</main>
      </body>
    </html>
  )
}
