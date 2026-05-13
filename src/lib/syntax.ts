import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter/dist/cjs/index';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import js from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import ts from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown';
import css from 'react-syntax-highlighter/dist/cjs/languages/prism/css';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/cjs/languages/prism/yaml';
import xml from 'react-syntax-highlighter/dist/cjs/languages/prism/markup';

// Register common languages
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('ts', ts);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('markup', xml);
SyntaxHighlighter.registerLanguage('html', xml);

export { SyntaxHighlighter, vscDarkPlus };
