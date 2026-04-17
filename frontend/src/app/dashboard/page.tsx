"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  TrendingUp, MessageSquare, Clock, Building2, Brain,
  Settings, Bell, ChevronsUpDown, ArrowRight, ArrowUpRight,
  Star, Sparkles, MessageSquare as MsgIcon,
  FolderClosed, Share2, Edit3, LayoutDashboard, CalendarDays,
  Activity, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m}min`;
}

// Mini sparkline SVG component
function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 320;
  const height = 64;
  const step = width / (values.length - 1 || 1);
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-16 ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-area)" />
      <polyline points={points} fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [empresaMetrics, setEmpresaMetrics] = useState<any>(null);
  const [perUnit, setPerUnit] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<number | null>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

  const selectedUnit = unidades.find(u => u.id === selectedUnidadeId);

  useEffect(() => {
    const fetchInitial = async () => {
      const token = localStorage.getItem("token");
      if (!token) { window.location.href = "/login"; return; }
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [userRes, unitsRes, empMetRes] = await Promise.all([
          axios.get(`/api-backend/auth/me`, config),
          axios.get(`/api-backend/dashboard/unidades`, config),
          axios.get(`/api-backend/dashboard/metrics/empresa?days=30`, config)
        ]);
        setUser(userRes.data);
        setUnidades(unitsRes.data);
        setEmpresaMetrics(empMetRes.data?.totals || null);
        setPerUnit(empMetRes.data?.por_unidade || []);
        if (unitsRes.data.length > 0) setSelectedUnidadeId(unitsRes.data[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (!selectedUnidadeId) return;
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [metricsRes, convRes] = await Promise.all([
          axios.get(`/api-backend/dashboard/metrics?unidade_id=${selectedUnidadeId}&days=30`, config),
          axios.get(`/api-backend/dashboard/conversations?unidade_id=${selectedUnidadeId}&limit=6`, config)
        ]);
        setMetrics(metricsRes.data.metrics);
        setConversations(convRes.data?.data || convRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedUnidadeId]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white animate-pulse" strokeWidth={1.75} />
          </div>
          <p className="text-xs text-zinc-500 tracking-tight">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!initialLoading && unidades.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-10 text-center max-w-md w-full">
          <div className="w-11 h-11 bg-[#1A1A1A] border border-white/[0.08] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">Nenhuma unidade ativa</h2>
          <p className="text-zinc-500 mb-7 text-sm leading-relaxed">
            Configure sua primeira unidade no Closer IA para começar.
          </p>
          <a href="/dashboard/units"
            className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-black font-semibold py-2.5 px-5 rounded-xl transition-all text-sm tracking-tight">
            <Settings className="w-4 h-4" strokeWidth={1.75} /> Configurar agora
          </a>
        </div>
      </div>
    );
  }

  const firstName = user?.nome?.split(" ")[0] || "";
  const taxaConversao = metrics?.taxa_conversao ?? empresaMetrics?.taxa_conversao;
  const totalConversas = metrics?.total_conversas ?? empresaMetrics?.total_conversas ?? 0;
  const leadsQualif = metrics?.leads_qualificados ?? empresaMetrics?.leads_qualificados ?? 0;
  const tempoMedio = metrics?.tempo_medio_resposta ?? empresaMetrics?.tempo_medio_resposta;

  // Generate a deterministic sparkline from total value (pleasant upward-trending mock)
  const sparkValues = (() => {
    const base = Math.max(totalConversas || 5, 5);
    return Array.from({ length: 14 }, (_, i) => {
      const seed = (i * 7 + base * 3) % 23;
      return base * (0.55 + (i / 14) * 0.5 + (seed % 5) * 0.04);
    });
  })();

  // Funnel steps with data
  const funnelSteps = [
    { label: "Contatos Totais", count: metrics?.total_conversas || 0 },
    { label: "Interesse Detectado", count: metrics?.leads_qualificados || 0 },
    { label: "Oportunidades", count: metrics?.intencao_compra || 0 },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <DashboardSidebar activePage="dashboard" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.06] px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm">
            <LayoutDashboard className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
            <span className="text-zinc-400 tracking-tight">Dashboard</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Unit Selector */}
            <div className="relative">
              <button
                onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
                className="flex items-center gap-2 bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-3.5 py-2 text-sm transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="max-w-[180px] truncate text-white tracking-tight">{selectedUnit?.nome || "Selecione"}</span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <AnimatePresence>
                {unitDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full mt-1.5 right-0 w-64 bg-[#141414] border border-white/[0.08] rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50"
                  >
                    <div className="p-1.5">
                      {unidades.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUnidadeId(u.id); setUnitDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                            u.id === selectedUnidadeId
                              ? "bg-[#1E1E1E] text-white"
                              : "hover:bg-white/[0.04] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Building2 className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                          <span className="tracking-tight truncate">{u.nome}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-white/[0.04]">
                      <a href="/dashboard/units"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors w-full tracking-tight">
                        <Settings className="w-3.5 h-3.5" strokeWidth={1.75} /> Gerenciar unidades
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="relative p-2 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] transition-colors">
              <Bell className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8">
          {/* Welcome */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-semibold text-white tracking-tight leading-tight mb-1.5">
                Bem-vindo, {firstName || user?.nome || "—"}
              </h1>
              <p className="text-sm text-zinc-500 tracking-tight flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                {selectedUnit && <span className="text-zinc-700">·</span>}
                {selectedUnit && <span>{selectedUnit.nome}</span>}
              </p>
            </div>
            <a href="/dashboard/conversas"
              className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-4 py-2.5 text-sm text-zinc-300 hover:text-white tracking-tight transition-colors">
              Ver todas as conversas <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          </div>

          {/* ═══ BENTO HERO ROW ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
            {/* Hero: Conversion rate with sparkline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-3 bg-[#141414] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[240px]"
            >
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[13px] text-zinc-400 tracking-tight mb-1">Taxa de conversão</p>
                  <p className="text-[11px] text-zinc-600 tracking-tight">Últimos 30 dias</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] border border-white/[0.06] rounded-full text-[11px] text-zinc-400 tracking-tight">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                  Ao vivo
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-[72px] font-light text-white tracking-[-0.04em] leading-none mb-2">
                  {loading ? (
                    <span className="inline-block w-40 h-16 bg-white/[0.06] rounded animate-pulse" />
                  ) : taxaConversao != null ? `${taxaConversao}%` : "—"}
                </p>
                <p className="text-sm text-zinc-500 tracking-tight">
                  <span className="text-white font-medium">{leadsQualif}</span> leads qualificados de <span className="text-white font-medium">{totalConversas}</span> conversas
                </p>
              </div>
              {/* Sparkline absolute on the right */}
              <div className="absolute bottom-0 right-0 w-1/2 opacity-80">
                <Sparkline values={sparkValues} />
              </div>
            </motion.div>

            {/* Stacked stats — right column */}
            <div className="lg:col-span-2 grid grid-rows-3 gap-3 min-h-[240px]">
              {[
                { label: "Total Conversas", value: totalConversas, icon: MsgIcon },
                { label: "Leads Qualificados", value: leadsQualif, icon: Star },
                { label: "Tempo Médio", value: tempoMedio != null ? formatDuration(Math.round(tempoMedio)) : "—", icon: Clock },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  className="bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl px-5 py-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <card.icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] text-zinc-400 tracking-tight">{card.label}</p>
                  </div>
                  <p className="text-xl font-medium text-white tracking-tight tabular-nums">
                    {loading ? <span className="inline-block w-10 h-5 bg-white/[0.06] rounded animate-pulse" /> : card.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ═══ FUNNEL + ACTIVITY FEED ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
            {/* Funnel — trapezoidal SVG with conversion deltas */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="lg:col-span-3 bg-[#141414] border border-white/[0.06] rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[15px] font-medium text-white tracking-tight">Funil de vendas</h2>
                  <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">Conversão por etapa</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 bg-[#1A1A1A] border border-white/[0.06] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ao vivo
                </div>
              </div>

              <div className="grid grid-cols-[1fr_220px] gap-8 items-center">
                {/* Step list */}
                <div className="space-y-1">
                  {funnelSteps.map((step, i) => {
                    const top = funnelSteps[0]?.count || 1;
                    const convFromTop = top > 0 ? Math.round((step.count / top) * 100) : 0;
                    return (
                      <div key={step.label}>
                        <div className="flex items-center justify-between py-2.5 group">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center text-[10px] text-zinc-400 tabular-nums font-medium">
                              {i + 1}
                            </span>
                            <span className="text-[13px] text-zinc-200 tracking-tight truncate">{step.label}</span>
                          </div>
                          <div className="flex items-baseline gap-2 tabular-nums">
                            <span className="text-[15px] font-medium text-white tracking-tight">{step.count}</span>
                            <span className="text-[11px] text-zinc-500 w-9 text-right">{convFromTop}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SVG funnel shape */}
                <div className="hidden lg:block">
                  <svg viewBox="0 0 220 220" className="w-full h-[220px]">
                    {funnelSteps.map((step, i) => {
                      const top = funnelSteps[0]?.count || 1;
                      const tierH = 220 / funnelSteps.length;
                      const y = i * tierH;
                      const wTop = top > 0 ? (step.count / top) * 220 : 0;
                      const next = funnelSteps[i + 1]?.count ?? step.count * 0.6;
                      const wBot = top > 0 ? (next / top) * 220 : 0;
                      const x1 = (220 - wTop) / 2;
                      const x2 = x1 + wTop;
                      const x3 = (220 - wBot) / 2 + wBot;
                      const x4 = (220 - wBot) / 2;
                      const opacity = 0.95 - i * 0.14;
                      return (
                        <motion.polygon
                          key={i}
                          initial={{ opacity: 0, scaleY: 0.6 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ delay: 0.2 + i * 0.08, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                          style={{ transformOrigin: `110px ${y + tierH / 2}px` }}
                          points={`${x1},${y + 2} ${x2},${y + 2} ${x3},${y + tierH - 2} ${x4},${y + tierH - 2}`}
                          fill="white"
                          fillOpacity={opacity}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Activity feed — vertical timeline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="lg:col-span-2 bg-[#141414] border border-white/[0.06] rounded-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[15px] font-medium text-white tracking-tight">Atividade recente</h2>
                  <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">Linha do tempo</p>
                </div>
                <Activity className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                {conversations.length === 0 && !loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="w-7 h-7 text-zinc-700 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-zinc-500 tracking-tight">Sem eventos recentes</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Rail */}
                    <span className="absolute left-[15px] top-1 bottom-1 w-px bg-white/[0.06]" />
                    {conversations.slice(0, 4).map((conv: any, i) => {
                      const isOpp = !!conv.intencao_de_compra;
                      const isQualified = (conv.score_lead || 0) >= 4;
                      const isEngaged = (conv.total_mensagens_cliente || 0) > 5;
                      const isPaused = !!conv.pausada;
                      const event = isPaused
                        ? { label: "IA pausada", dot: "bg-zinc-400" }
                        : isOpp
                        ? { label: "Oportunidade detectada", dot: "bg-white" }
                        : isQualified
                        ? { label: "Lead qualificado", dot: "bg-white" }
                        : isEngaged
                        ? { label: "Conversa engajada", dot: "bg-zinc-300" }
                        : { label: "Nova conversa", dot: "bg-zinc-500" };
                      const ts = conv.updated_at || conv.ultima_mensagem_at || conv.created_at;
                      const relTime = (() => {
                        if (!ts) return "agora";
                        const diff = (Date.now() - new Date(ts).getTime()) / 1000;
                        if (diff < 60) return "agora";
                        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
                        return `${Math.floor(diff / 86400)}d`;
                      })();
                      return (
                        <motion.a
                          key={conv.conversation_id || i}
                          href={`/dashboard/conversas?id=${conv.conversation_id}`}
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="relative flex items-start gap-3 py-3 pl-0 group"
                        >
                          {/* Dot over rail */}
                          <span className="relative z-10 flex-shrink-0 mt-1.5 w-[7px] h-[7px] ml-[12px] rounded-full ring-4 ring-[#141414]">
                            <span className={`absolute inset-0 rounded-full ${event.dot}`} />
                          </span>
                          <div className="flex-1 min-w-0 ml-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-[13px] font-medium text-white truncate tracking-tight">
                                {conv.contato_nome || "Anônimo"}
                              </p>
                              <span className="text-[11px] text-zinc-600 tabular-nums flex-shrink-0">{relTime}</span>
                            </div>
                            <p className="text-xs text-zinc-500 truncate tracking-tight mt-0.5 group-hover:text-zinc-400 transition-colors">
                              {event.label}
                            </p>
                          </div>
                        </motion.a>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ═══ LEADS RECENTES ═══ */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[15px] font-medium text-white tracking-tight">Leads recentes</h2>
              <a href="/dashboard/conversas"
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white tracking-tight transition-colors">
                Ver todos <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
              </a>
            </div>
            {conversations.length === 0 && !loading ? (
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-10 text-center">
                <MessageSquare className="w-7 h-7 text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-zinc-500 tracking-tight">Nenhum lead ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {conversations.slice(0, 6).map((conv: any, i) => (
                  <motion.div
                    key={conv.conversation_id || i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
                    className="bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center">
                        <FolderClosed className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <div
                            key={s}
                            className={`w-1 h-1 rounded-full ${s <= (conv.score_lead || 0) ? "bg-white" : "bg-white/10"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white tracking-tight truncate mb-1">
                      {conv.contato_nome || "Anônimo"}
                    </p>
                    <p className="text-[13px] text-zinc-500 tracking-tight truncate mb-4 leading-relaxed">
                      {conv.contato_fone || "Sem telefone"}
                    </p>
                    <div className="flex items-center gap-2 pt-4 border-t border-white/[0.04]">
                      <a
                        href={`/dashboard/conversas?id=${conv.conversation_id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors tracking-tight"
                      >
                        <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Abrir
                      </a>
                      <div className="w-px h-4 bg-white/[0.06]" />
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors tracking-tight">
                        <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} /> Editar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ QUICK ACCESS ═══ */}
          <div className="mt-8">
            <p className="text-xs text-zinc-500 tracking-tight mb-3 px-1">Acesso rápido</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Conversas", icon: MsgIcon, href: "/dashboard/conversas", desc: "Central de leads" },
                { label: "Agenda", icon: CalendarDays, href: "/dashboard/agenda", desc: "Agendamentos do dia" },
                { label: "Personalidade", icon: Brain, href: "/dashboard/personality", desc: "Cérebro da IA" },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors group flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-white/[0.15] transition-colors">
                    <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white tracking-tight">{item.label}</p>
                    <p className="text-xs text-zinc-500 tracking-tight mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
