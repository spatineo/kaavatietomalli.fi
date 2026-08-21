import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { resolveImageUrl } from '../lib/utils';
import { CodeBlock } from './CodeBlock';
import { MarkdownHeading } from './MarkdownHeading';
import 'katex/dist/katex.min.css';
import { useAppRouter } from '../hooks/useRouter';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide-react';

function mapType(token: string): string {
  if (['warning', 'varoitus', 'varning', 'caution'].includes(token)) return 'warning';
  if (['tip', 'tärkeää', 'tarkeaa', 'viktigt', 'important'].includes(token)) return 'tip';
  if (['info', 'huomaa', 'information'].includes(token)) return 'info';
  return 'note';
}

function getCalloutTitle(type: string): string {
  const t = getTranslations(CONFIG.language as Language);
  if (type === 'warning') return t.callouts.warning;
  if (type === 'tip') return t.callouts.tip;
  if (type === 'info') return t.callouts.info;
  return t.callouts.note;
}

function getCalloutIcon(type: string) {
  if (type === 'warning') return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
  if (type === 'tip') return <Lightbulb className="w-5 h-5 flex-shrink-0" />;
  if (type === 'info') return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
  return <Info className="w-5 h-5 flex-shrink-0" />;
}

function extractCallout(children: any): { type: string; title: string; icon: React.ReactNode; cleanChildren: any } | null {
  if (!children) return null;
  
  let nodes = React.Children.toArray(children);
  // Filter out leading whitespace-only string nodes
  while (nodes.length > 0 && typeof nodes[0] === 'string' && nodes[0].trim() === '') {
    nodes.shift();
  }
  
  if (nodes.length === 0) return null;

  const firstNode = nodes[0] as any;
  if (!firstNode) return null;

  // Case 1: The first node is a string
  if (typeof firstNode === 'string') {
    const match = firstNode.match(/^\s*\[!?([A-ZÄÖÅa-zäöå_-]+)(?:::(.+?))?\]\s*(?:\r?\n)?(.*)/s);
    if (match) {
      const token = match[1].toLowerCase().replace(/[^a-zäöå]/g, '');
      const customTitle = match[2];
      const rest = match[3];
      const standardType = mapType(token);
      const title = customTitle ? customTitle.trim() : getCalloutTitle(standardType);
      const icon = getCalloutIcon(standardType);
      
      const newNodes = [...nodes];
      if (rest.trim() === '') {
        newNodes.shift(); // remove empty first text node
      } else {
        newNodes[0] = rest;
      }
      return { type: standardType, title, icon, cleanChildren: newNodes };
    }
  }

  // Case 2: The first node is an element (typically <p>) containing children
  if (firstNode && firstNode.props && firstNode.props.children) {
    let innerChildren = React.Children.toArray(firstNode.props.children);
    while (innerChildren.length > 0 && typeof innerChildren[0] === 'string' && innerChildren[0].trim() === '') {
      innerChildren.shift();
    }

    if (innerChildren.length > 0 && typeof innerChildren[0] === 'string') {
      const firstStr = innerChildren[0] as string;
      const match = firstStr.match(/^\s*\[!?([A-ZÄÖÅa-zäöå_-]+)(?:::(.+?))?\]\s*(?:\r?\n)?(.*)/s);
      if (match) {
        const token = match[1].toLowerCase().replace(/[^a-zäöå]/g, '');
        const customTitle = match[2];
        const rest = match[3];
        const standardType = mapType(token);
        const title = customTitle ? customTitle.trim() : getCalloutTitle(standardType);
        const icon = getCalloutIcon(standardType);

        const newInnerChildren = [...innerChildren];
        if (rest.trim() === '') {
          newInnerChildren.shift(); // remove empty first string
        } else {
          newInnerChildren[0] = rest;
        }

        const filteredInner = newInnerChildren.filter(c => typeof c !== 'string' || c.trim() !== '');
        const newNodes = [...nodes];
        if (filteredInner.length === 0) {
          newNodes.shift(); // remove the entire first paragraph if it's empty
        } else {
          const newFirstNode = React.cloneElement(firstNode, {
            ...firstNode.props,
            children: newInnerChildren
          });
          newNodes[0] = newFirstNode;
        }

        return { type: standardType, title, icon, cleanChildren: newNodes };
      }
    }
  }

  return null;
}

interface MarkdownRendererProps {
    markdownContent: string;
    slug: string;
}

