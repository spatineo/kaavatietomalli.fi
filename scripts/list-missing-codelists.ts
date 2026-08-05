import fs from 'fs';
import path from 'path';
import { DataModelConfig, getModelShortName } from './fetch-data-models';
import { DataModel, ClassModel, Attribute } from '@/src/lib/data-model-types';

interface CodelistsIndex {
  registries: Array<{
    name: string;
    codelists: Array<{
      name: string;
    }>;
  }>;
}

interface CodelistUsage {
  model: string;
  version: string;
  className: string;
  classId: string;
  attributeName?: string;
}

async function listMissingCodelists() {
  const DATA_MODELS_INDEX_PATH = path.join(process.cwd(), 'data-index', 'suomi.fi', 'tietomallit', 'index.json');
  const CODELISTS_INDEX_PATH = path.join(process.cwd(), 'data-index', 'suomi.fi', 'koodistot', 'index.json');
  const PUBLIC_DATA_MODELS_DIR = path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'tietomallit');

  console.log('================================================================');
  console.log('   KAAVATIETOMALLI.FI - CODELIST CONSISTENCY ANALYSIS UTILITY     ');
  console.log('================================================================\n');

  if (!fs.existsSync(DATA_MODELS_INDEX_PATH)) {
    console.error(`❌ Data models config not found at: ${DATA_MODELS_INDEX_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(CODELISTS_INDEX_PATH)) {
    console.error(`❌ Codelists config not found at: ${CODELISTS_INDEX_PATH}`);
    process.exit(1);
  }

  // 1. Parse configured codelists
  const codelistsConfig: CodelistsIndex = JSON.parse(fs.readFileSync(CODELISTS_INDEX_PATH, 'utf-8'));
  const configuredCodelists = new Set<string>();
  const configuredRegistryMap = new Map<string, string[]>();

  codelistsConfig.registries.forEach(registry => {
    const regName = registry.name.trim();
    const list: string[] = [];
    registry.codelists.forEach(cl => {
      const clName = cl.name.trim();
      const fullUri = `http://uri.suomi.fi/codelist/${regName}/${clName}`;
      configuredCodelists.add(fullUri);
      list.push(clName);
    });
    configuredRegistryMap.set(regName, list);
  });

  console.log(`ℹ️ Configured codelists in 'data-index/suomi.fi/koodistot/index.json':`);
  console.log(`   Total: ${configuredCodelists.size} codelists across ${configuredRegistryMap.size} registries.`);
  for (const [reg, items] of configuredRegistryMap.entries()) {
    console.log(`   - Registry '${reg}': ${items.length} codelists`);
  }
  console.log('');

  // 2. Parse data models to find used codelists
  const dataModelsConfig: DataModelConfig = JSON.parse(fs.readFileSync(DATA_MODELS_INDEX_PATH, 'utf-8'));
  const codelistUsages = new Map<string, CodelistUsage[]>();

  for (const model of dataModelsConfig.models) {
    for (const version of model.versions) {
      const filename = `${getModelShortName(model.id)}-${version}.json`;
      const filePath = path.join(PUBLIC_DATA_MODELS_DIR, filename);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Transformed model file not found, skipping: ${filename}`);
        continue;
      }

      try {
        const modelContent: DataModel = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const classes = modelContent.classes || [];

        for (const cls of classes) {
          const className = cls.name?.fi || cls.name?.en || cls.technicalName || 'UnnamedClass';
          const classId = cls.id || '';

          // A. Check top-level class-level codelists
          if (Array.isArray(cls.codelists)) {
            cls.codelists.forEach((uri: string) => {
              if (typeof uri === 'string') {
                const normalizedUri = uri.trim();
                if (!codelistUsages.has(normalizedUri)) {
                  codelistUsages.set(normalizedUri, []);
                }
                codelistUsages.get(normalizedUri)!.push({
                  model: model.id,
                  version,
                  className,
                  classId
                });
              }
            });
          }

          // B. Check attribute-level codelists (as extra safety)
          if (Array.isArray(cls.attributes)) {
            cls.attributes.forEach((attr: Attribute) => {
              const attrName = attr.name?.fi || attr.name?.en || attr.id || 'UnnamedAttribute';
              if (Array.isArray(attr.codelist)) {
                attr.codelist.forEach((uri: string) => {
                  if (typeof uri === 'string') {
                    const normalizedUri = uri.trim();
                    if (!codelistUsages.has(normalizedUri)) {
                      codelistUsages.set(normalizedUri, []);
                    }
                    // Avoid duplicate usage entries for the same attribute
                    const existing = codelistUsages.get(normalizedUri)!;
                    const isDup = existing.some(u => 
                      u.model === model.id && 
                      u.version === version && 
                      u.className === className && 
                      u.attributeName === attrName
                    );
                    if (!isDup) {
                      existing.push({
                        model: model.id,
                        version,
                        className,
                        classId,
                        attributeName: attrName
                      });
                    }
                  }
                });
              }
            });
          }
        }
      } catch (err) {
        console.error(`❌ Failed to parse ${filename}:`, err);
      }
    }
  }

  // 3. Compare and find missing codelists
  const missingCodelists: Array<{ uri: string; usages: CodelistUsage[] }> = [];
  const foundConfigured: Set<string> = new Set();

  for (const [uri, usages] of codelistUsages.entries()) {
    if (configuredCodelists.has(uri)) {
      foundConfigured.add(uri);
    } else {
      missingCodelists.push({ uri, usages });
    }
  }

  // Sort missing codelists alphabetically by URI
  missingCodelists.sort((a, b) => a.uri.localeCompare(b.uri));

  console.log('----------------------------------------------------------------');
  console.log(`📊 ANALYSIS SUMMARY:`);
  console.log(`   - Unique codelist URIs referenced in models: ${codelistUsages.size}`);
  console.log(`   - Verified active/configured codelists:      ${foundConfigured.size}`);
  console.log(`   - Missing/unconfigured codelists:           ${missingCodelists.length}`);
  console.log('----------------------------------------------------------------\n');

  if (missingCodelists.length === 0) {
    console.log('✅ EXCELLENT! No missing codelists. All references are fully configured in koodistot/index.json.');
  } else {
    console.log(`⚠️ FOUND ${missingCodelists.length} REFERENCED CODELISTS THAT ARE MISSING FROM THE CONFIG:\n`);

    missingCodelists.forEach((item, idx) => {
      console.log(`[${idx + 1}] Missing Codelist URI: ${item.uri}`);
      
      // Attempt to parse registry and codelist name from URI
      const uriParts = item.uri.split('/');
      if (uriParts.length >= 2) {
        const reg = uriParts[uriParts.length - 2];
        const name = uriParts[uriParts.length - 1];
        console.log(`    💡 Hint for config:`);
        console.log(`       Registry: "${reg}"`);
        console.log(`       Codelist Name: "${name}"`);
        console.log(`       JSON path snippet:`);
        console.log(`       {`);
        console.log(`         "name": "${name}"`);
        console.log(`       }`);
      }

      console.log(`    🔍 References in Data Models (${item.usages.length}):`);
      // Group usages by Model & Version for cleaner display
      const groupedUsages: Record<string, string[]> = {};
      item.usages.forEach(usage => {
        const key = `${usage.model} (v${usage.version})`;
        if (!groupedUsages[key]) groupedUsages[key] = [];
        const loc = usage.attributeName 
          ? `Class: ${usage.className} -> Attribute: ${usage.attributeName}`
          : `Class: ${usage.className}`;
        if (!groupedUsages[key].includes(loc)) {
          groupedUsages[key].push(loc);
        }
      });

      for (const [mv, locs] of Object.entries(groupedUsages)) {
        console.log(`       • ${mv}:`);
        locs.forEach(loc => console.log(`         - ${loc}`));
      }
      console.log('');
    });

    console.log('================================================================');
    console.log('🛠️  To fix these, append the missing codelist objects under their');
    console.log('   respective registries in:');
    console.log('   "data-index/suomi.fi/koodistot/index.json"');
    console.log('   Then run "npm run fetch-data" to synchronize and download them.');
    console.log('================================================================');
  }
}

listMissingCodelists().catch(err => {
  console.error('Fatal error running consistency check:', err);
  process.exit(1);
});
