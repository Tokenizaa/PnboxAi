# OpenCode — PNBOX

Este projeto possui uma camada OpenCode própria em `.opencode/`.

## Escopo

Os agentes `pnbox-*` e skills `pnbox-*` deste diretório são exclusivos do PNBOX e não fazem parte da configuração global do OpenCode.

## Regra

- Use `@pnbox-supervisor` como coordenador do domínio PNBOX.
- Os agentes PNBOX não devem ser instalados globalmente.
- O domínio PNBOX deve usar apenas o protocolo e os artefatos deste projeto.
- A orquestração global pertence ao `@supervisor` global; o `@pnbox-supervisor` coordena somente o trabalho específico do PNBOX.
- Não recriar runtime guard, agent-loop ou máquina de estados global para este projeto.
