"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, Mail, Phone, Globe, Star, Calendar, Crown, Filter,
} from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

type Tier = "frequente" | "premium" | "novo";

interface Hospede {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  pais: string;
  estadias: number;
  ultima: string;
  gastoTotal: number;
  tier: Tier;
  notas: number;
}

const mock: Hospede[] = [
  { id: 1, nome: "Ana Paula Moreira",   email: "ana.moreira@email.com",     telefone: "+55 11 9 8321-0022", pais: "Brasil",   estadias: 8, ultima: "2026-04-02", gastoTotal: 14820, tier: "premium",   notas: 3 },
  { id: 2, nome: "Rafael Castro",        email: "rafael.castro@email.com",   telefone: "+55 21 9 9981-2210", pais: "Brasil",   estadias: 4, ultima: "2026-03-18", gastoTotal:  6200, tier: "frequente", notas: 1 },
  { id: 3, nome: "Marina Oliveira",      email: "marina.o@email.com",        telefone: "+55 11 9 8877-1020", pais: "Brasil",   estadias: 2, ultima: "2026-02-22", gastoTotal:  2480, tier: "frequente", notas: 0 },
  { id: 4, nome: "Carlos Eduardo Lima",  email: "carlos.lima@email.com",     telefone: "+55 31 9 9402-7755", pais: "Brasil",   estadias: 1, ultima: "2026-01-10", gastoTotal:   740, tier: "novo",      notas: 2 },
  { id: 5, nome: "James O'Connor",       email: "james.oconnor@mail.com",    telefone: "+1 415 555 0198",    pais: "EUA",      estadias: 3, ultima: "2026-02-05", gastoTotal:  9100, tier: "frequente", notas: 0 },
  { id: 6, nome: "Sofia Martín",         email: "sofia.martin@correo.es",    telefone: "+34 91 555 0012",    pais: "Espanha",  estadias: 1, ultima: "2025-12-28", gastoTotal:  1860, tier: "novo",      notas: 1 },
  { id: 7, nome: "Helena Duarte",        email: "helena.duarte@email.com",   telefone: "+55 41 9 9900-1200", pais: "Brasil",   estadias: 12, ultima: "2026-04-16", gastoTotal: 28400, tier: "premium",  notas: 5 },
  { id: 8, nome: "Família Tavares",      email: "tavares.familia@email.com", telefone: "+55 51 9 9111-3344", pais: "Brasil",   estadias: 2, ultima: "2026-03-30", gastoTotal:  6400, tier: "frequente", notas: 0 },
];

const tierStyle = (t: Tier) => {
  switch (t) {
    case "premium":   return "bg-[#1A1A1A] text-white border-white/[0.12]";
    case "frequente": return "bg-[#141414] text-zinc-300 border-white/[0.08]";
    case "novo":      return "bg-[#141414] text-zinc-400 border-white/[0.06]";
  }
};
const tierLabel = (t: Tier) => ({ premium: "Premium", frequente: "Frequente", novo: "Novo" }[t]);

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HospedesPage() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Tier | "todos">("todos");

  const lista = useMemo(
    () =>
      mock
        .filter((h) => filtro === "todos" || h.tier === filtro)
        .filter((h) => {
          if (!busca) return true;
          const q = busca.toLowerCase();
          return h.nome.toLowerCase().includes(q) || h.email.toLowerCase().includes(q);
        }),
    [busca, filtro]
  );

  const counts = {
    todos: mock.length,
    premium: mock.filter((h) => h.tier === "premium").length,
    frequente: mock.filter((h) => h.tier === "frequente").length,
    novo: mock.filter((h) => h.tier === "novo").length,
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage="hospedes" />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Hóspedes</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                Histórico completo, preferências e gastos de cada hóspede.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-100 transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novo hóspede
            </button>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["todos", "Todos"],
              ["premium", "Premium"],
              ["frequente", "Frequente"],
              ["novo", "Novo"],
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

          {/* Busca */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#141414] border border-white/[0.06] rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/15"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2.5 bg-[#141414] border border-white/[0.06] rounded-xl text-sm text-zinc-300 hover:text-white hover:border-white/15 transition-colors">
              <Filter className="w-4 h-4" strokeWidth={1.75} />
              Filtros
            </button>
          </div>

          {/* Grid de cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lista.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                    {h.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-white tracking-tight truncate">{h.nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500">
                      <Globe className="w-3 h-3" strokeWidth={1.75} />
                      <span>{h.pais}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border tracking-tight ${tierStyle(h.tier)}`}>
                    {h.tier === "premium" && <Crown className="w-3 h-3" strokeWidth={1.75} />}
                    {tierLabel(h.tier)}
                  </span>
                </div>

                <div className="space-y-1.5 text-[12px] text-zinc-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{h.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
                    <span className="tabular-nums">{h.telefone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Estadias</p>
                    <p className="text-[15px] font-medium text-white tabular-nums">{h.estadias}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Última</p>
                    <p className="text-[12px] text-zinc-300 tabular-nums mt-0.5">{h.ultima}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Gasto</p>
                    <p className="text-[12px] text-white tabular-nums mt-0.5 font-medium">{brl(h.gastoTotal)}</p>
                  </div>
                </div>

                {h.notas > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <Star className="w-3 h-3" strokeWidth={1.75} />
                    <span>{h.notas} {h.notas === 1 ? "nota interna" : "notas internas"}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
