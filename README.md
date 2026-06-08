# Dynamic Website Crawler & Media Recovery Tool

A high-performance website crawler that automatically discovers routes, explores API endpoints, intercepts network traffic, extracts hidden resources, and downloads all available media assets from a website.

Designed for modern SPA applications (Next.js, React, Vue, Nuxt, Angular) where much of the content is loaded dynamically through APIs rather than traditional hyperlinks.

---

## Features

### Dynamic Route Discovery

Unlike traditional crawlers that only follow links, this crawler:

* Intercepts network requests and responses
* Detects API endpoints automatically
* Extracts routes from JSON responses
* Discovers hidden pages not linked in the UI
* Infers new routes from IDs and slugs
* Expands the crawl queue in real time

### Network Traffic Analysis

The crawler monitors everything visible in the browser's Network tab:

* REST API responses
* JSON payloads
* JavaScript bundles
* Image requests
* Video requests
* Audio requests
* Document downloads

Any newly discovered routes or assets are automatically added to the crawl process.

### Media Recovery

Automatically downloads:

* Images (JPG, PNG, GIF, WebP, SVG)
* Videos (MP4, WebM, MOV)
* Audio (MP3, WAV, OGG, M4A)
* PDFs
* ZIP archives
* Office documents
* Any media exposed through APIs

All files are organized and saved locally while preserving website structure.

### Smart API Exploration

The crawler analyzes JSON responses and:

* Extracts embedded URLs
* Detects media links
* Discovers internal routes
* Generates routes from IDs
* Generates routes from slugs
* Recursively explores newly discovered endpoints

Example:

```json
{
  "id": 123,
  "slug": "hello-world"
}
```

Automatically generates:

```text
/api/posts/123
/api/posts/hello-world
```

and adds them to the exploration queue.

---

## How It Works

### Step 1 — Seed Routes

The crawler starts from:

```text
Homepage
robots.txt
sitemap.xml
Known API routes
```

### Step 2 — Crawl

Each page is loaded using Puppeteer.

The crawler:

* Waits for network requests
* Performs automatic scrolling
* Triggers lazy-loaded content
* Captures API responses

### Step 3 — Discover

From every response it:

* Extracts URLs
* Finds media assets
* Finds internal pages
* Detects API endpoints
* Infers new routes

### Step 4 — Expand

Every new route is added to a queue.

The process continues until:

* No routes remain
* Maximum page limit is reached

### Step 5 — Save

The crawler stores:

```text
HTML pages
JSON API responses
Media files
State information
```

allowing interrupted crawls to resume later.

---

## Project Structure

```text
recovered/
│
├── pages/
│   ├── page1.html
│   ├── page2.html
│   └── ...
│
├── json/
│   ├── api_users.json
│   ├── api_posts.json
│   └── ...
│
├── media/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── documents/
│
└── crawler-state.json
```

---

## Technologies Used

* Node.js
* Puppeteer Extra
* Puppeteer Stealth Plugin
* Axios
* p-limit
* fs-extra

---

## Capabilities

| Feature                 | Supported |
| ----------------------- | --------- |
| Dynamic SPA Crawling    | ✅         |
| API Discovery           | ✅         |
| Network Interception    | ✅         |
| Route Inference         | ✅         |
| Infinite Scroll Support | ✅         |
| Media Downloading       | ✅         |
| State Recovery          | ✅         |
| Sitemap Crawling        | ✅         |
| Robots.txt Crawling     | ✅         |
| JSON Archiving          | ✅         |

---

## Example Use Cases

### Website Archiving

Create a complete local copy of a website including:

* Pages
* API responses
* Images
* Videos
* Documents

### Media Recovery

Download all publicly accessible media exposed by a website.

### API Mapping

Discover undocumented API endpoints through network analysis.

### Content Migration

Extract content and assets for migration to another platform.

### Research & Testing

Analyze route structures and API behavior of modern web applications.

---

## Installation

```bash
git clone <repository-url>
cd crawler
npm install
```

---

## Configuration

Edit the crawler configuration:

```javascript
const CONFIG = {
  START_URL: "https://target-site.com",
  OUTPUT_DIR: "./recovered",
  MAX_PAGES: 10000,
  CONCURRENT_DOWNLOADS: 15,
  HEADLESS: true
};
```

Optional known API routes:

```javascript
const API_ROUTES = [
  "/api/posts",
  "/api/users",
  "/api/products"
];
```

---

## Run

```bash
node crawler.js
```

---

## Resume Interrupted Crawls

The crawler periodically saves its state:

```text
crawler-state.json
```

If interrupted, restarting the crawler continues from where it left off.

---

## Performance

Typical capabilities:

* Thousands of discovered routes
* Automatic API expansion
* Concurrent media downloads
* Persistent crawl state
* Large-scale website exploration

---

## Legal Notice

This tool should only be used on websites you own or are authorized to analyze.

Always comply with:

* Website Terms of Service
* robots.txt directives
* Copyright laws
* Privacy regulations

The authors are not responsible for misuse of this software.

---

## Author

Built for large-scale dynamic website exploration, route discovery, and media recovery.
