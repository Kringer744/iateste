"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Building2, Mail, Plus, LogOut, LayoutDashboard,
  Loader2, CheckCircle, AlertCircle, Users,
  Pencil, Trash2, X, UserCheck, UserX, ShieldCheck,
  Settings, Sparkles, RefreshCw
} from "lucide-react";

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

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);

  // Criar empresa
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: "", nome_fantasia: "", cnpj: "", email: "", telefone: "" });
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);
  const [msgEmpresa, setMsgEmpresa] = useState<{ ok: boolean; text: string } | null>(null);

  // Editar empresa
  const [editando, setEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [msgEdit, setMsgEdit] = useState<{ ok: boolean; text: string } | null>(null);

  // Criar usuário direto
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", senha: "", empresa_id: "", perfil: "admin" });
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [msgUsuario, setMsgUsuario] = useState<{ ok: boolean; text: string } | null>(null);

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
      const [empRes, usersRes] = await Promise.all([
        axios.get<Empresa[]>("/api-backend/auth/empresas", getConfig()),
        axios.get<Usuario[]>("/api-backend/auth/usuarios", getConfig()),
      ]);
      setEmpresas(empRes.data);
      setUsuarios(usersRes.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setForbidden(true);
      } else {
        setMsgEmpresa({ ok: false, text: err.response?.data?.detail || "Erro ao carregar dados." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriandoEmpresa(true);
    setMsgEmpresa(null);
    try {
      await axios.post("/api-backend/auth/create-empresa", novaEmpresa, getConfig());
      setMsgEmpresa({ ok: true, text: `Empresa "${novaEmpresa.nome}" criada com sucesso.` });
      setNovaEmpresa({ nome: "", nome_fantasia: "", cnpj: "", email: "", telefone: "" });
      await fetchData();
    } catch (err: any) {
      setMsgEmpresa({ ok: false, text: err.response?.data?.detail || "Erro ao criar empresa." });
    } finally {
      setCriandoEmpresa(false);
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMsgEdit(null);
    try {
      await axios.put(`/api-backend/auth/empresas/${editando.id}`, editando, getConfig());
      setMsgEdit({ ok: true, text: "Empresa atualizada com sucesso." });
      await fetchData();
      setTimeout(() => { setEditando(null); setMsgEdit(null); }, 1000);
    } catch (err: any) {
      setMsgEdit({ ok: false, text: err.response?.data?.detail || "Erro ao atualizar empresa." });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: number) => {
    setExcluindoId(id);
    try {
      await axios.delete(`/api-backend/auth/empresas/${id}`, getConfig());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao excluir empresa.");
    } finally {
      setExcluindoId(null);
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
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`/api-backend/auth/usuarios/${id}`, getConfig());
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao excluir usuário.");
    }
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuario.empresa_id) {
      setMsgUsuario({ ok: false, text: "Selecione uma empresa." });
      return;
    }
    if (novoUsuario.senha.length < 6) {
      setMsgUsuario({ ok: false, text: "Senha deve ter ao menos 6 caracteres." });
      return;
    }
    setCriandoUsuario(true);
    setMsgUsuario(null);
    try {
      await axios.post(
        "/api-backend/auth/usuarios",
        {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          senha: novoUsuario.senha,
          empresa_id: Number(novoUsuario.empresa_id),
          perfil: novoUsuario.perfil,
        },
        getConfig()
      );
      setMsgUsuario({ ok: true, text: `Usuário ${novoUsuario.email} criado. Já pode fazer login.` });
      setNovoUsuario({ nome: "", email: "", senha: "", empresa_id: "", perfil: "admin" });
      await fetchData();
    } catch (err: any) {
      setMsgUsuario({ ok: false, text: err.response?.data?.detail || "Erro ao criar usuário." });
    } finally {
      setCriandoUsuario(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20";
  const labelCls = "text-xs text-zinc-400 mb-1.5 block";
  const cardCls = "bg-[#141414] border border-white/[0.06] rounded-2xl p-6";
  const primaryBtn =
    "bg-white hover:bg-zinc-100 text-black font-medium text-sm py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/[0.06] bg-[#0A0A0A] hidden lg:flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] mb-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-white tracking-tight">Closer IA</span>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all border border-transparent"
          >
            <LayoutDashboard className="w-[17px] h-[17px] text-zinc-500" strokeWidth={1.75} />
            <span className="tracking-tight">Dashboard</span>
          </a>
          <a
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-[#1E1E1E] text-white border border-white/[0.06]"
          >
            <Building2 className="w-[17px] h-[17px] text-white" strokeWidth={1.75} />
            <span className="tracking-tight">Painel Master</span>
          </a>
          <a
            href="/admin/features"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all border border-transparent"
          >
            <Settings className="w-[17px] h-[17px] text-zinc-500" strokeWidth={1.75} />
            <span className="tracking-tight">Features</span>
          </a>
        </nav>

        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl border-t border-white/[0.04] pt-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white tracking-tight">{user?.nome}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
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
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Painel Master</h1>
              <p className="text-sm text-zinc-500">Gerencie empresas, usuários e convites de acesso.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] rounded-xl text-xs text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                Recarregar
              </button>
              <a
                href="/admin/features"
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] rounded-xl text-xs text-zinc-300 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                Features por empresa
              </a>
            </div>
          </div>

          {/* Stale JWT banner */}
          {forbidden && (
            <div className="mb-6 px-4 py-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Token desatualizado</p>
                <p className="text-xs text-amber-200/70 mb-3">
                  Seu perfil foi promovido para admin_master, mas o token atual ainda carrega o perfil antigo.
                  Faça logout e login novamente para carregar empresas e usuários.
                </p>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Fazer login novamente
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Criar empresa */}
            <div className={cardCls}>
              <h2 className="text-sm font-semibold mb-5 flex items-center gap-2 text-white tracking-tight">
                <Plus className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                Nova Empresa
              </h2>
              <form onSubmit={handleCriarEmpresa} className="space-y-3">
                <div>
                  <label className={labelCls}>Nome *</label>
                  <input
                    type="text"
                    value={novaEmpresa.nome}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                    placeholder="Nome da empresa"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Nome Fantasia</label>
                  <input
                    type="text"
                    value={novaEmpresa.nome_fantasia}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome_fantasia: e.target.value })}
                    placeholder="Nome fantasia"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>CNPJ</label>
                  <input
                    type="text"
                    value={novaEmpresa.cnpj}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input
                    type="email"
                    value={novaEmpresa.email}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <input
                    type="text"
                    value={novaEmpresa.telefone}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className={inputCls}
                  />
                </div>
                {msgEmpresa && (
                  <div
                    className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                      msgEmpresa.ok
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/5 border-red-500/20 text-red-300"
                    }`}
                  >
                    {msgEmpresa.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{msgEmpresa.text}</span>
                  </div>
                )}
                <button type="submit" disabled={criandoEmpresa} className={`w-full ${primaryBtn}`}>
                  {criandoEmpresa ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" strokeWidth={2} /> Criar Empresa</>}
                </button>
              </form>
            </div>

            {/* Criar usuário direto (email + senha) */}
            <div className={cardCls}>
              <h2 className="text-sm font-semibold mb-5 flex items-center gap-2 text-white tracking-tight">
                <UserCheck className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                Criar Usuário
              </h2>
              <p className="text-xs text-zinc-500 mb-4 -mt-3">
                Define e-mail e senha direto — o usuário já consegue acessar a empresa.
              </p>
              <form onSubmit={handleCriarUsuario} className="space-y-3">
                <div>
                  <label className={labelCls}>Empresa *</label>
                  <select
                    value={novoUsuario.empresa_id}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, empresa_id: e.target.value })}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecione a empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nome *</label>
                  <input
                    type="text"
                    value={novoUsuario.nome}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                    placeholder="Nome do usuário"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                    <input
                      type="email"
                      value={novoUsuario.email}
                      onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                      placeholder="gestor@empresa.com"
                      className={`${inputCls} pl-10`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Senha * <span className="text-zinc-600">(mínimo 6 caracteres)</span></label>
                  <input
                    type="password"
                    value={novoUsuario.senha}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                    placeholder="••••••••"
                    className={inputCls}
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select
                    value={novoUsuario.perfil}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, perfil: e.target.value })}
                    className={inputCls}
                  >
                    <option value="admin">admin (gestor da empresa)</option>
                    <option value="atendente">atendente</option>
                    <option value="admin_master">admin_master (acesso total)</option>
                  </select>
                </div>
                {msgUsuario && (
                  <div
                    className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                      msgUsuario.ok
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/5 border-red-500/20 text-red-300"
                    }`}
                  >
                    {msgUsuario.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{msgUsuario.text}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={criandoUsuario || empresas.length === 0}
                  className={`w-full ${primaryBtn}`}
                >
                  {criandoUsuario ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" strokeWidth={2} /> Criar Usuário</>}
                </button>
                {empresas.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center">Crie uma empresa primeiro para poder adicionar usuários.</p>
                )}
              </form>
            </div>
          </div>

          {/* Lista de empresas — SEMPRE renderiza */}
          <div className={`${cardCls} mt-6`}>
            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2 text-white tracking-tight">
              <Building2 className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              Empresas Cadastradas <span className="text-zinc-500 font-normal">({empresas.length})</span>
            </h2>
            {empresas.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                {forbidden
                  ? "Sem acesso — faça login novamente para carregar a lista."
                  : "Nenhuma empresa cadastrada ainda. Use o formulário acima."}
              </div>
            ) : (
              <div className="space-y-2">
                {empresas.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-white/[0.06] hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#232323] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                        {emp.nome?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white tracking-tight truncate">{emp.nome}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {emp.cnpj || "CNPJ não informado"} · {emp.email || "sem e-mail"} · ID {emp.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-medium px-2 py-1 rounded-full border ${
                          emp.status === "active"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {emp.status === "active" ? "Ativo" : emp.status || "—"}
                      </span>
                      <button
                        onClick={() => { setEditando({ ...emp }); setMsgEdit(null); }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Excluir a empresa "${emp.nome}"? Esta ação não pode ser desfeita.`)) handleExcluir(emp.id); }}
                        disabled={excluindoId === emp.id}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {excluindoId === emp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de usuários — SEMPRE renderiza */}
          <div className={`${cardCls} mt-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-white tracking-tight">
                <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                Usuários <span className="text-zinc-500 font-normal">({usuarios.length})</span>
              </h2>
              {empresas.length > 0 && (
                <select
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                  className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-white/20"
                >
                  <option value="">Todas as empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={String(emp.id)}>{emp.nome}</option>
                  ))}
                </select>
              )}
            </div>
            {usuarios.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                {forbidden
                  ? "Sem acesso — faça login novamente para carregar a lista."
                  : "Nenhum usuário cadastrado ainda. Envie convites acima."}
              </div>
            ) : (
              <div className="space-y-2">
                {usuarios
                  .filter((u) => !filtroEmpresa || String(u.empresa_id) === filtroEmpresa)
                  .map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        u.ativo
                          ? "bg-[#1A1A1A] border-white/[0.06] hover:border-white/10"
                          : "bg-[#141414] border-white/[0.04] opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#232323] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {u.nome?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white tracking-tight truncate">{u.nome}</p>
                          <p className="text-xs text-zinc-500 truncate">{u.email} · {u.empresa_nome}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-medium text-zinc-300 bg-[#232323] border border-white/[0.08] px-2 py-1 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
                          {u.perfil}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-1 rounded-full border ${
                            u.ativo
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                              : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                        <button
                          onClick={() => handleToggleUsuario(u.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                          title={u.ativo ? "Desativar" : "Ativar"}
                        >
                          {u.ativo ? <UserX className="w-4 h-4" strokeWidth={1.75} /> : <UserCheck className="w-4 h-4" strokeWidth={1.75} />}
                        </button>
                        <button
                          onClick={() => handleExcluirUsuario(u.id, u.nome)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Modal editar empresa */}
          {editando && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold flex items-center gap-2 tracking-tight">
                    <Pencil className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                    Editar Empresa
                  </h2>
                  <button
                    onClick={() => setEditando(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <form onSubmit={handleSalvarEdicao} className="space-y-3">
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
                      <input
                        type={type || "text"}
                        value={editando[key] || ""}
                        onChange={(e) => setEditando({ ...editando, [key]: e.target.value })}
                        required={required}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  {msgEdit && (
                    <div
                      className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                        msgEdit.ok
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                          : "bg-red-500/5 border-red-500/20 text-red-300"
                      }`}
                    >
                      {msgEdit.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span>{msgEdit.text}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvando} className={`flex-1 ${primaryBtn}`}>
                      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
