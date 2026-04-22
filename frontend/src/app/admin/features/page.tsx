"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowLeft, Sparkles, Save, Loader2, Wand2 } from "lucide-react";

type Empresa = {
  id: number;
  nome: string;
  nome_fantasia?: string;
};

type FeatureRow = {
  key: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  ativo: boolean;
};

export default function AdminFeaturesPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [presets, setPresets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const getConfig = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Load empresas + presets
  useEffect(() => {
    (async () => {
      try {
        const [empRes, presetsRes] = await Promise.all([
          axios.get<Empresa[]>("/api-backend/auth/empresas", getConfig()),
          axios.get<Record<string, string[]>>("/api-backend/auth/presets", getConfig()),
        ]);
        setEmpresas(empRes.data);
        setPresets(presetsRes.data);
        if (empRes.data.length > 0) setSelecionada(empRes.data[0].id);
      } catch (err: any) {
        setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao carregar empresas." });
      }
    })();
  }, []);

  // Load features when empresa changes
  useEffect(() => {
    if (!selecionada) return;
    setLoading(true);
    setMsg(null);
    axios
      .get<FeatureRow[]>(`/api-backend/auth/empresas/${selecionada}/features`, getConfig())
      .then((res) => setFeatures(res.data))
      .catch((err) =>
        setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao carregar features." })
      )
      .finally(() => setLoading(false));
  }, [selecionada]);

  const porCategoria = useMemo(() => {
    const grupos: Record<string, FeatureRow[]> = {};
    for (const f of features) {
      (grupos[f.categoria] ??= []).push(f);
    }
    return grupos;
  }, [features]);

  const toggle = (key: string) => {
    setFeatures((prev) => prev.map((f) => (f.key === key ? { ...f, ativo: !f.ativo } : f)));
  };

  const salvar = async () => {
    if (!selecionada) return;
    setSalvando(true);
    setMsg(null);
    try {
      const payload = {
        features: Object.fromEntries(features.map((f) => [f.key, f.ativo])),
      };
      await axios.put(
        `/api-backend/auth/empresas/${selecionada}/features`,
        payload,
        getConfig()
      );
      setMsg({ ok: true, text: "Features atualizadas com sucesso." });
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao salvar." });
    } finally {
      setSalvando(false);
    }
  };

  const aplicarPreset = async (preset: string) => {
    if (!selecionada) return;
    if (!confirm(`Aplicar preset "${preset}"? Isso substitui as features atuais.`)) return;
    setSalvando(true);
    setMsg(null);
    try {
      await axios.post(
        `/api-backend/auth/empresas/${selecionada}/features/preset`,
        { preset },
        getConfig()
      );
      // reload
      const res = await axios.get<FeatureRow[]>(
        `/api-backend/auth/empresas/${selecionada}/features`,
        getConfig()
      );
      setFeatures(res.data);
      setMsg({ ok: true, text: `Preset "${preset}" aplicado.` });
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.detail || "Erro ao aplicar preset." });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Voltar ao Painel Master
            </a>
            <h1 className="text-2xl font-semibold tracking-tight">Features por Empresa</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Controle quais módulos cada empresa enxerga e usa.
            </p>
          </div>
          <Sparkles className="w-6 h-6 text-zinc-600" strokeWidth={1.5} />
        </div>

        {/* Empresa selector + presets */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 mb-5">
          <label className="block text-xs text-zinc-400 mb-2">Empresa</label>
          <select
            value={selecionada ?? ""}
            onChange={(e) => setSelecionada(Number(e.target.value))}
            className="w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} {e.nome_fantasia ? `— ${e.nome_fantasia}` : ""}
              </option>
            ))}
          </select>

          {Object.keys(presets).length > 0 && (
            <div className="mt-4">
              <label className="block text-xs text-zinc-400 mb-2">Presets rápidos</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(presets).map(([nome, keys]) => (
                  <button
                    key={nome}
                    onClick={() => aplicarPreset(nome)}
                    disabled={salvando}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1A1A1A] border border-white/[0.08] hover:border-white/20 rounded-lg transition-colors disabled:opacity-50"
                    title={keys.join(", ")}
                  >
                    <Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="capitalize">{nome}</span>
                    <span className="text-zinc-500">({keys.length})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {msg && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
              msg.ok
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/5 border-red-500/20 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Features grid */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(porCategoria).map(([categoria, lista]) => (
                <div key={categoria}>
                  <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                    {categoria}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {lista.map((f) => (
                      <label
                        key={f.key}
                        className="flex items-start gap-3 p-3 bg-[#1A1A1A] border border-white/[0.06] hover:border-white/10 rounded-xl cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={f.ativo}
                          onChange={() => toggle(f.key)}
                          className="mt-0.5 accent-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white tracking-tight">
                            {f.nome}
                          </p>
                          {f.descricao && (
                            <p className="text-xs text-zinc-500 mt-0.5">{f.descricao}</p>
                          )}
                          <p className="text-[10px] font-mono text-zinc-600 mt-1">{f.key}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="sticky bottom-6 mt-6 flex justify-end">
          <button
            onClick={salvar}
            disabled={salvando || loading}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-zinc-100 text-black font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="w-4 h-4" strokeWidth={2} />
            )}
            Salvar features
          </button>
        </div>
      </div>
    </div>
  );
}
