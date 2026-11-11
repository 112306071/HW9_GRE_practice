# GRE 單字小卡與練習

依主題分組的 GRE 高頻單字練習網站：用**單字小卡**記憶，再用**題目練習**檢驗。答錯的字會自動加入「不熟」清單，方便集中複習。

🔗 網站：https://112306071.github.io/HW9_GRE_practice/

## 功能

- **單字小卡**：翻面看中英釋義、例句、同義字與反義字；可洗牌、標記不熟、只看不熟的字。
- **題目練習**：混合 6 種題型：
  - 依單字資料自動出題：看英文選中文、看中文選英文、例句填空、同義字
  - 自編 GRE 題型：Text Completion、Sentence Equivalence
- 進度（不熟清單、最佳成績）存在瀏覽器的 localStorage。

目前收錄 **6 個單元、65 個單字、18 題 GRE 題型**。

## 技術

純 HTML + CSS + JavaScript，不使用框架、不需要 build，直接雙擊 `index.html` 就能使用。

## 專案結構

```
index.html / flashcards.html / quiz.html   三個頁面
assets/style.css, assets/app.js            共用樣式與邏輯
data/units.js                              單元註冊表
data/units/unit-XX.js                      各單元的單字與題目
scripts/check-data.js                      資料檢查腳本
AGENTS.md                                  給 AI agent 的專案規則
CLAUDE.md                                  Claude Code 入口（引用 AGENTS.md）
```

## 新增內容

本專案設計成「內容與程式分離」，新增單元只需要在 `data/` 底下新增資料檔並登記，不需要修改任何程式。

完整規則與步驟請見 [AGENTS.md](AGENTS.md)。使用 AI 時可以直接說：

> 依照 AGENTS.md 新增 unit-07 勇敢與膽怯

新增後執行檢查：

```bash
node scripts/check-data.js
```
