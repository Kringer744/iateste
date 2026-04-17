"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  MessageSquare, Search, ChevronLeft, ChevronRight,
  Building2, Star, Flame, Clock, X, RefreshCw,
  Download, Zap, Bot, BarChart3, Target, Brain, Trash2, TrendingUp, CheckCircle,
  Users, Activity, ArrowUpRight, ChevronRight as ChevRight,
  MessageCircle, Loader2, User, Mic, Image as ImageIcon
} from "lucide-react";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

interface Conversation {
  id: number;
  conversation_id: string;
  contato_nome: string;
  contato_fone: string;
  contato_telefone: string;
  score_lead: number;
  lead_qualificado: boolean;
  intencao_de_compra: boolean;
  status: string;
  updated_at: string;
  created_at: string;
  total_mensagens_cliente: number;
  total_mensagens_ia: number;
  resumo_ia: string;
  canal: string;
  unidade_nome: string;
  pausada: boolean;
}

interface EventoFunil {
  tipo_evento: string;
  descricao: string | null;
  score_incremento: number;
  created_at: string;
}

const eventoLabels: Record<string, string> = {
  mudanca_unidade: "Unidade Identificada",
  link_matricula_enviado: "Link de Matrícula Enviado",
  solicitacao_telefone: "Contato Solicitado",
  interesse_detectado: "Interesse Detectado",
  unidade_escolhida: "Unidade Escolhida",
};

