"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="units" titulo="Unidades" descricao="Gerencie múltiplas unidades do hotel ou da rede." />;
}
