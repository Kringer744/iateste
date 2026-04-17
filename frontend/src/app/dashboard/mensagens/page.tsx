"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Save, Loader2, CheckCircle2, Eye, EyeOff, RotateCcw, AlertCircle,
  CalendarCheck, Bell, Clock, Star, ThumbsUp, Copy, Check, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/AppSidebar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const textareaClass =
  "w-full bg-slate-900/60 border border-white/8 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#FFFFFF]/40 focus:ring-1 focus:ring-[#FFFFFF]/20 focus:bg-slate-900/80 transition-all font-medium text-sm resize-none leading-relaxed";

// ─── Sample data for previews ───────────────────────────────────────────────
const SAMPLE_DATA: Record<string, string> = {
  dia: "Sexta-feira",
  data: "11/04/2026",
  horario: "14:30",
  barbeiro: "Sulivan",
  servico: "Corte + Barba",
  estrelas: "⭐⭐⭐⭐⭐",
};

// ─── Message field config ───────────────────────────────────────────────────
interface MsgField {
  key: string;
  label: string;
  icon: any;
  description: string;
  variables: string[];
  rows: number;
  defaultValue: string;
  color: string;
}

const MSG_FIELDS: MsgField[] = [
  {
    key: "msg_confirmacao_agendamento",
    label: "Confirmação de Agendamento",
    icon: CalendarCheck,
    description: "Enviada ao cliente quando um agendamento é confirmado.",
    variables: ["dia", "data", "horario", "barbeiro", "servico"],
    rows: 7,
    color: "#10b981",
    defaultValue:
      "✅ *Agendamento Confirmado!*\n\n📅 {dia}, {data}\n🕐 {horario}\n💈 {barbeiro}\n✂️ {servico}\n\nTe esperamos! Se precisar remarcar ou cancelar, é só me avisar 😊",
  },
  {
    key: "msg_lembrete_1d",
    label: "Lembrete — 1 Dia Antes",
    icon: Bell,
    description: "Enviada 24 horas antes do horário marcado.",
    variables: ["dia", "data", "horario", "barbeiro"],
    rows: 6,
    color: "#f59e0b",
    defaultValue:
      "👋 Oi! Lembrando que *amanhã* você tem horário marcado:\n\n📅 {dia}, {data} às {horario}\n💈 Com {barbeiro}\n\nVocê confirma? Responde *sim* ou *não* 😊",
  },
  {
    key: "msg_lembrete_1h",
    label: "Lembrete — 1 Hora Antes",
    icon: Clock,
    description: "Enviada 1 hora antes do horário marcado.",
    variables: ["dia", "data", "horario", "barbeiro"],
    rows: 6,
    color: "#f97316",
    defaultValue:
      "⏰ Falta *1 hora* pro seu horário:\n\n📅 {dia}, {data} às {horario}\n💈 Com {barbeiro}\n\nVocê confirma? Responde *sim* ou *não* 😊",
  },
  {
    key: "msg_avaliacao",
    label: "Pedido de Avaliação",
    icon: Star,
    description: "Enviada após a conclusão do serviço para pedir avaliação.",
    variables: ["barbeiro"],
    rows: 9,
    color: "#8b5cf6",
    defaultValue:
      "✂️ Corte finalizado! Como foi seu atendimento com *{barbeiro}*?\n\nDá uma nota de *1 a 5* ⭐\n\n1 ⭐ - Ruim\n2 ⭐⭐ - Regular\n3 ⭐⭐⭐ - Bom\n4 ⭐⭐⭐⭐ - Muito bom\n5 ⭐⭐⭐⭐⭐ - Excelente\n\nSó mandar o número! 😊",
  },
  {
    key: "msg_avaliacao_obrigado",
    label: "Agradecimento de Avaliação",
    icon: ThumbsUp,
    description: "Enviada após o cliente enviar a nota de avaliação.",
    variables: ["estrelas"],
    rows: 3,
    color: "#06b6d4",
    defaultValue:
      "Obrigado pela avaliação! {estrelas}\n\nSua opinião é muito importante pra gente! 😊",
  },
];

