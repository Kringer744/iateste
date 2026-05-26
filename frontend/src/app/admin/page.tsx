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
  ChevronDown, ChevronRight, Search,
} from "lucide-react";

// ─── tipos ───────────────────────────────────────────────────────────────────

type Empresa = {
  id: number;
  nome: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  website?: string;
  status?: string;
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

// ─── pagina ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [expandida, setExpandida] = useState<number | null>(null);

  // Wizard "Novo Cliente" — cria empresa + 1º usuário admin de uma vez
  const [novoCliente, setNovoCliente] = useState({
    empresa_nome: "", cnpj: "", email_empresa: "", telefone: "",
    usuario_nome: "", usuario_email: "", usuario_senha: "",
  });
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [msgCliente, setMsgCliente] = useState<{ ok: boolean; text: string } | null>(null);

  // Modais
  const [editandoEmpresa, setEditandoEmpresa] = useState<any>(null);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  const [addUsuarioPara, setAddUsuarioPara] = useState<Empresa | null>(null);
  const [novoUsuarioExtra, setNovoUsuarioExtra] = useState({ nome: "", email: "", senha: "", perfil: "admin" });
  const [criandoUsuarioExtra, setCriandoUsuarioExtra] = useState(false);

  const [criarTokenPara, setCriarTokenPara] = useState<Empresa | null>(null);
  const [nomeNovoToken, setNomeNovoToken] = useState("");
  const [criandoToken, setCriandoToken] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{ empresa: string; token: string } | null>(null);

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}` },
  });

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const fetchData = async () => {
    setForbidden(false);
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
      const [empRes, usersRes, tokRes] = await Promise.all([
        axios.get<Empresa[]>("/api-backend/auth/empresas", getConfig()),
        axios.get<Usuario[]>("/api-backend/auth/usuarios", getConfig()),
        axios.get<ApiToken[]>("/api-backend/api-tokens", getConfig()).catch(() => ({ data: [] as ApiToken[] })),
      ]);
      setEmpresas(empRes.data);
      setUsuarios(usersRes.data);
      setTokens(tokRes.data);
    } catch (err: any) {
      if (err.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── novo cliente (empresa + 1º admin) ────────────────────────────────────

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgCliente(null);

    if (novoCliente.usuario_senha.length < 6) {
      setMsgCliente({ ok: false, text: "Senha do usuário deve ter ao menos 6 caracteres." });
      return;
    }

    setCriandoCliente(true);
    try {
      // Endpoint transacional: cria empresa + 1º admin atomicamente.
      const res = await axios.post("/api-backend/auth/create-cliente", {
        empresa_nome: novoCliente.empresa_nome,
        empresa_cnpj: novoCliente.cnpj || undefined,
        empresa_email: novoCliente.email_empresa || undefined,
        empresa_telefone: novoCliente.telefone || undefined,
        usuario_nome: novoCliente.usuario_nome,
        usuario_email: novoCliente.usuario_email,
        usuario_senha: novoCliente.usuario_senha,
      }, getConfig());
      const empresaId = res.data.empresa_id;

      setMsgCliente({ ok: true, text: `Cliente "${novoCliente.empresa_nome}" criado. Usuário admin ${novoCliente.usuario_email} já pode logar.` });
      setNovoCliente({
        empresa_nome: "", cnpj: "", email_empresa: "", telefone: "",
        usuario_nome: "", usuario_email: "", usuario_senha: "",
      });
      await fetchData();
      setExpandida(empresaId);
    } catch (err: any) {
      setMsgCliente({ ok: false, text: err.response?.data?.detail || "Erro ao criar cliente." });
    } finally {
      setCriandoCliente(false);
    }
  };

  // ─── usuários ─────────────────────────────────────────────────────────────

  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsuarioPara) return;
    if (novoUsuarioExtra.senha.length < 6) { alert("Senha mínimo 6 caracteres"); return; }
    setCriandoUsuarioExtra(true);
    try {
      await axios.post("/api-backend/auth/usuarios", {
        ...novoUsuarioExtra,
        empresa_id: addUsuarioPara.id,
      }, getConfig());
      setAddUsuarioPara(null);
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

  // ─── empresas ─────────────────────────────────────────────────────────────

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
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao excluir empresa.");
    }
  };

  // ─── API tokens ───────────────────────────────────────────────────────────

  const handleCriarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!criarTokenPara || !nomeNovoToken.trim()) return;
    setCriandoToken(true);
    try {
      const res = await axios.post("/api-backend/api-tokens", {
        empresa_id: criarTokenPara.id,
        nome: nomeNovoToken.trim(),
      }, getConfig());
      setTokenGerado({ empresa: criarTokenPara.nome, token: res.data.token });
      setNomeNovoToken("");
      setCriarTokenPara(null);
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

  const usuariosPorEmpresa = (id: number) => usuarios.filter(u => u.empresa_id === id);
  const tokensPorEmpresa = (id: number) => tokens.filter(t => t.empresa_id === id);

  // ─── estilos ──────────────────────────────────────────────────────────────

  const inputCls = "w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20";
  const labelCls = "text-xs text-zinc-400 mb-1.5 block";
  const cardCls = "bg-[#141414] border border-white/[0.06] rounded-2xl p-6";
  const primaryBtn = "bg-white hover:bg-zinc-100 text-black font-medium text-sm py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const ghostBtn = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 bg-[#1A1A1A] border border-white/[0.06] hover:border-white/15 hover:text-white transition-colors";

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
          <span className="text-sm font-medium text-white tracking-tight">Closer IA</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5">
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all border border-transparent">
            <LayoutDashboard className="w-[17px] h-[17px] text-zinc-500" strokeWidth={1.75} />
            <span className="tracking-tight">Dashboard</span>
          </a>
          <a href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-[#1E1E1E] text-white border border-white/[0.06]">
            <Users className="w-[17px] h-[17px] text-white" strokeWidth={1.75} />
            <span className="tracking-tight">Clientes</span>
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
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} title="Sair" className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors">
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Clientes</h1>
              <p className="text-sm text-zinc-500">Crie e gerencie empresas, usuários e tokens de API.</p>
            </div>
            <button onClick={fetchData} className={ghostBtn}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              Recarregar
            </button>
          </div>

          {forbidden && (
            <div className="mb-6 px-4 py-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Token desatualizado</p>
                <p className="text-xs text-amber-200/70 mb-3">Faça logout e login novamente para carregar.</p>
                <button onClick={logout} className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-100">
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} /> Fazer login novamente
                </button>
              </div>
            </div>
          )}

          {/* Novo Cliente (empresa + 1º admin de uma vez) */}
          <div className={`${cardCls} mb-6`}>
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2 text-white tracking-tight">
              <Plus className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              Novo Cliente
            </h2>
            <p className="text-xs text-zinc-500 mb-5">
              Cria a empresa + o usuário administrador em um único passo. Ele já consegue fazer login depois.
            </p>
            <form onSubmit={handleCriarCliente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nome da empresa *</label>
                <input className={inputCls} required value={novoCliente.empresa_nome}
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

              <div className="md:col-span-2 mt-2 pt-4 border-t border-white/[0.04] text-xs text-zinc-500 tracking-wide uppercase">
                Usuário administrador
              </div>

              <div>
                <label className={labelCls}>Nome *</label>
                <input className={inputCls} required value={novoCliente.usuario_nome}
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
                <label className={labelCls}>Senha provisória * <span className="text-zinc-600">(mínimo 6)</span></label>
                <input type="password" required minLength={6} className={inputCls} value={novoCliente.usuario_senha}
                  onChange={e => setNovoCliente({ ...novoCliente, usuario_senha: e.target.value })} placeholder="••••••••" />
              </div>

              {msgCliente && (
                <div className={`md:col-span-2 flex items-start gap-2 text-xs p-3 rounded-lg border ${msgCliente.ok ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : "bg-red-500/5 border-red-500/20 text-red-300"}`}>
                  {msgCliente.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{msgCliente.text}</span>
                </div>
              )}

              <div className="md:col-span-2">
                <button type="submit" disabled={criandoCliente} className={`w-full md:w-auto ${primaryBtn}`}>
                  {criandoCliente ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Criar Cliente</>}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Clientes */}
          <div className={cardCls}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-white tracking-tight">
                <Building2 className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                Clientes <span className="text-zinc-500 font-normal">({empresas.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar empresa, CNPJ, e-mail..."
                  className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 w-72" />
              </div>
            </div>

            {empresasFiltradas.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                {empresas.length === 0 ? "Nenhum cliente cadastrado. Use o formulário acima." : "Nada encontrado com esse filtro."}
              </div>
            ) : (
              <div className="space-y-2">
                {empresasFiltradas.map(emp => {
                  const isExp = expandida === emp.id;
                  const usrs = usuariosPorEmpresa(emp.id);
                  const toks = tokensPorEmpresa(emp.id);
                  return (
                    <div key={emp.id} className="rounded-xl bg-[#1A1A1A] border border-white/[0.06]">
                      <div className="flex items-center justify-between p-3">
                        <button onClick={() => setExpandida(isExp ? null : emp.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                          {isExp ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                          <div className="w-9 h-9 rounded-lg bg-[#232323] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                            {emp.nome?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white tracking-tight truncate">{emp.nome}</p>
                            <p className="text-xs text-zinc-500 truncate">
                              ID {emp.id} · {usrs.length} usuário{usrs.length !== 1 && "s"} · {toks.length} token{toks.length !== 1 && "s"}
                              {emp.cnpj && ` · ${emp.cnpj}`}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${emp.status === "active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"}`}>
                            {emp.status === "active" ? "Ativo" : emp.status || "—"}
                          </span>
                          <button onClick={() => setEditandoEmpresa({ ...emp })} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]" title="Editar empresa">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleExcluirEmpresa(emp.id, emp.nome)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10" title="Excluir empresa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isExp && (
                        <div className="border-t border-white/[0.04] p-4 space-y-5">
                          {/* Usuários */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Usuários
                              </h3>
                              <button onClick={() => setAddUsuarioPara(emp)} className={ghostBtn}>
                                <Plus className="w-3 h-3" /> Adicionar
                              </button>
                            </div>
                            {usrs.length === 0 ? (
                              <p className="text-xs text-zinc-500 py-3 text-center border border-dashed border-white/[0.05] rounded-lg">Nenhum usuário ainda.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {usrs.map(u => (
                                  <div key={u.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${u.ativo ? "bg-[#141414] border-white/[0.04]" : "bg-[#0F0F0F] border-white/[0.03] opacity-60"}`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-md bg-[#232323] border border-white/[0.06] flex items-center justify-center text-xs font-semibold">
                                        {u.nome?.charAt(0)?.toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{u.nome}</p>
                                        <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[10px] text-zinc-300 bg-[#232323] border border-white/[0.06] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <ShieldCheck className="w-2.5 h-2.5" /> {u.perfil}
                                      </span>
                                      <button onClick={() => handleToggleUsuario(u.id)} className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.05]" title={u.ativo ? "Desativar" : "Ativar"}>
                                        {u.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                      </button>
                                      <button onClick={() => handleExcluirUsuario(u.id, u.nome)} className="p-1 rounded text-zinc-400 hover:text-red-300 hover:bg-red-500/10" title="Excluir">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* API Tokens */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                                <KeyRound className="w-3.5 h-3.5" /> API Tokens
                              </h3>
                              <button onClick={() => { setCriarTokenPara(emp); setNomeNovoToken(""); }} className={ghostBtn}>
                                <Plus className="w-3 h-3" /> Gerar token
                              </button>
                            </div>
                            {toks.length === 0 ? (
                              <p className="text-xs text-zinc-500 py-3 text-center border border-dashed border-white/[0.05] rounded-lg">
                                Sem tokens. Use pra integrar a IA dessa empresa em n8n / sistemas externos.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {toks.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] border border-white/[0.04]">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium truncate">{t.nome}</p>
                                        <code className="text-[10px] text-zinc-500 bg-[#0F0F0F] px-1.5 py-0.5 rounded">{t.token_prefix}...</code>
                                      </div>
                                      <p className="text-[11px] text-zinc-500 mt-0.5">
                                        Criado {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                                        {t.last_used_at && ` · usado ${new Date(t.last_used_at).toLocaleDateString()}`}
                                      </p>
                                    </div>
                                    <button onClick={() => handleRevogarToken(t.id, t.nome)} className="p-1 rounded text-zinc-400 hover:text-red-300 hover:bg-red-500/10" title="Revogar">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal: editar empresa */}
        {editandoEmpresa && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Pencil className="w-4 h-4 text-zinc-400" /> Editar Empresa</h2>
                <button onClick={() => setEditandoEmpresa(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSalvarEmpresa} className="space-y-3">
                {[
                  { key: "nome", label: "Nome *", required: true },
                  { key: "nome_fantasia", label: "Nome Fantasia" },
                  { key: "cnpj", label: "CNPJ" },
                  { key: "email", label: "E-mail", type: "email" },
                  { key: "telefone", label: "Telefone" },
                  { key: "website", label: "Website" },
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
            </div>
          </div>
        )}

        {/* Modal: adicionar usuario extra */}
        {addUsuarioPara && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-zinc-400" /> Novo Usuário</h2>
                <button onClick={() => setAddUsuarioPara(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Empresa: <span className="text-zinc-300">{addUsuarioPara.nome}</span></p>
              <form onSubmit={handleAddUsuario} className="space-y-3">
                <div>
                  <label className={labelCls}>Nome *</label>
                  <input required className={inputCls} value={novoUsuarioExtra.nome}
                    onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, nome: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>E-mail *</label>
                  <input type="email" required className={inputCls} value={novoUsuarioExtra.email}
                    onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, email: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Senha * <span className="text-zinc-600">(min 6)</span></label>
                  <input type="password" required minLength={6} className={inputCls} value={novoUsuarioExtra.senha}
                    onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, senha: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select className={inputCls} value={novoUsuarioExtra.perfil}
                    onChange={e => setNovoUsuarioExtra({ ...novoUsuarioExtra, perfil: e.target.value })}>
                    <option value="admin">admin (gestor da empresa)</option>
                    <option value="atendente">atendente</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setAddUsuarioPara(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] text-sm font-medium">Cancelar</button>
                  <button type="submit" disabled={criandoUsuarioExtra} className={`flex-1 ${primaryBtn}`}>
                    {criandoUsuarioExtra ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: criar token */}
        {criarTokenPara && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-zinc-400" /> Novo API Token</h2>
                <button onClick={() => setCriarTokenPara(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Empresa: <span className="text-zinc-300">{criarTokenPara.nome}</span>. O token só aparece <strong>uma vez</strong> depois de criado.
              </p>
              <form onSubmit={handleCriarToken} className="space-y-3">
                <div>
                  <label className={labelCls}>Nome do token *</label>
                  <input required className={inputCls} value={nomeNovoToken}
                    onChange={e => setNomeNovoToken(e.target.value)}
                    placeholder="Ex: n8n produção, Webhook site" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setCriarTokenPara(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] text-sm font-medium">Cancelar</button>
                  <button type="submit" disabled={criandoToken} className={`flex-1 ${primaryBtn}`}>
                    {criandoToken ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: mostra token recém criado */}
        {tokenGerado && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-300">
                  <CheckCircle className="w-4 h-4" /> Token gerado para {tokenGerado.empresa}
                </h2>
                <button onClick={() => setTokenGerado(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Copie agora — esse valor não será mostrado de novo. Se perder, gere um novo.
              </p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 bg-[#0F0F0F] border border-white/[0.08] rounded-lg p-3 text-xs text-emerald-200 break-all font-mono">
                  {tokenGerado.token}
                </code>
                <button onClick={() => copiarToken(tokenGerado.token)} className={ghostBtn} title="Copiar">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-[#1A1A1A] border border-white/[0.04]">
                <p className="text-[11px] text-zinc-400 mb-1">Exemplo de uso:</p>
                <code className="text-[11px] text-zinc-300 font-mono whitespace-pre">
{`curl -X POST https://SEU-BACKEND/v1/chat \\
  -H "Authorization: Bearer ${tokenGerado.token.slice(0, 16)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Oi"}]}'`}
                </code>
              </div>
              <button onClick={() => setTokenGerado(null)} className={`w-full mt-4 ${primaryBtn}`}>Entendi, copiei</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
