---
name: pnbox-form-filling
description: Use quando precisar preencher campos do PNBOX — digitar, selecionar, adicionar item, remover item, salvar — com localizadores semânticos e parada em campo ausente. Gatilhos: "preencher PNBOX", "adicionar segmento", "salvar ferramenta", "tool-executor".
---

# pnbox-form-filling

Preenchimento determinístico do PNBOX. Regra-mãe: **campo não encontrado =
parar e reportar**, nunca preencher outro por aproximação.

## 1. Localizadores (scripts/pnbox/field-mapper.mjs)

| Ação | Função | Seletor |
| ---- | ------ | ------- |
| Campo por label | `getFieldByLabel(page, label)` | `getByLabel(label, {exact:false}).first()` |
| Preencher | `fillField(page, label, value)` | `.fill(String(value))` |
| Vários campos | `fillFields(page, fields)` | pula `undefined/null/''` |
| Botão | `getButtonByText(page, text)` | `getByRole('button', {name, exact:false})` |
| Link | `getLinkByText(page, text)` | `getByRole('link', {name, exact:false})` |
| Clique | `clickByText(page, regex)` | tenta button → fallback link |
| Select | `selectOption(page, label, value)` | `getByLabel` + `selectOption` |

## 2. Sequência por ferramenta

1. Abrir ferramenta (pnbox-navigation) pelo card real do runtime-map.
2. Para cada campo do pacote aprovado (`execucao/pacotes/NN-*.json`):
   - Label REAL do runtime-map (não o da doc).
   - Tipo real: fill / select / radio / checkbox.
   - Valor `PENDENTE`/ausente → pular e registrar (nunca inventar).
3. Listas repetíveis: clicar `add_item` (nome do map) → preencher item → repetir
   até a quantidade do pacote.
4. Salvar: `clickByText(page, /salvar|concluir|avançar|pr[oó]ximo/i)` — porém o
   botão REAL preferido é o `save` do runtime-map (nome acessível exato).
5. Aguardar `networkidle`/timeout e registrar `page.url()` + sinal pós-salvar.

## 3. Regras de parada (hard)

- Campo obrigatório sem localizador → throw, para tudo.
- Valor do pacote não bate tipo do campo (texto vs select) → throw.
- Nenhum sinal de salvamento → `SALVAMENTO_NAO_CONFIRMADO` (persistence-checker).

## 4. Anti-padrões

- ❌ Labelling aproximado para "achar" o campo (`getByLabel('Segmento')`
  quando o real é 'Nome do segmento').
- ❌ `fill` em campo tipo select (usar `selectOption`).
- ❌ Continuar após um campo dar erro.
- ❌ Preencher campo fora do runtime-map.
