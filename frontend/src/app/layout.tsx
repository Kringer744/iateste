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
      <head>
        {/* MODO SEM LOGIN (teste): por padrão LIGADO. Semeia um token falso pra UI
            nunca redirecionar pro /login. O backend ignora o valor quando
            AUTH_DISABLED=true. Para religar o login: NEXT_PUBLIC_AUTH_DISABLED=false. */}
        {process.env.NEXT_PUBLIC_AUTH_DISABLED !== "false" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "try{if(!localStorage.getItem('token')){localStorage.setItem('token','auth-disabled')}}catch(e){}",
            }}
          />
        )}
      </head>
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
