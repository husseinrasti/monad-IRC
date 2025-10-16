import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monad IRC",
  description: "Decentralized IRC on Monad Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

