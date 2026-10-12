# Ster Closee — site da cliente + Studio Administrador

**Versão 2.0 · Brechó vintage/editorial Y2K.** Site estático, adaptado a computador e celular, com cadastro de peças protegido por login. Um deploy da Vercel serve as duas interfaces:

- **Loja pública:** `https://SEU-SITE.vercel.app/`
- **Painel:** `https://SEU-SITE.vercel.app/admin/`

A página das clientes conserva o design editorial v1.2, filtros, favoritos, detalhes e o WhatsApp. A parte administrativa tem login, fotos pela câmera/galeria, otimização de imagens, ficha completa, rascunhos, publicação, edição, controle de disponibilidade e exclusão. **Não há pagamento ou pedidos no site.**

## 1) Testar localmente

1. Extraia o ZIP. Abra a pasta `ster-closee-integrado` no VS Code.
2. No terminal dessa pasta, execute `python -m http.server 5500` (ou `py -m http.server 5500` no Windows / `python3 -m http.server 5500` no Mac/Linux).
3. Abra **http://localhost:5500/** (loja) e **http://localhost:5500/admin/** (painel).
4. Sem Supabase configurado, a **loja mostra peças fictícias**, marcadas como demonstração, e o **painel mostra a tela de configuração** com um botão **Explorar prévia do painel** (somente visual, não salva nem publica). Para publicar de verdade, continue os passos abaixo.

Não é necessário npm, Node, compilação ou framework. O JavaScript do Supabase é carregado por CDN quando estiver configurado; é necessária conexão com a internet.

## 2) Criar o Supabase (necessário para publicar)

