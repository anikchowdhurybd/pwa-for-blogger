// Cloudflare Worker Script

// Replace with the RAW URL of your sw.js file (e.g., from GitHub Raw or Gist Raw)
const SW_SOURCE_URL = 'https://raw.githubusercontent.com/anikchowdhurybd/pwa-for-blogger/refs/heads/main/sw.js';

// Replace with the RAW URL of your manifest.json file
const MANIFEST_SOURCE_URL = 'https://raw.githubusercontent.com/anikchowdhurybd/pwa-for-blogger/refs/heads/main/manifest.json';

addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/sw.js') {
    event.respondWith(fetchAndServe(SW_SOURCE_URL, 'application/javascript', true));
  } else if (url.pathname === '/manifest.json') {
    event.respondWith(fetchAndServe(MANIFEST_SOURCE_URL, 'application/manifest+json', false));
  } else {
    // For any other requests, let them pass through to your origin (Blogger)
    event.respondWith(fetch(event.request));
  }
});

async function fetchAndServe(sourceUrl, contentType, isServiceWorker) {
  try {
    // Fetch the asset from the source URL
    // It's good practice to cache this at the edge for a short period to reduce hits to GitHub/Gist
    // but ensure sw.js itself is not overly cached by the browser client.
    const response = await fetch(sourceUrl, { cf: { cacheTtl: isServiceWorker ? 0 : 3600 } }); // Cache manifest for 1hr, SW not at edge (browser handles updates)


    if (!response.ok) {
      return new Response(`Error fetching asset from source: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // Create a new response to modify headers
    let newHeaders = new Headers(response.headers);
    newHeaders.set('Content-Type', contentType);

    if (isServiceWorker) {
      // Service workers need specific caching headers for updates.
      // This tells the browser to always revalidate the SW script.
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Service-Worker-Allowed', '/'); // Important for scope
    } else {
      // For manifest.json, a moderate cache is fine
      newHeaders.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (error) {
    console.error(`Error in Cloudflare Worker fetching ${sourceUrl}: ${error.message}`);
    return new Response(`Worker Error: ${error.message}`, { status: 500 });
  }
}
