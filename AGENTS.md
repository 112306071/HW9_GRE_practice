# AGENTS.md — GRE 單字小卡與練習

> 本文件是這個專案的唯一規則來源。任何 AI agent（Claude Code、Codex、Cursor⋯）在修改專案前都必須先讀完本文件，並依照規則工作。
> 若規則與使用者當下的指示衝突，以使用者指示為準，並在完成後提醒使用者是否要更新本文件。

---

## 1. 專案目的

一個幫助準備 GRE 的**英文單字練習網站**，包含兩個核心功能：

1. **單字小卡**：翻面記憶、洗牌、標記「不熟」。
2. **題目練習**：依單字資料自動出題，並收錄 GRE 題型（Text Completion / Sentence Equivalence）的自編題目。

設計原則：**內容與程式分離**。新增單字或題目時只需新增／修改資料檔，頁面會自動更新，不需要動到 HTML 或 JS 程式。

網站以 GitHub Pages 發布，必須同時能「直接雙擊開啟 HTML（file://）」與「在 GitHub Pages 上」正常運作。

---

## 2. 技術規則

- 只使用 **純 HTML + CSS + 原生 JavaScript（Vanilla JS）**。
- **禁止**：前端框架（React、Vue⋯）、CDN 外部資源、npm 套件、任何 build 工具。
- **禁止用 `fetch` 讀取 JSON**（在 file:// 下會被瀏覽器擋住）。所有資料都寫成 `.js` 檔，掛在全域物件 `window.GRE_DATA` 上。
- 共用邏輯集中在 `assets/app.js`，共用樣式集中在 `assets/style.css`。頁面 HTML 中不寫 `<style>` 區塊，也不寫行內 `style="..."`。
- 學習進度使用 `localStorage`，key 一律以 `gre-vocab:` 開頭。讀寫一律透過 `app.js` 的 `store.get()` / `store.set()`（已包好 `try/catch`），讀不到時網站仍要正常運作。目前使用的 key：

  | key | 內容 |
  |---|---|
  | `gre-vocab:unfamiliar` | 不熟單字的陣列，例如 `["abate", "wane"]` |
  | `gre-vocab:best-score` | 各範圍的最佳成績（百分比），例如 `{ "all": 80, "unit-01": 100 }` |

  新增 key 時要加到上表。

---

## 3. 目錄結構

```
gre-vocab/
├── index.html              首頁：顯示所有單元（由 data/units.js 自動產生列表）
├── flashcards.html         單字小卡頁，網址參數 ?unit=unit-01（省略則為全部單元）、?unfamiliar=1（只看不熟）
├── quiz.html               題目練習頁，網址參數 ?unit=unit-01（省略則為全部單元）
├── assets/
│   ├── style.css           全站樣式與設計 token（顏色、字體、間距）
│   └── app.js              共用邏輯：導覽列、載入單元、小卡、出題、計分
├── data/
│   ├── units.js            單元註冊表（所有單元的清單，網站從這裡知道有哪些單元）
│   └── units/
│       ├── unit-01.js      單元資料：單字 + 自編題目
│       └── unit-02.js
├── scripts/
│   └── check-data.js       資料檢查腳本：node scripts/check-data.js
├── AGENTS.md               本文件（給所有 AI agent 的規則）
├── CLAUDE.md               Claude Code 入口，內容為 @AGENTS.md
├── README.md               給人看的專案介紹與網站連結
└── .gitignore
```

每個檔案的職責固定，**不要新增上表以外的資料夾**；若確實需要，先更新本節再新增。

---

## 4. 命名規則

