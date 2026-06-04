# Direcao Financeira

WebApp local para gestao financeira pessoal e empresarial com lancamento manual rapido. A ideia central e direcao estrategica: ver o mes civil com clareza sem transformar o uso em contabilidade de centavos.

## Filosofia

- Lancar um gasto em menos de 10 segundos.
- Usar uma unica base de transacoes para Pessoal e Empresa.
- Alternar a leitura por contexto, sem duplicar sistemas.
- Tratar faturas como consulta de risco, nao como reconciliacao contabil.

## Modelo de dados

Transacoes:

- `date`: data do lancamento, padrao hoje
- `amount`: valor
- `description`: descricao ou tag livre
- `scope`: `personal` ou `business`
- `source`: `Cartao A`, `Cartao B` ou `Pix`
- `kind`: `expense` ou `income`

Faturas:

- `source`
- `scope`
- `month_key`
- `total`
- `due_date`

## Como usar

Abra `index.html` no navegador. O app exige login pelo Supabase Auth antes de mostrar o painel.

Para lancar rapido, digite algo como:

```text
100 almoco
```

O app assume a data de hoje, usa a visao atual como Pessoal/Empresa, usa a origem selecionada e registra como saida.

## Supabase

O app esta configurado para sincronizar com o projeto Supabase `ezaehjggbgapbeyceinb`.

Antes de usar a sincronizacao, abra o SQL Editor do Supabase, cole o conteudo de `schema.sql` e execute. O `schema.sql` cria as tabelas e aplica politicas de RLS que permitem leitura e escrita apenas para usuarios autenticados.

Para liberar acesso:

1. No Supabase, abra `Authentication`.
2. Crie ou convide os usuarios autorizados por e-mail.
3. Use o e-mail e senha desse usuario na tela de login do WebApp.

Nao existe cadastro publico no WebApp. Quem nao tiver usuario criado no Supabase nao entra.
