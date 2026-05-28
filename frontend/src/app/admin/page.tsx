"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Building2, Mail, Plus, LogOut, LayoutDashboard,
  Loader2, CheckCircle, AlertCircle, Users,
  Pencil, Trash2, X, UserCheck, UserX, ShieldCheck,
  Settings, Sparkles, RefreshCw, KeyRound, Copy,
  Search, MessageSquare, TrendingUp, Star, ArrowRight,
  MoreVertical, ArrowUpRight,
} from "lucide-react";

// ─── tipos ───────────────────────────────────────────────────────────────────

type EmpresaCard = {
  id: number;
  nome: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  plano?: string;
  status?: string;
  created_at?: string;
  qtd_usuarios: number;
  qtd_conversas: number;
  qtd_leads: number;
  conversas_30d: number;
  qtd_mensagens: number;
  qtd_tokens: number;
};

type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  empresa_id: number;
  empresa_nome?: string;
};

type ApiToken = {
  id: number;
  empresa_id: number;
  nome: string;
  token_prefix: string;
  ativo: boolean;
  last_used_at?: string | null;
  created_at?: string | null;
};

type Stats = {
  empresas: { ativas: number; total: number };
  usuarios_ativos: number;
  conversas: { total: number; ultimos_30d: number; hoje: number };
  mensagens_total: number;
  leads_qualificados: number;
  api_tokens_ativos: number;
};