| 項目 | 規則 | 範例 |
|---|---|---|
| 單元 id | `unit-` + 兩位數字，依序遞增，不跳號 | `unit-03` |
| 單元檔名 | 與單元 id 相同 | `data/units/unit-03.js` |
| 功能頁面檔名 | 小寫英文，多字用連字號 | `review-mistakes.html` |
| 單字 `word` 欄位 | 全小寫原形（專有名詞除外） | `"abate"` |
| CSS class | 小寫 + 連字號（kebab-case） | `.flash-card`, `.quiz-option` |
| JS 函式 / 變數 | camelCase | `renderFlashcard()` |
| localStorage key | `gre-vocab:` + 用途 | `gre-vocab:best-score` |

---

## 5. 資料格式（最重要）

### 5.1 單元註冊表 `data/units.js`

```js
window.GRE_DATA = window.GRE_DATA || {};
window.GRE_UNITS = [
  { id: "unit-01", title: "減弱與加劇", desc: "描述程度變強或變弱的字" },
  { id: "unit-02", title: "讚美與批評", desc: "表達正面或負面評價的字" }
];
```

- 順序即首頁顯示順序。新單元一律**加在陣列最後**。
- `title` 為繁體中文，8 字以內；`desc` 為繁體中文，20 字以內。

### 5.2 單元檔 `data/units/unit-XX.js`

```js
window.GRE_DATA["unit-01"] = {
  words: [
    {
      word: "abate",
      pos: "v.",
      zh: "減弱；減退",
      en: "to become less intense or widespread",
      example: "After raging for hours, the storm finally **abated** around midnight.",
      exampleZh: "肆虐了好幾個小時後，暴風雨終於在午夜前後減弱了。",
      synonyms: ["subside", "wane", "ebb"],
      antonyms: ["intensify"],
      level: 2
    }
  ],
  questions: [
    {
      type: "tc",
      sentence: "Although the protests had ____ by evening, the city remained tense.",
      options: ["abated", "escalated", "commenced", "persisted", "proliferated"],
      answer: [0],
      explain: "Although 表示轉折：抗議到了晚上已經「減弱」，城市卻仍然緊張，所以選 abated。"
    }
  ]
};
```

> 以上範例取自實際的 `data/units/unit-01.js`，完全符合下方所有規則，新增內容時可以直接照這個格式寫。

### 5.3 單字欄位規則

| 欄位 | 必填 | 規則 |
|---|---|---|
| `word` | ✅ | 全小寫原形；**全站不可重複**（新增前先搜尋所有單元檔） |
| `pos` | ✅ | 只能是 `n.`、`v.`、`adj.`、`adv.` 其中之一 |
| `zh` | ✅ | 繁體中文（台灣用語），多個意思用全形分號「；」分隔，最多 3 個 |
| `en` | ✅ | 英文釋義，小寫開頭、結尾不加句號，15 字以內，**自己撰寫，不可照抄字典** |
| `example` | ✅ | 一個完整英文例句，**目標字必須用 `**` 包起來**（可為變化形，如 `**abated**`）。測驗的「例句填空」靠這個標記挖空 |
| `exampleZh` | ✅ | 例句的繁體中文翻譯 |
| `synonyms` | ✅ | 1–3 個同義字，全小寫，須為真實英文單字 |
| `antonyms` | ✅ | 0–2 個反義字；欄位一定要有，沒有反義字就寫 `[]` |
| `level` | ✅ | 難度 `1`（基礎）、`2`（中等）、`3`（進階） |
| `verify` | ⬜ | 若對字義或例句沒把握，加上 `verify: true`，由使用者人工確認 |

### 5.4 自編題目規則（`questions` 陣列，可為空陣列 `[]`）

| 題型 | `type` | 選項數 | 正確答案數 | 說明 |
|---|---|---|---|---|
| Text Completion | `"tc"` | 5 | 1 | 單一空格的句子填空 |
| Sentence Equivalence | `"se"` | 6 | 2 | 選兩個能讓句意相同的字 |

- 空格一律寫成 **4 個底線 `____`**，每題只有一個空格。
- `answer` 是選項的索引陣列（從 0 開始），例如 `[0]` 或 `[1, 4]`。
- 正確答案至少有一個必須是**本單元的單字**（可為變化形）。
- `explain` 用繁體中文說明解題線索（轉折詞、因果、語氣），30–60 字。
- 每個單元建議 2–4 題自編題目。

