import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagView } from './TagView';
import { fi } from '../i18n/fi';
import { PageData, PostMetadata } from '../lib/blog';

// Mock motion/react to prevent animation lifecycle cancellation errors in HappyDOM
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { transition, animate, initial, exit, whileInView, viewport, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    article: ({ children, ...props }: any) => {
      const { transition, animate, initial, exit, whileInView, viewport, ...rest } = props;
      return <article {...rest}>{children}</article>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../hooks/useRouter', () => ({
  useAppRouter: () => ({
    navigate: vi.fn(),
    onHome: vi.fn(),
  }),
}));

describe('TagView Component', () => {
  const mockTagPage: PageData = {
    slug: 'tag-pages-spatineo',
    title: 'Spatineo Oy',
    content: 'Tämä on tag-sivun sisältöä.',
    tags: ['spatineo'],
    coverImage: 'nasa-Q1p7bh3SHj8-unsplash.jpg',
  };

  const mockPosts: PostMetadata[] = [
    {
      slug: 'test-post',
      title: 'Testipostaus',
      date: '2026-01-01',
      author: 'Testaaja',
      excerpt: 'Lyhyt kuvaus',
      tags: ['spatineo'],
    },
  ];

  it('renders tag page title and cover image when tagPage with coverImage is provided', () => {
    const onHome = vi.fn();
    const onLoadMore = vi.fn();
    const navigate = vi.fn();

    render(
      <TagView
        tagSlug="spatineo"
        isDataReady={true}
        tagPage={mockTagPage}
        tagPosts={mockPosts}
        visibleTagCount={10}
        onLoadMore={onLoadMore}
        navigate={navigate}
        onHome={onHome}
      />
    );

    expect(screen.getByText('Spatineo Oy')).toBeDefined();
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('nasa-Q1p7bh3SHj8-unsplash-1200px.jpg');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-320px.jpg 320w');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-1600px.jpg 1600w');
    expect(img.getAttribute('alt')).toBe(`${fi.post.illustrationAlt}: Spatineo Oy`);
  });

  it('renders hashtag when tagPage is null and does not render cover image', () => {
    const onHome = vi.fn();
    const onLoadMore = vi.fn();
    const navigate = vi.fn();

    render(
      <TagView
        tagSlug="yleiskaava"
        isDataReady={true}
        tagPage={null}
        tagPosts={mockPosts}
        visibleTagCount={10}
        onLoadMore={onLoadMore}
        navigate={navigate}
        onHome={onHome}
      />
    );

    expect(screen.getByText('yleiskaava')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
