import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isContentEqual } from './content-utils';
import { DataModel, ModelMetadata, ClassModel, Attribute, Association, LocalizedText } from '@/src/lib/data-model-types';
import { CONFIG } from '../src/config';

export interface AttributeDefinitionOverrride {
  id: string;
  name?: LocalizedText;
  type?: string;
  cardinality? : string;
  codelist?: string[];
}

export interface AssociationDefinitionOverride {
  id: string;
  name?: LocalizedText;
  targetClassId?: string;
  targetClassName?: LocalizedText;
  cardinality? : string;
}

export interface ClassDefinitionOverride {
  id: string;
  attributes?: AttributeDefinitionOverrride[];
  associations?: AssociationDefinitionOverride[];
}

export interface ModelDefinitionOverride {
  version: string;
  classes?: ClassDefinitionOverride[];
}

export interface DataModelConfig {
  remote: {
    api: string;
    name: string;
  };
  models: Array<{
    id: string;
    versions: string[];
    overrides?: ModelDefinitionOverride[];
  }>;
}

export interface TietomalliIndexItem {
  id: string;
  name?: LocalizedText;
  version: string;
  status?: string;
  lastModified?: string;
  path: string;
}

export function formatStatus(statusData: any): string {
  if (!statusData) return 'Unknown Status';
  const rawStatus = typeof statusData === 'string'
    ? statusData
    : (statusData['@id'] || (typeof statusData === 'object' ? String(statusData) : String(statusData)));

  if (typeof rawStatus !== 'string') return 'Unknown Status';

  const trimmed = rawStatus.replace(/\/+$/, '');
  const lastSlash = trimmed.lastIndexOf('/');
  if (lastSlash !== -1) {
    return trimmed.substring(lastSlash + 1);
  }
  return trimmed;
}

export function getAllLabels(labelNode: any): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!labelNode) return labels;

  if (Array.isArray(labelNode)) {
    labelNode.forEach((l: any) => {
      if (l && typeof l === 'object' && l['@language'] && l['@value'] !== undefined) {
        labels[l['@language']] = String(l['@value']);
      }
    });
  } else if (typeof labelNode === 'object' && labelNode['@language'] && labelNode['@value'] !== undefined) {
    labels[labelNode['@language']] = String(labelNode['@value']);
  } else if (typeof labelNode === 'string') {
    labels['unknown'] = labelNode;
  }
  return labels;
}

let prefixMap: Record<string, string> = {
  "rak": "https://iri.suomi.fi/model/rak/",
  "rytj-kaava": "https://iri.suomi.fi/model/rytj-kaava/",
  "ryhti-tont": "https://iri.suomi.fi/model/ryhti-tont/"
};

try {
  const prefixMapPath = path.join(process.cwd(), 'data-index', 'prefixes.json');
  if (fs.existsSync(prefixMapPath)) {
    const rawPrefixes = fs.readFileSync(prefixMapPath, 'utf-8');
    prefixMap = JSON.parse(rawPrefixes);
  }
} catch (err) {
  // Silent fallback to standard map
}

export function expandUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri.replace('http://iri.suomi.fi/', 'https://iri.suomi.fi/');
  }

  const colonIdx = uri.indexOf(':');
  if (colonIdx !== -1) {
    const prefix = uri.substring(0, colonIdx);
    if (prefixMap[prefix]) {
      return prefixMap[prefix] + uri.substring(colonIdx + 1);
    }
  }
  return uri;
}

export function getShTargetClass(cls: any): string | null {
  if (!cls) return null;
  const targetClass = cls['sh:targetClass'];
  if (targetClass) {
    if (Array.isArray(targetClass)) {
      const tcId = targetClass[0]?.['@id'] || (typeof targetClass[0] === 'string' ? targetClass[0] : null);
      if (tcId) return tcId;
    } else if (typeof targetClass === 'object' && targetClass['@id']) {
      return targetClass['@id'];
    } else if (typeof targetClass === 'string') {
      return targetClass;
    }
  }
  return null;
}

export function getClassTargetId(cls: any): string {
  // Kept for backward compatibility, returns expanded class ID based on @id
  return cls ? expandUri(cls['@id']) : '';
}

export function getModelShortName(fullModelId: string) {
  if (!fullModelId) return null;
  
  if (fullModelId.startsWith('http://') || fullModelId.startsWith('https://')) {
    return fullModelId.split('/').pop();
  } else {
    return fullModelId.split(':').pop();
  }
}

