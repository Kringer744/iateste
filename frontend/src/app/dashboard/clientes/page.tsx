"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  UserCheck, Plus, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, Phone, Search, ChevronDown, ChevronUp,
  StickyNote, Tag, Clock, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputClass =
  "w-full bg-slate-900/60 border border-white/8 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#FFFFFF]/40 focus:bg-slate-900/80 transition-all font-medium text-sm";
const textareaClass = `${inputClass} resize-none leading-relaxed`;

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  persona: { label: "Personalidade", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  preferencia: { label: "Preferência", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  historico: { label: "Histórico", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Cliente {
  telefone: string;
  nome: string;
  total_agendamentos: number;
  ultimo_agendamento: string | null;
  total_notas: number;
}

interface Nota {
  id: number;
  tipo: string;
  conteudo: string;
  relevancia: number;
  created_at: string;
  updated_at: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [expandedFone, setExpandedFone] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, Nota[]>>({});
  const [loadingNotas, setLoadingNotas] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<Nota | null>(null);
  const [modalFone, setModalFone] = useState("");
  const [modalNome, setModalNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ tipo: "persona", conteudo: "" });

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  // ── Fetch clientes ──────────────────────────────────────────────────────
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api-backend/agendamento/clientes", getConfig());
      setClientes(res.data);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch notas de um cliente ───────────────────────────────────────────
  const fetchNotas = async (telefone: string) => {
    setLoadingNotas(telefone);
    try {
      const fone = telefone.replace(/\D/g, "");
      const res = await axios.get(`/api-backend/agendamento/clientes/${fone}/persona`, getConfig());
      setNotas((prev) => ({ ...prev, [telefone]: res.data }));
    } catch (e) {
      console.error("Erro ao carregar notas:", e);
    } finally {
      setLoadingNotas(null);
    }
  };

  // ── Expand/collapse ─────────────────────────────────────────────────────
  const toggleExpand = (telefone: string) => {
    if (expandedFone === telefone) {
      setExpandedFone(null);
    } else {
      setExpandedFone(telefone);
      if (!notas[telefone]) {
        fetchNotas(telefone);
      }
    }
  };

  // ── Modal open ──────────────────────────────────────────────────────────
  const openModal = (telefone: string, nome: string, nota: Nota | null = null) => {
    setModalFone(telefone);
    setModalNome(nome);
    if (nota) {
      setEditingNota(nota);
      setFormData({ tipo: nota.tipo, conteudo: nota.conteudo });
    } else {
      setEditingNota(null);
      setFormData({ tipo: "persona", conteudo: "" });
    }
    setIsModalOpen(true);
    setSuccess(false);
  };

  // ── Save nota ───────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      if (editingNota) {
        await axios.put(
          `/api-backend/agendamento/clientes/persona/${editingNota.id}`,
          { conteudo: formData.conteudo, tipo: formData.tipo },
          getConfig()
        );
      } else {
        const fone = modalFone.replace(/\D/g, "");
        await axios.post(
          "/api-backend/agendamento/clientes/persona",
          { contato_fone: fone, tipo: formData.tipo, conteudo: formData.conteudo },
          getConfig()
        );
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        fetchNotas(modalFone);
        fetchClientes();
      }, 1000);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Erro desconhecido";
      alert(`Erro ao salvar nota: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete nota ─────────────────────────────────────────────────────────
  const handleDelete = async (notaId: number, telefone: string) => {
    if (!confirm("Excluir esta nota?")) return;
    try {
      await axios.delete(`/api-backend/agendamento/clientes/persona/${notaId}`, getConfig());
      fetchNotas(telefone);
      fetchClientes();
    } catch (e) {
      alert("Erro ao excluir nota.");
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  const filteredClientes = clientes.filter((c) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return c.nome.toLowerCase().includes(b) || c.telefone.includes(b);
  });

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090f] text-white flex">
      <DashboardSidebar activePage="clientes" />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-[#FFFFFF]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 p-8 lg:p-10 max-w-7xl mx-auto">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-5 bg-[#FFFFFF] rounded-full" />
                <span className="text-[10px] font-black text-[#FFFFFF] uppercase tracking-[0.4em]">
                  Closer IA
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">
                <span
                  style={{
                    background: "linear-gradient(135deg, #fff 0%, #FFFFFF 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Clientes
                </span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium italic text-sm max-w-lg">
                Gerencie notas, persona e preferencias dos seus clientes. A IA usa essas informacoes para personalizar o atendimento.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/8 rounded-2xl pl-11 pr-5 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#FFFFFF]/40 text-sm"
              />
            </div>
          </div>

          {/* ── Loading state ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-[#FFFFFF] animate-spin" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-6">
                <UserCheck className="w-9 h-9 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">
                {busca ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              </h3>
              <p className="text-sm text-slate-600 max-w-sm">
                {busca
                  ? "Tente buscar com outro nome ou telefone."
                  : "Clientes aparecerao aqui apos o primeiro agendamento."}
              </p>
            </motion.div>
          ) : (
            /* ── Client list ──────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {filteredClientes.map((c, i) => {
                const isExpanded = expandedFone === c.telefone;
                const clienteNotas = notas[c.telefone] || [];
                const isLoadingNotas = loadingNotas === c.telefone;

                return (
                  <motion.div
                    key={c.telefone}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFFFFF]/20 transition-all"
                  >
                    {/* Client row */}
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer"
                      onClick={() => toggleExpand(c.telefone)}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFFFFF]/20 to-[#FFFFFF]/5 border border-[#FFFFFF]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#FFFFFF] font-black text-lg">
                          {c.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base leading-tight truncate">
                          {c.nome}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.telefone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {c.total_agendamentos} agendamento{c.total_agendamentos !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-3">
                        {c.total_notas > 0 && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {c.total_notas} nota{c.total_notas !== 1 ? "s" : ""}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-white/5 pt-4">
                            {/* Header with add button */}
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                Notas & Persona
                              </p>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(c.telefone, c.nome);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 border border-[#FFFFFF]/20 rounded-xl text-xs font-bold text-[#FFFFFF] transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Nova Nota
                              </motion.button>
                            </div>

                            {isLoadingNotas ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-[#FFFFFF] animate-spin" />
                              </div>
                            ) : clienteNotas.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <StickyNote className="w-8 h-8 text-slate-700 mb-2" />
                                <p className="text-sm text-slate-600">
                                  Nenhuma nota registrada. Adicione informacoes sobre este cliente.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {clienteNotas.map((nota) => {
                                  const tipoInfo = TIPO_LABELS[nota.tipo] || TIPO_LABELS.persona;
                                  return (
                                    <div
                                      key={nota.id}
                                      className="bg-slate-900/40 border border-white/5 rounded-xl p-4 group"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${tipoInfo.color}`}
                                          >
                                            <Tag className="w-2.5 h-2.5" />
                                            {tipoInfo.label}
                                          </span>
                                          <p className="text-sm text-slate-300 leading-relaxed">
                                            {nota.conteudo}
                                          </p>
                                          <p className="text-[10px] text-slate-600 mt-2">
                                            {formatDate(nota.updated_at || nota.created_at)}
                                          </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openModal(c.telefone, c.nome, nota);
                                            }}
                                            className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-[#FFFFFF] transition-all"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(nota.id, c.telefone);
                                            }}
                                            className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-400 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Last appointment info */}
                            {c.ultimo_agendamento && (
                              <p className="text-[10px] text-slate-600 mt-4 pt-3 border-t border-white/5">
                                Ultimo agendamento: {formatDate(c.ultimo_agendamento)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0c0c14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFFFFF] to-[#E5E7EB] flex items-center justify-center">
                    <StickyNote className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {editingNota ? "Editar Nota" : "Nova Nota"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalNome} - {modalFone}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSave} className="p-8 space-y-6">
                {/* Tipo */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <Tag className="w-3.5 h-3.5 text-[#FFFFFF]/50" /> Tipo
                  </label>
                  <div className="flex gap-3">
                    {Object.entries(TIPO_LABELS).map(([key, { label, color }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: key })}
                        className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                          formData.tipo === key
                            ? `${color} ring-1 ring-current`
                            : "bg-slate-900/60 border-white/8 text-slate-500 hover:text-white hover:bg-slate-900/80"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conteudo */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <StickyNote className="w-3.5 h-3.5 text-[#FFFFFF]/50" /> Conteudo
                  </label>
                  <textarea
                    className={textareaClass}
                    rows={4}
                    placeholder={
                      formData.tipo === "persona"
                        ? "Ex: Cliente tranquilo, gosta de conversar, prefere horarios cedo..."
                        : formData.tipo === "preferencia"
                        ? "Ex: Gosta de corte degrade baixo, barba desenhada, gel forte..."
                        : "Ex: Veio pela primeira vez indicado pelo amigo, experimentou barba..."
                    }
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>

                  <motion.button
                    type="submit"
                    disabled={saving || success}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${
                      success
                        ? "bg-emerald-500 text-white"
                        : "bg-[#FFFFFF] text-black shadow-[0_0_25px_rgba(225,29,72,0.3)] hover:shadow-[0_0_40px_rgba(225,29,72,0.4)]"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Salvo
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingNota ? "Atualizar" : "Salvar"}
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
