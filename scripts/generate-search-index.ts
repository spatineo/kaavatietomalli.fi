import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { create, insert, save, components } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';
import { stemmer as svStemmer } from '@orama/stemmers/swedish';
import { stemmer as enStemmer } from '@orama/stemmers/english';
import { getFilesRecursive } from './content-utils.js';

const useTestContent = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev';
const CONTENT_DIR = useTestContent
  ? path.join(process.cwd(), 'test-content')
  : path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
}

async function generateSearchIndex() {
  console.log('Generating search index...');

  const schema = {
    title: 'string',
    name: 'string',
    company: 'string',
    content: 'string',
    type: 'string',
    slug: 'string',
    excerpt: 'string',
    author: 'string',
    tags: 'string[]',
    publishDate: 'string',
    modelVersions: 'enum[]',
  } as const;

  const createCustomTokenizer = async (language: string, stemmerFn?: any) => {
    const tokenizer = await components.tokenizer.createTokenizer({
      language,
      stemming: !!stemmerFn,
      stemmer: stemmerFn,
    });

    tokenizer.tokenize = function (text: string) {
      if (!text) return [];
      const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
      const stemmed = words.map(w => (this.stemmer ? this.stemmer(w) : w));
      return stemmed.filter(Boolean);
    };

    return tokenizer;
  };

  const dbFi = await create({
    schema,
    components: {
      tokenizer: await createCustomTokenizer('finnish', fiStemmer),
    },
  });

  const dbSv = await create({
    schema,
    components: {
      tokenizer: await createCustomTokenizer('swedish', svStemmer),
    },
  });

  const dbEn = await create({
    schema,
    components: {
      tokenizer: await createCustomTokenizer('english', enStemmer),
    },
  });

  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');
  const now = new Date();

  // Pre-calculate model versions where classes and codelists are used
  const classToVersions: Record<string, Set<string>> = {};
  const codelistUriToVersions: Record<string, Set<string>> = {};

  const tietomallitIndexPath = path.join(PUBLIC_DIR, 'data', 'suomi.fi', 'tietomallit', 'index.json');
  if (fs.existsSync(tietomallitIndexPath)) {
    const modelsIndex = JSON.parse(fs.readFileSync(tietomallitIndexPath, 'utf-8'));
    
    // Group by modelName
    const modelsByGroup: Record<string, any[]> = {};
    for (const m of modelsIndex) {
      const match = m.path.match(/^(.+?)-([0-9.]+)\.json$/);
      const mName = match ? match[1] : 'rytj-kaava';
      if (!modelsByGroup[mName]) {
        modelsByGroup[mName] = [];
      }
      modelsByGroup[mName].push(m);
    }

    for (const [groupName, groupModels] of Object.entries(modelsByGroup)) {
      for (const model of groupModels) {
        const modelFilePath = path.join(PUBLIC_DIR, 'data', 'suomi.fi', 'tietomallit', model.path);
        if (!fs.existsSync(modelFilePath)) continue;

        try {
          const modelJson = JSON.parse(fs.readFileSync(modelFilePath, 'utf-8'));
          const classes = modelJson.classes || [];
          const modelVersionString = `${groupName}:${model.version}`;

          for (const cls of classes) {
            if (!cls.id) continue;
            if (!classToVersions[cls.uri]) {
              classToVersions[cls.uri] = new Set();
            }
            classToVersions[cls.uri].add(modelVersionString);

            cls.codelists?.forEach((uri: string) => {
              if (!codelistUriToVersions[uri]) {
                codelistUriToVersions[uri] = new Set();
              }
              codelistUriToVersions[uri].add(modelVersionString);
            });
            cls.attributes?.forEach((attr: any) => {
              attr.codelist?.forEach((uri: string) => {
                if (!codelistUriToVersions[uri]) {
                  codelistUriToVersions[uri] = new Set();
                }
                codelistUriToVersions[uri].add(modelVersionString);
              });
            });
          }
        } catch (e) {
          console.error(`Error reading model file for mapping ${model.path}:`, e);
        }
      }
    }
  }

  // Helper to process directory using shared getFilesRecursive
  const processDir = async (dir: string, type: string) => {
    if (!fs.existsSync(dir)) return;
    const files = getFilesRecursive(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(fileContent);

      // Filter by publishDate for posts
      if (type === 'post' && data.publishDate) {
        if (now < new Date(data.publishDate)) {
          continue;
        }
      }
      // Filter by post or page draft status
      if ( ((type === 'post') || (type === 'page')) && data.draft === true) {
        continue;
      }

      const lang = data.language || 'fi';
      const targetDb = lang === 'sv' ? dbSv : lang === 'en' ? dbEn : dbFi;

      await insert(targetDb, {
        title: data.title || '',
        name: data.name || '',
        company: data.company || '',
        content: content,
        type: type,
        slug: slug,
        excerpt: data.excerpt || data.shortBio || '',
        author: data.author || '',
        tags: data.tags || [],
        publishDate: data.publishDate || '',
        modelVersions: [],
      });
    }
  };

  await processDir(postsDir, 'post');
  await processDir(pagesDir, 'page');
  await processDir(authorsDir, 'author');

  // ----------------------------------------------------
  // Class indexing
  // ----------------------------------------------------
  if (fs.existsSync(tietomallitIndexPath)) {
    console.log('Indexing classes...');
    const models = JSON.parse(fs.readFileSync(tietomallitIndexPath, 'utf-8'));
    
    // Group by modelName
    const modelsByGroup: Record<string, any[]> = {};
    for (const model of models) {
      const match = model.path.match(/^(.+?)-([0-9.]+)\.json$/);
      const mName = match ? match[1] : 'rytj-kaava';
      if (!modelsByGroup[mName]) {
        modelsByGroup[mName] = [];
      }
      modelsByGroup[mName].push(model);
    }

    for (const groupName of Object.keys(modelsByGroup)) {
      modelsByGroup[groupName].sort((a, b) => compareVersions(b.version, a.version));
    }

    const processedClassIds = new Set<string>();

    for (const [groupName, groupModels] of Object.entries(modelsByGroup)) {
      for (const model of groupModels) {
        const modelFilePath = path.join(PUBLIC_DIR, 'data', 'suomi.fi', 'tietomallit', model.path);
        if (!fs.existsSync(modelFilePath)) continue;

        try {
          const modelJson = JSON.parse(fs.readFileSync(modelFilePath, 'utf-8'));
          const classes = modelJson.classes || [];

          for (const cls of classes) {
            if (!cls.uri) continue;
            if (processedClassIds.has(cls.uri)) {
              continue;
            }
            processedClassIds.add(cls.uri);

            const attributes = cls.attributes || [];
            const fiAttrs = attributes.map((a: any) => a.name?.fi || '').filter(Boolean).join(' ');
            const svAttrs = attributes.map((a: any) => a.name?.sv || '').filter(Boolean).join(' ');
            const enAttrs = attributes.map((a: any) => a.name?.en || '').filter(Boolean).join(' ');

            const classSlug = `${groupName}:${cls.technicalName}`;

            const classVersions = Array.from(classToVersions[cls.uri] || []);
            
            await insert(dbFi, {
              title: cls.name?.fi || '',
              name: cls.technicalName || '',
              company: '',
              content: fiAttrs,
              type: 'class',
              slug: classSlug,
              excerpt: cls.description?.fi || '',
              author: '',
              tags: [],
              publishDate: '',
              modelVersions: classVersions,
            });

            await insert(dbSv, {
              title: cls.name?.sv || '',
              name: '',
              company: '',
              content: svAttrs,
              type: 'class',
              slug: classSlug,
              excerpt: cls.description?.sv || '',
              author: '',
              tags: [],
              publishDate: '',
              modelVersions: classVersions,
            });

            await insert(dbEn, {
              title: cls.name?.en || '',
              name: '',
              company: '',
              content: enAttrs,
              type: 'class',
              slug: classSlug,
              excerpt: cls.description?.en || '',
              author: '',
              tags: [],
              publishDate: '',
              modelVersions: classVersions,
            });
          }
        } catch (e) {
          console.error(`Error reading model file ${model.path}:`, e);
        }
      }
    }
  }

  // ----------------------------------------------------
  // Codelist indexing
  // ----------------------------------------------------
  const koodistotIndexPath = path.join(PUBLIC_DIR, 'data', 'suomi.fi', 'koodistot', 'index.json');
  if (fs.existsSync(koodistotIndexPath)) {
    console.log('Indexing codelists...');
    try {
      const codelistsIndex = JSON.parse(fs.readFileSync(koodistotIndexPath, 'utf-8'));
      
      for (const item of codelistsIndex) {
        const codelistPath = path.join(PUBLIC_DIR, 'data', 'suomi.fi', 'koodistot', item.path);
        if (!fs.existsSync(codelistPath)) continue;

        try {
          const codelist = JSON.parse(fs.readFileSync(codelistPath, 'utf-8'));
          
          const definitions = codelist.definitions || {};
          const descriptions = codelist.descriptions || {};

          const fiExcerpt = [definitions.fi, descriptions.fi].map(s => s?.trim()).filter(Boolean).join(' ');
          const svExcerpt = [definitions.sv, descriptions.sv].map(s => s?.trim()).filter(Boolean).join(' ');
          const enExcerpt = [definitions.en, descriptions.en].map(s => s?.trim()).filter(Boolean).join(' ');

          const codes = codelist.codes || [];
          const fiCodes = codes.map((c: any) => c.names?.fi || '').filter(Boolean).join(' ');
          const svCodes = codes.map((c: any) => c.names?.sv || '').filter(Boolean).join(' ');
          const enCodes = codes.map((c: any) => c.names?.en || '').filter(Boolean).join(' ');

          const codelistSlug = `rytj-kaava:${codelist.technicalName}`;
          const codelistVersions = Array.from(codelistUriToVersions[item.uri] || []);

          await insert(dbFi, {
            title: codelist.names?.fi || '',
            name: codelist.technicalName || '',
            company: '',
            content: fiCodes,
            type: 'codelist',
            slug: codelistSlug,
            excerpt: fiExcerpt,
            author: '',
            tags: [],
            publishDate: '',
            modelVersions: codelistVersions,
          });

          await insert(dbSv, {
            title: codelist.names?.sv || '',
            name: '',
            company: '',
            content: svCodes,
            type: 'codelist',
            slug: codelistSlug,
            excerpt: svExcerpt,
            author: '',
            tags: [],
            publishDate: '',
            modelVersions: codelistVersions,
          });

          await insert(dbEn, {
            title: codelist.names?.en || '',
            name: '',
            company: '',
            content: enCodes,
            type: 'codelist',
            slug: codelistSlug,
            excerpt: enExcerpt,
            author: '',
            tags: [],
            publishDate: '',
            modelVersions: codelistVersions,
          });
        } catch (e) {
          console.error(`Error reading codelist file ${item.path}:`, e);
        }
      }
    } catch (e) {
      console.error('Error reading codelist index:', e);
    }
  }

  const indexFi = await save(dbFi);
  const indexSv = await save(dbSv);
  const indexEn = await save(dbEn);
  
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index-fi.json'), JSON.stringify(indexFi));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index-sv.json'), JSON.stringify(indexSv));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index-en.json'), JSON.stringify(indexEn));
  // Backwards compatibility / default:
  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(indexFi));

  console.log('Search indexes generated at public/search-index-{fi,sv,en}.json');
}

generateSearchIndex().catch(console.error);
