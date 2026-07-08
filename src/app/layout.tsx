import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parent Companion App",
  description: "Family dashboard for school homework, tests, and activities",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
