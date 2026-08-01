import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  parseDataModelSnippetConfig,
  transpileDataModelSnippetToMermaid,
  convertDataModelDiagramsToMermaid
} from './data-model-diagram-generator';
import { LocalFileDataModelAccess } from './local-data-model-access';
import { parseModelId } from './data-model-utils';
import { DataModelAccess } from './data-model-types';

const mockRytjKaavaModel = {
  metadata: {
    id: 'rytj-kaava',
    version: '1.0.5',
    name: { fi: 'Kaavatietomalli' }
  },
  classes: [
    {
      id: 'ak:1.0.0/Kaava',
      technicalName: 'Kaava',
      name: { fi: 'Kaava' },
      attributes: [
        {
          id: 'attr_tyyppi',
          name: { fi: 'Kaavatyyppi' },
          cardinality: '[1..1]',
          codelist: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi'
        }
      ],
      associations: [
        {
          id: 'assoc_paatos',
          name: { fi: 'Päätös' },
          targetClassId: 'rak:1.0.0/Kaava-asianPaatos',
          cardinality: '[1..1]'
        }
      ]
    },
    {
      id: 'rak:1.0.0/Kaava-asianPaatos',
      technicalName: 'Kaava-asianPaatos',
      name: { fi: 'Kaava-asian päätös' },
      attributes: [],
      associations: []
    }
  ]
};

const mockKaavaTyyppiCodelist = {
  uri: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
  vocabulary: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
  technicalName: 'kaava_tyyppi',
  names: { fi: 'Kaavatyyppi' }
};

