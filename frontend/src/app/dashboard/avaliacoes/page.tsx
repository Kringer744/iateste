"use client";

import React, { useState, useEffect } from "react";
import { Star, ChevronDown, User, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import DashboardSidebar from "@/components/DashboardSidebar";

// ─── Types ────────────────────────────────────────────────────────
interface Barbeiro {
  id: number;
  nome: string;
}

interface Avaliacao {
  id: number;
  nota: number;
  nome_cliente: string;
  data: string;
  comentario?: string;
}

interface MediaData {
  media: number;
  total: number;
}

interface AvaliacoesResponse {
  media: MediaData;
  avaliacoes: Avaliacao[];
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= rating
              ? "text-[#D4AF37] fill-[#D4AF37]"
              : "text-gray-600"
          }
        />
      ))}
    </div>
  );
}

// ─── Animation variants ───────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

// ─── Page Component ───────────────────────────────────────────────
export default function AvaliacoesPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  // Load barbers
  useEffect(() => {
    if (!token) return;
    axios
      .get("/api-backend/agendamento/barbeiros", { headers })
      .then((res) => setBarbeiros(res.data))
      .catch(() => {});
  }, [token]);

  // Load reviews when barber selected
  useEffect(() => {
    if (!token || !selectedBarbeiro) return;
    setLoading(true);
    axios
      .get<AvaliacoesResponse>(
        `/api-backend/agendamento/avaliacoes/${selectedBarbeiro}`,
        { headers }
      )
      .then((res) => {
        setMediaData(res.data.media);
        setAvaliacoes(res.data.avaliacoes);
      })
      .catch(() => {
        setMediaData(null);
        setAvaliacoes([]);
      })
      .finally(() => setLoading(false));
  }, [token, selectedBarbeiro]);

  // Star distribution
  const starDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = avaliacoes.filter((a) => a.nota === star).length;
    const pct = avaliacoes.length > 0 ? (count / avaliacoes.length) * 100 : 0;
    return { star, count, pct };
  });

  const selectedBarberName =
    barbeiros.find((b) => b.id === selectedBarbeiro)?.nome ?? "";

  return (
    <div className="flex min-h-screen bg-[#09090f]">
      <DashboardSidebar activePage="avaliacoes" />

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Avalia{"\u00e7\u00f5"}es
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Acompanhe a satisfa{"\u00e7\u00e3"}o dos clientes por barbeiro
          </p>
        </motion.div>

        {/* Barber Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 relative max-w-sm"
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white hover:border-[#D4AF37]/40 transition-all backdrop-blur-xl"
          >
            <span className={selectedBarbeiro ? "text-white" : "text-gray-500"}>
              {selectedBarbeiro ? selectedBarberName : "Selecione um barbeiro"}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute z-30 mt-2 w-full bg-[#12121a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
              >
                {barbeiros.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBarbeiro(b.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-all hover:bg-white/5 ${
                      selectedBarbeiro === b.id
                        ? "text-[#D4AF37] bg-[#D4AF37]/5"
                        : "text-gray-300"
                    }`}
                  >
                    {b.nome}
                  </button>
                ))}
                {barbeiros.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    Nenhum barbeiro encontrado
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
          </div>
        )}

        {/* Content */}
        {!loading && selectedBarbeiro && mediaData && (
          <div className="space-y-6">
            {/* Top cards row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Big Rating Card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-xl"
              >
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-[#D4AF37]">
                      {mediaData.media.toFixed(1)}
                    </p>
                    <div className="mt-2">
                      <StarRating
                        rating={Math.round(mediaData.media)}
                        size={20}
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      {mediaData.total}{" "}
                      {mediaData.total === 1 ? "avalia\u00e7\u00e3o" : "avalia\u00e7\u00f5es"}
                    </p>
                  </div>
                  <div className="flex-1 pl-6 border-l border-white/10">
                    <p className="text-sm font-medium text-gray-400 mb-1">
                      Barbeiro
                    </p>
                    <p className="text-lg font-bold text-white">
                      {selectedBarberName}
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      M{"\u00e9"}dia baseada em todas as avalia{"\u00e7\u00f5"}es recebidas
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Star Distribution Card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-xl"
              >
                <p className="text-sm font-semibold text-gray-400 mb-4">
                  Distribui{"\u00e7\u00e3"}o de Notas
                </p>
                <div className="space-y-3">
                  {starDistribution.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-12 flex items-center gap-1">
                        {star}{" "}
                        <Star
                          size={12}
                          className="text-[#D4AF37] fill-[#D4AF37]"
                        />
                      </span>
                      <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.2 + star * 0.05,
                          }}
                          className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B]"
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {pct.toFixed(0)}% ({count})
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Reviews List */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <p className="text-sm font-semibold text-gray-400 mb-4">
                Avalia{"\u00e7\u00f5"}es Recentes
              </p>

              {avaliacoes.length === 0 && (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center backdrop-blur-xl">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    Nenhuma avalia{"\u00e7\u00e3"}o encontrada para este barbeiro.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {avaliacoes.map((av, idx) => (
                  <motion.div
                    key={av.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx + 3}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-xl hover:border-[#D4AF37]/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8860B]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {av.nome_cliente}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <StarRating rating={av.nota} size={14} />
                            <span className="text-xs text-gray-500">
                              {formatDate(av.data)}
                            </span>
                          </div>
                          {av.comentario && (
                            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                              {av.comentario}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-lg font-bold text-[#D4AF37] flex-shrink-0">
                        {av.nota}.0
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Empty state - no barber selected */}
        {!loading && !selectedBarbeiro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center backdrop-blur-xl"
          >
            <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              Selecione um barbeiro para visualizar suas avalia{"\u00e7\u00f5"}es
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
