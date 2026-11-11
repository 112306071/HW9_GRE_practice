#!/usr/bin/env node
/* ==========================================================
   資料檢查腳本：node scripts/check-data.js
   依 AGENTS.md 第 5、6 節檢查 data/ 底下的所有資料
   有錯誤（✖）時結束碼為 1；警告（!）不影響結束碼
   ========================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const UNITS_DIR = path.join(ROOT, "data", "units");
const POS = ["n.", "v.", "adj.", "adv."];
const WORD_RE = /^[a-z][a-z' -]*$/;

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`✖ ${where}：${msg}`);
const warn = (where, msg) => warnings.push(`! ${where}：${msg}`);

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const charLength = (s) => Array.from(s).length;

// ---------- 載入資料（模擬瀏覽器的 window） ----------
const sandbox = { window: {} };
vm.createContext(sandbox);

function run(file) {
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
    return true;
  } catch (e) {
    err(path.relative(ROOT, file), `無法執行（語法錯誤？）${e.message}`);
    return false;
  }
}

if (!run(path.join(ROOT, "data", "units.js"))) finish();

const units = sandbox.window.GRE_UNITS;
if (!Array.isArray(units)) {
  err("data/units.js", "找不到 window.GRE_UNITS 陣列");
  finish();
}

// ---------- 檢查註冊表 ----------
const registered = new Set();
units.forEach((u, i) => {
  const where = `data/units.js 第 ${i + 1} 筆`;
  const expectedId = `unit-${String(i + 1).padStart(2, "0")}`;
  if (u.id !== expectedId) err(where, `id 應為 "${expectedId}"（依序編號、不跳號），目前是 "${u.id}"`);
  if (registered.has(u.id)) err(where, `id "${u.id}" 重複`);
  registered.add(u.id);
  if (!isNonEmptyString(u.title) || charLength(u.title) > 8) err(where, "title 必填且最多 8 字");
  if (!isNonEmptyString(u.desc) || charLength(u.desc) > 20) err(where, "desc 必填且最多 20 字");
  if (!fs.existsSync(path.join(UNITS_DIR, `${u.id}.js`))) err(where, `找不到檔案 data/units/${u.id}.js`);
});

fs.readdirSync(UNITS_DIR)
  .filter((f) => f.endsWith(".js"))
  .forEach((f) => {
    const id = f.replace(/\.js$/, "");
    if (!registered.has(id)) err(`data/units/${f}`, "此單元檔沒有在 data/units.js 註冊");
  });

// ---------- 檢查各單元 ----------
const seenWords = new Map(); // word -> unit id
let totalWords = 0;
let totalQuestions = 0;
const verifyList = [];

units.forEach((u) => {
  const file = path.join(UNITS_DIR, `${u.id}.js`);
  if (!fs.existsSync(file) || !run(file)) return;

  const data = (sandbox.window.GRE_DATA || {})[u.id];
  const fileLabel = `data/units/${u.id}.js`;
  if (!data) {
    err(fileLabel, `沒有定義 window.GRE_DATA["${u.id}"]（第一行的 key 要和檔名相同）`);
    return;
  }

  const words = Array.isArray(data.words) ? data.words : null;
  const questions = Array.isArray(data.questions) ? data.questions : null;
  if (!words) { err(fileLabel, "words 必須是陣列"); return; }
  if (!questions) err(fileLabel, "questions 必須是陣列（沒有題目請寫 []）");

  if (words.length < 8 || words.length > 15) err(fileLabel, `單字數量需為 8–15 個，目前 ${words.length} 個`);

  const unitWords = [];
  words.forEach((w, i) => {
    const where = `${fileLabel} 單字 #${i + 1}${w && w.word ? `（${w.word}）` : ""}`;
    totalWords++;

    if (!isNonEmptyString(w.word)) { err(where, "word 必填"); return; }
    if (w.word !== w.word.toLowerCase()) warn(where, "word 應為全小寫（專有名詞除外）");
    unitWords.push(w.word.toLowerCase());
    if (seenWords.has(w.word)) err(where, `單字重複，已出現在 ${seenWords.get(w.word)}`);
    else seenWords.set(w.word, u.id);

    if (!POS.includes(w.pos)) err(where, `pos 只能是 ${POS.join("、")}`);

    if (!isNonEmptyString(w.zh)) err(where, "zh 必填");
    else {
      if (w.zh.includes(";")) err(where, "zh 多個意思請用全形分號「；」分隔");
      if (w.zh.split("；").length > 3) err(where, "zh 最多 3 個意思");
    }

    if (!isNonEmptyString(w.en)) err(where, "en 必填");
    else {
      if (!/^[a-z]/.test(w.en)) err(where, "en 須小寫開頭");
      if (/\.\s*$/.test(w.en)) err(where, "en 結尾不加句號");
      if (w.en.trim().split(/\s+/).length > 15) err(where, "en 最多 15 個英文字");
    }

    if (!isNonEmptyString(w.example)) err(where, "example 必填");
    else {
      const marks = w.example.match(/\*\*[^*]+\*\*/g) || [];
      if (marks.length !== 1) err(where, `example 中目標字必須用 ** 標記恰好一次，目前 ${marks.length} 次`);
      const len = w.example.replace(/\*\*/g, "").trim().split(/\s+/).length;
      if (len < 8 || len > 20) warn(where, `例句建議 8–20 個字，目前 ${len} 個`);
    }

    if (!isNonEmptyString(w.exampleZh)) err(where, "exampleZh 必填");

    if (!Array.isArray(w.synonyms) || w.synonyms.length < 1 || w.synonyms.length > 3) err(where, "synonyms 需為 1–3 個字的陣列");
    else w.synonyms.forEach((s) => { if (!WORD_RE.test(s)) err(where, `同義字 "${s}" 格式不正確（需全小寫英文）`); });

    if (w.antonyms !== undefined) {
      if (!Array.isArray(w.antonyms) || w.antonyms.length > 2) err(where, "antonyms 需為 0–2 個字的陣列");
      else w.antonyms.forEach((s) => { if (!WORD_RE.test(s)) err(where, `反義字 "${s}" 格式不正確（需全小寫英文）`); });
    } else err(where, "antonyms 必須存在（沒有反義字請寫 []）");

    if (![1, 2, 3].includes(w.level)) err(where, "level 只能是 1、2、3");

    if (w.verify === true) verifyList.push(`${u.id} ${w.word}`);
  });

  if (!questions) return;
  if (questions.length < 2 || questions.length > 4) warn(fileLabel, `自編題目建議 2–4 題，目前 ${questions.length} 題`);

  questions.forEach((q, i) => {
    const where = `${fileLabel} 題目 #${i + 1}`;
    totalQuestions++;

    if (q.type !== "tc" && q.type !== "se") { err(where, 'type 只能是 "tc" 或 "se"'); return; }
    const needOptions = q.type === "tc" ? 5 : 6;
    const needAnswers = q.type === "tc" ? 1 : 2;

    if (!isNonEmptyString(q.sentence)) err(where, "sentence 必填");
    else {
      const blanks = q.sentence.match(/_+/g) || [];
      if (blanks.length !== 1 || blanks[0] !== "____") err(where, "sentence 必須恰好有一個空格，且寫成 4 個底線 ____");
    }

    if (!Array.isArray(q.options) || q.options.length !== needOptions) {
      err(where, `${q.type} 題需要 ${needOptions} 個選項`);
      return;
    }
    if (new Set(q.options).size !== q.options.length) err(where, "選項不可重複");

    if (!Array.isArray(q.answer) || q.answer.length !== needAnswers) err(where, `${q.type} 題需要 ${needAnswers} 個正確答案`);
    else {
      if (new Set(q.answer).size !== q.answer.length) err(where, "answer 索引不可重複");
      q.answer.forEach((a) => {
        if (!Number.isInteger(a) || a < 0 || a >= q.options.length) err(where, `answer 索引 ${a} 超出範圍（0–${q.options.length - 1}）`);
      });
      // 正確答案至少一個是本單元單字（可為變化形）
      const hit = q.answer.some((a) => {
        const opt = String(q.options[a] || "").toLowerCase();
        return unitWords.some((w) => opt.startsWith(w.slice(0, Math.max(4, w.length - 2))));
      });
      if (!hit) warn(where, "正確答案中找不到本單元的單字，請確認");
    }

    if (!isNonEmptyString(q.explain)) err(where, "explain 必填");
    else {
      const len = charLength(q.explain);
      if (len < 30 || len > 60) warn(where, `explain 建議 30–60 字，目前 ${len} 字`);
    }
  });
});

finish();

function finish() {
  console.log("GRE 單字資料檢查");
  console.log("──────────────────");
  if (Array.isArray(units)) {
    console.log(`單元 ${units.length} 個・單字 ${totalWords} 個・自編題目 ${totalQuestions} 題`);
  }
  if (verifyList.length) console.log(`\n待人工確認（verify: true）：\n  ${verifyList.join("\n  ")}`);
  if (warnings.length) console.log(`\n警告 ${warnings.length} 項：\n${warnings.join("\n")}`);
  if (errors.length) {
    console.log(`\n錯誤 ${errors.length} 項：\n${errors.join("\n")}`);
    console.log("\n✖ 檢查未通過");
    process.exit(1);
  }
  console.log("\n✔ 檢查通過");
  process.exit(0);
}
