# 05 — Requisitos de segurança

## SEG01 — Autenticação individual

Cada funcionário deverá utilizar uma conta individual, não compartilhada.

## SEG02 — Senhas protegidas

As senhas deverão ser armazenadas com hash seguro e salt. Senhas temporárias ou iniciais deverão ser tratadas com cuidado e não deverão ser expostas em registros ou mensagens indevidas.

## SEG03 — Transporte seguro

Todo o tráfego entre o dispositivo e a aplicação deverá ocorrer por HTTPS.

## SEG04 — Autorização no servidor

As permissões deverão ser verificadas no servidor para cada operação protegida; ocultar controles na interface não será considerado controle suficiente.

## SEG05 — Proteção de arquivos

O upload de arquivos deverá validar conteúdo, tipo, tamanho e condições de armazenamento. Os arquivos deverão ser disponibilizados somente a usuários autorizados.

## SEG06 — Gestão de sessão

A sessão deverá utilizar mecanismos seguros, com proteção de cookies ou tokens, expiração e possibilidade de encerramento.

## SEG07 — Auditoria administrativa

As operações relevantes de administração de contas deverão ser registradas para permitir rastreabilidade, respeitando a política de privacidade e retenção definida pela empresa.
