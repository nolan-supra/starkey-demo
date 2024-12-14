import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import TopNavBar from "@/components/TopNavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StarKey Wallet Connect",
  description: "StarKey Wallet Connect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {





  return (
    <html lang="en">
      <body className={inter.className}>
      <TopNavBar/>
      {children}
      </body>
    </html>
  );
}
