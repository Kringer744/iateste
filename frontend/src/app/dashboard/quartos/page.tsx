"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BedDouble, Plus, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, AlertCircle, Users,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";

type Quarto = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number | null;
  capacidade: number;
  comodidades: string | null;
  ativo: boolean;
  ordem: number;
};

type FormState = {
  nome: string;
  descricao: string;
  preco: string;
  capacidade: string;
  comodidades: string;
  ativo: boolean;
  ordem: string;
};

const emptyForm: FormState = {
  nome: "", descricao: "", preco: "", capacidade: "2",
  comodidades: "", ativo: true, ordem: "0",
};

export default function QuartosPage() {
  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Quarto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [salvando, setSalvando] = useState(false);

  const getConfig = () => ({
    headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}` },
  });

  const fetchQuartos = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Quarto[]>("/api-backend/quartos", getConfig());
      setQuartos(res.data);
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao carregar quartos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuartos(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm(emptyForm);
    setMsg(null);
    setModalOpen(true);
  };

  const abrirEdicao = (q: Quarto) => {
    setEditando(q);
    setForm({
      nome: q.nome,
      descricao: q.descricao || "",
      preco: q.preco != null ? String(q.preco) : "",
      capacidade: String(q.capacidade),
      comodidades: q.comodidades || "",
      ativo: q.ativo,
      ordem: String(q.ordem),
    });
    setMsg(null);
    setModalOpen(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        preco: form.preco ? Number(form.preco) : null,
        capacidade: Number(form.capacidade) || 2,
        comodidades: form.comodidades || null,
        ativo: form.ativo,
        ordem: Number(form.ordem) || 0,
      };
      if (editando) {
        await axios.put(`/api-backend/quartos/${editando.id}`, payload, getConfig());
      } else {
        await axios.post("/api-backend/quartos", payload, getConfig());
      }
      setModalOpen(false);
      await fetchQuartos();
      setMsg({ ok: true, text: editando ? "Quarto atualizado." : "Quarto criado." });
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao salvar." });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (q: Quarto) => {
    if (!confirm(`Excluir "${q.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`/api-backend/quartos/${q.id}`, getConfig());
      await fetchQuartos();
      setMsg({ ok: true, text: "Quarto excluído." });
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao excluir." });
    }
  };

  const inputCls =
    "w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20";
  const labelCls = "text-xs text-zinc-400 mb-1.5 block";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <DashboardSidebar activePage="quartos" />

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1 flex items-center gap-2">
                <BedDouble className="w-6 h-6 text-zinc-400" strokeWidth={1.75} />
                Quartos
              </h1>
              <p className="text-sm text-zinc-500">
                Categorias, preços e comodidades que a IA usa nas conversas.
              </p>
            </div>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-100 text-black font-medium text-sm rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Novo Quarto
            </button>
          </div>

          {msg && (
            <div
              className={`mb-5 flex items-start gap-2 text-xs p-3 rounded-lg border ${
                msg.ok
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/5 border-red-500/20 text-red-300"
              }`}
            >
              {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{msg.text}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : quartos.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#141414] border border-white/[0.06] text-center">
              <BedDouble className="w-7 h-7 text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-zinc-400 mb-1">Nenhum quarto cadastrado ainda.</p>
              <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                Adicione as categorias de quartos do hotel. A IA vai usar essas informações para
                responder sobre disponibilidade, preços e comodidades durante as conversas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quartos.map((q) => (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-colors ${
                    q.ativo
                      ? "bg-[#141414] border-white/[0.06] hover:border-white/10"
                      : "bg-[#0F0F0F] border-white/[0.04] opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-white tracking-tight truncate">{q.nome}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        {q.preco != null && (
                          <span className="tabular-nums">R$ {Number(q.preco).toFixed(2)}/diária</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" strokeWidth={1.75} />
                          {q.capacidade} hósp.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-medium px-2 py-1 rounded-full border ${
                          q.ativo
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {q.ativo ? "Ativo" : "Inativo"}
                      </span>
                      <button
                        onClick={() => abrirEdicao(q)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => excluir(q)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  {q.descricao && (
                    <p className="text-xs text-zinc-400 leading-relaxed mb-2">{q.descricao}</p>
                  )}
                  {q.comodidades && (
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      <span className="text-zinc-600">Comodidades:</span> {q.comodidades}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 tracking-tight">
                <BedDouble className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                {editando ? "Editar Quarto" : "Novo Quarto"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className={labelCls}>Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Suíte Master, Standard Duplo, Presidencial..."
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Suíte com vista para o mar, cama king size, varanda privativa..."
                  className={`${inputCls} min-h-[80px]`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Preço/diária (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    placeholder="350.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Capacidade</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacidade}
                    onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Comodidades</label>
                <input
                  type="text"
                  value={form.comodidades}
                  onChange={(e) => setForm({ ...form, comodidades: e.target.value })}
                  placeholder="Ar-condicionado, TV smart, frigobar, Wi-Fi, café da manhã"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ordem (exibição)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={form.ativo ? "1" : "0"}
                    onChange={(e) => setForm({ ...form, ativo: e.target.value === "1" })}
                    className={inputCls}
                  >
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.03] transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-zinc-100 text-black font-medium text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" strokeWidth={2} /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
