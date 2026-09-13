# Dream Build Helper — versão site (GitHub + Vercel)

Mesma ideia do app desktop, mas como site: atualiza com `git push`, sem gerar
instalador nenhum. Ícones e edições (nome/descrição/raridade) enviados pela
Galeria ficam salvos pra sempre no **Vercel Blob** — aparecem pra qualquer
pessoa que visitar o site, não só pra você.

## O que tem aqui
```
public/            -> o site em si (HTML/CSS/JS) + dados do jogo + ícones
  index.html, app.js, style.css
  data/games/       -> builds (mesmo formato de antes)
  data/icons/        -> os ~500 ícones que você já separou
api/                -> 3 funções que rodam no servidor da Vercel
  get-overrides.js   -> devolve as edições/uploads salvos
  save-override.js   -> salva uma edição de nome/descrição/raridade
  upload-icon.js      -> recebe uma imagem da Galeria e guarda no Blob
vercel.json         -> fala pro Vercel servir a pasta public/
package.json        -> dependência @vercel/blob, usada pelas 3 funções
```

## Passo a passo pra colocar no ar

### 1. Criar um repositório no GitHub
1. Entra no GitHub, cria um repositório novo (ex.: `dream-build-helper-web`), pode ser privado.
2. Na sua máquina, dentro dessa pasta que eu mandei:
   ```
   git init
   git add .
   git commit -m "primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/dream-build-helper-web.git
   git push -u origin main
   ```

### 2. Importar no Vercel
1. Entra em vercel.com → **Add New → Project**
2. Escolhe o repositório que você acabou de criar
3. Framework Preset: deixa em **"Other"**
4. Clica em **Deploy** — nesse primeiro deploy, o upload de imagem/edição ainda
   não vai funcionar (falta o Blob), mas o site já deve abrir e mostrar as
   builds normalmente

### 3. Criar o Blob Store (pro upload de imagem/edição funcionar)
1. Dentro do projeto na Vercel, vai na aba **Storage**
2. **Create Database** → escolhe **Blob**
3. Dá um nome (ex.: `dream-build-icons`) e cria
4. A Vercel pergunta se quer **conectar ao projeto** — diz que sim. Isso já
   cria sozinha a variável de ambiente `BLOB_READ_WRITE_TOKEN` que as 3
   funções em `api/` precisam
5. Vai em **Deployments** → nos "..." do último deploy → **Redeploy** (pra
   ele pegar a variável nova)

Pronto — depois disso, "Enviar imagem" e as edições da Galeria já ficam
permanentes pro site.

## Testar localmente antes de subir (opcional)
Se quiser ver rodando no seu PC antes de colocar no ar:
```
npm install -g vercel
npm install
vercel dev
```
Isso já roda tanto o site quanto as 3 funções de API juntos.

## Fixar por cima do jogo
O botão **📌** no topo usa a função de "Picture-in-Picture de Documento" do
navegador — só funciona no **Chrome ou Edge** atualizados (Firefox e Safari
ainda não suportam). Ele abre uma janelinha separada que o próprio navegador
mantém sempre visível por cima de qualquer coisa na tela, inclusive o jogo em
tela cheia. Pra fechar, é só clicar no 📌 de novo ou fechar a janelinha.

## Atualizar depois
Pra trocar qualquer coisa nos dados das builds (`public/data/games/*.json`)
ou no código, é só editar e:
```
git add .
git commit -m "o que mudou"
git push
```
A Vercel redeploya sozinha em menos de um minuto. Não tem `.exe`, não tem
"substituir a pasta" — o link já fica atualizado pra sempre.

## Limitações
- Upload de imagem tem um limite de ~8MB (dá muito folga, ícones costumam ter
  poucos KB) — arquivos avif/png grandes demais falham com erro.
- O Blob é público: qualquer pessoa com o link direto da imagem consegue
  acessá-la (comum pra esse tipo de storage). Não é indexado/listado em
  lugar nenhum, mas não é "secreto".
- Sem login/permissão: qualquer visitante pode editar nome/descrição/raridade
  e subir imagem — não tem controle de quem pode mudar o quê. Se isso virar
  problema (alguém bagunçando os dados de propósito), dá pra adicionar uma
  senha simples depois.
