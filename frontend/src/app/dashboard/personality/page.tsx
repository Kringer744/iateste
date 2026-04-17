"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Brain, Plus, Pencil, Trash2, Save, Loader2, CheckCircle2,
  Sparkles, Target, Cpu, Thermometer, Send, Bot, PlayCircle,
  Mic2, MessageSquare, Clock, TrendingUp, ShieldAlert, ListChecks,
  AlertCircle, AlertTriangle, Search, ChevronRight, Zap, X, RotateCcw, Copy, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiaKey = "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo";
type SectionKey = "identidade" | "engine" | "vendas" | "branding" | "contexto" | "seguranca" | "horarios" | "voz";
type TabKey = "config" | "playground";

interface PlaygroundMsg { role: string; content: string; timestamp: number; }
interface PlaygroundSession {
  id: string;
  personality_id: number | null;
  nome_ia: string;
  messages: PlaygroundMsg[];
  summary: string;
  created_at: number;
  updated_at: number;
}

interface Periodo { inicio: string; fim: string; }
interface HorarioAtendimento {
  tipo: "dia_todo" | "horario_especifico";
  dias: Record<DiaKey, Periodo[]>;
}
interface Personality {
  id: number;
  nome_ia: string; personalidade: string; instrucoes_base: string;
  tom_voz: string; model_name: string; temperature: number;
  max_tokens: number; ativo: boolean; usar_emoji: boolean;
  horario_atendimento_ia: HorarioAtendimento | null;
  menu_triagem: Record<string, unknown> | null;
  idioma: string; objetivos_venda: string; metas_comerciais: string;
  script_vendas: string; scripts_objecoes: string; frases_fechamento: string;
  diferenciais: string; posicionamento: string; publico_alvo: string;
  restricoes: string; linguagem_proibida: string; contexto_empresa: string;
  contexto_extra: string; abordagem_proativa: string; exemplos: string;
  palavras_proibidas: string; despedida_personalizada: string;
  regras_formatacao: string; regras_seguranca: string;
  emoji_tipo: string; emoji_cor: string;
  estilo_comunicacao: string; saudacao_personalizada: string; regras_atendimento: string;
  tts_ativo: boolean; tts_voz: string;
  oferecer_tour: boolean;
  estrategia_tour: string;
  tour_perguntar_primeira_visita: boolean;
  tour_mensagem_custom: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS_SEMANA: { key: DiaKey; label: string; short: string }[] = [
  { key: "segunda", label: "Segunda-feira", short: "Seg" },
  { key: "terca",   label: "Terça-feira",   short: "Ter" },
  { key: "quarta",  label: "Quarta-feira",  short: "Qua" },
  { key: "quinta",  label: "Quinta-feira",  short: "Qui" },
  { key: "sexta",   label: "Sexta-feira",   short: "Sex" },
  { key: "sabado",  label: "Sábado",        short: "Sáb" },
  { key: "domingo", label: "Domingo",       short: "Dom" },
];

const HORARIO_DEFAULT: HorarioAtendimento = {
  tipo: "horario_especifico",
  dias: {
    segunda: [{ inicio: "08:00", fim: "18:00" }],
    terca:   [{ inicio: "08:00", fim: "18:00" }],
    quarta:  [{ inicio: "08:00", fim: "18:00" }],
    quinta:  [{ inicio: "08:00", fim: "18:00" }],
    sexta:   [{ inicio: "08:00", fim: "18:00" }],
    sabado:  [], domingo: [],
  },
};

const EMPTY_FORM: Omit<Personality, "id"> = {
  nome_ia: "", personalidade: "", instrucoes_base: "",
  tom_voz: "Profissional", model_name: "openai/gpt-4o",
  temperature: 0.7, max_tokens: 1000, ativo: false, usar_emoji: true,
  horario_atendimento_ia: null, menu_triagem: null,
  idioma: "Português do Brasil", objetivos_venda: "", metas_comerciais: "",
  script_vendas: "", scripts_objecoes: "", frases_fechamento: "",
  diferenciais: "", posicionamento: "", publico_alvo: "",
  restricoes: "", linguagem_proibida: "", contexto_empresa: "",
  contexto_extra: "", abordagem_proativa: "", exemplos: "",
  palavras_proibidas: "", despedida_personalizada: "",
  regras_formatacao: "", regras_seguranca: "",
  emoji_tipo: "✨,💪,🔥", emoji_cor: "#FFFFFF",
  estilo_comunicacao: "", saudacao_personalizada: "", regras_atendimento: "",
  tts_ativo: true, tts_voz: "Kore",
  oferecer_tour: true,
  estrategia_tour: "smart",
  tour_perguntar_primeira_visita: true,
  tour_mensagem_custom: "",
};

const MODELS = [
  { id: "openai/gpt-4o",               label: "GPT-4o",           sub: "Elite Performance",  badge: "⭐" },
  { id: "openai/gpt-4.1-mini",         label: "GPT-4.1 Mini",     sub: "Fast & Efficient",   badge: "⚡" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", sub: "Fast & Multi",       badge: "🔥" },
  { id: "google/gemini-2.5-flash",     label: "Gemini 2.5 Flash", sub: "Latest & Fast",      badge: "🚀" },
  { id: "google/gemini-2.5-pro",       label: "Gemini 2.5 Pro",   sub: "Most Capable",       badge: "💎" },
];

const TONES = [
  { id: "Profissional", icon: "👔", desc: "Formal e objetivo" },
  { id: "Amigável",     icon: "😊", desc: "Caloroso e próximo" },
  { id: "Entusiasta",   icon: "🚀", desc: "Animado e enérgico" },
];

// Emojis organizados por categoria — lista ampla para seleção múltipla rotativa
const EMOJI_CATEGORIES = [
  { label: "Fitness",   emojis: ["🏋️","💪","⚡","🔥","🎯","🏃","🧘","🤸","🏊","🚴","⛹️","🥊","🏆","🎽","🧗","🏄","🤾","🏇","🥋","🏂"] },
  { label: "Energia",   emojis: ["✨","💥","🌟","⭐","🌈","☀️","💫","🎆","🎇","🔆","🌤️","❄️","🌺","🌻","🌊","🎐","🎑","🎋","🍀","🌙"] },
  { label: "Sucesso",   emojis: ["✅","💯","🎉","🥳","👑","💎","🥇","🏅","🎊","🔝","🎁","💝","🎀","🔑","🏵️","🎖️","🎗️","🏴","🎫","🎟️"] },
  { label: "Negócios",  emojis: ["💼","📈","💰","🤝","📅","✉️","📱","🏢","💡","📊","🔍","💳","🖥️","📌","📋","🗂️","📁","🗓️","🖨️","🔒"] },
  { label: "Amigáveis", emojis: ["😊","😍","🥰","😎","🤩","😇","🙌","👋","❤️","💙","💚","💛","🧡","💜","🤍","🫶","👏","🤗","😄","🥹"] },
  { label: "Natureza",  emojis: ["🌿","🍃","🌱","🌲","🌳","🦋","🐬","🦁","🐯","🦊","🦅","🌺","🌸","🌼","🌻","🍁","🌾","🍄","🌵","🪴"] },
];

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "identidade", label: "Identidade",  icon: <Brain className="w-4 h-4" />,      desc: "Nome e instruções" },
  { key: "engine",     label: "Engine",      icon: <Cpu className="w-4 h-4" />,        desc: "Modelo e parâmetros" },
  { key: "vendas",     label: "Vendas",      icon: <TrendingUp className="w-4 h-4" />, desc: "Scripts e metas" },
  { key: "branding",   label: "Branding",    icon: <Sparkles className="w-4 h-4" />,   desc: "Visual e posicionamento" },
  { key: "contexto",   label: "Contexto",    icon: <ListChecks className="w-4 h-4" />, desc: "Regras e exemplos" },
  { key: "seguranca",  label: "Segurança",   icon: <ShieldAlert className="w-4 h-4" />,desc: "Restrições" },
  { key: "horarios",   label: "Horários",    icon: <Clock className="w-4 h-4" />,      desc: "Atendimento" },
  { key: "voz",        label: "Voz IA",      icon: <Mic2 className="w-4 h-4" />,       desc: "Áudio & TTS" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalityPage() {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | "new" | null>(null);
  const [formData, setFormData] = useState<Omit<Personality, "id"> & { id?: number }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("config");
  const [activeSection, setActiveSection] = useState<SectionKey>("identidade");
  const [emojiCatIdx, setEmojiCatIdx] = useState(0);
  const [search, setSearch] = useState("");
  // ── TTS / Voz state ──
  const [ttsVoices, setTtsVoices] = useState<{nome:string;genero:string;descricao:string;tag:string}[]>([]);
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState<string | null>(null);
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null);
  const [ttsPreviewError, setTtsPreviewError] = useState<string | null>(null);
  const [ttsGenderFilter, setTtsGenderFilter] = useState<"todas"|"feminina"|"masculina">("todas");
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  // ── Playground state ──
  const [pgSessions, setPgSessions] = useState<PlaygroundSession[]>([]);
  const [pgActiveId, setPgActiveId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [playModel, setPlayModel] = useState<string>("");
  const [streamingText, setStreamingText] = useState("");
  const [pgShowSessions, setPgShowSessions] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const PG_STORAGE_KEY = "pg_sessions_v2";
  const PG_MAX_SESSIONS = 20;

  // ── Load TTS voices ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get("/api-backend/management/tts/voices", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setTtsVoices(res.data.voices || []))
      .catch(() => {/* vozes indisponíveis */});
  }, []);

