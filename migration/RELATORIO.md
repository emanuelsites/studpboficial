# Migração pública Stud PB • 19/10/2026

Recuperados pela API pública: 68 posts, 17 páginas, 9 categorias, 314 mídias. Recuperadas 68 páginas públicas individuais em HTML, arquivadas em original-details com extensão .txt. Nenhuma credencial privada ou conta do WordPress foi solicitada ou importada.

## Resultado

66 cadastros editáveis: 31 animais (duplicatas consolidadas), 27 cruzamentos, 4 notícias, 4 páginas institucionais/marketing. Home, listagens e contato são telas da aplicação que consultam o banco. As 9 categorias originais estão preservadas nos registros de origem; a navegação principal usa as seis categorias comerciais: esporte, matriz, futuras, potros, congelados e gestações. Todos os 408 registros da API estão no SQL em source_records.

66 fotografias baixadas, sem falhas, otimizadas em WebP. Não substituímos animais por imagens geradas. Algumas fotos repetidas já eram reutilizadas em diferentes fichas no site original; conferir com o criador. O arquivo media.json preserva o catálogo de mídias, incluindo arquivos antigos não utilizados pelo novo site.

## Revisão de pedigree

O site original contém árvores reutilizadas em fichas diferentes. O importador só aceitou árvores completas quando os dois pais coincidiam com a filiação principal. Quando não coincidem, os nomes conhecidos da filiação principal foram preservados e os demais ficaram não informados. A fonte foi arquivada para revisão. A árvore do Balou Blue PB segue o print/editor fornecido nesta conversa.

- **Senna Star PB** (origem 2784): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Mademoiselle de Muze** (origem 1585): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Lika JT** (origem 1575): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Lady Scarlett JMen** (origem 1571): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **HPH Wind Tok** (origem 1569): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Balance Z** (origem 1560): Resolvido: corrigida a grafia Daphne e conferidas três gerações na página pública original. Revisar grafias finais com o criador.
- **Serendipity Di Villagana** (origem 1557): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Lika JT** (origem 919): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **Balance Z** (origem 692): Resolvido: corrigida a grafia Daphne e conferidas três gerações na página pública original. Revisar grafias finais com o criador.
- **Lady Scarlett JMen** (origem 688): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.
- **HPH Wind Tok** (origem 678): Pedigree original não coincide com filiação principal ou está incompleto. Importada apenas filiação verificável.

## Outros limites editoriais

- Datas, previsões, números de embriões e status comerciais do conteúdo antigo não equivalem a estoque confirmado. A interface usa consulta à equipe e preserva o selo Vendido onde declarado.
- Há variações de grafia de nomes e de nascimento entre listagem e ficha técnica. Validar com o criador; as fontes foram preservadas. O sistema permite corrigir todos esses dados sem editar código.
- Não foram importadas contas de usuário, senhas, rascunhos, configurações internas do WordPress, formulários antigos ou bases privadas. Para isso é necessário um backup autorizado do servidor original.
- A página dashboard vazia e a página de teste de galeria ficam no arquivo de origem, sem exposição como páginas internas do novo sistema.
- Tradução EN/FR é automática externa. Os idiomas não têm conteúdo editorial revisado.
- WhatsApp está vazio por falta do número oficial; configurar no painel.
- Gotham não foi fornecida para uso web; Montserrat permanece provisória.
- Revisão visual em navegador e teste manual de conta real/upload/PDF pendentes no ambiente desta entrega. Os testes automatizados cobrem persistência, autorização, SQL e os fluxos principais.

Correção de galeria: excluído o gráfico decorativo GoToTopBtn@4x.png, importado indevidamente como fotografia, de todas as galerias.
