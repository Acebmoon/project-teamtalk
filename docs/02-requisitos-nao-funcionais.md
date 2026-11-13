# 02 — Requisitos não funcionais

Os requisitos não funcionais definem atributos de qualidade, critérios técnicos e restrições que deverão orientar a implementação e a operação do sistema.

## RNF01 — Responsividade e compatibilidade mobile

A aplicação deverá adotar abordagem mobile-first e adaptar sua interface às diferentes dimensões de telas de smartphones.

## RNF02 — Restrição de acesso por dispositivos

A experiência deverá ser destinada exclusivamente a dispositivos móveis. O acesso por computadores e notebooks deverá ser restringido por mecanismo técnico a ser definido e validado. A restrição deverá ser tratada como controle de acesso, reconhecendo que a identificação de dispositivos por navegador não é infalível.

## RNF03 — Identidade visual

A interface deverá seguir o design system e a identidade visual da empresa, respeitando cores, tipografia, logotipo, elementos gráficos e padrões de navegação oficiais.

## RNF04 — Usabilidade

O sistema deverá apresentar navegação simples, intuitiva e familiar, utilizando padrões de interação conhecidos em aplicativos de mensagens.

## RNF05 — Segurança de autenticação

O sistema deverá proteger as credenciais dos usuários. As senhas deverão ser armazenadas por meio de algoritmos apropriados de hash com salt, nunca em texto puro.

## RNF06 — Proteção de dados e sessões

A aplicação deverá utilizar HTTPS e mecanismos seguros de gerenciamento de sessão, incluindo proteção contra acesso não autorizado e encerramento de sessões conforme política definida.

## RNF07 — Controle de permissões

O sistema deverá implementar controle de acesso baseado em papéis e permissões, garantindo que somente usuários autorizados executem operações administrativas.

## RNF08 — Desempenho

A aplicação deverá apresentar tempos de resposta adequados durante navegação, envio e recebimento de mensagens e compartilhamento de arquivos, inclusive em períodos de maior utilização. Metas quantitativas deverão ser definidas durante o planejamento técnico.

## RNF09 — Escalabilidade

A arquitetura deverá suportar a estimativa de aproximadamente 900 usuários cadastrados e permitir crescimento futuro sem degradação inaceitável do serviço.

## RNF10 — Disponibilidade

O sistema deverá possuir mecanismos de monitoramento, recuperação e prevenção de falhas para reduzir interrupções na comunicação. A meta de disponibilidade deverá ser acordada com o cliente.

## RNF11 — Integridade e validação de arquivos

Os arquivos enviados deverão ser validados quanto ao tipo real de conteúdo, e não apenas pela extensão ou pelo nome. O sistema deverá aplicar limites de tamanho e verificações de segurança definidos pelo projeto.

## RNF12 — Privacidade

As conversas e os documentos compartilhados deverão ser acessíveis somente aos usuários autorizados, conforme as permissões estabelecidas. O tratamento de dados deverá observar a legislação aplicável, incluindo a LGPD.

## RNF13 — Manutenibilidade

O sistema deverá possuir arquitetura organizada, documentação técnica e código de fácil manutenção, permitindo correções e futuras evoluções.

## RNF14 — Compatibilidade com navegadores

A aplicação deverá funcionar corretamente nas versões suportadas dos principais navegadores móveis, especialmente Google Chrome e Safari. A matriz de versões suportadas deverá ser definida e testada.
