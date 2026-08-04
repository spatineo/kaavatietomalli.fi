/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodelistInfoPanel } from './CodelistInfoPanel';
import { getTranslations } from '../i18n';

const t = getTranslations();

const mockCodelist = {
  id: 'http://uri.suomi.fi/codelist/test/code',
  uri: 'http://uri.suomi.fi/codelist/test/code',
  technicalName: 'test_code',
  name: {
    fi: 'Testikoodisto',
    en: 'Test Codelist'
  },
  vocabulary: 'http://uri.suomi.fi/codelist/test/code',
  originSyncTime: '',
  allVersions: [],
  status: 'VALID',
  codes: [
    {
      uri: 'http://uri.suomi.fi/codelist/test/code/1',
      codeValue: '1',
      name: { fi: 'Koodi yksi', en: 'Code one' },
      status: 'VALID',
      hierarchyLevel: 1,
    },
    {
      uri: 'http://uri.suomi.fi/codelist/test/code/1.1',
      codeValue: '1.1',
      name: { fi: 'Alakoodi', en: 'Sub-code' },
      status: 'VALID',
      hierarchyLevel: 2,
      broaderCode: '1'
    },
    {
      uri: 'http://uri.suomi.fi/codelist/test/code/2',
      codeValue: '2',
      name: { fi: 'Koodi kaksi', en: 'Code two' },
      status: 'VALID',
      hierarchyLevel: 1,
    }
  ]
};

describe('CodelistInfoPanel component', () => {
  const getLocalized = (obj: any) => obj ? (obj.fi || obj.en || '') : '';

  it('renders loading spinner when loadingCodelist is true', () => {
    render(
      <CodelistInfoPanel
        codelistDetail={null}
        loadingCodelist={true}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    expect(screen.getByText(t.dataModel.loadingCodelistInfo)).toBeDefined();
  });

  it('renders error message when codelistDetail is null and loadingCodelist is false', () => {
    render(
      <CodelistInfoPanel
        codelistDetail={null}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    expect(screen.getByText(t.dataModel.errorLoadingCodelist)).toBeDefined();
  });

  it('renders codelist information and codes table properly', () => {
    render(
      <CodelistInfoPanel
        codelistDetail={mockCodelist}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    expect(screen.getByText('Testikoodisto')).toBeDefined();
    expect(screen.getByText('test_code')).toBeDefined();
    expect(screen.getByText('Koodi yksi')).toBeDefined();
    expect(screen.getByText('Koodi kaksi')).toBeDefined();
    expect(screen.getByText('Alakoodi')).toBeDefined();
  });

  it('filters code list rows based on search input', async () => {
    render(
      <CodelistInfoPanel
        codelistDetail={mockCodelist}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    const filterInput = document.getElementById('codes-table-filter') as HTMLInputElement;
    expect(filterInput).not.toBeNull();

    // Search for "kaksi"
    fireEvent.change(filterInput, { target: { value: 'kaksi' } });

    // "Koodi kaksi" should remain, "Koodi yksi" should be hidden
    expect(screen.getByText('Koodi kaksi')).toBeDefined();
    expect(screen.queryByText('Koodi yksi')).toBeNull();

    // Clear search
    const clearBtn = document.getElementById('clear-codes-filter');
    expect(clearBtn).not.toBeNull();
    fireEvent.click(clearBtn!);

    expect(screen.getByText('Koodi yksi')).toBeDefined();
  });

  it('retains parent broader codes when nested child code matches search', () => {
    render(
      <CodelistInfoPanel
        codelistDetail={mockCodelist}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    const filterInput = document.getElementById('codes-table-filter') as HTMLInputElement;
    
    // Search for nested "Alakoodi"
    fireEvent.change(filterInput, { target: { value: 'Alakoodi' } });

    // Child "Alakoodi" should be shown
    expect(screen.getByText('Alakoodi')).toBeDefined();
    // Parent "Koodi yksi" should be retained/shown
    expect(screen.getByText('Koodi yksi')).toBeDefined();
    // Unrelated "Koodi kaksi" should be hidden
    expect(screen.queryByText('Koodi kaksi')).toBeNull();
  });

  it('displays empty results state when nothing matches', () => {
    render(
      <CodelistInfoPanel
        codelistDetail={mockCodelist}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri={null}
        onCopy={vi.fn()}
        t={t}
      />
    );

    const filterInput = document.getElementById('codes-table-filter') as HTMLInputElement;
    fireEvent.change(filterInput, { target: { value: 'nonexistent-value' } });

    expect(screen.getByText(new RegExp(`${t.search.noResults}`, 'i'))).toBeDefined();
  });

  it('triggers onCopy handler when clicking URI copy button', () => {
    const copySpy = vi.fn();
    render(
      <CodelistInfoPanel
        codelistDetail={mockCodelist}
        loadingCodelist={false}
        dataLang="fi"
        getLocalized={getLocalized}
        copiedCodeUri="http://uri.suomi.fi/codelist/test/code/1"
        onCopy={copySpy}
        t={t}
      />
    );

    const buttons = screen.getAllByRole('button');
    // Find copy button
    const copyButton = buttons.find(btn => btn.textContent?.includes('URI') || btn.textContent?.includes(t.dataModel.copied));
    expect(copyButton).toBeDefined();

    fireEvent.click(copyButton!);
    expect(copySpy).toHaveBeenCalledWith('http://uri.suomi.fi/codelist/test/code/1');
  });
});
