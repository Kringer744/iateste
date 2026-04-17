"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Plus, X,
  Check, XCircle, Phone, User, Scissors, Timer, Settings2,
  Trash2, Save, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

/* ─── Types ─── */
interface Barbeiro {
  id: number;
  nome: string;
}

interface Servico {
  id: number;
  nome: string;
  duracao_minutos: number;
  preco: number;
}

interface Agendamento {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  data_hora: string;
  status: "confirmado" | "concluido" | "cancelado";
  barbeiro_id: number;
  barbeiro_nome?: string;
  servico_id: number;
  servico_nome?: string;
  duracao_minutos?: number;
}

interface HorarioBloco {
  id: number;
  barbeiro_id: number;
  dia_semana: number; // 0=seg ... 6=dom
  hora_inicio: string;
  hora_fim: string;
}

/* ─── Constants ─── */
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08..20
const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const DIAS_SEMANA_FULL = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; border: string }> = {
  confirmado: { bg: "bg-[#FFFFFF]/15", text: "text-[#FFFFFF]", label: "Confirmado", border: "border-[#FFFFFF]/30" },
  concluido: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Concluido", border: "border-emerald-500/30" },
  cancelado: { bg: "bg-red-500/15", text: "text-red-400", label: "Cancelado", border: "border-red-500/30" },
};

const STATUS_BAR_COLOR: Record<string, string> = {
  confirmado: "bg-[#FFFFFF]",
  concluido: "bg-emerald-500",
  cancelado: "bg-red-500",
};

