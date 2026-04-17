"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import {
  BedDouble, CalendarCheck, Users, TrendingUp, LogIn, LogOut, Star,
  ArrowUpRight, ArrowDownRight, Sparkles, Clock, MessageSquare,
} from "lucide-react";
import HotelSidebar from "@/components/HotelSidebar";

// --- dados mock (serão substituídos quando o motor de reservas for integrado) ---
const kpis = [
  { label: "Ocupação hoje",      value: "78%",  delta: "+6 pts",  trend: "up",   icon: BedDouble,     hint: "31 de 40 acomodações" },
  { label: "Reservas no mês",    value: "246",  delta: "+12%",    trend: "up",   icon: CalendarCheck, hint: "vs. mês anterior" },
  { label: "Diária média (ADR)", value: "R$ 412", delta: "+2,3%", trend: "up",   icon: TrendingUp,    hint: "últimos 30 dias" },
  { label: "Check-ins hoje",     value: "14",   delta: "3 pendentes", trend: "neutral", icon: LogIn, hint: "até 22h" },
];

const funnelSteps = [
  { label: "Contato inicial",       value: 312 },
  { label: "Cotação enviada",       value: 184 },
  { label: "Reservas confirmadas",  value:  96 },
];

const checkInsHoje = [
  { nome: "Ana Paula Moreira",   quarto: "Suíte 204",   horario: "14:30", pessoas: 2, noites: 3, status: "pendente"   },
  { nome: "Carlos Eduardo",      quarto: "Standard 112", horario: "15:00", pessoas: 1, noites: 2, status: "confirmado" },
  { nome: "Família Tavares",     quarto: "Suíte Família 301", horario: "16:15", pessoas: 4, noites: 5, status: "pendente" },
  { nome: "Marina Oliveira",     quarto: "Deluxe 207",  horario: "18:00", pessoas: 2, noites: 1, status: "confirmado" },
];

const atividade = [
  { tipo: "reserva",  titulo: "Reserva confirmada",              descricao: "Rafael Castro · Suíte 204 · 3 noites",          tempo: "há 4 min" },
  { tipo: "checkout", titulo: "Check-out concluído",             descricao: "Sra. Helena · Deluxe 108 · diária R$ 520",      tempo: "há 22 min" },
  { tipo: "msg",      titulo: "Mensagem pendente",               descricao: "Hóspede pergunta sobre transfer aeroporto",     tempo: "há 38 min" },
  { tipo: "avaliacao",titulo: "Nova avaliação · 5 estrelas",     descricao: "\"Atendimento impecável, quarto imaculado.\"", tempo: "há 1h" },
  { tipo: "reserva",  titulo: "Cotação enviada",                 descricao: "Grupo corporativo · 8 quartos · 2 noites",      tempo: "há 2h" },
];

// --- helpers ---
const iconAtividade = (tipo: string) => {
  if (tipo === "checkout") return LogOut;
  if (tipo === "msg") return MessageSquare;
  if (tipo === "avaliacao") return Star;
  return CalendarCheck;
};

const statusCheckIn = (s: string) =>
  s === "confirmado"
    ? "bg-emerald-500/10 text-emerald-300/90 border-emerald-500/20"
    : "bg-amber-500/10 text-amber-300/90 border-amber-500/20";

// --- componente funil (SVG trapezoidal como no barbershop, padrão Lunor) ---
function Funil() {
  const max = Math.max(...funnelSteps.map((s) => s.value));
  return (
    <div className="flex flex-col gap-3">
      {funnelSteps.map((step, i) => {
        const pct = (step.value / max) * 100;
        return (
          <div key={step.label} className="flex items-center gap-4">
            <div className="w-40 flex-shrink-0">
              <p className="text-[13px] text-white tracking-tight">{step.label}</p>
              <p className="text-[11px] text-zinc-500 tabular-nums">{step.value} no mês</p>
            </div>
            <div className="flex-1 h-9 bg-[#0F0F0F] rounded-lg border border-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                className="h-full bg-gradient-to-r from-[#1E1E1E] to-[#2A2A2A] border-r border-white/10"
              />
            </div>
            <span className="w-14 text-right text-sm font-medium text-white tabular-nums tracking-tight">
              {Math.round(pct)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function HotelDashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <HotelSidebar activePage="hotel" />

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8">
          {/* Header */}
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-[#141414] border border-white/[0.06] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                </div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-500">Concierge IA</p>
              </div>
              <h1 className="text-[28px] font-semibold text-white tracking-tight">Visão geral</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                Ocupação em tempo real, reservas do dia e desempenho do atendimento.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Atualizado agora</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k, i) => {
              const Icon = k.icon;
              const TrendIcon = k.trend === "up" ? ArrowUpRight : k.trend === "down" ? ArrowDownRight : null;
              const trendColor =
                k.trend === "up"
                  ? "text-emerald-400"
                  : k.trend === "down"
                  ? "text-rose-400"
                  : "text-zinc-500";
              return (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
                      {TrendIcon && <TrendIcon className="w-3 h-3" strokeWidth={2} />}
                      <span className="tabular-nums">{k.delta}</span>
                    </div>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{k.label}</p>
                  <p className="text-[26px] font-semibold text-white tabular-nums leading-tight">{k.value}</p>
                  <p className="text-xs text-zinc-500 mt-1 tracking-tight">{k.hint}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Funil + Atividade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[15px] font-medium text-white tracking-tight">Funil de reservas</h2>
                  <p className="text-xs text-zinc-500 mt-0.5 tracking-tight">
                    Da primeira mensagem à reserva confirmada
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Últimos 30 dias</span>
              </div>
              <Funil />
            </div>

            {/* Check-ins de hoje */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-medium text-white tracking-tight">Check-ins de hoje</h2>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 tabular-nums">
                  {checkInsHoje.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {checkInsHoje.map((c) => (
                  <div
                    key={c.nome}
                    className="p-3 rounded-xl bg-[#0F0F0F] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-[13px] font-medium text-white tracking-tight truncate">{c.nome}</p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md border tracking-tight flex-shrink-0 ${statusCheckIn(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 tabular-nums">
                      <span>{c.quarto}</span>
                      <span>·</span>
                      <span>{c.horario}</span>
                      <span>·</span>
                      <span>{c.noites}n</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Atividade recente */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-medium text-white tracking-tight">Atividade recente</h2>
              <button className="text-xs text-zinc-500 hover:text-white transition-colors tracking-tight">
                Ver tudo →
              </button>
            </div>

            <div className="relative pl-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" />
              <div className="space-y-4">
                {atividade.map((ev, i) => {
                  const Icon = iconAtividade(ev.tipo);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="relative flex items-start gap-4"
                    >
                      <div className="absolute -left-4 top-1.5 w-[15px] h-[15px] rounded-full bg-[#0A0A0A] border border-white/[0.12] flex items-center justify-center">
                        <Icon className="w-2.5 h-2.5 text-zinc-400" strokeWidth={2} />
                      </div>
                      <div className="flex-1 pl-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] text-white tracking-tight">{ev.titulo}</p>
                          <span className="text-[11px] text-zinc-500 tabular-nums flex-shrink-0">{ev.tempo}</span>
                        </div>
                        <p className="text-xs text-zinc-500 tracking-tight mt-0.5">{ev.descricao}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