1. Entre em [supabase.com](https://supabase.com/) e crie um projeto (guarde a senha do banco em local seguro).
2. No menu **Storage**, crie o bucket exatamente com o nome **`product-photos`** e marque **Public bucket**. Defina limite de upload **10 MB** e tipos permitidos `image/jpeg`, `image/png`, `image/webp`, se o painel oferecer essa configuração. As fotos públicas são necessárias para o catálogo e os links enviados por WhatsApp.
3. Abra **SQL Editor**, crie uma query e execute todo o conteúdo de **`supabase/schema.sql`**. Ele configura tabelas, sequências e regras RLS que deixam rascunhos ocultos e impedem visitantes de alterar produtos.
4. Em **Authentication → Users**, crie manualmente uma conta para quem vai administrar a loja. Defina e-mail e senha forte; marque o e-mail como confirmado se for necessário. **Não publique esses dados no código.**
5. Copie o **UUID** (ID) desse usuário da lista de usuários do Supabase. No **SQL Editor**, execute, substituindo pelo ID real:

```sql
insert into public.admin_users (user_id)
values ('COLE-AQUI-O-UUID-DA-CONTA')
on conflict (user_id) do nothing;
```

6. Em **Authentication → Settings / General configuration**, **desative o cadastro público** (`Allow new users to sign up`) caso apenas a equipe deva ter contas. O formulário do projeto tem apenas login, nunca cadastro público. A lista `admin_users` continua sendo o controle real de permissão.
7. Em **Project Settings / API** ou **Connect**, copie a **Project URL** e a chave **publishable** (`sb_publishable_...`; algumas contas usam a chave `anon` pública legada). **NUNCA use a chave `service_role`, `secret`, senha de banco ou dados da conta no navegador.**
8. Abra **`js/config.js`** e preencha:

```js
export const CONFIG = {
  storeName: 'Ster Closee',
  whatsappNumber: '5599999999999', // SUBSTITUA: DDI 55 + DDD + número
  whatsappGreeting: 'Oi! Tudo bem? 💗 Vi essa peça no catálogo e tenho interesse.',
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabasePublishableKey: 'sb_publishable_SUA_CHAVE_PUBLICA',
};
```

O arquivo de configuração **é público**; isso é esperado para a URL e a chave publishable, pois **a segurança depende das políticas RLS e da lista de administradores**. Não grave senhas em arquivos. Para manter a configuração fora do GitHub, uma alternativa futura é automatizar a injeção da configuração pública no build; a versão atual é intencionalmente estática.

### Se aparecer erro ao carregar ou salvar

Confirme se as tabelas `public.products` e `public.admin_users` existem, se o SQL terminou sem erros, se você autorizou o UUID correto e se a **Data API** do projeto está habilitada com o schema `public` exposto. A chave pública e a URL precisam pertencer **ao mesmo projeto**. Verifique também se o bucket se chama exatamente `product-photos` (com hífen), é público e possui as permissões de upload criadas pelo SQL.

## 3) Cadastrar uma peça pelo painel

1. Acesse `/admin/` e faça login com o usuário cadastrado.
2. Toque em **+ Nova peça**.
3. Use **Tirar foto** no celular (o navegador pode abrir a câmera) ou **Escolher imagens** para selecionar até seis imagens. Reordene com `←` e `→`; a primeira será a capa. JPEG/PNG/WebP são aceitos; HEIC pode exigir conversão prévia. Imagens são reduzidas para até 1600 px no maior lado e transformadas em JPEG para economizar espaço.
4. Informe nome, descrição, categoria, preço, tamanho, cor, estampa, conservação, material e selo opcional.
5. Selecione **Disponível**, **Reservada** ou **Vendida**. Em visibilidade, escolha **Publicada na loja** e clique em **Publicar peça**. Ou clique em **Salvar rascunho** para guardar sem mostrar na vitrine.
6. Abra `/` e recarregue a página para ver a peça. A vitrine consulta apenas produtos publicados. Os filtros continuam funcionando.

O painel permite editar qualquer registro, marcar como vendido ou disponível rapidamente e excluir com confirmação. No status **reservado** ou **vendido**, a peça pode continuar visível mas o botão de interesse fica desabilitado. Os filtros da vitrine exibem por padrão somente peças disponíveis; a cliente pode desativar esse filtro.

### Por que as peças não surgem instantaneamente na outra aba?

As alterações são **persistidas imediatamente** no Supabase, mas a vitrine não usa sincronização em tempo real: é necessário recarregar a página de cliente para consultar os registros recentes. Isso evita complexidade e custo desnecessários nesta etapa.

## 4) Publicar na Vercel

1. Envie a pasta **ster-closee-integrado**, com `index.html` na raiz, a um repositório GitHub.
2. Na [Vercel](https://vercel.com/), escolha **Add New → Project**, importe o repositório e use **Framework Preset: Other**. Não informe build command (site estático); deixe a pasta raiz contendo `index.html`.
3. Publique. A Vercel disponibilizará automaticamente `/` e `/admin/` no **mesmo domínio**.
4. Teste `/admin/` com seu login, cadastre uma peça real, depois confira `/` e o botão de interesse do WhatsApp.

Este pacote utiliza **um projeto Vercel para loja + admin**. Caso você deseje dois domínios/projetos Vercel separados posteriormente, os arquivos podem ser reorganizados para isso.

## 5) WhatsApp

Em `js/config.js`, preencha `whatsappNumber` com **55 + DDD + telefone, somente dígitos**, como `5511999999999` (apenas exemplo). Ao clicar em **Quero essa peça**, abre uma conversa com nome, SKU, preço, tamanho, cor, descrição da estampa, URL pública da foto e link direto para o produto.

**Limitação do WhatsApp:** links `wa.me/?text=` conseguem preencher uma **mensagem com o link da foto**, mas não anexar automaticamente um arquivo de imagem à mensagem. A pessoa ainda precisa confirmar o envio.

## 6) Segurança e limites

- O endereço `/admin/` não é secreto; as ações exigem **autenticação e autorização pelas políticas RLS do Supabase**. Uma conta logada, mas ausente de `admin_users`, não consegue publicar.
- O banco não permite ao público ver **rascunhos**; fotos em um bucket público podem ser vistas por qualquer pessoa que possua a **URL pública**, mesmo se o registro estiver em rascunho. Portanto, **não envie fotos confidenciais**.
- Administradores têm permissão para criar, editar e excluir todos os produtos e imagens desse bucket. Proteja as contas com senhas fortes e ative opções adicionais de autenticação na sua conta Supabase quando disponíveis.
- Até **500 produtos** são carregados por consulta nas telas nesta versão inicial. Para um catálogo maior, implemente paginação.
- Cadastro com seis fotos no máximo; foto até 15 MB antes do processamento / 10 MB após otimização. Exige internet. Links de foto do Supabase precisam ser públicos.
- Se um upload terminar e a rede falhar durante a gravação no banco, o app tenta apagar as fotos novas. Em falhas de rede graves podem restar arquivos órfãos; faça revisões periódicas do Storage.
- A exclusão de produtos tenta também excluir as imagens armazenadas. **É definitiva.**
- Sem integração de pedidos, estoque múltiplo, entrega, pagamento, rastreamento ou envio automático de mensagens.

## Estrutura

```text
ster-closee-integrado/
├── index.html                 # Vitrine pública / catálogo
├── admin/
│   ├── index.html            # Login e painel responsivo
│   ├── style.css             # Design editorial do administrador
│   └── app.js                # CRUD, fotos, autenticação e upload
├── js/
│   ├── app.js                # Vitrine + leitura do Supabase
│   ├── config.js             # WhatsApp + URL/chave pública Supabase
│   ├── products.js           # Somente dados fictícios (antes da configuração)
│   ├── product-utils.js      # Mapeamento de produtos/imagens
│   └── supabase.js           # Client compartilhado
├── css/                      # Visual da vitrine preservado
├── assets/                   # Imagens ilustrativas e favicon
├── supabase/schema.sql       # Banco, permissões e RLS
└── README.md
```

**Não rode o SQL em um projeto Supabase existente sem revisar antes.** Ele foi projetado para um projeto novo e cria políticas e tabelas com nomes específicos.
