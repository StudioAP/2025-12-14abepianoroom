#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const INDEX_FILE = "index.html";
const MASTER_FILE = "content_master_v1.md";
const START_MARKER = "<!-- CONTENT_MASTER_DATA_START -->";
const END_MARKER = "<!-- CONTENT_MASTER_DATA_END -->";

function normalizeText(value) {
    return String(value ?? "").normalize("NFC");
}

function readUtf8(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function findConstObjectLiteral(source, constName) {
    const pattern = new RegExp(`\\bconst\\s+${constName}\\s*=`);
    const match = pattern.exec(source);
    if (!match) {
        throw new Error(`const ${constName} が見つかりません`);
    }
    const openIndex = source.indexOf("{", match.index);
    if (openIndex === -1) {
        throw new Error(`const ${constName} のオブジェクト開始が見つかりません`);
    }
    return extractBalancedBlock(source, openIndex, "{", "}");
}

function findFunctionSource(source, functionName) {
    const signature = `function ${functionName}`;
    const start = source.indexOf(signature);
    if (start === -1) {
        throw new Error(`function ${functionName} が見つかりません`);
    }
    const openIndex = source.indexOf("{", start);
    if (openIndex === -1) {
        throw new Error(`function ${functionName} の本体開始が見つかりません`);
    }
    const block = extractBalancedBlock(source, openIndex, "{", "}");
    return source.slice(start, openIndex) + block;
}

function extractBalancedBlock(source, openIndex, openChar, closeChar) {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = openIndex; i < source.length; i += 1) {
        const ch = source[i];
        const next = source[i + 1] || "";

        if (inLineComment) {
            if (ch === "\n") inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (ch === "*" && next === "/") {
                inBlockComment = false;
                i += 1;
            }
            continue;
        }
        if (inSingle) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "'") inSingle = false;
            continue;
        }
        if (inDouble) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "\"") inDouble = false;
            continue;
        }
        if (inTemplate) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "`") inTemplate = false;
            continue;
        }

        if (ch === "/" && next === "/") {
            inLineComment = true;
            i += 1;
            continue;
        }
        if (ch === "/" && next === "*") {
            inBlockComment = true;
            i += 1;
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            continue;
        }
        if (ch === "\"") {
            inDouble = true;
            continue;
        }
        if (ch === "`") {
            inTemplate = true;
            continue;
        }

        if (ch === openChar) depth += 1;
        if (ch === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return source.slice(openIndex, i + 1);
            }
        }
    }
    throw new Error("対応する閉じ括弧が見つかりません");
}

