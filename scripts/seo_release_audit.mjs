#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "index.html");
const ROBOTS_FILE = path.join(ROOT, "robots.txt");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const NETLIFY_FILE = path.join(ROOT, "netlify.toml");
const CANONICAL_URL = "https://abepianoroom.netlify.app/";
const KYOTO_SUPPORT_URL = "https://abepianoroom.netlify.app/kyoto-piano-school/";
const FAQ_URL = "https://abepianoroom.netlify.app/faq/";
const ADULT_SUPPORT_URL = "https://abepianoroom.netlify.app/kyoto-adult-piano/";
const SITEMAP_URL = `${CANONICAL_URL}sitemap.xml`;
const strictMode = process.argv.includes("--strict");

function readUtf8(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`missing file: ${path.basename(filePath)}`);
    }
    return fs.readFileSync(filePath, "utf8");
}

function extractJsonLd(indexSource) {
    const match = indexSource.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch (error) {
        throw new Error(`invalid JSON-LD: ${error.message}`);
    }
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function auditSupportPage({ label, filePath, canonicalUrl, expectedPlacement }) {
    const relativePath = path.relative(ROOT, filePath);
    const exists = fs.existsSync(filePath);
    addCheck(`${label} exists`, exists, relativePath);
    if (!exists) return;

    const source = readUtf8(filePath);
    addCheck(`${label} meta robots`, /<meta name="robots" content="index, follow">/.test(source), "index, follow");
    addCheck(`${label} meta description`, /<meta name="description" content="[^"]+">/.test(source), "description exists");
    addCheck(`${label} canonical`, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonicalUrl)}">`).test(source), canonicalUrl);
    addCheck(`${label} og core`, /<meta property="og:title"/.test(source) && /<meta property="og:description"/.test(source) && /<meta property="og:image"/.test(source), "og:title/description/image");
    addCheck(`${label} og:url`, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonicalUrl)}">`).test(source), canonicalUrl);
    addCheck(`${label} Twitter card`, /<meta name="twitter:card" content="summary_large_image">/.test(source), "summary_large_image");
    addCheck(`${label} fonts preconnect`, /<link rel="preconnect" href="https:\/\/fonts.googleapis.com">/.test(source) && /<link rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin>/.test(source), "google font origins");
    addCheck(`${label} WebPage JSON-LD`, /"@type"\s*:\s*"WebPage"/.test(source), "WebPage");
    addCheck(`${label} Breadcrumb JSON-LD`, /"@type"\s*:\s*"BreadcrumbList"/.test(source), "BreadcrumbList");
    addCheck(`${label} FAQ link`, /href="\/faq\/"/.test(source), "/faq/");
    addCheck(`${label} home link`, /href="\/"/.test(source), "/");
    if (expectedPlacement) {
        addCheck(`${label} generate_lead placement`, new RegExp(`placement:\\s*"${escapeRegExp(expectedPlacement)}"`).test(source), expectedPlacement);
    }
}

const checks = [];
const warnings = [];

function addCheck(name, condition, detail) {
    checks.push({ name, ok: Boolean(condition), detail: String(detail || "") });
}

function addWarning(message) {
    warnings.push(String(message));
}

try {
    const indexSource = readUtf8(INDEX_FILE);
    const robotsSource = readUtf8(ROBOTS_FILE);
    const sitemapSource = readUtf8(SITEMAP_FILE);
    const netlifySource = readUtf8(NETLIFY_FILE);
    const jsonLd = extractJsonLd(indexSource);

    addCheck("meta robots", /<meta name="robots" content="index, follow">/.test(indexSource), "index, follow");
    addCheck("meta description", /<meta name="description" content="[^"]+">/.test(indexSource), "description exists");
    addCheck("canonical", new RegExp(`<link rel="canonical" href="${escapeRegExp(CANONICAL_URL)}">`).test(indexSource), CANONICAL_URL);
    addCheck("OG core", /<meta property="og:title"/.test(indexSource) && /<meta property="og:description"/.test(indexSource) && /<meta property="og:image"/.test(indexSource), "og:title/description/image");
    addCheck("Twitter card", /<meta name="twitter:card" content="summary_large_image">/.test(indexSource), "summary_large_image");
    addCheck("fonts preconnect", /<link rel="preconnect" href="https:\/\/fonts.googleapis.com">/.test(indexSource) && /<link rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin>/.test(indexSource), "google font origins");
    addCheck("JSON-LD exists", Boolean(jsonLd), "MusicSchool schema");

    if (jsonLd) {
        addCheck("JSON-LD @type", jsonLd["@type"] === "MusicSchool", `@type=${jsonLd["@type"] || ""}`);
        addCheck("JSON-LD @id", String(jsonLd["@id"] || "").trim().length > 0, "@id");
        addCheck("JSON-LD inLanguage", jsonLd.inLanguage === "ja-JP", `inLanguage=${jsonLd.inLanguage || ""}`);
        addCheck("JSON-LD potentialAction", Boolean(jsonLd.potentialAction && jsonLd.potentialAction.target), "potentialAction.target");
    }

    const gaMatch = indexSource.match(/const GA4_MEASUREMENT_ID = "([^"]+)"/);
    addCheck("GA4 constant", Boolean(gaMatch), "GA4_MEASUREMENT_ID");
    addCheck("analytics events", /contact_click/.test(indexSource) && /rhythmic_link_click/.test(indexSource) && /scroll_depth_/.test(indexSource), "required events");

    if (gaMatch) {
        const gaId = String(gaMatch[1] || "").trim().toUpperCase();
        const looksValid = /^G-[A-Z0-9]+$/.test(gaId);
        if (!looksValid || gaId === "G-XXXXXXXXXX") {
            const message = `GA4_MEASUREMENT_ID is placeholder (${gaId || "empty"})`;
            if (strictMode) {
                addCheck("GA4 ID configured", false, message);
            } else {
                addWarning(message);
            }
        } else {
            addCheck("GA4 ID configured", true, gaId);
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
    addCheck("robots sitemap", robotsSource.includes(SITEMAP_URL), SITEMAP_URL);

    [CANONICAL_URL, KYOTO_SUPPORT_URL, ADULT_SUPPORT_URL, FAQ_URL].forEach((url) => {
        addCheck(`sitemap loc (${url})`, sitemapSource.includes(`<loc>${url}</loc>`), url);
    });
    addCheck("sitemap lastmod", /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemapSource), "YYYY-MM-DD");

    addCheck("netlify headers", /\[\[headers\]\]/.test(netlifySource) && /for = "\/image\/\*"/.test(netlifySource), "header rules + image cache");
    auditSupportPage({
        label: "adult support page",
        filePath: path.join(ROOT, "kyoto-adult-piano", "index.html"),
        canonicalUrl: ADULT_SUPPORT_URL,
        expectedPlacement: "adult_kyoto_page"
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
