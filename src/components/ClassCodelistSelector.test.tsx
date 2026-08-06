/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassCodelistSelector } from './ClassCodelistSelector';
import { getTranslations } from '../i18n';

const t = getTranslations();

const mockClasses = [
  {
    id: 'Kaava',
    technicalName: 'Kaava',
    name: { fi: 'Kaava', en: 'Plan' }
  },
  {
    id: 'Kaavamaaraystietoryhma',
    technicalName: 'Kaavamaaraystietoryhma',
    name: { fi: 'Kaavamääräystietoryhmä', en: 'Regulation group' }
  }
];

const mockCodelists = [
  {
    technicalName: 'kaava_tyyppi',
    name: { fi: 'Kaavalaji', en: 'Plan type' },
    names: { fi: 'Kaavalaji', en: 'Plan type' }
  }
];

const performSearchMock = vi.fn().mockResolvedValue([
  {
    document: {
      type: 'class',
      slug: 'ryt-kaava:Kaava',
      title: 'Kaava (Orama)',
      modelVersions: ['rytj-kaava:1.0.5'],
    }
  },
  {
    document: {
      type: 'codelist',
      slug: 'kaava:kaava_tyyppi',
      title: 'Kaavalaji (Orama)',
      modelVersions: ['rytj-kaava:1.0.5'],
    }
  }
]);

vi.mock('../hooks/useOramaSearch', () => ({
  useOramaSearch: () => ({
    performSearch: performSearchMock,
    isInitializing: false,
  })
}));

describe('ClassCodelistSelector component', () => {
  const getLocalized = (obj: any) => obj ? (obj.fi || '') : '';

  it('renders correctly with default closed selector and placeholder', () => {
    render(
      <ClassCodelistSelector
        classes={mockClasses}
        usedCodelists={mockCodelists}
        selectedElement={{ type: 'class', name: 'Kaava' }}
        onSelectElement={vi.fn()}
        getLocalized={getLocalized}
        t={t}
        modelName="rytj-kaava"
        selectedVersion="1.0.5"
      />
    );

    // Initial label is 'Kaava'
    const input = screen.getByPlaceholderText('Kaava') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('Kaava');
  });

  it('opens dropdown of options on click / focus', () => {
    render(
      <ClassCodelistSelector
        classes={mockClasses}
        usedCodelists={mockCodelists}
        selectedElement={{ type: 'class', name: 'Kaava' }}
        onSelectElement={vi.fn()}
        getLocalized={getLocalized}
        t={t}
        modelName="rytj-kaava"
        selectedVersion="1.0.5"
      />
    );

    const input = screen.getByPlaceholderText('Kaava');
    fireEvent.focus(input);

    // Groups are visible
    expect(screen.getByText(t.dataModel.classesOptGroup)).toBeDefined();
    expect(screen.getByText(t.dataModel.codelistsOptGroup)).toBeDefined();

    // Elements inside groups are visible
    expect(screen.getByText('Kaavamääräystietoryhmä')).toBeDefined();
    expect(screen.getByText('Kaavalaji')).toBeDefined();
  });

  it('filters classes and codelists using local search if search query is short', () => {
    render(
      <ClassCodelistSelector
        classes={mockClasses}
        usedCodelists={mockCodelists}
        selectedElement={{ type: 'class', name: 'Kaava' }}
        onSelectElement={vi.fn()}
        getLocalized={getLocalized}
        t={t}
        modelName="rytj-kaava"
        selectedVersion="1.0.5"
      />
    );

    const input = screen.getByPlaceholderText('Kaava');
    fireEvent.focus(input);

    // Type a single letter for local filtering
    fireEvent.change(input, { target: { value: 'm' } });

    // "Kaavamääräystietoryhmä" should remain, "Kaava" should be hidden as it has no "m"
    expect(screen.getByText('Kaavamääräystietoryhmä')).toBeDefined();
    expect(screen.queryByText('Kaavalaji')).toBeNull(); // 'Kaavalaji' contains 'm' under 'kaava_tyyppi' technical but names/technical filter doesn't match 'Plan type' or 'kaava_tyyppi'. Let's verify: kaava_tyyppi has 'p'.
  });

  it('executes Orama search for longer terms and lists matches', async () => {
    render(
      <ClassCodelistSelector
        classes={mockClasses}
        usedCodelists={mockCodelists}
        selectedElement={{ type: 'class', name: 'Kaava' }}
        onSelectElement={vi.fn()}
        getLocalized={getLocalized}
        t={t}
        modelName="rytj-kaava"
        selectedVersion="1.0.5"
      />
    );

    const input = screen.getByPlaceholderText('Kaava');
    fireEvent.focus(input);

    // Type 2+ chars
    fireEvent.change(input, { target: { value: 'Kaav' } });

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith('Kaav', expect.any(Object));
    });

    // Check Orama search results header and results are displayed
    expect(screen.getByText(/Kaava \(Orama\)/)).toBeDefined();
    expect(screen.getByText(/Kaavalaji \(Orama\)/)).toBeDefined();
  });

  it('triggers onSelectElement callback when clicking an option', () => {
    const selectSpy = vi.fn();
    render(
      <ClassCodelistSelector
        classes={mockClasses}
        usedCodelists={mockCodelists}
        selectedElement={{ type: 'class', name: 'Kaava' }}
        onSelectElement={selectSpy}
        getLocalized={getLocalized}
        t={t}
        modelName="rytj-kaava"
        selectedVersion="1.0.5"
      />
    );

    const input = screen.getByPlaceholderText('Kaava');
    fireEvent.focus(input);

    const optionBtn = screen.getByText('Kaavamääräystietoryhmä').closest('button');
    expect(optionBtn).not.toBeNull();
    fireEvent.click(optionBtn!);

    expect(selectSpy).toHaveBeenCalledWith('class:Kaavamaaraystietoryhma');
  });
});
