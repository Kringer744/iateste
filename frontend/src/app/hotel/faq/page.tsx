"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="faq" titulo="FAQ" descricao="Perguntas frequentes que a IA usa para responder hóspedes." />;
}
