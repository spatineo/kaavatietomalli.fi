/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CallToActionBlock, CodeBlock } from './CodeBlock';

// Setup mocks for useRouter and analytics tracker
const mockActiveView = { type: 'post', slug: 'some-test-post' };
vi.mock('../hooks/useRouter', () => ({
  useAppRouter: () => ({
    activeView: mockActiveView,
    navigate: vi.fn(),
    onHome: vi.fn(),
    scrollToBlog: vi.fn()
  })
}));

const mockTrackCTA = vi.fn();
vi.mock('../services/analytics', () => ({
  getTracker: () => ({
    trackPageView: vi.fn(),
    trackPostView: vi.fn(),
    trackAuthorView: vi.fn(),
    trackCTA: mockTrackCTA
  })
}));

describe('CallToActionBlock & CodeBlock CTA features', () => {
  beforeEach(() => {
    mockTrackCTA.mockClear();
    mockActiveView.type = 'post';
    mockActiveView.slug = 'some-test-post';
  });

  it('correctly parses and renders a valid call-to-action block with all properties', () => {
    const code = `
title: Liity kumppaniksi
description: Kehitä kanssamme kaavoituksen digitaalista tulevaisuutta.
url: https://spatineo.com/contact
buttonText: Ota yhteyttä!
partner: Spatineo
`;

    render(<CallToActionBlock code={code} />);

    // Check title, description and button text
    expect(screen.getByTestId('cta-title').textContent).toBe('Liity kumppaniksi');
    expect(screen.getByTestId('cta-description').textContent).toBe('Kehitä kanssamme kaavoituksen digitaalista tulevaisuutta.');
    
    const button = screen.getByTestId('cta-button');
    expect(button.textContent).toBe('Ota yhteyttä!');
    expect(button.getAttribute('href')).toBe('https://spatineo.com/contact');
  });

  it('handles optional fields elegantly when they are missing', () => {
    const code = `
url: https://example.com/join
buttonText: Rekisteröidy
`;

    render(<CallToActionBlock code={code} />);

    expect(screen.queryByTestId('cta-title')).toBeNull();
    expect(screen.queryByTestId('cta-description')).toBeNull();
    
    const button = screen.getByTestId('cta-button');
    expect(button.textContent).toBe('Rekisteröidy');
    expect(button.getAttribute('href')).toBe('https://example.com/join');
  });

  it('renders an error fallback when required properties are missing', () => {
    const code = `
title: Puutteellinen CTA
description: Tässä ei ole url-osoitetta.
`;

    render(<CallToActionBlock code={code} />);

    expect(screen.queryByTestId('cta-title')).toBeNull();
    expect(screen.getByText(/pakollisia kenttiä/i)).toBeDefined();
  });

  it('triggers trackCTA analytics event with correct context on click for a post view', () => {
    mockActiveView.type = 'post';
    mockActiveView.slug = 'tekoaly-kaavoituksessa';

    const code = `
url: https://spatineo.com/campaign
buttonText: Kampanja
partner: Spatineo Oy
`;

    render(<CallToActionBlock code={code} />);

    const button = screen.getByTestId('cta-button');
    fireEvent.click(button);

    expect(mockTrackCTA).toHaveBeenCalledTimes(1);
    expect(mockTrackCTA).toHaveBeenCalledWith(
      'Kampanja',
      'https://spatineo.com/campaign',
      'post:tekoaly-kaavoituksessa',
      'Spatineo Oy'
    );
  });

  it('triggers trackCTA analytics event with correct context on click for a page view', () => {
    mockActiveView.type = 'page';
    mockActiveView.slug = 'kumppaniksi';

    const code = `
url: https://spatineo.com/services
buttonText: Palvelut
`;

    render(<CallToActionBlock code={code} />);

    const button = screen.getByTestId('cta-button');
    fireEvent.click(button);

    expect(mockTrackCTA).toHaveBeenCalledTimes(1);
    expect(mockTrackCTA).toHaveBeenCalledWith(
      'Palvelut',
      'https://spatineo.com/services',
      'page:kumppaniksi',
      undefined
    );
  });

  it('renders cta block via CodeBlock general component router', () => {
    render(
      <CodeBlock className="language-call-to-action">
        {`
url: https://example.com
buttonText: Click
        `}
      </CodeBlock>
    );

    const button = screen.getByTestId('cta-button');
    expect(button).toBeDefined();
    expect(button.textContent).toBe('Click');
  });

  it('correctly parses and renders interactive-image block with YAML-like config', async () => {
    const code = `
href: /data/images/architecture.svg
title: Tietojärjestelmäarkkitehtuuri
alt: Looginen tietovirtojen kuvailu
style: .node { fill: #fff; }
`;

    render(
      <CodeBlock className="language-interactive-image">
        {code}
      </CodeBlock>
    );

    // Wait for the lazy component to load
    const container = await screen.findByTestId('interactive-image-container');
    expect(container).toBeDefined();
    expect(screen.getByText('Tietojärjestelmäarkkitehtuuri')).toBeDefined();
  });

  it('correctly parses and renders interactive-image block using JSON config', async () => {
    const jsonCode = JSON.stringify({
      href: '/data/images/model.svg',
      title: 'Tietomalli',
      alt: 'Kaavatietomallin UML-diagrammi'
    });

    render(
      <CodeBlock className="language-interactive-image">
        {jsonCode}
      </CodeBlock>
    );

    const container = await screen.findByTestId('interactive-image-container');
    expect(container).toBeDefined();
    expect(screen.getByText('Tietomalli')).toBeDefined();
  });

  it('renders an error banner if href is missing in interactive-image block', async () => {
    const code = `
title: Puutteellinen kuvaaja
alt: Tästä puuttuu href-osoite
`;

    render(
      <CodeBlock className="language-interactive-image">
        {code}
      </CodeBlock>
    );

    const errorBanner = await screen.findByText(/Virheellinen interactive-image -lohko/i);
    expect(errorBanner).toBeDefined();
    expect(errorBanner.textContent).toContain("Property 'href' or 'svgContent' is required");
  });

  it('correctly parses and renders interactive-image block with svgContent but without href, and renders copyright note', async () => {
    const code = `
title: Direct Inline Diagram
svgContent: <svg data-testid="inline-direct"><rect width="20" height="20" /></svg>
note: © 2026 Kaavatietomalli
`;

    render(
      <CodeBlock className="language-interactive-image">
        {code}
      </CodeBlock>
    );

    const container = await screen.findByTestId('interactive-image-container');
    expect(container).toBeDefined();
    expect(screen.getByText('Direct Inline Diagram')).toBeDefined();
    expect(screen.getByText('© 2026 Kaavatietomalli')).toBeDefined();
  });
});