### 5.5 自動產生的題型（不需手寫，由 `app.js` 依單字資料產生）

1. **看英文選中文**：題目為 `word`，選項為 4 個 `zh`。
2. **看中文選英文**：題目為 `zh`，選項為 4 個 `word`。
3. **例句填空**：把 `example` 中 `**...**` 的部分挖空成 `____`，選項為 4 個 `word`（原形）。
4. **同義字選擇**：題目為 `word`，從 `synonyms` 隨機取一個作為正確答案，干擾選項取自其他單元單字的 `synonyms`。

**干擾選項規則**：優先選「其他單元、詞性相同」的字。因為同單元的字是近義字（例如 abate 與 wane），放在一起會出現兩個正確答案。

因此：
- `synonyms` 只能放**真正的同義字**，否則同義字題會出現錯誤答案。
- `zh` 要能和其他字區分，不要只寫一個過於籠統的詞。
- 測驗頁答錯的單字會自動加入「不熟」清單（`gre-vocab:unfamiliar`）。

---

## 6. 內容規則

- 每個單元 **8–15 個單字**，且單元內的字要有**共同主題**（同一語意類別，例如「讚美與批評」、「固執與順從」），方便聯想記憶。
- 單字以 GRE 常見高頻字為主，避免過於簡單（如 `happy`）或極罕見的字。
- 釋義、例句、題目**必須自行撰寫**，不可整批複製 Barron's、Magoosh、Manhattan 等商業字表或題庫。
- 例句要自然，能從上下文推測字義，長度 8–20 字。
- 介面文字一律使用**繁體中文（台灣用語）**；英文內容保持英文。

---

## 7. 網頁風格

整體感覺：**乾淨的紙本單字本**，米白底、墨藍主色，閱讀舒適、不花俏。

### 7.1 設計 token（定義在 `assets/style.css` 的 `:root`，HTML 與 JS 中禁止寫死顏色）

| Token | 淺色模式 | 用途 |
|---|---|---|
| `--color-bg` | `#f7f5f0` | 頁面背景（米白） |
| `--color-surface` | `#ffffff` | 卡片背景 |
| `--color-primary` | `#2f4b7c` | 主色（墨藍）：標題、按鈕 |
| `--color-accent` | `#e8a33d` | 強調（琥珀）：「不熟」標記、進度 |
| `--color-text` | `#1f2933` | 主要文字 |
| `--color-muted` | `#6b7280` | 次要文字 |
| `--color-correct` | `#2f855a` | 答對 |
| `--color-wrong` | `#c53030` | 答錯 |

- 深色模式用 `@media (prefers-color-scheme: dark)` 重新定義同一組 token，不新增其他顏色。
- 字體：中文用系統字 `-apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif`；**英文單字**用襯線字 `Georgia, "Times New Roman", serif`，營造字典感。
- 版面：內容最大寬度 `720px` 置中；手機優先（mobile-first），在 375px 寬度下不可出現水平捲軸。
- 圓角：卡片與面板用 `var(--radius)`（12px）；按鈕、選項、輸入框用 `var(--radius-sm)`（8px）。
- 陰影用 `var(--shadow)`；間距用 `--space-1`～`--space-7`（4px～48px），不要寫死 px。
- 淡色背景（例如答對的淡綠）用 `color-mix()` 從 token 衍生，已定義好的有 `--primary-soft`、`--accent-soft`、`--correct-soft`、`--wrong-soft`、`--line`（邊框）。
- 按鈕最小高度 44px（方便手機點擊），使用既有的 `.btn` + `.btn-primary` / `.btn-ghost`。

