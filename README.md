# Stud PB • site e gestão integrada

Redesign do Stud PB com catálogo público, fichas, árvores de pedigree, administração e banco persistente. Aplicação Vinext/TypeScript em Cloudflare Workers, D1 (SQLite) e R2. Requer Node.js >= 22.13; testes usam Node.js >= 24 pelo módulo nativo SQLite.

## O que está implementado

- Home com o layout aprovado, catálogo vindo do banco e destaque intercalado de embriões, gestações e potros.
- Menu Éguas: PB Esporte, PB Matriz e PB Futuras. Um animal pode participar de várias categorias sem duplicar o cadastro.
- Listagens de embriões congelados, gestações, potros e notícias; busca e filtros por nascimento.
- Fichas de animais e cruzamentos com fotos completas, galeria, pedigree, história, descendentes, reprodução relacionada e consulta contextual.
- Nossa história, missão, visão e valores; contato com registro da consulta no painel e consentimento.
- Painel `/admin/` protegido no servidor: editar/criar/arquivar conteúdo, alterar fotos, categorias, disponibilidade, galerias e texto; acompanhar consultas.
- Editor `/admin/pedigree/ID/`: o editor criado anteriormente, integrado ao cadastro. Salvar no site grava no D1; PDFs 16:9 e 9:16 e importação/exportação JSON continuam disponíveis. O editor não aparece nas fichas públicas.
- Convenção definitiva: Pai × Mãe no site inteiro. Pai acima da mãe em cada par do pedigree; pai à esquerda nos pares horizontais de fotos; pai antes da mãe em fichas, cruzamentos, consultas, formulários e PDFs do editor. A opção provisória de mãe primeiro foi retirada do painel.
- Equipe com perfis editor/administrador, identidade vinculada ao usuário autenticado. Sem senha padrão ou credenciais no código.
- Upload autenticado de PNG/JPEG/WebP em R2, com validação do tipo real do arquivo e limite de 10 MB.
- Exportação SQL do banco atual pelo painel. Registro de alterações, controle de versão contra sobreposição de edição e proteção de origem nas gravações.
- Redirecionamentos das URLs antigas para as novas fichas/listagens.

## Conteúdo e migração

Importação pública realizada em 19/10/2026 pela API WordPress e por páginas públicas. Foram recuperadas 68 publicações, 17 páginas, 9 categorias e 314 registros de mídia. As duplicatas de animais entre Esporte/Matriz foram consolidadas.

O banco novo tem 66 registros editáveis: 31 animais, 27 cruzamentos, 4 notícias e 4 páginas institucionais/marketing. Os 408 registros originais da API estão preservados em `source_records`. Home e listagens são componentes que usam os cadastros, e não cópias editáveis de páginas Elementor.

66 fotografias foram baixadas e convertidas em WebP, além dos assets que já faziam parte do layout aprovado. O catálogo completo de 314 mídias está preservado como metadados de origem; ele inclui arquivos antigos/não usados. Não é um backup binário de toda a pasta uploads original. Os HTMLs públicos individuais foram arquivados como `.html.txt` em `migration/original-details/` para revisão, sem execução de scripts de origem.

`migration/RELATORIO.md` lista limites e inconsistências. Dashboard vazio e página técnica de teste de galeria foram preservados no arquivo de origem, sem reproduzir uma antiga área administrativa na navegação pública.

**Esta é uma nova base do conteúdo público, não um dump completo do WordPress privado.** Não contém senhas, rascunhos, cadastros privados, configurações de plugins nem dados de clientes do servidor original. Para migrá-los, é necessário obter um backup autorizado do proprietário.

## Identidade

Branco predominante; marrom #725432; bege #E5D8C3; grafite #31343A. Logos SVG originais, fotos reais e iconografia aprovada. Montserrat é substituta provisória da Gotham, pois não foi fornecida a licença/arquivo web da Gotham. Aplicada a família PNG mais recente do chat de iconografia: feto equino para Embriões; cabeças para Gestações futuras, Potros e Matrizes; Missão (égua/potro/DNA), Visão (cavalo/seta) e Valores (mãos/potro/coração). Os sete PNGs originais foram preservados sem redesenho, recoloração ou conversão para SVG. Proveniência e checksums em public/assets/icons/origem.json. Uso nos acessos da home, seções de Potros/Matrizes, títulos das listagens e institucional.

## Banco SQL entregue

- `database/studpb.sql`: esquema e carga inicial completa da aplicação.
- `database/schema.sql`: apenas estrutura.
- `drizzle/`: migração de estrutura e metadados. Migrações não contêm carga editorial.
- `lib/content/seed.json`: carga inicial idempotente usada pelo servidor. Não altera registros existentes depois da primeira inicialização.
- `scripts/export-initial.mjs`: recria o SQL inicial a partir da carga.

O SQL é **SQLite/Cloudflare D1**, não MySQL. Importar em banco vazio. O marcador `initialized_v1` impede reaplicação da carga inicial em um banco restaurado. Não importar o dump em cima de um banco de produção existente.

Exemplo SQLite:

```sh
sqlite3 studpb.sqlite < database/studpb.sql
```

