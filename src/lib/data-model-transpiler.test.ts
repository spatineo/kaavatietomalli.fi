import { describe, it, expect } from 'vitest';
import {
  parseDataModelSnippetConfig,
  transpileDataModelSnippetToMermaid,
  transpileDataModelSnippetsInMarkdown
} from './data-model-transpiler';
import { LocalFileDataModelAccess, parseModelId } from './local-data-model-access';
import { DataModelAccess } from './data-model-types';

describe('data-model-transpiler', () => {
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
    expect(mermaid).toContain('note "Kaavatietomalli, versio: 1.0.5"');
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
    expect(result).toContain('note "Testimalli, versio: 2.0.0"');
    expect(result).toContain('class ChildClass["Lapsiluokka"] {');
    expect(result).toContain('+test_code Tyyppikoodi [1..1]');
    expect(result).toContain('class test_code["Testikoodisto"] {');
    expect(result).toContain('vocabulary = http://uri.suomi.fi/codelist/test/test_code');
    expect(result).toContain('click test_code href "http://uri.suomi.fi/codelist/test/test_code"');
    expect(result).toContain('ParentClass <|-- ChildClass');
    expect(result).toContain('ChildClass --> "0..*" OtherClass : Liittyy');
    expect(result).toContain('ChildClass ..> test_code : «use»');
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

    const result = await transpileDataModelSnippetsInMarkdown(markdown, access);

    expect(result).not.toContain('```data-model-snippet');
    expect(result).toContain('```mermaid');
    expect(result).toContain('classDiagram');
    expect(result).toContain('class Kaava["Kaava"] {');
  });
});
