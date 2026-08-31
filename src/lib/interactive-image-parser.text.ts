import { describe, it, expect } from 'vitest';
import { parseInteractiveImageBlock } from './interactive-image-parser';

describe('parseInteractiveImageBlock', () => {
  it('correctly reads preceeding note and style lines in DSL block format', () => {
    const dsl = `
title: Test Title
note: "© 2026 Kaavatietomalli"
style: background-color: #fff; max-width: 100%;
`;
    const result = parseInteractiveImageBlock(dsl);
    expect(result.title).toBe('Test Title');
    expect(result.note).toBe('© 2026 Kaavatietomalli');
    expect(result.style).toBe('background-color: #fff; max-width: 100%;');
  });

  it('correctly reads style and preceeding note lines in alternate order', () => {
    const dsl = `
style: background-color: #000;
note: Copyright 2026
`;
    const result = parseInteractiveImageBlock(dsl);
    expect(result.note).toBe('Copyright 2026');
    expect(result.style).toBe('background-color: #000;');
  });

  it('correctly parses JSON formatted input', () => {
    const jsonStr = JSON.stringify({
      href: '/img.svg',
      note: 'Copyright JSON',
      style: 'opacity: 0.8;'
    });
    const result = parseInteractiveImageBlock(jsonStr);
    expect(result.href).toBe('/img.svg');
    expect(result.note).toBe('Copyright JSON');
    expect(result.style).toBe('opacity: 0.8;');
  });
});
