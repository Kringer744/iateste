"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="insights" titulo="Insights" descricao="Métricas consolidadas de ocupação, receita e atendimento." />;
}
