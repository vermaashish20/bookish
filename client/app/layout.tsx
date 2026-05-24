import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ClerkTokenSync } from "@/contexts/ClerkTokenSync";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Bookish - Write and Read AI Books',
  description: 'A minimal AI book authoring platform with a public shelf of books to read.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <ClerkTokenSync />
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
