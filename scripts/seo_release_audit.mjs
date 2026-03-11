#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "index.html");
const ROBOTS_FILE = path.join(ROOT, "robots.txt");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const NETLIFY_FILE = path.join(ROOT, "netlify.toml");
const LLMS_FILE = path.join(ROOT, "llms.txt");
const CANONICAL_URL = "https://abepianoroom.netlify.app/";
const KYOTO_SUPPORT_URL = "https://abepianoroom.netlify.app/kyoto-piano-school/";
const FAQ_URL = "https://abepianoroom.netlify.app/faq/";
const ADULT_SUPPORT_URL = "https://abepianoroom.netlify.app/kyoto-adult-piano/";
const SITEMAP_URL = `${CANONICAL_URL}sitemap.xml`;
const LLMS_URL = `${CANONICAL_URL}llms.txt`;
const META_ROBOTS_CONTENT = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const strictMode = process.argv.includes("--strict");

const checks = [];
const warnings = [];

function readUtf8(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`missing file: ${path.basename(filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addCheck(name, condition, detail) {
    checks.push({ name, ok: Boolean(condition), detail: String(detail || "") });
}

function addWarning(message) {
    warnings.push(String(message));
}

function extractJsonLd(source) {
    const match = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch (error) {
        throw new Error(`invalid JSON-LD: ${error.message}`);
    }
}

function extractGa4MeasurementId(source) {
    const headMatch = source.match(/window\.__GA4_MEASUREMENT_ID = "([^"]+)"/);
    if (headMatch) return String(headMatch[1] || "").trim();
    const headConstMatch = source.match(/const measurementId = "([^"]+)"/);
    if (headConstMatch) return String(headConstMatch[1] || "").trim();
    const legacyMatch = source.match(/const GA4_MEASUREMENT_ID = "([^"]+)"/);
    return legacyMatch ? String(legacyMatch[1] || "").trim() : "";
}

function auditSupportPage({ label, filePath, canonicalUrl, expectedPlacement, expectFaqLink = true }) {
    const relativePath = path.relative(ROOT, filePath);
    const exists = fs.existsSync(filePath);
    addCheck(`${label} exists`, exists, relativePath);
    if (!exists) return;

    const source = readUtf8(filePath);
    addCheck(`${label} meta robots`, new RegExp(`<meta name="robots" content="${escapeRegExp(META_ROBOTS_CONTENT)}">`).test(source), META_ROBOTS_CONTENT);
    addCheck(`${label} meta description`, /<meta name="description" content="[^"]+">/.test(source), "description exists");
    addCheck(`${label} canonical`, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonicalUrl)}">`).test(source), canonicalUrl);
    addCheck(`${label} og core`, /<meta property="og:title"/.test(source) && /<meta property="og:description"/.test(source) && /<meta property="og:image"/.test(source), "og:title/description/image");
    addCheck(`${label} og:url`, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonicalUrl)}">`).test(source), canonicalUrl);
    addCheck(`${label} og:site_name`, /<meta property="og:site_name" content="安部ピアノルーム">/.test(source), "安部ピアノルーム");
    addCheck(`${label} og:locale`, /<meta property="og:locale" content="ja_JP">/.test(source), "ja_JP");
    addCheck(`${label} og:image dimensions`, /<meta property="og:image:width" content="1200">/.test(source) && /<meta property="og:image:height" content="630">/.test(source) && /<meta property="og:image:type" content="image\/jpeg">/.test(source), "1200x630 image/jpeg");
    addCheck(`${label} og:image:alt`, /<meta property="og:image:alt" content="[^"]+">/.test(source), "image alt");
    addCheck(`${label} Twitter card`, /<meta name="twitter:card" content="summary_large_image">/.test(source), "summary_large_image");
    addCheck(`${label} twitter:url`, new RegExp(`<meta name="twitter:url" content="${escapeRegExp(canonicalUrl)}">`).test(source), canonicalUrl);
    addCheck(`${label} twitter:image:alt`, /<meta name="twitter:image:alt" content="[^"]+">/.test(source), "image alt");
    addCheck(`${label} fonts preconnect`, /<link rel="preconnect" href="https:\/\/fonts.googleapis.com">/.test(source) && /<link rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin>/.test(source), "google font origins");
    addCheck(`${label} head GA boot`, /window\.__GA4_MEASUREMENT_ID/.test(source) && /const measurementId = "G-QVNNE0X4VW"/.test(source), "GA4 head bootstrap");
    addCheck(`${label} WebPage JSON-LD`, /"@type"\s*:\s*"WebPage"/.test(source), "WebPage");
    addCheck(`${label} WebPage primary image`, /"primaryImageOfPage"\s*:/.test(source), "primaryImageOfPage");
    addCheck(`${label} WebPage publisher`, /"publisher"\s*:\s*\{\s*"@id"\s*:\s*"https:\/\/abepianoroom\.netlify\.app\/#organization"/.test(source), "publisher");
    addCheck(`${label} WebPage about`, /"about"\s*:\s*\{\s*"@id"\s*:\s*"https:\/\/abepianoroom\.netlify\.app\/#organization"/.test(source), "about");
    addCheck(`${label} Breadcrumb JSON-LD`, /"@type"\s*:\s*"BreadcrumbList"/.test(source), "BreadcrumbList");
    addCheck(`${label} main landmark`, /<main\b/.test(source), "main");
    if (expectFaqLink) {
        addCheck(`${label} FAQ link`, /href="\/faq\/"/.test(source), "/faq/");
    }
    addCheck(`${label} home link`, /href="\/"/.test(source), "/");
    addCheck(`${label} contact_click event`, /"contact_click"/.test(source), "contact_click");
    addCheck(`${label} contact link marker`, /data-contact-click="1"/.test(source), "data-contact-click");
    if (expectedPlacement) {
        addCheck(`${label} contact_click placement`, new RegExp(`placement:\\s*"${escapeRegExp(expectedPlacement)}"`).test(source), expectedPlacement);
    }
}

try {
    const indexSource = readUtf8(INDEX_FILE);
    const robotsSource = readUtf8(ROBOTS_FILE);
    const sitemapSource = readUtf8(SITEMAP_FILE);
    const netlifySource = readUtf8(NETLIFY_FILE);
    const llmsSource = readUtf8(LLMS_FILE);
    const jsonLd = extractJsonLd(indexSource);

    addCheck("meta robots", new RegExp(`<meta name="robots" content="${escapeRegExp(META_ROBOTS_CONTENT)}">`).test(indexSource), META_ROBOTS_CONTENT);
    addCheck("meta description", /<meta name="description" content="[^"]+">/.test(indexSource), "description exists");
    addCheck("canonical", new RegExp(`<link rel="canonical" href="${escapeRegExp(CANONICAL_URL)}">`).test(indexSource), CANONICAL_URL);
    addCheck("OG core", /<meta property="og:title"/.test(indexSource) && /<meta property="og:description"/.test(indexSource) && /<meta property="og:image"/.test(indexSource), "og:title/description/image");
    addCheck("OG image dimensions", /<meta property="og:image:width" content="1200">/.test(indexSource) && /<meta property="og:image:height" content="630">/.test(indexSource) && /<meta property="og:image:type" content="image\/jpeg">/.test(indexSource), "1200x630 image/jpeg");
    addCheck("Twitter card", /<meta name="twitter:card" content="summary_large_image">/.test(indexSource), "summary_large_image");
    addCheck("twitter:image:alt", /<meta name="twitter:image:alt" content="[^"]+">/.test(indexSource), "image alt");
    addCheck("fonts preconnect", /<link rel="preconnect" href="https:\/\/fonts.googleapis.com">/.test(indexSource) && /<link rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin>/.test(indexSource), "google font origins");
    addCheck("JSON-LD exists", Boolean(jsonLd), "MusicSchool schema");
    addCheck("main landmark", /<main\b/.test(indexSource), "main");
    addCheck("static room content", /<article id="section-1" class="stream-section fade-in active">/.test(indexSource) && /<article id="section-6" class="stream-section fade-in active">/.test(indexSource), "section-1..section-6");
    addCheck("static footer title", /<h2 id="business-hero-title" class="h-title">安部ピアノルーム<\/h2>/.test(indexSource), "footer title");

    if (jsonLd) {
        addCheck("JSON-LD @type", jsonLd["@type"] === "MusicSchool", `@type=${jsonLd["@type"] || ""}`);
        addCheck("JSON-LD @id", String(jsonLd["@id"] || "").trim().length > 0, "@id");
        addCheck("JSON-LD inLanguage", jsonLd.inLanguage === "ja-JP", `inLanguage=${jsonLd.inLanguage || ""}`);
        addCheck("JSON-LD logo", Boolean(jsonLd.logo), "logo");
        addCheck("JSON-LD availableLanguage", jsonLd.availableLanguage === "ja", `availableLanguage=${jsonLd.availableLanguage || ""}`);
        addCheck("JSON-LD potentialAction", Boolean(jsonLd.potentialAction && jsonLd.potentialAction.target), "potentialAction.target");
    }

    const gaId = extractGa4MeasurementId(indexSource);
    addCheck("GA4 bootstrap", Boolean(gaId) && /window\.__GA4_MEASUREMENT_ID/.test(indexSource), "window.__GA4_MEASUREMENT_ID");
    addCheck("analytics events", /contact_click/.test(indexSource) && /rhythmic_link_click/.test(indexSource) && /scroll_depth_/.test(indexSource), "required events");

    if (gaId) {
        const upperGaId = gaId.toUpperCase();
        const looksValid = /^G-[A-Z0-9]+$/.test(upperGaId);
        if (!looksValid || upperGaId === "G-XXXXXXXXXX") {
            const message = `GA4 measurement ID is placeholder (${upperGaId || "empty"})`;
            if (strictMode) {
                addCheck("GA4 ID configured", false, message);
            } else {
                addWarning(message);
            }
        } else {
            addCheck("GA4 ID configured", true, upperGaId);
        }
    }

    const verificationMatch = indexSource.match(/<meta name="google-site-verification" content="([^"]*)">/);
    addCheck("Search Console verification meta", Boolean(verificationMatch), "google-site-verification");
    if (verificationMatch) {
        const token = String(verificationMatch[1] || "").trim();
        if (!token || token === "REPLACE_WITH_SEARCH_CONSOLE_TOKEN") {
            const message = "google-site-verification token is placeholder";
            if (strictMode) {
                addCheck("Search Console token configured", false, message);
            } else {
                addWarning(message);
            }
        } else {
            addCheck("Search Console token configured", true, "configured");
        }
    }

    addCheck("robots allow", /User-agent:\s*\*\s*[\s\S]*Allow:\s*\//.test(robotsSource), "Allow: /");
    addCheck("robots OAI-SearchBot allow", /User-agent:\s*OAI-SearchBot\s*[\s\S]*Allow:\s*\//.test(robotsSource), "OAI-SearchBot allow");
    addCheck("robots GPTBot disallow", /User-agent:\s*GPTBot\s*[\s\S]*Disallow:\s*\//.test(robotsSource), "GPTBot disallow");
    addCheck("robots ClaudeBot disallow", /User-agent:\s*ClaudeBot\s*[\s\S]*Disallow:\s*\//.test(robotsSource), "ClaudeBot disallow");
    addCheck("robots Claude-SearchBot allow", /User-agent:\s*Claude-SearchBot\s*[\s\S]*Allow:\s*\//.test(robotsSource), "Claude-SearchBot allow");
    addCheck("robots Claude-User allow", /User-agent:\s*Claude-User\s*[\s\S]*Allow:\s*\//.test(robotsSource), "Claude-User allow");
    addCheck("robots Google-Extended disallow", /User-agent:\s*Google-Extended\s*[\s\S]*Disallow:\s*\//.test(robotsSource), "Google-Extended disallow");
    addCheck("robots sitemap", robotsSource.includes(SITEMAP_URL), SITEMAP_URL);

    [CANONICAL_URL, KYOTO_SUPPORT_URL, ADULT_SUPPORT_URL, FAQ_URL].forEach((url) => {
        addCheck(`sitemap loc (${url})`, sitemapSource.includes(`<loc>${url}</loc>`), url);
    });
    addCheck("sitemap lastmod", /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemapSource), "YYYY-MM-DD");

    addCheck("llms exists", fs.existsSync(LLMS_FILE), path.relative(ROOT, LLMS_FILE));
    addCheck("llms root URL", llmsSource.includes(CANONICAL_URL), CANONICAL_URL);
    addCheck("llms page list", llmsSource.includes(KYOTO_SUPPORT_URL) && llmsSource.includes(ADULT_SUPPORT_URL) && llmsSource.includes(FAQ_URL), "all page URLs");
    addCheck("llms contact URL", llmsSource.includes("https://forms.gle/7JeN5nX7z1ajVziV6"), "contact URL");
    addCheck("llms facts", llmsSource.includes("Facts:") && llmsSource.includes("Audience:") && llmsSource.includes("Address policy:"), "facts block");
    addCheck("llms related site", llmsSource.includes("https://kogumarr.netlify.app/"), "related site");

    addCheck("netlify headers", /\[\[headers\]\]/.test(netlifySource) && /for = "\/image\/\*"/.test(netlifySource), "header rules + image cache");
    addCheck("netlify llms header", /for = "\/llms\.txt"/.test(netlifySource) && /Content-Type = "text\/plain; charset=UTF-8"/.test(netlifySource), LLMS_URL);

    auditSupportPage({
        label: "kyoto support page",
        filePath: path.join(ROOT, "kyoto-piano-school", "index.html"),
        canonicalUrl: KYOTO_SUPPORT_URL,
        expectedPlacement: "kyoto_page"
    });
    auditSupportPage({
        label: "adult support page",
        filePath: path.join(ROOT, "kyoto-adult-piano", "index.html"),
        canonicalUrl: ADULT_SUPPORT_URL,
        expectedPlacement: "adult_kyoto_page"
    });
    auditSupportPage({
        label: "faq page",
        filePath: path.join(ROOT, "faq", "index.html"),
        canonicalUrl: FAQ_URL,
        expectedPlacement: "faq_page",
        expectFaqLink: false
    });
} catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
}

const failures = checks.filter((check) => !check.ok);
checks.forEach((check) => {
    const prefix = check.ok ? "PASS" : "FAIL";
    console.log(`${prefix}: ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
});

if (warnings.length > 0) {
    warnings.forEach((warning) => {
        console.warn(`WARN: ${warning}`);
    });
}

if (failures.length > 0) {
    console.error(`SEO audit failed with ${failures.length} issue(s).`);
    process.exit(1);
}

console.log("SEO audit passed.");
