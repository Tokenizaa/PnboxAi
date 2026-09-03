import React from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Activity,
  Database,
  Wifi,
  WifiOff,
  KeyRound,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SystemPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-400" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 mt-1">Gerencie conta, sessão PNBOX, IA providers e integrações técnicas</p>
      </div>

      {/* Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Conta
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">Nome</p>
              <p className="text-white font-medium">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
              Verificado
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">ID da Conta</p>
              <p className="text-white font-mono text-xs">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PNBOX Session */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-cyan-400" />
          Sessão PNBOX (Sebrae)
        </h2>
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-300">Sessão Independente</p>
            <p className="text-xs text-amber-200/80 mt-1">
              A sessão PNBOX é independente da conta do PNBOXAI. Você pode usar DRY_RUN sem autenticar.
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Acesse a aba "Execução" de qualquer plano para autenticar via OIDC Playwright.
        </p>
      </div>

      {/* AI Providers */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Provedores de IA
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Gemini */}
          <ProviderCard
            name="Google Gemini"
            model="gemini-3.7-flash"
            available={true}
            hasGrounding={true}
            color="indigo"
          />

          {/* NVIDIA */}
          <ProviderCard
            name="NVIDIA NIM"
            model="3 contas disponíveis"
            available={true}
            color="emerald"
          />
        </div>
      </div>

      {/* Technical Tools */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-400" />
          Ferramentas Técnicas
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          Acesso às ferramentas técnicas avançadas: mapa técnico, monitor de tráfego, validador JSON e documentação.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TechTool name="Mapa Técnico" description="Catálogo das 14 ferramentas" />
          <TechTool name="Monitor de Tráfego" description="Requests XHR/WS DDP" />
          <TechTool name="Validador JSON" description="Diff com schema" />
          <TechTool name="Documentação" description="Guia de campos" />
        </div>
      </div>

      {/* Schema Catalog Info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Schema Catalog como Single Source of Truth</p>
          <p className="text-xs text-slate-400 mt-1">
            Todos os schemas das 14 ferramentas PNBOX vêm de <code className="px-1 py-0.5 bg-slate-950 rounded font-mono text-xs">schemaCatalog.ts</code>. Nenhuma duplicação em Research Engine ou Prompts.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  model,
  available,
  hasGrounding,
  color,
}: {
  name: string;
  model: string;
  available: boolean;
  hasGrounding?: boolean;
  color: 'indigo' | 'emerald';
}) {
  const colors = {
    indigo: 'border-indigo-500/20 bg-indigo-500/10',
    emerald: 'border-emerald-500/20 bg-emerald-500/10',
  };

  return (
    <div className={`p-4 bg-slate-950 border rounded-2xl ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white">{name}</span>
        {available ? (
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
            Disponível
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs font-bold bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/30">
            Indisponível
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 font-mono">{model}</p>
      {hasGrounding && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300">
          <Sparkles className="w-3 h-3" />
          <span>Google Search Grounding</span>
        </div>
      )}
    </div>
  );
}

function TechTool({ name, description }: { name: string; description: string }) {
  return (
    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
      <p className="text-sm font-bold text-white">{name}</p>
      <p className="text-xs text-slate-400 mt-0.5">{description}</p>
    </div>
  );
}