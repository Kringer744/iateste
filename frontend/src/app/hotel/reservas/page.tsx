"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck, ChevronLeft, ChevronRight, Plus, Search, Filter,
  BedDouble, Clock, Users,
} from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

type Status = "confirmada" | "pendente" | "cancelada" | "checkin" | "checkout";

interface Reserva {
  id: string;
  hospede: string;
  quarto: string;
  checkin: string; // YYYY-MM-DD
  checkout: string;
  pessoas: number;
  status: Status;
  total: number;
}

const mockReservas: Reserva[] = [
  { id: "R-1048", hospede: "Ana Paula Moreira",    quarto: "Suíte 204",             checkin: "2026-04-17", checkout: "2026-04-20", pessoas: 2, status: "checkin",    total: 1860 },
  { id: "R-1049", hospede: "Carlos Eduardo Lima",  quarto: "Standard 112",          checkin: "2026-04-17", checkout: "2026-04-19", pessoas: 1, status: "confirmada", total:  740 },
  { id: "R-1050", hospede: "Família Tavares",      quarto: "Suíte Família 301",     checkin: "2026-04-17", checkout: "2026-04-22", pessoas: 4, status: "pendente",   total: 3200 },
  { id: "R-1051", hospede: "Marina Oliveira",      quarto: "Deluxe 207",            checkin: "2026-04-17", checkout: "2026-04-18", pessoas: 2, status: "checkin",    total:  620 },
  { id: "R-1052", hospede: "Rafael Castro",        quarto: "Suíte 204",             checkin: "2026-04-18", checkout: "2026-04-21", pessoas: 2, status: "confirmada", total: 1860 },
  { id: "R-1053", hospede: "Luiza Andrade",        quarto: "Standard 105",          checkin: "2026-04-18", checkout: "2026-04-19", pessoas: 1, status: "confirmada", total:  370 },
  { id: "R-1054", hospede: "Henrique Souza",       quarto: "Deluxe 210",            checkin: "2026-04-19", checkout: "2026-04-23", pessoas: 2, status: "confirmada", total: 2480 },
  { id: "R-1055", hospede: "Júlia e Marcos",       quarto: "Master Suíte 401",      checkin: "2026-04-19", checkout: "2026-04-24", pessoas: 2, status: "confirmada", total: 4200 },
  { id: "R-1056", hospede: "Gabriel Nunes",        quarto: "Standard 109",          checkin: "2026-04-20", checkout: "2026-04-21", pessoas: 1, status: "confirmada", total:  370 },
  { id: "R-1057", hospede: "Sra. Helena",          quarto: "Deluxe 108",            checkin: "2026-04-16", checkout: "2026-04-17", pessoas: 1, status: "checkout",   total:  620 },
];

const hoje = "2026-04-17";

const statusStyle = (s: Status) => {
  switch (s) {
    case "checkin":    return "bg-[#1A1A1A] text-white border-white/[0.12]";
    case "checkout":   return "bg-[#141414] text-zinc-400 border-white/[0.06]";
    case "confirmada": return "bg-[#141414] text-zinc-300 border-white/[0.08]";
    case "pendente":   return "bg-amber-500/10 text-amber-300/90 border-amber-500/20";
    case "cancelada":  return "bg-[#141414] text-zinc-600 border-white/[0.04] line-through";
  }
};

const statusLabel = (s: Status) =>
  ({ checkin: "check-in hoje", checkout: "check-out hoje", confirmada: "confirmada", pendente: "pendente", cancelada: "cancelada" }[s]);

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ReservasPage() {
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    return mockReservas
      .filter((r) => filtro === "todos" || r.status === filtro)
      .filter((r) => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return (
          r.hospede.toLowerCase().includes(q) ||
          r.quarto.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      });
  }, [filtro, busca]);

  const contador = (s: Status | "todos") =>
    s === "todos" ? mockReservas.length : mockReservas.filter((r) => r.status === s).length;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage="reservas" />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Reservas</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                Gerencie reservas, check-ins e check-outs do hotel.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-100 transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Nova reserva
            </button>
          </div>

          {/* Chips de status */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["todos", "Todas"],
              ["checkin", "Check-in hoje"],
              ["checkout", "Check-out hoje"],
              ["confirmada", "Confirmadas"],
              ["pendente", "Pendentes"],
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
                  <span className="text-[10px] text-zinc-500 tabular-nums">{contador(key as any)}</span>
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
                placeholder="Buscar por hóspede, quarto ou código"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#141414] border border-white/[0.06] rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/15"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2.5 bg-[#141414] border border-white/[0.06] rounded-xl text-sm text-zinc-300 hover:text-white hover:border-white/15 transition-colors">
              <Filter className="w-4 h-4" strokeWidth={1.75} />
              Filtros
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[110px_1fr_1fr_140px_140px_80px_140px_120px] gap-4 px-5 py-3 text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] bg-[#0F0F0F]">
              <div>Código</div>
              <div>Hóspede</div>
              <div>Acomodação</div>
              <div>Check-in</div>
              <div>Check-out</div>
              <div className="text-right">Pessoas</div>
              <div>Status</div>
              <div className="text-right">Total</div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {lista.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-zinc-500 tracking-tight">
                  Nenhuma reserva encontrada.
                </div>
              )}
              {lista.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="grid grid-cols-[110px_1fr_1fr_140px_140px_80px_140px_120px] gap-4 px-5 py-3.5 text-sm items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="font-mono text-[12px] text-zinc-500 tabular-nums">{r.id}</div>
                  <div className="text-white tracking-tight truncate">{r.hospede}</div>
                  <div className="text-zinc-300 tracking-tight truncate flex items-center gap-2">
                    <BedDouble className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
                    {r.quarto}
                  </div>
                  <div className="text-zinc-400 tabular-nums text-[13px]">
                    {r.checkin}
                    {r.checkin === hoje && <span className="ml-1.5 text-[10px] text-white">(hoje)</span>}
                  </div>
                  <div className="text-zinc-400 tabular-nums text-[13px]">{r.checkout}</div>
                  <div className="text-right text-zinc-300 tabular-nums flex items-center justify-end gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                    {r.pessoas}
                  </div>
                  <div>
                    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border tracking-tight ${statusStyle(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-right text-white tabular-nums font-medium">{brl(r.total)}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-between text-xs text-zinc-500 tracking-tight">
            <span>{lista.length} reservas</span>
            <div className="flex items-center gap-3">
              <span>Total no período</span>
              <span className="text-white tabular-nums font-medium">
                {brl(lista.reduce((s, r) => s + r.total, 0))}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
