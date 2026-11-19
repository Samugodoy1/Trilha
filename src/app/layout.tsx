import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Trilha", template: "%s · Trilha" },
  description: "Acompanhamento pedagógico e conexão entre escola e família.",
  applicationName: "Trilha",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Trilha", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("trilha_theme")?.value;
  const fixed = theme === "light" ? "#ffffff" : theme === "dark" ? "#000000" : null;
  return (
    <html lang="pt-BR" data-theme={theme === "light" || theme === "dark" ? theme : undefined} suppressHydrationWarning>
      {fixed && (
        <head>
          <meta name="theme-color" content={fixed} />
        </head>
      )}
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
