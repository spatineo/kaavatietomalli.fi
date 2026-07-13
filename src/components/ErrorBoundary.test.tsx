/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { getTranslations } from '../i18n';

const t = getTranslations();

// Helper component that throws an error conditionally
function FaultyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test rendering error');
  }
  return <div data-testid="healthy-child">All good!</div>;
}

describe('ErrorBoundary component', () => {
  let consoleErrorSpy: any;
  let originalLocation: any;

  beforeEach(() => {
    // Suppress console.error inside react/vitest for expected error boundaries
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location.href assignment to avoid real redirects in test environment
    originalLocation = window.location;
    // We delete the window.location and re-define it as a writable mock
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: '',
      origin: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    window.location = originalLocation;
  });

  it('renders children successfully when there is no error', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeDefined();
    expect(screen.getByTestId('healthy-child').textContent).toBe('All good!');
  });

  it('renders custom fallback when an error is caught and custom fallback prop is provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('healthy-child')).toBeNull();
    expect(screen.getByTestId('custom-fallback')).toBeDefined();
    expect(screen.getByTestId('custom-fallback').textContent).toBe('Custom error UI');
  });

  it('renders default localized fallback card with reset button when no custom fallback is provided', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('healthy-child')).toBeNull();
    
    // Check for error card elements
    const errorCard = document.getElementById('error-boundary-card');
    expect(errorCard).not.toBeNull();
    
    // Check for correct translated title and details
    expect(screen.getByText(t.errorBoundary.title)).toBeDefined();
    expect(screen.getByText(t.errorBoundary.description)).toBeDefined();
    expect(screen.getByText(/Test rendering error/i)).toBeDefined();

    // Reset button exists
    const resetBtn = document.getElementById('error-reset-btn');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn?.textContent).toContain(t.errorBoundary.button);
  });

  it('invokes onReset callback and triggers redirection when reset button is clicked', () => {
    const onResetMock = vi.fn();
    
    render(
      <ErrorBoundary onReset={onResetMock}>
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const resetBtn = document.getElementById('error-reset-btn');
    expect(resetBtn).not.toBeNull();

    fireEvent.click(resetBtn!);

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toContain('http://localhost:3000');
  });
});
