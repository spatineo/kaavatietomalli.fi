import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageView } from './PageView';
import { fi } from '../i18n/fi';

vi.mock('../hooks/useRouter', () => ({
  useAppRouter: () => ({
    navigate: vi.fn(),
    onHome: vi.fn(),
  }),
}));

describe('PageView Component', () => {
  const mockPage = {
    slug: 'tietoa-palvelusta',
    title: 'Tietoa palvelusta',
    content: '## Johdanto\n\nTämä on testisivun sisältöä.',
    tags: ['info'],
  };

  it('renders page title and content without comments by default', () => {
    const onBack = vi.fn();
    render(<PageView page={mockPage} onBack={onBack} />);

    expect(screen.getByText('Tietoa palvelusta')).toBeDefined();
    expect(screen.getByText('Johdanto')).toBeDefined();
    expect(screen.getByText('Tämä on testisivun sisältöä.')).toBeDefined();
    expect(screen.getAllByText(fi.common.backToHome).length).toBeGreaterThanOrEqual(1);

    // Comments section toggle button should not be present
    expect(screen.queryByText(fi.post.comments)).toBeNull();
  });

  it('renders comments section when page.comments is true', () => {
    const onBack = vi.fn();
    const pageWithComments = {
      ...mockPage,
      comments: true,
    };
    render(<PageView page={pageWithComments} onBack={onBack} />);

    expect(screen.getByText('Tietoa palvelusta')).toBeDefined();
    expect(screen.getByText(fi.post.comments)).toBeDefined();
    expect(screen.getByText(fi.post.showComments)).toBeDefined();
  });

  it('does not render comments when page.comments is false', () => {
    const onBack = vi.fn();
    const pageWithoutComments = {
      ...mockPage,
      comments: false,
    };
    render(<PageView page={pageWithoutComments} onBack={onBack} />);

    expect(screen.queryByText(fi.post.comments)).toBeNull();
  });

  it('renders in inline mode when inline=true', () => {
    const onBack = vi.fn();
    const { container } = render(<PageView page={mockPage} onBack={onBack} inline={true} />);

    expect(screen.getByText('Johdanto')).toBeDefined();
    expect(screen.queryByText(fi.common.backToHome)).toBeNull();
    expect(container.querySelector('article')).toBeNull();
  });

  it('renders cover image with responsive srcSet when page.coverImage is provided', () => {
    const onBack = vi.fn();
    const pageWithCover = {
      ...mockPage,
      coverImage: 'nasa-Q1p7bh3SHj8-unsplash.jpg',
    };
    render(<PageView page={pageWithCover} onBack={onBack} />);

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('nasa-Q1p7bh3SHj8-unsplash-1200px.jpg');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-320px.jpg 320w');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-1600px.jpg 1600w');
    expect(img.getAttribute('alt')).toBe(`${fi.post.illustrationAlt}: Tietoa palvelusta`);
  });

  it('does not render cover image when page.coverImage is not provided', () => {
    const onBack = vi.fn();
    render(<PageView page={mockPage} onBack={onBack} />);

    expect(screen.queryByRole('img')).toBeNull();
  });
});
