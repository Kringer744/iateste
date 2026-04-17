"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  UserCheck, Plus, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, Phone, Search, ChevronDown, ChevronUp,
  StickyNote, Tag, Clock, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/AppSidebar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputClass =
  "w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors text-sm";
const textareaClass = `${inputClass} resize-none leading-relaxed`;

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  persona: { label: "Personalidade", color: "text-zinc-200 bg-[#1A1A1A] border-white/[0.08]" },
  preferencia: { label: "Preferência", color: "text-zinc-200 bg-[#1A1A1A] border-white/[0.08]" },
  historico: { label: "Histórico", color: "text-zinc-200 bg-[#1A1A1A] border-white/[0.08]" },
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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <AppSidebar activePage="clientes" />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="relative z-10 p-8 lg:p-10 max-w-7xl mx-auto">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Clientes
              </h1>
              <p className="text-zinc-500 text-sm mt-1.5 max-w-lg tracking-tight">
                Gerencie notas, persona e preferências dos seus clientes. A IA usa essas informações para personalizar o atendimento.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#141414] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors text-sm"
              />
            </div>
          </div>

          {/* ── Loading state ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" strokeWidth={1.75} />
            </div>
          ) : filteredClientes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-center mb-5">
                <UserCheck className="w-7 h-7 text-zinc-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-300 mb-1.5 tracking-tight">
                {busca ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm tracking-tight">
                {busca
                  ? "Tente buscar com outro nome ou telefone."
                  : "Clientes aparecerão aqui após o primeiro agendamento."}
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
                    className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors"
                  >
                    {/* Client row */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => toggleExpand(c.telefone)}
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <span className="text-zinc-200 text-base font-medium">
                          {c.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm leading-tight truncate tracking-tight">
                          {c.nome}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Phone className="w-3 h-3" strokeWidth={1.75} />
                            {c.telefone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" strokeWidth={1.75} />
                            {c.total_agendamentos} agendamento{c.total_agendamentos !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-3">
                        {c.total_notas > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#1A1A1A] text-zinc-300 border border-white/[0.06] tracking-tight">
                            {c.total_notas} nota{c.total_notas !== 1 ? "s" : ""}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
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
                          <div className="px-4 pb-4 border-t border-white/[0.06] pt-4">
                            {/* Header with add button */}
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-zinc-500 tracking-tight">
                                Notas e persona
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(c.telefone, c.nome);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 rounded-lg text-xs font-medium text-black transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                Nova nota
                              </button>
                            </div>

                            {isLoadingNotas ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" strokeWidth={1.75} />
                              </div>
                            ) : clienteNotas.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <StickyNote className="w-7 h-7 text-zinc-700 mb-2" strokeWidth={1.5} />
                                <p className="text-sm text-zinc-500 tracking-tight">
                                  Nenhuma nota registrada. Adicione informações sobre este cliente.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {clienteNotas.map((nota) => {
                                  const tipoInfo = TIPO_LABELS[nota.tipo] || TIPO_LABELS.persona;
                                  return (
                                    <div
                                      key={nota.id}
                                      className="bg-[#0F0F0F] border border-white/[0.04] rounded-xl p-3.5 group"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mb-2 tracking-tight ${tipoInfo.color}`}
                                          >
                                            <Tag className="w-2.5 h-2.5" strokeWidth={1.75} />
                                            {tipoInfo.label}
                                          </span>
                                          <p className="text-sm text-zinc-300 leading-relaxed tracking-tight">
                                            {nota.conteudo}
                                          </p>
                                          <p className="text-[10px] text-zinc-600 mt-2 tabular-nums">
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
                                            className="p-1.5 hover:bg-white/[0.04] rounded-lg text-zinc-500 hover:text-white transition-colors"
                                          >
                                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(nota.id, c.telefone);
                                            }}
                                            className="p-1.5 hover:bg-white/[0.04] rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
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
                              <p className="text-[10px] text-zinc-600 mt-4 pt-3 border-t border-white/[0.04] tracking-tight">
                                Último agendamento: {formatDate(c.ultimo_agendamento)}
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
              className="relative w-full max-w-lg bg-[#141414] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-center">
                    <StickyNote className="w-4 h-4 text-zinc-300" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-white tracking-tight">
                      {editingNota ? "Editar nota" : "Nova nota"}
                    </h2>
                    <p className="text-xs text-zinc-500 tracking-tight mt-0.5">
                      {modalNome} · {modalFone}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/[0.04] rounded-xl text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Tipo */}
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-400 tracking-tight">
                    Tipo
                  </label>
                  <div className="flex gap-2 p-1 bg-[#1A1A1A] border border-white/[0.06] rounded-xl">
                    {Object.entries(TIPO_LABELS).map(([key, { label }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: key })}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors tracking-tight ${
                          formData.tipo === key
                            ? "bg-[#1E1E1E] text-white"
                            : "text-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conteudo */}
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-400 tracking-tight">
                    Conteúdo
                  </label>
                  <textarea
                    className={textareaClass}
                    rows={4}
                    placeholder={
                      formData.tipo === "persona"
                        ? "Ex: Cliente tranquilo, gosta de conversar, prefere horários cedo..."
                        : formData.tipo === "preferencia"
                        ? "Ex: Gosta de corte degradê baixo, barba desenhada, gel forte..."
                        : "Ex: Veio pela primeira vez indicado pelo amigo, experimentou barba..."
                    }
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving || success}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                      success
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                    ) : success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                        Salvo
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" strokeWidth={1.75} />
                        {editingNota ? "Atualizar" : "Salvar"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
