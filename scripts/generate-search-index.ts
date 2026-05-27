import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { create, insert, save } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';
import { getFilesRecursive } from './content-utils.js';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function generateSearchIndex() {
  console.log('Generating search index...');

  const db = await create({
    schema: {
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
    },
    components: {
      tokenizer: {
        stemmer: fiStemmer,
      },
    },
  });

  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');
  const now = new Date();

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

      await insert(db, {
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
      });
    }
  };

  await processDir(postsDir, 'post');
  await processDir(pagesDir, 'page');
  await processDir(authorsDir, 'author');

  const index = await save(db);
  
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(index));
  console.log('Search index generated at public/search-index.json');
}

generateSearchIndex().catch(console.error);
