import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, Code2, ShieldAlert } from 'lucide-react';

interface PlaywrightScriptExportModalProps {
  scriptCode: string;
  idPlano: string;
  onClose: () => void;
}

export const PlaywrightScriptExportModal: React.FC<PlaywrightScriptExportModalProps> = ({
  scriptCode,
  idPlano,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnbox_official_automation_${idPlano}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Script Playwright para Execução Oficial do PNBOX
              </h3>
              <p className="text-xs text-slate-400">
                Plano Alvo: <span className="font-mono text-indigo-300">{idPlano}</span> • Executa login no Sebrae e injeção direta DDP das 14 ferramentas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Para rodar localmente no terminal: <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300 border border-slate-800">node pnbox_official_automation.js</code>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-all text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Código'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-all text-xs font-semibold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar .js
            </button>
          </div>
        </div>

        {/* Code body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-indigo-900 selection:text-white">
            {scriptCode}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Credenciais e URLs oficiais já embutidas e preparadas.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
