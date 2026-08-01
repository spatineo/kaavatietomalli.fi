/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { parseModelId } from './data-model-utils';

describe('parseModelId utility', () => {
  it('parses simple name and version from dash syntax', () => {
    const res = parseModelId('rytj-kaava-1.0.5');
    expect(res).toEqual({ name: 'rytj-kaava', version: '1.0.5' });
  });

  it('parses version with v prefix from dash syntax', () => {
    const res = parseModelId('rytj-kaava-v1.0.5');
    expect(res).toEqual({ name: 'rytj-kaava', version: '1.0.5' });
  });

  it('parses version from hash fragment', () => {
    const res = parseModelId('http://uri.suomi.fi/model/rytj-kaava#1.0.5');
    expect(res).toEqual({ name: 'rytj-kaava', version: '1.0.5' });
  });

  it('parses version when version is the trailing path segment', () => {
    const res = parseModelId('http://uri.suomi.fi/model/rytj-kaava/1.0.5/');
    expect(res).toEqual({ name: 'rytj-kaava', version: '1.0.5' });
  });

  it('returns just name when no version is present', () => {
    const res = parseModelId('rytj-kaava');
    expect(res).toEqual({ name: 'rytj-kaava', version: undefined });
  });
});
