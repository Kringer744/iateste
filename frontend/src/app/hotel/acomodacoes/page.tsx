"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BedDouble, Plus, Users, Coffee, Wifi, Tv, Bath, Wind, Edit2,
} from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

type Categoria = "standard" | "deluxe" | "suite" | "master";
type Estado = "disponivel" | "ocupado" | "limpeza" | "manutencao";

interface Acomodacao {
  id: string;
  numero: string;
  categoria: Categoria;
  capacidade: number;
  diaria: number;
  estado: Estado;
  amenidades: string[];
}

const mock: Acomodacao[] = [
  { id: "Q-101", numero: "101", categoria: "standard", capacidade: 2, diaria: 370,  estado: "disponivel", amenidades: ["wifi", "tv", "ar"] },
  { id: "Q-105", numero: "105", categoria: "standard", capacidade: 2, diaria: 370,  estado: "limpeza",    amenidades: ["wifi", "tv", "ar"] },
  { id: "Q-108", numero: "108", categoria: "deluxe",   capacidade: 2, diaria: 620,  estado: "disponivel", amenidades: ["wifi", "tv", "ar", "cafe", "banheira"] },
  { id: "Q-109", numero: "109", categoria: "standard", capacidade: 2, diaria: 370,  estado: "ocupado",    amenidades: ["wifi", "tv", "ar"] },
  { id: "Q-112", numero: "112", categoria: "standard", capacidade: 2, diaria: 370,  estado: "ocupado",    amenidades: ["wifi", "tv", "ar"] },
  { id: "Q-204", numero: "204", categoria: "suite",    capacidade: 3, diaria: 620,  estado: "ocupado",    amenidades: ["wifi", "tv", "ar", "cafe", "banheira"] },
  { id: "Q-207", numero: "207", categoria: "deluxe",   capacidade: 2, diaria: 620,  estado: "ocupado",    amenidades: ["wifi", "tv", "ar", "cafe"] },
  { id: "Q-210", numero: "210", categoria: "deluxe",   capacidade: 2, diaria: 620,  estado: "disponivel", amenidades: ["wifi", "tv", "ar", "cafe"] },
  { id: "Q-301", numero: "301", categoria: "suite",    capacidade: 4, diaria: 640,  estado: "ocupado",    amenidades: ["wifi", "tv", "ar", "cafe", "banheira"] },
  { id: "Q-305", numero: "305", categoria: "suite",    capacidade: 3, diaria: 780,  estado: "manutencao", amenidades: ["wifi", "tv", "ar", "cafe", "banheira"] },
  { id: "Q-401", numero: "401", categoria: "master",   capacidade: 4, diaria: 1200, estado: "ocupado",    amenidades: ["wifi", "tv", "ar", "cafe", "banheira"] },
];

const catLabel = (c: Categoria) =>
  ({ standard: "Standard", deluxe: "Deluxe", suite: "Suíte", master: "Master Suíte" }[c]);

const estadoStyle = (e: Estado) => {
  switch (e) {
    case "disponivel": return { chip: "bg-emerald-500/10 text-emerald-300/90 border-emerald-500/20", dot: "bg-emerald-400" };
    case "ocupado":    return { chip: "bg-[#1A1A1A] text-zinc-300 border-white/[0.10]",             dot: "bg-white" };
    case "limpeza":    return { chip: "bg-amber-500/10 text-amber-300/90 border-amber-500/20",      dot: "bg-amber-400" };
    case "manutencao": return { chip: "bg-rose-500/10 text-rose-300/90 border-rose-500/20",         dot: "bg-rose-400" };
  }
};
const estadoLabel = (e: Estado) =>
  ({ disponivel: "disponível", ocupado: "ocupado", limpeza: "em limpeza", manutencao: "manutenção" }[e]);

const amenityIcon: Record<string, any> = {
  wifi: Wifi,
  tv: Tv,
  ar: Wind,
  cafe: Coffee,
  banheira: Bath,
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AcomodacoesPage() {
  const [filtro, setFiltro] = useState<Estado | "todos">("todos");

  const lista = mock.filter((q) => filtro === "todos" || q.estado === filtro);
  const counts = {
    todos: mock.length,
    disponivel: mock.filter((q) => q.estado === "disponivel").length,
    ocupado: mock.filter((q) => q.estado === "ocupado").length,
    limpeza: mock.filter((q) => q.estado === "limpeza").length,
    manutencao: mock.filter((q) => q.estado === "manutencao").length,
  };

  const ocupacaoPct = Math.round((counts.ocupado / counts.todos) * 100);

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage="acomodacoes" />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Acomodações</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                {counts.todos} quartos · {ocupacaoPct}% de ocupação agora.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-100 transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Nova acomodação
            </button>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["todos", "Todos"],
              ["disponivel", "Disponíveis"],
              ["ocupado", "Ocupados"],
              ["limpeza", "Em limpeza"],
              ["manutencao", "Manutenção"],
            ] as const).map(([key, label]) => {
              const active = filtro === key;
              return (
                <button
                  key={key}
                  onClick={() => setFiltro(key as any)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] tracking-tight border transition-colors ${
                    active
                      ? "bg-[#1E1E1E] text-white border-white/[0.10]"
                      : "bg-[#141414] text-zinc-400 border-white/[0.06] hover:text-white hover:border-white/[0.10]"
                  }`}
                >
                  {label}
                  <span className="text-[10px] text-zinc-500 tabular-nums">{counts[key as keyof typeof counts]}</span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map((q, i) => {
              const st = estadoStyle(q.estado);
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                        <p className="text-[11px] uppercase tracking-widest text-zinc-500">{catLabel(q.categoria)}</p>
                      </div>
                      <p className="text-[28px] font-semibold text-white tracking-tight tabular-nums leading-tight mt-1">
                        {q.numero}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border tracking-tight ${st.chip}`}>
                      <span className={`w-1 h-1 rounded-full ${st.dot}`} />
                      {estadoLabel(q.estado)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[12px] text-zinc-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                      <span>{q.capacidade} pessoas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {q.amenidades.map((a) => {
                      const Icon = amenityIcon[a];
                      if (!Icon) return null;
                      return (
                        <div
                          key={a}
                          className="w-7 h-7 rounded-lg bg-[#0F0F0F] border border-white/[0.04] flex items-center justify-center"
                          title={a}
                        >
                          <Icon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Diária</p>
                      <p className="text-[16px] font-medium text-white tabular-nums">{brl(q.diaria)}</p>
                    </div>
                    <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors opacity-0 group-hover:opacity-100">
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
