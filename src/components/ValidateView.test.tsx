/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidateView } from './ValidateView';
import { getTranslations } from '../i18n';

const t = getTranslations();

describe('ValidateView Component', () => {
  it('renders titles and initial inputs correctly', () => {
    const handleBack = vi.fn();
    render(<ValidateView onBack={handleBack} />);

    // Verify Title exists
    const title = screen.queryByText(new RegExp(t.validation.title));
    expect(title).toBeDefined();

    // Verify back button works
    const backBtn = screen.getByText(new RegExp(t.common.backToHome));
    expect(backBtn).toBeDefined();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('supports environment and input modifications', () => {
    render(<ValidateView onBack={vi.fn()} />);

    // Toggle test / prod
    const testToggle = screen.getByText(t.validation.environmentTest);
    const prodToggle = screen.getByText(t.validation.environmentProduction);
    expect(testToggle).toBeDefined();
    expect(prodToggle).toBeDefined();

    // Load example button
    const loadExampleBtn = screen.getByText(new RegExp(t.validation.buttonExample));
    expect(loadExampleBtn).toBeDefined();
    fireEvent.click(loadExampleBtn);

    // Format JSON button
    const formatBtn = screen.getByText(new RegExp(t.validation.buttonFormat));
    expect(formatBtn).toBeDefined();
    fireEvent.click(formatBtn);
  });

  it('validates JSON structure', () => {
    render(<ValidateView onBack={vi.fn()} />);

    const textarea = screen.getByPlaceholderText('{}');
    expect(textarea).toBeDefined();

    // Enter invalid JSON
    fireEvent.change(textarea, { target: { value: '{ invalid: json }' } });

    // Click format JSON to trigger error validation
    const formatBtn = screen.getByText(new RegExp(t.validation.buttonFormat));
    fireEvent.click(formatBtn);

    // Should display invalid JSON error
    const errorAlert = screen.queryByText(new RegExp(t.validation.invalidJson));
    expect(errorAlert).toBeDefined();
  });

  it('loads a local JSON file into the JSON editor', async () => {
    render(<ValidateView onBack={vi.fn()} />);

    const loadFileBtn = screen.getByText(new RegExp(t.validation.buttonLoadFile));
    expect(loadFileBtn).toBeDefined();

    const file = new File(['{"uploadedPlanKey": "test-123"}'], 'test-plan.json', {
      type: 'application/json',
    });

    // Find hidden input
    const fileInput = screen.getByText(t.validation.buttonLoadFile).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('{}') as HTMLTextAreaElement;
      expect(textarea.value).toContain('"uploadedPlanKey": "test-123"');
    });
  });
});