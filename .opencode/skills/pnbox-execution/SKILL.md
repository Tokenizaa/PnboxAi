---
name: pnbox-execution
description: Use quando for orquestrar ou executar o ciclo controlado de preenchimento do PNBOX — protocolo MAPEAR → VALIDAR MAPA → PREPARAR DADOS → EXECUTAR → VALIDAR → REGISTRAR. Gatilhos: "executar PNBOX", "preencher plano de negócios", "ciclo pnbox", "supervisor pnbox".
---

# pnbox-execution

Protocolo de execução controlada do PNBOX. Fases obrigatórias, gates
bloqueantes, estado persistente em disco.

## 1. Protocolo (6 fases)

```
MAPEAR → VALIDAR MAPA → PREPARAR DADOS → EXECUTAR → VALIDAR → REGISTRAR
```

| Fase | Executor | Saída | Gate p/ avançar |
| ---- | -------- | ----- | --------------- |
| 1. MAPEAR | discovery (+navigator/component-mapper/flow-mapper) | `docs/pnbox/runtime/NN-*.json` (14) | 14/14 arquivos com componentes+flow REAIS |
| 2. VALIDAR MAPA | supervisor | aprovação por ferramenta | nenhum campo `missing` não resolvido |
| 3. PREPARAR DADOS | preparation (+knowledge-reader/data-validator/dependency-validator) | `execucao/pacotes/NN-*.json` | zero `PENDENTE` sem reporte; dependências ok |
| 4. EXECUTAR | execution (+tool-executor/persistence-checker) | estado `execution=done` | persistência comprovada por ferramenta |
| 5. VALIDAR | validation (+field/consistency/final-validator) | veredito 14/14 | `APROVADO` com evidência |
| 6. REGISTRAR | execution/supervisor | logs + estado + evidencias | arquivos gravados |

## 2. Regras de coordenação (supervisor)

- **Nenhuma ferramenta é preenchida sem runtime-map confirmado** (Fase 2).
- Uma ferramenta por vez na Fase 4; troca de fase só com gate passado.
- Divergência (label, campo, valor) → pausa, reporte, decisão — nunca
  adaptação silenciosa.

## 3. Estado persistente

Arquivo canônico: `docs/pnbox/execucao/estado.json`

```json
{
  "fase": "EXECUTION",
  "ferramentas": {
    "01-cliente-mercado": {
      "map": true, "pacote": true, "execution": "done",
      "persistencia": true, "field_check": "ok", "consistencia": "ok"
    }
  },
  "bloqueios": ["campo X sem origem (02)"],
  "ultima_atualizacao": "ISO8601"
}
```

Logs por ferramenta: `docs/pnbox/execucao/NN-*.md` (dados aplicados,
evidência, validação, observações — conforme modelo do README existente).
Evidências visuais: `docs/pnbox/evidencias/`.

## 4. Ordem de execução (dependências)

`01-cliente-mercado → 02-segmentacao → 03-personas → 04-jornada →
05-proposta-valor → 06-concorrencia → 07-canais → 08-funil →
09-investimento → 10-ganhos → 11-custos → 12-dre → 13-indicadores →
14-simulador`

## 5. Parada e retomada

- Interrupção a qualquer momento: estado em disco permite retomar da fase/
  ferramenta corrente. Carregar `estado.json` antes de agir (Universal Agent
  Protocol: contexto do disco → planejar → agir → verificar → persistir).

## 6. Handoff entre fases

| De | Para | Mensagem mínima |
| -- | ---- | --------------- |
| discovery | preparation | lista de 14 maps confirmados + discrepâncias |
| preparation | execution | pacotes aprovados + ordem de dependência |
| execution | validation | estado execution=done + evidências de persistência |
| validation | supervisor/humano | veredito + bloqueios + próximos passos |

## 7. Anti-padrões

- ❌ Pular fases ou gates (ex.: preparar dados antes do mapa confirmado).
- ❌ Executar com mapa parcial (alguma ferramenta `missing`).
- ❌ Declarar conclusão sem `REGISTRAR` e sem evidência.