function extractNativeRatioImageSet(indexSource) {
    const fnSource = findFunctionSource(indexSource, "shouldUseNativeRatioImage");
    const matches = [...fnSource.matchAll(/normalizeImagePath\((["'])(.*?)\1\)/g)];
    const set = new Set();
    matches.forEach((m) => {
        set.add(normalizeText(m[2]).trim());
    });
    return set;
}

function normalizeHero(hero) {
    const safeHero = hero || {};
    return {
        title: normalizeText(safeHero.title || ""),
        sub: normalizeText(safeHero.sub || ""),
        location: normalizeText(safeHero.location || ""),
        rotationImages: (safeHero.rotationImages || []).map((v) => normalizeText(v).trim()).filter(Boolean),
        mobileSplitTopFirstImage: normalizeText(safeHero.mobileSplitTopFirstImage || "").trim(),
        mobileSplitBottomImage: normalizeText(safeHero.mobileSplitBottomImage || "").trim()
    };
}

function normalizeTextBlockLines(lines) {
    return (lines || []).map((line) => normalizeText(line));
}

function normalizeQuoteAsTextBlock(block) {
    const lines = [];
    const quoteText = normalizeText(block && block.text ? block.text : "");
    quoteText.split("\n").forEach((line) => {
        lines.push(normalizeText(line));
    });
    const author = normalizeText(block && block.author ? block.author : "");
    if (author) lines.push(author);
    return {
        type: "text",
        lines
    };
}

function normalizeGalleryImage(rawImage, nativeRatioSet) {
    let src = "";
    let caption = "";
    if (typeof rawImage === "string") {
        src = normalizeText(rawImage).trim();
    } else if (rawImage && typeof rawImage === "object") {
        src = normalizeText(rawImage.src || "").trim();
        caption = normalizeText(rawImage.caption || "").trim();
    }
    if (!src) return null;
    return {
        src,
        caption,
        displayRule: nativeRatioSet.has(src) ? "native_ratio" : "cover_4_3"
    };
}

function normalizeSection(section, nativeRatioSet) {
    const blocks = (section && section.blocks) || [];
    const normalizedBlocks = [];

    blocks.forEach((block) => {
        if (!block || typeof block !== "object") return;
        if (block.type === "text") {
            normalizedBlocks.push({
                type: "text",
                lines: normalizeTextBlockLines(block.lines || [])
            });
            return;
        }
        if (block.type === "quote") {
            normalizedBlocks.push(normalizeQuoteAsTextBlock(block));
            return;
        }
        if (block.type === "gallery") {
            const images = (block.images || [])
                .map((img) => normalizeGalleryImage(img, nativeRatioSet))
                .filter(Boolean);
            normalizedBlocks.push({
                type: "gallery",
                images
            });
        }
    });

    return {
        title: normalizeText(section && section.title ? section.title : ""),
        subtitle: normalizeText(section && section.subtitle ? section.subtitle : ""),
        textFlow: normalizeText(section && section.textFlow ? section.textFlow : "natural"),
        blocks: normalizedBlocks
    };
}

function extractIndexData(indexSource) {
    const configLiteral = findConstObjectLiteral(indexSource, "config");
    const config = vm.runInNewContext(`(${configLiteral})`, {}, { timeout: 1000 });
    if (!config || typeof config !== "object") {
        throw new Error("index.html から config を読み取れませんでした");
    }
    const nativeRatioSet = extractNativeRatioImageSet(indexSource);
    const sections = (config.sections || []).map((section) => normalizeSection(section, nativeRatioSet));
    return {
        schemaVersion: 1,
        hero: normalizeHero(config.hero || {}),
        sections
    };
}

function extractMasterJson(masterSource) {
    const start = masterSource.indexOf(START_MARKER);
    const end = masterSource.indexOf(END_MARKER);
    if (start === -1 || end === -1 || end <= start) {
        throw new Error(`${MASTER_FILE} に JSON ブロックマーカーがありません`);
    }
    const between = masterSource.slice(start + START_MARKER.length, end);
    const openBrace = between.indexOf("{");
    const closeBrace = between.lastIndexOf("}");
    if (openBrace === -1 || closeBrace === -1 || closeBrace <= openBrace) {
        throw new Error(`${MASTER_FILE} の JSON ブロックを解析できません`);
    }
    const jsonText = between.slice(openBrace, closeBrace + 1);
    return JSON.parse(jsonText);
}

function toComparableMasterData(masterData) {
    const safe = masterData || {};
    const hero = safe.hero || {};
    const sections = (safe.sections || []).map((section) => {
        const blocks = (section.blocks || []).map((block) => {
            if (block.type === "text") {
                return {
                    type: "text",
                    lines: normalizeTextBlockLines(block.lines || [])
                };
            }
            if (block.type === "gallery") {
                return {
                    type: "gallery",
                    images: (block.images || []).map((img) => ({
                        src: normalizeText(img && img.src ? img.src : "").trim(),
                        caption: normalizeText(img && img.caption ? img.caption : "").trim(),
                        displayRule: normalizeText(img && img.displayRule ? img.displayRule : "")
                    }))
                };
            }
            return block;
        });
        return {
            title: normalizeText(section && section.title ? section.title : ""),
            subtitle: normalizeText(section && section.subtitle ? section.subtitle : ""),
            textFlow: normalizeText(section && section.textFlow ? section.textFlow : "natural"),
            blocks
        };
    });
    return {
        schemaVersion: Number(safe.schemaVersion || 1),
        hero: {
            title: normalizeText(hero.title || ""),
            sub: normalizeText(hero.sub || ""),
            location: normalizeText(hero.location || ""),
            rotationImages: (hero.rotationImages || []).map((v) => normalizeText(v).trim()).filter(Boolean),
            mobileSplitTopFirstImage: normalizeText(hero.mobileSplitTopFirstImage || "").trim(),
            mobileSplitBottomImage: normalizeText(hero.mobileSplitBottomImage || "").trim()
        },
        sections
    };
}

function deepDiff(currentValue, masterValue, currentPath = "") {
    const issues = [];
    const pathLabel = currentPath || "root";
    const typeA = Array.isArray(currentValue) ? "array" : typeof currentValue;
    const typeB = Array.isArray(masterValue) ? "array" : typeof masterValue;

    if (typeA !== typeB) {
        issues.push(`${pathLabel}: 型が不一致 (${typeA} !== ${typeB})`);
        return issues;
    }

    if (typeA === "array") {
        if (currentValue.length !== masterValue.length) {
            issues.push(`${pathLabel}: 配列長が不一致 (${currentValue.length} !== ${masterValue.length})`);
        }
        const max = Math.max(currentValue.length, masterValue.length);
        for (let i = 0; i < max; i += 1) {
            if (i >= currentValue.length) {
                issues.push(`${pathLabel}[${i}]: index.html 側に要素なし`);
                continue;
            }
            if (i >= masterValue.length) {
                issues.push(`${pathLabel}[${i}]: content_master 側に要素なし`);
                continue;
            }
            issues.push(...deepDiff(currentValue[i], masterValue[i], `${pathLabel}[${i}]`));
        }
        return issues;
    }

    if (typeA === "object" && currentValue !== null && masterValue !== null) {
        const keysA = Object.keys(currentValue).sort();
        const keysB = Object.keys(masterValue).sort();
        const keySet = new Set([...keysA, ...keysB]);
        [...keySet].sort().forEach((key) => {
            const hasA = Object.prototype.hasOwnProperty.call(currentValue, key);
            const hasB = Object.prototype.hasOwnProperty.call(masterValue, key);
            if (!hasA) {
                issues.push(`${pathLabel}.${key}: index.html 側にキーなし`);
                return;
            }
            if (!hasB) {
                issues.push(`${pathLabel}.${key}: content_master 側にキーなし`);
                return;
            }
            issues.push(...deepDiff(currentValue[key], masterValue[key], `${pathLabel}.${key}`));
        });
        return issues;
    }

    if (currentValue !== masterValue) {
        issues.push(`${pathLabel}: 値が不一致 (${JSON.stringify(currentValue)} !== ${JSON.stringify(masterValue)})`);
    }
    return issues;
}

function escapeMdCell(value) {
    return String(value || "").replace(/\|/g, "\\|");
}

function renderMasterMarkdown(data) {
    const lines = [];
    lines.push("# content_master_v1");
    lines.push("");
    lines.push("## 役割");
    lines.push("- 本文・写真仕様は本ファイルを正本とし、`index.html` 直編集のみで確定しない。");
    lines.push("- 編集順序: `content_master_v1.md` 更新 → `index.html` 反映 → `node scripts/check_content_master_consistency.mjs` 合格。");
    lines.push("- 差分チェックが `PASS` になるまで、公開反映しない。");
    lines.push("");
    lines.push("## ヒーロー仕様");
    lines.push(`- title: ${data.hero.title}`);
    lines.push(`- sub: ${data.hero.sub}`);
    lines.push(`- location: ${data.hero.location}`);
    lines.push(`- mobileSplitTopFirstImage: ${data.hero.mobileSplitTopFirstImage}`);
    lines.push(`- mobileSplitBottomImage: ${data.hero.mobileSplitBottomImage}`);
    lines.push("- rotationImages:");
    data.hero.rotationImages.forEach((src) => {
        lines.push(`  - ${src}`);
    });
    lines.push("");
    lines.push("## セクション本文・写真");
    data.sections.forEach((section, sectionIndex) => {
        lines.push(`### ${sectionIndex + 1}. ${section.title}`);
        if (section.subtitle) lines.push(`- subtitle: ${section.subtitle}`);
        lines.push(`- textFlow: ${section.textFlow}`);
        lines.push("");
        let textCount = 0;
        let galleryCount = 0;
        section.blocks.forEach((block) => {
            if (block.type === "text") {
                textCount += 1;
                lines.push(`#### Text ${textCount}`);
                lines.push("```text");
                (block.lines || []).forEach((line) => {
                    lines.push(String(line || ""));
                });
                lines.push("```");
                lines.push("");
                return;
            }
            if (block.type === "gallery") {
                galleryCount += 1;
                lines.push(`#### Gallery ${galleryCount}`);
                lines.push("| # | src | caption | displayRule |");
                lines.push("| --- | --- | --- | --- |");
                (block.images || []).forEach((img, idx) => {
                    lines.push(`| ${idx + 1} | ${escapeMdCell(img.src)} | ${escapeMdCell(img.caption || "")} | ${escapeMdCell(img.displayRule)} |`);
                });
                lines.push("");
            }
        });
    });
    lines.push("");
    lines.push(START_MARKER);
    lines.push("```json");
    lines.push(JSON.stringify(data, null, 2));
    lines.push("```");
    lines.push(END_MARKER);
    lines.push("");
    return lines.join("\n");
}

function main() {
    const rootDir = process.cwd();
    const indexPath = path.resolve(rootDir, INDEX_FILE);
    const masterPath = path.resolve(rootDir, MASTER_FILE);

    const indexSource = readUtf8(indexPath);
    const currentData = extractIndexData(indexSource);

    if (process.argv.includes("--emit-master")) {
        process.stdout.write(renderMasterMarkdown(currentData));
        return;
    }

    if (!fs.existsSync(masterPath)) {
        console.error(`FAIL: ${MASTER_FILE} がありません。`);
        console.error(`初回は \`node scripts/check_content_master_consistency.mjs --emit-master > ${MASTER_FILE}\` で生成してください。`);
        process.exit(1);
    }

    const masterSource = readUtf8(masterPath);
    const masterDataRaw = extractMasterJson(masterSource);
    const masterData = toComparableMasterData(masterDataRaw);
    const issues = deepDiff(currentData, masterData, "data");

    if (issues.length === 0) {
        console.log("PASS: content_master_v1.md と index.html は一致しています。");
        return;
    }

    console.error(`FAIL: ${issues.length} 件の差分を検出しました。`);
    issues.forEach((issue) => {
        console.error(`- ${issue}`);
    });
    process.exit(1);
}

main();
