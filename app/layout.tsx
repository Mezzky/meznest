import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Meznest — Your little team, together",
  description: "A cozy workspace for your AI design and development team.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
