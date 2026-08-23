/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    const testToggle = screen.getByText(/Syke Test/);
    const prodToggle = screen.getByText(/Syke Prod/);
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

  it('displays Syke-specific errors and localized messages correctly on API response', async () => {
    const mockResponse = {
      type: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
      title: "One or more validation errors occurred.",
      status: 422,
      detail: "Validation failed: ...",
      errors: [
        {
          ruleId: "lifecycle__req_plan_validation_not_allowed_lifecycle",
          message: "Validation of the zoning plan is not possible...",
          localizedMessage: {
            fi: "Erityinen suomalainen virhesanoma elinkaaritilasta"
          },
          instance: "lifeCycleStatus"
        }
      ],
      warnings: [
        {
          ruleId: "quality__warn_something",
          message: "Warning message",
          localizedMessage: {
            fi: "Suomenkielinen varoitussanoma"
          },
          instance: "plan.geographicalArea"
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      status: 422,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ValidateView onBack={vi.fn()} />);

    // Put valid values to inputs to bypass parameter check
    const apiKeyInput = screen.getByPlaceholderText(new RegExp(t.validation.apiKeyPlaceholder));
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    const areaInput = screen.getByPlaceholderText(new RegExp(t.validation.areaPlaceholder));
    fireEvent.change(areaInput, { target: { value: '049' } });

    // Enter valid JSON directly to avoid async state update race conditions
    const textarea = screen.getByPlaceholderText('{}');
    fireEvent.change(textarea, { target: { value: '{"test": true}' } });

    // Trigger validation
    const validateBtn = screen.getByRole('button', { name: t.validation.buttonValidate });
    fireEvent.click(validateBtn);

    // Wait for mock fetch to resolve and error items to render
    const ruleIdElement = await screen.findByText(/lifecycle__req_plan_validation_not_allowed_lifecycle/);
    expect(ruleIdElement).toBeDefined();

    const fiMessage = screen.getByText(/Erityinen suomalainen virhesanoma elinkaaritilasta/);
    expect(fiMessage).toBeDefined();

    const warnRule = screen.getByText(/quality__warn_something/);
    expect(warnRule).toBeDefined();

    const warnFiMessage = screen.getByText(/Suomenkielinen varoitussanoma/);
    expect(warnFiMessage).toBeDefined();

    vi.unstubAllGlobals();
  });

  it('supports switching to the interactive tab and highlights lines when clicking error cards', async () => {
    const mockResponse = {
      status: 422,
      errors: [
        {
          ruleId: "some_rule",
          message: "Field error description",
          localizedMessage: { fi: "Kenttävirheen kuvaus" },
          instance: "lifeCycleStatus"
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      status: 422,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ValidateView onBack={vi.fn()} />);

    // Configure credentials
    fireEvent.change(screen.getByPlaceholderText(new RegExp(t.validation.apiKeyPlaceholder)), { target: { value: 'key' } });
    fireEvent.change(screen.getByPlaceholderText(new RegExp(t.validation.areaPlaceholder)), { target: { value: '049' } });
    
    // Set formatted JSON matching 'lifeCycleStatus'
    const testJson = JSON.stringify({ lifeCycleStatus: "01" }, null, 2);
    fireEvent.change(screen.getByPlaceholderText('{}'), { target: { value: testJson } });

    // Validate
    fireEvent.click(screen.getByRole('button', { name: t.validation.buttonValidate }));

    // Wait for validation card (which is now a button)
    const errorCardBtn = await screen.findByRole('button', { name: /lifeCycleStatus/ });
    expect(errorCardBtn).toBeDefined();

    // Click error card
    fireEvent.click(errorCardBtn);

    // Now, the interactive tab should be active
    const previewHeader = screen.getByText(/Rakennetarkastelu ja virhemerkinnät/);
    expect(previewHeader).toBeDefined();

    vi.unstubAllGlobals();
  });
});
