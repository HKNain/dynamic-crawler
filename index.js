const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const pLimit = require("p-limit");

const CONFIG = {
  START_URL: "https://your-site",

  OUTPUT_DIR: "./recovered",

  MAX_PAGES: 10000,

  CONCURRENT_DOWNLOADS: 15,

  HEADLESS: true,

  PAGE_TIMEOUT: 45000,

  MAX_SCROLLS: 8,

  SCROLL_DELAY: 700,
};

/*
========================================================
YOUR KNOWN API ROUTES
========================================================
*/

const API_ROUTES = [
  
];

/*
========================================================
MEDIA DETECTION
========================================================
*/

const MEDIA_REGEX =
  /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|pdf|zip|rar|7z|mp3|wav|ogg|m4a|doc|docx|xls|xlsx|ppt|pptx)(\?.*)?$/i;

/*
========================================================
STATE
========================================================
*/

const visitedRoutes = new Set();
const queuedRoutes = new Set();
const downloadedMedia = new Set();

const routeQueue = [];

const stateFile = "crawler-state.json";

const limit = pLimit(CONFIG.CONCURRENT_DOWNLOADS);

/*
========================================================
LOAD STATE
========================================================
*/

async function loadState() {
  if (!(await fs.pathExists(stateFile))) {
    return;
  }

  const data = await fs.readJson(stateFile);

  data.visitedRoutes?.forEach(v =>
    visitedRoutes.add(v)
  );

  data.queuedRoutes?.forEach(v =>
    routeQueue.push(v)
  );

  data.downloadedMedia?.forEach(v =>
    downloadedMedia.add(v)
  );

  console.log("STATE LOADED");
}

/*
========================================================
SAVE STATE
========================================================
*/

async function saveState() {
  await fs.writeJson(
    stateFile,
    {
      visitedRoutes: [...visitedRoutes],
      queuedRoutes: [...routeQueue],
      downloadedMedia: [...downloadedMedia],
    },
    { spaces: 2 }
  );

  console.log("STATE SAVED");
}

/*
========================================================
HELPERS
========================================================
*/

function normalize(url) {
  try {
    const u = new URL(url);

    u.hash = "";

    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isInternal(url) {
  try {
    return (
      new URL(url).hostname ===
      new URL(CONFIG.START_URL).hostname
    );
  } catch {
    return false;
  }
}

function isMedia(url) {
  return MEDIA_REGEX.test(url);
}

function safePath(url) {
  const parsed = new URL(url);

  let pathname = decodeURIComponent(
    parsed.pathname
  );

  if (pathname.endsWith("/")) {
    pathname += "index";
  }

  return pathname;
}

/*
========================================================
QUEUE ROUTE
========================================================
*/

async function queueRoute(url) {
  const clean = normalize(url);

  if (!clean) return;

  if (!isInternal(clean)) return;

  if (visitedRoutes.has(clean)) return;

  if (queuedRoutes.has(clean)) return;

  queuedRoutes.add(clean);

  routeQueue.push(clean);

  console.log("QUEUED:", clean);
}

/*
========================================================
DOWNLOAD MEDIA
========================================================
*/

async function downloadFile(url) {
  return limit(async () => {
    try {
      url = normalize(url);

      if (!url) return;

      if (downloadedMedia.has(url)) return;

      downloadedMedia.add(url);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 30000,
      });

      let filePath = safePath(url);

      let ext = path.extname(filePath);

      if (!ext) {
        const mimeType =
          response.headers["content-type"];

        const detected =
          mime.extension(mimeType);

        if (detected) {
          filePath += "." + detected;
        }
      }

      filePath = path.join(
        CONFIG.OUTPUT_DIR,
        "media",
        filePath
      );

      await fs.ensureDir(
        path.dirname(filePath)
      );

      const writer =
        fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);

        writer.on("error", reject);
      });

      console.log("DOWNLOADED:", url);
    } catch {
      console.log(
        "DOWNLOAD FAILED:",
        url
      );
    }
  });
}