export function MarkdownRenderer({ markdownContent, slug }: MarkdownRendererProps) {
    const router = useAppRouter();

    return (
        <ReactMarkdown
        urlTransform={(url) => resolveImageUrl(url)}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            blockquote({ children }: any) {
                const callout = extractCallout(children);
                if (callout) {
                    return (
                        <blockquote className={`callout-block callout-${callout.type}`}>
                            <div className="callout-header">
                                {callout.icon}
                                <span className="callout-title">{callout.title}</span>
                            </div>
                            <div className="callout-content">{callout.cleanChildren}</div>
                        </blockquote>
                    );
                }
                return <blockquote>{children}</blockquote>;
            },
            h1({ children }: any) { return <MarkdownHeading level={1}>{children}</MarkdownHeading>; },
            h2({ children }: any) { return <MarkdownHeading level={2}>{children}</MarkdownHeading>; },
            h3({ children }: any) { return <MarkdownHeading level={3}>{children}</MarkdownHeading>; },
            h4({ children }: any) { return <MarkdownHeading level={4}>{children}</MarkdownHeading>; },
            h5({ children }: any) { return <MarkdownHeading level={5}>{children}</MarkdownHeading>; },
            h6({ children }: any) { return <MarkdownHeading level={6}>{children}</MarkdownHeading>; },
            a({ href, children, ...props }: any) {
                const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (!href) return;
                    
                    if (href.startsWith('#')) {
                        e.preventDefault();
                        const targetId = decodeURIComponent(href.substring(1));
                        const element = document.getElementById(targetId);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                            window.history.pushState(null, '', href);
                        }
                        return;
                    }

                    const isInternal = 
                        href.startsWith('?') || 
                        href.startsWith('/') || 
                        href.startsWith(window.location.origin) ||
                        !href.includes('://');

                    const hasTargetBlank = props.target === '_blank';

                    if (isInternal && !hasTargetBlank) {
                        e.preventDefault();
                        let searchStr = '';
                        let pathname = '';
                        try {
                            const url = new URL(href, window.location.origin);
                            searchStr = url.search;
                            pathname = url.pathname;
                        } catch (err) {
                            if (href.startsWith('?')) {
                                searchStr = href;
                            }
                        }

                        const params = new URLSearchParams(searchStr);
                        let model = params.get('model');
                        let post = params.get('post');
                        let page = params.get('page');
                        let author = params.get('author');
                        let tag = params.get('tag');

                        const queryParams: Record<string, string> = {};
                        params.forEach((v, k) => {
                            if (!['model', 'post', 'page', 'author', 'tag'].includes(k)) {
                                queryParams[k] = v;
                            }
                        });

                        // If not defined in query parameters, try to parse from clean pathname
                        if (!model && !post && !page && !author && !tag && pathname && pathname !== '/' && pathname !== CONFIG.basePath) {
                            let relativePath = pathname;
                            if (relativePath.startsWith(CONFIG.basePath)) {
                                relativePath = relativePath.substring(CONFIG.basePath.length);
                            }
                            relativePath = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');

                            if (relativePath) {
                                const parts = relativePath.split('/');
                                const firstPart = parts[0];
                                const secondPart = parts[1] ? decodeURIComponent(parts[1]) : null;

                                if (firstPart === 'blog') {
                                    post = secondPart;
                                } else if (firstPart === 'author') {
                                    author = secondPart;
                                } else if (firstPart === 'tag') {
                                    tag = secondPart;
                                } else if (firstPart === 'data-model') {
                                    model = secondPart;
                                } else if (firstPart !== 'model') {
                                    page = decodeURIComponent(firstPart);
                                }
                            }
                        }

                        if (model) {
                            router.navigate({ type: 'model', slug: model, queryParams });
                        } else if (post) {
                            router.navigate({ type: 'post', slug: post, queryParams });
                        } else if (page) {
                            router.navigate({ type: 'page', slug: page, queryParams });
                        } else if (author) {
                            router.navigate({ type: 'author', slug: author, queryParams });
                        } else if (tag) {
                            router.navigate({ type: 'tag', slug: tag, queryParams });
                        } else if (pathname === '/' || pathname === CONFIG.basePath) {
                            router.onHome();
                        } else {
                            router.onHome();
                        }
                    }
                };

                return (
                    <a href={href} onClick={handleClick} {...props}>
                        {children}
                    </a>
                );
            },
            pre({ node, children, ...props }: any) {
            const codeEl = children && (children as any).props;
            const className = codeEl?.className || '';
            const isInteractive = /language-(geojson|jsonfg|mermaid|instance|mermaid-instance|youtube|vimeo|data-model-snippet|call-to-action|cta)/.test(className);
            
            if (isInteractive) {
                return <>{children}</>;
            }
            return <pre {...props}>{children}</pre>;
            },
            code({ node, className, children, ref, ...props }: any) {
            return (
                <CodeBlock
                    className={className}
                    filePath={`src/${slug}.md`}
                    placeholderHeight="h-64"
                    {...props}
                >
                    {children}
                </CodeBlock>
            );
            },
        }}
        >
            {markdownContent}
        </ReactMarkdown>
    );   
}
