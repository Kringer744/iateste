"use client";

import { Sparkles } from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

interface Props {
  activePage: string;
  titulo: string;
  descricao: string;
}

export default function HotelPlaceholder({ activePage, titulo, descricao }: Props) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage={activePage} />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1000px] mx-auto p-6 lg:p-10">
          <h1 className="text-[28px] font-semibold text-white tracking-tight">{titulo}</h1>
          <p className="text-sm text-zinc-500 tracking-tight mt-1">{descricao}</p>

          <div className="mt-8 bg-[#141414] border border-white/[0.06] rounded-2xl p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-medium text-white tracking-tight mb-1">
              Módulo em construção
            </p>
            <p className="text-sm text-zinc-500 tracking-tight max-w-md mx-auto">
              Esta seção será adaptada para o contexto hoteleiro em breve, mantendo o mesmo
              padrão visual Lunor do resto do sistema.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
