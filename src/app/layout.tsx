import type { Metadata, Viewport } from "next";
import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "SuKaRPL",
    template: "%s | SuKaRPL"
  },
  description: "Portal Rekognisi Pembelajaran Lampau UIN Sunan Kalijaga",
  applicationName: "SuKaRPL",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#075b52",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
