#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const INDEX_FILE = "index.html";
const MASTER_FILE = "content_master_v1.md";
const HOME_TEXT_FILE = "content/home-text.json";
const START_MARKER = "<!-- CONTENT_MASTER_DATA_START -->";
const END_MARKER = "<!-- CONTENT_MASTER_DATA_END -->";

const EDITABLE_TEXT_BLOCKS = [
  { sectionIndex: 0, blockIndex: 0, sectionKey: "greeting", fieldKey: "main", label: "導入文" },
  { sectionIndex: 0, blockIndex: 1, sectionKey: "greeting", fieldKey: "availability", label: "募集状況" },
  { sectionIndex: 1, blockIndex: 0, sectionKey: "targetLocation", fieldKey: "main", label: "対象・場所" },
  { sectionIndex: 1, blockIndex: 1, sectionKey: "targetLocation", fieldKey: "adNote", label: "広告注記" },
  { sectionIndex: 2, blockIndex: 0, sectionKey: "pricing", fieldKey: "revisionNote", label: "改定注記" },
  { sectionIndex: 2, blockIndex: 1, sectionKey: "pricing", fieldKey: "availability", label: "募集状況" },
  { sectionIndex: 2, blockIndex: 4, sectionKey: "pricing", fieldKey: "supportVideo", label: "自宅練習サポート動画説明" },
  { sectionIndex: 3, blockIndex: 0, sectionKey: "adultMessage", fieldKey: "main", label: "大人向けへの想い" },
  { sectionIndex: 4, blockIndex: 0, sectionKey: "profile", fieldKey: "main", label: "教室概要・講師略歴" },
  { sectionIndex: 5, blockIndex: 0, sectionKey: "rhythmic", fieldKey: "main", label: "小さいお子様向け" }
];

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeUtf8(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMdCell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
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
        return {
          block: source.slice(openIndex, i + 1),
          endIndex: i + 1
        };
      }
    }
  }
  throw new Error("対応する閉じ括弧が見つかりません");
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
  const { block, endIndex } = extractBalancedBlock(source, openIndex, "{", "}");
  return { literal: block, startIndex: openIndex, endIndex };
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
  const { block } = extractBalancedBlock(source, openIndex, "{", "}");
  return source.slice(start, openIndex) + block;
}

function extractConfig(indexSource) {
  const { literal } = findConstObjectLiteral(indexSource, "config");
  return vm.runInNewContext(`(${literal})`, {}, { timeout: 1000 });
}

