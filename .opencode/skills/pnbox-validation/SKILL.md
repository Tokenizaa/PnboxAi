---
name: pnbox-validation
description: Use quando precisar validar preenchimento do PNBOX — campos obrigatórios, persistência real, dependências, cálculos e consistência entre ferramentas. Gatilhos: "validar PNBOX", "persistência", "Ganhos = DRE", "consistência", "14/14", "field-validator".
---

# pnbox-validation

Validação com poder de veto, baseada em **evidência observada no DOM** — nunca
em relato ("cliquei e salvei").

## 1. Persistência (mínimo obrigatório)

1. Sinal pós-salvar: toast/URL/estado de card (conforme runtime-map
   `after_save`).
2. Navegar para outra página/ferramenta.
3. Voltar e reler o campo (label real do map).
4. Valor presente === valor aplicado. Itens de lista: quantidade igual.

Se qualquer passo falhar → `SALVAMENTO_NAO_CONFIRMADO` (FAIL).

## 2. Validação de campo

| Check | Regra |
| ----- | ----- |
| Obrigatório | `required` no map → tem valor |
| Opcional | valor do pacote aplicado OU vazio registrado |
| Select/radio | opção === pacote |
| Exato | comparar string normalizada (espaços, casas decimais) |

## 3. Dependências

Nenhuma ferramenta pode ser validada `APROVADA` com dependência não aprovada:
chain `01-cliente-mercado → 02-segmentacao → 03-personas → 04-jornada →
05-proposta-valor → 06-concorrencia → 07-canais → 08-funil → 09-investimento →
10-ganhos → 11-custos → 12-dre → 13-indicadores → 14-simulador`.

## 4. Consistência numérica (valores base)

| Relação | Fórmula (margem ±1%) |
| ------- | -------------------- |
| DRE interno | Líquida = Bruta − Deduções; Lucro = Líquida − CV − CF − CAPEX/12 |
| Ganhos ↔ DRE | Receita bruta DRE === cenário base Ganhos (R$ 2.940.000) |
| Indicadores ↔ DRE | Margem operacional === 38,5% |
| Investimento ↔ DRE | CAPEX amortizado = CAPEX/12 (R$ 75k/12 = R$ 6.250) |
| Funil ↔ Ganhos | Volumes funil × ticket ≈ receita ano 1 |
| Simulador ↔ Ganhos | Receita base simulador === receita base Ganhos |

## 5. Final (14/14)

Verificar em `docs/pnbox/execucao/estado.json` + reler ferramentas:
14/14 runtime-maps, 14/14 pacotes, 14/14 executadas, 14/14 persistidas,
14/14 field-check, consistência ok. Emitir:

```
VEREDITO: APROVADO | REPROVADO
motivo, ferramentas, evidencias, proximos
```

## 6. Anti-padrões

- ❌ Validar por screenshot sem ler o DOM.
- ❌ Aceitar valor aproximado ("parece certo").
- ❌ Ajustar pacote/fonte para fazer a validação passar — reportar divergência.
