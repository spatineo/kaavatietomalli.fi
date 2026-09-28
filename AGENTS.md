# AGENTS.md - Developer & Agent Guide for Kaavatietomalli.fi

This file serves as the definitive reference manual for AI agents and human software engineers working on **Kaavatietomalli.fi**. When importing or cloning this project into a new workspace (e.g. Google AI Studio), read this file to understand the architecture, design principles, testing rules, build system, external APIs, and deployment pipelines.

---

## 1. Project Identity & Domain Context

**Kaavatietomalli.fi** is a serverless, git-backed, headless CMS and web application built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS v4**.

The platform serves as:
1. **The official documentation archive and landing page** for Finland's unified spatial planning data model (*Kaavatietomalli*).
2. **Data Model Browser (`DataModelView`)**: Interactive UML class diagram inspector and reference codelist viewer synchronized with the official Finnish Interoperability Platform (*Yhteentoimivuusalusta* / Suomi.fi).
3. **Plan Validator (`ValidateView`)**: Interactive JSON validation studio testing spatial planning payloads (*ValidatePlan*) against official national **Ryhti** validation APIs (Syke / *Suomen ympäristökeskus*).
4. **Plan Explorer (`PlanExplorerView` / *Kaavaselain*)**: Geospatial map browser displaying spatial plan index polygons (*kaavaindeksitiedot*) queried live from Syke's WFS 2.0 services over Maanmittauslaitos (NLS) WMTS raster basemaps.

---

## 2. Technical Stack & Key Libraries

| Category | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Framework & Build** | React 19, Vite, TypeScript | Client-side Single Page Application (SPA) |
| **Styling** | Tailwind CSS v4, Lucide React | Modern slate UI design, icons |
| **Search Engine** | `@orama/orama` | Tri-lingual client-side full-text search engine (FI/SV/EN) |
| **Geospatial & Maps** | Leaflet, Proj4, Proj4Leaflet | Interactive maps, EPSG:3067 (ETRS-TM35FIN) & EPSG:4326 support |
| **Diagrams & Visuals**| Mermaid.js | Dynamic UML class diagrams, flowcharts, sequence diagrams, instance diagrams |
| **Code Highlighting** | `react-syntax-highlighter` (Prism / JetBrains Mono) | Lazy-loaded JSON syntax highlighting in Validator and Plan Explorer |
| **Testing** | Vitest, Happy DOM, React Testing Library, Playwright | Unit, integration, and E2E browser tests |
| **Infrastructure** | AWS CDK v2 (TypeScript) | Serverless S3, CloudFront CDN, Route 53, ACM Wildcard Certs, Athena, Glue |

---

## 3. Project Folder Structure & Code Placement Guide

Code is strictly separated between **build-time ingestion/generation tools** (`/scripts`) and **client-side runtime application logic** (`/src`).

```
 /
 ├── bin/                   # AWS CDK CLI app entry point (app.ts)
 ├── cdk/                   # AWS CDK v2 CloudFormation stack definitions
 ├── content/               # Authored Markdown content (posts, pages, authors, images)
 ├── e2e/                   # Playwright end-to-end browser tests
 ├── public/                # Static public assets, pre-built JSONs, & search indexes
 ├── scripts/               # Build-time TypeScript data fetching & pre-rendering scripts
 └── src/                   # Client-side React 19 application source code
     ├── components/        # React UI view components, widgets, & rich renderers
     ├── hooks/             # Custom React hooks (routing, search, WFS queries, metadata)
     ├── i18n/              # Language translation dictionaries & type definitions
     ├── lib/               # Shared domain utilities, data parsers, & basemap configs
     ├── resources/         # Static TypeScript assets, icons, & fallback images
     └── services/          # External API client services (Syke Ryhti WFS & REST APIs)
```

---

### Detailed Subdirectory Breakdown

