import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { resolveImageUrl } from '../lib/utils';
import { CodeBlock } from './CodeBlock';
import { MarkdownHeading } from './MarkdownHeading';
import 'katex/dist/katex.min.css';
import { useAppRouter } from '../hooks/useRouter';
import { CONFIG } from '../config';

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
            const isInteractive = /language-(geojson|jsonfg|mermaid|youtube|vimeo|data-model-snippet|call-to-action|cta)/.test(className);
            
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
