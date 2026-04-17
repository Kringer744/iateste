"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="followups" titulo="Follow-ups" descricao="Mensagens pós check-out, pesquisas de satisfação e reativação." />;
}