#### 1. Build-Time Automation Scripts (`/scripts`)
All scripts in `/scripts` execute exclusively during `npm run prebuild` or `npm run fetch-data` via `tsx` on the build machine. They **MUST NOT** be imported into client-side runtime code.
- **`generate-assets.ts`**: Ingests markdown files from `/content` (posts, pages, authors), parses YAML frontmatter, and emits pre-rendered JSON files to `/public/content/`.
- **`generate-search-index.ts`**: Builds pre-compiled `@orama/orama` search indexes for each language into `/public/data-index/`.
- **`fetch-data-models.ts` & `fetch-codelists.ts`**: Ingests official UML schemas and reference codelists from Suomi.fi into `/public/data/suomi.fi/`.
- **`fetch-municipality-data.ts`**: Fetches Finnish administrative boundaries from NLS OGC API Features into `/public/data/nls.fi/municipalities.json`.

#### 2. React UI Components (`/src/components`)
Contains all React 19 visual components and views.
- **Top-Level Views**: `HomeView.tsx`, `PostView.tsx`, `PageView.tsx`, `AuthorView.tsx`, `DataModelView.tsx`, `ValidateView.tsx`, `PlanExplorerView.tsx`, `TagView.tsx`, `NotFoundView.tsx`.
- **Rich Markdown & Visualizers**: `RichMarkdownRenderer.tsx`, `GeoJSONMapViewer.tsx`, `Mermaid.tsx`, `CodeBlock.tsx`, `InteractiveImage.tsx`, `LazySyntaxHighlighter.tsx`.
- **Interactive Widgets**: `ClassCodelistSelector.tsx`, `ClassInfoPanel.tsx`, `CodelistInfoPanel.tsx`, `SearchBox.tsx`, `SearchWidget.tsx`, `TableOfContents.tsx`.
- **Layout & System**: `Navigation.tsx`, `ContentFooter.tsx`, `CookieConsent.tsx`, `PasswordGate.tsx`, `VersionMismatchPrompt.tsx`, `ErrorBoundary.tsx`.

#### 3. Custom React Hooks (`/src/hooks`)
Encapsulates stateful runtime logic and side effects.
- **`useRouter.ts`**: Custom lightweight hash/query path router (`useAppRouter`, `RouterProvider`).
- **`useOramaSearch.ts`**: Client-side full-text search hook loading pre-compiled Orama indexes.
- **`useDualFeatureWfs.ts`**: Live geospatial WFS 2.0 query hook fetching local detailed plans & master plans from Syke endpoints.
- **`useContentLoader.ts`**: State machine hook managing dynamic loading of static blog/page JSON assets.
- **`useMetadataSync.ts`**: Synchronizes document `<title>`, OpenGraph meta tags, and analytics pageviews on view changes.

#### 4. Internationalization & Localization (`/src/i18n`)
Manages application language dictionaries and strict type checks.
- **`fi.ts`**: Primary Finnish dictionary containing UI copy, labels, and validation error messages. Only the Finnish localization is supported at the moment, but the i18n mechanism is still used to avoid hard-coded language strings in the application and test code. Any language specific strings required by the React components **MUST** be provided by the i18n mechanism. 
- **`types.ts`**: `TranslationKeys` interface enforcing type safety across all translation dictionaries.
- **`index.ts`**: Helper exports (`getTranslations(lang)`).

#### 5. Domain Libraries & Parsers (`/src/lib`)
Pure TypeScript utility functions, domain models, and static configurations.
- **`blog.ts`**: Data fetchers for pre-rendered markdown JSON assets (`getAllPostMetadata`, `getPostBySlug`, `getMunicipalityList`).
- **`basemaps.ts`**: Basemap definitions (`TILE_LAYERS`, `MML_TILES_BASE_URL`) supporting Carto and NLS WMTS maps.
- **`data-model-parser.ts`**: Suomi.fi JSON schema parser generating Mermaid UML class diagram syntax dynamically.
- **`data-model-types.ts`**: Interface definitions for Suomi.fi data models, classes, attributes, associations, and codelists.
- **`fetch-data-model-access.ts`**: Client-side fetcher and cache manager for Suomi.fi data model JSON files.
- **`utils.ts`**: General formatting utilities (dates, classnames, string sanitization).

