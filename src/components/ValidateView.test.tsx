/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidateView } from './ValidateView';
import { getTranslations } from '../i18n';
import { clearFetchCache } from '../lib/fetch-cache';

const t = getTranslations();

describe('ValidateView Component', () => {
  beforeEach(() => {
    clearFetchCache();
  });
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

  it('handles remote validation 400 error and displays pinpointed issue with suggestion', async () => {
    // Mock fetch for validation API
    const mockResponse = {
      type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400',
      title: 'Error deserializing JSON request body',
      status: 400,
      errors: [
        {
          ruleId: 'quality__req_json_unknown_property',
          message: "JSON message contains a field that does not belong to class 'ValidatePlan': 'planKea'",
          instance: '$.planKea'
        },
        {
          ruleId: 'quality__req_json_deserialization_failure',
          message: "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
          instance: 'planDto'
        }
      ]
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: any) => {
      const url = typeof input === 'string' ? input : (input?.url || String(input));
      if (url.includes('Validate')) {
        return Promise.resolve({
          status: 400,
          ok: false,
          text: () => Promise.resolve(JSON.stringify(mockResponse)),
          json: () => Promise.resolve(mockResponse)
        } as Response);
      }
      if (url.includes('municipalities')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve([{ natcode: '601', nameFin: 'Pori' }]),
          text: () => Promise.resolve(JSON.stringify([{ natcode: '601', nameFin: 'Pori' }]))
        } as Response);
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]')
      } as Response);
    });

    let windowSpy: any = null;
    if (typeof window !== 'undefined' && window.fetch) {
      windowSpy = vi.spyOn(window, 'fetch').mockImplementation(fetchSpy.getMockImplementation()!);
    }

    try {
      const { container } = render(<ValidateView onBack={vi.fn()} />);

      // Put invalid plan with "planKea" on line 2
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const testJson = JSON.stringify(
        {
          planKea: '43ec642a-61d7-427d-9aa1-4046ca994b54'
        },
        null,
        2
      );
      fireEvent.change(textarea, { target: { value: testJson } });

      // Click Validate button
      fireEvent.click(screen.getByTestId('run-validate-btn'));

      await waitFor(() => {
        // Should show error title
        expect(screen.getByText(new RegExp(t.validation.errorTitle))).toBeDefined();
        // Should display friendly message mentioning planKea
        expect(screen.getByText(/kenttää "planKea/i)).toBeDefined();
        // Should suggest planKey
        expect(screen.getByText(/planKey/i)).toBeDefined();
        // Should NOT display redundant planDto error
        expect(screen.queryByText(/planDto/i)).toBeNull();
      });
    } finally {
      fetchSpy.mockRestore();
      if (windowSpy) windowSpy.mockRestore();
    }
  });
});