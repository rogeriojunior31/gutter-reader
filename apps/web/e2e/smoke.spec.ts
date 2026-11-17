import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('biblioteca → série → leitura com navegação e progresso', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();

  await page.getByRole('link', { name: /Páginas Numeradas/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();

  const counter = page.getByText(/^\d+(–\d+)? \/ 120$/);
  await expect(counter).toHaveText('1 / 120');
  await expect(page.getByAltText('Página 1')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText('3 / 120');
  await expect(page.getByAltText('Página 3')).toBeVisible();

  // Sai do leitor e confere o destaque "continue de onde parou" no Início
  await page.waitForTimeout(600); // debounce do progresso
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: /Continuar/ })).toBeVisible();
  await page.getByRole('link', { name: 'Início' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Páginas Numeradas' })).toBeVisible();
  await expect(page.getByText('página 3 de 120')).toBeVisible();
});

test('mangá RTL inverte as setas', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('link', { name: /Ronin da Maré/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();

  const counter = page.getByText(/^\d+(–\d+)? \/ 42$/);
  await expect(counter).toHaveText('1 / 42');
  await page.keyboard.press('ArrowLeft');
  await expect(counter).toHaveText('2 / 42');
});

test('filtro por gênero na biblioteca', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: /^Gêneros/ }).click();
  await page.getByRole('button', { name: /^Terror/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Remover filtro Terror' })).toBeVisible();
  await expect(page.getByText(/^2 de \d+ séries$/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Contos do Sertão/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Capitã Aurora/ })).toHaveCount(0);
});

test('cria coleção a partir da série e fixa no Início', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('link', { name: /Nebulosa 9/ }).click();
  await page.getByRole('button', { name: 'Adicionar à coleção' }).click();
  await page.getByRole('button', { name: 'Nova coleção' }).click();
  // O foco cai no campo, não no botão Fechar.
  await expect(page.getByPlaceholder(/Favoritos/)).toBeFocused();
  await page.keyboard.type('Sci-fi');
  await page.getByRole('button', { name: 'Criar coleção' }).click();
  // Volta para a lista com a nova coleção já marcada
  await expect(page.getByRole('button', { name: /Sci-fi/, pressed: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pronto' }).click();

  await expect(page.getByRole('link', { name: 'Sci-fi' })).toBeVisible(); // "Nas suas coleções"
  await page.getByRole('link', { name: 'Sci-fi' }).click();
  await expect(page.getByRole('heading', { name: 'Sci-fi' })).toBeVisible();
  await page.getByRole('button', { name: 'Fixar no Início' }).click();

  await page.getByRole('link', { name: 'Início' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sci-fi' })).toBeVisible();
});

test('fim do volume mostra o próximo em vez de trocar de rota em silêncio', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('link', { name: /Ronin da Maré/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();
  await expect(page.getByText(/^1 \/ 42$/)).toBeVisible();

  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft'); // RTL: esquerda avança
  const end = page.getByRole('dialog', { name: /Fim de Vol\. 1/ });
  await expect(end).toBeVisible();
  await expect(end.getByText('Marcado como lido')).toBeVisible();
  await expect(end.getByRole('link', { name: 'Ler Vol. 2' })).toBeFocused();

  await end.getByRole('link', { name: 'Ler Vol. 2' }).click();
  await expect(page.getByText(/^1 \/ 38$/)).toBeVisible();
});

test('marcar tudo como lido pode ser desfeito', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('link', { name: /Nebulosa 9/ }).click();
  await page.getByRole('button', { name: 'Marcar tudo como lido' }).click();
  await expect(page.getByText('3 livros marcados como lido')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vol. 1 lido', pressed: true })).toBeVisible();

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('button', { name: 'Vol. 1 lido', pressed: false })).toBeVisible();
});

test('atalhos: "/" foca a busca e "]" pula para o próximo volume', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /Capitã Aurora/ })).toBeVisible(); // app montado
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Buscar na biblioteca' })).toBeFocused();

  await page.getByRole('link', { name: /Capitã Aurora/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();
  await expect(page.getByText('Capitã Aurora — Vol. 1')).toBeVisible();
  await page.keyboard.press(']');
  await expect(page.getByText('Capitã Aurora — Vol. 2')).toBeVisible();
  await page.keyboard.press('[');
  await expect(page.getByText('Capitã Aurora — Vol. 1')).toBeVisible();
});

test('pasta local: lê CBZ de verdade (fixtures) pelo seletor de pasta', async ({ page }) => {
  // O seletor nativo não é automatizável; força o fallback <input webkitdirectory>.
  await page.addInitScript(() => {
    delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  });
  await page.goto('/library');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Abrir pasta' }).click();
  await (await chooser).setFiles(fileURLToPath(new URL('../../../fixtures/out', import.meta.url)));

  await expect(page.getByRole('link', { name: /Numeradas/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Manga RTL/ })).toBeVisible();
  await expect(page.getByText(/2 arquivos ficaram de fora/)).toBeVisible(); // PDF + CB7

  await page.getByRole('link', { name: /Numeradas/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();
  await expect(page.getByText(/^1 \/ 120$/)).toBeVisible();
  await expect(page.getByAltText('Página 1')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByText(/^120 \/ 120$/)).toBeVisible();
  await expect(page.getByAltText('Página 120')).toBeVisible();
});

test('leituras: páginas lidas viram atividade e a biblioteca vira estante de lado', async ({
  page,
}) => {
  await page.goto('/library');
  await page.getByRole('link', { name: /Capitã Aurora/ }).click();
  await page.getByRole('link', { name: /Começar/ }).click();
  await expect(page.getByAltText('Página 1')).toBeVisible();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^5 \/ 22$/)).toBeVisible();
  await page.waitForTimeout(2500); // o registro grava em lote
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Leituras' }).first().click();
  await expect(page.getByRole('heading', { name: 'Leituras' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoje: 4 páginas' })).toBeVisible();
  await expect(page.getByText('Hoje já conta. Continue amanhã.')).toBeVisible();

  await page.getByRole('link', { name: 'Biblioteca' }).first().click();
  await page.getByRole('button', { name: 'Lado' }).click();
  await expect(page.getByRole('list', { name: 'Séries na estante' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Capitã Aurora, lendo/ })).toBeVisible();
});

test.describe('toque', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('primeiro toque puxa a lombada e mostra "Abrir"; o segundo abre', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: 'Lado' }).tap();
    const spine = page.getByRole('link', { name: /^Nebulosa 9, / });
    await spine.tap();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole('link', { name: 'Abrir' })).toBeVisible();
    await page.getByRole('link', { name: 'Abrir' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Nebulosa 9' })).toBeVisible();
  });
});
