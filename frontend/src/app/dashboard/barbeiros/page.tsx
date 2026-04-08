"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Scissors, Plus, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, Phone, User, Star, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputClass =
  "w-full bg-slate-900/60 border border-white/8 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-slate-900/80 transition-all font-medium text-sm";
const textareaClass = `${inputClass} resize-none leading-relaxed`;

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#D4AF37]/50" />} {label}
      </label>
      {children}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Barbeiro {
  id: number;
  nome: string;
  telefone: string;
  especialidades: string;
  ativo: boolean;
}

const emptyForm = {
  nome: "",
  telefone: "",
  especialidades: "",
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BarbeirosPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarbeiro, setEditingBarbeiro] = useState<Barbeiro | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<any>({ ...emptyForm });

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  useEffect(() => {
    fetchBarbeiros();
  }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const fetchBarbeiros = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api-backend/agendamento/barbeiros", getConfig());
      setBarbeiros(res.data);
    } catch (e) {
      console.error("Erro ao carregar barbeiros:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (barbeiro: Barbeiro | null = null) => {
    if (barbeiro) {
      setEditingBarbeiro(barbeiro);
      setFormData({
        nome: barbeiro.nome || "",
        telefone: barbeiro.telefone || "",
        especialidades: barbeiro.especialidades || "",
      });
    } else {
      setEditingBarbeiro(null);
      setFormData({ ...emptyForm });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      if (editingBarbeiro) {
        await axios.put(
          `/api-backend/agendamento/barbeiros/${editingBarbeiro.id}`,
          formData,
          getConfig()
        );
      } else {
        await axios.post("/api-backend/agendamento/barbeiros", formData, getConfig());
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        fetchBarbeiros();
      }, 1500);
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Erro ao salvar barbeiro.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Desativar este barbeiro?")) return;
    try {
      await axios.delete(`/api-backend/agendamento/barbeiros/${id}`, getConfig());
      fetchBarbeiros();
    } catch (e) {
      alert("Erro ao desativar barbeiro.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090f] text-white flex">
      <DashboardSidebar activePage="barbeiros" />

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Decorative glow */}
        <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 p-8 lg:p-10 max-w-7xl mx-auto">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-5 bg-[#D4AF37] rounded-full" />
                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em]">
                  Concierge IA
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">
                <span
                  style={{
                    background: "linear-gradient(135deg, #fff 0%, #D4AF37 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Barbeiros
                </span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium italic text-sm max-w-lg">
                Gerencie os barbeiros, especialidades e disponibilidade da sua barbearia.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOpenModal()}
              className="flex items-center gap-3 bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all min-w-[200px] justify-center"
            >
              <Plus className="w-5 h-5" />
              Novo Barbeiro
            </motion.button>
          </div>

          {/* ── Loading state ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : barbeiros.length === 0 ? (
            /* ── Empty state ─────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-6">
                <Scissors className="w-9 h-9 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">Nenhum barbeiro cadastrado</h3>
              <p className="text-sm text-slate-600 max-w-sm">
                Adicione seu primeiro barbeiro para comecar a gerenciar os agendamentos.
              </p>
            </motion.div>
          ) : (
            /* ── Cards grid ──────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {barbeiros.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-[#D4AF37]/20 transition-all group"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{b.nome}</h3>
                        {b.telefone && (
                          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs">
                            <Phone className="w-3 h-3" />
                            {b.telefone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.ativo
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {b.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Especialidades */}
                  {b.especialidades && (
                    <div className="mb-5">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                        Especialidades
                      </p>
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                        {b.especialidades}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenModal(b)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/30 rounded-xl text-xs font-bold text-slate-400 hover:text-[#D4AF37] transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeactivate(b.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Desativar
                    </motion.button>
                  </div>
                </motion.div>
              ))}
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
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0c0c14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {editingBarbeiro ? "Editar Barbeiro" : "Novo Barbeiro"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {editingBarbeiro
                        ? "Atualize as informacoes do barbeiro"
                        : "Preencha os dados do novo barbeiro"}
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
                <Field label="Nome" icon={User}>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Nome do barbeiro"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Telefone" icon={Phone}>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </Field>

                <Field label="Especialidades" icon={Star}>
                  <textarea
                    className={textareaClass}
                    rows={4}
                    placeholder="Corte degradê, barba, pigmentação..."
                    value={formData.especialidades}
                    onChange={(e) => setFormData({ ...formData, especialidades: e.target.value })}
                  />
                </Field>

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
                        : "bg-[#D4AF37] text-black shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]"
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
                        {editingBarbeiro ? "Atualizar" : "Criar Barbeiro"}
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