#### 6. External API Services (`/src/services`)
API client wrappers communicating with external web services at runtime.
- **`plan-api.ts`**: Client service for national **Ryhti** spatial planning services (Syke WFS 2.0 & REST gateways). Constructs OGC CQL filters, parses XML/GeoJSON feature responses, maps municipality codes, and validates plan payloads.

---

## 4. Architecture & Core Workflow

### A. Static Pre-Rendering Engine (`npm run prebuild`)
The app requires no runtime database. Content is authored in Markdown within `/content` and pre-indexed into static JSON files during build:

```
 /content/ (Markdown files)
    ├── posts/        # Articles and blog posts
    ├── pages/        # Static informational pages
    ├── authors/      # Author profiles & bios
    └── images/       # Static post images & SVGs
```

**Build-Time Ingestion Scripts (`/scripts`)**:
- `scripts/generate-assets.ts`: Parses frontmatter YAML and markdown body into JSON files served from `/public/content/`.
- `scripts/generate-search-index.ts`: Builds pre-compiled Orama search indices (`search-index-fi.json`, `search-index-sv.json`, `search-index-en.json`).
- `scripts/fetch-data-models.ts` & `scripts/fetch-codelists.ts` (`npm run fetch-data`): Downloads official schemas and codelists from Suomi.fi API into `/public/data/suomi.fi/`.
- `scripts/fetch-municipality-data.ts`: Downloads Finnish municipality administrative boundaries from NLS OGC API Features into `/public/data/nls.fi/municipalities.json`.

---

## 5. Key Application Views & Components

### 1. Routing & State Management (`src/App.tsx`, `src/hooks/useRouter.ts`)
Routing is managed via a custom lightweight hash/path router hook `useAppRouter`:
- Views: `home`, `post`, `page`, `author`, `model`, `tag`, `validate`, `planExplorer`.
- Deep linking: Query parameters sync active views (e.g. `?model=rytj-kaava-1.0.5&class=Kaava`).

### 2. Plan Explorer (`src/components/PlanExplorerView.tsx`)
- Geospatial map browser for local detailed plans (*Asemakaavat*) and master plans (*Yleiskaavat*).
- Uses `useDualFeatureWfs` hook to query live WFS 2.0 endpoints from Syke (`paikkatiedot.ymparisto.fi`).
- Basemaps configured in `src/lib/basemaps.ts`.
- Production tile requests target `https://map.kaavatietomalli.fi/mml-wmts/*` (proxied by CDK `TilesDistribution`).
- Dev tile requests target relative `/mml-wmts/*` (proxied by Vite dev server in `vite.config.ts`).

### 3. Plan Validator (`src/components/ValidateView.tsx`)
- Validates spatial plan JSON documents against Syke Ryhti REST API gateways.
- Environment switching: Test (`api-test.ymparisto.fi`) vs Production (`api.ymparisto.fi`).
- API keys injected server-side / proxy-side (`VALIDATOR_API_KEY_TEST` and `VALIDATOR_API_KEY_PROD`).
- Includes line-by-line error highlighting mapped directly onto the JSON editor.

### 4. Data Model Browser (`src/components/DataModelView.tsx`)
- Renders Suomi.fi data model class diagrams and codelists.
- Generates interactive Mermaid class diagrams on the fly.
- Supports class inheritance, attribute constraints, and localized descriptions.

### 5. Rich Markdown Rendering (`src/components/RichMarkdownRenderer.tsx`)
Supports custom code block handlers:
- ````youtube```` and ````vimeo```` for responsive video embeds.
- ````mermaid```` for flowcharts, class diagrams, sequence diagrams.
- ````geojson```` and ````jsonfg```` for Leaflet interactive map rendering.
- ````data-model-snippet```` for dynamic Suomi.fi data model diagrams.
- ````instance```` / ````mermaid-instance```` for object/instance graphs.
- ````interactive-image```` for SVG zoom/pan graphics.
- Admonition blockquotes: `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!INFO]`.

---

## 6. Development & Testing Discipline

