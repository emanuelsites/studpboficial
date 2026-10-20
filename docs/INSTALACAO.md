# Instalação técnica

## Ambiente já publicado no Sites

1. O projeto existente mantém seu público. O site público não exige login; `/admin/` e as APIs administrativas exigem identidade ChatGPT autorizada no servidor.
2. D1 é ligado como `DB`, R2 como `BUCKET`. O Sites provisiona os recursos na publicação.
3. Configure `ADMIN_EMAILS` como segredo do ambiente com o e-mail do administrador inicial. Não coloque esse valor no JavaScript público ou em arquivo versionado. A conta proprietária desta publicação já foi autorizada no ambiente.
4. Acesse `/admin/` e use Entrar com ChatGPT. Autorize outros membros em Equipe.
5. A primeira requisição depois de aplicar a migração carrega a base pública. Operações de seed usam INSERT OR IGNORE e marcador; não substituem edições.

## Desenvolvimento local

Node >=24 recomendado. `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm run build`.

Para aplicar a migração no banco local vazio:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sleepy_wolfsbane.sql
```

Em seguida `pnpm run dev`. No perfil portátil o starter permite identidade local `seedy@sites.test` através de `/signin-with-chatgpt?return_to=/admin/`. Para autorizá-la localmente, configurar ADMIN_EMAILS apenas no ambiente local ignorado pelo Git. Essa simulação não integra o build de produção. O perfil managed-linux não simula autenticação.

A aplicação exporta `handle(Request)` em lib/server.ts e as rotas usam um catch-all Vinext. Arquivos em public/ são assets estáticos. Não colocar novamente um index.html estático em public/, pois ocultaria a home dinâmica em alguns roteadores.

## Hospedagem Cloudflare fora do Sites

O UUID do D1 e os bindings do ambiente estão em `.openai/hosting.json`; o build usa esse UUID real e interrompe a publicação se detectar o placeholder local. No Cloudflare Workers Builds, use `pnpm run build` como build command e `pnpm run deploy` como deploy command. O script aplica, com o controle de migrações do Wrangler, apenas os arquivos pendentes de `drizzle/` ao D1 remoto antes de executar `wrangler deploy`. A primeira requisição inicializa a carga pública; não importe `database/studpb.sql` sobre esse banco.

O UUID do D1 é específico desta conta e deve ser substituído ao implantar em outra conta. Em Workers Builds, previews ficam desativados até que exista um D1 de preview isolado. Configure e valide o gateway de identidade antes de abrir qualquer rota administrativa fora do Sites.

O adapter atual lê identidade confiável fornecida pela plataforma Sites através de app/chatgpt-auth.ts. Fora dessa plataforma, substituir esse adapter por uma autenticação de servidor apropriada (sessão/Cloudflare Access validado no Worker). Nunca confiar em cabeçalhos oai-authenticated-user-* de clientes externos. Não há sessão própria com senha padrão para um servidor genérico.

Para MySQL/PHP/WordPress, será necessária uma adaptação de backend; o arquivo SQL entregue não é um dump MySQL.

## Backup e restauração

SQL inicial: database/studpb.sql. Exportação atualizada: painel > Banco de dados, disponível apenas para administradores. Importar em banco vazio; migrar/restaurar primeiro em ambiente de teste. Imagens iniciais estão no ZIP; uploads novos ficam em R2 e exigem backup separado. O SQL armazena URLs, não os bytes desses uploads.

O dump inclui dados pessoais das consultas caso existam na data de exportação. Restringir o acesso ao arquivo e definir uma política de retenção com o responsável do Stud PB.

## Fluxo de edição

O editor de pedigree usa os mesmos registros de entries que as fichas públicas. Salvar grava os vínculos semânticos mother/father. A ordem é aplicada só na renderização: pai primeiro em todo o site. O painel não oferece mais a ordem materna. Ancestrais que também são animais cadastrados usam seus pedigrees atuais na ficha pública, limitados a três gerações. A edição utiliza o número version para bloquear sobrescritas de abas desatualizadas.

Se renomear uma matriz, revisar as referências textuais de mãe nos descendentes/cruzamentos: o importador do WordPress identifica parentes por nome e a carga não possui IDs genealógicos oficiais. Recomenda-se consolidar essas referências com o criador antes de renomeações extensas.
