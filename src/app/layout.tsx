import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { MidtransProvider } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SUN 6 BKS | Standupindo Bekasi",
  description: "Komunitas Stand-up Comedy Bekasi - Event, Tiket, dan Komunitas Komedi Terbesar di Bekasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <MidtransProvider />
      </body>
    </html>
  );
}
