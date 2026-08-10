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
                        const model = params.get('model');
                        const post = params.get('post');
                        const page = params.get('page');
                        const author = params.get('author');
                        const tag = params.get('tag');

                        const queryParams: Record<string, string> = {};
                        params.forEach((v, k) => {
                            if (!['model', 'post', 'page', 'author', 'tag'].includes(k)) {
                                queryParams[k] = v;
                            }
                        });

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
                            const cleanPath = pathname.replace(/^\/+/, '');
                            if (cleanPath) {
                                router.navigate({ type: 'page', slug: cleanPath, queryParams });
                            } else {
                                router.onHome();
                            }
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
            const isInteractive = /language-(geojson|jsonfg|mermaid|youtube|vimeo)/.test(className);
            
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
