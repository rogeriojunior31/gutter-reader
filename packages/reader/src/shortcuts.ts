/** Atalhos do leitor. Fonte única: a ajuda do leitor e a tela de Ajustes usam esta lista. */
export const READER_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['→', 'D'], label: 'Próxima página' },
  { keys: ['←', 'A'], label: 'Página anterior' },
  { keys: ['Espaço'], label: 'Avançar (Shift volta)' },
  { keys: ['Home', 'End'], label: 'Primeira / última página' },
  { keys: ['[', ']'], label: 'Volume anterior / próximo' },
  { keys: ['M'], label: 'Mostrar ou esconder as barras' },
  { keys: ['F'], label: 'Tela cheia' },
  { keys: ['B'], label: 'Leitura guiada: balão a balão (setas seguem, Esc sai)' },
  { keys: ['?'], label: 'Ajuda de atalhos' },
  { keys: ['Esc'], label: 'Fechar painel ou sair do leitor' },
];
