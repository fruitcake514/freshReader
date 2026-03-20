# FreshReader

A mobile-optimised Progressive Web App (PWA) client for [FreshRSS](https://freshrss.org). Connects directly to your FreshRSS instance, reads your feeds in-app without opening external links, and works offline with cached articles.

---

## Requirements

- A self-hosted FreshRSS instance with **Google Reader API access enabled**
  - In FreshRSS: *Administration → Authentication → Allow API access*
- The app must be served over **HTTPS** — service workers and PWA install prompts require it
- A static web host (Cloudflare Pages, Nginx, Apache, Netlify, GitHub Pages, etc.)

---

## Installation

Upload the entire folder to your web server root (or a subdirectory). The structure must be kept intact:

```
index.html
manifest.json
sw.js
favicon.ico
icons/          ← all 15 PNG icon sizes
splash/         ← all 15 iOS launch screen images
```

Open the URL in your browser, enter your credentials, and tap **Add to Home Screen** to install it as a PWA.

---

## Logging In

On first launch you'll see the login screen. Enter:

- **FreshRSS URL** — the full URL of your FreshRSS instance, e.g. `https://rss.yourdomain.com`
- **Username** — your FreshRSS username
- **Password** — your FreshRSS password

Your password is never stored. The app exchanges it for a session token (Google Reader API auth token) which is saved in your browser's local storage. You stay logged in until you log out or reset the app.

---

## The Main Feed

After logging in you'll see the article list. At the top are three navigation bars:

### Category bar
A horizontal scrollable row of pill buttons — one for each category you have configured in FreshRSS, plus **All** at the left which shows every feed at once. Tap a category to filter to it. On mobile you can also **swipe up/down on the category bar** to cycle through categories, or use the **mouse scroll wheel** on desktop.

Special categories are detected by their name and open a different view:
- Categories containing **"youtube"** or **"yt"** → opens the [YouTube view](#youtube-view)
- Categories containing **"shorts"**, **"tiktok"**, or **"short"** → opens the [Shorts/TikTok view](#shorts--tiktok-view)

### Feed bar
When you tap a category that has more than one feed inside it, a second row appears below the category bar showing each individual feed as a button. Tap a feed to see only articles from that feed. Tap **All feeds** to go back to the full category. This bar is hidden when you're on **All** or in a category with only one feed.

### Filter bar
Three buttons — **All**, **Unread**, **Starred** — that filter the article list client-side. The **Mark all read** button on the right marks everything in the current view as read and syncs back to FreshRSS.

### Article cards
Each card shows:
- Feed name and time since published
- Title
- A short text snippet
- A thumbnail image (if the article has one)
- A gold **★** if you've starred it
- A red dot in the top-right if unread

Tap a card to open the article reader.

---

## The Article Reader

Opens the full article content inline — no external browser, no link opening. FreshRSS embeds all media (images, videos, iframes) directly in the article content and the reader renders it as-is.

**Supported embedded media:**
- YouTube videos — shown as a tap-to-play poster, plays inside the reader with full audio
- YouTube Shorts — same as above
- Reddit videos — plays natively with audio when FreshRSS has embedded the video stream
- Reddit images — displayed inline
- TikTok videos — plays natively when FreshRSS has embedded the video stream
- Twitch clips, VODs, and live streams

### Navigation
- **Swipe left** — next article
- **Swipe right** — previous article
- **Arrow buttons** (← →) visible on the left and right edges — tap to go to previous/next article
- **Keyboard** (desktop): arrow keys navigate, Escape closes the reader
- A counter in the top bar shows your position, e.g. `3 / 47`

### Reader action bar (bottom)
- **Mark read** — marks the current article as read in FreshRSS
- **Original** — opens the original article URL in your browser

### Star button (top bar, ☆/★)
Stars or unstars the article. Starred articles are **permanently cached** — they survive cache clears and auto-delete rules (see [Settings](#settings)). Unstarring an article removes it from the permanent cache.

---

## YouTube View

Activated automatically when you tap a category whose name contains "youtube" or "yt". Displays your YouTube feed articles as a dark video grid, similar to the YouTube app.

### Layout
- Full-width thumbnail cards on mobile, multi-column grid on wider screens
- Unread indicator (red dot) on the thumbnail
- Starred indicator (gold ★) on the thumbnail
- Channel initial, title, and relative date below each card

### Filters
All / Unread / Starred filter buttons work the same as the main feed.

### Search bar
At the top of the YouTube view there is a search bar with two behaviours:

- **Paste a YouTube URL** (e.g. `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`) — the video opens and plays directly inside the app's YouTube reader. Search results are not cached or saved to your article list.
- **Type a search query** — opens YouTube search in a new browser tab. No API key is required for either mode.

### YouTube reader
Tap any video card to open the YouTube reader:
- Thumbnail poster — tap to load and play the video inside the app
- Title, channel, and date
- Save (★) and Open (external link) action buttons
- Description text below

---

## Shorts / TikTok View

Activated automatically when you tap a category whose name contains "shorts", "tiktok", or "short". This view handles both YouTube Shorts (embedded as iframes by FreshRSS) and TikTok videos (embedded as native video elements by FreshRSS).

### Gallery
Opens as a **3-column thumbnail grid** (1 column on small screens). Each card shows the video thumbnail or poster frame, a play badge, and an unread indicator.

The same **category bar**, **feed sub-bar**, and **All / Unread / Starred** filters are available at the top.

### Fullscreen player
Tap any thumbnail to open the fullscreen vertical player:
- Videos fill the full screen height, centered with black bars if needed
- **Swipe up** — next video
- **Swipe down** — previous video
- **Scroll wheel** (desktop) — same as swipe
- Videos auto-play as you scroll to them and auto-pause as you scroll away
- Each video is marked as read as it comes into view
- The **★ Save** button on the right side stars/unstars the current video
- Tap **← back** in the top-left to return to the gallery

---

## Topbar Buttons

The main topbar (visible on all non-special screens) has four buttons:

### ↺ Refresh
Fetches the latest articles from your FreshRSS instance, updates unread counts, and re-renders the current view. Does not clear any cached data — it merges new articles in alongside what's already stored.

### ⚙ Settings
Opens the settings panel (described below).

### → Log out
Clears your saved session token and returns to the login screen. Your cached articles and starred items remain in storage — they'll be available again after you log back in.

---

## Settings

Tap the **⚙ gear icon** in the topbar to open the settings panel.

### Auto-delete cached articles
Controls how long articles stay in the local cache before being automatically pruned. Options: Never, 3 days, 7 days (default), 14 days, 30 days, 60 days.

Pruning runs each time new articles are saved to the cache. Articles older than the selected number of days (based on their published date) are removed from local storage.

**Starred articles are exempt from auto-delete.** They remain cached permanently regardless of this setting, until you unstar them.

### Clear article cache
Deletes all cached articles from local storage and immediately re-fetches from your FreshRSS server. Starred articles are preserved — they are backed up before the wipe and restored afterward.

Use this when you want a clean slate without losing your starred items, or if the cache has grown too large.

### Reset app
A full hard reset:
1. Deletes all service worker caches
2. Unregisters the service worker
3. Removes cached articles from local storage
4. Reloads the page

**This wipes everything including starred articles.** Use it only if the app is behaving incorrectly and normal cache clearing hasn't helped. After the reload the service worker re-installs fresh.

### Logged in as
Shows your username and FreshRSS server URL. The **Log out** button here does the same as the topbar logout button.

---

## Offline support

The service worker caches the app shell (icons, manifest) so the UI loads instantly even without a network connection. Article content is cached in `localStorage` as it's fetched — cached articles are available to read offline. The service worker does **not** cache HTML or API responses, so refreshing always fetches live data when online.

---

## Data & Privacy

- Your FreshRSS password is never stored anywhere. It is used once to obtain an API auth token, then discarded.
- The auth token is stored in `localStorage` in your browser. It is only accessible to JavaScript running on the exact domain you host the app on — no other site can read it.
- No analytics, no ads, no third-party tracking. The app communicates only with your own FreshRSS instance and YouTube's embed servers (for video playback).
- If you host this on a public URL, each visitor authenticates with their own FreshRSS credentials. Credentials are stored only in their own browser — you as the host never see them.

---

## Folder structure

```
freshrss-pwa/
├── index.html          ← entire app (single file)
├── manifest.json       ← PWA manifest
├── sw.js               ← service worker
├── favicon.ico         ← browser tab icon (16/32/48px)
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-120.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-167.png
│   ├── icon-180.png     ← primary Apple touch icon
│   ├── icon-192.png
│   ├── icon-256.png
│   ├── icon-512.png
│   └── icon-maskable-512.png  ← Android adaptive icon
└── splash/
    ├── splash-640x1136.png    ← iPhone SE
    ├── splash-750x1334.png    ← iPhone 6/7/8
    ├── splash-828x1792.png    ← iPhone XR/11
    ├── splash-1080x2340.png   ← iPhone 12/13/14 mini
    ├── splash-1125x2436.png   ← iPhone X/XS/11 Pro
    ├── splash-1170x2532.png   ← iPhone 12/13/14
    ├── splash-1179x2556.png   ← iPhone 14 Pro
    ├── splash-1242x2208.png   ← iPhone 6+/7+/8+
    ├── splash-1242x2688.png   ← iPhone XS Max/11 Pro Max
    ├── splash-1284x2778.png   ← iPhone 12/13/14 Pro Max
    ├── splash-1290x2796.png   ← iPhone 14 Pro Max / 15
    ├── splash-1536x2048.png   ← iPad 9.7"
    ├── splash-1668x2224.png   ← iPad Pro 10.5"
    ├── splash-1668x2388.png   ← iPad Pro 11"
    └── splash-2048x2732.png   ← iPad Pro 12.9"
```
