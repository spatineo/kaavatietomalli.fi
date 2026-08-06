import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { resolveImageUrl } from '../lib/utils';
import { CodeBlock } from './CodeBlock';
import { MarkdownHeading } from './MarkdownHeading';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
    markdownContent: string;
    slug: string;
}

export function MarkdownRenderer({ markdownContent, slug }: MarkdownRendererProps) {
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