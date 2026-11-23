import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => !['--draft', '--release'].includes(arg)) || (args.includes('--draft') && args.includes('--release'))) {
  throw new Error('Usage: node scripts/build.mjs [--draft | --release]');
}
const release = args.includes('--release');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const policy = JSON.parse(await readFile(path.join(root, 'content/orbinit-privacy.json'), 'utf8'));
const email = config.supportEmail;
if (typeof config.studioName !== 'string' || !config.studioName.trim()) throw new Error('studioName is required.');
if (typeof config.githubOwner !== 'string' || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(config.githubOwner)) throw new Error('githubOwner is invalid.');
const site = new URL(config.siteUrl);
if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash || site.username || site.password) {
  throw new Error('siteUrl must be an HTTPS hostname with no path, credentials, query, or fragment.');
}
if (email !== null && (typeof email !== 'string' || !/^[^\s<>"'@]+@[^\s<>"'@]+\.[^\s<>"'@]+$/.test(email))) {
  throw new Error('supportEmail must be null or a valid public contact address.');
}
if (release && !email) throw new Error('Release blocked: set supportEmail to an authorized public support address in site.config.json. Draft output is available without an email.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(policy.updated) || Number.isNaN(Date.parse(policy.updated))) throw new Error('Policy updated must be a valid YYYY-MM-DD date.');
if (!Array.isArray(policy.sections) || !policy.sections.length) throw new Error('The privacy policy needs sections.');
const ids = new Set();
for (const section of policy.sections) {
  if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id)) throw new Error('Policy section IDs must be unique lowercase slugs.');
  if (typeof section.title !== 'string' || !section.title.trim() || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.some(p => typeof p !== 'string' || !p.trim())) {
    throw new Error(`Invalid policy section: ${section.id}`);
  }
  ids.add(section.id);
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
function textWithLinks(value) {
  let result = '', cursor = 0;
  for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const url = match[0].replace(/[.,;:!?)]+$/, '');
    result += escape(value.slice(cursor, match.index));
    result += `<a href="${escape(url)}">${escape(url)}</a>`;
    cursor = match.index + url.length;
  }
  return result + escape(value.slice(cursor));
}
const studio = escape(config.studioName);
const mascot = '/assets/smurp-mascot.webp';
const studioIntro = `<header class="page-intro studio-intro"><div><h1>${studio}</h1><p class="lede">Games and support.</p></div><img src="${mascot}" width="384" height="384" alt=""></header>`;
const studioRoute = '/smurp-games/';
const base = `${studioRoute}orbinit/`;
const support = `${base}support/`;
const privacy = `${base}privacy-policy/`;
const updated = new Intl.DateTimeFormat('en-US', {dateStyle:'long', timeZone:'UTC'}).format(new Date(`${policy.updated}T00:00:00Z`));
const links = `<div class="nav-links"><a href="${base}">Orbinit</a><a href="${privacy}">Privacy policy</a><a href="${support}">Support</a></div>`;
const draftNotice = release ? '' : '<aside class="draft-notice" aria-label="Draft status"><p><strong>Draft preview.</strong> Review the policy and configure an authorized public support email before publishing. This build is marked noindex.</p></aside>';
const contact = email
  ? `<p>For game support or privacy requests, email:</p><a class="contact-link" href="mailto:${escape(email)}?subject=Orbinit%20support">${escape(email)}</a><p class="fine-print">Please include the app version, your iPhone model and iOS version, and a description of the issue. Do not send passwords or payment-card details.</p>`
  : '<p><strong>Support contact is not configured in this draft.</strong> An authorized public contact address must be added before release.</p>';
function page(route, title, description, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title ? `${escape(title)} · ${studio}` : studio}</title>
  <meta name="description" content="${escape(description)}">
${release ? '' : '  <meta name="robots" content="noindex, nofollow">\n'}  <link rel="canonical" href="${site.origin}${route}">
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/smurp-favicon.png">
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner"><a class="brand" href="${studioRoute}"><img src="${mascot}" width="36" height="36" alt="">${studio}</a><nav aria-label="Main navigation">${links}</nav></div></header>
  <main id="main">${draftNotice}${body}</main>
  <footer class="site-footer"><div class="footer-inner"><p class="fine-print">© ${policy.updated.slice(0,4)} ${studio}</p><nav aria-label="Footer navigation">${links}</nav></div></footer>
