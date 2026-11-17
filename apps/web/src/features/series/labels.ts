import { type Contributor, ROLE_LABEL, type SeriesStatus } from '@gutter/core';

export const STATUS_LABEL: Record<SeriesStatus, string> = {
  ongoing: 'Em andamento',
  completed: 'Finalizada',
  hiatus: 'Em hiato',
  cancelled: 'Cancelada',
};

/** Situação da publicação é metadado, não estado de leitura: tom neutro (só cancelada destoa). */
export const STATUS_TONE: Record<SeriesStatus, 'neutral' | 'red'> = {
  ongoing: 'neutral',
  completed: 'neutral',
  hiatus: 'neutral',
  cancelled: 'red',
};

export const PROVIDER_LABEL = {
  comicinfo: 'ComicInfo.xml',
  anilist: 'AniList',
  comicvine: 'ComicVine',
  manual: 'Manual',
} as const;

/** Nomes únicos dos autores, na ordem em que aparecem. */
export function contributorsLine(contributors: Contributor[] | undefined): string {
  return [...new Set(contributors?.map((c) => c.name))].join(', ');
}

/** Agrupa por nome: "Haruto Mizuno — Roteiro e Arte". */
export function contributorsByPerson(contributors: Contributor[] | undefined) {
  const map = new Map<string, string[]>();
  for (const c of contributors ?? []) {
    map.set(c.name, [...(map.get(c.name) ?? []), ROLE_LABEL[c.role]]);
  }
  return [...map.entries()].map(([name, roles]) => ({
    name,
    roles: roles.join(' e '),
  }));
}
