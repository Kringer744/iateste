"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="logs" titulo="Logs" descricao="Auditoria de ações do sistema e das mensagens automáticas." />;
}