const statusColor: Record<string, string> = {
  open: "bg-[#1A1A1A] text-emerald-400 border border-white/[0.06]",
  resolved: "bg-[#1A1A1A] text-zinc-300 border border-white/[0.06]",
  closed: "bg-[#141414] text-zinc-500 border border-white/[0.04]",
  encerrada: "bg-[#141414] text-zinc-500 border border-white/[0.04]",
  pending: "bg-[#1A1A1A] text-zinc-300 border border-white/[0.06]",
};
const statusLabel: Record<string, string> = {
  open: "Ativa", resolved: "Atendido", closed: "Fechada", encerrada: "Encerrada", pending: "Pendente"
};

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [memoryClearedId, setMemoryClearedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUnidade, setFilterUnidade] = useState<number | "">("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [eventos, setEventos] = useState<EventoFunil[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [mensagens, setMensagens] = useState<Array<{ role: string; tipo: string; conteudo: string; url_midia?: string | null; created_at: string }>>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);

  const openChatViewer = async () => {
    if (!selected) return;
    setShowChat(true);
    setLoadingMensagens(true);
    try {
      const res = await axios.get(`/api-backend/dashboard/conversations/${selected.conversation_id}/mensagens`, getConfig());
      setMensagens(res.data || []);
    } catch (err) {
      console.error(err);
      setMensagens([]);
    } finally {
      setLoadingMensagens(false);
    }
  };

  const getConfig = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (filterUnidade) params.append("unidade_id", filterUnidade.toString());
      if (filterStatus) params.append("status", filterStatus);
      if (busca) params.append("busca", busca);
      const res = await axios.get(`/api-backend/dashboard/conversations?${params}`, getConfig());
      setConversations(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [offset, filterUnidade, filterStatus, busca]);

  useEffect(() => {
    axios.get("/api-backend/dashboard/unidades", getConfig()).then(r => setUnidades(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selected) { setEventos([]); return; }
    setLoadingEventos(true);
    axios.get(`/api-backend/dashboard/conversations/${selected.conversation_id}/eventos`, getConfig())
      .then(r => setEventos(r.data || []))
      .catch(() => setEventos([]))
      .finally(() => setLoadingEventos(false));
  }, [selected?.conversation_id]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setBusca(buscaInput); setOffset(0); };
  const clearFilters = () => { setBusca(""); setBuscaInput(""); setFilterStatus(""); setFilterUnidade(""); setOffset(0); };

  const exportLeads = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterUnidade) params.append("unidade_id", filterUnidade.toString());
      if (filterStatus) params.append("status", filterStatus);
      const res = await axios.get(`/api-backend/management/export-leads?${params}`, getConfig());
      const allLeads = res.data || [];
      const headers = ["Nome", "Telefone", "Score", "Qualificado", "Intencao", "Status", "Unidade", "Msgs Cliente", "IA", "Data"];
      const rows = allLeads.map((c: any) => [
        c.contato_nome || "Anônimo", c.contato_fone || c.contato_telefone || "",
        c.score_lead || 0, c.lead_qualificado ? "Sim" : "Não", c.intencao_de_compra ? "Sim" : "Não",
        c.status, c.unidade_nome || "", c.total_mensagens_cliente || 0, c.total_mensagens_ia || 0,
        c.created_at ? new Date(c.created_at).toLocaleString() : ""
      ]);
      const csv = [headers, ...rows].map(e => e.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };
  
  const handleGenerateSummary = async () => {
    if (!selected) return;
    setSummarizing(true);
    try {
      const res = await axios.post(`/api-backend/dashboard/conversations/${selected.conversation_id}/resumo`, {}, getConfig());
      if (res.data.status === "success") {
        const newSummary = res.data.resumo_ia;
        setSelected({ ...selected, resumo_ia: newSummary });
        setConversations(conversations.map(c => c.conversation_id === selected.conversation_id ? { ...c, resumo_ia: newSummary } : c));
      }
    } catch (err) {
      console.error("Erro ao gerar resumo:", err);
    } finally {
      setSummarizing(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <DashboardSidebar activePage="conversas" />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex-shrink-0 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.06] px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-white tracking-tight leading-tight">
                Central de Inteligência
              </h1>
              <p className="text-xs text-zinc-500 tracking-tight mt-0.5">
                <span className="text-zinc-300 tabular-nums">{total}</span> conversas mapeadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportLeads}
              disabled={exporting}
              className="hidden sm:flex items-center gap-2 bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] hover:border-white/[0.12] px-3.5 py-2 rounded-xl text-sm text-zinc-300 hover:text-white tracking-tight transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              {exporting ? "Exportando..." : "Exportar leads"}
            </button>
            <button
              onClick={() => fetchConversations()}
              className="p-2 bg-[#141414] hover:bg-[#1A1A1A] rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* ═════════════ LIST PANEL ═════════════
              Full-width CRM table when nothing selected.
              Shrinks to 360px compact list when a conversation is open.
          ═══════════════════════════════════════ */}
          <div className={`flex flex-col bg-[#0A0A0A] ${selected ? "hidden lg:flex lg:w-[360px] border-r border-white/[0.06]" : "w-full"}`}>

            {/* ── Stats strip (only visible when full width) ── */}
            {!selected && (
              <div className="px-6 lg:px-8 pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const ativas = conversations.filter(c => c.status === "open").length;
                    const pausadas = conversations.filter(c => c.pausada).length;
                    const quentes = conversations.filter(c => c.intencao_de_compra).length;
                    const stats = [
                      { label: "Total", value: total, icon: Users },
                      { label: "Ativas", value: ativas, icon: Activity, dot: "bg-emerald-400" },
                      { label: "IA pausada", value: pausadas, icon: Bot, dot: "bg-zinc-400" },
                      { label: "Leads quentes", value: quentes, icon: Flame, dot: "bg-white" },
                    ];
                    return stats.map(s => (
                      <div key={s.label} className="bg-[#141414] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                            <p className="text-xs text-zinc-400 tracking-tight">{s.label}</p>
                          </div>
                          <p className="text-[28px] font-normal text-white tracking-[-0.02em] tabular-nums leading-none">
                            {loading ? <span className="inline-block w-8 h-6 bg-white/[0.06] rounded animate-pulse" /> : s.value}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                          <s.icon className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* ── Filters row ── */}
            <div className={`${!selected ? "px-6 lg:px-8 pt-6" : "p-4"} ${!selected ? "pb-4" : ""}`}>
              <div className={`${!selected ? "flex flex-col md:flex-row gap-2" : "space-y-2.5"}`}>
                <form onSubmit={handleSearch} className={`relative ${!selected ? "flex-1" : ""}`}>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                  <input
                    value={buscaInput}
                    onChange={e => setBuscaInput(e.target.value)}
                    placeholder="Buscar por nome ou telefone"
                    className="w-full bg-[#141414] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors tracking-tight"
                  />
                </form>
                <div className={`flex gap-2 ${!selected ? "flex-shrink-0" : ""}`}>
                  <select
                    value={filterUnidade}
                    onChange={e => { setFilterUnidade(e.target.value ? Number(e.target.value) : ""); setOffset(0); }}
                    className={`bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-white/20 cursor-pointer tracking-tight transition-colors ${!selected ? "min-w-[160px]" : "flex-1 text-xs py-2"}`}
                  >
                    <option value="">Todas as unidades</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setOffset(0); }}
                    className={`bg-[#141414] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-white/20 cursor-pointer tracking-tight transition-colors ${!selected ? "min-w-[140px]" : "flex-1 text-xs py-2"}`}
                  >
                    <option value="">Todos os status</option>
                    <option value="open">Ativas</option>
                    <option value="resolved">Atendidas</option>
                    <option value="closed">Fechadas</option>
                  </select>
                  {(busca || filterStatus || filterUnidade) && (
                    <button
                      onClick={clearFilters}
                      title="Limpar filtros"
                      className="bg-[#141414] text-zinc-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-2.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Content: table (full) OR list (compact) ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="px-6 lg:px-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b border-white/[0.04] animate-pulse">
                      <div className="w-9 h-9 bg-white/[0.05] rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/[0.05] rounded w-1/3" />
                        <div className="h-2 bg-white/[0.05] rounded w-1/5" />
                      </div>
                      <div className="w-20 h-5 bg-white/[0.05] rounded" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-12 h-12 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-zinc-400 tracking-tight mb-1">Nenhum resultado</p>
                  <p className="text-xs text-zinc-600 tracking-tight">Ajuste os filtros ou aguarde novas conversas</p>
                </div>
              ) : !selected ? (
                /* ═════════ CRM TABLE (full width) ═════════ */
                <div className="px-6 lg:px-8 pb-6">
                  <div className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_32px] gap-4 px-5 py-3 border-b border-white/[0.06] bg-[#141414]">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Lead</span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Telefone</span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Score</span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Unidade</span>
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Atividade</span>
                      <span />
                    </div>
                    {/* Table rows */}
                    {conversations.map((conv, i) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelected(conv)}
                        className={`w-full grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_32px] gap-4 px-5 py-3.5 text-left hover:bg-white/[0.025] transition-colors items-center ${i !== conversations.length - 1 ? "border-b border-white/[0.04]" : ""} group`}
                      >
                        {/* Lead */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-white/[0.06] group-hover:border-white/[0.12] transition-colors flex items-center justify-center text-sm font-medium text-zinc-200 flex-shrink-0">
                            {conv.contato_nome?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate tracking-tight">
                              {conv.contato_nome || "Anônimo"}
                            </p>
                            {conv.pausada || conv.intencao_de_compra ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                {conv.pausada && (
                                  <span className="text-[10px] text-zinc-500 tracking-tight flex items-center gap-0.5">
                                    <Bot className="w-2.5 h-2.5" strokeWidth={1.75} /> pausada
                                  </span>
                                )}
                                {conv.intencao_de_compra && (
                                  <span className="text-[10px] text-zinc-300 tracking-tight flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5" strokeWidth={1.75} /> quente
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Telefone */}
                        <span className="text-sm text-zinc-400 tracking-tight tabular-nums truncate">
                          {conv.contato_fone || conv.contato_telefone || "—"}
                        </span>

                        {/* Score */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <div
                              key={s}
                              className={`w-1.5 h-1.5 rounded-full ${s <= (conv.score_lead || 0) ? "bg-white" : "bg-white/10"}`}
                            />
                          ))}
                        </div>

                        {/* Status */}
                        <div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md tracking-tight font-medium inline-block ${statusColor[conv.status] || "bg-[#141414] text-zinc-500 border border-white/[0.04]"}`}>
                            {statusLabel[conv.status] || conv.status}
                          </span>
                        </div>

                        {/* Unidade */}
                        <span className="text-sm text-zinc-400 tracking-tight truncate">
                          {conv.unidade_nome || "—"}
                        </span>

                        {/* Atividade */}
                        <span className="text-sm text-zinc-500 tracking-tight tabular-nums">
                          {timeAgo(conv.updated_at || conv.created_at)}
                        </span>

                        {/* Chevron */}
                        <ChevRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ═════════ COMPACT LIST (when detail open) ═════════ */
                <div className="p-2 space-y-1">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelected(conv)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-colors relative group border ${
                        selected?.id === conv.id
                          ? "bg-[#1A1A1A] border-white/[0.08]"
                          : "hover:bg-white/[0.03] border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium flex-shrink-0 transition-colors ${
                          selected?.id === conv.id
                            ? "bg-[#232323] border border-white/[0.1] text-white"
                            : "bg-[#141414] border border-white/[0.06] text-zinc-300 group-hover:border-white/[0.1]"
                        }`}>
                          {conv.contato_nome?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-white truncate tracking-tight">
                              {conv.contato_nome || "Anônimo"}
                            </p>
                            <span className="text-[10px] text-zinc-500 tabular-nums tracking-tight flex-shrink-0">
                              {timeAgo(conv.updated_at || conv.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 tracking-tight mb-2 tabular-nums truncate">
                            {conv.contato_fone || conv.contato_telefone || "—"}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <div
                                  key={s}
                                  className={`w-1 h-1 rounded-full ${s <= (conv.score_lead || 0) ? "bg-white" : "bg-white/10"}`}
                                />
                              ))}
                            </div>
                            {conv.pausada && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1 bg-[#141414] px-1.5 py-0.5 rounded-md border border-white/[0.06] tracking-tight">
                                <Bot className="w-2.5 h-2.5" strokeWidth={1.75} /> pausada
                              </span>
                            )}
                            {conv.intencao_de_compra && (
                              <span className="text-[10px] text-white flex items-center gap-1 bg-[#232323] px-1.5 py-0.5 rounded-md border border-white/[0.08] tracking-tight">
                                <Flame className="w-2.5 h-2.5" strokeWidth={1.75} /> quente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className={`${!selected ? "px-6 lg:px-8 py-4" : "p-3"} border-t border-white/[0.06] flex items-center justify-between`}>
                <span className="text-xs text-zinc-500 tracking-tight tabular-nums">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="p-2 bg-[#141414] rounded-lg border border-white/[0.06] hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={currentPage >= totalPages}
                    className="p-2 bg-[#141414] rounded-lg border border-white/[0.06] hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <AnimatePresence>
            {selected ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] border-l border-white/[0.06]">

                {/* ── Header ─────────────────────────────────── */}
                <div className="px-6 py-5 border-b border-white/[0.06]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setSelected(null)} className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                        <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <div className="w-11 h-11 rounded-xl bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center text-base font-semibold text-white flex-shrink-0">
                        {selected.contato_nome?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-medium text-white tracking-tight truncate">{selected.contato_nome || "Anônimo"}</h2>
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-[#1A1A1A] border border-white/[0.06]">
                            <span className={`w-1.5 h-1.5 rounded-full ${selected.pausada ? "bg-zinc-600" : selected.status === "open" ? "bg-emerald-400" : "bg-zinc-400"}`} />
                            {selected.pausada ? "IA pausada" : (statusLabel[selected.status] || selected.status)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{selected.contato_fone || selected.contato_telefone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={openChatViewer}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Ver conversa
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await axios.post(`/api-backend/dashboard/conversations/${selected.conversation_id}/toggle-ia`, {}, getConfig());
                            const newStatus = res.data.pausada;
                            setSelected({ ...selected, pausada: newStatus });
                            setConversations(conversations.map(c => c.conversation_id === selected.conversation_id ? { ...c, pausada: newStatus } : c));
                          } catch (err) { console.error(err); }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#141414] text-zinc-300 border border-white/[0.06] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors"
                        title={selected.pausada ? "Ativar IA" : "Pausar IA"}
                      >
                        {selected.pausada ? <Zap className="w-3.5 h-3.5" strokeWidth={1.75} /> : <X className="w-3.5 h-3.5" strokeWidth={1.75} />}
                        {selected.pausada ? "Ativar IA" : "Pausar"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Limpar toda a memória da IA nessa conversa? A IA vai esquecer o histórico.")) return;
                          setClearingMemory(true);
                          try {
                            await axios.post(`/api-backend/dashboard/conversations/${selected.conversation_id}/limpar-memoria`, {}, getConfig());
                            setSelected({ ...selected, total_mensagens_cliente: 0, total_mensagens_ia: 0 });
                            setConversations(conversations.map(c => c.conversation_id === selected.conversation_id ? { ...c, total_mensagens_cliente: 0, total_mensagens_ia: 0 } : c));
                            setMemoryClearedId(String(selected.conversation_id));
                            setTimeout(() => setMemoryClearedId(null), 3000);
                          } catch (err: any) {
                            console.error(err);
                            alert(err?.response?.data?.detail || "Erro ao limpar memória. Tente novamente.");
                          }
                          finally { setClearingMemory(false); }
                        }}
                        disabled={clearingMemory}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 rounded-lg hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                        title="Limpar memória"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {clearingMemory ? "Limpando" : "Memória"}
                      </button>
                    </div>
                  </div>

                  {memoryClearedId === String(selected.conversation_id) && (
                    <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Memória limpa com sucesso
                    </div>
                  )}
                </div>

                {/* ── KPI Strip ───────────────────────────────── */}
                <div className="grid grid-cols-4 border-b border-white/[0.06] divide-x divide-white/[0.06]">
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
                      <Star className="w-3.5 h-3.5" strokeWidth={1.75} /> Lead score
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`w-1.5 h-1.5 rounded-full ${s <= (selected.score_lead || 0) ? "bg-white" : "bg-white/10"}`} />
                      ))}
                      <span className="text-sm font-medium text-white ml-1.5 tracking-tight">{selected.score_lead || 0}/5</span>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
                      <Flame className="w-3.5 h-3.5" strokeWidth={1.75} /> Intenção
                    </div>
                    <p className="text-sm font-medium text-white tracking-tight">
                      {selected.intencao_de_compra ? "Alta" : (selected.score_lead || 0) > 0 ? "Média" : "Baixa"}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} /> Mensagens
                    </div>
                    <p className="text-sm font-medium text-white tracking-tight">
                      {(selected.total_mensagens_cliente || 0) + (selected.total_mensagens_ia || 0)}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500">
                      <Target className="w-3.5 h-3.5" strokeWidth={1.75} /> Fase funil
                    </div>
                    <p className="text-sm font-medium text-white tracking-tight">
                      {selected.status === "open" ? "Negociação"
                        : selected.status === "resolved" ? "Convertido"
                        : selected.status === "pending" ? "Pendente"
                        : "Finalizado"}
                    </p>
                  </div>
                </div>

                {/* ── Body ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

                  {/* Resumo Neural */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                        <h3 className="text-sm font-medium text-white tracking-tight">Resumo neural</h3>
                      </div>
                      <button
                        onClick={handleGenerateSummary}
                        disabled={summarizing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white border border-white/[0.06] rounded-md hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                      >
                        {summarizing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Gerando</> : <><Zap className="w-3 h-3" strokeWidth={1.75} /> Gerar</>}
                      </button>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {selected.resumo_ia || <span className="text-zinc-600 italic">Nenhuma análise disponível para este lead.</span>}
                    </p>
                  </div>

                  {/* Informações */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.06]">
                      <h3 className="text-sm font-medium text-white tracking-tight">Informações</h3>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {[
                        { label: "Unidade de origem", value: selected.unidade_nome || "—", icon: Building2 },
                        { label: "Canal de entrada", value: selected.canal || "—", icon: Zap },
                        { label: "Registrado em", value: selected.created_at ? new Date(selected.created_at).toLocaleString("pt-BR") : "—", icon: Clock },
                        { label: "Última atividade", value: selected.updated_at ? new Date(selected.updated_at).toLocaleString("pt-BR") : "—", icon: Activity },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between px-5 py-3">
                          <span className="text-sm text-zinc-400 flex items-center gap-2">
                            <row.icon className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} /> {row.label}
                          </span>
                          <span className="text-sm text-white tracking-tight">{row.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm text-zinc-400 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} /> Lead qualificado
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border ${
                          selected.lead_qualificado
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-[#1A1A1A] text-zinc-500 border-white/[0.06]"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selected.lead_qualificado ? "bg-emerald-400" : "bg-zinc-600"}`} />
                          {selected.lead_qualificado ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="flex-1 hidden lg:flex flex-col items-center justify-center gap-5 px-8">
                <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-zinc-500" strokeWidth={1.5} />
                </div>
                <div className="text-center max-w-sm">
                  <p className="text-[17px] font-medium text-white tracking-tight mb-1.5">
                    Selecione uma conversa
                  </p>
                  <p className="text-sm text-zinc-500 tracking-tight leading-relaxed">
                    Escolha um lead à esquerda para ver o resumo neural, funil de eventos e métricas de qualificação.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Chat Viewer Drawer */}
      <AnimatePresence>
        {showChat && selected && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full max-w-[480px] bg-[#0A0A0A] border-l border-white/[0.06] flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 bg-[#0F0F0F]">
                <div className="w-9 h-9 rounded-lg bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center text-sm font-semibold text-white">
                  {selected.contato_nome?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white tracking-tight truncate">
                    {selected.contato_nome || "Anônimo"}
                  </p>
                  <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selected.pausada ? "bg-zinc-600" : "bg-emerald-400"}`} />
                    {selected.contato_fone || selected.contato_telefone} · {mensagens.length} msgs
                  </p>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
                {loadingMensagens ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <MessageCircle className="w-8 h-8 text-zinc-700 mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-zinc-400">Nenhuma mensagem registrada</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      As mensagens aparecem aqui conforme o lead conversa.
                    </p>
                  </div>
                ) : (
                  mensagens.map((m, idx) => {
                    const isClient = m.role === "user";
                    const isAudio = m.tipo === "audio" || m.tipo === "ptt";
                    const isImage = m.tipo === "image";
                    const time = m.created_at ? new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                    const showDateDivider = idx === 0 || (m.created_at && mensagens[idx - 1]?.created_at &&
                      new Date(m.created_at).toDateString() !== new Date(mensagens[idx - 1].created_at).toDateString());
                    return (
                      <div key={idx}>
                        {showDateDivider && m.created_at && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[10px] text-zinc-600 bg-[#141414] border border-white/[0.04] rounded-full px-2.5 py-0.5">
                              {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isClient ? "justify-start" : "justify-end"}`}>
                          {isClient && (
                            <div className="w-6 h-6 rounded-md bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                            </div>
                          )}
                          <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                            isClient
                              ? "bg-[#1A1A1A] border border-white/[0.06] text-zinc-200 rounded-bl-sm"
                              : "bg-white text-black rounded-br-sm"
                          }`}>
                            {isAudio && (
                              <p className={`text-xs flex items-center gap-1.5 mb-1 ${isClient ? "text-zinc-500" : "text-zinc-600"}`}>
                                <Mic className="w-3 h-3" strokeWidth={1.75} /> Áudio
                              </p>
                            )}
                            {isImage && (
                              <p className={`text-xs flex items-center gap-1.5 mb-1 ${isClient ? "text-zinc-500" : "text-zinc-600"}`}>
                                <ImageIcon className="w-3 h-3" strokeWidth={1.75} /> Imagem
                              </p>
                            )}
                            {m.url_midia && isImage && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.url_midia} alt="anexo" className="rounded-lg max-w-full mb-1.5" />
                            )}
                            <p className="whitespace-pre-wrap break-words">{m.conteudo || "—"}</p>
                            <p className={`text-[10px] mt-1 ${isClient ? "text-zinc-600" : "text-zinc-600"} text-right`}>
                              {time}
                            </p>
                          </div>
                          {!isClient && (
                            <div className="w-6 h-6 rounded-md bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                              <Bot className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Visualização somente leitura
                </p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Cliente
                  <span className="mx-1 text-zinc-700">·</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  IA
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
}
