const DEFAULT_SITEMAP_URL = "https://cnctech.com.vn/vi/sitemap.xml";

function extractLocUrls(xml) {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi), (match) =>
    decodeXmlEntity(match[1].trim())
  );
}

function decodeXmlEntity(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchText(url, fetchOptions = {}) {
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Cannot fetch sitemap ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function collectPageUrlsFromSitemap(sitemapUrl, options = {}) {
  const { fetchOptions = {}, visitedSitemaps = new Set() } = options;

  if (visitedSitemaps.has(sitemapUrl)) {
    return [];
  }

  visitedSitemaps.add(sitemapUrl);

  const sitemapXml = await fetchText(sitemapUrl, fetchOptions);
  const urls = extractLocUrls(sitemapXml);
  const isSitemapIndex = /<sitemapindex[\s>]/i.test(sitemapXml);

  if (!isSitemapIndex) {
    return urls;
  }

  const nestedUrls = await runWithConcurrency(urls, 4, (childSitemapUrl) =>
    collectPageUrlsFromSitemap(childSitemapUrl, {
      fetchOptions,
      visitedSitemaps,
    })
  );

  return nestedUrls.flat();
}

async function getPageStatus(url, fetchOptions = {}) {
  try {
    const headResponse = await fetch(url, {
      ...fetchOptions,
      method: "HEAD",
      redirect: "follow",
    });

    if (![403, 405, 501].includes(headResponse.status)) {
      return headResponse.status;
    }
  } catch {
    // Some servers/CDNs block HEAD. Try GET below before marking it as failed.
  }

  const getResponse = await fetch(url, {
    ...fetchOptions,
    method: "GET",
    redirect: "follow",
  });

  return getResponse.status;
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runNext()
  );

  await Promise.all(workers);
  return results;
}

async function find404PagesFromSitemap(sitemapUrl = DEFAULT_SITEMAP_URL, options = {}) {
  const { concurrency = 8, fetchOptions = {} } = options;
  const urls = await collectPageUrlsFromSitemap(sitemapUrl, { fetchOptions });

  const checks = await runWithConcurrency(urls, concurrency, async (url) => {
    try {
      const status = await getPageStatus(url, fetchOptions);
      return { url, status };
    } catch (error) {
      return {
        url,
        status: "request_failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return checks.filter((item) => item.status === 404);
}

async function main() {
  const sitemapUrl = process.argv[2] || DEFAULT_SITEMAP_URL;
  const brokenPages = await find404PagesFromSitemap(sitemapUrl);

  console.log(JSON.stringify(brokenPages, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  collectPageUrlsFromSitemap,
  find404PagesFromSitemap,
};