/* ─── Helpers ─── */
function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekDates(d: Date): Date[] {
  const day = d.getDay();
  const monday = addDays(d, -(day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/* ─── Component ─── */
export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filteredBarbeiro, setFilteredBarbeiro] = useState<number | "">("" );
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  // New appointment modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    barbeiro_id: "",
    servico_id: "",
    data_hora: "",
    cliente_nome: "",
    cliente_telefone: "",
  });
  const [saving, setSaving] = useState(false);

  // Horarios section
  const [showHorarios, setShowHorarios] = useState(false);
  const [horarioBarbeiro, setHorarioBarbeiro] = useState<number | "">("");
  const [horarios, setHorarios] = useState<HorarioBloco[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [newHorario, setNewHorario] = useState({ dia_semana: 0, hora_inicio: "08:00", hora_fim: "18:00" });
  const [savingHorario, setSavingHorario] = useState(false);

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  /* ─── Data fetching ─── */
  const fetchBarbeiros = useCallback(async () => {
    try {
      const { data } = await axios.get("/api-backend/agendamento/barbeiros", getConfig());
      setBarbeiros(Array.isArray(data) ? data : data.barbeiros || []);
    } catch { setBarbeiros([]); }
  }, []);

  const fetchServicos = useCallback(async () => {
    try {
      const { data } = await axios.get("/api-backend/agendamento/servicos", getConfig());
      setServicos(Array.isArray(data) ? data : data.servicos || []);
    } catch { setServicos([]); }
  }, []);

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { data: formatDate(selectedDate) };
      if (filteredBarbeiro !== "") params.barbeiro_id = filteredBarbeiro;
      const { data } = await axios.get("/api-backend/agendamento/agendamentos", { ...getConfig(), params });
      setAgendamentos(Array.isArray(data) ? data : data.agendamentos || []);
    } catch {
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filteredBarbeiro]);

  const fetchHorarios = useCallback(async (bId: number) => {
    setLoadingHorarios(true);
    try {
      const { data } = await axios.get(`/api-backend/agendamento/horarios/${bId}`, getConfig());
      setHorarios(Array.isArray(data) ? data : data.horarios || []);
    } catch {
      setHorarios([]);
    } finally {
      setLoadingHorarios(false);
    }
  }, []);

  useEffect(() => { fetchBarbeiros(); fetchServicos(); }, []);
  useEffect(() => { fetchAgendamentos(); }, [selectedDate, filteredBarbeiro]);
  useEffect(() => {
    if (horarioBarbeiro !== "") fetchHorarios(horarioBarbeiro as number);
    else setHorarios([]);
  }, [horarioBarbeiro]);

  /* ─── Actions ─── */
  const handleConcluir = async (id: number) => {
    try {
      await axios.patch(`/api-backend/agendamento/agendamentos/${id}/concluir`, {}, getConfig());
      fetchAgendamentos();
    } catch {}
  };

  const handleCancelar = async (id: number) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    try {
      await axios.patch(`/api-backend/agendamento/agendamentos/${id}/cancelar`, {}, getConfig());
      fetchAgendamentos();
    } catch {}
  };

  const handleCreateAgendamento = async () => {
    if (!modalData.barbeiro_id || !modalData.servico_id || !modalData.data_hora || !modalData.cliente_nome) return;
    setSaving(true);
    try {
      await axios.post("/api-backend/agendamento/agendamentos", {
        barbeiro_id: Number(modalData.barbeiro_id),
        servico_id: Number(modalData.servico_id),
        data_hora: modalData.data_hora,
        cliente_nome: modalData.cliente_nome,
        cliente_telefone: modalData.cliente_telefone,
      }, getConfig());
      setShowModal(false);
      setModalData({ barbeiro_id: "", servico_id: "", data_hora: "", cliente_nome: "", cliente_telefone: "" });
      fetchAgendamentos();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleAddHorario = async () => {
    if (horarioBarbeiro === "") return;
    setSavingHorario(true);
    try {
      await axios.post("/api-backend/agendamento/horarios", {
        barbeiro_id: horarioBarbeiro,
        dia_semana: newHorario.dia_semana,
        hora_inicio: newHorario.hora_inicio,
        hora_fim: newHorario.hora_fim,
      }, getConfig());
      fetchHorarios(horarioBarbeiro as number);
    } catch {} finally {
      setSavingHorario(false);
    }
  };

  const handleDeleteHorario = async (id: number) => {
    try {
      await axios.delete(`/api-backend/agendamento/horarios/${id}`, getConfig());
      if (horarioBarbeiro !== "") fetchHorarios(horarioBarbeiro as number);
    } catch {}
  };

  /* ─── Navigate ─── */
  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => setSelectedDate((d) => addDays(d, view === "dia" ? -1 : -7));
  const goNext = () => setSelectedDate((d) => addDays(d, view === "dia" ? 1 : 7));

  /* ─── Open modal with prefilled time ─── */
  const openModalAtTime = (hour: number) => {
    const dateStr = formatDate(selectedDate);
    setModalData({
      barbeiro_id: filteredBarbeiro !== "" ? String(filteredBarbeiro) : "",
      servico_id: "",
      data_hora: `${dateStr}T${pad(hour)}:00`,
      cliente_nome: "",
      cliente_telefone: "",
    });
    setShowModal(true);
  };

  /* ─── Get appointments for a given hour/date ─── */
  const getAppointmentsForSlot = (date: Date, hour: number): Agendamento[] => {
    const dateStr = formatDate(date);
    return agendamentos.filter((a) => {
      const d = new Date(a.data_hora);
      return formatDate(d) === dateStr && d.getHours() === hour;
    });
  };

  /* ─── Week data: fetch for the whole week ─── */
  const weekDates = getWeekDates(selectedDate);

  /* ─── Render: Appointment Card ─── */
  const AppointmentCard = ({ apt }: { apt: Agendamento }) => {
    const st = STATUS_CONFIG[apt.status] || STATUS_CONFIG.confirmado;
    const barColor = STATUS_BAR_COLOR[apt.status] || STATUS_BAR_COLOR.confirmado;
    const isCancelled = apt.status === "cancelado";
    const time = new Date(apt.data_hora);
    const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-white/[0.03] border border-white/10 rounded-xl p-3 group hover:bg-white/[0.06] transition-all overflow-hidden ${isCancelled ? "opacity-60" : ""}`}
      >
        {/* Left color bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${barColor}`} />

        <div className="pl-3">
          {/* Top row: name + status */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className={`text-sm font-semibold text-white truncate ${isCancelled ? "line-through text-gray-500" : ""}`}>
              {apt.cliente_nome}
            </p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap tracking-tight ${st.bg} ${st.text} border ${st.border}`}>
              {st.label}
            </span>
          </div>

          {/* Service + time */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <Scissors className="w-3 h-3" />
              {apt.servico_nome || "Servico"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeStr}
              {apt.duracao_minutos ? ` (${apt.duracao_minutos}min)` : ""}
            </span>
          </div>

          {/* Barber + phone */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {apt.barbeiro_nome || "Barbeiro"}
            </span>
            {apt.cliente_telefone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {apt.cliente_telefone}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {apt.status === "confirmado" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConcluir(apt.id)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
              >
                <Check className="w-3 h-3" />
                Concluir
              </button>
              <button
                onClick={() => handleCancelar(apt.id)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
              >
                <XCircle className="w-3 h-3" />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  /* ─── Timeline constants ─── */
  const HOUR_HEIGHT = 72; // px per hour
  const START_HOUR = HOURS[0]; // 8
  const END_HOUR = HOURS[HOURS.length - 1] + 1; // 21
  const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  /* ─── Appointments for a whole day ─── */
  const getAppointmentsForDay = (date: Date): Agendamento[] => {
    const dateStr = formatDate(date);
    return agendamentos
      .filter((a) => {
        const d = new Date(a.data_hora);
        return formatDate(d) === dateStr && d.getHours() >= START_HOUR && d.getHours() < END_HOUR;
      })
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
  };

  /* ─── Now-indicator position for today ─── */
  const isToday = (date: Date) => formatDate(date) === formatDate(new Date());
  const nowOffsetPx = () => {
    const now = new Date();
    const hr = now.getHours();
    const min = now.getMinutes();
    if (hr < START_HOUR || hr >= END_HOUR) return null;
    return ((hr - START_HOUR) + min / 60) * HOUR_HEIGHT;
  };

  /* ─── Event block component (absolute-positioned) ─── */
  const EventBlock = ({ apt, compact = false }: { apt: Agendamento; compact?: boolean }) => {
    const time = new Date(apt.data_hora);
    const hr = time.getHours();
    const min = time.getMinutes();
    const duration = apt.duracao_minutos || 30;
    const top = ((hr - START_HOUR) + min / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 22);
    const barColor = STATUS_BAR_COLOR[apt.status] || STATUS_BAR_COLOR.confirmado;
    const isCancelled = apt.status === "cancelado";
    const timeStr = `${pad(hr)}:${pad(min)}`;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{ top, height }}
        className={`absolute left-1 right-1 bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-lg overflow-hidden group cursor-pointer transition-colors ${
          isCancelled ? "opacity-50" : ""
        }`}
      >
        <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor}`} />
        <div className={`${compact ? "px-2 py-1" : "px-2.5 py-1.5"} pl-3 h-full flex flex-col justify-start overflow-hidden`}>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className={`${compact ? "text-[10px]" : "text-[11px]"} tabular-nums text-zinc-300 font-medium leading-none`}>
              {timeStr}
            </span>
            {!compact && duration > 0 && (
              <span className="text-[10px] text-zinc-600 tabular-nums leading-none">· {duration}min</span>
            )}
          </div>
          <p className={`${compact ? "text-[11px]" : "text-xs"} font-medium text-white truncate leading-tight tracking-tight ${isCancelled ? "line-through" : ""}`}>
            {apt.cliente_nome}
          </p>
          {!compact && height > 54 && (
            <p className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5 tracking-tight">
              {apt.servico_nome}{apt.barbeiro_nome ? ` · ${apt.barbeiro_nome}` : ""}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  /* ─── Render: Day View (timeline proportional) ─── */
  const DayView = () => {
    const appts = getAppointmentsForDay(selectedDate);
    const nowPx = isToday(selectedDate) ? nowOffsetPx() : null;
    return (
      <div className="flex" style={{ minHeight: TIMELINE_HEIGHT }}>
        {/* Time rail */}
        <div className="w-14 flex-shrink-0 relative" style={{ height: TIMELINE_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 text-right pr-3"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 6 }}
            >
              <span className="text-[10px] tabular-nums text-zinc-600">{pad(hour)}:00</span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div
          className="relative flex-1 border-l border-white/[0.04]"
          style={{ height: TIMELINE_HEIGHT }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const y = e.clientY - rect.top;
            const hourFloat = y / HOUR_HEIGHT + START_HOUR;
            const hour = Math.floor(hourFloat);
            if (hour >= START_HOUR && hour < END_HOUR) openModalAtTime(hour);
          }}
        >
          {/* Hour gridlines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-white/[0.04]"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
            />
          ))}
          {/* Half-hour gridlines (dashed) */}
          {HOURS.map((hour) => (
            <div
              key={`half-${hour}`}
              className="absolute left-0 right-0 border-t border-dashed border-white/[0.02]"
              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
            />
          ))}

          {/* Now indicator */}
          {nowPx !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowPx }}
            >
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-400 -ml-[4px] shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                <span className="flex-1 h-px bg-red-400/70" />
              </div>
            </div>
          )}

          {/* Events */}
          {appts.map((apt) => (
            <div key={apt.id} onClick={(e) => e.stopPropagation()}>
              <EventBlock apt={apt} />
            </div>
          ))}

          {/* Empty state */}
          {appts.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Calendar className="w-6 h-6 text-zinc-700 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-zinc-600 tracking-tight">Sem agendamentos. Clique em um horário para adicionar.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─── Render: Week View (7 timeline columns) ─── */
  const WeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Week header */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] sticky top-0 bg-[#141414] z-10 pb-2 mb-1 border-b border-white/[0.04]">
          <div />
          {weekDates.map((d, i) => {
            const today = isToday(d);
            const dayAppts = getAppointmentsForDay(d);
            return (
              <div key={i} className="text-center py-2">
                <p className={`text-[11px] tracking-tight ${today ? "text-white" : "text-zinc-500"}`}>
                  {DIAS_SEMANA[i]}
                </p>
                <p className={`text-[16px] font-medium tabular-nums mt-0.5 ${today ? "text-white" : "text-zinc-300"}`}>
                  {d.getDate()}
                </p>
                {dayAppts.length > 0 && (
                  <p className="text-[10px] text-zinc-500 tabular-nums mt-0.5">{dayAppts.length} ag.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: TIMELINE_HEIGHT }}>
          {/* Time rail */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 text-right pr-2"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 6 }}
              >
                <span className="text-[10px] tabular-nums text-zinc-600">{pad(hour)}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((d, idx) => {
            const appts = getAppointmentsForDay(d);
            const nowPx = isToday(d) ? nowOffsetPx() : null;
            return (
              <div
                key={idx}
                className="relative border-l border-white/[0.04]"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
                  if (hour >= START_HOUR && hour < END_HOUR) {
                    setSelectedDate(d);
                    openModalAtTime(hour);
                  }
                }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-white/[0.04]"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {nowPx !== null && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowPx }}>
                    <div className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="flex-1 h-px bg-red-400/70" />
                    </div>
                  </div>
                )}
                {appts.map((apt) => (
                  <div key={apt.id} onClick={(e) => e.stopPropagation()}>
                    <EventBlock apt={apt} compact />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ─── Main Render ─── */
  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <DashboardSidebar activePage="agenda" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 pt-16 lg:pt-8">

          {/* ──── Header ──── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Agenda</h1>
              <p className="text-sm text-zinc-500 mt-1">Gerencie agendamentos e horários dos barbeiros.</p>
            </div>

            <button
              onClick={() => {
                setModalData({ barbeiro_id: "", servico_id: "", data_hora: "", cliente_nome: "", cliente_telefone: "" });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Novo agendamento
            </button>
          </div>

          {/* ──── Controls Bar ──── */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-3 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Date navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={goToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E1E1E] text-white border border-white/[0.06] hover:bg-[#232323] transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={goNext}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <p className="text-sm text-zinc-300 ml-2 capitalize hidden sm:block tracking-tight">
                  {dayLabel(selectedDate)}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                {/* View toggle */}
                <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1 border border-white/[0.06]">
                  {(["dia", "semana"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1 rounded-md text-xs transition-colors ${
                        view === v
                          ? "bg-[#1E1E1E] text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {v === "dia" ? "Dia" : "Semana"}
                    </button>
                  ))}
                </div>

                {/* Barber filter */}
                <select
                  value={filteredBarbeiro}
                  onChange={(e) => setFilteredBarbeiro(e.target.value ? Number(e.target.value) : "")}
                  className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-white/15 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1A1A1A]">Todos os barbeiros</option>
                  {barbeiros.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#1A1A1A]">{b.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ──── Calendar View ──── */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-4 sm:p-5 mb-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${view}-${formatDate(selectedDate)}`}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {view === "dia" ? <DayView /> : <WeekView />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ──── Horários Disponíveis Section ──── */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-4 sm:p-5">
            <button
              onClick={() => setShowHorarios(!showHorarios)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-medium text-white tracking-tight">Horários disponíveis</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Configure os horários de cada barbeiro por dia da semana.</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${showHorarios ? "rotate-90" : ""}`} strokeWidth={1.75} />
            </button>

            <AnimatePresence>
              {showHorarios && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 space-y-5">
                    {/* Barber selector */}
                    <select
                      value={horarioBarbeiro}
                      onChange={(e) => setHorarioBarbeiro(e.target.value ? Number(e.target.value) : "")}
                      className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-white/15 transition-colors w-full sm:w-auto"
                    >
                      <option value="" className="bg-[#141414]">Selecione um barbeiro</option>
                      {barbeiros.map((b) => (
                        <option key={b.id} value={b.id} className="bg-[#141414]">{b.nome}</option>
                      ))}
                    </select>

                    {horarioBarbeiro !== "" && (
                      <>
                        {/* Existing schedule */}
                        {loadingHorarios ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {horarios.length === 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                                <AlertCircle className="w-4 h-4" />
                                Nenhum horario configurado para este barbeiro.
                              </div>
                            )}
                            {DIAS_SEMANA.map((dia, idx) => {
                              const blocos = horarios.filter((h) => h.dia_semana === idx);
                              if (blocos.length === 0) return null;
                              return (
                                <div key={idx} className="flex flex-wrap items-center gap-2">
                                  <span className="w-12 text-xs text-zinc-500 tracking-tight">{dia}</span>
                                  {blocos.map((b) => (
                                    <div
                                      key={b.id}
                                      className="flex items-center gap-2 bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-3 py-1.5"
                                    >
                                      <Clock className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                                      <span className="text-xs text-zinc-200 tabular-nums">
                                        {b.hora_inicio} – {b.hora_fim}
                                      </span>
                                      <button
                                        onClick={() => handleDeleteHorario(b.id)}
                                        className="p-0.5 rounded hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300 transition-colors ml-1"
                                      >
                                        <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add new block */}
                        <div className="flex flex-wrap items-end gap-3 pt-5 border-t border-white/[0.06]">
                          <div>
                            <label className="text-xs text-zinc-500 block mb-2 tracking-tight">Dia</label>
                            <select
                              value={newHorario.dia_semana}
                              onChange={(e) => setNewHorario({ ...newHorario, dia_semana: Number(e.target.value) })}
                              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/15 transition-colors"
                            >
                              {DIAS_SEMANA.map((d, i) => (
                                <option key={i} value={i} className="bg-[#141414]">{DIAS_SEMANA_FULL[i]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-2 tracking-tight">Início</label>
                            <input
                              type="time"
                              value={newHorario.hora_inicio}
                              onChange={(e) => setNewHorario({ ...newHorario, hora_inicio: e.target.value })}
                              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:border-white/15 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-2 tracking-tight">Fim</label>
                            <input
                              type="time"
                              value={newHorario.hora_fim}
                              onChange={(e) => setNewHorario({ ...newHorario, hora_fim: e.target.value })}
                              className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:border-white/15 transition-colors"
                            />
                          </div>
                          <button
                            onClick={handleAddHorario}
                            disabled={savingHorario}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                          >
                            {savingHorario ? (
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" strokeWidth={1.75} />
                            )}
                            Adicionar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ──── New Appointment Modal ──── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                {/* Modal header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-zinc-300" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-base font-medium text-white tracking-tight">Novo agendamento</h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-xl hover:bg-white/[0.04] text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Cliente nome */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2 tracking-tight">Nome do cliente</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                      <input
                        type="text"
                        value={modalData.cliente_nome}
                        onChange={(e) => setModalData({ ...modalData, cliente_nome: e.target.value })}
                        placeholder="Nome completo"
                        className="w-full bg-transparent border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Cliente telefone */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2 tracking-tight">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                      <input
                        type="tel"
                        value={modalData.cliente_telefone}
                        onChange={(e) => setModalData({ ...modalData, cliente_telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-transparent border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Barbeiro */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2 tracking-tight">Barbeiro</label>
                    <select
                      value={modalData.barbeiro_id}
                      onChange={(e) => setModalData({ ...modalData, barbeiro_id: e.target.value })}
                      className="w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-white/15 transition-colors"
                    >
                      <option value="" className="bg-[#141414]">Selecione o barbeiro</option>
                      {barbeiros.map((b) => (
                        <option key={b.id} value={b.id} className="bg-[#141414]">{b.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Servico */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2 tracking-tight">Serviço</label>
                    <select
                      value={modalData.servico_id}
                      onChange={(e) => setModalData({ ...modalData, servico_id: e.target.value })}
                      className="w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-white/15 transition-colors"
                    >
                      <option value="" className="bg-[#141414]">Selecione o serviço</option>
                      {servicos.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#141414]">
                          {s.nome} · R$ {s.preco?.toFixed(2)} · {s.duracao_minutos}min
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data/Hora */}
                  <div>
                    <label className="block text-xs text-zinc-400 mb-2 tracking-tight">Data e hora</label>
                    <input
                      type="datetime-local"
                      value={modalData.data_hora}
                      onChange={(e) => setModalData({ ...modalData, data_hora: e.target.value })}
                      className="w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 tabular-nums focus:outline-none focus:border-white/15 transition-colors"
                    />
                  </div>
                </div>

                {/* Modal actions */}
                <div className="flex items-center gap-2 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateAgendamento}
                    disabled={saving || !modalData.cliente_nome || !modalData.barbeiro_id || !modalData.servico_id || !modalData.data_hora}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" strokeWidth={1.75} />
                    )}
                    Agendar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
