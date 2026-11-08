import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostView } from './PostView';
import { fi } from '../i18n/fi';
import { PostData } from '../lib/blog';

// Mock motion/react to prevent animation loop hangs in virtual DOM
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return ({ children, ...props }: any) => {
          const { transition, animate, initial, exit, whileInView, viewport, ...rest } = props;
          const Tag = prop as any;
          return <Tag {...rest}>{children}</Tag>;
        };
      },
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../lib/blog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/blog')>();
  return {
    ...actual,
    getAuthorBySlug: vi.fn().mockResolvedValue(null),
    getRelatedPostSlugs: vi.fn().mockResolvedValue([]),
    getAllPostMetadata: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('../services/analytics', () => ({
  getTracker: () => ({
    trackPageView: vi.fn(),
    trackEvent: vi.fn(),
  }),
}));

vi.mock('../hooks/useRouter', () => ({
  useAppRouter: () => ({
    navigate: vi.fn(),
    onHome: vi.fn(),
  }),
}));

describe('PostView Component', () => {
  const mockPost: PostData = {
    slug: 'testi-artikkeli',
    title: 'Testiartikkelin otsikko',
    date: '2026-05-15',
    author: 'Testi Kirjoittaja',
    authorSlug: 'testi-kirjoittaja',
    excerpt: 'Testiartikkelin tiivistelmä.',
    tags: ['testi'],
    content: '## Otsikko\n\nArtikkelin leipätekstiä.',
    coverImage: 'images/Gemini_Generated_Image_5u3cvb5u3cvb5u3c.jpeg',
  };

  it('renders cover image with responsive srcSet including 2048px', () => {
    const onBack = vi.fn();
    const onNavigate = vi.fn();
    const onNavigateAuthor = vi.fn();
    const onSelectTag = vi.fn();

    render(
      <PostView
        post={mockPost}
        onBack={onBack}
        onNavigate={onNavigate}
        onNavigateAuthor={onNavigateAuthor}
        onSelectTag={onSelectTag}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('Gemini_Generated_Image_5u3cvb5u3cvb5u3c-1200px.jpeg');
    expect(img.getAttribute('srcset')).toContain('Gemini_Generated_Image_5u3cvb5u3cvb5u3c-320px.jpeg 320w');
    expect(img.getAttribute('srcset')).toContain('Gemini_Generated_Image_5u3cvb5u3cvb5u3c-1600px.jpeg 1600w');
    expect(img.getAttribute('srcset')).toContain('Gemini_Generated_Image_5u3cvb5u3cvb5u3c-2048px.jpeg 2048w');
    expect(img.getAttribute('alt')).toBe(`${fi.post.illustrationAlt}: ${mockPost.title}`);
  });

  it('opens and closes lightbox on cover image interaction', () => {
    const onBack = vi.fn();
    const onNavigate = vi.fn();
    const onNavigateAuthor = vi.fn();
    const onSelectTag = vi.fn();

    render(
      <PostView
        post={mockPost}
        onBack={onBack}
        onNavigate={onNavigate}
        onNavigateAuthor={onNavigateAuthor}
        onSelectTag={onSelectTag}
      />
    );

    // Click trigger opens lightbox
    const trigger = screen.getByTestId('cover-image-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();
    const lightboxImg = screen.getByTestId('image-lightbox-img');
    expect(lightboxImg.getAttribute('src')).toContain('Gemini_Generated_Image_5u3cvb5u3cvb5u3c-2048px.jpeg');
    expect(screen.getByTestId('image-lightbox-title').textContent).toBe(mockPost.title);

    // Clicking enlarged image closes lightbox
    fireEvent.click(lightboxImg);
    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });
});