/*
========================================================
EXTRACT URLS FROM JSON
========================================================
*/

function extractUrls(
  obj,
  found = new Set()
) {
  if (!obj) return found;

  if (typeof obj === "string") {
    const matches =
      obj.match(
        /(https?:\/\/[^\s"'<>]+|\/uploads\/[^\s"'<>]+)/g
      ) || [];

    matches.forEach(v => found.add(v));
  }

  else if (Array.isArray(obj)) {
    obj.forEach(v =>
      extractUrls(v, found)
    );
  }

  else if (typeof obj === "object") {
    Object.values(obj).forEach(v =>
      extractUrls(v, found)
    );
  }

  return found;
}

/*
========================================================
SMART ROUTE INFERENCE
========================================================
ONLY GENERATES ROUTES FOR CURRENT API
========================================================
*/

function inferRoutes(
  obj,
  basePath,
  found = new Set()
) {
  if (!obj) return found;

  /*
  ARRAYS
  */

  if (Array.isArray(obj)) {
    obj.forEach(v =>
      inferRoutes(
        v,
        basePath,
        found
      )
    );

    return found;
  }

  /*
  OBJECTS
  */

  if (typeof obj === "object") {
    const id =
      obj.id ||
      obj._id;

    const slug =
      obj.slug;

    /*
    ID ROUTE
    */

    if (id) {
      found.add(
        `${basePath}/${id}`
      );
    }

    /*
    SLUG ROUTE
    */

    if (slug) {
      found.add(
        `${basePath}/${slug}`
      );
    }

    /*
    RECURSE
    */

    Object.values(obj).forEach(v =>
      inferRoutes(
        v,
        basePath,
        found
      )
    );
  }

  return found;
}

/*
========================================================
AUTO SCROLL
========================================================
*/

async function autoScroll(page) {
  for (
    let i = 0;
    i < CONFIG.MAX_SCROLLS;
    i++
  ) {
    const oldHeight =
      await page.evaluate(
        () => document.body.scrollHeight
      );

    await page.evaluate(() => {
      window.scrollTo(
        0,
        document.body.scrollHeight
      );
    });

    await new Promise(r =>
      setTimeout(r, CONFIG.SCROLL_DELAY)
    );

    const newHeight =
      await page.evaluate(
        () => document.body.scrollHeight
      );

    if (newHeight === oldHeight) {
      break;
    }
  }
}

/*
========================================================
MAIN
========================================================
*/

(async () => {
  await loadState();

  /*
  SEED ROUTES
  */

  if (routeQueue.length === 0) {
    for (const route of API_ROUTES) {
      await queueRoute(
        CONFIG.START_URL + route
      );
    }

    await queueRoute(CONFIG.START_URL);

    await queueRoute(
      CONFIG.START_URL +
        "/sitemap.xml"
    );

    await queueRoute(
      CONFIG.START_URL +
        "/robots.txt"
    );
  }

  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const page = await browser.newPage();

  /*
  ========================================================
  RESPONSE INTERCEPTION
  ========================================================
  */

  page.on(
    "response",
    async response => {
      try {
        const url = response.url();

        const headers =
          response.headers();

        const contentType =
          headers["content-type"] || "";

        /*
        MEDIA
        */

        if (
          isMedia(url) ||
          contentType.startsWith(
            "image/"
          ) ||
          contentType.startsWith(
            "video/"
          ) ||
          contentType.startsWith(
            "audio/"
          )
        ) {
          await downloadFile(url);
        }

        /*
        JSON APIs
        */

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          let json;

          try {
            json =
              await response.json();
          } catch {
            return;
          }

          /*
          SAVE JSON
          */

          const apiPath = new URL(url)
            .pathname.replace(/[\/\\]/g, "_");

          await fs.ensureDir(
            path.join(
              CONFIG.OUTPUT_DIR,
              "json"
            )
          );

          await fs.writeJson(
            path.join(
              CONFIG.OUTPUT_DIR,
              "json",
              apiPath + ".json"
            ),
            json,
            { spaces: 2 }
          );

          /*
          EXTRACT URLS
          */

          const urls = [
            ...extractUrls(json),
          ];

          for (let found of urls) {
            if (
              found.startsWith("/")
            ) {
              found =
                CONFIG.START_URL +
                found;
            }

            const clean =
              normalize(found);

            if (!clean) continue;

            if (isMedia(clean)) {
              await downloadFile(
                clean
              );
            }

            else if (
              isInternal(clean)
            ) {
              await queueRoute(
                clean
              );
            }
          }

          /*
          SMART ROUTE INFERENCE
          */

          const currentPath =
            new URL(url).pathname;

          const inferred = [
            ...inferRoutes(
              json,
              currentPath
            ),
          ];

          for (const route of inferred) {
            await queueRoute(
              CONFIG.START_URL +
                route
            );
          }
        }

        /*
        JS BUNDLES
        */

        if (
          contentType.includes(
            "javascript"
          )
        ) {
          const text =
            await response.text();

          const matches =
            text.match(
              /\/[a-zA-Z0-9_\-/:[\]]+/g
            ) || [];

          matches.forEach(route => {
            if (
              route.includes(":") ||
              route.includes("[")
            ) {
              console.log(
                "ROUTE PATTERN:",
                route
              );
            }
          });
        }
      } catch {}
    }
  );

  /*
  ========================================================
  MAIN LOOP
  ========================================================
  */

  while (
    routeQueue.length > 0 &&
    visitedRoutes.size <
      CONFIG.MAX_PAGES
  ) {
    const current =
      routeQueue.shift();

    if (!current) continue;

    if (
      visitedRoutes.has(current)
    ) {
      continue;
    }

    visitedRoutes.add(current);

    console.log(
      "\n=================================="
    );

    console.log(
      "VISITING:",
      current
    );

    console.log(
      "VISITED:",
      visitedRoutes.size
    );

    console.log(
      "QUEUE:",
      routeQueue.length
    );

    console.log(
      "==================================\n"
    );

    try {
      await page.goto(current, {
        waitUntil: "networkidle2",

        timeout:
          CONFIG.PAGE_TIMEOUT,
      });

      await autoScroll(page);

      /*
      DOM EXTRACTION
      */

      const links =
        await page.evaluate(() => {
          const found =
            new Set();

          document
            .querySelectorAll(
              "a[href]"
            )
            .forEach(a =>
              found.add(a.href)
            );

          document
            .querySelectorAll("img")
            .forEach(img => {
              if (img.src)
                found.add(img.src);
            });

          document
            .querySelectorAll(
              "video"
            )
            .forEach(v => {
              if (v.src)
                found.add(v.src);
            });

          document
            .querySelectorAll(
              "source"
            )
            .forEach(v => {
              if (v.src)
                found.add(v.src);
            });

          document
            .querySelectorAll(
              "script"
            )
            .forEach(s => {
              if (s.src)
                found.add(s.src);
            });

          return [...found];
        });

      for (let link of links) {
        if (
          link.startsWith("/")
        ) {
          link =
            CONFIG.START_URL +
            link;
        }

        const clean =
          normalize(link);

        if (!clean) continue;

        if (isMedia(clean)) {
          downloadFile(clean);
        }

        else if (
          isInternal(clean)
        ) {
          await queueRoute(
            clean
          );
        }
      }

      /*
      SAVE HTML
      */

      const html =
        await page.content();

      const htmlPath =
        path.join(
          CONFIG.OUTPUT_DIR,
          "pages",
          safePath(current) +
            ".html"
        );

      await fs.ensureDir(
        path.dirname(htmlPath)
      );

      await fs.writeFile(
        htmlPath,
        html
      );

      /*
      PERIODIC SAVE
      */

      if (
        visitedRoutes.size %
          10 ===
        0
      ) {
        await saveState();
      }
    } catch {
      console.log(
        "FAILED:",
        current
      );
    }
  }

  await saveState();

  await browser.close();

  console.log("\nDONE");
})();