D1 em produção: o UUID do banco deste projeto fica em `.openai/hosting.json`. No Cloudflare Workers Builds, configure o deploy command como `pnpm run deploy`: ele aplica apenas migrações pendentes de `drizzle/` ao D1 remoto e, em seguida, executa `wrangler deploy`. O primeiro acesso cria a carga pública de forma idempotente. Não importe `database/studpb.sql` sobre esse banco; esse dump completo é para restauração em um banco vazio.

## Instalação e execução

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run build
```

O build gera `dist/server/` e `dist/client/`. Para desenvolvimento portátil, `pnpm run dev`. Para simular D1 local, aplicar a migração seguindo `docs/INSTALACAO.md`. Dependências e helpers de build estão incluídos; `node_modules` não faz parte do ZIP.

A publicação Workers usa os bindings DB/BUCKET declarados em `.openai/hosting.json`; o build falha de forma explícita se voltar a encontrar o UUID placeholder de D1. O ID de D1 não é segredo, mas é específico da conta Cloudflare; revise-o ao clonar o projeto para outra conta. O adapter de identidade ChatGPT funciona no Sites; em um Worker Cloudflare independente, configure e valide um gateway de identidade antes de abrir qualquer rota administrativa.

## Acesso interno

A publicação usa login ChatGPT da plataforma. A variável secreta `ADMIN_EMAILS` autoriza a criação inicial do administrador. O valor é configurado no ambiente, nunca no ZIP. No primeiro acesso, a conta é vinculada ao ID estável do usuário no Site. O administrador pode autorizar e-mails da equipe pelo painel. Visitantes autenticados sem convite não têm acesso ao painel ou às APIs internas.

Em hospedagem fora do Sites, o gateway de identidade precisa ser configurado e validado. Não disponibilizar um Worker que aceite livremente cabeçalhos de identidade enviados pelo navegador. Consulte `docs/INSTALACAO.md`. O pacote não é um tema PHP/WordPress nem instala diretamente em uma hospedagem MySQL convencional.

## Atendimento e idiomas

O formulário grava consultas no banco para a equipe responder pelo painel. Não envia e-mails ou WhatsApp automaticamente. O WhatsApp só aparece depois que o administrador cadastra o número oficial em Configurações. Não foi inventado um número. PT é a versão original; EN/FR abrem tradução automática externa, identificada como tal. Traduções editoriais próprias não estão incluídas.

## Verificação

- `node tests/integration.mjs`: rotas públicas de todos os 66 registros; carga inicial; modal da home com dados reais; autenticação/perfis; proteção de origem; gravação/conflitos de versão; editor; troca de ordem; contato com consentimento/limite; exportação e restauração SQL.
- `node node_modules/typescript/bin/tsc --noEmit`: tipos TypeScript.
- `node --check public/app.js`, `public/admin.js`, `public/system.js`, `public/pedigree.js`: sintaxe dos scripts.
- Build de produção Vinext concluído.

Os testes usam SQLite local em memória como adaptação da API D1; isso não substitui revisão visual nem navegação autenticada real na plataforma. A skill control-browser não estava disponível: revisão visual de desktop/mobile e teste manual de login/upload/PDF permanecem pendentes. A rotina de PDF foi preservada do editor aprovado e teve sintaxe verificada, sem nova conferência visual do arquivo exportado nesta entrega.

## Antes da publicação definitiva no domínio do cliente

Revisar com o criador os apontamentos de cadastro/pedigree e a disponibilidade comercial; cadastrar o WhatsApp; revisar privacidade/retenção das consultas e ajustar o responsável/contato se necessário; validar as telas nos dispositivos finais. Para migrar o domínio studpb.com.br, configurar domínio/DNS e o ambiente definitivo com o dev. O domínio original não foi alterado.

Correção de galeria: excluído o gráfico decorativo GoToTopBtn@4x.png, importado indevidamente como fotografia, de todas as galerias.

Lika JT: três gerações conferidas no Hippomundo 1692376 em 19/10/2026, com fonte acessível na ficha. Pai MSC Willen (Willem), mãe Estrela Dalva JT. Os vínculos semânticos não foram invertidos; mudou apenas a ordem de apresentação.

## Revisão de genealogia em 19/10/2026

31 animais pesquisados no Hippomundo e HorseTelex, com referência StudPB quando a consulta externa não permite confirmação completa. Resultado:16 árvores completas conferidas,6 filiações parciais,7 referências StudPB e2 fichas com divergências documentadas. Os dois bancos nem sempre expõem o mesmo registro publicamente; os limites de acesso e os campos efetivamente conferidos estão registrados.

Consulte `migration/Revisao-Genealogica-2026-10-19.md` e o relatório detalhado `migration/genealogy-audit-2026-10-19.json`. A correção alcança filiação, ficha, cards e descendentes. Datas completas, disponibilidade e histórico esportivo do texto legado não estão certificados por essa revisão.

Embriões congelados exibem a árvore da matriz, mantendo os dados comerciais do cruzamento. As árvores seguem pai acima e mãe abaixo. O editor interno mantém os vínculos de parentesco. Uma edição posterior em filiação/data invalida a marca de conferência até nova revisão.

A rotina de reparo aplica uma vez os campos de genealogia ao banco publicado. Fotos, disponibilidade, consultas e acessos são preservados. A migração de estrutura permanece separada dos dados. Testes cobrem o reparo em banco existente, árvore materna dos7 embriões, registro da fonte nos31 animais e idempotência.
