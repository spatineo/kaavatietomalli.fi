import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverImage } from './CoverImage';
import { fi } from '../i18n/fi';

// Mock motion/react to prevent animation loop issues in virtual DOM
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { transition, animate, initial, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('CoverImage Component', () => {
  const defaultProps = {
    src: 'images/nasa-Q1p7bh3SHj8-unsplash.png',
    alt: 'Test Cover Alt',
    caption: 'Test Cover Title',
  };

  it('renders inline cover image with responsive srcSet and 1200px fallback src', () => {
    render(<CoverImage {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('nasa-Q1p7bh3SHj8-unsplash-1200px.png');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-320px.png 320w');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-1600px.png 1600w');
    expect(img.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-2048px.png 2048w');
    expect(img.getAttribute('alt')).toBe(defaultProps.alt);
  });

  it('does not render lightbox initially', () => {
    render(<CoverImage {...defaultProps} />);
    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });

  it('opens lightbox when trigger container is clicked', () => {
    render(<CoverImage {...defaultProps} />);

    const trigger = screen.getByTestId('cover-image-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();
    const lightboxImg = screen.getByTestId('image-lightbox-img');
    expect(lightboxImg.getAttribute('src')).toContain('nasa-Q1p7bh3SHj8-unsplash-2048px.png');
    expect(lightboxImg.getAttribute('srcset')).toContain('nasa-Q1p7bh3SHj8-unsplash-2048px.png 2048w');
    expect(screen.getByTestId('image-lightbox-caption').textContent).toBe(defaultProps.caption);
  });

  it('opens lightbox on keyboard Enter and Space', () => {
    const { unmount } = render(<CoverImage {...defaultProps} />);
    const trigger = screen.getByTestId('cover-image-trigger');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();

    unmount();

    render(<CoverImage {...defaultProps} />);
    const newTrigger = screen.getByTestId('cover-image-trigger');
    fireEvent.keyDown(newTrigger, { key: ' ' });
    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();
  });

  it('closes lightbox when close button is clicked', () => {
    render(<CoverImage {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cover-image-trigger'));
    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();

    const closeBtn = screen.getByTestId('image-lightbox-close');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });

  it('closes lightbox when enlarged image itself is clicked', () => {
    render(<CoverImage {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cover-image-trigger'));
    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();

    const lightboxImg = screen.getByTestId('image-lightbox-img');
    fireEvent.click(lightboxImg);

    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });

  it('closes lightbox when backdrop is clicked', () => {
    render(<CoverImage {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cover-image-trigger'));
    const backdrop = screen.getByTestId('image-lightbox-backdrop');
    fireEvent.click(backdrop);

    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });

  it('closes lightbox on Escape key press', () => {
    render(<CoverImage {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cover-image-trigger'));
    expect(screen.getByTestId('image-lightbox-backdrop')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('image-lightbox-backdrop')).toBeNull();
  });

  it('locks body scroll when lightbox is opened and unlocks on close', () => {
    render(<CoverImage {...defaultProps} />);

    expect(document.body.style.overflow).toBe('');

    fireEvent.click(screen.getByTestId('cover-image-trigger'));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByTestId('image-lightbox-close'));
    expect(document.body.style.overflow).toBe('');
  });
});

