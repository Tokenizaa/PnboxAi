---
name: pnbox-discovery
description: Use quando precisar mapear a interface real do PNBOX — labels, placeholders, roles, names, aria, estrutura, botões e ações de cada ferramenta — sem inventar selector. Gatilhos: "mapear PNBOX", "discovery runtime-map", "componentes da ferramenta", "descobrir campos".
---

# pnbox-discovery

Mapeamento da UI REAL do PNBOX. Princípio: **nada de seletor inventado** —
todo localizador nasce de observação do DOM. Saída: `docs/pnbox/runtime/NN-*.json`
(14 arquivos: 01-cliente-mercado … 14-simulador).

## 1. Entrada

- `scripts/pnbox/discover.mjs` — já coleta headings/inputs/textareas/selects/
  buttons/labels via `page.evaluate`. Reusar como base.
- `scripts/pnbox/data/pnbox-data.json` — nomes canônicos das 14 ferramentas
  (`name` de cada key) e labels esperadas (`fields`).
- Workspace: `docs/pnbox/00-mapa-geral.md` (referência, **não** verdade).

## 2. Estrutura obrigatória por ferramenta

```json
{
  "key": "01-cliente-mercado",
  "name": "Cliente - Mercado",
  "url": "URL real observada",
  "components": {
    "inputs": [{ "label": "...", "type": "...", "name": "...", "id": "...", "required": true }],
    "textareas": [],
    "selects": [{ "label": "...", "options": ["..."] }],
    "radios": [],
    "checkboxes": [],
    "buttons": [{ "text": "...", "ariaLabel": "...", "action": "salvar|continuar|voltar|add_item|remove_item" }],
    "lists": [{ "addButton": "...", "itemFields": ["..."] }]
  },
  "flow": {
    "open": ["url", "card_name"],
    "steps": ["fill A", "add item", "fill B"],
    "save": "nome acessível do botão salvar",
    "after_save": "mensagem/URL observada",
    "dependencies": ["02-segmentacao"]
  }
}
```

## 3. Mapeamento por tipo de elemento

| Elemento | O que registrar | Como localizar depois |
| -------- | --------------- | --------------------- |
| input/textarea | label associado (`el.labels[0]`), name, id, placeholder, required | `getByLabel(label)` |
| select | label + opções visíveis | `getByLabel(label)` + `selectOption` |
| radio/checkbox | grupo + valores | `getByRole('radio'/checkbox, {name})` |
| botão | texto + aria-label + tipo | `getByRole('button', {name})` |
| item de lista | estrutura interna (campos do item) | botão `add_item` + campos do item |
| mensagem de erro | texto exato observado (se aparecer sem salvar) | referência p/ validação |

## 4. Validação do mapa (gate antes de preencher)

- Cada label em `pnbox-data.json` → marca `found`/`missing`/`label_diferente`
  (taxonomia REAL da tela).
- `missing` → **bloqueia** a ferramenta para preenchimento (nunca adaptar).
- `label_diferente` → registrar o label real; pacote de preparação usa o real.

## 5. Discrepâncias a reportar

- Lista de ferramentas da doc (12, ex.: `00-mapa-geral.md`) vs keys de
  `pnbox-data.json` (14) — quem manda é a UI real; reportar ao supervisor.
- Campos `inferred` sem correspondência real no DOM.

## 6. Anti-padrões

- ❌ Copiar label de doc interna como se fosse real.
- ❌ Gravar `runtime-map` com campos não observados.
- ❌ Usar `#id`/`nth-child`/xpath frágil como base de preenchimento.
- ❌ Preencher/salvar durante a descoberta.
