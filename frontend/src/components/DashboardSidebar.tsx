"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Brain, Network, Settings, LogOut,
  BarChart3, MessageSquare, Menu, X, Calendar, Users, Star,
  Scissors, UserCheck, ChevronsUpDown, Search, Sparkles
} from "lucide-react";

interface SidebarProps {
  activePage?: string;
}

const navItemsRaw = [
  { label: "Visão Geral", icon: LayoutDashboard, href: "/dashboard", id: "dashboard" },
  { label: "Insights IA", icon: BarChart3, href: "/dashboard/insights", id: "insights" },
  { label: "Conversas", icon: MessageSquare, href: "/dashboard/conversas", id: "conversas" },
  { label: "Agenda", icon: Calendar, href: "/dashboard/agenda", id: "agenda" },
  { label: "Barbeiros", icon: Users, href: "/dashboard/barbeiros", id: "barbeiros" },
  { label: "Personalidade IA", icon: Brain, href: "/dashboard/personality", id: "personality" },
  { label: "Serviços", icon: Scissors, href: "/dashboard/servicos", id: "servicos" },
  { label: "Avaliações", icon: Star, href: "/dashboard/avaliacoes", id: "avaliacoes" },
  { label: "Clientes", icon: UserCheck, href: "/dashboard/clientes", id: "clientes" },
  { label: "Mensagens", icon: MessageSquare, href: "/dashboard/mensagens", id: "mensagens" },
  { label: "Integrações", icon: Network, href: "/dashboard/integrations", id: "integrations" },
];

const navItems = navItemsRaw.filter((item, index, all) => (
  all.findIndex((candidate) => candidate.id === item.id && candidate.href === item.href) === index
));

export default function DashboardSidebar({ activePage = "dashboard" }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api-backend/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Brand selector — Lunor-style */}
      <button
        onClick={() => window.location.href = "/dashboard"}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] hover:border-white/10 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-white tracking-tight">Closer IA</span>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Buscar"
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-transparent border border-white/[0.06] rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/15"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-[#232323] border border-white/[0.08] rounded">
          /
        </kbd>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto -mx-1 px-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-[#1E1E1E] text-white border border-white/[0.06]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <item.icon
                className={`w-[17px] h-[17px] flex-shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`}
                strokeWidth={1.75}
              />
              <span className="tracking-tight">{item.label}</span>
            </a>
          );
        })}

        {user?.perfil === "admin_master" && (
          <>
            <div className="my-2 border-t border-white/[0.06]" />
            <a
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all border border-transparent"
            >
              <Settings className="w-[17px] h-[17px] flex-shrink-0 text-zinc-500" strokeWidth={1.75} />
              <span className="tracking-tight">Painel Master</span>
            </a>
          </>
        )}
      </nav>

      {/* Upgrade CTA — Lunor-style */}
      <div className="relative p-4 rounded-xl bg-[#141414] border border-white/[0.06]">
        <div className="w-9 h-9 rounded-lg bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center mb-3">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-semibold text-white tracking-tight mb-1">Ativar Premium</p>
        <p className="text-xs text-zinc-500 leading-snug mb-3">
          Agendamentos ilimitados e personalização total da marca.
        </p>
        <button className="w-full py-2 text-xs font-medium text-white bg-[#232323] hover:bg-[#2A2A2A] border border-white/[0.08] rounded-lg transition-colors">
          Fazer upgrade
        </button>
      </div>

      {/* User Footer */}
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
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#141414] border border-white/[0.08] rounded-xl text-white"
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0A0A0A] border-r border-white/[0.06] transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-4 p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 z-10"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 bg-[#0A0A0A] border-r border-white/[0.06] min-h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
