"use client";
export const dynamic = "force-dynamic";
import HotelPlaceholder from "@/components/HotelPlaceholder";

export default function Page() {
  return <HotelPlaceholder activePage="integrations" titulo="Integrações" descricao="Conecte PMS, motor de reservas, WhatsApp, Chatwoot e mais." />;
}
