/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassInfoPanel } from './ClassInfoPanel';
import { getTranslations } from '../i18n';

const t = getTranslations();

const mockClassObj = {
  id: 'http://uri.suomi.fi/model/rytj-kaava/Kaava',
  technicalName: 'KaavaTekninen',
  name: { fi: 'KaavaNimi', en: 'Plan' },
  description: { fi: 'Yleiskaavan kuvaus', en: 'General plan description' },
  attributes: [
    {
      id: 'http://uri.suomi.fi/model/rytj-kaava/Kaava/kaavalaji',
      type: 'Literal',
      codelist: ['http://uri.suomi.fi/codelist/test/kaava_tyyppi'],
      cardinality: '1',
      name: { fi: 'Kaavalaji', en: 'Plan type' }
    },
    {
      id: 'http://uri.suomi.fi/model/rytj-kaava/Kaava/kaavamuoto',
      type: 'KaavamuotoClass',
      cardinality: '0..*',
      name: { fi: 'Kaavamuoto' }
    }
  ],
  associations: [
    {
      id: 'http://uri.suomi.fi/model/rytj-kaava/Kaava/assoc1',
      name: { fi: 'Sisältää alueen' },
      targetClassId: 'http://uri.suomi.fi/model/rytj-kaava/KaavaAlue',
      cardinality: '1..*'
    }
  ]
};

describe('ClassInfoPanel component', () => {
  const getLocalized = (obj: any) => (obj ? obj.fi || '' : '');

  it('renders class basic info, name, technicalName, and description', () => {
    render(
      <ClassInfoPanel
        selectedClassObj={mockClassObj}
        mermaidChart=""
        dataLang="fi"
        getLocalized={getLocalized}
        onNavigateToType={vi.fn()}
        getTypeNavigation={vi.fn().mockReturnValue(null)}
        t={t}
      />
    );

    expect(screen.getByText('KaavaNimi')).toBeDefined();
    expect(screen.getByText('Yleiskaavan kuvaus')).toBeDefined();
    expect(screen.getByText('http://uri.suomi.fi/model/rytj-kaava/Kaava')).toBeDefined();
  });

  it('renders mermaid diagram when mermaidChart string is provided', () => {
    render(
      <ClassInfoPanel
        selectedClassObj={mockClassObj}
        mermaidChart="graph TD; A-->B;"
        dataLang="fi"
        getLocalized={getLocalized}
        onNavigateToType={vi.fn()}
        getTypeNavigation={vi.fn().mockReturnValue(null)}
        t={t}
      />
    );

    expect(screen.getByText(t.dataModel.classDiagram)).toBeDefined();
  });

  it('renders attributes table and calls onNavigateToType when clicking codelist attribute', () => {
    const navSpy = vi.fn();
    const getTypeNavigation = (type: string) => {
      if (type === 'KaavamuotoClass') return { type: 'class' as const, name: 'KaavamuotoClass' };
      return null;
    };

    render(
      <ClassInfoPanel
        selectedClassObj={mockClassObj}
        mermaidChart=""
        dataLang="fi"
        getLocalized={getLocalized}
        onNavigateToType={navSpy}
        getTypeNavigation={getTypeNavigation}
        t={t}
      />
    );

    expect(screen.getByText('Kaavalaji')).toBeDefined();
    expect(screen.getByText('kaava_tyyppi')).toBeDefined();

    const codelistBtn = screen.getByText('kaava_tyyppi');
    fireEvent.click(codelistBtn);

    expect(navSpy).toHaveBeenCalledWith('codelist', 'kaava_tyyppi');
  });

  it('renders associations table and calls onNavigateToType when clicking targetClass', () => {
    const navSpy = vi.fn();

    render(
      <ClassInfoPanel
        selectedClassObj={mockClassObj}
        mermaidChart=""
        dataLang="fi"
        getLocalized={getLocalized}
        onNavigateToType={navSpy}
        getTypeNavigation={vi.fn().mockReturnValue(null)}
        t={t}
      />
    );

    expect(screen.getByText('Sisältää alueen')).toBeDefined();
    expect(screen.getByText('KaavaAlue')).toBeDefined();

    const targetClassBtn = screen.getByText('KaavaAlue');
    fireEvent.click(targetClassBtn);

    expect(navSpy).toHaveBeenCalledWith('class', 'KaavaAlue');
  });
});
