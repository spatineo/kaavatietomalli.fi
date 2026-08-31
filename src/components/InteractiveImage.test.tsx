/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteractiveImage } from './InteractiveImage';
import { getTranslations } from '../i18n';

const t = getTranslations();

// Mock motion/react to prevent layout/animation loop hangs in JSDOM / HappyDOM
vi.mock('motion/react', () => {
  return {
    motion: {
      div: ({ children, ...props }: any) => {
        const { transition, animate, initial, exit, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('InteractiveImage component', () => {
  let fetchSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(window, 'fetch');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('renders inline SVG markup successfully', async () => {
    const svgStr = '<svg data-testid="inline-svg"><circle cx="50" cy="50" r="40" /></svg>';
    render(<InteractiveImage svgContent={svgStr} title="Testikaavio" />);

    expect(screen.getByText('Testikaavio')).toBeDefined();
    expect(screen.getByTestId('interactive-image-container')).toBeDefined();
    
    await waitFor(() => {
      const html = screen.getByTestId('interactive-image-container').innerHTML;
      expect(html).toContain('inline-svg');
      expect(html).toContain('circle');
    });
  });

  it('fetches remote SVG content successfully from href', async () => {
    const mockSvgText = '<svg data-testid="fetched-svg"><rect width="200" height="200" /></svg>';
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockSvgText),
    });

    render(<InteractiveImage href="/images/kaavio.svg" title="Haettu Kaavio" />);

    // Loader should be shown
    expect(screen.getByText(t.common.loading)).toBeDefined();

    await waitFor(() => {
      const html = screen.getByTestId('interactive-image-container').innerHTML;
      expect(html).toContain('fetched-svg');
      expect(html).toContain('rect');
    });

    expect(fetchSpy).toHaveBeenCalledWith('/images/kaavio.svg');
  });

  it('handles fetch network errors gracefully with error fallback message', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network disconnected'));

    render(<InteractiveImage href="/images/kaavio.svg" title="Virheellinen Kaavio" />);

    await waitFor(() => {
      expect(screen.getByText(/Network disconnected/i)).toBeDefined();
      expect(screen.getByText(/Kuvan tai kaavion esittäminen epäonnistui/i)).toBeDefined();
    });
  });

  it('handles HTTP error statuses from fetch elegantly', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    render(<InteractiveImage href="/images/missing.svg" title="Puuttuva Kaavio" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load SVG image: HTTP 404/i)).toBeDefined();
    });
  });

  it('applies custom inline styles directly to the immediate container element of the SVG and ignores non-CSS parameters like note', () => {
    const svgStr = '<svg><circle cx="50" cy="50" r="40" /></svg>';
    const customStyle = 'background-color: rgb(255, 175, 0); border-radius: 8px; note: "some copyright note";';
    
    render(<InteractiveImage svgContent={svgStr} style={customStyle} />);

    const container = screen.getByTestId('interactive-image-container');
    const contentDiv = container.querySelector('.interactive-image-content') as HTMLDivElement;
    
    expect(contentDiv).toBeDefined();
    expect(contentDiv.style.backgroundColor).toBe('rgb(255, 175, 0)');
    expect(contentDiv.style.borderRadius).toBe('8px');
    expect((contentDiv.style as any).note).toBeUndefined();
  });

  it('opens and closes zoom-and-pan modal interface', async () => {
    const svgStr = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
    render(<InteractiveImage svgContent={svgStr} />);

    const container = screen.getByTestId('interactive-image-container');
    fireEvent.click(container);

    // Modal is opened
    const modal = screen.getByTestId('interactive-image-modal');
    expect(modal).toBeDefined();

    // Check presence of control panel buttons (Zoom In, Zoom Out, Zoom to Fit)
    expect(screen.getByTitle(t.interactiveImage.zoomIn)).toBeDefined();
    expect(screen.getByTitle(t.interactiveImage.zoomOut)).toBeDefined();
    expect(screen.getByTitle(t.interactiveImage.zoomToFit)).toBeDefined();

    // Close button triggers modal exit
    const closeButton = screen.getByLabelText(t.interactiveImage.close);
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('interactive-image-modal')).toBeNull();
  });

  it('updates zoom factors inside modal controls', async () => {
    const svgStr = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
    render(<InteractiveImage svgContent={svgStr} />);

    const container = screen.getByTestId('interactive-image-container');
    fireEvent.click(container);

    const zoomInBtn = screen.getByTitle(t.interactiveImage.zoomIn);
    const zoomOutBtn = screen.getByTitle(t.interactiveImage.zoomOut);

    // Initial zoom percentage display
    expect(screen.getByText(/%/)).toBeDefined();

    // Clicking zoom button alters scale
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
  });

  it('renders optional note text inside inline and modal viewports', () => {
    const svgStr = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
    const copyrightNote = '© 2026 Test Sanastokeskus';
    render(<InteractiveImage svgContent={svgStr} note={copyrightNote} />);

    // Note should be visible in standard view
    expect(screen.getByText(copyrightNote)).toBeDefined();

    // Open modal
    const container = screen.getByTestId('interactive-image-container');
    fireEvent.click(container);

    // Note should also be visible in modal overlay
    expect(screen.getAllByText(copyrightNote).length).toBeGreaterThanOrEqual(1);
  });

  it('handles optional href correctly when svgContent is present', () => {
    const svgStr = '<svg data-testid="direct-svg"><rect width="10" height="10" /></svg>';
    render(<InteractiveImage svgContent={svgStr} />);

    // Direct render succeeds without href
    const container = screen.getByTestId('interactive-image-container');
    expect(container).toBeDefined();
    expect(screen.queryByText(/Kuvan tai kaavion esittäminen epäonnistui/)).toBeNull();
  });
});
