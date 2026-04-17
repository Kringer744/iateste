"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="menu-triagem" titulo="Menu de triagem" descricao="Árvore de decisão inicial da IA quando um hóspede entra em contato." />;
}
