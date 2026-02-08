import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Scope — The PM Operating System",
  description:
    "A unified operating system for Product Managers. Integrate Linear, GitHub, Notion, Slack, Gmail, and more.",
  icons: {
    icon: "/scope_logo.png",
    apple: "/scope_logo.png",
  },
  openGraph: {
    title: "Scope — The PM Operating System",
    description: "A unified operating system for Product Managers.",
    type: "website",
    images: ["/scope_logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
