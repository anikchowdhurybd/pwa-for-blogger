# PWA-for-Blogger Setup Guide

## PWA Setup for Blogger with Custom Domain via Cloudflare

This guide explains how to configure your Blogger site (with a custom domain managed by Cloudflare) as a Progressive Web App (PWA). This method allows your service worker (`sw.js`) to be served from the same origin as your website, enabling full PWA capabilities.

---

### **Prerequisites**

- Your Blogger site is accessible via your custom domain (e.g., `schemamarkupgenerator.net`).
- Your custom domain's DNS is managed through Cloudflare.
- You have the content for your `manifest.json` and `sw.js` files ready.

---

## **Overview**

We will use a Cloudflare Worker to serve your `sw.js` file (and optionally your `manifest.json` file) directly from your custom domain.

---

## **Step 1: Prepare Your `manifest.json` and `sw.js` File Content**

### **A. `manifest.json` Example**

> **Customize the JSON below:**  
> - Update `name`, `short_name`, `description`, and the `src` URLs for your icons.  
> - Make sure icon URLs are absolute and publicly accessible.

```json
{
    "name": "Schema Markup Generator",
    "short_name": "SchemaGenerator",
    "description": "Tools for generating schema markup.",
    "start_url": "/?utm_source=pwa_homescreen",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#000000",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "ABSOLUTE_URL_TO_YOUR_192x192_ICON.png",
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any maskable"
        },
        {
            "src": "ABSOLUTE_URL_TO_YOUR_512x512_ICON.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "any maskable"
        }
    ]
}
```

---

### **B. `sw.js` (Service Worker) Example**

> **Action:**  
> - Create an "Offline" page in your Blogger site (e.g., `/p/offline.html`).  
> - Update `urlsToCache` with your actual offline page URL.

```js
// sw.js - Service Worker File Content
const CACHE_NAME = 'schemamarkupgenerator-cache-v1';
const urlsToCache = [
    '/',
    '/p/offline.html' // Replace with your actual offline page URL
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request)
                .catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('/p/offline.html');
                    }
                })
            )
    );
});
```

---

## **Step 2: Host `sw.js` and `manifest.json` Content**

**Option A (Recommended): GitHub Repository**

1. Create a new public or private GitHub repository (e.g., `my-pwa-assets`).
2. Add your `sw.js` and `manifest.json` files.
3. Get the raw file URLs:
     - `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/sw.js`
     - `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/manifest.json`

**Option B: GitHub Gist**

1. Go to [gist.github.com](https://gist.github.com).
2. Create a new Gist with `sw.js` and `manifest.json`.
3. Use the "Raw" button to get direct URLs.

---

## **Step 3: Create and Configure the Cloudflare Worker**

1. Log in to your Cloudflare Dashboard.
2. Select your domain.
3. Navigate to **Workers & Pages** > **Create application** > **Create Worker**.
4. Name your Worker (e.g., `pwa-handler`) and click **Deploy**.
5. Click **Edit code** and replace the default script with the following (update the URLs):

```js
// Cloudflare Worker Script

const SW_SOURCE_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/sw.js';
const MANIFEST_SOURCE_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/manifest.json';

addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname === '/sw.js') {
        event.respondWith(fetchAndServe(SW_SOURCE_URL, 'application/javascript', true));
    } else if (url.pathname === '/manifest.json') {
        event.respondWith(fetchAndServe(MANIFEST_SOURCE_URL, 'application/manifest+json', false));
    } else {
        event.respondWith(fetch(event.request));
    }
});

async function fetchAndServe(sourceUrl, contentType, isServiceWorker) {
    try {
        const response = await fetch(sourceUrl, { cf: { cacheTtl: isServiceWorker ? 0 : 3600 } });
        if (!response.ok) {
            return new Response(`Error fetching asset from source: ${response.status} ${response.statusText}`, { status: response.status });
        }
        let newHeaders = new Headers(response.headers);
        newHeaders.set('Content-Type', contentType);

        if (isServiceWorker) {
            newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            newHeaders.set('Service-Worker-Allowed', '/');
        } else {
            newHeaders.set('Cache-Control', 'public, max-age=3600');
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });

    } catch (error) {
        return new Response(`Worker Error: ${error.message}`, { status: 500 });
    }
}
```

6. Click **Save and Deploy**.

---

## **Step 4: Add Routes for Your Worker**

1. In Cloudflare dashboard, go to your Worker's overview page.
2. Go to the **Triggers** tab.
3. Under "Routes", add:
     - `schemamarkupgenerator.net/sw.js`
     - `schemamarkupgenerator.net/manifest.json`
4. (Optional) Add wildcard routes for apex/non-www domains if needed.

---

## **Step 5: Update Your Blogger Template**

### **A. Link the Manifest**

In your Blogger theme's `<head>` section, add:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000"/>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SchemaGen">
```

### **B. Register the Service Worker**

Just before the closing `</body>` tag, add:

```html
<script type='text/javascript'>
//<![CDATA[
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(function(registration) {
                console.log('PWA Service Worker: Registration successful for schemamarkupgenerator.net with scope: ', registration.scope);
            })
            .catch(function(err) {
                console.log('PWA Service Worker: Registration failed for schemamarkupgenerator.net: ', err);
            });
    });
} else {
    console.log('PWA Service Worker: Not supported in this browser for schemamarkupgenerator.net.');
}
//]]>
</script>
```

---

## **Step 6: Testing**

1. Wait a few minutes for Cloudflare Worker changes and routes to propagate.
2. Clear your browser cache and any existing service workers for your domain.
3. Open your website (`https://schemamarkupgenerator.net`).
4. **Check Developer Tools:**
     - **Console:** Look for service worker registration messages.
     - **Application > Manifest:** Verify `/manifest.json` is loaded correctly.
     - **Application > Service Workers:** Ensure `/sw.js` is listed, activated, and running.
     - **Application > Cache Storage:** Check if your cache exists and contains the correct files.
     - **Network Tab:** Load `/sw.js` and `/manifest.json` directly; check their headers.
5. **Lighthouse Audit:** Run a Lighthouse audit and check the PWA category.
6. **Test Offline Capability:**  
     In DevTools > Application > Service Workers, check "Offline" and try navigating your site. You should see cached pages or your offline page.

---

**This setup enables robust PWA functionality for Blogger with a custom domain and Cloudflare.**
