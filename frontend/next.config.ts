import type { NextConfig } from "next";

// Hostname interno do Docker (mesmo projeto EasyPanel = mesma rede)
// Fallback para a URL pública caso rode fora do Docker
const API_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://hotelbot_bot:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${API_URL}/:path*`,
      },
      // /barbearia/* é um alias visual de /dashboard/*.
      // Usamos rewrite (não redirect) para manter a URL /barbearia
      // na barra do navegador enquanto renderiza a página de /dashboard.
      { source: "/barbearia", destination: "/dashboard" },
      { source: "/barbearia/:path*", destination: "/dashboard/:path*" },
    ];
  },
};

export default nextConfig;
