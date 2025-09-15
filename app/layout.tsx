import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Pixie - Your Design Partner",
  description: "Transform UI components with AI-powered voice commands and real-time design modifications",
  generator: "v0.app",
  openGraph: {
    title: "Pixie - Your Design Partner",
    description: "Transform UI components with AI-powered voice commands and real-time design modifications",
    url: "https://pixiedesign.vercel.app",
    siteName: "Pixie",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Pixie - Your Design Partner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixie - Your Design Partner",
    description: "Transform UI components with AI-powered voice commands and real-time design modifications",
    images: ["/api/og"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