// ─── pagina ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [empresas, setEmpresas] = useState<EmpresaCard[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  // Modais
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    empresa_nome: "", cnpj: "", email_empresa: "", telefone: "",
    usuario_nome: "", usuario_email: "", usuario_senha: "",
  });
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [msgCliente, setMsgCliente] = useState<{ ok: boolean; text: string } | null>(null);

  const [gerenciandoEmpresa, setGerenciandoEmpresa] = useState<EmpresaCard | null>(null);
  const [tabAtiva, setTabAtiva] = useState<"empresa" | "usuarios" | "tokens">("usuarios");

  const [editandoEmpresa, setEditandoEmpresa] = useState<any>(null);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  const [novoUsuarioExtra, setNovoUsuarioExtra] = useState({ nome: "", email: "", senha: "", perfil: "admin" });
  const [criandoUsuarioExtra, setCriandoUsuarioExtra] = useState(false);

  const [nomeNovoToken, setNomeNovoToken] = useState("");
  const [criandoToken, setCriandoToken] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{ empresa: string; token: string } | null>(null);

  const [entrando, setEntrando] = useState<number | null>(null);

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}` },
  });

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const fetchData = async () => {
    try {
      const meRes = await axios.get("/api-backend/auth/me", getConfig());
      if (meRes.data.perfil !== "admin_master") {
        router.push("/dashboard");
        return;
      }
      setUser(meRes.data);
    } catch {
      router.push("/login");
      return;
    }

    try {
      const [statsRes, empRes, usersRes, tokRes] = await Promise.all([
        axios.get<Stats>("/api-backend/admin/stats", getConfig()),
        axios.get<EmpresaCard[]>("/api-backend/admin/empresas-com-stats", getConfig()),
        axios.get<Usuario[]>("/api-backend/auth/usuarios", getConfig()),
        axios.get<ApiToken[]>("/api-backend/api-tokens", getConfig()).catch(() => ({ data: [] as ApiToken[] })),
      ]);
      setStats(statsRes.data);
      setEmpresas(empRes.data);
      setUsuarios(usersRes.data);
      setTokens(tokRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── novo cliente ─────────────────────────────────────────────────────────

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgCliente(null);
    if (novoCliente.usuario_senha.length < 6) {
      setMsgCliente({ ok: false, text: "Senha deve ter ao menos 6 caracteres." });
      return;
    }
    setCriandoCliente(true);
    try {
      await axios.post("/api-backend/auth/create-cliente", {
        empresa_nome: novoCliente.empresa_nome,
        empresa_cnpj: novoCliente.cnpj || undefined,
        empresa_email: novoCliente.email_empresa || undefined,
        empresa_telefone: novoCliente.telefone || undefined,
        usuario_nome: novoCliente.usuario_nome,
        usuario_email: novoCliente.usuario_email,
        usuario_senha: novoCliente.usuario_senha,
      }, getConfig());

      setNovoCliente({ empresa_nome: "", cnpj: "", email_empresa: "", telefone: "", usuario_nome: "", usuario_email: "", usuario_senha: "" });
      setNovoClienteOpen(false);
      await fetchData();
    } catch (err: any) {
      setMsgCliente({ ok: false, text: err.response?.data?.detail || "Erro ao criar cliente." });
    } finally {
      setCriandoCliente(false);
    }
  };

  // ─── impersonate ──────────────────────────────────────────────────────────

  const entrarComoCliente = async (emp: EmpresaCard) => {
    setEntrando(emp.id);
    try {
      const res = await axios.post(`/api-backend/admin/impersonate/${emp.id}`, {}, getConfig());
      localStorage.setItem("token", res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao entrar como cliente.");
      setEntrando(null);
    }
  };

  // ─── ações gestão (modal Gerenciar) ───────────────────────────────────────

  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEmpresa(true);
    try {
      await axios.put(`/api-backend/auth/empresas/${editandoEmpresa.id}`, editandoEmpresa, getConfig());
      setEditandoEmpresa(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao atualizar empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  };

  const handleExcluirEmpresa = async (id: number, nome: string) => {
    if (!confirm(`Excluir empresa "${nome}" e TODOS os dados vinculados? Não dá pra desfazer.`)) return;
    try {
      await axios.delete(`/api-backend/auth/empresas/${id}`, getConfig());
      setGerenciandoEmpresa(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao excluir empresa.");
    }
  };

  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gerenciandoEmpresa) return;
    if (novoUsuarioExtra.senha.length < 6) { alert("Senha mínimo 6 caracteres"); return; }
    setCriandoUsuarioExtra(true);
    try {
      await axios.post("/api-backend/auth/usuarios", {
        ...novoUsuarioExtra,
        empresa_id: gerenciandoEmpresa.id,
      }, getConfig());
      setNovoUsuarioExtra({ nome: "", email: "", senha: "", perfil: "admin" });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao criar usuário.");
    } finally {
      setCriandoUsuarioExtra(false);
    }
  };

  const handleToggleUsuario = async (id: number) => {
    try {
      await axios.patch(`/api-backend/auth/usuarios/${id}`, {}, getConfig());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao alterar usuário.");
    }
  };

  const handleExcluirUsuario = async (id: number, nome: string) => {
    if (!confirm(`Excluir usuário "${nome}"?`)) return;
    try {
      await axios.delete(`/api-backend/auth/usuarios/${id}`, getConfig());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao excluir.");
    }
  };

  const handleCriarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gerenciandoEmpresa || !nomeNovoToken.trim()) return;
    setCriandoToken(true);
    try {
      const res = await axios.post("/api-backend/api-tokens", {
        empresa_id: gerenciandoEmpresa.id,
        nome: nomeNovoToken.trim(),
      }, getConfig());
      setTokenGerado({ empresa: gerenciandoEmpresa.nome, token: res.data.token });
      setNomeNovoToken("");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao criar token.");
    } finally {
      setCriandoToken(false);
    }
  };

  const handleRevogarToken = async (id: number, nome: string) => {
    if (!confirm(`Revogar token "${nome}"? Quem estiver usando vai parar de funcionar.`)) return;
    try {
      await axios.delete(`/api-backend/api-tokens/${id}`, getConfig());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao revogar.");
    }
  };

  const copiarToken = (token: string) => {
    navigator.clipboard.writeText(token).then(
      () => alert("Token copiado!"),
      () => alert("Não consegui copiar — selecione manualmente.")
    );
  };

  // ─── derivados ────────────────────────────────────────────────────────────

  const empresasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(e =>
      e.nome.toLowerCase().includes(q) ||
      (e.nome_fantasia || "").toLowerCase().includes(q) ||
      (e.cnpj || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  }, [empresas, filtro]);

  const usuariosDaEmpresa = (id: number) => usuarios.filter(u => u.empresa_id === id);
  const tokensDaEmpresa = (id: number) => tokens.filter(t => t.empresa_id === id);

  // ─── estilos ──────────────────────────────────────────────────────────────

  const inputCls = "w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20";
  const labelCls = "text-xs text-zinc-400 mb-1.5 block";
  const cardBase = "bg-[#141414] border border-white/[0.06] rounded-2xl";
  const primaryBtn = "bg-white hover:bg-zinc-100 text-black font-medium text-sm py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const ghostBtn = "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-300 bg-[#1A1A1A] border border-white/[0.06] hover:border-white/15 hover:text-white transition-colors";

  // ─── render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/[0.06] bg-[#0A0A0A] hidden lg:flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] mb-2">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={1.75} />
          <span className="text-sm font-medium text-white tracking-tight">Closer IA · Admin</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5">
          <a href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-[#1E1E1E] text-white border border-white/[0.06]">
            <LayoutDashboard className="w-[17px] h-[17px] text-white" strokeWidth={1.75} />
            <span className="tracking-tight">Visão Geral</span>
          </a>
          <a href="/admin/features" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all border border-transparent">
            <Settings className="w-[17px] h-[17px] text-zinc-500" strokeWidth={1.75} />
            <span className="tracking-tight">Features</span>
          </a>
        </nav>
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl border-t border-white/[0.04] pt-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-white">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white tracking-tight">{user?.nome}</p>
              <p className="text-xs text-zinc-500 truncate">admin master</p>
            </div>
            <button onClick={logout} title="Sair" className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05]">
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Painel Master</h1>
              <p className="text-sm text-zinc-500">Visão geral de todos os clientes do Closer IA.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className={ghostBtn}>
                <RefreshCw className="w-3.5 h-3.5" /> Recarregar
              </button>
              <button onClick={() => { setNovoClienteOpen(true); setMsgCliente(null); }} className={primaryBtn}>
                <Plus className="w-4 h-4" /> Novo Cliente
              </button>
            </div>
          </div>

          {/* Métricas globais */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Building2 className="w-4 h-4" />}
                label="Clientes ativos"
                value={stats.empresas.ativas}
                hint={stats.empresas.total !== stats.empresas.ativas ? `${stats.empresas.total} total` : undefined}
              />
              <StatCard
                icon={<MessageSquare className="w-4 h-4" />}
                label="Conversas (30d)"
                value={stats.conversas.ultimos_30d}
                hint={`${stats.conversas.hoje} hoje · ${stats.conversas.total} total`}
              />
              <StatCard
                icon={<Star className="w-4 h-4" />}
                label="Leads qualificados"
                value={stats.leads_qualificados}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Mensagens trocadas"
                value={stats.mensagens_total}
                hint={`${stats.usuarios_ativos} usuários · ${stats.api_tokens_ativos} tokens`}
              />
            </div>
          )}

          {/* Search */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold tracking-tight">Clientes <span className="text-zinc-500 font-normal">({empresasFiltradas.length})</span></h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
              <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar empresa, CNPJ, e-mail..."
                className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 w-72" />
            </div>
          </div>

          {/* Grid de cards de clientes */}
          {empresasFiltradas.length === 0 ? (
            <div className={`${cardBase} py-16 text-center`}>
              <Building2 className="w-10 h-10 mx-auto text-zinc-700 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-zinc-400">
                {empresas.length === 0 ? "Nenhum cliente ainda." : "Nada encontrado com esse filtro."}
              </p>
              {empresas.length === 0 && (
                <button onClick={() => setNovoClienteOpen(true)} className={`${ghostBtn} mt-4 mx-auto`}>
                  <Plus className="w-3.5 h-3.5" /> Criar primeiro cliente
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {empresasFiltradas.map(emp => (
                <ClienteCard
                  key={emp.id}
                  emp={emp}
                  entrando={entrando === emp.id}
                  onEntrar={() => entrarComoCliente(emp)}
                  onGerenciar={() => { setGerenciandoEmpresa(emp); setTabAtiva("usuarios"); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal: novo cliente */}
        {novoClienteOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-zinc-400" /> Novo Cliente</h2>
                <button onClick={() => setNovoClienteOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Cria a empresa + o usuário administrador num único passo.</p>
              <form onSubmit={handleCriarCliente} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nome da empresa *</label>
                  <input required className={inputCls} value={novoCliente.empresa_nome}
                    onChange={e => setNovoCliente({ ...novoCliente, empresa_nome: e.target.value })} placeholder="Acme Ltda" />
                </div>
                <div>
                  <label className={labelCls}>CNPJ</label>
                  <input className={inputCls} value={novoCliente.cnpj}
                    onChange={e => setNovoCliente({ ...novoCliente, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className={labelCls}>E-mail da empresa</label>
                  <input type="email" className={inputCls} value={novoCliente.email_empresa}
                    onChange={e => setNovoCliente({ ...novoCliente, email_empresa: e.target.value })} placeholder="contato@empresa.com" />
                </div>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <input className={inputCls} value={novoCliente.telefone}
                    onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>

                <div className="md:col-span-2 mt-2 pt-3 border-t border-white/[0.04] text-xs text-zinc-500 uppercase tracking-wide">
                  Usuário administrador da empresa
                </div>

                <div>
                  <label className={labelCls}>Nome *</label>
                  <input required className={inputCls} value={novoCliente.usuario_nome}
                    onChange={e => setNovoCliente({ ...novoCliente, usuario_nome: e.target.value })} placeholder="João Silva" />
                </div>
                <div>
                  <label className={labelCls}>E-mail de login *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                    <input type="email" required className={`${inputCls} pl-10`} value={novoCliente.usuario_email}
                      onChange={e => setNovoCliente({ ...novoCliente, usuario_email: e.target.value })} placeholder="gestor@empresa.com" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Senha provisória * <span className="text-zinc-600">(min 6)</span></label>
                  <input type="password" required minLength={6} className={inputCls} value={novoCliente.usuario_senha}
                    onChange={e => setNovoCliente({ ...novoCliente, usuario_senha: e.target.value })} placeholder="••••••••" />
                </div>

                {msgCliente && (
                  <div className={`md:col-span-2 flex items-start gap-2 text-xs p-3 rounded-lg border ${msgCliente.ok ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : "bg-red-500/5 border-red-500/20 text-red-300"}`}>
                    {msgCliente.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{msgCliente.text}</span>
                  </div>
                )}

                <div className="md:col-span-2 flex gap-2 pt-2">
                  <button type="button" onClick={() => setNovoClienteOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] text-sm font-medium">Cancelar</button>
                  <button type="submit" disabled={criandoCliente} className={`flex-1 ${primaryBtn}`}>
                    {criandoCliente ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Criar Cliente</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: gerenciar empresa (tabs usuários/tokens/empresa) */}
        {gerenciandoEmpresa && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              {/* header */}
              <div className="p-6 border-b border-white/[0.04] flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-lg font-semibold">
                    {gerenciandoEmpresa.nome?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">{gerenciandoEmpresa.nome}</h2>
                    <p className="text-xs text-zinc-500">
                      ID {gerenciandoEmpresa.id} · {gerenciandoEmpresa.qtd_usuarios} usuários · {gerenciandoEmpresa.qtd_conversas} conversas
                    </p>
                  </div>
                </div>
                <button onClick={() => setGerenciandoEmpresa(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              {/* tabs */}
              <div className="px-6 pt-3 flex gap-1 border-b border-white/[0.04]">
                {(["usuarios", "tokens", "empresa"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTabAtiva(t)}
                    className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                      tabAtiva === t ? "text-white border-b-2 border-white -mb-px" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t === "usuarios" ? "Usuários" : t === "tokens" ? "API Tokens" : "Empresa"}
                  </button>
                ))}
              </div>
              {/* body */}
              <div className="p-6 overflow-y-auto flex-1">
                {tabAtiva === "usuarios" && (
                  <div className="space-y-4">
                    <form onSubmit={handleAddUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-xl bg-[#1A1A1A] border border-white/[0.04]">
                      <input required placeholder="Nome" className={inputCls + " md:col-span-1"} value={novoUsuarioExtra.nome}
                        onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, nome: e.target.value })} />
                      <input required type="email" placeholder="E-mail" className={inputCls + " md:col-span-1"} value={novoUsuarioExtra.email}
                        onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, email: e.target.value })} />
                      <input required type="password" minLength={6} placeholder="Senha" className={inputCls + " md:col-span-1"} value={novoUsuarioExtra.senha}
                        onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, senha: e.target.value })} />
                      <button type="submit" disabled={criandoUsuarioExtra} className={primaryBtn}>
                        {criandoUsuarioExtra ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Adicionar</>}
                      </button>
                    </form>
                    <div className="space-y-1.5">
                      {usuariosDaEmpresa(gerenciandoEmpresa.id).length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">Nenhum usuário nessa empresa ainda.</p>
                      ) : (
                        usuariosDaEmpresa(gerenciandoEmpresa.id).map(u => (
                          <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${u.ativo ? "bg-[#1A1A1A] border-white/[0.04]" : "bg-[#0F0F0F] border-white/[0.03] opacity-60"}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#232323] border border-white/[0.06] flex items-center justify-center text-xs font-semibold">
                                {u.nome?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{u.nome}</p>
                                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-300 bg-[#232323] border border-white/[0.06] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5" /> {u.perfil}
                              </span>
                              <button onClick={() => handleToggleUsuario(u.id)} className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.05]" title={u.ativo ? "Desativar" : "Ativar"}>
                                {u.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => handleExcluirUsuario(u.id, u.nome)} className="p-1.5 rounded text-zinc-400 hover:text-red-300 hover:bg-red-500/10" title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tabAtiva === "tokens" && (
                  <div className="space-y-4">
                    <form onSubmit={handleCriarToken} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 p-3 rounded-xl bg-[#1A1A1A] border border-white/[0.04]">
                      <input required placeholder="Nome do token (ex: n8n produção)" className={inputCls} value={nomeNovoToken}
                        onChange={e => setNomeNovoToken(e.target.value)} />
                      <button type="submit" disabled={criandoToken} className={primaryBtn}>
                        {criandoToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" /> Gerar token</>}
                      </button>
                    </form>
                    <p className="text-[11px] text-zinc-500">
                      Token só aparece <strong>uma vez</strong> após criado. Use no header <code className="bg-[#0F0F0F] px-1 rounded">Authorization: Bearer sk_emp_...</code> ao chamar <code className="bg-[#0F0F0F] px-1 rounded">POST /v1/chat</code>.
                    </p>
                    <div className="space-y-1.5">
                      {tokensDaEmpresa(gerenciandoEmpresa.id).length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">Sem tokens ainda.</p>
                      ) : (
                        tokensDaEmpresa(gerenciandoEmpresa.id).map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1A1A1A] border border-white/[0.04]">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{t.nome}</p>
                                <code className="text-[10px] text-zinc-500 bg-[#0F0F0F] px-1.5 py-0.5 rounded">{t.token_prefix}...</code>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Criado {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                                {t.last_used_at && ` · usado ${new Date(t.last_used_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <button onClick={() => handleRevogarToken(t.id, t.nome)} className="p-1.5 rounded text-zinc-400 hover:text-red-300 hover:bg-red-500/10" title="Revogar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tabAtiva === "empresa" && (
                  <div className="space-y-4">
                    {!editandoEmpresa ? (
                      <>
                        <div className="space-y-2 p-4 rounded-xl bg-[#1A1A1A] border border-white/[0.04]">
                          <Linha k="Nome" v={gerenciandoEmpresa.nome} />
                          <Linha k="Nome Fantasia" v={gerenciandoEmpresa.nome_fantasia || "—"} />
                          <Linha k="CNPJ" v={gerenciandoEmpresa.cnpj || "—"} />
                          <Linha k="E-mail" v={gerenciandoEmpresa.email || "—"} />
                          <Linha k="Telefone" v={gerenciandoEmpresa.telefone || "—"} />
                          <Linha k="Plano" v={gerenciandoEmpresa.plano || "—"} />
                          <Linha k="Status" v={gerenciandoEmpresa.status || "—"} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoEmpresa({ ...gerenciandoEmpresa })} className={`flex-1 ${ghostBtn}`}>
                            <Pencil className="w-3.5 h-3.5" /> Editar dados
                          </button>
                          <button onClick={() => handleExcluirEmpresa(gerenciandoEmpresa.id, gerenciandoEmpresa.nome)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-300 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5" /> Excluir empresa
                          </button>
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleSalvarEmpresa} className="space-y-3">
                        {[
                          { key: "nome", label: "Nome *", required: true },
                          { key: "nome_fantasia", label: "Nome Fantasia" },
                          { key: "cnpj", label: "CNPJ" },
                          { key: "email", label: "E-mail", type: "email" },
                          { key: "telefone", label: "Telefone" },
                        ].map(({ key, label, required, type }) => (
                          <div key={key}>
                            <label className={labelCls}>{label}</label>
                            <input type={type || "text"} required={required} className={inputCls}
                              value={editandoEmpresa[key] || ""}
                              onChange={e => setEditandoEmpresa({ ...editandoEmpresa, [key]: e.target.value })} />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setEditandoEmpresa(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] text-sm font-medium">Cancelar</button>
                          <button type="submit" disabled={salvandoEmpresa} className={`flex-1 ${primaryBtn}`}>
                            {salvandoEmpresa ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: token gerado */}
        {tokenGerado && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-300">
                  <CheckCircle className="w-4 h-4" /> Token gerado para {tokenGerado.empresa}
                </h2>
                <button onClick={() => setTokenGerado(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-zinc-400 mb-3">Copie agora — esse valor não será mostrado de novo.</p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 bg-[#0F0F0F] border border-white/[0.08] rounded-lg p-3 text-xs text-emerald-200 break-all font-mono">
                  {tokenGerado.token}
                </code>
                <button onClick={() => copiarToken(tokenGerado.token)} className={ghostBtn} title="Copiar">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={() => setTokenGerado(null)} className={`w-full mt-4 ${primaryBtn}`}>Entendi, copiei</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 tracking-tight">{label}</span>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</p>
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

function ClienteCard({
  emp, entrando, onEntrar, onGerenciar
}: {
  emp: EmpresaCard;
  entrando: boolean;
  onEntrar: () => void;
  onGerenciar: () => void;
}) {
  const statusBadge = emp.status === "active"
    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
    : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";
  return (
    <div className="group bg-[#141414] border border-white/[0.06] rounded-2xl p-5 hover:border-white/15 transition-colors flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-base font-semibold shrink-0">
            {emp.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate tracking-tight">{emp.nome}</p>
            <p className="text-[11px] text-zinc-500 truncate">{emp.cnpj || emp.email || `ID ${emp.id}`}</p>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${statusBadge} shrink-0`}>
          {emp.status === "active" ? "Ativo" : emp.status || "—"}
        </span>
      </div>

      {/* mini-stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Mini label="Conversas" value={emp.qtd_conversas} highlight={emp.conversas_30d > 0 ? `+${emp.conversas_30d} (30d)` : undefined} />
        <Mini label="Leads" value={emp.qtd_leads} />
        <Mini label="Usuários" value={emp.qtd_usuarios} />
      </div>

      {emp.qtd_tokens > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-3">
          <KeyRound className="w-3 h-3" />
          {emp.qtd_tokens} token{emp.qtd_tokens > 1 ? "s" : ""} API ativo{emp.qtd_tokens > 1 ? "s" : ""}
        </div>
      )}

      {/* ações */}
      <div className="mt-auto flex gap-2 pt-3 border-t border-white/[0.04]">
        <button
          onClick={onEntrar}
          disabled={entrando}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white hover:bg-zinc-100 text-black transition-colors disabled:opacity-50"
        >
          {entrando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Entrar como cliente <ArrowUpRight className="w-3.5 h-3.5" /></>}
        </button>
        <button
          onClick={onGerenciar}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-300 bg-[#1A1A1A] border border-white/[0.06] hover:border-white/15 hover:text-white"
          title="Gerenciar"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: number; highlight?: string }) {
  return (
    <div className="bg-[#1A1A1A] border border-white/[0.04] rounded-lg p-2.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</p>
      {highlight && <p className="text-[10px] text-emerald-400 mt-0.5">{highlight}</p>}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs text-zinc-500 shrink-0">{k}</span>
      <span className="text-zinc-200 text-right truncate">{v}</span>
    </div>
  );
}
