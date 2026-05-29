/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContentLoader } from './useContentLoader';
import * as blogLib from '../lib/blog';

vi.mock('../lib/blog', () => ({
  getPostBySlug: vi.fn(),
  getPageBySlug: vi.fn(),
  getAuthorBySlug: vi.fn(),
  getPostsByTag: vi.fn(),
  getTagPageSlugs: vi.fn(),
}));

describe('useContentLoader hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('immediately marks home view as ready with correct empty states', () => {
    const { result } = renderHook(() => 
      useContentLoader({ activeView: { type: 'home', slug: null }, posts: [] })
    );

    expect(result.current.isDataReady).toBe(true);
    expect(result.current.currentPost).toBeNull();
    expect(result.current.currentPage).toBeNull();
    expect(result.current.currentAuthor).toBeNull();
    expect(result.current.contentNotFound).toBe(false);
  });

  it('loads a post successfully and updates isDataReady', async () => {
    const mockPost = { slug: 'test-post-slug', title: 'Test Post', content: 'Post content details' };
    vi.mocked(blogLib.getPostBySlug).mockResolvedValue(mockPost as any);

    const { result } = renderHook(
      ({ activeView }) => useContentLoader({ activeView, posts: [] }),
      {
        initialProps: {
          activeView: { type: 'post', slug: 'test-post-slug' },
        },
      }
    );

    // Initially loading state, isDataReady should be false because the response has not resolved yet
    expect(result.current.isDataReady).toBe(false);
    expect(result.current.currentPost).toBeNull();

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });

    expect(result.current.currentPost).toEqual(mockPost);
    expect(result.current.contentNotFound).toBe(false);
    expect(blogLib.getPostBySlug).toHaveBeenCalledWith('test-post-slug');
  });

  it('handles post loading failure and marks contentNotFound', async () => {
    vi.mocked(blogLib.getPostBySlug).mockResolvedValue(null);

    const { result } = renderHook(() => 
      useContentLoader({ activeView: { type: 'post', slug: 'not-found-slug' }, posts: [] })
    );

    expect(result.current.isDataReady).toBe(false);

    await waitFor(() => {
      expect(result.current.contentNotFound).toBe(true);
    });

    expect(result.current.isDataReady).toBe(false);
    expect(result.current.currentPost).toBeNull();
    expect(blogLib.getPostBySlug).toHaveBeenCalledWith('not-found-slug');
  });

  it('loads a page successfully', async () => {
    const mockPage = { slug: 'about', title: 'About Us', content: 'About us page' };
    vi.mocked(blogLib.getPageBySlug).mockResolvedValue(mockPage as any);

    const { result } = renderHook(() =>
      useContentLoader({ activeView: { type: 'page', slug: 'about' }, posts: [] })
    );

    expect(result.current.isDataReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });

    expect(result.current.currentPage).toEqual(mockPage);
    expect(result.current.contentNotFound).toBe(false);
    expect(blogLib.getPageBySlug).toHaveBeenCalledWith('about');
  });

  it('loads an author successfully', async () => {
    const mockAuthor = { slug: 'jane-doe', name: 'Jane Doe', title: 'Content Architect', content: 'Bio' };
    vi.mocked(blogLib.getAuthorBySlug).mockResolvedValue(mockAuthor as any);

    const { result } = renderHook(() =>
      useContentLoader({ activeView: { type: 'author', slug: 'jane-doe' }, posts: [] })
    );

    expect(result.current.isDataReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });

    expect(result.current.currentAuthor).toEqual(mockAuthor);
    expect(result.current.contentNotFound).toBe(false);
    expect(blogLib.getAuthorBySlug).toHaveBeenCalledWith('jane-doe');
  });

  it('loads tagging context successfully including related tagging posts and tagging page', async () => {
    const mockTaggedPosts = [{ slug: 'post-1', title: 'Tagged Post 1', tags: ['gis'] }];
    const mockPageSlugs = ['gis-tag-page'];
    const mockTagPage = { slug: 'gis-tag-page', title: 'GIS Tag Details', content: 'Description content' };

    vi.mocked(blogLib.getPostsByTag).mockResolvedValue(mockTaggedPosts as any);
    vi.mocked(blogLib.getTagPageSlugs).mockResolvedValue(mockPageSlugs);
    vi.mocked(blogLib.getPageBySlug).mockResolvedValue(mockTagPage as any);

    const { result } = renderHook(() =>
      useContentLoader({ activeView: { type: 'tag', slug: 'gis' }, posts: [] })
    );

    expect(result.current.isDataReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });

    expect(result.current.tagPosts).toEqual(mockTaggedPosts);
    expect(result.current.tagPage).toEqual(mockTagPage);
    expect(result.current.contentNotFound).toBe(false);
    expect(blogLib.getPostsByTag).toHaveBeenCalledWith('gis', 0, 100);
    expect(blogLib.getTagPageSlugs).toHaveBeenCalledWith('gis');
    expect(blogLib.getPageBySlug).toHaveBeenCalledWith('gis-tag-page');
  });

  it('clears inactive view states immediately when changing activeView types', async () => {
    // 1. Initial post view
    const mockPost = { slug: 'my-post', title: 'My Post', content: 'Content' };
    vi.mocked(blogLib.getPostBySlug).mockResolvedValue(mockPost as any);

    const { result, rerender } = renderHook(
      ({ activeView }) => useContentLoader({ activeView, posts: [] }),
      {
        initialProps: {
          activeView: { type: 'post', slug: 'my-post' } as any,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });
    expect(result.current.currentPost).toEqual(mockPost);

    // 2. Change view to a page
    const mockPage = { slug: 'my-page', title: 'My Page', content: 'Content' };
    vi.mocked(blogLib.getPageBySlug).mockResolvedValue(mockPage as any);

    rerender({ activeView: { type: 'page', slug: 'my-page' } });

    // Transition state should immediately clear post and hold page as null
    expect(result.current.isDataReady).toBe(false);
    expect(result.current.currentPost).toBeNull();
    expect(result.current.currentPage).toBeNull();

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });
    expect(result.current.currentPage).toEqual(mockPage);
  });
});
