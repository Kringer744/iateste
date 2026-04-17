"use client";

import { usePathname } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import HotelSidebar from "./HotelSidebar";

interface Props {
  activePage?: string;
}

/**
 * Sidebar inteligente: detecta a árvore pelo pathname e renderiza
 * a sidebar correspondente. Permite que uma mesma página funcione
 * tanto em /dashboard/* (barbearia) quanto em /hotel/* (hotel) sem
 * duplicar o componente.
 */
export default function AppSidebar({ activePage }: Props) {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/hotel")) {
    return <HotelSidebar activePage={activePage} />;
  }
  return <DashboardSidebar activePage={activePage} />;
}