### A. File Co-location Rule
All test files **MUST** be stored in the exact same directory as the source file being tested:
- `src/components/PlanExplorerView.test.tsx` adjacent to `src/components/PlanExplorerView.tsx`.
- `src/hooks/useOramaSearch.test.tsx` adjacent to `src/hooks/useOramaSearch.ts`.

### B. Sandboxed Test Environments
To prevent tests from polluting production content in `/public/`, tests use sandboxed directories:
- `/test-content/`, `/test-data/`, `/test-data-index/`, `/test-public/`.
- `npm run test:run` and `npm run test:e2e` automatically run `npm run prepare:test` to build sandbox assets.
- Vite sets `publicDir: 'test-public'` when `CONTENT_MODE=test`.

### C. Localization-Invariant Testing Rules (Anti-Fragile Keys)
- **NEVER** hardcode Finnish or English string literals in unit or Playwright tests (e.g. `button:has-text("Lue lisää")`).
- **ALWAYS** import `getTranslations()` or the `fi` dictionary from `src/i18n` and match dynamically:
  ```ts
  import { fi } from '../src/i18n/fi';
  const t = fi;
  const readMoreBtn = page.locator(`button:has-text("${t.post.readMore}")`);
  ```

### D. Graphical Component Testing Fallbacks
Leaflet map containers and Mermaid SVG generators rely on DOM offsets not present in virtual DOMs (`happy-dom`). Always assert on the presence of fallback test markers in unit tests:
- `<div data-testid="geojson-map-viewer-fallback">`
- `<div data-testid="mermaid-fallback">`

---

## 7. AWS CDK & Infrastructure Architecture

The cloud infrastructure is written in TypeScript using AWS CDK v2 (`/cdk/`):

### 1. Certificate Stack (`cdk/certificate-stack.ts`)
- Deployed in region `us-east-1` (required by CloudFront for custom domain SSL).
- Manages Route 53 Public Hosted Zone for `kaavatietomalli.fi`.
- Provisions `WildcardSiteCertificate` covering `kaavatietomalli.fi` and `*.kaavatietomalli.fi`.
- Uses Lambda custom resource (`UpdateDomainNameServers`) to sync domain registrar NS records.

### 2. Website Stack (`cdk/website-stack.ts`)
- Deployed in default region (`eu-north-1`).
- `WebsiteBucket`: Private S3 bucket for React build assets with Origin Access Control (OAC).
- `WebsiteDistribution`: Main CloudFront CDN for website content with `CACHING_OPTIMIZED` and access logging enabled in `CloudFrontLogBucket`.
- `TilesDistribution`: Dedicated light-weight CloudFront distribution for `map.kaavatietomalli.fi` proxying MML map tile requests.
  - **No Access Logging**: Excluded from `logBucket` to prevent tile request log bloat and cost spikes.
  - **Referer Security**: `MmlProxyFunction` enforces `Referer` validation restricting tile proxying to `kaavatietomalli.fi` and authorized dev environments.
  - **Basic Auth Injection**: Injects `Authorization: Basic <base64(MML_API_KEY:)>` header on outbound requests to NLS.
- `AccessLogsAthenaDb`: Amazon Athena and AWS Glue setup for querying CloudFront access logs and analyzing bot/crawler activity (`llms.txt`, `sitemap.xml`, GPTBot, ClaudeBot, etc.).

---

## 8. Key Commands Cheat Sheet

```bash
# Install dependencies
npm install

# Prebuild static JSON assets & Orama search indexes
npm run prebuild

# Start Vite local dev server (Port 3000)
npm run dev

# Run TypeScript compilation & linting checks
npm run lint

# Build production bundle
npm run build

# Run unit & integration tests (interactive watch mode)
npm run test

# Run unit & integration tests (single pass CI mode)
npm run test:run

# Run Playwright E2E integration tests
npm run test:e2e

# Fetch Suomi.fi data models & codelists
npm run fetch-data

# Synthesize AWS CDK CloudFormation templates
npm run cdk:synth

# Deploy AWS CDK stacks to AWS
npm run cdk:deploy
```
