# Kaavatietomalli.fi

A highly polished, serverless headless CMS website built with React, Vite, and Tailwind CSS. The platform serves as a modern landing page, blog, and documentation archive for Finland's unified spatial planning data model (*kaavatietomalli*).

---

## 📖 Table of Contents
1. [Core CMS Operating Process](#-core-cms-operating-process)
2. [Project & Code Architecture](#-project--code-architecture)
3. [Testing Implementation & Developer Guidance](#-testing-implementation--developer-guidance)
   - [Architectural Patterns & Component Isolation](#1-architectural-patterns--component-isolation)
   - [Unit & Integration Testing (Vitest + RTL)](#2-unit--integration-testing-vitest--rtl)
   - [End-to-End Testing (Playwright)](#3-end-to-end-testing-playwright)
4. [Contribution Guidelines](#-contribution-guidelines)
5. [Development & Build Commands](#-development--build-commands)

---

## ⚙️ Core CMS Operating Process

The platform operates as a **git-backed serverless developer CMS**. It requires zero database instances or complex backend runtimes. Instead, it relies on static file generation and indexing during the build phase to yield ultra-fast loads, robust offline capabilities, and maximum security.

```
       [ Markdown Content ] (.md files in /content)
                │
                ▼ (npm run prebuild)
   ┌─────────────────────────────────────────────────────────┐
   │  Ingestion scripts index content, generate metadata,     │
   │  compile search indices & fetch external Giscus stats.   │
   └─────────────────────────────────────────────────────────┘
                │
                ├────────────────────────┬────────────────────────┐
                ▼                        ▼                        ▼
     [ Static Asset Blobs ]     [ Search Index ]        [ Giscus Cache ]
     (public/content/*.json)   (public/search-index)    (public/giscus.json)
                │                        │                        │
                └────────────────────────┼────────────────────────┘
                                         ▼ (Deploy to static hosting / CDN)
                              ┌─────────────────────┐
                              │ Cloud Run CONTAINER │
                              └─────────────────────┘
                                         │
                                         ▼ (On-Demand Client Fetches)
                                  [ User Browser ]
                                (SPA React Engine)
```

1. **Markdown-Based Content Source**: Fully structured Markdown files in `/content` store blog posts, static pages, tags, and biographies.
2. **Build-Time Ingestion (`npm run prebuild`)**:
   - `scripts/generate-assets.ts`: Extracts frontmatter yaml configurations and body paragraphs into structured JSON assets within `/public/content/`.
   - `scripts/generate-search-index.ts`: Builds or registers a full-text client searchable schema into the Orama package.
   - `scripts/fetch-giscus-stats.ts`: Crawls discussions and retrieves comment indicators ahead of runtime presentation.
3. **Pre-Rendered On-Demand Access**: The React SPA parses and queries these local static files and compiled search databases sequentially on-demand using native lightweight HTTP `fetch` requests as users browse views.

---

## 🏛️ Project & Code Architecture

- **`src/hooks/useRouter.ts`**: Governs routing state, back-button history operations, and path resolution.
- **`src/hooks/useContentLoader.ts`**: Represents the decoupled view-loading state machine. Ensures is-data-ready indicators match requested routes.
- **`src/services/analytics.ts`**: Unified proxy service supporting custom page views, post events, CTAs, with test-ready global collection arrays (`window._trackedEvents`).
- **`src/components/SearchBox.tsx`**: Integrates an interactive search dialogue utilizing client-side Orama schemas.
- **`src/components/GeoJSONMapViewer.tsx`**: Loads shape data structures, rendering fully customizable maps via Leflet and Proj4.
- **`src/components/Mermaid.tsx`**: Direct markdown representation of structure maps and process diagrams.

---

## 🧪 Testing Implementation & Developer Guidance

This codebase is specifically engineered to support flawless, isolation-friendly testing via **Vitest + React Testing Library (RTL)** for localized hooks/views, and **Playwright** for deep automated integration flows.

### 1. Architectural Patterns & Component Isolation

To prevent test flakiness and high memory usage, the codebase enforces strict boundaries around rich client components. 

* **Why?**: Graphical rendering nodes like Leaflet Maps (which depend on container coordinate offsets and layout sizes) and Mermaid rendering workflows (which construct complex layouts in WebAssembly or browser SVG spaces) will crash inside standard virtual Node DOM runtimes like `jsdom` or `happy-dom`.
* **Testing Guidelines**:
  - Always verify fallback paths. Both `GeoJSONMapViewer` and `Mermaid` are designed to detect environmental execution failures or library loading errors, rendering accessible fallback test markers:
    ```html
    <!-- Rendered if Leaflet fails to mount inside node/happy-dom tests -->
    <div data-testid="geojson-map-viewer-fallback">...</div>

    <!-- Rendered if Mermaid rendering engine encounters an issue -->
    <div data-testid="mermaid-fallback">...</div>
    ```
  - When writing RTL tests for visual nodes, mock out Leaflet and Mermaid libraries completely, and assert on the appearance of their test identifiers rather than pixel computations.

---

### 2. Best Practices & Key Implementation Decisions

Based on rigorous testing of our custom hooks and components, developers **must** adhere to the following conventions:

#### A. Co-location of Test Files
Always store test files in the **same directory** as the file being tested (e.g. `src/hooks/useOramaSearch.test.tsx` directly adjacent to `src/hooks/useOramaSearch.ts`). This enhances maintainability, simplifies import graphs, and allows test runners to quickly isolate components.

#### B. ESM Mocking & Hoisting workarounds
When mocking ES Modules or databases like `@orama/orama` inside Vitest, mock factories are hoisted to the top level. Ensure your mock handlers are fully self-contained (i.e. returning hardcoded mock datasets or self-contained `vi.fn()` configurations inside the mock declaration) to avoid reference errors regarding variables defined out-of-scope.

#### C. Temporal State Validation
When assertions depend on system time comparison (e.g. Orama filtering out scheduled blog posts that lie in the future relative to the current local date), use Vitest’s fake timer utilities:
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-29T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

#### D. Bypassing Motion Animation Loops
Components utilizing `@motion` or `motion/react` can cause RTL test suites to hang or hit timeouts because of asynchronous animation loop ticks or missing browser layout cycles. Mock out animation elements to return plain, clean React markup:
```typescript
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { transition, animate, initial, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
```

#### E. Silencing Expected Console Error Logs
Testing dynamic library failures or query rejection pipelines inevitably triggers standard `console.error` outputs in Jest/Vitest logs. To ensure clean, green CI logs, spy on and suppress expected logging noise:
```typescript
let consoleErrorSpy: any;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});
```

#### F. Multi-lingual & Localization-Invariant Testing (Anti-Fragile Keys)
Avoid hardcoding Finnish or English texts (e.g., `screen.getByText(/virhe/i)` or `.getByRole('button', { name: /Koodi/i })`) directly in UI test suites. Instead, import the dynamic localization helper `getTranslations()` (or the translation dictionary `fi` directly) in the test and match against dynamic values:
```typescript
import { getTranslations } from '../i18n';
const t = getTranslations();

it('uses translation keys for matching', () => {
  render(<GeoJsonMapViewer code="invalid" />);
  expect(screen.getByText(new RegExp(t.geojson.jsonParseError, 'i'))).toBeDefined();
});
```
This guarantees that UI and custom rendering tests remain fully robust against future language translations, copy updates, or localization changes.

#### G. Intercepting Head Script Appending for Dynamic Scripts (Analytics & GTM)
When testing scripts that dynamically inject files (such as injecting Google Tag Manager or YouTube elements) into `document.head`, virtual light DOM environments like `happy-dom` will yell with `DOMException [NotSupportedError]: JavaScript file loading is disabled` causing test list clutter.
To circumvent this, install global spies on `document.head.appendChild` and `document.head.querySelector` in your unit tests (like `consent-analytics.test.ts`) to intercept element injects and redirect matching calls into a lightweight mock array:
```typescript
const injectedScripts: HTMLScriptElement[] = [];
vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
  if (node instanceof HTMLScriptElement) {
    injectedScripts.push(node);
  }
  return node;
});
```

#### H. End-to-End Test Localization Resilience via i18n Dictionary Access
Just like unit tests, Playwright end-to-end tests must avoid hardcoded string values for matching buttons, labels, and togglers (e.g. `locator('button:has-text("Lue lisää")')`). Import the underlying static translation directory (e.g., `import { fi } from '../src/i18n/fi'`) and utilize standard interpolation to look up matching indicators securely:
```typescript
import { fi } from '../src/i18n/fi';
const t = fi;

test('asserts button exist robustly', async ({ page }) => {
  const readMoreBtn = page.locator(`button:has-text("${t.post.readMore}")`).first();
  await expect(readMoreBtn).toBeVisible();
});
```
This enables the E2E test scripts to survive sweeping copy alterations or site-wide tone-of-voice migrations without single-line logic refactoring.

---

### 3. Unit & Integration Testing (Vitest + RTL)

#### A. Testing the decoupling utility hook: `useContentLoader`
The state machine is contained cleanly inside a custom hook, letting you test routing and data fetch orchestration without loading massive UI components.

* **Target File**: `src/hooks/useContentLoader.ts`
* **Test File**: `src/hooks/useContentLoader.test.tsx`
* **Test Strategy**:
  1. Mock out the core data operations within `src/lib/blog.ts` (`getPostBySlug`, `getPageBySlug`, etc.).
  2. Use `@testing-library/react`'s `renderHook` helper to feed varying `activeView` inputs.
  3. Validate that `isDataReady` resolves to `true` relative to correct actions, and verify that trailing visual states are cleared between distinct layout transitions.

```typescript
// Example Vitest test snippet for useContentLoader
import { renderHook, waitFor } from '@testing-library/react';
import { useContentLoader } from './useContentLoader';
import * as blogLib from '../lib/blog';

vi.mock('../lib/blog', () => ({
  getPostBySlug: vi.fn(),
  getPostsByTag: vi.fn(),
  getTagPageSlugs: vi.fn(),
}));

describe('useContentLoader', () => {
  it('identifies ready state only when slug content returns fully loaded', async () => {
    const mockPost = { slug: 'test-post', title: 'Test Post', content: '# Hello' };
    vi.mocked(blogLib.getPostBySlug).mockResolvedValue(mockPost as any);

    const { result } = renderHook(
      ({ activeView }) => useContentLoader({ activeView, posts: [] }),
      { initialProps: { activeView: { type: 'post', slug: 'test-post' } } }
    );

    expect(result.current.isDataReady).toBe(false);

    await waitFor(() => {
      expect(result.current.isDataReady).toBe(true);
    });

    expect(result.current.currentPost).toEqual(mockPost);
  });
});
```

#### B. Testing Analytics Assertions via Event Spies
You can easily assert that view loads track page views, CTA selections, or author lookups without needing complex analytics library instrumentation.
* **Mechanism**: Every analytic method internally proxies details onto the global `window._trackedEvents` trace array.
* **Unit Verification**:
  ```typescript
  it('fires tracking event when navigating to static contents', () => {
    // Navigate or trigger interaction...
    expect(window._trackedEvents).toContainEqual(
      expect.objectContaining({ event: 'cta_click', data: expect.any(Object) })
    );
  });
  ```

---

### 4. Continuous Integration (GitHub Actions)

The test suite and deployment pipelines are fully wired into our software development lifecycle via distinct workflows under `.github/workflows/`:

- **Main CI/CD Pipeline (`deploy.yml`)**:
  - Automatically runs unit, integration, and hook tests via `npm run test:run` on pull requests targeting the `main` branch, ensuring all checks pass before integration. Direct pushing to `main` is strictly forbidden by branch protection rules.
  - Automatically builds and deploys to GitHub Pages on every pull request merged to `main`.
  - End-to-End browser tests are executed in actual headless profiles with `npm run test:e2e`. Playwright browsers are dynamically installed during the CI flow with `npx playwright install --with-deps`, and testing reports are uploaded as GitHub build artifacts under `playwright-report` with a 30-day retention window.

- **Scheduled Rebuild & Deploy (`scheduled-rebuild.yml`)**:
  - Runs nightly via a schedule cron (`0 0 * * *`) and on-demand via `workflow_dispatch`.
  - **Rebuild Decision Engine**: It invokes a specialized checker script (`scripts/check-scheduled-posts.ts`) that compares filesystem markdown metadata against the currently deployed `posts.json` from the live site.
  - **Resilient Skip Logic**: A full build, test, and release run is triggered **only** when there are newly scheduled posts whose launch dates have passed but are not yet live on the production site. If no newly publishable scheduled posts exist, the workflow terminates early with a clean, successful skip, entirely avoiding redundant version tag increments and deployment churn.

---

### 5. End-to-End Testing (Playwright)

Playwright tests run in actual Chromium/WebKit environments to assert layout correctness, responsive adaptations, and raw routing triggers.

#### A. Running E2E Tests & DevContainer Environment Setup
- **Local Execution**: To execute the E2E tests, ensure your local development server is running in another shell (`npm run dev`), then execute the command:
  ```bash
  npm run test:e2e
  ```
- **DevContainer / Docker Environment Troubleshooting**:
  If running the tests inside your VS Code DevContainer or a Docker-based virtual terminal and encountering missing browser modules or missing dynamic library binaries (e.g. `chrome-linux/headless_shell` or `libnspr4`), run the following sequences:
  ```bash
  # Step 1: Install Chrome/Webkit system dependencies
  sudo npx playwright install-deps
  
  # Step 2: Install browser binaries
  npx playwright install
  
  # Step 3: Run the end-to-end tests
  npm run test:e2e
  ```
  Our DevContainer's configuration is fully optimized to automate this sequence during its container spin-up process.

#### B. Target Selectors for E2E Tests
To ensure selectors remain durable when CSS layouts change, use the pre-built declarative test hooks:
- `data-testid="app-layout"`: Track layout lifecycle states.
  - Features dynamic properties that can be verified immediately:
    ```html
    <div 
      data-testid="app-layout"
      data-view-type="post"
      data-view-slug="digital-twins"
      data-is-ready="true" 
    />
    ```
- `data-testid="home-view"`: Confirms user successfully loaded home contents.
- `data-testid="post-view"`, `data-testid="page-view"`, `data-testid="tag-view"`: Standard wrappers matching different layouts.
- `data-testid="header"`, `data-testid="footer"`: Static navigation areas.
- `data-testid="search-input"`, `data-testid="search-results-container"`: Search utility interfaces.

#### C. Key Flow Assertions to Implement:
1. **The Navigation Flow**:
   - Verify that clicking blog posts in the feed updates the browser link, sets `data-view-type="post"`, and focuses appropriate scroll areas.
2. **Search Verification & Highlighting**:
   - Navigate to any view containing search containers (e.g. Navigation search or NotFoundView's search).
   - Enter query parameters (e.g., `"Malli"`) in `data-testid="search-input"`.
   - Assert `data-testid="search-results-container"` mounts visible choices.
   - Assert that hovering over an explicit search result correctly changes its individual style (highlighting only the current target element).
3. **Language Switch Execution**:
   - Locate translation links, click languages, and assert that dynamic translation strings resolve correctly without breaking current path states.

#### D. Critical E2E Test Resiliency & Pitfalls (Lessons Learned)
When writing, executing, and updating E2E tests, mind the following behaviors critical to our site structure:

1. **Avoid Overly Broad Text Selectors to Prevent Strict-Mode Violations**
   - *The Problem*: Locators like `page.locator('button:has-text("Muokkaa asetuksia")')` can match multiple elements. For instance, the floating settings bar at the bottom and the customize action inside the opened Cookie Consent Banner both utilize this label. Standard Playwright `.click()` operations will trigger a "strict mode violation: locator resolved to 2 elements" error.
   - *The Solution*: Scope the locator inside a parent component or use explicit unique identifiers:
     ```typescript
     // ✅ Always scope or target specifically:
     const bannerBtn = page.locator('[data-testid="cookie-consent-banner"]').locator('button:has-text("Muokkaa asetuksia")');
     ```

2. **Prefer Custom `data-testid` Over Ambiguous Element Traversal**
   - *The Problem*: Relying on relative position querying (like `div:has-text("Analytiikka-evästeet") >> button`) can incorrectly match unrelated higher-level navigation blocks (such as branding titles) if the translation keys are reuse-heavy.
   - *The Solution*: Explicitly declare custom test selectors (such as `data-testid="analytics-consent-toggle"`) directly on target interactable nodes to maintain an decoupled, bulletproof test surface.

3. **Handle Intercepting & Scroll State Preservation on Mobile Layouts**
   - *The Problem*: Standard Playwright `.click()` triggers an automatic scroll-into-view behavior before executing the target action. In mobile viewport assertions (such as checking if the scroll position is maintained when opening the navigation drawer), standard click operations can inadvertently reset or scroll the container/body offset to `0`.
   - *The Solution*: Utilize raw DOM dispatching `dispatchEvent('click')` to simulate viewport-independent user interactions without disrupting scroll position assertions:
     ```typescript
     // ✅ Bypasses auto-scroll behaviors in E2E assertions
     await menuButton.dispatchEvent('click');
     ```

---

## 🤝 Contribution Guidelines

To maintain code quality, ensure site stability, and verify all automated checks pass, **direct pushing to the `main` branch is strictly forbidden by branch protection rules**. All contributions must follow our collaborative pull-request workflow:

1. **Create a Topic Branch**: Create a dedicated feature or bugfix branch from `main` (for example, `feature/your-feature-name` or `fix/issue-id`).
2. **Commit with Quality Checks**: Verify your changes compile cleanly with `npm run lint` and all unit, integration, and end-to-end tests pass locally via `npm run test:run` and `npm run test:e2e` respectively.
3. **Open a Pull Request**: Submit an elegant, structured Pull Request targeting the `main` branch.
4. **Mandatory Review & Checks**:
   - Every Pull Request triggers the automated test suites via GitHub Actions.
   - At least one code review and approval from a team member is required before merging.
   - Merge operations are gated and can only be performed after all GitHub Actions tests, linters, and checks pass successfully with standard green status.

---

## 🛠️ Development & Build Commands

Ensure standard tools are set up before running builds:

```bash
# Install required developer packages
npm install

# Run build indexing hooks to transform Markdowns and generate indexes
npm run prebuild

# Launch local testing server
npm run dev

# Run TypeScript compilation checks
npm run lint

# Compile and package application fully for deployment
npm run build
```
