"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Mail, Phone, BellRing, Shield, Clock, Moon, Sun } from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

type Turno = "manha" | "tarde" | "noite";
type Cargo = "recepcao" | "concierge" | "governanca" | "gerente";

interface Funcionario {
  id: number;
  nome: string;
  cargo: Cargo;
  turno: Turno;
  email: string;
  telefone: string;
  ativo: boolean;
  checkinsHoje: number;
}

const mock: Funcionario[] = [
  { id: 1, nome: "Paula Souza",        cargo: "recepcao",   turno: "manha",  email: "paula@hotel.com",       telefone: "+55 11 9 8001-1001", ativo: true,  checkinsHoje: 6 },
  { id: 2, nome: "Marcos Ribeiro",     cargo: "recepcao",   turno: "tarde",  email: "marcos@hotel.com",      telefone: "+55 11 9 8001-1002", ativo: true,  checkinsHoje: 4 },
  { id: 3, nome: "Beatriz Matos",      cargo: "concierge",  turno: "tarde",  email: "bea@hotel.com",         telefone: "+55 11 9 8001-1003", ativo: true,  checkinsHoje: 0 },
  { id: 4, nome: "Diego Farias",       cargo: "recepcao",   turno: "noite",  email: "diego@hotel.com",       telefone: "+55 11 9 8001-1004", ativo: true,  checkinsHoje: 2 },
  { id: 5, nome: "Juliana Campos",     cargo: "governanca", turno: "manha",  email: "juliana@hotel.com",     telefone: "+55 11 9 8001-1005", ativo: true,  checkinsHoje: 0 },
  { id: 6, nome: "Ricardo Mendes",     cargo: "gerente",    turno: "manha",  email: "ricardo@hotel.com",     telefone: "+55 11 9 8001-1006", ativo: true,  checkinsHoje: 0 },
  { id: 7, nome: "Lucas Vieira",       cargo: "recepcao",   turno: "noite",  email: "lucas@hotel.com",       telefone: "+55 11 9 8001-1007", ativo: false, checkinsHoje: 0 },
];

const cargoLabel = (c: Cargo) =>
  ({ recepcao: "Recepção", concierge: "Concierge", governanca: "Governança", gerente: "Gerência" }[c]);
const cargoIcon = (c: Cargo) => (c === "gerente" ? Shield : c === "concierge" ? BellRing : c === "governanca" ? Clock : BellRing);

const turnoIcon = (t: Turno) => (t === "manha" ? Sun : t === "noite" ? Moon : Clock);
const turnoLabel = (t: Turno) =>
  ({ manha: "Manhã · 06h–14h", tarde: "Tarde · 14h–22h", noite: "Noite · 22h–06h" }[t]);

export default function RecepcaoPage() {
  const [filtro, setFiltro] = useState<Turno | "todos">("todos");

  const lista = mock.filter((f) => filtro === "todos" || f.turno === filtro);
  const counts = {
    todos: mock.length,
    manha: mock.filter((f) => f.turno === "manha").length,
    tarde: mock.filter((f) => f.turno === "tarde").length,
    noite: mock.filter((f) => f.turno === "noite").length,
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage="recepcao" />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Equipe de recepção</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                Recepcionistas, concierge, governança e gerência.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-100 transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novo membro
            </button>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ["todos", "Todos os turnos"],
              ["manha", "Manhã"],
              ["tarde", "Tarde"],
              ["noite", "Noite"],
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

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lista.map((f, i) => {
              const CargoIcon = cargoIcon(f.cargo);
              const TurnoIcon = turnoIcon(f.turno);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                      {f.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white tracking-tight truncate">{f.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500">
                        <CargoIcon className="w-3 h-3" strokeWidth={1.75} />
                        <span>{cargoLabel(f.cargo)}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border tracking-tight ${
                        f.ativo
                          ? "bg-emerald-500/10 text-emerald-300/90 border-emerald-500/20"
                          : "bg-[#141414] text-zinc-500 border-white/[0.06]"
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${f.ativo ? "bg-emerald-400" : "bg-zinc-600"}`} />
                      {f.ativo ? "ativo" : "inativo"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-[#0F0F0F] border border-white/[0.04]">
                    <TurnoIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                    <span className="text-[12px] text-zinc-300 tracking-tight tabular-nums">{turnoLabel(f.turno)}</span>
                  </div>

                  <div className="space-y-1.5 text-[12px] text-zinc-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{f.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
                      <span className="tabular-nums">{f.telefone}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 tracking-tight">Check-ins hoje</span>
                    <span className="text-[15px] font-medium text-white tabular-nums">{f.checkinsHoje}</span>
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
