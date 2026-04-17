"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="settings" titulo="Configurações" descricao="Dados da empresa, horários, preferências e segurança." />;
}