// ─── WhatsApp-style preview renderer ─────────────────────────────────────────
function WhatsAppPreview({ template }: { template: string }) {
  let result = template;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(`{${key}}`, value);
  }

  // Parse WhatsApp-style bold
  const lines = result.split("\n");

  return (
    <div className="bg-[#0b141a] rounded-2xl p-4 border border-white/5">
      {/* WhatsApp header bar */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFFFFF] to-[#FFFFFF]/60 flex items-center justify-center">
          <Send className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-white/90">Closer IA</p>
          <p className="text-[10px] text-white/40">Prévia da mensagem</p>
        </div>
      </div>
      {/* Message bubble */}
      <div className="bg-[#005c4b] rounded-xl rounded-tl-sm px-4 py-3 max-w-[95%] ml-auto">
        <div className="text-[13px] text-white/90 whitespace-pre-wrap leading-relaxed">
          {lines.map((line, i) => {
            // Basic bold parsing for *text*
            const parts = line.split(/(\*[^*]+\*)/g);
            return (
              <React.Fragment key={i}>
                {i > 0 && "\n"}
                {parts.map((part, j) =>
                  part.startsWith("*") && part.endsWith("*") ? (
                    <strong key={j} className="font-bold text-white">
                      {part.slice(1, -1)}
                    </strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="text-right mt-1">
          <span className="text-[10px] text-white/30">14:30 ✓✓</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MensagensPage() {
  const [fullPersonality, setFullPersonality] = useState<Record<string, any> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [personalityId, setPersonalityId] = useState<number | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api-backend/management/personalities", getConfig());
      const personalities = res.data;
      if (personalities && personalities.length > 0) {
        const p = personalities[0];
        setFullPersonality(p);
        setPersonalityId(p.id);
        const data: Record<string, string> = {};
        for (const field of MSG_FIELDS) {
          data[field.key] = p[field.key] || field.defaultValue;
        }
        setFormData(data);
        setOriginalData({ ...data });
      } else {
        const data: Record<string, string> = {};
        for (const field of MSG_FIELDS) {
          data[field.key] = field.defaultValue;
        }
        setFormData(data);
        setOriginalData({ ...data });
      }
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
      const data: Record<string, string> = {};
      for (const field of MSG_FIELDS) {
        data[field.key] = field.defaultValue;
      }
      setFormData(data);
      setOriginalData({ ...data });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const hasChanges = Object.keys(formData).some(
    (k) => formData[k] !== originalData[k]
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");
    try {
      // Merge message fields into the full personality object to avoid overwriting
      const payload = { ...(fullPersonality || {}), ...formData };
      // Remove read-only / computed fields that the backend doesn't accept
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.empresa_id;

      if (personalityId) {
        await axios.put(
          `/api-backend/management/personalities/${personalityId}`,
          payload,
          getConfig()
        );
      } else {
        const res = await axios.post("/api-backend/management/personality", payload, getConfig());
        if (res.data?.id) setPersonalityId(res.data.id);
      }
      setSaveStatus("success");
      setOriginalData({ ...formData });
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: any) {
      console.error("Erro ao salvar:", e);
      setSaveStatus("error");
      setErrorMsg(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Erro desconhecido ao salvar"
      );
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = (key: string) => {
    setPreviews((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetField = (key: string) => {
    const field = MSG_FIELDS.find((f) => f.key === key);
    if (field) {
      setFormData((prev) => ({ ...prev, [key]: field.defaultValue }));
    }
  };

  const insertVariable = (fieldKey: string, variable: string) => {
    const textarea = document.getElementById(`textarea-${fieldKey}`) as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = formData[fieldKey] || "";
      const newVal = current.substring(0, start) + `{${variable}}` + current.substring(end);
      setFormData((prev) => ({ ...prev, [fieldKey]: newVal }));
      // Reset cursor after insert
      setTimeout(() => {
        textarea.focus();
        const newPos = start + variable.length + 2;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    } else {
      // Fallback: append at end
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: (prev[fieldKey] || "") + `{${variable}}`,
      }));
    }
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 1000);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090f] text-white flex">
      <AppSidebar activePage="mensagens" />

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Decorative glow */}
        <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-[#FFFFFF]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 p-8 lg:p-10 max-w-4xl mx-auto">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
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
                  Mensagens
                </span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium text-sm max-w-lg">
                Configure as mensagens automáticas enviadas por WhatsApp em cada etapa do agendamento.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving || loading || !hasChanges}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm min-w-[200px] justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  saveStatus === "success"
                    ? "bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    : saveStatus === "error"
                    ? "bg-red-600 text-white"
                    : "bg-[#FFFFFF] text-white shadow-[0_0_25px_rgba(225,29,72,0.3)] hover:shadow-[0_0_40px_rgba(225,29,72,0.4)]"
                }`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saveStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Salvo!
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Erro
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar
                  </>
                )}
              </motion.button>
              {hasChanges && saveStatus === "idle" && (
                <span className="text-[10px] text-amber-400 font-medium">
                  Alterações não salvas
                </span>
              )}
              {saveStatus === "error" && errorMsg && (
                <span className="text-[10px] text-red-400 font-medium max-w-[250px] text-right">
                  {errorMsg}
                </span>
              )}
            </div>
          </div>

          {/* ── Cadência info ───────────────────────────────────────── */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Cadência Automática de Mensagens
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: CalendarCheck, label: "Confirmação", color: "#10b981" },
                { icon: Bell, label: "Lembrete 1d", color: "#f59e0b" },
                { icon: Clock, label: "Lembrete 1h", color: "#f97316" },
                { icon: Star, label: "Avaliação", color: "#8b5cf6" },
                { icon: ThumbsUp, label: "Obrigado", color: "#06b6d4" },
              ].map((step, i) => (
                <React.Fragment key={step.label}>
                  {i > 0 && (
                    <div className="w-6 h-px bg-white/10" />
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                    <step.icon className="w-3.5 h-3.5" style={{ color: step.color }} />
                    <span className="text-[11px] font-medium text-slate-400">{step.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Loading state ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#FFFFFF] animate-spin" />
                <span className="text-xs text-slate-500">Carregando mensagens...</span>
              </div>
            </div>
          ) : (
            /* ── Message fields ──────────────────────────────────────── */
            <div className="space-y-6">
              {MSG_FIELDS.map((field, i) => {
                const isModified = formData[field.key] !== originalData[field.key];
                const isPreview = previews[field.key];

                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all ${
                      isModified
                        ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                        : "border-white/8 hover:border-white/12"
                    }`}
                  >
                    {/* Color accent bar */}
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${field.color}, transparent)` }} />

                    <div className="p-6">
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl border flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${field.color}20, ${field.color}08)`,
                              borderColor: `${field.color}30`,
                            }}
                          >
                            <field.icon className="w-5 h-5" style={{ color: field.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-[15px] leading-tight">
                                {field.label}
                              </h3>
                              {isModified && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  EDITADO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{field.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetField(field.key)}
                            title="Restaurar mensagem padrão"
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreview(field.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider ${
                              isPreview
                                ? "bg-[#FFFFFF]/10 border-[#FFFFFF]/30 text-[#FFFFFF]"
                                : "bg-white/5 hover:bg-[#FFFFFF]/10 border-white/10 hover:border-[#FFFFFF]/30 text-slate-400 hover:text-[#FFFFFF]"
                            }`}
                          >
                            {isPreview ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Editar
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Variables badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mr-1 self-center">
                          Variáveis:
                        </span>
                        {field.variables.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(field.key, v)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono font-bold text-slate-400 hover:text-white hover:bg-[#FFFFFF]/10 hover:border-[#FFFFFF]/20 transition-all flex items-center gap-1"
                          >
                            {copiedVar === v ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-40" />
                            )}
                            {`{${v}}`}
                          </button>
                        ))}
                      </div>

                      {/* Textarea or Preview */}
                      <AnimatePresence mode="wait">
                        {isPreview ? (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                          >
                            <WhatsAppPreview template={formData[field.key] || field.defaultValue} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="editor"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                          >
                            <textarea
                              id={`textarea-${field.key}`}
                              className={textareaClass}
                              rows={field.rows}
                              value={formData[field.key] || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={`Digite a mensagem de ${field.label.toLowerCase()}...`}
                            />
                            <div className="flex items-center justify-between mt-2 px-1">
                              <span className="text-[10px] text-slate-600">
                                Use *texto* para <strong className="text-slate-400">negrito</strong> no WhatsApp
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {(formData[field.key] || "").length} caracteres
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-12" />
        </div>
      </main>
    </div>
  );
}