### 7.2 頁面骨架（每個 HTML 頁面都必須相同）

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>頁面名稱｜GRE 單字練習</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header id="site-nav"></header>      <!-- 由 app.js 產生導覽列，不要手寫 -->
  <main class="container">
    <!-- 頁面內容 -->
  </main>
  <footer class="site-footer">GRE 單字練習</footer>
  <script src="data/units.js"></script>
  <script src="assets/app.js"></script>
  <script>GRE.initXxx();</script>    <!-- 每頁呼叫自己的初始化函式 -->
</body>
</html>
```

- 單元資料檔由 `app.js` 依 `GRE_UNITS` 動態載入，**不要在 HTML 手動加 `<script src="data/units/...">`**。
- 導覽列項目定義在 `app.js` 的 `NAV` 陣列中，是唯一來源。

### 7.3 `app.js` 結構（修改功能前先看這裡找位置）

| 區塊 | 主要函式 | 用途 |
|---|---|---|
| 設定 | `NAV`、`POS_LABEL`、`LEVEL_LABEL`、`AUTO_LABEL` | 導覽列與各種顯示文字 |
| 小工具 | `escapeHtml()`、`emphasize()`、`renderBlank()`、`shuffle()` | 輸出 HTML 前一律用 `escapeHtml()` 跳脫 |
| localStorage | `store`、`getUnfamiliar()`、`setUnfamiliar()` | 學習進度 |
| 單元資料 | `loadAllUnits()`、`getWords(scope)`、`getQuestions(scope)` | `scope` 為 `"all"` 或單元 id |
| 首頁 | `initHome()` | 統計與單元列表 |
| 單字小卡 | `initFlashcards()` | 牌組、翻面、標記不熟 |
| 題目練習 | `pickDistractors()`、`makeAutoQuestion()`、`makeCustomQuestion()`、`buildQuiz()`、`initQuiz()` | 出題、作答、計分 |
| 對外介面 | `window.GRE = { ... }` | 頁面呼叫的初始化函式都要在這裡匯出 |

每個頁面的 `initXxx()` 開頭固定為：

```js
renderNav();
await loadAllUnits();
```

---

## 8. 常見任務 SOP

### 8.1 新增一個單元（最常見）

1. 讀 `data/units.js`，確認目前最後的單元編號，新編號 = 最後編號 + 1。
2. 搜尋所有 `data/units/*.js`，確認要新增的單字都沒出現過。
3. 複製一個既有單元檔為 `data/units/unit-XX.js`，把第一行的 key 改成新 id，填入 8–15 個單字與 2–4 題自編題目。
4. 在 `data/units.js` 的 `GRE_UNITS` **最後**加一筆 `{ id, title, desc }`。
5. 更新第 9 節「單元規劃」，把該單元標成已完成。
6. 執行第 10 節的檢查清單。

> 新增單元**只需要動 `data/` 底下的檔案**，不需要修改任何 HTML、CSS、`app.js`。

### 8.2 在既有單元加單字

1. 確認該單元加完後不超過 15 個字；若會超過，改為新增單元。
2. 確認單字全站不重複，加在 `words` 陣列最後。
3. 執行檢查清單。

### 8.3 新增自編題目

1. 加在對應單元的 `questions` 陣列最後，遵守 5.4 節格式。
2. 確認 `answer` 索引正確、選項數正確（tc 5 個、se 6 個）。

### 8.4 新增一個功能頁面（例如「錯題複習」）

1. 用 7.2 節的骨架建立新 HTML，檔名依第 4 節規則。
2. 在 `app.js` 新增 `initXxx()` 函式（開頭照 7.3 節固定寫法），盡量重用既有函式，例如 `getWords()`、`buildQuiz()`、`getUnfamiliar()`。
3. 把 `initXxx` 加到 `app.js` 最後的 `window.GRE = { ... }`，否則頁面呼叫不到。
4. 在 `app.js` 的 `NAV` 陣列加上新頁面。
5. 新元件的樣式加在 `style.css` 最後、「響應式」區塊之前，並用註解標示區塊名稱；只能使用既有 token。
6. 更新本文件第 3 節目錄結構與 7.3 節 `app.js` 結構表。
7. 執行第 10 節的檢查清單。

### 8.5 修改既有功能

1. 先依 7.3 節找到對應的函式，只改需要的部分，不要順手重寫其他功能。
2. 如果修改會影響資料格式，依第 11 節同步更新第 5 節與 `scripts/check-data.js`。
3. 執行第 10 節的檢查清單，並確認其他頁面沒有被影響。

### 8.6 修改樣式

- 改顏色或字體：只改 `style.css` 的 token，不要逐一修改元件。
- 不要改變 7.2 節的頁面骨架；若必須修改，所有頁面要一起改，並更新本文件。

---

## 9. 單元規劃

新增單元時優先從這裡挑選尚未完成的主題；做完後把 `[ ]` 改成 `[x]`。也可以新增其他主題到清單最後。

- [x] unit-01 減弱與加劇（abate, exacerbate, mitigate, wane⋯）
- [x] unit-02 讚美與批評（laud, extol, censure, disparage⋯）
- [x] unit-03 固執與順從（obdurate, intransigent, docile, pliant⋯）
- [x] unit-04 誠實與欺騙（candid, duplicitous, disingenuous, veracity⋯）
- [x] unit-05 節儉與浪費（frugal, parsimonious, prodigal, profligate⋯）
- [x] unit-06 短暫與持久（ephemeral, transient, perennial, immutable⋯）
- [ ] unit-07 勇敢與膽怯（intrepid, audacious, timorous, pusillanimous⋯）
- [ ] unit-08 冗長與簡潔（verbose, prolix, laconic, terse⋯）
- [ ] unit-09 平凡與獨特（banal, hackneyed, idiosyncratic, singular⋯）
- [ ] unit-10 熱情與冷漠（ardent, zealous, apathetic, indifferent⋯）

---

## 10. 完成前檢查清單

每次修改後，依序確認：

1. `node scripts/check-data.js` 執行通過（檢查必填欄位、`pos` 值、`**` 標記、重複單字、題目選項數與答案索引）。
   - `✖ 錯誤` 一定要修正；`! 警告`（例句長度、解析字數等）也應修正內容，而不是放寬規則。
2. 用瀏覽器開啟 `index.html`，新單元有出現在列表中。
3. 進入該單元的小卡頁與測驗頁，功能正常，瀏覽器 console 沒有錯誤。
4. 在 375px 寬度（手機）下檢查版面沒有跑版。
5. 若修改了結構、資料格式或流程，**同步更新本文件**。

---

## 11. 禁止事項

- ❌ 引入框架、CDN、npm 套件或 build 工具
- ❌ 用 `fetch` 讀 JSON 檔
- ❌ 新增內容時修改 `app.js`、`style.css` 或 HTML
- ❌ 刪除或改寫既有單字與題目（除非使用者明確要求修正）
- ❌ 整批複製商業字表或題庫
- ❌ 在 HTML / JS 中寫死顏色，或使用 token 以外的新顏色
- ❌ 更改資料格式卻沒有同步更新本文件第 5 節與 `scripts/check-data.js`

---

## 12. Git 提交規則

- commit 訊息格式：`類型: 簡短說明`（繁體中文）
- 類型只能是：
  - `content`：新增或修正單字、題目、單元
  - `feat`：新功能或新頁面
  - `fix`：修正 bug
  - `style`：樣式調整
  - `docs`：修改 AGENTS.md、README
- 範例：`content: 新增 unit-03 固執與順從（12 字、3 題）`
- 一個 commit 只做一件事；新增單元與修改程式要分開 commit。

---

## 13. 完成後回報格式

完成任務後，向使用者簡短回報：

1. 修改／新增了哪些檔案
2. 新增了哪些單字或題目（列出單字即可）
3. 檢查清單的結果
4. 標記為 `verify: true`、需要人工確認的項目（若有）
