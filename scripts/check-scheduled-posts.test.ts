import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { checkScheduledPosts } from './check-scheduled-posts';
import { getFilesRecursive } from './content-utils.js';

vi.mock('./content-utils.js', () => ({
  getFilesRecursive: vi.fn(),
}));

describe('checkScheduledPosts', () => {
  let logSpy: any;
  let warnSpy: any;
  let existsSpy: any;
  let readSpy: any;
  let appendSpy: any;
  let originalGithubOutput: string | undefined;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    existsSpy = vi.spyOn(fs, 'existsSync');
    readSpy = vi.spyOn(fs, 'readFileSync');
    appendSpy = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {});

    // Lock system date & time to a stable mock value to decouple from actual build time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T12:00:00Z'));

    // Save and isolate GITHUB_OUTPUT env
    originalGithubOutput = process.env.GITHUB_OUTPUT;
    delete process.env.GITHUB_OUTPUT;

    // Stub global fetch with a default mock response to prevent unhandled rejections/abort leakages or property access type errors
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
  });

  afterEach(() => {
    // Restore environment, timers and mocks
    if (originalGithubOutput === undefined) {
      delete process.env.GITHUB_OUTPUT;
    } else {
      process.env.GITHUB_OUTPUT = originalGithubOutput;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should set rebuild to false when content directory does not exist', async () => {
    existsSpy.mockReturnValue(false);

    await checkScheduledPosts();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Posts directory does not exist'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: false'));
  });

  it('should set rebuild to false when directory exists but there are no post files', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue([]);

    await checkScheduledPosts();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No newly publishable scheduled posts found.'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: false'));
  });

  it('should set rebuild to true when there is a newly publishable post that is not deployed yet', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue(['post-a.md', 'post-b.md']);

    readSpy.mockImplementation((file: any) => {
      const filePath = String(file);
      if (filePath.endsWith('post-a.md')) {
        // Scheduled post, ready now (date in past), not deployed
        return `---
title: "Ready Post"
publishDate: "2026-05-15T00:00:00Z"
---
content`;
      }
      if (filePath.endsWith('post-b.md')) {
        // Scheduled post, but far in the future
        return `---
title: "Future Post"
publishDate: "2026-12-31T00:00:00Z"
---
content`;
      }
      return '';
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ slug: 'post-b' }],
    }));

    await checkScheduledPosts();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 scheduled post(s) ready to be published:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: true'));
  });

  it('should set rebuild to false when a ready scheduled post is already deployed', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue(['post-a.md']);

    readSpy.mockImplementation((file: any) => {
      if (String(file).endsWith('post-a.md')) {
        return `---
title: "Ready Post"
publishDate: "2026-05-15T00:00:00Z"
---
content`;
      }
      return '';
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ slug: 'post-a' }],
    }));

    await checkScheduledPosts();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No newly publishable scheduled posts found.'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: false'));
  });

  it('should fallback to rebuild true when deployed posts fetch fails', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue(['post-a.md']);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    await checkScheduledPosts();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch posts.json (HTTP 500)'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: true'));
  });

  it('should fallback to rebuild true when deployed posts JSON is not an array', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue(['post-a.md']);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ some: 'object' }),
    }));

    await checkScheduledPosts();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Fetched posts.json is not an array.'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuild decision: true'));
  });

  it('should append output value to GITHUB_OUTPUT environment file when set', async () => {
    existsSpy.mockReturnValue(true);
    vi.mocked(getFilesRecursive).mockReturnValue([]);

    process.env.GITHUB_OUTPUT = '/dummy/path/github_output';

    await checkScheduledPosts();

    expect(appendSpy).toHaveBeenCalledWith('/dummy/path/github_output', 'should_rebuild=false\n');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Logged to GITHUB_OUTPUT: should_rebuild=false'));
  });
});
