/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Mermaid } from './Mermaid';

// Mock motion/react to prevent requestAnimationFrame/animation-loop test hangs
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

// Configure dynamic mock for mermaid library rendering
let mockRenderResult = vi.fn();

vi.mock('../lib/mermaid', () => {
  return {
    default: {
      initialize: vi.fn(),
      render: (...args: any[]) => mockRenderResult(...args),
    },
  };
});

describe('Mermaid component', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to success rendering
    mockRenderResult.mockResolvedValue({
      svg: '<svg viewBox="0 0 100 100" data-testid="mock-mermaid-svg"><rect width="100" height="100" fill="red" /></svg>',
      bindFunctions: vi.fn(),
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders successfully and shows mock SVG content', async () => {
    render(<Mermaid chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    expect(mockRenderResult).toHaveBeenCalled();
  });

  it('renders error fallback on render exception', async () => {
    mockRenderResult.mockRejectedValue(new Error('Mermaid compiler syntax crash'));

    render(<Mermaid chart="graph TD; invalid_syntax_@@@!!!" />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-fallback')).toBeDefined();
    });

    const fallback = screen.getByTestId('mermaid-fallback');
    expect(fallback.textContent).toContain('Mermaid-kaavion piirto epäonnistui');
  });

  it('opens full-screen modal on clicking container', async () => {
    render(<Mermaid chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeDefined();
    });

    const containerButton = screen.getByTestId('mermaid-container');
    fireEvent.click(containerButton);

    // Modal should occupy screen
    const modal = screen.getByTestId('mermaid-modal');
    expect(modal).toBeDefined();

    // Controllers should show zoom levels
    expect(screen.getByText(/%/i)).toBeDefined();
  });
});