  const ttsPlayPreview = async (vozNome: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Para áudio anterior se estiver tocando
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setTtsPreviewLoading(vozNome);
    setTtsPreviewUrl(null);
    setTtsPreviewError(null);
    try {
      const res = await axios.post("/api-backend/management/tts/preview",
        { voz: vozNome },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const url = res.data.url;
      if (url) {
        setTtsPreviewUrl(url);
        const audio = new Audio(url);
        ttsAudioRef.current = audio;
        audio.play().catch(() => {});
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 503) {
        setTtsPreviewError("Limite de previews atingido. Tente novamente em alguns minutos.");
      } else {
        setTtsPreviewError(detail || "Erro ao gerar preview de voz.");
      }
      setTimeout(() => setTtsPreviewError(null), 5000);
    } finally {
      setTtsPreviewLoading(null);
    }
  };

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PG_STORAGE_KEY);
      if (raw) {
        const parsed: PlaygroundSession[] = JSON.parse(raw);
        setPgSessions(parsed);
        if (parsed.length > 0) setPgActiveId(parsed[0].id);
      }
    } catch { /* corrupted data — start fresh */ }
  }, []);

  // Save sessions to localStorage on change
  useEffect(() => {
    if (pgSessions.length > 0) {
      localStorage.setItem(PG_STORAGE_KEY, JSON.stringify(pgSessions.slice(0, PG_MAX_SESSIONS)));
    }
  }, [pgSessions]);

  const pgActiveSession = useMemo(() =>
    pgSessions.find(s => s.id === pgActiveId) || null,
  [pgSessions, pgActiveId]);

  const playHistory = pgActiveSession?.messages || [];

  const pgCreateSession = useCallback((personalityId: number | null, nomeIa: string, saudacao?: string) => {
    const id = `pg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const greeting: PlaygroundMsg[] = saudacao?.trim()
      ? [{ role: "bot", content: saudacao, timestamp: Date.now() }]
      : [];
    const session: PlaygroundSession = {
      id,
      personality_id: personalityId,
      nome_ia: nomeIa || "Assistente",
      messages: greeting,
      summary: "",
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setPgSessions(prev => [session, ...prev].slice(0, PG_MAX_SESSIONS));
    setPgActiveId(id);
    return id;
  }, []);

  const pgUpdateMessages = useCallback((sessionId: string, msgs: PlaygroundMsg[], summary?: string) => {
    setPgSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, messages: msgs, updated_at: Date.now(), ...(summary !== undefined ? { summary } : {}) }
        : s
    ));
  }, []);

  const pgDeleteSession = useCallback((sessionId: string) => {
    setPgSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId);
      if (pgActiveId === sessionId) {
        setPgActiveId(next.length > 0 ? next[0].id : null);
      }
      if (next.length === 0) localStorage.removeItem(PG_STORAGE_KEY);
      return next;
    });
  }, [pgActiveId]);

  const getConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  // Helpers para emoji_tipo como lista separada por vírgula
  const getEmojiList = (s: string) => s ? s.split(",").map(e => e.trim()).filter(Boolean) : [];
  const toggleEmoji = (e: string) => {
    const list = getEmojiList(fd.emoji_tipo);
    const next = list.includes(e) ? list.filter(x => x !== e) : list.length < 6 ? [...list, e] : list;
    setFormData({ ...formData, emoji_tipo: next.join(",") });
  };

  const fetchPersonalities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api-backend/management/personalities", getConfig());
      setPersonalities(res.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPersonalities(); }, [fetchPersonalities]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [playHistory, streamingText]);

  const selectPersonality = (p: Personality) => {
    setSelected(p.id);
    setActiveTab("config");
    setActiveSection("identidade");
    setSaveError(null);
    setSuccess(false);
    setFormData({
      id: p.id,
      nome_ia: p.nome_ia || "",
      personalidade: p.personalidade || "",
      instrucoes_base: p.instrucoes_base || "",
      tom_voz: p.tom_voz || "Profissional",
      model_name: p.model_name || "openai/gpt-4o",
      temperature: p.temperature ?? 0.7,
      max_tokens: p.max_tokens ?? 1000,
      ativo: p.ativo ?? false,
      usar_emoji: p.usar_emoji ?? true,
      horario_atendimento_ia: p.horario_atendimento_ia ?? null,
      menu_triagem: p.menu_triagem ?? null,
      idioma: p.idioma || "Português do Brasil",
      objetivos_venda: p.objetivos_venda || "",
      metas_comerciais: p.metas_comerciais || "",
      script_vendas: p.script_vendas || "",
      scripts_objecoes: p.scripts_objecoes || "",
      frases_fechamento: p.frases_fechamento || "",
      diferenciais: p.diferenciais || "",
      posicionamento: p.posicionamento || "",
      publico_alvo: p.publico_alvo || "",
      restricoes: p.restricoes || "",
      linguagem_proibida: p.linguagem_proibida || "",
      contexto_empresa: p.contexto_empresa || "",
      contexto_extra: p.contexto_extra || "",
      abordagem_proativa: p.abordagem_proativa || "",
      exemplos: p.exemplos || "",
      palavras_proibidas: p.palavras_proibidas || "",
      despedida_personalizada: p.despedida_personalizada || "",
      regras_formatacao: p.regras_formatacao || "",
      regras_seguranca: p.regras_seguranca || "",
      emoji_tipo: p.emoji_tipo || "✨",
      emoji_cor: p.emoji_cor || "#FFFFFF",
      estilo_comunicacao: p.estilo_comunicacao || "",
      saudacao_personalizada: p.saudacao_personalizada || "",
      regras_atendimento: p.regras_atendimento || "",
      tts_ativo: p.tts_ativo ?? true,
      tts_voz: p.tts_voz || "Kore",
      oferecer_tour: p.oferecer_tour ?? true,
      estrategia_tour: p.estrategia_tour || (p.oferecer_tour === false ? "off" : "smart"),
      tour_perguntar_primeira_visita: p.tour_perguntar_primeira_visita ?? true,
      tour_mensagem_custom: p.tour_mensagem_custom || "",
    });
  };

  const startNew = () => {
    setSelected("new");
    setActiveTab("config");
    setActiveSection("identidade");
    setSaveError(null);
    setSuccess(false);
    setFormData(EMPTY_FORM);
  };

  const doSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { id, ...payload } = formData as any;
      if (selected !== "new" && id) {
        await axios.put(`/api-backend/management/personalities/${id}`, payload, getConfig());
      } else {
        const res = await axios.post("/api-backend/management/personalities", payload, getConfig());
        setFormData(prev => ({ ...prev, id: res.data.id }));
        setSelected(res.data.id);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      fetchPersonalities();
    } catch (e) {
      let msg = "Erro ao salvar personalidade.";
      if (axios.isAxiosError(e)) {
        const detail = e.response?.data?.detail;
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail)) msg = detail.map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
          return field ? `[${field}] ${d.msg}` : (d.msg || d);
        }).join(" | ");
        else msg = e.response?.data?.message || `Erro ${e.response?.status || "de conexão"}.`;
      }
      setSaveError(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta personalidade?")) return;
    try {
      await axios.delete(`/api-backend/management/personalities/${id}`, getConfig());
      if (selected === id) { setSelected(null); }
      fetchPersonalities();
    } catch { alert("Erro ao excluir."); }
  };

  // Auto-create session when switching to playground tab
  useEffect(() => {
    if (activeTab === "playground" && typeof selected === "number" && !pgActiveSession) {
      const p = personalities.find(x => x.id === selected);
      pgCreateSession(selected, p?.nome_ia || "Assistente", p?.saudacao_personalizada);
    }
  }, [activeTab, selected, pgActiveSession, personalities, pgCreateSession]);

  // Auto-create new session when switching personality while on playground
  useEffect(() => {
    if (activeTab === "playground" && typeof selected === "number" && pgActiveSession && pgActiveSession.personality_id !== selected) {
      const p = personalities.find(x => x.id === selected);
      pgCreateSession(selected, p?.nome_ia || "Assistente", p?.saudacao_personalizada);
    }
  }, [selected, activeTab, pgActiveSession, personalities, pgCreateSession]);

  const runSummarize = useCallback(async (sessionId: string, messages: PlaygroundMsg[]) => {
    try {
      const session = pgSessions.find(s => s.id === sessionId);
      const res = await axios.post("/api-backend/management/personalities/playground/summarize", {
        personality_id: session?.personality_id || (typeof selected === "number" ? selected : undefined),
        messages: messages.map(m => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content })),
      }, getConfig());
      if (res.data.summary) {
        pgUpdateMessages(sessionId, messages, res.data.summary);
      }
    } catch { /* summarize is best-effort */ }
  }, [pgSessions, selected, pgUpdateMessages]);

  const runTest = async () => {
    if (!testMessage.trim() || testLoading) return;
    if (selected === "new") {
      setTestMessage("");
      return;
    }

    // Ensure session exists
    let sessionId = pgActiveId;
    if (!sessionId || !pgActiveSession) {
      const p = personalities.find(x => x.id === selected);
      sessionId = pgCreateSession(
        typeof selected === "number" ? selected : null,
        p?.nome_ia || "Assistente",
        p?.saudacao_personalizada
      );
    }

    setTestLoading(true);
    setStreamingText("");
    const userMsg: PlaygroundMsg = { role: "user", content: testMessage, timestamp: Date.now() };
    const currentMessages = [...playHistory, userMsg];
    pgUpdateMessages(sessionId!, currentMessages);
    setTestMessage("");

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const token = localStorage.getItem("token");
      const session = pgSessions.find(s => s.id === sessionId) || pgActiveSession;
      const response = await fetch("/api-backend/management/personalities/playground/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          personality_id: typeof selected === "number" ? selected : undefined,
          messages: currentMessages.map(m => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content })),
          conversation_summary: session?.summary || "",
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao conectar." }));
        const botMsg: PlaygroundMsg = { role: "bot", content: `⚠️ ${err.detail || "Erro"}`, timestamp: Date.now() };
        pgUpdateMessages(sessionId!, [...currentMessages, botMsg]);
        setTestLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const payload = JSON.parse(jsonStr);
            if (payload.error) {
              accumulated += `\n⚠️ ${payload.error}`;
              setStreamingText(accumulated);
            } else if (payload.done) {
              if (payload.model) setPlayModel(payload.model);
            } else if (payload.token) {
              accumulated += payload.token;
              setStreamingText(accumulated);
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      // Save final bot message to session
      const botMsg: PlaygroundMsg = { role: "bot", content: accumulated || "...", timestamp: Date.now() };
      const finalMessages = [...currentMessages, botMsg];
      pgUpdateMessages(sessionId!, finalMessages);
      setStreamingText("");

      // Trigger summarization every 10 messages (5 user + 5 bot)
      const msgCount = finalMessages.filter(m => m.role === "user").length;
      if (msgCount > 0 && msgCount % 5 === 0) {
        runSummarize(sessionId!, finalMessages);
      }
    } catch (err) {
      // Fallback to non-streaming endpoint
      try {
        const res = await axios.post("/api-backend/management/personalities/playground", {
          personality_id: typeof selected === "number" ? selected : undefined,
          messages: currentMessages.map(m => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content })),
          conversation_summary: pgActiveSession?.summary || "",
        }, getConfig());
        const botMsg: PlaygroundMsg = { role: "bot", content: res.data.reply, timestamp: Date.now() };
        pgUpdateMessages(sessionId!, [...currentMessages, botMsg]);
        if (res.data.model) setPlayModel(res.data.model);
      } catch (fallbackErr) {
        let detail = "Erro ao conectar com a IA.";
        if (axios.isAxiosError(fallbackErr)) detail = fallbackErr.response?.data?.detail || detail;
        const botMsg: PlaygroundMsg = { role: "bot", content: `⚠️ ${detail}`, timestamp: Date.now() };
        pgUpdateMessages(sessionId!, [...currentMessages, botMsg]);
      }
      setStreamingText("");
    } finally {
      setTestLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatWhatsApp = (text: string) => {
    // Sanitize then convert WhatsApp-style formatting to simple HTML
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br />");
  };

  const copyConversation = () => {
    if (!pgActiveSession) return;
    const text = pgActiveSession.messages
      .map(m => `${m.role === "user" ? "Eu" : pgActiveSession.nome_ia}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  // Filtered list
  const filteredList = personalities.filter(p =>
    p.nome_ia.toLowerCase().includes(search.toLowerCase())
  );

  // Section fill indicators
  const fd = formData as any;
  const filled: Record<SectionKey, boolean> = {
    identidade: !!(fd.nome_ia),
    engine:     !!(fd.model_name),
    vendas:     !!(fd.objetivos_venda || fd.script_vendas),
    branding:   !!(fd.diferenciais || fd.posicionamento),
    contexto:   !!(fd.contexto_empresa || fd.exemplos),
    seguranca:  !!(fd.restricoes || fd.palavras_proibidas),
    horarios:   !!(fd.horario_atendimento_ia),
    voz:        !!(fd.tts_voz),
  };

  const iClass = "w-full bg-transparent border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/15 transition-colors leading-relaxed";
  const taClass = `${iClass} resize-none leading-6`;
  const lClass = "block text-xs text-zinc-400 mb-2";
  const card = "bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4";

  const currentPersonality = personalities.find(p => p.id === selected);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex overflow-hidden" style={{ height: "100vh" }}>
      <DashboardSidebar activePage="personality" />

      {/* ── MAIN LAYOUT (single column, top bar + editor) ───────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ TOP BAR — Personalities switcher ═══════════════════════ */}
        <div className="flex-shrink-0 bg-[#0A0A0A]">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-3">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Personalidades IA</h1>
              <p className="text-sm text-zinc-500 tracking-tight mt-1">
                <span className="text-zinc-300 tabular-nums">{personalities.length}</span> personalidade{personalities.length === 1 ? "" : "s"} configurada{personalities.length === 1 ? "" : "s"} · escolha ou crie uma para editar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="w-56 bg-[#141414] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors tracking-tight"
                />
              </div>
              <button
                onClick={startNew}
                className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-sm font-medium tracking-tight transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Nova personalidade
              </button>
            </div>
          </div>

          {/* Horizontal chip rail */}
          <div className="px-6 pb-0">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} /> Carregando personalidades…
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                <Brain className="w-3.5 h-3.5" strokeWidth={1.75} /> Nenhuma personalidade{search ? " encontrada" : " criada"} ainda
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mb-1">
                <AnimatePresence mode="popLayout">
                  {filteredList.map((p, i) => {
                    const isActive = selected === p.id;
                    return (
                      <motion.button
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.18 }}
                        onClick={() => selectPersonality(p)}
                        className={`group flex-shrink-0 flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-xl border transition-colors ${
                          isActive
                            ? "bg-[#1A1A1A] border-white/[0.12]"
                            : "bg-[#141414] border-white/[0.06] hover:border-white/[0.1] hover:bg-[#1A1A1A]"
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm bg-[#0F0F0F] border border-white/[0.06]">
                          {getEmojiList(p.emoji_tipo)[0] || "✨"}
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-xs font-medium text-white tracking-tight whitespace-nowrap">
                            {p.nome_ia || "Sem nome"}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-500 tracking-tight">
                            <span className={`w-1 h-1 rounded-full ${p.ativo ? "bg-emerald-400" : "bg-zinc-600"}`} />
                            <span className="whitespace-nowrap">{MODELS.find(m => m.id === p.model_name)?.label || p.model_name}</span>
                          </span>
                        </span>
                        <span
                          onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                          className="ml-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] text-zinc-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ══ EDITOR PANEL (full width) ═══════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {selected === null ? (
              /* Empty State */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-5 px-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
                  <Brain className="w-6 h-6 text-zinc-500" strokeWidth={1.5} />
                </div>
                <div className="text-center max-w-sm">
                  <h2 className="text-[17px] font-medium text-white tracking-tight mb-1.5">
                    Nenhuma personalidade selecionada
                  </h2>
                  <p className="text-sm text-zinc-500 tracking-tight leading-relaxed">
                    Selecione uma personalidade na lista ou crie uma nova para começar.
                  </p>
                </div>
                <button
                  onClick={startNew}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-black px-5 py-2.5 rounded-xl font-medium text-sm tracking-tight transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.75} /> Nova personalidade
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* ── Editor Top Bar ───────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0A0A0A] mt-3">
                  <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border border-white/[0.06] flex-shrink-0 overflow-hidden bg-[#1A1A1A]"
                      >
                        {getEmojiList(fd.emoji_tipo)[0] || "✨"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-medium text-white tracking-tight">
                            {fd.nome_ia || (selected === "new" ? "Nova Personalidade" : "Editar")}
                          </h2>
                          {selected !== "new" && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-[#1A1A1A] border border-white/[0.06]">
                              <span className={`w-1.5 h-1.5 rounded-full ${fd.ativo ? "bg-emerald-400" : "bg-zinc-600"}`} />
                              {fd.ativo ? "Ativa" : "Pausada"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {selected === "new" ? "Configure a nova personalidade" : `ID #${selected} · ${MODELS.find(m => m.id === fd.model_name)?.label || fd.model_name}`}
                        </p>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2">
                      <div className="flex bg-[#141414] rounded-xl p-1 border border-white/[0.06]">
                        {(["config", "playground"] as TabKey[]).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              activeTab === tab
                                ? "bg-[#1E1E1E] text-white"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {tab === "config" ? <><Sparkles className="w-3 h-3" strokeWidth={1.75} /> Configuração</> : <><PlayCircle className="w-3 h-3" strokeWidth={1.75} /> Playground</>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Editor Body ──────────────────────────────────── */}
                {activeTab === "config" ? (
                  <div className="flex flex-1 overflow-hidden">

                    {/* Section Nav */}
                    <div className="w-52 flex-shrink-0 border-r border-white/[0.06] bg-[#0A0A0A] py-3 px-2 overflow-y-auto">
                      {SECTIONS.map(sec => {
                        const isActive = activeSection === sec.key;
                        return (
                          <button
                            key={sec.key}
                            onClick={() => setActiveSection(sec.key)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors mb-0.5 border ${
                              isActive
                                ? "bg-[#1E1E1E] text-white border-white/[0.06]"
                                : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border-transparent"
                            }`}
                          >
                            <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`}>
                              {sec.icon}
                            </span>
                            <span className="text-sm tracking-tight flex-1 truncate">{sec.label}</span>
                            {filled[sec.key] && !isActive && (
                              <Check className="w-3 h-3 text-emerald-400/70 flex-shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeSection}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="p-6 max-w-3xl space-y-5"
                        >

                          {/* ─ IDENTIDADE ─ */}
                          {activeSection === "identidade" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <Brain className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Identidade da IA</h3>
                            </div>

                            <div className={card}>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1"><Mic2 className="w-3 h-3 text-[#FFFFFF]/50" />Nome da IA *</span></label>
                                <input required type="text" value={fd.nome_ia}
                                  onChange={e => setFormData({ ...formData, nome_ia: e.target.value })}
                                  className={`${iClass} text-base font-semibold`} placeholder="Ex: Clara, Atlas, Nova..."
                                />
                              </div>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1"><Target className="w-3 h-3 text-[#FFFFFF]/50" />Objetivo Estratégico</span></label>
                                <textarea rows={5} value={fd.personalidade}
                                  onChange={e => setFormData({ ...formData, personalidade: e.target.value })}
                                  className={taClass} placeholder="Defina o propósito desta IA. Ex: Atender clientes, qualificar leads, agendar consultas..."
                                />
                              </div>
                            </div>

                            <div className={card}>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-[#FFFFFF]/50" />Instruções Base — System Prompt</span></label>
                                <p className="text-[11px] text-slate-500 mb-3">Este é o prompt principal que define o comportamento completo da IA. Seja detalhado.</p>
                                <textarea rows={18} value={fd.instrucoes_base}
                                  onChange={e => setFormData({ ...formData, instrucoes_base: e.target.value })}
                                  className={`${taClass} font-mono text-sm text-slate-200`}
                                  placeholder="Você é [nome], assistente da [empresa]...&#10;&#10;Seu objetivo é...&#10;&#10;Regras de comportamento:&#10;- ..."
                                />
                              </div>
                            </div>

                            <div className={card}>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1">💬 Estilo de Comunicação</span></label>
                                <p className="text-[11px] text-slate-500 mb-3">Como a IA deve se comunicar. Ex: usa linguagem jovem, é formal, faz perguntas para engajar, etc.</p>
                                <textarea rows={4} value={fd.estilo_comunicacao}
                                  onChange={e => setFormData({ ...formData, estilo_comunicacao: e.target.value })}
                                  className={taClass}
                                  placeholder="Ex: Use linguagem jovem e descontraída. Faça perguntas para engajar. Seja direto e objetivo."
                                />
                              </div>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1">👋 Saudação Padrão</span></label>
                                <p className="text-[11px] text-slate-500 mb-3">Mensagem de abertura quando o cliente iniciar uma conversa. Deixe vazio para a IA gerar automaticamente.</p>
                                <textarea rows={3} value={fd.saudacao_personalizada}
                                  onChange={e => setFormData({ ...formData, saudacao_personalizada: e.target.value })}
                                  className={taClass}
                                  placeholder={`Ex: Olá! Sou ${fd.nome_ia || "a IA"}, como posso te ajudar hoje? 😊`}
                                />
                              </div>
                              <div>
                                <label className={lClass}><span className="flex items-center gap-1">📋 Regras de Atendimento</span></label>
                                <p className="text-[11px] text-slate-500 mb-3">Regras específicas do atendimento. Ex: sempre ofereça visita, nunca mencione concorrentes, etc.</p>
                                <textarea rows={5} value={fd.regras_atendimento}
                                  onChange={e => setFormData({ ...formData, regras_atendimento: e.target.value })}
                                  className={taClass}
                                  placeholder="Ex: Sempre ofereça uma aula experimental gratuita. Nunca mencione concorrentes. Priorize agendamentos."
                                />
                              </div>
                            </div>
                          </>)}

                          {/* ─ ENGINE ─ */}
                          {activeSection === "engine" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <Cpu className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Motor & Comportamento</h3>
                            </div>

                            <div className={card}>
                              <label className={lClass}>Modelo de IA</label>
                              <div className="grid grid-cols-1 gap-2">
                                {MODELS.map(m => (
                                  <button key={m.id} type="button" onClick={() => setFormData({ ...formData, model_name: m.id })}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                                      fd.model_name === m.id
                                        ? "bg-[#FFFFFF]/10 border-[#FFFFFF]/40 text-[#FFFFFF]"
                                        : "bg-black/20 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                                    }`}
                                  >
                                    <span className="text-lg">{m.badge}</span>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">{m.label}</p>
                                      <p className="text-[10px] opacity-60">{m.sub}</p>
                                    </div>
                                    {fd.model_name === m.id && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className={card}>
                              <label className={lClass}>Tom de Voz</label>
                              <div className="grid grid-cols-3 gap-2">
                                {TONES.map(t => (
                                  <button key={t.id} type="button" onClick={() => setFormData({ ...formData, tom_voz: t.id })}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                                      fd.tom_voz === t.id
                                        ? "bg-[#FFFFFF]/10 border-[#FFFFFF]/40 text-[#FFFFFF]"
                                        : "bg-black/20 border-white/5 text-slate-400 hover:border-white/10"
                                    }`}
                                  >
                                    <span className="text-xl">{t.icon}</span>
                                    <p className="text-[10px] font-medium">{t.id}</p>
                                    <p className="text-[9px] opacity-60">{t.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className={card}>
                              <div className="space-y-5">
                                <div>
                                  <div className="flex justify-between mb-2">
                                    <label className={`${lClass} mb-0`}><span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-[#FFFFFF]/40" />Temperatura</span></label>
                                    <span className="text-xs font-medium text-[#FFFFFF] bg-[#FFFFFF]/10 px-2 py-0.5 rounded-lg">{fd.temperature}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 mb-2">Baixo = preciso · Alto = criativo</p>
                                  <input type="range" min="0" max="1" step="0.1" value={fd.temperature}
                                    onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                    className="w-full accent-[#FFFFFF] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between mb-2">
                                    <label className={`${lClass} mb-0`}>Max Tokens</label>
                                    <span className="text-xs font-medium text-[#FFFFFF] bg-[#FFFFFF]/10 px-2 py-0.5 rounded-lg">{fd.max_tokens}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 mb-2">Limite de tokens por resposta</p>
                                  <input type="range" min="100" max="4000" step="100" value={fd.max_tokens}
                                    onChange={e => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                                    className="w-full accent-[#FFFFFF] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: "ativo", label: "Atendimento Ativo", desc: "IA responde clientes", color: "bg-emerald-500" },
                                { key: "usar_emoji", label: "Usar Emojis", desc: "Mensagens com emojis", color: "bg-[#FFFFFF]" },
                              ].map(({ key, label, desc, color }) => (
                                <div key={key} className={`${card} !py-4 !space-y-0 flex items-center justify-between`}>
                                  <div>
                                    <p className="text-xs font-medium text-white">{label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                                  </div>
                                  <button type="button" onClick={() => setFormData({ ...formData, [key]: !(fd[key] as boolean) })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all flex-shrink-0 ${fd[key] ? color : "bg-slate-700"}`}
                                  >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow ${fd[key] ? "translate-x-6" : "translate-x-1"}`} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>)}

                          {/* ─ VENDAS ─ */}
                          {activeSection === "vendas" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <TrendingUp className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Estratégia de Vendas & Conversão</h3>
                            </div>

                            <div className={card}>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={lClass}>Idioma</label>
                                  <input type="text" value={fd.idioma} onChange={e => setFormData({...formData, idioma: e.target.value})} className={iClass} placeholder="Português do Brasil" />
                                </div>
                                <div>
                                  <label className={lClass}>Metas Comerciais</label>
                                  <input type="text" value={fd.metas_comerciais} onChange={e => setFormData({...formData, metas_comerciais: e.target.value})} className={iClass} placeholder="Agendamentos, vendas..." />
                                </div>
                              </div>
                              <div>
                                <label className={lClass}>Objetivos de Venda</label>
                                <textarea rows={4} value={fd.objetivos_venda} onChange={e => setFormData({...formData, objetivos_venda: e.target.value})} className={taClass} placeholder="Qual o foco principal da venda?" />
                              </div>
                            </div>

                            <div className={card}>
                              <div>
                                <label className={lClass}>Script de Vendas Principal</label>
                                <textarea rows={8} value={fd.script_vendas} onChange={e => setFormData({...formData, script_vendas: e.target.value})} className={taClass} placeholder="Passo a passo da abordagem comercial..." />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={lClass}>Scripts de Objeções</label>
                                  <textarea rows={6} value={fd.scripts_objecoes} onChange={e => setFormData({...formData, scripts_objecoes: e.target.value})} className={taClass} placeholder="Como contornar 'está caro'..." />
                                </div>
                                <div>
                                  <label className={lClass}>Frases de Fechamento</label>
                                  <textarea rows={6} value={fd.frases_fechamento} onChange={e => setFormData({...formData, frases_fechamento: e.target.value})} className={taClass} placeholder="CTAs poderosas..." />
                                </div>
                              </div>
                              <div>
                                <label className={lClass}>Abordagem Proativa</label>
                                <textarea rows={4} value={fd.abordagem_proativa} onChange={e => setFormData({...formData, abordagem_proativa: e.target.value})} className={taClass} placeholder="Ex: Sempre ofereça aula experimental se demonstrar interesse..." />
                              </div>
                            </div>

                            {/* Tour Virtual — Estratégia Inteligente */}
                            <div className={`${card} !py-4 border border-[#FFFFFF]/20 bg-gradient-to-r from-[#FFFFFF]/5 to-transparent`}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF]/10 flex items-center justify-center">
                                  <PlayCircle className="w-4 h-4 text-[#FFFFFF]" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-white">Estrategia Tour Virtual</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Como a IA deve oferecer o tour virtual para leads
                                  </p>
                                </div>
                              </div>

                              {/* Strategy selector - 4 options as pills */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                {[
                                  { value: "off",      label: "Desligado", desc: "Nao oferece tour" },
                                  { value: "reativo",  label: "Reativo",   desc: "So se pedir" },
                                  { value: "proativo", label: "Proativo",  desc: "IA oferece" },
                                  { value: "smart",    label: "Inteligente", desc: "Pergunta 1a vez" },
                                ].map(opt => (
                                  <button key={opt.value} type="button"
                                    onClick={() => setFormData({...formData, estrategia_tour: opt.value})}
                                    className={`p-2 rounded-lg border text-center transition-all ${
                                      fd.estrategia_tour === opt.value
                                        ? "border-[#FFFFFF] bg-[#FFFFFF]/10 text-white"
                                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                                    }`}
                                  >
                                    <p className="text-[10px] font-bold">{opt.label}</p>
                                    <p className="text-[8px] text-slate-500 mt-0.5">{opt.desc}</p>
                                  </button>
                                ))}
                              </div>

                              {/* Toggle: ask first visit (only in smart mode) */}
                              {fd.estrategia_tour === "smart" && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-300">Perguntar se e primeira visita</p>
                                    <p className="text-[9px] text-slate-500">IA pergunta antes de enviar o tour</p>
                                  </div>
                                  <button type="button"
                                    onClick={() => setFormData({...formData, tour_perguntar_primeira_visita: !fd.tour_perguntar_primeira_visita})}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all flex-shrink-0 ${
                                      fd.tour_perguntar_primeira_visita ? "bg-[#FFFFFF]" : "bg-slate-700"
                                    }`}
                                  >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow ${
                                      fd.tour_perguntar_primeira_visita ? "translate-x-6" : "translate-x-1"
                                    }`} />
                                  </button>
                                </div>
                              )}

                              {/* Custom message (shown for all modes except off) */}
                              {fd.estrategia_tour !== "off" && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                  <label className={lClass}>Mensagem customizada (opcional)</label>
                                  <textarea rows={2}
                                    value={fd.tour_mensagem_custom}
                                    onChange={e => setFormData({...formData, tour_mensagem_custom: e.target.value})}
                                    className={taClass}
                                    placeholder="Ex: Quer dar uma espiadinha na nossa estrutura? Tenho um video mostrando tudo!"
                                  />
                                </div>
                              )}

                              {/* Strategy description */}
                              <div className="mt-3 p-2 rounded bg-slate-800/50">
                                <p className="text-[9px] text-slate-500 leading-relaxed">
                                  {fd.estrategia_tour === "off" && "O tour virtual nao sera oferecido pela IA."}
                                  {fd.estrategia_tour === "reativo" && "A IA so envia o tour se o cliente pedir explicitamente (ex: 'quero ver a academia')."}
                                  {fd.estrategia_tour === "proativo" && "A IA oferece o tour ativamente para leads que demonstram interesse na unidade."}
                                  {fd.estrategia_tour === "smart" && "A IA pergunta se e a primeira vez do cliente na unidade. Se for, envia o tour automaticamente."}
                                  {" "}Funciona apenas para leads e unidades com tour cadastrado.
                                </p>
                              </div>
                            </div>
                          </>)}

                          {/* ─ BRANDING ─ */}
                          {activeSection === "branding" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <Sparkles className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Branding & Identidade Visual</h3>
                            </div>

                            <div className={card}>
                              <div>
                                <label className={lClass}>Diferenciais da Empresa</label>
                                <textarea rows={5} value={fd.diferenciais} onChange={e => setFormData({...formData, diferenciais: e.target.value})} className={taClass} placeholder="Piscina aquecida, professores especializados..." />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={lClass}>Posicionamento</label>
                                  <input type="text" value={fd.posicionamento} onChange={e => setFormData({...formData, posicionamento: e.target.value})} className={iClass} placeholder="Boutique premium..." />
                                </div>
                                <div>
                                  <label className={lClass}>Público-Alvo</label>
                                  <input type="text" value={fd.publico_alvo} onChange={e => setFormData({...formData, publico_alvo: e.target.value})} className={iClass} placeholder="Mulheres 20-40 anos..." />
                                </div>
                              </div>
                            </div>

                            <div className={card}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-medium text-[#FFFFFF] tracking-tight">Emojis Rotativos da IA</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">A IA alterna entre os emojis escolhidos. Selecione até 6.</p>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                  {getEmojiList(fd.emoji_tipo).length}/6
                                </span>
                              </div>

                              {/* Selecionados */}
                              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-black/30 rounded-xl border border-white/5">
                                {getEmojiList(fd.emoji_tipo).length === 0 ? (
                                  <span className="text-[10px] text-slate-600 self-center">Nenhum selecionado — escolha abaixo</span>
                                ) : getEmojiList(fd.emoji_tipo).map((e, i) => (
                                  <button key={i} type="button" onClick={() => toggleEmoji(e)}
                                    className="flex items-center gap-1 bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 rounded-lg px-2 py-1 text-base hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
                                    title="Clique para remover"
                                  >
                                    {e}
                                    <X className="w-2.5 h-2.5 text-slate-500 group-hover:text-red-400 flex-shrink-0" />
                                  </button>
                                ))}
                              </div>

                              {/* Abas de categoria */}
                              <div className="flex gap-1 flex-wrap">
                                {EMOJI_CATEGORIES.map((cat, i) => (
                                  <button key={cat.label} type="button" onClick={() => setEmojiCatIdx(i)}
                                    className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                                      emojiCatIdx === i
                                        ? "bg-[#FFFFFF]/15 text-[#FFFFFF] border border-[#FFFFFF]/30"
                                        : "text-slate-500 hover:text-slate-300 bg-white/3 border border-transparent"
                                    }`}
                                  >{cat.label}</button>
                                ))}
                              </div>

                              {/* Grid de emojis da categoria ativa */}
                              <div className="grid grid-cols-10 gap-1">
                                {EMOJI_CATEGORIES[emojiCatIdx].emojis.map(e => {
                                  const selected = getEmojiList(fd.emoji_tipo).includes(e);
                                  return (
                                    <button key={e} type="button" onClick={() => toggleEmoji(e)}
                                      title={selected ? "Remover" : getEmojiList(fd.emoji_tipo).length >= 6 ? "Máximo atingido" : "Adicionar"}
                                      className={`h-9 flex items-center justify-center text-lg rounded-lg transition-all ${
                                        selected
                                          ? "bg-[#FFFFFF]/20 border border-[#FFFFFF]/50 scale-110"
                                          : getEmojiList(fd.emoji_tipo).length >= 6
                                            ? "opacity-30 cursor-not-allowed"
                                            : "hover:bg-white/8 border border-transparent hover:scale-110"
                                      }`}
                                    >{e}</button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Cor de Branding + Preview */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className={card}>
                                <label className={lClass}>Cor de Branding</label>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <input type="color" value={fd.emoji_cor?.startsWith('#') ? fd.emoji_cor : "#FFFFFF"}
                                      onChange={e => setFormData({...formData, emoji_cor: e.target.value})}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="w-11 h-11 rounded-xl border-2 border-white/10 shadow-md"
                                      style={{ backgroundColor: fd.emoji_cor?.startsWith('#') ? fd.emoji_cor : "#FFFFFF" }}
                                    />
                                  </div>
                                  <input type="text" value={fd.emoji_cor}
                                    onChange={e => setFormData({...formData, emoji_cor: e.target.value})}
                                    className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]/30"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              {/* Preview rotativo */}
                              <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex flex-col gap-2 justify-center">
                                <p className="text-[9px] font-medium text-slate-600 uppercase mb-1">Preview</p>
                                {(() => {
                                  const list = getEmojiList(fd.emoji_tipo);
                                  const e0 = list[0] || "✨";
                                  const e1 = list[1] || e0;
                                  const cor = fd.emoji_cor?.startsWith('#') ? fd.emoji_cor : "#FFFFFF";
                                  return (<>
                                    <div className="max-w-[85%]">
                                      <div className="rounded-2xl rounded-tl-none p-3 text-[11px] font-medium text-white"
                                        style={{ backgroundColor: `${cor}22`, border: `1px solid ${cor}44` }}
                                      >Olá! Como posso ajudar? {e0}</div>
                                    </div>
                                    <div className="max-w-[80%] ml-auto bg-slate-800 rounded-2xl rounded-tr-none p-3 text-[11px] text-slate-300">
                                      Quanto custa o plano?
                                    </div>
                                    <div className="max-w-[85%]">
                                      <div className="rounded-2xl rounded-tl-none p-3 text-[11px] font-medium text-white"
                                        style={{ backgroundColor: `${cor}dd` }}
                                      >Temos planos a partir de R$ 99! {e1}</div>
                                    </div>
                                  </>);
                                })()}
                              </div>
                            </div>
                          </>)}

                          {/* ─ CONTEXTO ─ */}
                          {activeSection === "contexto" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <ListChecks className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Contexto & Regras</h3>
                            </div>
                            <div className={card}>
                              <div>
                                <label className={lClass}>Contexto da Empresa</label>
                                <textarea rows={6} value={fd.contexto_empresa} onChange={e => setFormData({...formData, contexto_empresa: e.target.value})} className={taClass} placeholder="História, valores, localização, serviços..." />
                              </div>
                              <div>
                                <label className={lClass}>Exemplos de Interações</label>
                                <textarea rows={7} value={fd.exemplos} onChange={e => setFormData({...formData, exemplos: e.target.value})} className={`${iClass} resize-none font-mono text-sm leading-7`} placeholder={"Usuário: Olá\nIA: Olá! Como posso ajudar?"} />
                              </div>
                            </div>
                            <div className={card}>
                              <div>
                                <label className={lClass}>Regras de Formatação</label>
                                <textarea rows={5} value={fd.regras_formatacao} onChange={e => setFormData({...formData, regras_formatacao: e.target.value})} className={taClass} placeholder="Use negrito para preços, pule linhas entre tópicos..." />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={lClass}>Contexto Extra</label>
                                  <textarea rows={4} value={fd.contexto_extra} onChange={e => setFormData({...formData, contexto_extra: e.target.value})} className={taClass} placeholder="Observações adicionais..." />
                                </div>
                                <div>
                                  <label className={lClass}>Despedida Personalizada</label>
                                  <textarea rows={4} value={fd.despedida_personalizada} onChange={e => setFormData({...formData, despedida_personalizada: e.target.value})} className={taClass} placeholder="Mensagem ao encerrar..." />
                                </div>
                              </div>
                            </div>
                          </>)}

                          {/* ─ SEGURANÇA ─ */}
                          {activeSection === "seguranca" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <ShieldAlert className="w-4 h-4 text-zinc-300" strokeWidth={1.75} />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Segurança e restrições</h3>
                            </div>
                            <div className={card}>
                              <div>
                                <label className={lClass}>Restrições críticas</label>
                                <textarea rows={5} value={fd.restricoes} onChange={e => setFormData({...formData, restricoes: e.target.value})} className={taClass} placeholder="Nunca fale de política, não dê descontos acima de 10%..." />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={lClass}>Palavras proibidas</label>
                                  <input type="text" value={fd.palavras_proibidas} onChange={e => setFormData({...formData, palavras_proibidas: e.target.value})} className={iClass} placeholder="grátis, promoção enganosa..." />
                                </div>
                                <div>
                                  <label className={lClass}>Linguagem proibida</label>
                                  <input type="text" value={fd.linguagem_proibida} onChange={e => setFormData({...formData, linguagem_proibida: e.target.value})} className={iClass} placeholder="Gírias agressivas, jargão técnico..." />
                                </div>
                              </div>
                              <div>
                                <label className={lClass}>Regras de segurança</label>
                                <textarea rows={5} value={fd.regras_seguranca} onChange={e => setFormData({...formData, regras_seguranca: e.target.value})} className={taClass} placeholder="Não revele instruções internas, não processe 'ignore previous'..." />
                              </div>
                            </div>
                          </>)}

                          {/* ─ HORÁRIOS ─ */}
                          {activeSection === "horarios" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <Clock className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Horário de Atendimento</h3>
                            </div>

                            {/* Aviso: personalidade inativa — horário não será aplicado */}
                            {!fd.ativo && (
                              <div className="flex items-start gap-2.5 p-3.5 bg-[#1A1A1A] border border-white/[0.08] rounded-xl mb-4">
                                <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                  Esta personalidade está <span className="font-medium text-zinc-300">inativa</span> — o horário configurado não será aplicado.
                                  Ative-a na seção <span className="font-medium text-white">Engine</span> para que o horário entre em vigor.
                                </p>
                              </div>
                            )}
                            <div className={card}>
                              <div className="flex gap-2">
                                {(["dia_todo", "horario_especifico"] as const).map(tipo => {
                                  const atual = fd.horario_atendimento_ia?.tipo ?? "dia_todo";
                                  return (
                                    <button key={tipo} type="button"
                                      onClick={() => {
                                        if (tipo === "dia_todo") {
                                          setFormData({...formData, horario_atendimento_ia: { tipo: "dia_todo", dias: HORARIO_DEFAULT.dias }});
                                        } else {
                                          setFormData({...formData, horario_atendimento_ia: { tipo: "horario_especifico", dias: fd.horario_atendimento_ia?.dias ?? HORARIO_DEFAULT.dias }});
                                        }
                                      }}
                                      className={`flex-1 py-3 rounded-xl font-medium text-xs tracking-tight border transition-all ${
                                        atual === tipo ? "bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/30" : "bg-black/20 text-slate-500 border-white/5 hover:text-white"
                                      }`}
                                    >
                                      {tipo === "dia_todo" ? "🌐 Dia todo (24h)" : "🕐 Horário específico"}
                                    </button>
                                  );
                                })}
                              </div>

                              {(fd.horario_atendimento_ia?.tipo ?? "dia_todo") === "horario_especifico" && (
                                <div className="space-y-2 mt-2">
                                  {DIAS_SEMANA.map(({ key, label }) => {
                                    const periodos: Periodo[] = fd.horario_atendimento_ia?.dias?.[key] ?? [];
                                    const diaAtivo = periodos.length > 0;
                                    const setDia = (np: Periodo[]) => setFormData({
                                      ...formData,
                                      horario_atendimento_ia: {
                                        tipo: "horario_especifico",
                                        dias: { ...(fd.horario_atendimento_ia?.dias ?? HORARIO_DEFAULT.dias), [key]: np },
                                      },
                                    });
                                    return (
                                      <div key={key} className="bg-black/20 border border-white/5 rounded-xl p-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                          <button type="button" onClick={() => setDia(diaAtivo ? [] : [{ inicio: "08:00", fim: "18:00" }])}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all ${diaAtivo ? "bg-[#FFFFFF]" : "bg-slate-700"}`}
                                          >
                                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-all shadow ${diaAtivo ? "translate-x-4" : "translate-x-0.5"}`} />
                                          </button>
                                          <span className={`text-xs font-bold w-28 ${diaAtivo ? "text-white" : "text-slate-600"}`}>{label}</span>
                                          {diaAtivo ? (
                                            <div className="flex flex-wrap gap-2 flex-1">
                                              {periodos.map((p, i) => {
                                                const periodoInvalido = p.inicio && p.fim && p.inicio >= p.fim;
                                                return (
                                                <div key={i} className="flex items-center gap-1.5">
                                                  <input type="time" value={p.inicio}
                                                    onChange={e => {
                                                      const np = [...periodos];
                                                      const newIni = e.target.value;
                                                      // Auto-corrige fim se ficou <= inicio
                                                      const curFim = np[i].fim;
                                                      const newFim = curFim && newIni >= curFim
                                                        ? parseInt(newIni.split(":")[0]) >= 23
                                                          ? "23:59"
                                                          : `${String(Math.min(parseInt(newIni.split(":")[0]) + 4, 23)).padStart(2, "0")}:${newIni.split(":")[1]}`
                                                        : curFim;
                                                      np[i] = { inicio: newIni, fim: newFim };
                                                      setDia(np);
                                                    }}
                                                    className="bg-[#0a1628] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FFFFFF]/30"
                                                  />
                                                  <span className="text-slate-600 text-xs">–</span>
                                                  <input type="time" value={p.fim}
                                                    onChange={e => { const np = [...periodos]; np[i] = {...np[i], fim: e.target.value}; setDia(np); }}
                                                    className={`bg-[#0a1628] border rounded-lg px-2 py-1 text-xs text-white focus:outline-none transition-colors ${
                                                      periodoInvalido
                                                        ? "border-white/20 focus:border-white/40"
                                                        : "border-white/10 focus:border-[#FFFFFF]/30"
                                                    }`}
                                                    title={periodoInvalido ? "Fim deve ser maior que o início" : undefined}
                                                  />
                                                  {periodos.length > 1 && (
                                                    <button type="button" onClick={() => setDia(periodos.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                                                  )}
                                                </div>
                                              ); })}
                                              {periodos.length < 2 && (
                                                <button type="button" onClick={() => setDia([...periodos, { inicio: "14:00", fim: "18:00" }])}
                                                  className="text-[10px] text-[#FFFFFF]/60 hover:text-[#FFFFFF] flex items-center gap-1 font-bold"
                                                >
                                                  <Plus className="w-3 h-3" /> período
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-[10px] text-slate-700 tracking-tight">Inativo</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>)}

                          {/* ─ VOZ DA IA (TTS) ─ */}
                          {activeSection === "voz" && (<>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-5">
                              <Mic2 className="w-4 h-4 text-[#FFFFFF]" />
                              <h3 className="text-[15px] font-medium text-white tracking-tight">Voz da IA — Resposta por Áudio</h3>
                            </div>

                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                              Quando ativado, se o cliente enviar um <span className="text-white font-bold">áudio</span> no WhatsApp,
                              a IA responderá com um <span className="text-[#FFFFFF] font-bold">áudio PTT</span> além do texto.
                              A IA espelha o canal do cliente — texto → texto, áudio → áudio + texto.
                            </p>

                            {/* Toggle TTS Ativo */}
                            <div className={`${card} !py-4 !space-y-0 flex items-center justify-between`}>
                              <div>
                                <p className="text-xs font-medium text-white flex items-center gap-2">
                                  <Mic2 className="w-3.5 h-3.5 text-[#FFFFFF]" />
                                  Resposta por Áudio
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">IA responde com áudio quando cliente envia áudio</p>
                              </div>
                              <button type="button" onClick={() => setFormData({ ...formData, tts_ativo: !fd.tts_ativo })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all flex-shrink-0 ${fd.tts_ativo ? "bg-[#FFFFFF]" : "bg-slate-700"}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow ${fd.tts_ativo ? "translate-x-6" : "translate-x-1"}`} />
                              </button>
                            </div>

                            {fd.tts_ativo && (<>
                              {/* Filtro por gênero */}
                              <div className={card}>
                                <label className={lClass}>Filtrar vozes</label>
                                <div className="flex gap-2">
                                  {([
                                    { id: "todas" as const, label: "Todas", icon: "🎭" },
                                    { id: "feminina" as const, label: "Femininas", icon: "👩" },
                                    { id: "masculina" as const, label: "Masculinas", icon: "👨" },
                                  ]).map(f => (
                                    <button key={f.id} type="button" onClick={() => setTtsGenderFilter(f.id)}
                                      className={`flex-1 py-2.5 rounded-xl font-medium text-[10px] tracking-tight border transition-all ${
                                        ttsGenderFilter === f.id
                                          ? "bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/30"
                                          : "bg-black/20 text-slate-500 border-white/5 hover:text-white"
                                      }`}
                                    >
                                      {f.icon} {f.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Grid de vozes */}
                              <div className={card}>
                                <label className={lClass}>Escolha a voz</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                                  {ttsVoices
                                    .filter(v => ttsGenderFilter === "todas" || v.genero === ttsGenderFilter)
                                    .map(v => {
                                      const isSelected = fd.tts_voz === v.nome;
                                      const isPreviewing = ttsPreviewLoading === v.nome;
                                      return (
                                        <div key={v.nome}
                                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-[#FFFFFF]/10 border-[#FFFFFF]/40"
                                              : "bg-black/20 border-white/5 hover:border-white/10"
                                          }`}
                                          onClick={() => setFormData({ ...formData, tts_voz: v.nome })}
                                        >
                                          <span className="text-lg">{v.genero === "feminina" ? "👩" : "👨"}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className={`text-xs font-medium ${isSelected ? "text-[#FFFFFF]" : "text-slate-300"}`}>{v.nome}</p>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                                isSelected ? "bg-[#FFFFFF]/20 text-[#FFFFFF]" : "bg-white/5 text-slate-500"
                                              }`}>{v.tag}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{v.descricao}</p>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button type="button"
                                              onClick={(e) => { e.stopPropagation(); ttsPlayPreview(v.nome); }}
                                              disabled={!!ttsPreviewLoading}
                                              className={`p-2 rounded-lg border transition-all ${
                                                isPreviewing
                                                  ? "bg-[#FFFFFF]/20 border-[#FFFFFF]/40 text-[#FFFFFF] animate-pulse"
                                                  : "bg-black/30 border-white/5 text-slate-400 hover:text-[#FFFFFF] hover:border-[#FFFFFF]/20"
                                              }`}
                                              title="Ouvir preview"
                                            >
                                              {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                            </button>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FFFFFF]" />}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                                {ttsVoices.length === 0 && (
                                  <div className="text-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-600 mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-600">Carregando vozes...</p>
                                  </div>
                                )}
                                {ttsPreviewError && (
                                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    <p className="text-[10px] text-red-400 font-medium">{ttsPreviewError}</p>
                                  </div>
                                )}
                              </div>

                              {/* Info box */}
                              <div className="flex items-start gap-2.5 p-3.5 bg-[#FFFFFF]/5 border border-[#FFFFFF]/10 rounded-xl">
                                <Zap className="w-4 h-4 text-[#FFFFFF] flex-shrink-0 mt-0.5" />
                                <div className="text-[10px] text-slate-400 leading-relaxed">
                                  <p><span className="text-white font-bold">Gemini TTS</span> — 30 vozes neurais Google com qualidade profissional em PT-BR.</p>
                                  <p className="mt-1">Tier grátis disponível. Clique em <PlayCircle className="w-3 h-3 inline" /> para ouvir cada voz antes de escolher.</p>
                                </div>
                              </div>
                            </>)}
                          </>)}

                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  /* ── Playground Sensacional ────────────────────── */
                  <div className="flex-1 flex overflow-hidden">

                    {/* Sessions sidebar */}
                    {pgShowSessions && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 200, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="flex-shrink-0 border-r border-white/6 bg-[#0F0F0F]/60 flex flex-col overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/6">
                          <button
                            onClick={() => {
                              const p = personalities.find(x => x.id === selected);
                              pgCreateSession(
                                typeof selected === "number" ? selected : null,
                                p?.nome_ia || "Assistente",
                                p?.saudacao_personalizada
                              );
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFFFF]/10 text-[#FFFFFF] text-xs font-bold hover:bg-[#FFFFFF]/20 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Nova conversa
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {pgSessions.filter(s => typeof selected !== "number" || s.personality_id === selected).map(s => (
                            <div
                              key={s.id}
                              onClick={() => setPgActiveId(s.id)}
                              className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-all text-xs ${
                                s.id === pgActiveId
                                  ? "bg-[#FFFFFF]/10 border border-[#FFFFFF]/20 text-white"
                                  : "hover:bg-white/5 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate flex-1">{s.nome_ia}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); pgDeleteSession(s.id); }}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-1 truncate">
                                {s.messages.length > 0 ? s.messages[s.messages.length - 1].content.slice(0, 40) + "..." : "Sem mensagens"}
                              </p>
                              {s.summary && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Zap className="w-2.5 h-2.5 text-zinc-400" strokeWidth={1.75} />
                                  <span className="text-[9px] text-zinc-400">Memória</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Chat area */}
                    <div className="flex-1 flex flex-col overflow-hidden p-6">
                      {/* Header bar */}
                      <div className="flex items-center justify-between mb-4 p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPgShowSessions(!pgShowSessions)}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                            title="Sessões"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <div>
                              <p className="text-xs text-emerald-300 font-bold">
                                {pgActiveSession?.nome_ia || "Playground"}
                                {playModel && (
                                  <span className="text-slate-500 font-normal"> · {MODELS.find(m => m.id === playModel)?.label || playModel}</span>
                                )}
                              </p>
                              {pgActiveSession?.summary && (
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <Zap className="w-2.5 h-2.5" strokeWidth={1.75} /> Memória ativa — a IA lembra do contexto
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={copyConversation} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" title="Copiar conversa">
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              const p = personalities.find(x => x.id === selected);
                              pgCreateSession(
                                typeof selected === "number" ? selected : null,
                                p?.nome_ia || "Assistente",
                                p?.saudacao_personalizada
                              );
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                            title="Nova conversa"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </div>

                      {/* Messages area */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 mb-4">
                        {playHistory.length === 0 && !streamingText ? (
                          <div className="flex flex-col items-center justify-center flex-1 text-center opacity-40 py-12">
                            <Bot className="w-12 h-12 mb-3" />
                            <p className="text-sm font-bold">Converse com a IA agora mesmo.</p>
                            <p className="text-xs mt-1 opacity-70">
                              {selected === "new"
                                ? "Salve a personalidade primeiro para testá-la."
                                : "Usa 100% a personalidade salva — modelo, instruções, memória e todos os campos."}
                            </p>
                          </div>
                        ) : (
                          <>
                            {playHistory.map((m, i) => (
                              <motion.div
                                key={`${pgActiveId}-${i}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div className={`max-w-[75%] group relative ${
                                  m.role === "user"
                                    ? "bg-[#FFFFFF] text-black rounded-2xl rounded-br-md"
                                    : "bg-white/5 text-slate-200 border border-white/8 rounded-2xl rounded-bl-md"
                                }`}>
                                  <div
                                    className={`px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "font-semibold" : ""}`}
                                    dangerouslySetInnerHTML={{ __html: m.role === "bot" ? formatWhatsApp(m.content) : formatWhatsApp(m.content) }}
                                  />
                                  {m.timestamp && (
                                    <span className={`text-[9px] px-4 pb-2 block ${
                                      m.role === "user" ? "text-black/40 text-right" : "text-slate-600"
                                    }`}>
                                      {formatTime(m.timestamp)}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}

                            {/* Streaming message being generated */}
                            {testLoading && streamingText && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                              >
                                <div className="max-w-[75%] bg-white/5 text-slate-200 border border-[#FFFFFF]/20 rounded-2xl rounded-bl-md">
                                  <div
                                    className="px-4 py-3 text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: formatWhatsApp(streamingText) }}
                                  />
                                </div>
                              </motion.div>
                            )}

                            {/* Typing indicator */}
                            {testLoading && !streamingText && (
                              <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-md px-5 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-bounce" style={{ animationDelay: "300ms" }} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input area */}
                      <div className="relative flex-shrink-0">
                        <textarea
                          ref={textareaRef}
                          value={testMessage}
                          onChange={e => {
                            setTestMessage(e.target.value);
                            // Auto-resize
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runTest(); }
                          }}
                          placeholder={selected === "new" ? "Salve a personalidade primeiro..." : "Digite sua mensagem... (Shift+Enter para nova linha)"}
                          disabled={selected === "new"}
                          rows={1}
                          className="w-full bg-[#0a1628]/80 border border-white/8 rounded-xl px-4 py-3.5 pr-14 text-white placeholder-slate-600 focus:outline-none focus:border-[#FFFFFF]/40 transition-all text-sm resize-none"
                          style={{ minHeight: "48px", maxHeight: "120px" }}
                        />
                        <button
                          type="button"
                          onClick={runTest}
                          disabled={testLoading || !testMessage.trim() || selected === "new"}
                          className="absolute right-2 bottom-2 p-2.5 bg-[#FFFFFF] text-black rounded-lg hover:bg-[#FFFFFF]/90 transition-all disabled:opacity-30"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Footer — Save Bar ────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-white/6 bg-[#0F0F0F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <AnimatePresence>
                      {saveError && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-start gap-2 text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-medium">{saveError}</span>
                        </motion.div>
                      )}
                      {success && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-4 py-2.5"
                        >
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-bold">Personalidade salva com sucesso!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-xs text-zinc-500 tracking-tight hidden lg:block">
                      {selected === "new" ? "Nova personalidade" : `Editando #${selected}`}
                    </div>
                    <button
                      onClick={doSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 tracking-tight"
                    >
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} /> Salvando…</>
                        : success ? <><CheckCircle2 className="w-4 h-4" strokeWidth={1.75} /> Salvo</>
                        : <><Save className="w-4 h-4" strokeWidth={1.75} /> Salvar personalidade</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
      `}</style>
    </div>
  );
}
