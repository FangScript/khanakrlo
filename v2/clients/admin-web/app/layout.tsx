import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Khana KarLo Operations", description: "Khana KarLo staff operations console" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