</body>
</html>
`;
}
const faq = [
  ['restore-purchases', 'How do I restore a purchase?', '<p>Open Orbinit → Settings → Restore purchases. Use the Apple Account that made the purchase. Allow the App Store time to connect, then try again if it is temporarily unavailable.</p>'],
  ['refunds', 'How do I request a refund?', '<p>Apple handles purchase refunds. Visit <a href="https://reportaproblem.apple.com/">reportaproblem.apple.com</a> and follow Apple’s refund process.</p>'],
  ['replay-sharing', 'How do I stop sharing Daily replays?', '<p>Open Settings and turn off <strong>Share Daily replays</strong>. This stops future sharing and clears replays waiting to upload. It does not remove runs that have already been shared. Contact support for help with a shared replay.</p>'],
  ['unavailable-ads', 'Why is an ad unavailable?', '<p>An ad may still be loading, there may be no ad available, or a connection or privacy-choice issue may prevent it from loading. Check your connection and try again later. If a privacy message is shown, review your choices. Contact support if the problem continues.</p>'],
  ['ad-free', 'What does Ad-Free remove?', '<p>Ad-Free removes gameplay banners and automatic interstitial ads. Optional rewarded ads remain available when you choose to watch one.</p>'],
  ['reset-progress', 'What happens when I reset local progress?', '<p>Reset local progress clears game progress on this device. Apple purchases remain restorable. Resetting progress does not remove previously shared replays or Apple purchase records.</p>'],
  ['tilt-controls', 'Can I play without motion permission?', '<p>Yes. Choose <strong>Joystick</strong> in Settings. Tilt controls use motion permission; the game falls back to joystick controls if motion access is unavailable.</p>'],
];
const policyBody = `<header class="page-intro"><p class="eyebrow"><a href="${base}">Orbinit</a></p><h1>Privacy policy</h1><p class="updated">Updated <time datetime="${escape(policy.updated)}">${escape(updated)}</time></p></header>
<nav class="contents" aria-label="Privacy policy sections"><h2>On this page</h2><ol>${policy.sections.map(s => `<li><a href="#${s.id}">${escape(s.title)}</a></li>`).join('')}</ol></nav>
${policy.sections.map(s => `<section class="policy-section" id="${s.id}"><h2>${escape(s.title)}</h2>${s.paragraphs.map(p => `<p>${textWithLinks(p)}</p>`).join('')}</section>`).join('\n')}
<aside class="contact-box" aria-label="Contact"><h2>Need help?</h2><p><a href="${support}">Visit Orbinit support</a> for help and privacy requests.</p></aside>`;
const pages = [
  ['/', null, `Games and support from ${config.studioName}.`, `${studioIntro}<ul class="link-list"><li><a href="${base}">Orbinit</a><p><a href="${privacy}">Privacy policy</a> · <a href="${support}">Support</a></p></li></ul>`],
  [studioRoute, null, `Games and support from ${config.studioName}.`, `${studioIntro}<ul class="link-list"><li><a href="${base}">Orbinit</a><p>A color-matching rolling puzzle game.</p></li></ul>`],
  [base, 'Orbinit', 'Privacy information and support for Orbinit.', `<header class="page-intro"><p class="eyebrow"><a href="${studioRoute}">${studio}</a></p><h1>Orbinit</h1><p class="lede">A color-matching rolling puzzle game.</p></header><ul class="link-list"><li><a href="${privacy}">Privacy policy</a><p>How game information, purchases, ads, and replay sharing work.</p></li><li><a href="${support}">Support</a><p>Help with purchases, controls, ads, and Daily replays.</p></li></ul>`],
  [privacy, 'Orbinit privacy policy', 'How Orbinit uses information for gameplay, purchases, advertising, and Daily replays.', policyBody],
  [support, 'Orbinit support', 'Get help with Orbinit purchases, controls, advertising, and Daily replay sharing.', `<header class="page-intro"><p class="eyebrow"><a href="${base}">Orbinit</a></p><h1>Support</h1><p class="lede">Help with the game and your privacy choices.</p></header><section class="contact-box" aria-labelledby="contact-heading"><h2 id="contact-heading">Contact support</h2>${contact}</section><h2>Common questions</h2>${faq.map(([id,title,body]) => `<section class="faq-section" id="${id}"><h3>${escape(title)}</h3>${body}</section>`).join('\n')}<p class="fine-print" style="margin-top:2rem">Read the <a href="${privacy}">privacy policy</a> for more about information used by Orbinit.</p>`],
];
for (const [route,title,description,body] of pages) {
  const directory = path.join(root, route.slice(1));
  await mkdir(directory, {recursive:true});
  await writeFile(path.join(directory, 'index.html'), page(route,title,description,body));
}
for (const [route] of pages.slice(1)) {
  const legacyRoute = route.replace(studioRoute, '/studio/');
  const directory = path.join(root, legacyRoute.slice(1));
  await mkdir(directory, {recursive:true});
  await writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page moved · ${studio}</title>
  <link rel="canonical" href="${site.origin}${route}">
  <meta http-equiv="refresh" content="0; url=${route}">
</head>
<body>
  <p>This page has moved. <a href="${route}">Continue to the new address</a>.</p>
</body>
</html>
`);
}
await writeFile(path.join(root, '.nojekyll'), '');
await writeFile(path.join(root, 'app-ads.txt'), 'google.com, pub-7613781603537491, DIRECT, f08c47fec0942fa0\n');
await writeFile(path.join(root, 'robots.txt'), release ? `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(([route]) => `<url><loc>${escape(site.origin + route)}</loc></url>`).join('')}</urlset>\n`);
console.log(`Built ${pages.length} HTML pages in ${release ? 'release' : 'draft'} mode. No dependencies or third-party assets are required.`);
