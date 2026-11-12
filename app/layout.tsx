import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "decryptor.sh",
  description: "XOR brute-force terminal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}