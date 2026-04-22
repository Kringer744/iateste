import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeaturesProvider } from "@/contexts/FeaturesContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Closer IA - Dashboard",
  description: "Plataforma de agendamento inteligente com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-mesh min-h-screen text-foreground`}>
        <ErrorBoundary>
          <FeaturesProvider>
            {children}
          </FeaturesProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
