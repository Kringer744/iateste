"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Network, Loader2, Save, Check, MessageSquare, Zap, Hash,
  Globe, ShieldCheck, Eye, EyeOff,
  CheckCircle, XCircle, Wifi, Clock, KeyRound, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

interface Integration { id?: number; tipo: string; config: any; ativo: boolean; updated_at?: string; }

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("chatwoot");
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [isAdminMaster, setIsAdminMaster] = useState(false);
  const [chatwootAiActive, setChatwootAiActive] = useState(true);
  const [togglingAi, setTogglingAi] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const toggleTokenVisibility = (field: string) => setShowTokens(p => ({ ...p, [field]: !p[field] }));

  const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    axios.get("/api-backend/auth/me", getToken()).then(r => {
      if (r.data.perfil === "admin_master") {
        setIsAdminMaster(true);
        setLoading(false);
        return;
      }
      axios.get("/api-backend/management/integrations", getToken())
        .then(res => {
          const mapped = res.data.reduce((acc: any, item: any) => {
            acc[item.tipo] = { ...item, config: typeof item.config === "string" ? JSON.parse(item.config) : item.config };
            return acc;
          }, {});
          setIntegrations(mapped);
          return axios.get("/api-backend/management/integrations/chatwoot/ai-status", getToken())
            .then((statusRes) => setChatwootAiActive(Boolean(statusRes.data?.ai_active)))
            .catch(() => setChatwootAiActive(true));
        }).catch(console.error).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { setTestResult(null); }, [activeTab]);

  const currentConfig = integrations[activeTab] || {
    tipo: activeTab,
    config: activeTab === "chatwoot" ? { url: "", access_token: "", account_id: "" }
      : { url: "", token: "" },
    ativo: false,
  };

  const isConfigured = activeTab === "chatwoot"
    ? !!(currentConfig.config.url && currentConfig.config.access_token && currentConfig.config.account_id)
    : !!(currentConfig.config.url && currentConfig.config.token);

  const updateField = (field: string, value: any) => setIntegrations({
    ...integrations,
    [activeTab]: { ...currentConfig, config: { ...currentConfig.config, [field]: value } }
  });
  const toggleAtivo = () => setIntegrations({ ...integrations, [activeTab]: { ...currentConfig, ativo: !currentConfig.ativo } });

  const toggleChatwootAI = async () => {
    if (activeTab !== "chatwoot") return;
    const next = !chatwootAiActive;
    setTogglingAi(true);
    try {
      await axios.put("/api-backend/management/integrations/chatwoot/ai-status", { ai_active: next }, getToken());
      setChatwootAiActive(next);
    } catch { alert("Erro ao alterar status da IA no Chatwoot."); }
    finally { setTogglingAi(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`/api-backend/management/integrations/${activeTab}`, currentConfig, getToken());
      setSuccess(true);
      setIntegrations(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], ...currentConfig, updated_at: new Date().toISOString() }
      }));
      setTimeout(() => setSuccess(false), 3000);
    } catch { alert("Erro ao salvar integração."); }
    finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post(`/api-backend/management/integrations/${activeTab}/test`, {}, getToken());
      setTestResult(res.data);
    } catch { setTestResult({ ok: false, message: "Erro na requisição" }); }
    finally { setTesting(false); }
  };

  const inputClass = "w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors";
  const labelClass = "text-xs text-zinc-400 flex items-center gap-1.5 mb-2";

  const tabs = [
    { id: "chatwoot", label: "Chatwoot", icon: MessageSquare, desc: "Central de atendimento" },
    { id: "uazapi", label: "UazAPI", icon: Hash, desc: "Gateway WhatsApp" },
  ];

  const StatusDot = ({ state }: { state: "on" | "paused" | "off" }) => (
    <span className={`w-1.5 h-1.5 rounded-full ${
      state === "on" ? "bg-emerald-400" : state === "paused" ? "bg-amber-400" : "bg-zinc-600"
    }`} />
  );

  const Toggle = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
        on ? "bg-white" : "bg-[#232323]"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
        on ? "translate-x-[18px] bg-black" : "translate-x-[3px] bg-zinc-400"
      }`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <DashboardSidebar activePage="integrations" />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-20">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Conexões de conta</h1>
              <p className="text-sm text-zinc-500 mt-1">Gerencie as pontes entre seus canais de atendimento.</p>
            </div>
            {!isAdminMaster && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando</>
                  : success ? <><Check className="w-4 h-4" />Salvo</>
                  : <><Save className="w-4 h-4" />Salvar alterações</>}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => {
              const tabIntegration = integrations[tab.id];
              const tabConfigured = tab.id === "chatwoot"
                ? !!(tabIntegration?.config?.url && tabIntegration?.config?.access_token)
                : !!(tabIntegration?.config?.url && tabIntegration?.config?.token);
              const isActive = activeTab === tab.id;
              const state: "on" | "paused" | "off" = tabConfigured && tabIntegration?.ativo
                ? "on" : tabConfigured ? "paused" : "off";

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm transition-colors border ${
                    isActive
                      ? "bg-[#1E1E1E] text-white border-white/[0.08]"
                      : "bg-transparent text-zinc-400 border-white/[0.04] hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <tab.icon className="w-4 h-4" strokeWidth={1.75} />
                  <span className="tracking-tight">{tab.label}</span>
                  <StatusDot state={state} />
                </button>
              );
            })}
          </div>

          {isAdminMaster ? (
            <div className="flex flex-col items-center justify-center py-28 rounded-2xl border border-white/[0.06] bg-[#141414]">
              <Network className="w-8 h-8 text-zinc-700 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-white">Acesso restrito</p>
              <p className="text-xs text-zinc-500 mt-1 text-center max-w-xs">
                As integrações são gerenciadas pelo administrador de cada empresa.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >

                {/* Status row */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1E1E1E] border border-white/[0.06] flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusDot state={isConfigured && currentConfig.ativo ? "on" : isConfigured ? "paused" : "off"} />
                        <p className="text-sm font-medium text-white tracking-tight">
                          {isConfigured && currentConfig.ativo
                            ? "Conectado e ativo"
                            : isConfigured
                              ? "Configurado — pausado"
                              : "Não configurado"}
                        </p>
                      </div>
                      {currentConfig.updated_at && (
                        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.75} /> Atualizado em {formatDate(currentConfig.updated_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {isConfigured && (
                    <button
                      onClick={testConnection}
                      disabled={testing}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                        testResult === null
                          ? "bg-[#1E1E1E] border-white/[0.06] text-zinc-300 hover:text-white"
                          : testResult.ok
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                      } disabled:opacity-50`}
                    >
                      {testing
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando</>
                        : testResult === null
                          ? <><Wifi className="w-3.5 h-3.5" strokeWidth={1.75} /> Testar conexão</>
                          : testResult.ok
                            ? <><CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Conectado</>
                            : <><XCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Falhou</>}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`text-xs px-4 ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {testResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main form card */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6">
                  <form onSubmit={handleSave} className="space-y-6">

                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                      <div>
                        <h3 className="text-base font-medium text-white tracking-tight">
                          {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {tabs.find(t => t.id === activeTab)?.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-zinc-400">Integração ativa</span>
                        <Toggle on={currentConfig.ativo} onClick={toggleAtivo} />
                      </div>
                    </div>

                    {activeTab === "chatwoot" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>
                              <Globe className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                              URL host
                              {currentConfig.config.url && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                            </label>
                            <input
                              type="text"
                              value={currentConfig.config.url || ""}
                              onChange={e => updateField("url", e.target.value)}
                              className={inputClass}
                              placeholder="https://chat.seusite.com.br"
                            />
                          </div>
                          <div>
                            <label className={labelClass}>
                              <Hash className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                              Account ID
                              {currentConfig.config.account_id && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                            </label>
                            <input
                              type="text"
                              value={currentConfig.config.account_id || ""}
                              onChange={e => updateField("account_id", e.target.value)}
                              className={inputClass}
                              placeholder="Ex: 5"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>
                              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                              Private access token
                              {currentConfig.config.access_token && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                            </label>
                            <div className="relative">
                              <input
                                type={showTokens["chatwoot_token"] ? "text" : "password"}
                                value={currentConfig.config.access_token || ""}
                                onChange={e => updateField("access_token", e.target.value)}
                                className={`${inputClass} font-mono pr-10`}
                                placeholder="••••••••••••••••••••••"
                              />
                              <button type="button" onClick={() => toggleTokenVisibility("chatwoot_token")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1">
                                {showTokens["chatwoot_token"] ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                              </button>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>
                              <KeyRound className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                              Segredo do webhook
                              {currentConfig.config.webhook_secret && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                            </label>
                            <div className="relative">
                              <input
                                type={showTokens["chatwoot_webhook_secret"] ? "text" : "password"}
                                value={currentConfig.config.webhook_secret || ""}
                                onChange={e => updateField("webhook_secret", e.target.value)}
                                className={`${inputClass} font-mono pr-10`}
                                placeholder="Segredo gerado pelo Chatwoot"
                              />
                              <button type="button" onClick={() => toggleTokenVisibility("chatwoot_webhook_secret")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1">
                                {showTokens["chatwoot_webhook_secret"] ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1A1A1A] px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StatusDot state={chatwootAiActive ? "on" : "paused"} />
                            <div>
                              <p className="text-sm text-white tracking-tight">IA no Chatwoot</p>
                              <p className="text-xs text-zinc-500">
                                {chatwootAiActive ? "Respondendo automaticamente" : "Pausada — somente humano responde"}
                              </p>
                            </div>
                          </div>
                          <Toggle on={chatwootAiActive} onClick={toggleChatwootAI} disabled={togglingAi} />
                        </div>
                      </>
                    )}

                    {activeTab === "uazapi" && (
                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>
                            <Globe className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                            Endpoint API
                            {currentConfig.config.url && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                          </label>
                          <input
                            type="text"
                            value={currentConfig.config.url || ""}
                            onChange={e => updateField("url", e.target.value)}
                            className={inputClass}
                            placeholder="https://api.uazapi.com/v1"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                            Instance secure token
                            {currentConfig.config.token && currentConfig.id && <Check className="w-3 h-3 text-emerald-400 ml-auto" strokeWidth={2.5} />}
                          </label>
                          <div className="relative">
                            <input
                              type={showTokens["uzap_token"] ? "text" : "password"}
                              value={currentConfig.config.token || ""}
                              onChange={e => updateField("token", e.target.value)}
                              className={`${inputClass} font-mono pr-10`}
                              placeholder="Token UazAPI"
                            />
                            <button type="button" onClick={() => toggleTokenVisibility("uzap_token")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1">
                              {showTokens["uzap_token"] ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-white/[0.06] bg-[#1A1A1A] px-4 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#232323] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      </div>
                      <p className="text-xs text-zinc-500 leading-snug">
                        Tokens criptografados end-to-end e validados via circuit breaker em tempo real.
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
