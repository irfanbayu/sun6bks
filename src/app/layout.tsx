import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SUN 6 BKS | Standupindo Bekasi",
  description:
    "Komunitas Stand-up Comedy Bekasi - Event, Tiket, dan Komunitas Komedi Terbesar di Bekasi",
};

/**
 * Root layout — wraps the entire app with ClerkProvider when the key is
 * available. During `next build` without env vars the provider is skipped
 * so pre-rendering of the _not-found shell and other static pages succeeds.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );

  if (!hasClerkKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
