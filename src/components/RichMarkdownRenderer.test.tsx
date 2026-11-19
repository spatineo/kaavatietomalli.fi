/**
 * @license
 * SPDX-License-Identifier: MIT
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownRenderer } from './RichMarkdownRenderer';

const mockNavigate = vi.fn();
const mockOnHome = vi.fn();

// Mock getTranslations and useAppRouter to avoid dependency failures
vi.mock('../hooks/useRouter', () => ({
  useAppRouter: () => ({
    navigate: mockNavigate,
    onHome: mockOnHome,
  }),
}));

describe('MarkdownRenderer Callout Blocks', () => {
  it('renders a normal blockquote if no annotation is present', () => {
    const markdown = `
> This is a normal blockquote.
> It should not have any callout classes.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).not.toContain('callout-block');
    expect(blockquote.textContent).toContain('This is a normal blockquote.');
  });

  it('detects and renders [!NOTE] callout block correctly', () => {
    const markdown = `
> [!NOTE]
> Tämä on tärkeä huomautus lukijalle.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-note');

    const title = blockquote.querySelector('.callout-title');
    expect(title).toBeDefined();
    expect(title?.textContent).toBe('Huomautus');

    // Check that marker itself [!NOTE] is stripped, but content is preserved
    expect(blockquote.textContent).not.toContain('[!NOTE]');
    expect(blockquote.textContent).toContain('Tämä on tärkeä huomautus lukijalle.');
  });

  it('detects and renders [!VAROITUS] warning callout block correctly', () => {
    const markdown = `
> [!VAROITUS]
> Älä muuta näitä määrityksiä ilman lupaa.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-warning');

    const title = blockquote.querySelector('.callout-title');
    expect(title?.textContent).toBe('Varoitus');

    expect(blockquote.textContent).not.toContain('[!VAROITUS]');
    expect(blockquote.textContent).toContain('Älä muuta näitä määrityksiä ilman lupaa.');
  });

  it('detects and renders [!TÄRKEÄÄ] tip callout block correctly', () => {
    const markdown = `
> [!TÄRKEÄÄ]
> Muista tallentaa säännöllisesti.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-tip');

    const title = blockquote.querySelector('.callout-title');
    expect(title?.textContent).toBe('Tärkeää');

    expect(blockquote.textContent).not.toContain('[!TÄRKEÄÄ]');
    expect(blockquote.textContent).toContain('Muista tallentaa säännöllisesti.');
  });

  it('detects and renders [!HUOMAA] info callout block correctly', () => {
    const markdown = `
> [!HUOMAA]
> Tämä ominaisuus on vielä kokeellinen.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-info');

    const title = blockquote.querySelector('.callout-title');
    expect(title?.textContent).toBe('Huomaa');

    expect(blockquote.textContent).not.toContain('[!HUOMAA]');
    expect(blockquote.textContent).toContain('Tämä ominaisuus on vielä kokeellinen.');
  });

  it('supports brackets without exclamation marks like [NOTE] or [HUOMAA]', () => {
    const markdown = `
> [HUOMAA]
> Tämäkin on toimiva muoto.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-info');

    const title = blockquote.querySelector('.callout-title');
    expect(title?.textContent).toBe('Huomaa');
    expect(blockquote.textContent).not.toContain('[HUOMAA]');
  });

  it('supports custom titles via Double Colon notation, e.g. [Note::Historiallinen huomio]', () => {
    const markdown = `
> [Note::Historiallinen huomio]
> Kehityksen alkuvaiheessa arveltiin, että tämä riittää.
    `;
    render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toBeDefined();
    expect(blockquote.className).toContain('callout-block');
    expect(blockquote.className).toContain('callout-note');

    const title = blockquote.querySelector('.callout-title');
    expect(title?.textContent).toBe('Historiallinen huomio');
    expect(blockquote.textContent).not.toContain('[Note::Historiallinen huomio]');
    expect(blockquote.textContent).toContain('Kehityksen alkuvaiheessa arveltiin, että tämä riittää.');
  });
});

describe('MarkdownRenderer Link and Image URLs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnHome.mockClear();
  });

  it('renders autolinked email addresses as clean mailto: links without prepending relative base paths', () => {
    const markdown = 'Ota yhteyttä toimitus-kaavatietomalli@kaavatietomalli.fi lisätietoja varten.';
    render(<MarkdownRenderer markdownContent={markdown} slug="palaute" />);

    const link = screen.getByRole('link', { name: 'toimitus-kaavatietomalli@kaavatietomalli.fi' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('mailto:toimitus-kaavatietomalli@kaavatietomalli.fi');
  });

  it('renders explicit markdown mailto links cleanly without prepending base paths', () => {
    const markdown = 'Lähetä viesti [toimitukselle](mailto:toimitus-kaavatietomalli@kaavatietomalli.fi).';
    render(<MarkdownRenderer markdownContent={markdown} slug="palaute" />);

    const link = screen.getByRole('link', { name: 'toimitukselle' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('mailto:toimitus-kaavatietomalli@kaavatietomalli.fi');
  });

  it('does not intercept mailto: link clicks with SPA router navigation', () => {
    const markdown = '[Ota yhteyttä](mailto:toimitus-kaavatietomalli@kaavatietomalli.fi)';
    render(<MarkdownRenderer markdownContent={markdown} slug="palaute" />);

    const link = screen.getByRole('link', { name: 'Ota yhteyttä' });
    fireEvent.click(link);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOnHome).not.toHaveBeenCalled();
  });

  it('still resolves image src URLs with resolveImageUrl', () => {
    const markdown = '![Kaavakartta](images/kaavakartta.png)';
    const { container } = render(<MarkdownRenderer markdownContent={markdown} slug="test-post" />);

    const img = container.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toMatch(/\/images\/kaavakartta\.png$/);
  });
});