export function transformJsonLdToModel(
  jsonContent: any,
  requestedModel: string,
  requestedVersion: string,
  fetchTimestamp: string,
  overrides?: ModelDefinitionOverride[]
) {
  const graph = jsonContent['@graph'] || [];

  // Map all nodes by their @id for easy property lookups
  const nodes = new Map<string, any>();
  graph.forEach((node: any) => {
    if (node && node['@id']) {
      nodes.set(node['@id'], node);
      nodes.set(expandUri(node['@id']), node);
    }
  });

  // Filter nodes that define a class (sh:NodeShape)
  const classNodes = graph.filter(
    (n: any) =>
      n['@type'] === 'sh:NodeShape' || (Array.isArray(n['@type']) && n['@type'].includes('sh:NodeShape'))
  );

  // Pre-build lookup maps to resolve Shape / TargetClass URIs to refined Class IDs and labels
  const shapeOrClassToRefinedId = new Map<string, string>();
  const targetClassToLabels = new Map<string, Record<string, string>>();

  classNodes.forEach((cls: any) => {
    const rawClassId = cls['@id'];
    if (!rawClassId) return;
    const expandedClassId = expandUri(rawClassId);
    const labels = getAllLabels(cls['rdfs:label']);

    shapeOrClassToRefinedId.set(rawClassId, expandedClassId);
    shapeOrClassToRefinedId.set(expandedClassId, expandedClassId);

    targetClassToLabels.set(rawClassId, labels);
    targetClassToLabels.set(expandedClassId, labels);

    const targetClass = getShTargetClass(cls);
    if (targetClass) {
      const expandedTargetClassId = expandUri(targetClass);
      shapeOrClassToRefinedId.set(targetClass, expandedClassId);
      shapeOrClassToRefinedId.set(expandedTargetClassId, expandedClassId);

      targetClassToLabels.set(targetClass, labels);
      targetClassToLabels.set(expandedTargetClassId, labels);
    }
  });

  // Find Ontology metadata
  let modelName: Record<string, string> = { unknown: requestedModel };
  let modelId = requestedModel;
  let modelVersion = requestedVersion;
  let modelModified = 'Unknown Date';
  let modelStatus = 'Unknown Status';
  let modelDocumentation: Record<string, string> = { unknown: 'n/a' };
  let modelDescription: Record<string, string> = { unknown: 'n/a' };

  const ontologyNode = graph.find(
    (n: any) =>
      n['@type'] === 'owl:Ontology' || (Array.isArray(n['@type']) && n['@type'].includes('owl:Ontology'))
  );

  if (ontologyNode) {
    modelId = ontologyNode['@id'] || modelId;
    modelName = getAllLabels(ontologyNode['rdfs:label']);
    modelVersion = ontologyNode['owl:versionInfo'] || modelVersion;
    modelDocumentation = getAllLabels(ontologyNode['suomi-meta:documentation']);
    modelDescription = getAllLabels(ontologyNode['rdfs:comment']);

    const modifiedData = ontologyNode['dcterms:modified'];
    if (modifiedData) {
      modelModified = typeof modifiedData === 'string' ? modifiedData : modifiedData['@value'] || modelModified;
    }

    const statusData = ontologyNode['suomi-meta:publicationStatus'];
    if (statusData) {
      modelStatus = formatStatus(statusData);
    }
  }

  const rawModelUri = modelId;
  const verWithV = modelVersion.startsWith('v') ? modelVersion : `v${modelVersion}`;
  const uniqueId = `${rawModelUri}#${verWithV}`;

  const outputJson: DataModel = {
    id: uniqueId,
    version: modelVersion,
    metadata: {
      modelUri: rawModelUri,
      name: modelName,
      status: modelStatus,
      description: modelDescription,
      documentation: modelDocumentation,
      documentationUrl: `https://tietomallit.suomi.fi/model/${getModelShortName(requestedModel)}?ver=${modelVersion}`,
      lastModified: modelModified,
      originSyncTime: fetchTimestamp
    } as ModelMetadata,
    classes: [] as ClassModel[]
  };

  classNodes.forEach((cls: any) => {
    const classCodelists = new Set<string>();
    const attributes: Attribute[] = [];
    const associations: Association[] = [];
    let superclass: string | null = null;
    let hasSuperclass = false;

    const classTargetConceptClass = getShTargetClass(cls);
    if (!classTargetConceptClass) return;

    let properties = cls['sh:property'];
    if (properties) {
      if (!Array.isArray(properties)) properties = [properties];

      properties.forEach((propRef: any) => {
        const propNode = nodes.get(propRef['@id']) || nodes.get(expandUri(propRef['@id']));
        if (propNode) {
          const propLabels = getAllLabels(propNode['rdfs:label']);

          // Extract cardinality
          const min = propNode['sh:minCount']?.['@value'] ?? propNode['sh:minCount'] ?? '0';
          const max = propNode['sh:maxCount']?.['@value'] ?? propNode['sh:maxCount'] ?? '*';
          const cardinality = `[${min}..${max}]`;

          // Differentiate between object properties (associations) and literal datatypes
          const isObjectProperty =
            (Array.isArray(propNode['@type'])
              ? propNode['@type'].includes('owl:ObjectProperty')
              : propNode['@type'] === 'owl:ObjectProperty') || !!propNode['sh:class'];

          // Extract associated Codelist URIs
          const attrCodelists: string[] = [];
          if (propNode['suomi-meta:codeList']) {
            const cl = propNode['suomi-meta:codeList'];
            const clArray = Array.isArray(cl) ? cl : [cl];
            clArray.forEach((c: any) => {
              if (c['@id']) {
                const fullCodelistUri = expandUri(c['@id']);
                attrCodelists.push(fullCodelistUri);
                classCodelists.add(fullCodelistUri);
              }
            });
          }

          if (isObjectProperty) {
            const rawTargetClassId =
              propNode['sh:class']?.['@id'] ||
              (typeof propNode['sh:class'] === 'string' ? propNode['sh:class'] : null) ||
              (Array.isArray(propNode['sh:class'])
                ? propNode['sh:class'][0]?.['@id'] || (typeof propNode['sh:class'][0] === 'string' ? propNode['sh:class'][0] : null)
                : null);

            const expandedRawTargetClassId = rawTargetClassId ? expandUri(rawTargetClassId) : null;

            const targetClassId = expandedRawTargetClassId
              ? (shapeOrClassToRefinedId.get(expandedRawTargetClassId) || shapeOrClassToRefinedId.get(rawTargetClassId) || expandedRawTargetClassId)
              : null;

            if (propLabels?.fi === 'Yläluokka') {
              hasSuperclass = true;
              superclass = targetClassId || null;
            } else {
              let targetClassName: Record<string, string> = { unknown: 'Unknown' };

              if (targetClassId) {
                if (targetClassToLabels.has(targetClassId)) {
                  targetClassName = targetClassToLabels.get(targetClassId)!;
                } else if (rawTargetClassId && targetClassToLabels.has(rawTargetClassId)) {
                  targetClassName = targetClassToLabels.get(rawTargetClassId)!;
                } else {
                  targetClassName = { unknown: targetClassId.split('/').pop() || 'Unknown' };
                }
              }

              associations.push({
                id: expandUri(propNode['@id']),
                name: propLabels,
                targetClassId: targetClassId || null,
                targetClassName,
                cardinality
              });
            }
          } else {
            let datatype = propNode['sh:datatype'] || 'string';
            if (typeof datatype === 'string') {
              datatype = datatype.split('#').pop()?.split('/').pop() || 'string';
            }

            const attributeObj: Attribute = {
              id: expandUri(propNode['@id']),
              name: propLabels,
              type: datatype,
              cardinality
            };

            // Add codelist property for Literal types (always as an array)
            if (datatype === 'Literal' && attrCodelists.length > 0) {
              attributeObj.codelist = attrCodelists;
            }

            attributes.push(attributeObj);
          }
        }
      });
    }

    const sortedCodelists = Array.from(classCodelists).sort();

    // Sort attributes and associations alphabetically by ID
    attributes.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    associations.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    const rawId = cls['@id'];
    const lastPart = rawId ? rawId.replace(/\/+$/, '').split('/').pop() || '' : '';
    const technicalName = lastPart.split(':').pop() || '';

    const classObj: ClassModel = {
      id: expandUri(rawId),
      technicalName,
      name: getAllLabels(cls['rdfs:label']),
      description: getAllLabels(cls['rdfs:comment'])
    };

    const targetClass = getShTargetClass(cls);
    if (targetClass) {
      classObj.conceptId = expandUri(targetClass);
    }

    if (hasSuperclass && superclass) {
      classObj.superclass = superclass;
    }

    classObj.attributes = attributes;
    classObj.associations = associations;
    classObj.codelists = sortedCodelists;

    outputJson.classes.push(classObj);
  });

  // Alphabetically sort the top-level classes by ID
  outputJson.classes.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  // Helper to robustly match IDs with potential prefix differences
  const matchesId = (actualId: string, overrideId: string): boolean => {
    if (!actualId || !overrideId) return false;
    if (actualId === overrideId) return true;
    const normActual = expandUri(actualId);
    const normOverride = expandUri(overrideId);
    return normActual === normOverride;
  };

  // Carry out overrides if configured
  if (overrides && Array.isArray(overrides)) {
    overrides.forEach((override: ModelDefinitionOverride) => {
      if (override.version !== requestedVersion) return;

      if (Array.isArray(override.classes)) {
        override.classes.forEach((classOverride: ClassDefinitionOverride) => {
          const targetClass = outputJson.classes.find((c: ClassModel) => matchesId(c.id, classOverride.id));
          if (!targetClass) return;
          // Override attributes
            if (Array.isArray(classOverride.attributes)) {
            classOverride.attributes.forEach((attrOverride: AttributeDefinitionOverrride) => {
              const targetAttr = targetClass.attributes?.find((a: Attribute) => matchesId(a.id, attrOverride.id));
             
              if (targetAttr) {
                // Apply name, type, cardinality, codelist overrides
                if (attrOverride.name !== undefined) {
                  targetAttr.name = attrOverride.name;
                  console.log(`[OVERRIDE] Applied name override on class "${targetClass.id}" attribute "${targetAttr.id}"`);
                }
                if (attrOverride.type !== undefined) {
                  targetAttr.type = attrOverride.type;
                  console.log(`[OVERRIDE] Applied type override on class "${targetClass.id}" attribute "${targetAttr.id}"`);
                }
                if (attrOverride.cardinality !== undefined) {
                  targetAttr.cardinality = attrOverride.cardinality;
                  console.log(`[OVERRIDE] Applied cardinality override on class "${targetClass.id}" attribute "${targetAttr.id}"`);
                }
                if (attrOverride.codelist !== undefined) {
                  const oldCodelist = targetAttr.codelist;
                  targetAttr.codelist = attrOverride.codelist;
                  console.log(`[OVERRIDE] Applied codelist override on class "${targetClass.id}" attribute "${targetAttr.id}" to: ${JSON.stringify(attrOverride.codelist)}`);

                  // Rebuild class.codelists array by filtering out old and inserting new
                  if (Array.isArray(targetClass.codelists)) {
                    const otherAttrCodelists = new Set<string>();
                    targetClass.attributes?.forEach((a: any) => {
                      if (!matchesId(a.id, targetAttr.id) && Array.isArray(a.codelist)) {
                        a.codelist.forEach((c: string) => otherAttrCodelists.add(c));
                      }
                    });

                    const newClassCodelists = new Set<string>(otherAttrCodelists);
                    if (Array.isArray(attrOverride.codelist)) {
                      attrOverride.codelist.forEach((c: string) => newClassCodelists.add(c));
                    }
                    targetClass.codelists = Array.from(newClassCodelists).sort();
                  }
                }
              }
            });
          }
        

          // Override associations
          if (Array.isArray(classOverride.associations)) {
            classOverride.associations.forEach((assocOverride: AssociationDefinitionOverride) => {
              const targetAssoc = targetClass.associations?.find((a: Association) => matchesId(a.id, assocOverride.id));
              if (targetAssoc) {
                // Apply name, targetClassId, targetClassName, cardinality overrides
                if (assocOverride.name !== undefined) {
                  targetAssoc.name = assocOverride.name;
                  console.log(`[OVERRIDE] Applied name override on class "${targetClass.id}" association "${targetAssoc.id}"`);
                }
                if (assocOverride.targetClassId !== undefined) {
                  targetAssoc.targetClassId = assocOverride.targetClassId;
                  console.log(`[OVERRIDE] Applied targetClassId override on class "${targetClass.id}" association "${targetAssoc.id}"`);
                }
                if (assocOverride.targetClassName !== undefined) {
                  targetAssoc.targetClassName = assocOverride.targetClassName;
                  console.log(`[OVERRIDE] Applied targetClassName override on class "${targetClass.id}" association "${targetAssoc.id}"`);
                }
                if (assocOverride.cardinality !== undefined) {
                  targetAssoc.cardinality = assocOverride.cardinality;
                  console.log(`[OVERRIDE] Applied cardinality override on class "${targetClass.id}" association "${targetAssoc.id}"`);
                }
              }
            });
          }
        });
      }
    });
  }

  // Detect bi-directional associations
  outputJson.classes.forEach((classA) => {
    if (!classA.associations) return;
    classA.associations.forEach((assocA) => {
      const targetClassIdA = assocA.targetClassId;
      if (!targetClassIdA) return;

      // Skip self-associations
      if (matchesId(classA.id, targetClassIdA)) return;

      // Find target class (classB)
      const classB = outputJson.classes.find((c) => matchesId(c.id, targetClassIdA));
      if (!classB || !classB.associations) return;

      // Find any association in classB that points back to classA
      const assocB = classB.associations.find((ab) => ab.targetClassId && matchesId(ab.targetClassId, classA.id));
      if (assocB) {
        assocA.oppositeDirection = {
          id: assocB.id,
          name: assocB.name,
          cardinality: assocB.cardinality
        };
      }
    });
  });

  return outputJson;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAndTransformDataModels(
  configPath?: string,
  outputBaseDir?: string,
  delayMs: number = 500
): Promise<{ totalProcessed: number; changedCount: number }> {
  const resolvedConfigPath =
    configPath ||
    path.join(process.cwd(), 'data-index', 'suomi.fi', 'tietomallit', 'index.json');
  const resolvedOutputDir =
    outputBaseDir ||
    path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'tietomallit');

  if (!fs.existsSync(resolvedConfigPath)) {
    console.warn(`Configuration file not found at ${resolvedConfigPath}`);
    return { totalProcessed: 0, changedCount: 0 };
  }

  const rawConfig = fs.readFileSync(resolvedConfigPath, 'utf-8');
  const config: DataModelConfig = JSON.parse(rawConfig);

  const baseUrl = config.remote?.api || 'https://tietomallit.suomi.fi/api/getModelAsFile';

  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  let requestCount = 0;
  let totalProcessed = 0;
  let changedCount = 0;
  const indexItems: TietomalliIndexItem[] = [];

  for (const model of config.models) {
    for (const version of model.versions) {
      if (requestCount > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
      requestCount++;
      totalProcessed++;

      try {
        const fetchTimestamp = new Date().toISOString();
        const jsonldUrl = `${baseUrl}?modelId=${getModelShortName(model.id)}&fileType=JSON-LD&version=${version}`;

        console.log(`Fetching data model: ${model.id} (v${version}) from ${jsonldUrl}...`);
        const jsonResponse = await fetch(jsonldUrl, CONFIG.remoteFetchOptions);
        if (!jsonResponse.ok) {
          throw new Error(`HTTP ${jsonResponse.status}: ${jsonResponse.statusText}`);
        }

        const jsonContent = await jsonResponse.json();
        const modelOutput = transformJsonLdToModel(jsonContent, model.id, version, fetchTimestamp, model.overrides);

        const outputFilename = `${getModelShortName(model.id)}-${version}.json`;
        const outputPath = path.join(resolvedOutputDir, outputFilename);

        indexItems.push({
          id: modelOutput.id,
          name: modelOutput.metadata?.name,
          version: modelOutput.version,
          status: modelOutput.metadata?.status || '',
          lastModified: modelOutput.metadata?.lastModified || '',
          path: outputFilename
        });

        let contentChanged = true;
        if (fs.existsSync(outputPath)) {
          try {
            const existingContent = fs.readFileSync(outputPath, 'utf-8');
            const existingJson = JSON.parse(existingContent);
            contentChanged = !isContentEqual(existingJson, modelOutput);
          } catch {
            contentChanged = true;
          }
        }

        if (contentChanged) {
          changedCount++;
          fs.writeFileSync(outputPath, JSON.stringify(modelOutput, null, 2), 'utf-8');
          console.log(`Saved transformed model (CONTENT CHANGED) to ${outputPath}`); 
        } else {
          console.log(`Skipped transformed model (content unchanged) to ${outputPath}`);
        }
        
      } catch (err) {
        console.error(`Failed to process data model ${model.id} version ${version}:`, err);
      }
    }
  }

  const indexFilePath = path.join(resolvedOutputDir, 'index.json');
  let indexChanged = true;
  if (fs.existsSync(indexFilePath)) {
    try {
      const existingIndexContent = fs.readFileSync(indexFilePath, 'utf-8');
      const existingIndexJson = JSON.parse(existingIndexContent);
      indexChanged = !isContentEqual(existingIndexJson, indexItems);
    } catch {
      indexChanged = true;
    }
  }

  if (indexChanged) {
    fs.writeFileSync(indexFilePath, JSON.stringify(indexItems, null, 2), 'utf-8');
    console.log(`Saved data models index (CONTENT CHANGED) to ${indexFilePath}`);
  } else {
    console.log(`Skipped data models index (content unchanged) to ${indexFilePath}`);
  }

  return { totalProcessed, changedCount };
}

if (process.env.NODE_ENV !== 'test') {
  if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    fetchAndTransformDataModels();
  }
}
