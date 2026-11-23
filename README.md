# Smurp Games website

A small static website for `devmilanian.github.io`. Every route is an actual HTML file; the website does not need JavaScript, a server-side application, third-party fonts, analytics, or paid dependencies.

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | Minimal website entry point |
| `/smurp-games/` | Studio entry point |
| `/smurp-games/orbinit/` | Orbinit links |
| `/smurp-games/orbinit/privacy-policy/` | Orbinit privacy policy |
| `/smurp-games/orbinit/support/` | Support contact and common questions |
| `/app-ads.txt` | AdMob publisher declaration at the hostname root |

The former `/studio/…` URLs redirect to the corresponding `/smurp-games/…` pages.

## Edit and build

Use Node.js 18 or later. No `npm install` is needed.

1. Edit `site.config.json` for the studio name, GitHub owner, hostname, and public support email. `supportEmail` is set to the user-authorized public contact, `mungoman775@gmail.com`. Keep this field current when the public contact changes.
2. Review and edit `content/orbinit-privacy.json`. Its initial content comes from the inspected app source; confirm the final deployed services, replay-retention and deletion behavior, and contact details before publishing.
3. Build a draft locally:

   ```sh
   node scripts/build.mjs --draft
   python3 -m http.server 8000
   ```

   Visit `http://localhost:8000/`. Draft pages show a visible draft notice and are marked `noindex`; `robots.txt` also disallows indexing. This is an indexing instruction, not access control. Do not publish the draft as the app’s official support or privacy website.

4. Once content and contact information are ready, build for release:

   ```sh
   node scripts/build.mjs --release
   ```

   The command refuses to build a release if the public support email is missing. It writes the HTML pages, `robots.txt`, `sitemap.xml`, `.nojekyll`, and root `app-ads.txt`.

5. Commit the source files and generated output together. Do not hand-edit generated `index.html` files because the next build replaces them.

The build script keeps HTML escaping enabled for policy text. Plain HTTPS links in paragraphs become clickable links. App FAQs are defined in `scripts/build.mjs`; visual styling lives in `assets/site.css`.

## Publish with GitHub Pages

1. Create the public user-site repository named **`devmilanian.github.io`** under **`DevMilanIan`**.
2. Push the reviewed release output and source files to its `main` branch, with `index.html` and `.nojekyll` at the repository root.
3. In the repository’s **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
4. After GitHub’s deployment finishes, verify these URLs:

   - `https://devmilanian.github.io/smurp-games/`
   - `https://devmilanian.github.io/smurp-games/orbinit/`
   - `https://devmilanian.github.io/smurp-games/orbinit/privacy-policy/`
   - `https://devmilanian.github.io/smurp-games/orbinit/support/`
   - `https://devmilanian.github.io/app-ads.txt`

5. Use the Orbinit page as the developer/marketing website, the privacy-policy page as the app’s Privacy Policy URL, and the support page as its Support URL. Confirm the publisher identifier in `app-ads.txt` against the AdMob account before relying on verification.

This repository does not include a publishing workflow. Publishing remains a separate action after reviewing the generated release.

## Move to a custom domain later

Keep the `/smurp-games/` and `/smurp-games/orbinit/…` paths unchanged. Update `siteUrl` to the new HTTPS hostname, configure the domain in GitHub Pages and DNS, then rebuild with `--release`. The generator updates canonical URLs and the sitemap. Keep `app-ads.txt` at the **hostname root**, not under the Orbinit directory. Update app, App Store, and AdMob website references to the new hostname when the new domain is live.

## Accessibility and external services

Pages use native landmarks, a skip link, visible keyboard focus, readable line lengths, system fonts, high-contrast text, and layouts that wrap on narrow screens. No external resources load automatically. Links to Apple, Google, and Firebase open their sites when selected. GitHub Pages handles normal hosting requests under GitHub’s policies; there is no site-owned analytics or contact-form backend here.
