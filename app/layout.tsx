import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainLayout } from "@/components/layout/MainLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CRM Sa Farinha Team",
    template: "%s | CRM Sa Farinha Team",
  },
  description:
    "CRM imobiliário RE/MAX — gestão de leads, pipeline, tarefas e relatórios para a equipa Sa Farinha.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${inter.variable} font-sans`}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}