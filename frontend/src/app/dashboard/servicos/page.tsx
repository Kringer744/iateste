"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Scissors, Plus, Pencil, Power, X, Loader2, Clock, DollarSign,
  Search, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

// ─── Types ────────────────────────────────────────────────────────
interface Servico {
  id: number;
  nome: string;
  descricao: string;
  duracao_minutos: number;
  preco: number;
  ativo: boolean;
}

interface ServicoForm {
  nome: string;
  descricao: string;
  duracao_minutos: number;
  preco: number;
}

const emptyForm: ServicoForm = { nome: "", descricao: "", duracao_minutos: 30, preco: 0 };

// ─── Helpers ──────────────────────────────────────────────────────
function formatPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function formatDuracao(minutos: number): string {
  return `${minutos} min`;
}

// ─── Page Component ───────────────────────────────────────────────
export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServicoForm>(emptyForm);

  // Confirm deactivation
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ─── Fetch ────────────────────────────────────────────────────
  const fetchServicos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api-backend/agendamento/servicos", config);
      setServicos(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar servi\u00e7os.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServicos();
  }, [fetchServicos]);

  // ─── Filtered list ────────────────────────────────────────────
  const filtered = servicos.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    s.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  // ─── Open modal ───────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (s: Servico) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      descricao: s.descricao || "",
      duracao_minutos: s.duracao_minutos,
      preco: s.preco,
    });
    setError("");
    setModalOpen(true);
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome.trim()) {
      setError("Nome do servi\u00e7o \u00e9 obrigat\u00f3rio.");
      return;
    }
    if (form.duracao_minutos < 1) {
      setError("Dura\u00e7\u00e3o deve ser maior que 0.");
      return;
    }
    if (form.preco < 0) {
      setError("Pre\u00e7o n\u00e3o pode ser negativo.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await axios.put(`/api-backend/agendamento/servicos/${editingId}`, form, config);
      } else {
        await axios.post("/api-backend/agendamento/servicos", form, config);
      }
      setModalOpen(false);
      fetchServicos();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erro ao salvar servi\u00e7o.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Deactivate ───────────────────────────────────────────────
  const handleDeactivate = async (id: number) => {
    try {
      await axios.delete(`/api-backend/agendamento/servicos/${id}`, config);
      setConfirmId(null);
      fetchServicos();
    } catch (err: any) {
      console.error(err);
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090f] text-white flex">
      <DashboardSidebar activePage="servicos" />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-[#09090f]/80 backdrop-blur-xl border-b border-white/5 px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Scissors className="w-5 h-5 text-[#D4AF37]" />
              <h1
                className="text-xl font-black"
                style={{
                  background: "linear-gradient(135deg,#fff 0%,#D4AF37 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Servi\u00e7os
              </h1>
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {servicos.length} servi\u00e7o{servicos.length !== 1 ? "s" : ""} cadastrado{servicos.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar servi\u00e7o..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/40 transition-colors w-56"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Novo Servi\u00e7o
            </motion.button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-gray-500"
            >
              <Scissors className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-lg font-bold">Nenhum servi\u00e7o encontrado</p>
              <p className="text-sm mt-1">
                {busca ? "Tente outro termo de busca." : 'Clique em "+ Novo Servi\u00e7o" para come\u00e7ar.'}
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <div className="col-span-3">Nome</div>
                <div className="col-span-3">Descri\u00e7\u00e3o</div>
                <div className="col-span-2 text-center">Dura\u00e7\u00e3o</div>
                <div className="col-span-2 text-center">Pre\u00e7o</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-center">A\u00e7\u00f5es</div>
              </div>

              {/* Rows */}
              <AnimatePresence>
                {filtered.map((servico, i) => (
                  <motion.div
                    key={servico.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-[#D4AF37]/20 transition-all group"
                  >
                    {/* Nome */}
                    <div className="col-span-3">
                      <p className="font-bold text-sm text-white truncate">{servico.nome}</p>
                    </div>

                    {/* Descricao */}
                    <div className="col-span-3">
                      <p className="text-sm text-gray-400 truncate">{servico.descricao || "--"}</p>
                    </div>

                    {/* Duracao */}
                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-300">
                        {formatDuracao(servico.duracao_minutos)}
                      </span>
                    </div>

                    {/* Preco */}
                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="text-sm font-bold text-[#D4AF37]">
                        {formatPreco(servico.preco)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          servico.ativo !== false
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {servico.ativo !== false ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(servico)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#D4AF37] transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmId(servico.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                        title="Desativar"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* ─── Create/Edit Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white">
                  {editingId ? "Editar Servi\u00e7o" : "Novo Servi\u00e7o"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5 space-y-5">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Nome */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Nome do Servi\u00e7o
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Corte Masculino"
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                  />
                </div>

                {/* Descricao */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Descri\u00e7\u00e3o
                  </label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descreva o servi\u00e7o..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none"
                  />
                </div>

                {/* Duracao + Preco */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      Dura\u00e7\u00e3o (minutos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.duracao_minutos}
                      onChange={(e) =>
                        setForm({ ...form, duracao_minutos: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                      Pre\u00e7o (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.preco}
                      onChange={(e) =>
                        setForm({ ...form, preco: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/5">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-shadow disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Salvar Altera\u00e7\u00f5es" : "Criar Servi\u00e7o"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Confirm Deactivate Modal ─────────────────────────────── */}
      <AnimatePresence>
        {confirmId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Power className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Desativar Servi\u00e7o?</h3>
              <p className="text-sm text-gray-400 mb-6">
                O servi\u00e7o ser\u00e1 desativado e n\u00e3o aparecer\u00e1 mais para agendamentos.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeactivate(confirmId)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-red-500/20 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  Desativar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
