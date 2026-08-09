import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TableOfContents } from './TableOfContents';
import { HeaderItem, assignHeadingPrefixes } from './MarkdownHeading';
import React from 'react';

describe('TableOfContents Component', () => {
  const mockHeadings: HeaderItem[] = [
    { level: 1, text: 'Pääotsikko', id: 'paaotsikko' },
    { level: 2, text: 'Alaotsikko 1', id: 'alaotsikko-1' },
    { level: 3, text: 'Syvä otsikko', id: 'syva-otsikko' },
    { level: 2, text: 'Alaotsikko 2', id: 'alaotsikko-2' },
  ];

  it('renders table of contents trigger', () => {
    render(<TableOfContents headings={mockHeadings} />);
    const trigger = screen.getByTestId('toc-trigger');
    expect(trigger).toBeDefined();
  });

  it('opens and closes popup when clicked and lists headings with indentations', async () => {
    render(<TableOfContents headings={mockHeadings} />);
    const trigger = screen.getByTestId('toc-trigger');
    
    // Closed initially
    expect(screen.queryByTestId('toc-popup')).toBeNull();

    // Click trigger to open
    await act(async () => {
      fireEvent.click(trigger);
    });
    const popup = screen.getByTestId('toc-popup');
    expect(popup).toBeDefined();

    // Verify all heading buttons are rendered
    expect(screen.getByText('Pääotsikko')).toBeDefined();
    expect(screen.getByText('Alaotsikko 1')).toBeDefined();
    expect(screen.getByText('Syvä otsikko')).toBeDefined();
    expect(screen.getByText('Alaotsikko 2')).toBeDefined();

    // Check padding / indent style on some headings to confirm nesting indentation
    const paaotsikkoBtn = screen.getByText('Pääotsikko');
    const alaotsikkoBtn = screen.getByText('Alaotsikko 1');
    const syvaOtsikkoBtn = screen.getByText('Syvä otsikko');

    // Level 1: (1-1)*12 = 0px
    expect(paaotsikkoBtn.style.paddingLeft).toBe('0px');
    // Level 2: (2-1)*12 = 12px
    expect(alaotsikkoBtn.style.paddingLeft).toBe('12px');
    // Level 3: (3-1)*12 = 24px
    expect(syvaOtsikkoBtn.style.paddingLeft).toBe('24px');
  });

  it('handles heading click and triggers smooth scroll and hash updates', async () => {
    // Setup a mock DOM element to scroll into view
    const scrollMock = vi.fn();
    const mockElement = {
      scrollIntoView: scrollMock,
    };
    const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    render(<TableOfContents headings={mockHeadings} />);
    
    // Open menu
    await act(async () => {
      fireEvent.click(screen.getByTestId('toc-trigger'));
    });
    
    // Click heading item
    const headingBtn = screen.getByText('Alaotsikko 1');
    await act(async () => {
      fireEvent.click(headingBtn);
    });

    // Wait for the tiny timeout inside the component
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getElementSpy).toHaveBeenCalledWith('alaotsikko-1');
    expect(scrollMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(window.location.hash).toBe('#alaotsikko-1');

    getElementSpy.mockRestore();
  });

  it('assigns correct hierarchical heading prefixes', () => {
    const testHeadings: HeaderItem[] = [
      { level: 1, text: 'Title', id: 'title' },
      { level: 2, text: 'First H2', id: 'first-h2' },
      { level: 3, text: 'First H3', id: 'first-h3' },
      { level: 3, text: 'Second H3', id: 'second-h3' },
      { level: 4, text: 'First H4', id: 'first-h4' },
      { level: 2, text: 'Second H2', id: 'second-h2' },
      { level: 3, text: 'First H3 under Second H2', id: 'first-h3-under-second-h2' },
    ];

    const result = assignHeadingPrefixes(testHeadings, true);

    expect(result[0].prefix).toBeUndefined(); // Level 1 title has no prefix
    expect(result[1].prefix).toBe('1'); // First H2
    expect(result[2].prefix).toBe('1.1'); // First H3
    expect(result[3].prefix).toBe('1.2'); // Second H3
    expect(result[4].prefix).toBe('1.2.1'); // First H4 under Second H3
    expect(result[5].prefix).toBe('2'); // Second H2
    expect(result[6].prefix).toBe('2.1'); // First H3 under Second H2
  });
});
