"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  TrendingUp, MessageSquare, Clock, Building2, Brain,
  Settings, Bell, ChevronsUpDown, ArrowRight,
  Star, Sparkles, MessageSquare as MsgIcon,
  BarChart3, FolderClosed, Share2, Edit3, LayoutDashboard
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
          axios.get(`/api-backend/dashboard/conversations?unidade_id=${selectedUnidadeId}&limit=5`, config)
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

  // Funnel steps with data
  const funnelSteps = [
    { label: "Contatos Totais", count: metrics?.total_conversas || 0, total: metrics?.total_conversas || 1 },
    { label: "Interesse Detectado", count: metrics?.leads_qualificados || 0, total: metrics?.total_conversas || 1 },
    { label: "Oportunidades", count: metrics?.intencao_compra || 0, total: metrics?.total_conversas || 1 },
    { label: "Link de Venda Enviado", count: metrics?.total_links_enviados || 0, total: metrics?.total_conversas || 1 },
    { label: "Matrículas Finalizadas", count: metrics?.total_matriculas || 0, total: metrics?.total_conversas || 1 },
  ];

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
          <div className="mb-10">
            <h1 className="text-[32px] font-semibold text-white tracking-tight leading-tight mb-1.5">
              Welcome back {firstName || user?.nome || "—"}!
            </h1>
            <p className="text-sm text-zinc-500 tracking-tight">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              {selectedUnit ? ` · ${selectedUnit.nome}` : ""}
            </p>
          </div>

          {/* KPI Cards — Lunor style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Conversas", value: (metrics?.total_conversas ?? empresaMetrics?.total_conversas) ?? "—", icon: MsgIcon },
              { label: "Leads Qualificados", value: (metrics?.leads_qualificados ?? empresaMetrics?.leads_qualificados) ?? "—", icon: Star },
              { label: "Taxa de Conversão", value: metrics?.taxa_conversao != null ? `${metrics.taxa_conversao}%` : (empresaMetrics?.taxa_conversao != null ? `${empresaMetrics.taxa_conversao}%` : "—"), icon: TrendingUp },
              { label: "Tempo Médio", value: (metrics?.tempo_medio_resposta != null ? metrics.tempo_medio_resposta : empresaMetrics?.tempo_medio_resposta) != null ? formatDuration(Math.round(metrics?.tempo_medio_resposta ?? empresaMetrics?.tempo_medio_resposta)) : "—", icon: Clock },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors flex justify-between items-start"
              >
                <div className="flex-1">
                  <p className="text-[13px] text-zinc-400 tracking-tight mb-3">{card.label}</p>
                  <p className="text-[40px] font-normal text-white tracking-[-0.03em] leading-none">
                    {loading ? <span className="inline-block w-16 h-8 bg-white/[0.06] rounded animate-pulse" /> : card.value}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <card.icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Funnel chart — hatched style */}
          <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-medium text-white tracking-tight">Funil de Vendas</h2>
                <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">Evolução dos leads em tempo real</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 bg-[#1A1A1A] border border-white/[0.06] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </div>
            </div>
            <div className="space-y-5">
              {funnelSteps.map((step, i) => {
                const pct = Math.min(100, (step.count / step.total) * 100);
                return (
                  <div key={step.label}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-sm text-zinc-300 tracking-tight">{step.label}</span>
                      <span className="text-xs text-zinc-500 tracking-tight tabular-nums">
                        <span className="text-white font-medium">{step.count}</span> · {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.15 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your Contacts — Lunor-inspired cards */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
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
                    transition={{ delay: i * 0.04, duration: 0.3 }}
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
                      <button
                        onClick={() => { window.location.href = `/dashboard/conversas?id=${conv.conversation_id}`; }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors tracking-tight"
                      >
                        <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Abrir
                      </button>
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

          {/* Quick Access */}
          <div className="mt-8">
            <p className="text-xs text-zinc-500 tracking-tight mb-3">Acesso rápido</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Insights", icon: BarChart3, href: "/dashboard/insights", desc: "Análise de conversão" },
                { label: "Conversas", icon: MsgIcon, href: "/dashboard/conversas", desc: "Central de leads" },
                { label: "Unidades", icon: Building2, href: "/dashboard/units", desc: "Gerenciar filiais" },
                { label: "Personalidade", icon: Brain, href: "/dashboard/personality", desc: "Cérebro da IA" },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-white tracking-tight mb-0.5">{item.label}</p>
                  <p className="text-xs text-zinc-500 tracking-tight">{item.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
