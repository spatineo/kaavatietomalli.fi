import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { slugify, getTextContent, MarkdownHeading, useHeadings } from './MarkdownHeading';

describe('MarkdownHeading slugify helper', () => {
  it('converts Finnish characters ä, å to a and ö to o', () => {
    expect(slugify('Käsittely ja säännöt')).toBe('kasittely-ja-saannot');
    expect(slugify('Ympäristöministeriö')).toBe('ymparistoministerio');
    expect(slugify('Åland')).toBe('aland');
  });

  it('converts non-alphanumeric characters to hyphens and cleans trailing hyphens', () => {
    expect(slugify('Hello, World!!!')).toBe('hello-world');
    expect(slugify('   Heading with Spaces   ')).toBe('heading-with-spaces');
    expect(slugify('multiple---dashes')).toBe('multiple-dashes');
  });

  it('handles mixed casing and numbers', () => {
    expect(slugify('Version 1.2.3 - Release Notes')).toBe('version-1-2-3-release-notes');
  });

  it('handles empty or purely punctuation inputs', () => {
    expect(slugify('!!!???')).toBe('');
  });
});

describe('MarkdownHeading getTextContent helper', () => {
  it('extracts plain text from React nodes', () => {
    expect(getTextContent('Simple Text')).toBe('Simple Text');
    expect(getTextContent(123)).toBe('123');
    expect(getTextContent(<span>Nested <strong>Text</strong></span>)).toBe('Nested Text');
    expect(getTextContent(['Array ', <span>of </span>, 'nodes'])).toBe('Array of nodes');
  });
});

describe('MarkdownHeading Component', () => {
  it('renders heading element with correct id and anchors', () => {
    render(<MarkdownHeading level={2}>Käyttöliittymä & Suunnittelu</MarkdownHeading>);
    
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeDefined();
    expect(heading.id).toBe('kayttoliittyma-suunnittelu');

    const anchor = heading.querySelector('a');
    expect(anchor).toBeDefined();
    expect(anchor?.getAttribute('href')).toBe('#kayttoliittyma-suunnittelu');
  });
});

describe('useHeadings hook', () => {
  function TestComponent({ content }: { content: string }) {
    const headings = useHeadings(content);
    return (
      <ul>
        {headings.map((h, i) => (
          <li key={i} data-testid="heading-item">
            {h.level} - {h.text} - {h.id}
          </li>
        ))}
      </ul>
    );
  }

  it('correctly parses markdown headings and ignores code blocks', () => {
    const markdown = `
# Main Title
Some paragraph text.
## Alueidenkäyttölaki (132/1999)

\`\`\`markdown
## Fake Heading inside code block
\`\`\`

### Katja I -asetus
    `;
    render(<TestComponent content={markdown} />);
    const items = screen.getAllByTestId('heading-item');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('1 - Main Title - main-title');
    expect(items[1].textContent).toBe('2 - Alueidenkäyttölaki (132/1999) - alueidenkayttolaki-132-1999');
    expect(items[2].textContent).toBe('3 - Katja I -asetus - katja-i-asetus');
  });
});
