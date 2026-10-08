---
name: pnbox-data-governance
description: Use quando precisar garantir que nenhum dado inventado entre no PNBOX — classificar valores e bloquear campos sem origem. Gatilhos: "nunca inventar dado", "classificar dado", "dado sem origem", "CONFIRMADO", "PENDENTE", "knowledge-reader", "data-validator".
---

# pnbox-data-governance

**NUNCA INVENTAR DADO.** Todo valor aplicado no PNBOX tem origem rastreável ou
NÃO é aplicado.

## 1. Classificação oficial

| Classe | Regra | Exemplo (Adeus Multa) |
| ------ | ----- | --------------------- |
| `CONFIRMADO` | Verificado com fonte oficial/benchmark | 234M multas/ano (SENATRAN/Zapay) |
| `PESQUISADO` | Coletado em pesquisa externa documentada | CPC R$ 7,50 (Google Ads) |
| `DEFINIDO` | Decisão interna do produto | Preço pay-per-defense R$ 39-69 |
| `CALCULADO` | Derivado de modelo (fórmula anotada) | LTV/CAC 6,12x; margem 38,5% |
| `HIPOTESE` | Provisório sem fonte — só preenche com aprovação explícita do supervisor | Gênero de advogados |
| `PENDENTE` | Não existe na fonte → **NÃO PREENCHER** | Qualquer lacuna não pesquisada |

Compatibilidade com o workspace: doc usa `PESQUISA_NECESSARIA`,
`PENDENTE_VALIDACAO`, `BLOQUEADA`, `OK` — mapear:
`PESQUISA_NECESSARIA`→`PENDENTE`; `PENDENTE_VALIDACAO`→`HIPOTESE`; `OK`→
pronto para execução; `BLOQUEADA`→dependência não atendida.

## 2. Fontes válidas (única verdade)

1. `docs/pnbox/pesquisas/Pesquisa de Mercado Adeus Multa.md` — dados externos.
2. `docs/pnbox/01-*.md` … `12-*.md` — conhecimento + dados por ferramenta
   (seções "Dados do Adeus Multa").
3. `docs/pnbox/00-mapa-geral.md` — métricas agregadas (TAM/SAM/SOM, LTV/CAC).
4. `scripts/pnbox/data/pnbox-data.json` — valores prontos por ferramenta.
5. `docs/pnbox/runtime/` — estrutura da UI (não fonte de VALOR).

## 3. Formato de rastreabilidade por campo

```json
{
  "campo": "Nome do segmento",
  "valor": "Condutores pessoa física autuados",
  "origem": "docs/pnbox/01-segmentacao-mercado.md §2 | pnbox-data.json 02-segmentacao",
  "classification": "CONFIRMADO"
}
```

## 4. Regras de bloqueio

- `PENDENTE`/`HIPOTESE` sem aprovação → campo excluído do pacote de execução
  + registro no relatório de bloqueios.
- Cruzar valores entre fontes (10-ganhos ↔ 12-dre ↔ 14-simulador) — divergência
  = parar, corrigir o pacote, NUNCA a fonte.
- Campo obrigatório do PNBOX sem dado aprovado → reportar ao supervisor
  (pode exigir nova pesquisa humana), nunca preencher com chute.

## 5. Anti-padrões

- ❌ Preencher lacuna com "estimativa razoável" sem marcar `HIPOTESE`.
- ❌ Editar `pnbox-data.json` para "fazer bater" com o PNBOX.
- ❌ Transportar valor entre ferramentas sem citar a fonte do valor.