describe('data-model-diagram-generator', () => {
  let getDataModelSpy: any;
  let getCodelistSpy: any;

  beforeAll(() => {
    getDataModelSpy = vi.spyOn(LocalFileDataModelAccess.prototype, 'getDataModel')
      .mockImplementation(async (modelId: string) => {
        const { name, version } = parseModelId(modelId);
        if (name === 'rytj-kaava' && version === '1.0.5') {
          return mockRytjKaavaModel;
        }
        return null;
      });

    getCodelistSpy = vi.spyOn(LocalFileDataModelAccess.prototype, 'getCodelist')
      .mockImplementation(async (uri: string) => {
        if (uri === 'http://uri.suomi.fi/codelist/test/kaava_tyyppi') {
          return mockKaavaTyyppiCodelist;
        }
        return null;
      });
  });

  afterAll(() => {
    if (getDataModelSpy) getDataModelSpy.mockRestore();
    if (getCodelistSpy) getCodelistSpy.mockRestore();
  });

  it('parses snippet config correctly from JSON array classes', () => {
    const snippet = `
modelId: https://iri.suomi.fi/model/rytj-kaava/#v1.0.5
classes: ["ak:1.0.0/Kaava", "rak:1.0.0/Kaava-asianPaatos"]
lang: fi
`;
    const config = parseDataModelSnippetConfig(snippet);
    expect(config.modelId).toBe('https://iri.suomi.fi/model/rytj-kaava/#v1.0.5');
    expect(config.classes).toEqual(['ak:1.0.0/Kaava', 'rak:1.0.0/Kaava-asianPaatos']);
    expect(config.lang).toBe('fi');
  });

  it('parses snippet config with YAML-style list', () => {
    const snippet = `
modelId: rytj-kaava-1.0.5
classes:
  - Kaava
  - Kaava-asianPaatos
lang: sv
`;
    const config = parseDataModelSnippetConfig(snippet);
    expect(config.modelId).toBe('rytj-kaava-1.0.5');
    expect(config.classes).toEqual(['Kaava', 'Kaava-asianPaatos']);
    expect(config.lang).toBe('sv');
  });

  it('parses modelId versions accurately', () => {
    expect(parseModelId('https://iri.suomi.fi/model/rytj-kaava/#v1.0.5')).toEqual({
      name: 'rytj-kaava',
      version: '1.0.5'
    });
    expect(parseModelId('rytj-kaava-1.0.5')).toEqual({
      name: 'rytj-kaava',
      version: '1.0.5'
    });
    expect(parseModelId('https://iri.suomi.fi/model/rytj-kaava/1.0.5')).toEqual({
      name: 'rytj-kaava',
      version: '1.0.5'
    });
  });

  it('transpiles custom snippet into mermaid classDiagram format using LocalFileDataModelAccess', async () => {
    const access = new LocalFileDataModelAccess();
    const snippet = `
modelId: https://iri.suomi.fi/model/rytj-kaava/#v1.0.5
classes: ["ak:1.0.0/Kaava", "rak:1.0.0/Kaava-asianPaatos"]
lang: fi
`;

    const mermaid = await transpileDataModelSnippetToMermaid(snippet, access);

    expect(mermaid).toContain('classDiagram');
    expect(mermaid).toContain('class Kaava["Kaava"] {');
    expect(mermaid).toContain('class Kaava-asianPaatos["Kaava-asian päätös"] {');
    expect(mermaid).toContain('<<codelist>>');
    expect(mermaid).toContain('Kaava --> "1..1" Kaava-asianPaatos : Päätös');
    expect(mermaid).toContain(': «use»');
  });

  it('handles mock DataModelAccess with inheritance and codelists', async () => {
    const mockAccess: DataModelAccess = {
      async getDataModel(modelId: string) {
        return {
          metadata: {
            id: 'test-model',
            version: '2.0.0',
            name: { fi: 'Testimalli' }
          },
          classes: [
            {
              id: 'test:1.0.0/ChildClass',
              technicalName: 'ChildClass',
              name: { fi: 'Lapsiluokka' },
              superclass: 'test:1.0.0/ParentClass',
              attributes: [
                {
                  id: 'attr1',
                  name: { fi: 'Tyyppikoodi' },
                  cardinality: '[1..1]',
                  codelist: 'http://uri.suomi.fi/codelist/test/test_code'
                }
              ],
              associations: [
                {
                  id: 'assoc1',
                  name: { fi: 'Liittyy' },
                  targetClassId: 'test:1.0.0/OtherClass',
                  cardinality: '[0..*]'
                }
              ]
            }
          ]
        };
      },
      async getCodelist(uri: string) {
        return {
          uri,
          vocabulary: uri,
          technicalName: 'test_code',
          names: { fi: 'Testikoodisto' }
        };
      }
    };

    const snippet = `
modelId: test-model
classes: ["ChildClass"]
`;

    const result = await transpileDataModelSnippetToMermaid(snippet, mockAccess);

    expect(result).toContain('classDiagram');
    expect(result).toContain('class ChildClass["Lapsiluokka"] {');
    expect(result).toContain('+Tyyppikoodi : test_code [1..1]');
    expect(result).toContain('class test_code["Testikoodisto"]:::codelistClass {');
    expect(result).toContain('vocabulary = http://uri.suomi.fi/codelist/test/test_code');
    expect(result).toContain('click test_code href "http://uri.suomi.fi/codelist/test/test_code"');
    expect(result).toContain('ParentClass <|-- ChildClass');
    expect(result).toContain('ChildClass --> "0..*" OtherClass : Liittyy');
    expect(result).toContain('ChildClass ..> test_code : «use»');
    expect(result).toContain('class ParentClass["ParentClass"]:::plainClass');
    expect(result).toContain('class OtherClass["OtherClass"]:::plainClass');
  });

  it('replaces data-model-snippet codeblocks in markdown text', async () => {
    const access = new LocalFileDataModelAccess();
    const markdown = `# Title
Here is a diagram:

\`\`\`data-model-snippet
modelId: rytj-kaava-1.0.5
classes: ["Kaava"]
\`\`\`

End of document.`;

    const result = await convertDataModelDiagramsToMermaid(markdown, access);

    expect(result).not.toContain('```data-model-snippet');
    expect(result).toContain('```mermaid');
    expect(result).toContain('classDiagram');
    expect(result).toContain('class Kaava["Kaava"] {');
  });

  it('logs a warning and uses URI fallback when a codelist is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockAccess: DataModelAccess = {
      async getDataModel() {
        return {
          metadata: { id: 'missing-code-model', version: '1.0.0', name: { fi: 'Test' } },
          classes: [
            {
              id: 'test:1.0/ClassA',
              technicalName: 'ClassA',
              attributes: [
                {
                  id: 'attrMissing',
                  name: { fi: 'Tuntematon' },
                  cardinality: '[0..1]',
                  codelist: 'http://uri.suomi.fi/codelist/test/unknown_code_v1_0'
                }
              ]
            }
          ]
        };
      },
      async getCodelist() {
        return null;
      }
    };

    const snippet = `
modelId: missing-code-model
classes: ["ClassA"]
`;

    const result = await transpileDataModelSnippetToMermaid(snippet, mockAccess);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Codelist not found for URI: http://uri.suomi.fi/codelist/test/unknown_code_v1_0')
    );
    expect(result).toContain('+Tuntematon : unknown_code [0..1]');
    expect(result).toContain('class unknown_code["unknown_code"]:::codelistClass {');

    warnSpy.mockRestore();
  });

  it('supports multiple codelists on a single attribute separated by " or "', async () => {
    const mockAccess: DataModelAccess = {
      async getDataModel() {
        return {
          metadata: { id: 'multi-codelist-model', version: '1.0.0', name: { fi: 'Test' } },
          classes: [
            {
              id: 'test:1.0/ClassB',
              technicalName: 'ClassB',
              attributes: [
                {
                  id: 'attrMulti',
                  name: { fi: 'Koodivaihtoehdot' },
                  cardinality: '[1..1]',
                  codelist: [
                    'http://uri.suomi.fi/codelist/test/first_code',
                    'http://uri.suomi.fi/codelist/test/second_code'
                  ]
                }
              ]
            }
          ]
        };
      },
      async getCodelist(uri: string) {
        if (uri === 'http://uri.suomi.fi/codelist/test/first_code') {
          return { uri, vocabulary: uri, technicalName: 'first_code', names: { fi: 'Ensimmäinen' } };
        }
        if (uri === 'http://uri.suomi.fi/codelist/test/second_code') {
          return { uri, vocabulary: uri, technicalName: 'second_code', names: { fi: 'Toinen' } };
        }
        return null;
      }
    };

    const snippet = `
modelId: multi-codelist-model
classes: ["ClassB"]
`;

    const result = await transpileDataModelSnippetToMermaid(snippet, mockAccess);

    expect(result).toContain('+Koodivaihtoehdot : first_code or second_code [1..1]');
    expect(result).toContain('class first_code["Ensimmäinen"]:::codelistClass {');
    expect(result).toContain('class second_code["Toinen"]:::codelistClass {');
    expect(result).toContain('ClassB ..> first_code : «use»');
    expect(result).toContain('ClassB ..> second_code : «use»');
  });
});