function extractNativeRatioImageSet(indexSource) {
  const fnSource = findFunctionSource(indexSource, "shouldUseNativeRatioImage");
  const matches = [...fnSource.matchAll(/normalizeImagePath\((["'])(.*?)\1\)/g)];
  return new Set(matches.map((match) => normalizeText(match[2]).trim()).filter(Boolean));
}

function linesToEditableText(lines) {
  return (lines || []).map((line) => normalizeText(line)).join("\n");
}

function editableTextToLines(value) {
  const normalized = normalizeText(value).replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function deriveHomeTextFromConfig(config) {
  const homeText = { schemaVersion: 1 };
  EDITABLE_TEXT_BLOCKS.forEach((field) => {
    const section = (config.sections || [])[field.sectionIndex];
    const block = section && (section.blocks || [])[field.blockIndex];
    if (!section || !block || block.type !== "text") {
      throw new Error(`編集対象が見つかりません: section ${field.sectionIndex}, block ${field.blockIndex}`);
    }
    if (!homeText[field.sectionKey]) homeText[field.sectionKey] = {};
    homeText[field.sectionKey][field.fieldKey] = linesToEditableText(block.lines || []);
  });
  return homeText;
}

function loadHomeText(rootDir) {
  const filePath = path.resolve(rootDir, HOME_TEXT_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${HOME_TEXT_FILE} がありません。先に node scripts/build_home_content.mjs --init-from-index を実行してください。`);
  }
  return JSON.parse(readUtf8(filePath));
}

function validateHomeText(homeText) {
  if (!homeText || typeof homeText !== "object") {
    throw new Error(`${HOME_TEXT_FILE} がオブジェクトではありません`);
  }
  if (Number(homeText.schemaVersion || 1) !== 1) {
    throw new Error(`${HOME_TEXT_FILE} の schemaVersion は 1 のみ対応です`);
  }
  EDITABLE_TEXT_BLOCKS.forEach((field) => {
    const section = homeText[field.sectionKey];
    if (!section || typeof section !== "object") {
      throw new Error(`${HOME_TEXT_FILE}: ${field.sectionKey} がありません`);
    }
    if (typeof section[field.fieldKey] !== "string") {
      throw new Error(`${HOME_TEXT_FILE}: ${field.sectionKey}.${field.fieldKey} は文字列である必要があります`);
    }
  });
}

function applyHomeTextToConfig(config, homeText) {
  validateHomeText(homeText);
  const nextConfig = structuredClone(config);
  EDITABLE_TEXT_BLOCKS.forEach((field) => {
    const section = nextConfig.sections[field.sectionIndex];
    const block = section && section.blocks[field.blockIndex];
    if (!section || !block || block.type !== "text") {
      throw new Error(`編集対象が見つかりません: section ${field.sectionIndex}, block ${field.blockIndex}`);
    }
    block.lines = editableTextToLines(homeText[field.sectionKey][field.fieldKey]);
  });
  return nextConfig;
}

function formatJsKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function formatJsValue(value, depth = 0) {
  const indent = " ".repeat(depth);
  const childIndent = " ".repeat(depth + 4);
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const primitiveOnly = value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
    if (primitiveOnly && value.join("").length < 72) {
      return `[${value.map((item) => formatJsValue(item, depth)).join(", ")}]`;
    }
    const items = value.map((item) => `${childIndent}${formatJsValue(item, depth + 4)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([key, item]) => `${childIndent}${formatJsKey(key)}: ${formatJsValue(item, depth + 4)}`);
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return "null";
}

function replaceConfig(indexSource, config) {
  const { startIndex, endIndex } = findConstObjectLiteral(indexSource, "config");
  return indexSource.slice(0, startIndex) + formatJsValue(config, 8) + indexSource.slice(endIndex);
}

function normalizeImagePath(imagePath) {
  return String(imagePath || "").trim().normalize("NFC");
}

function buildImagePathCandidates(imagePath) {
  const rawPath = String(imagePath || "").trim();
  if (!rawPath) return [];
  const candidates = [];
  const pushUnique = (value) => {
    if (!value || candidates.includes(value)) return;
    candidates.push(value);
  };
  pushUnique(rawPath.normalize("NFC"));
  pushUnique(rawPath.normalize("NFD"));
  return candidates;
}

function toSrc(imagePath) {
  const candidates = buildImagePathCandidates(imagePath);
  const preferredPath = candidates[0] || normalizeImagePath(imagePath);
  return encodeURI(preferredPath);
}

function toWebpPath(imagePath) {
  const normalizedPath = normalizeImagePath(imagePath);
  if (!/\.(jpe?g|png)$/i.test(normalizedPath)) return "";
  return normalizedPath.replace(/\.(jpe?g|png)$/i, ".webp");
}

function renderResponsiveImageTag(options = {}) {
  const className = String(options.className || "").trim();
  const imagePath = normalizeImagePath(options.imagePath || "");
  const altText = String(options.altText || "");
  const loading = String(options.loading || "lazy");
  const decoding = String(options.decoding || "async");
  if (!imagePath) return "";

  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
  const imgHtml = `<img${classAttr} src="${toSrc(imagePath)}" data-image-path="${escapeHtml(imagePath)}" alt="${escapeHtml(altText)}" loading="${escapeHtml(loading)}" decoding="${escapeHtml(decoding)}">`;
  const webpPath = toWebpPath(imagePath);
  if (!webpPath) return imgHtml;
  return `<picture><source srcset="${toSrc(webpPath)}" type="image/webp">${imgHtml}</picture>`;
}

function classifyHeadingLine(line) {
  const text = String(line || "").trim();
  if (!text) return "";
  if (/^[◉✴]/.test(text) || /^【[^】]+】/.test(text) || /^〈[^〉]+〉/.test(text)) {
    return "h3";
  }
  return "";
}

function normalizeHeadingText(line) {
  const text = String(line || "").trim();
  const mediumMatch = text.match(/^【([^】]+)】\s*(.*)$/);
  if (mediumMatch) {
    return [mediumMatch[1], mediumMatch[2]].filter(Boolean).join(" ").trim();
  }
  const smallMatch = text.match(/^〈([^〉]+)〉\s*(.*)$/);
  if (smallMatch) {
    return [smallMatch[1], smallMatch[2]].filter(Boolean).join(" ").trim();
  }
  return text.replace(/^[◉✴・]\s*/, "").trim();
}

function flushParagraphBuffer(paragraphBuffer, chunks) {
  if (paragraphBuffer.length === 0) return;
  chunks.push({ type: "p", lines: [...paragraphBuffer] });
  paragraphBuffer.length = 0;
}

function parseTextLines(lines, options = {}) {
  const chunks = [];
  const paragraphBuffer = [];
  const sectionTitle = String(options.sectionTitle || "").trim();
  const isCourseSection = sectionTitle === "コース・曜日・料金";
  const strongCourseHeadings = new Set([
    "グループレッスン（各クラス2〜3名）",
    "個人レッスン"
  ]);
  let expectCoursePairSubheading = false;
  (lines || []).forEach((line) => {
    const rawLine = String(line || "");
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraphBuffer(paragraphBuffer, chunks);
      expectCoursePairSubheading = false;
      return;
    }
    const headingType = classifyHeadingLine(trimmed);
    const normalizedHeading = headingType ? normalizeHeadingText(trimmed) : trimmed;
    if (isCourseSection && strongCourseHeadings.has(normalizedHeading)) {
      flushParagraphBuffer(paragraphBuffer, chunks);
      chunks.push({ type: "h3_strong", text: normalizedHeading });
      expectCoursePairSubheading = true;
      return;
    }
    if (isCourseSection && expectCoursePairSubheading && (normalizedHeading === "親子ペアでのご参加" || normalizedHeading === "親子ペアでの参加")) {
      flushParagraphBuffer(paragraphBuffer, chunks);
      const pairLabel = normalizedHeading.replace("ご参加", "参加");
      const lastChunk = chunks.length > 0 ? chunks[chunks.length - 1] : null;
      if (lastChunk && lastChunk.type === "h3_strong") {
        lastChunk.pairLabel = pairLabel;
      } else {
        chunks.push({ type: "h4_strong", text: pairLabel });
      }
      expectCoursePairSubheading = false;
      return;
    }
    expectCoursePairSubheading = false;
    if (headingType) {
      flushParagraphBuffer(paragraphBuffer, chunks);
      chunks.push({ type: headingType, text: normalizeHeadingText(trimmed) });
      return;
    }
    paragraphBuffer.push(trimmed);
  });
  flushParagraphBuffer(paragraphBuffer, chunks);
  return chunks;
}

function normalizeTextFlow(mode) {
  return String(mode || "").trim().toLowerCase() === "structured" ? "structured" : "natural";
}

function splitLineBySentence(line) {
  const text = String(line || "").trim();
  if (!text) return [];
  const closers = "」』）)］]】〉》”’\"'";
  const quotePairs = {
    "「": "」",
    "『": "』",
    "“": "”",
    "‘": "’",
    "\"": "\"",
    "'": "'"
  };
  const quoteClosers = new Set(Object.values(quotePairs));
  const segments = [];
  let buffer = "";
  const quoteStack = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    buffer += ch;

    if (quotePairs[ch]) {
      const closer = quotePairs[ch];
      const topCloser = quoteStack[quoteStack.length - 1];
      if (topCloser === closer && (ch === "\"" || ch === "'")) {
        quoteStack.pop();
      } else {
        quoteStack.push(closer);
      }
    } else if (quoteClosers.has(ch)) {
      if (quoteStack.length > 0) {
        const topCloser = quoteStack[quoteStack.length - 1];
        if (topCloser === ch) {
          quoteStack.pop();
        } else {
          const idx = quoteStack.lastIndexOf(ch);
          if (idx !== -1) quoteStack.splice(idx, 1);
        }
      }
    }

    if (ch !== "。") continue;
    if (quoteStack.length > 0) continue;
    while (i + 1 < text.length && closers.includes(text[i + 1])) {
      i += 1;
      buffer += text[i];
    }
    const sentence = buffer.trim();
    if (sentence) segments.push(sentence);
    buffer = "";
  }

  const rest = buffer.trim();
  if (rest) segments.push(rest);
  return segments;
}

function formatParagraphLines(lines, mode = "natural") {
  const KOGUMA_URL = "https://kogumarr.netlify.app/";
  const KOGUMA_LINK_HTML = `<a class="stream-inline-link" href="${escapeHtml(KOGUMA_URL)}" target="_blank" rel="noopener">こぐまリトミックルームを見る</a>`;
  const replaceKnownLinks = (htmlText) => {
    if (!htmlText) return "";
    const escapedUrl = escapeHtml(KOGUMA_URL);
    return htmlText.split(escapedUrl).join(KOGUMA_LINK_HTML);
  };
  const normalizedMode = normalizeTextFlow(mode);
  const rawLines = (lines || []).map((line) => String(line || "").trim());
  const preparedLines = rawLines.filter(Boolean);
  if (preparedLines.length === 0) return "";
  const hasKnownLinkLine = rawLines.some((line) => line === KOGUMA_URL);
  if (normalizedMode === "structured" || hasKnownLinkLine) {
    const sourceLines = hasKnownLinkLine ? rawLines : preparedLines;
    return replaceKnownLinks(sourceLines.map((line) => escapeHtml(line)).join("<br>"));
  }
  const mergedText = preparedLines.join("");
  const sentenceLines = splitLineBySentence(mergedText);
  return replaceKnownLinks(sentenceLines.map((line) => escapeHtml(line)).join("<br>"));
}

function renderTextChunks(chunks, mode = "natural") {
  return (chunks || []).map((chunk) => {
    if (chunk.type === "h3_strong") {
      const headingText = String(chunk.text || "");
      const pairLabel = String(chunk.pairLabel || "").trim();
      const groupHeadingMatch = headingText.match(/^(.+?)(（各クラス[^）]+）)$/);
      const headingMainHtml = groupHeadingMatch
        ? `<span class="stream-h3-main">${escapeHtml(groupHeadingMatch[1])}<span class="stream-h3-inline-meta">${escapeHtml(groupHeadingMatch[2])}</span></span>`
        : `<span class="stream-h3-main">${escapeHtml(headingText)}</span>`;
      const pairLabelHtml = pairLabel
        ? `<span class="stream-h3-inline-sub">${escapeHtml(pairLabel)}</span>`
        : "";
      return `<h3 class="stream-h3-strong">${headingMainHtml}${pairLabelHtml}</h3>`;
    }
    if (chunk.type === "h4_strong") return `<h4 class="stream-h4-strong">${escapeHtml(chunk.text)}</h4>`;
    if (chunk.type === "h3") return `<h3 class="stream-h3">${escapeHtml(chunk.text)}</h3>`;
    if (chunk.type === "h4") return `<h4 class="stream-h4">${escapeHtml(chunk.text)}</h4>`;
    return `<p class="stream-p">${formatParagraphLines(chunk.lines || [], mode)}</p>`;
  }).join("");
}

function resolveOptionalBlockClassName(rawClassName) {
  const className = String(rawClassName || "").trim();
  return /^[a-zA-Z0-9_-]+$/.test(className) ? className : "";
}

function formatTableTextWithNumericSpan(rawValue) {
  const source = String(rawValue ?? "");
  if (!source || source === "—") return escapeHtml(source || "—");
  return escapeHtml(source).replace(
    /([0-9０-９][0-9０-９:：〜～\-ー,，．.\+xX×\/％%年月日時分回才歳円ヶか]+)/g,
    '<span class="table-num">$1</span>'
  );
}

function formatPricingValueCellHtml(rawValue) {
  const source = String(rawValue ?? "").trim();
  if (!source || source === "—") return escapeHtml(source || "—");
  const segments = source.split("/");
  if (segments.length < 2) return escapeHtml(source);
  const main = formatTableTextWithNumericSpan(String(segments[0] || "").trim());
  const price = formatTableTextWithNumericSpan(String(segments[1] || "").trim());
  const subSource = String(segments.slice(2).join("/")).trim();
  const sub = subSource ? formatTableTextWithNumericSpan(subSource) : "";
  if (!main || !price) return escapeHtml(source);
  const subHtml = sub ? `<span class="pricing-cell-sub">${sub}</span>` : "";
  return `<span class="pricing-cell-main">${main}</span><span class="pricing-cell-price">${price}</span>${subHtml}`;
}

function formatPricingFirstColumnHtml(rawValue) {
  const source = String(rawValue ?? "");
  if (!source || source === "—") return escapeHtml(source || "—");
  const multiLine = source.split(/\r?\n/).map((line) => String(line || "").trim()).filter(Boolean);
  if (multiLine.length > 1) {
    const supportVideoLabel = "<自宅練習サポート動画付き>";
    return multiLine.map((line, index) => {
      const isSupportVideoLine = line.includes(supportVideoLabel);
      const baseClass = index === 0
        ? "pricing-cell-main"
        : isSupportVideoLine
          ? "pricing-cell-sub"
          : "pricing-cell-main pricing-cell-main--detail";
      const extraClass = line.includes(supportVideoLabel) ? " pricing-cell-sub--support-video" : "";
      return `<span class="${baseClass}${extraClass}">${formatTableTextWithNumericSpan(line)}</span>`;
    }).join("");
  }
  const marker = "※空4・時間帯要相談";
  if (!source.includes(marker)) return formatTableTextWithNumericSpan(source);
  const startTag = "%%PRICING_NOTE_BREAK_START%%";
  const endTag = "%%PRICING_NOTE_BREAK_END%%";
  const wrapped = source.replace(marker, `${startTag}${marker}${endTag}`);
  return formatTableTextWithNumericSpan(wrapped)
    .replace(startTag, '<span class="pricing-note-break">')
    .replace(endTag, "</span>");
}

function normalizeTableCell(rawCell) {
  if (rawCell && typeof rawCell === "object" && !Array.isArray(rawCell)) {
    const value = String(rawCell.value ?? rawCell.text ?? rawCell.label ?? "");
    const rowspan = Number(rawCell.rowspan);
    const colspan = Number(rawCell.colspan);
    return {
      value: value || "—",
      rowspan: Number.isFinite(rowspan) && rowspan > 1 ? Math.floor(rowspan) : 1,
      colspan: Number.isFinite(colspan) && colspan > 1 ? Math.floor(colspan) : 1
    };
  }
  const value = String(rawCell ?? "");
  return {
    value: value || "—",
    rowspan: 1,
    colspan: 1
  };
}

function renderTableBlock(block) {
  const columns = (block && block.columns) || [];
  const rows = (block && block.rows) || [];
  if (!Array.isArray(columns) || !Array.isArray(rows) || columns.length === 0 || rows.length === 0) return "";
  const variant = String((block && block.variant) || "").trim();
  const isPricing = variant === "pricing";
  const wrapClass = isPricing ? "stream-table-wrap stream-table-wrap--pricing" : "stream-table-wrap";
  const tableClass = isPricing ? "stream-table stream-table--pricing" : "stream-table";
  const caption = escapeHtml(String((block && block.caption) || ""));
  const captionSubtext = escapeHtml(String((block && block.captionSubtext) || "").trim());
  const rawCaptionBadge = String((block && block.captionBadge) || "").trim();
  const captionBadge = escapeHtml(rawCaptionBadge);
  const hasAlertCaptionBadge = /満室|満席/.test(rawCaptionBadge);
  const note = escapeHtml(String((block && block.note) || ""));
  const headHtml = columns.map((column) => `<th scope="col">${escapeHtml(String(column || ""))}</th>`).join("");
  const spanTracker = new Array(columns.length).fill(0);
  const activeSpanCells = new Array(columns.length).fill(null);
  const bodyHtml = rows.map((row) => {
    const cells = Array.isArray(row) ? row : Array.isArray(row && row.cells) ? row.cells : [];
    let cellPointer = 0;
    let rowHtml = "";
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      if (spanTracker[columnIndex] > 0) {
        const spanCell = activeSpanCells[columnIndex];
        spanTracker[columnIndex] -= 1;
        if (spanCell) {
          rowHtml += `<td class="stream-table-mobile-only" data-label="${spanCell.label}">${spanCell.value}</td>`;
        }
        if (spanTracker[columnIndex] === 0) activeSpanCells[columnIndex] = null;
        continue;
      }
      const rawCell = cellPointer < cells.length ? cells[cellPointer] : undefined;
      cellPointer += 1;
      const normalizedCell = normalizeTableCell(rawCell);
      const safeColspan = Math.max(1, Math.min(normalizedCell.colspan, columns.length - columnIndex));
      const safeRowspan = normalizedCell.rowspan;
      const label = escapeHtml(columns.slice(columnIndex, columnIndex + safeColspan).map((column) => String(column || "")).join(" / "));
      const rawValue = String(normalizedCell.value || "—");
      let value = formatTableTextWithNumericSpan(rawValue);
      if (isPricing && safeColspan === 1) {
        if (columnIndex === 1) {
          value = formatPricingValueCellHtml(rawValue);
        } else if (columnIndex === 0) {
          value = formatPricingFirstColumnHtml(rawValue);
        }
      }
      const rowspanAttr = safeRowspan > 1 ? ` rowspan="${safeRowspan}"` : "";
      const colspanAttr = safeColspan > 1 ? ` colspan="${safeColspan}"` : "";
      rowHtml += `<td data-label="${label}"${rowspanAttr}${colspanAttr}>${value}</td>`;
      if (safeRowspan > 1) {
        for (let spanCol = columnIndex; spanCol < columnIndex + safeColspan; spanCol += 1) {
          spanTracker[spanCol] = Math.max(spanTracker[spanCol], safeRowspan - 1);
          activeSpanCells[spanCol] = { label, value };
        }
      }
      columnIndex += safeColspan - 1;
    }
    return `<tr>${rowHtml}</tr>`;
  }).join("");
  const captionTextHtml = caption ? `<span class="stream-table-caption-text">${caption}</span>` : "";
  const captionBadgeClass = `stream-table-caption-badge${hasAlertCaptionBadge ? " stream-table-caption-badge--alert" : ""}`;
  const captionBadgeHtml = captionBadge ? `<span class="${captionBadgeClass}">${captionBadge}</span>` : "";
  const captionMainHtml = (captionTextHtml || captionBadgeHtml)
    ? `<span class="stream-table-caption-main">${captionTextHtml}${captionBadgeHtml}</span>`
    : "";
  const captionSubHtml = captionSubtext ? `<span class="stream-table-caption-sub">${captionSubtext}</span>` : "";
  const captionClass = `stream-table-caption${captionBadge ? " stream-table-caption--with-badge" : ""}${captionSubtext ? " stream-table-caption--with-sub" : ""}`;
  const captionHtml = (captionMainHtml || captionSubHtml) ? `<p class="${captionClass}">${captionMainHtml}${captionSubHtml}</p>` : "";
  const noteHtml = note ? `<p class="stream-table-note">${note}</p>` : "";
  const captionLine = captionHtml ? `\n                    ${captionHtml}` : "";
  const noteLine = noteHtml ? `\n                    ${noteHtml}` : "";
  return `
                <section class="${wrapClass}">${captionLine}
                    <div class="stream-table-scroll">
                        <table class="${tableClass}">
                            <thead>
                                <tr>${headHtml}</tr>
                            </thead>
                            <tbody>
                                ${bodyHtml}
                            </tbody>
                        </table>
                    </div>${noteLine}
                </section>`;
}

function renderBlocksInline(blocks, sectionTitle, textFlow = "natural") {
  const resolvedTextFlow = normalizeTextFlow(textFlow);
  return (blocks || []).map((block) => {
    if (block.type === "text") {
      const chunks = parseTextLines(block.lines || [], { sectionTitle });
      const textHtml = renderTextChunks(chunks, resolvedTextFlow);
      const blockClassName = resolveOptionalBlockClassName(block && block.className);
      const safeClassName = blockClassName ? ` ${blockClassName}` : "";
      return `<div class="stream-text${safeClassName}">${textHtml}</div>`;
    }
    if (block.type === "table") return renderTableBlock(block);
    return "";
  }).join("");
}

function resolveSectionCover(section) {
  return normalizeImagePath(section && section.coverImage ? section.coverImage : "");
}

function resolveSectionCoverAlt(section) {
  const title = String(section && section.title ? section.title : "セクション").trim();
  return `${title}の案内写真`;
}

function buildSectionId(index) {
  return `section-${index + 1}`;
}

function renderRoomsStaticHtml(config) {
  const articles = (config.sections || []).map((section, index) => {
    const id = buildSectionId(index);
    const coverImage = resolveSectionCover(section);
    const textFlow = normalizeTextFlow(section && section.textFlow);
    const subtitleHtml = section.subtitle ? `\n                <p class="stream-subtitle">${escapeHtml(section.subtitle)}</p>` : "";
    const coverCaption = String((section && section.coverCaption) || "").trim();
    const coverCaptionHtml = coverCaption ? `<figcaption class="stream-cover-caption">${escapeHtml(coverCaption)}</figcaption>` : "";
    const coverAlt = resolveSectionCoverAlt(section);
    const coverHtml = coverImage
      ? `\n                <figure class="stream-cover">${renderResponsiveImageTag({ className: "stream-cover-image", imagePath: coverImage, altText: coverAlt, loading: "lazy", decoding: "async" })}${coverCaptionHtml}</figure>`
      : "";
    const bodyHtml = renderBlocksInline(section.blocks, section.title, textFlow);
    return `            <article id="${id}" class="stream-section fade-in active">
                <h2 class="stream-header">${escapeHtml(section.title)}</h2>${subtitleHtml}${coverHtml}
                <div class="stream-body">${bodyHtml}</div>
            </article>`;
  }).join("\n\n");
  return `        <section id="rooms" class="stream-sec">
${articles}
        </section>`;
}

function replaceRoomsStaticHtml(indexSource, config) {
  const startMarker = "        <section id=\"rooms\" class=\"stream-sec\">";
  const afterMarker = "\n    </div>\n    </main>";
  const start = indexSource.indexOf(startMarker);
  if (start === -1) throw new Error("静的 rooms セクション開始が見つかりません");
  const closeMarker = "        </section>";
  const closeStart = indexSource.indexOf(closeMarker + afterMarker, start);
  if (closeStart === -1) throw new Error("静的 rooms セクション終了が見つかりません");
  const closeEnd = closeStart + closeMarker.length;
  return indexSource.slice(0, start) + renderRoomsStaticHtml(config) + indexSource.slice(closeEnd);
}

function normalizeHero(hero) {
  const safeHero = hero || {};
  return {
    title: normalizeText(safeHero.title || ""),
    sub: normalizeText(safeHero.sub || ""),
    location: normalizeText(safeHero.location || ""),
    rotationImages: (safeHero.rotationImages || []).map((value) => normalizeText(value).trim()).filter(Boolean),
    mobileSplitTopFirstImage: normalizeText(safeHero.mobileSplitTopFirstImage || "").trim(),
    mobileSplitBottomImage: normalizeText(safeHero.mobileSplitBottomImage || "").trim()
  };
}

function normalizeTextBlockLines(lines) {
  return (lines || []).map((line) => normalizeText(line));
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

function normalizeSectionForMaster(section, nativeRatioSet) {
  const blocks = [];
  (section.blocks || []).forEach((block) => {
    if (!block || typeof block !== "object") return;
    if (block.type === "text") {
      const textBlock = { type: "text", lines: normalizeTextBlockLines(block.lines || []) };
      const className = normalizeText(block.className || "").trim();
      if (className) textBlock.className = className;
      blocks.push(textBlock);
      return;
    }
    if (block.type === "gallery") {
      blocks.push({
        type: "gallery",
        images: (block.images || []).map((image) => normalizeGalleryImage(image, nativeRatioSet)).filter(Boolean)
      });
    }
  });
  return {
    title: normalizeText(section && section.title ? section.title : ""),
    subtitle: normalizeText(section && section.subtitle ? section.subtitle : ""),
    textFlow: normalizeText(section && section.textFlow ? section.textFlow : "natural"),
    blocks
  };
}

function buildMasterData(config, nativeRatioSet) {
  return {
    schemaVersion: 1,
    hero: normalizeHero(config.hero || {}),
    sections: (config.sections || []).map((section) => normalizeSectionForMaster(section, nativeRatioSet))
  };
}

function renderMasterMarkdown(data) {
  const lines = [];
  lines.push("# content_master_v1");
  lines.push("");
  lines.push("## 役割");
  lines.push("- 本文・写真仕様の公開スナップショットです。トップページ本文ブロックは `content/home-text.json` を編集し、`node scripts/build_home_content.mjs --write` で本ファイルと `index.html` に反映します。");
  lines.push("- 手編集で確定しないでください。差分チェックが `PASS` になるまで、公開反映しません。");
  lines.push("");
  lines.push("## ヒーロー仕様");
  lines.push(`- title: ${data.hero.title}`);
  lines.push(`- sub: ${data.hero.sub}`);
  lines.push(`- location: ${data.hero.location}`);
  lines.push(`- mobileSplitTopFirstImage: ${data.hero.mobileSplitTopFirstImage}`);
  lines.push(`- mobileSplitBottomImage: ${data.hero.mobileSplitBottomImage}`);
  lines.push("- rotationImages:");
  data.hero.rotationImages.forEach((image) => {
    lines.push(`  - ${image}`);
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
        (block.lines || []).forEach((line) => lines.push(String(line || "")));
        lines.push("```");
        lines.push("");
        return;
      }
      if (block.type === "gallery") {
        galleryCount += 1;
        lines.push(`#### Gallery ${galleryCount}`);
        lines.push("| # | src | caption | displayRule |");
        lines.push("| --- | --- | --- | --- |");
        (block.images || []).forEach((image, idx) => {
          lines.push(`| ${idx + 1} | ${escapeMdCell(image.src)} | ${escapeMdCell(image.caption || "")} | ${escapeMdCell(image.displayRule)} |`);
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

function buildOutputs(rootDir) {
  const indexPath = path.resolve(rootDir, INDEX_FILE);
  const indexSource = readUtf8(indexPath);
  const config = extractConfig(indexSource);
  const homeText = loadHomeText(rootDir);
  const nextConfig = applyHomeTextToConfig(config, homeText);
  const nativeRatioSet = extractNativeRatioImageSet(indexSource);
  const nextIndex = replaceRoomsStaticHtml(replaceConfig(indexSource, nextConfig), nextConfig);
  const nextMaster = renderMasterMarkdown(buildMasterData(nextConfig, nativeRatioSet));
  return { nextIndex, nextMaster };
}

function checkOutputs(rootDir) {
  const { nextIndex, nextMaster } = buildOutputs(rootDir);
  const indexPath = path.resolve(rootDir, INDEX_FILE);
  const masterPath = path.resolve(rootDir, MASTER_FILE);
  const issues = [];
  if (readUtf8(indexPath) !== nextIndex) issues.push(`${INDEX_FILE} が ${HOME_TEXT_FILE} から生成した内容と一致していません`);
  if (readUtf8(masterPath) !== nextMaster) issues.push(`${MASTER_FILE} が ${HOME_TEXT_FILE} から生成した内容と一致していません`);
  if (issues.length > 0) {
    console.error(`FAIL: ${issues.length} 件の生成差分を検出しました。`);
    issues.forEach((issue) => console.error(`- ${issue}`));
    console.error("修正するには `node scripts/build_home_content.mjs --write` を実行してください。");
    process.exit(1);
  }
  console.log(`PASS: ${HOME_TEXT_FILE} から生成される公開本文は一致しています。`);
}

function writeOutputs(rootDir) {
  const { nextIndex, nextMaster } = buildOutputs(rootDir);
  writeUtf8(path.resolve(rootDir, INDEX_FILE), nextIndex);
  writeUtf8(path.resolve(rootDir, MASTER_FILE), nextMaster);
  console.log(`WROTE: ${INDEX_FILE}, ${MASTER_FILE}`);
}

function initFromIndex(rootDir) {
  const indexPath = path.resolve(rootDir, INDEX_FILE);
  const homeTextPath = path.resolve(rootDir, HOME_TEXT_FILE);
  if (fs.existsSync(homeTextPath) && !process.argv.includes("--force")) {
    throw new Error(`${HOME_TEXT_FILE} は既に存在します。上書きする場合は --force を付けてください。`);
  }
  const config = extractConfig(readUtf8(indexPath));
  const homeText = deriveHomeTextFromConfig(config);
  writeUtf8(homeTextPath, `${JSON.stringify(homeText, null, 2)}\n`);
  console.log(`WROTE: ${HOME_TEXT_FILE}`);
}

function main() {
  const rootDir = process.cwd();
  if (process.argv.includes("--init-from-index")) {
    initFromIndex(rootDir);
    return;
  }
  if (process.argv.includes("--write")) {
    writeOutputs(rootDir);
    return;
  }
  checkOutputs(rootDir);
}

main();
