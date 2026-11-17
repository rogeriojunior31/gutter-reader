# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas que mantêm a própria coleção de HQs, mangás e webtoons em arquivos (CBZ, CBR, PDF) e
querem lê-la bem, sem depender de loja ou serviço de terceiros. O Gutter é um projeto aberto:
qualquer pessoa pode instalá-lo, inclusive no próprio homelab. O autor é o primeiro usuário.

Leem em três situações, todas de primeira classe:

- **PC/monitor:** mesa, tela grande, teclado; página dupla e atalhos importam.
- **Celular:** uma mão, deitado ou em trânsito; toque, tela cheia, leitura offline.
- **Tablet:** retrato ou paisagem; mangá e página dupla no meio-termo.

O trabalho deles é ler uma edição do começo ao fim, retomar de onde pararam e organizar a
coleção (séries, coleções, lidos/não lidos).

## Product Purpose

Um leitor de quadrinhos para arquivos que a pessoa já tem. Sucesso é abrir uma edição em menos
de meio segundo, ler sem a interface atrapalhar e nunca perder o lugar onde parou, em qualquer
aparelho.

## Positioning

Quatro diferenças em relação a Komga, Kavita e Mihon, todas confirmadas pelo autor:

1. **Leitor em primeiro lugar.** A experiência de leitura é o produto; a biblioteca é a antessala.
2. **Funciona sem servidor.** Abre uma pasta direto no navegador; o servidor é opcional.
3. **HQ, mangá e webtoon como cidadãos iguais.** Leitura ocidental, oriental (direita para a
   esquerda) e vertical contínua, sem um formato adaptado ao outro.
4. **Simples de hospedar.** Quando há servidor, é um container só, leve, sem banco externo.

## Operating Context

- Modo local: PWA no navegador lendo uma pasta do computador (File System Access API no
  Chromium; seleção de pasta a cada visita nos demais).
- Modo servidor (fase 2): servidor Go no homelab, acesso de fora de casa pelo Tailscale,
  feed OPDS para Mihon, Paperback e KOReader.
- Mobile (fase 3): PWA instalável com leitura offline; APK via Capacitor só se a PWA bater em
  limite real.
- Bibliotecas reais são bagunçadas: nomes de arquivo inconsistentes, pastas duplicadas,
  páginas de créditos de grupos de scan, ComicInfo.xml frequentemente ausente.

## Capabilities and Constraints

- Formatos: CBZ e CBR (RAR4/RAR5) funcionando; PDF e CB7 planejados.
- Modos de leitura: página única, página dupla (spreads sozinhos, capa sozinha), webtoon;
  direção ocidental e oriental; ajuste por tela, largura, altura ou original.
- Progresso, preferências por série e coleções ficam no navegador; a fase 2 sincroniza.
- Decodificação sempre fora da thread principal; memória limitada a uma janela de páginas.
- Interface em pt-BR.
- Pedido do autor (planejado): **foco no balão**: tocar num balão de fala e a página enquadra
  aquele balão para leitura, com ampliação simples como fallback.
- Fora de escopo por enquanto: loja, DRM, iOS nativo, Play Store.

## Brand Commitments

- Nome: **Gutter** (o espaço entre os quadros de uma HQ).
- Marca existente: logotipo de três quadros em grade (`apps/web/public/icon.svg`). Não foi
  declarado como definitivo.

## Evidence on Hand

- Plano por fases no README do repositório.
- Biblioteca real de teste do autor (fora do repositório): 24 edições de Demon Knights, CBZ e
  CBR misturados, sem ComicInfo.xml. Desempenho medido com ela: primeira página em 170 ms (CBZ)
  e 315 ms (CBR), virar página ~8 ms.
- Não há usuários externos, depoimentos, métricas de uso nem comparativos publicados. Não
  inventar.

## Product Principles

1. A página é o produto: tudo na tela de leitura existe para sair da frente.
2. Respeitar a coleção como ela é: lidar com nomes e pastas bagunçados em vez de exigir
   organização.
3. Os arquivos são da pessoa: nada sai do aparelho sem ela pedir; servidor é escolha, não
   requisito.
4. Cada formato com seu jeito de ler: oriental, ocidental e vertical, sem gambiarra.
5. Rápido de verdade: metas medidas (abrir < 500 ms, virar página < 50 ms), não impressão.

## Accessibility & Inclusion

Navegação completa por teclado, foco visível, contraste AA no texto da interface e alvos de
toque de 44 px. A leitura em si depende da imagem da página; recursos que ajudem a ler o texto
dos balões (como o foco no balão) contam também como acessibilidade para baixa visão.
