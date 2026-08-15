/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { transpileInstanceToMermaid } from './instance-diagram-transpiler';

describe('Instance Transpiler', () => {
  it('correctly transpiles standard instance/object declarations with key-value attributes', () => {
    const input = `
      instanceDiagram
      instance alice : User {
        id = 101
        role = "ADMIN"
      }
    `;
    const output = transpileInstanceToMermaid(input);
    expect(output).toContain('---');
    expect(output).toContain('layout: elk');
    expect(output).toContain('flowchart LR');
    expect(output).toContain('alice["<b>alice : User</b><hr/><span>id = 101</span><br/><span>role = &quot;ADMIN&quot;</span><br/>"]');
  });

  it('correctly transpiles single direction relationships', () => {
    const input = `
      alice -> ord1 : places
    `;
    const output = transpileInstanceToMermaid(input);
    expect(output).toContain('alice -->|"places"| ord1');
  });

  it('correctly transpiles bidirectional links with dual roles', () => {
    const input = `
      alice <-> acc99 : owner | account
    `;
    const output = transpileInstanceToMermaid(input);
    expect(output).toContain('alice <-->|"<span class="edgeLabel">:owner&nbsp;◄───►&nbsp;:account</span>"| acc99');
  });

  it('correctly transpiles undirected links with dual roles', () => {
    const input = `
      alice --- acc99 : owner | account
    `;
    const output = transpileInstanceToMermaid(input);
    expect(output).toContain('alice ---|"<span class="edgeLabel">:owner&nbsp;─────────────────&nbsp;:account</span>"| acc99');
  });
});
