/* ==========================================================
   GRE 單字練習 — 共用邏輯
   - 新增單字／單元不需要修改本檔（見 AGENTS.md 第 8 節）
   - 導覽列唯一來源：NAV 陣列
   ========================================================== */
(function () {
  "use strict";

  // ---------- 設定 ----------
  const NAV = [
    { href: "index.html", label: "首頁" },
    { href: "flashcards.html", label: "單字小卡" },
    { href: "quiz.html", label: "題目練習" }
  ];

  const STORE_PREFIX = "gre-vocab:";
  const POS_LABEL = { "n.": "名詞", "v.": "動詞", "adj.": "形容詞", "adv.": "副詞" };
  const LEVEL_LABEL = { 1: "基礎", 2: "中等", 3: "進階" };
  const AUTO_TYPES = ["en2zh", "zh2en", "cloze", "synonym"];
  const AUTO_LABEL = { en2zh: "看英文選中文", zh2en: "看中文選英文", cloze: "例句填空", synonym: "同義字" };
  const CUSTOM_LABEL = { tc: "Text Completion", se: "Sentence Equivalence" };
  const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

  // ---------- 小工具 ----------
  function $(sel, root) { return (root || document).querySelector(sel); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 例句：把 **word** 轉成 <strong>
  function emphasize(sentence) {
    return escapeHtml(sentence).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  // 題目句子：把 ____ 轉成空格樣式
  function renderBlank(sentence) {
    return escapeHtml(sentence).replace("____", '<span class="blank" aria-label="空格">____</span>');
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }

  // ---------- localStorage（讀不到也要能正常運作） ----------
  const store = {
    get: function (key, fallback) {
      try {
        const raw = localStorage.getItem(STORE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* 忽略 */ }
    }
  };

  function getUnfamiliar() {
    const list = store.get("unfamiliar", []);
    return Array.isArray(list) ? list : [];
  }

  function isUnfamiliar(word) { return getUnfamiliar().indexOf(word) !== -1; }

  function setUnfamiliar(word, flag) {
    const list = getUnfamiliar().filter(function (w) { return w !== word; });
    if (flag) list.push(word);
    store.set("unfamiliar", list);
  }

  // ---------- 單元資料 ----------
  function allUnits() { return Array.isArray(window.GRE_UNITS) ? window.GRE_UNITS : []; }
  function findUnit(id) { return allUnits().find(function (u) { return u.id === id; }) || null; }

  function unitData(id) {
    const data = window.GRE_DATA && window.GRE_DATA[id];
    return data || { words: [], questions: [] };
  }

  function scopeIds(scope) {
    return scope === "all" ? allUnits().map(function (u) { return u.id; }) : [scope];
  }

  function getWords(scope) {
    return scopeIds(scope).flatMap(function (id) {
      return (unitData(id).words || []).map(function (w) { return Object.assign({ unit: id }, w); });
    });
  }

  function getQuestions(scope) {
    return scopeIds(scope).flatMap(function (id) {
      return (unitData(id).questions || []).map(function (q) { return Object.assign({ unit: id }, q); });
    });
  }

  function scopeLabel(scope) {
    const unit = findUnit(scope);
    return unit ? unit.title : "全部單元";
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { console.error("無法載入 " + src); resolve(false); };
      document.body.appendChild(s);
    });
  }

  // 依 data/units.js 的註冊表動態載入所有單元檔
  function loadAllUnits() {
    window.GRE_DATA = window.GRE_DATA || {};
    return Promise.all(allUnits().map(function (u) {
      return window.GRE_DATA[u.id] ? Promise.resolve(true) : loadScript("data/units/" + u.id + ".js");
    }));
  }

  function getParams() { return new URLSearchParams(location.search); }

  function getScopeParam() {
    const id = getParams().get("unit");
    return findUnit(id) ? id : "all";
  }

  function setParam(key, value) {
    const params = getParams();
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }

  // ---------- 導覽列 ----------
  function renderNav() {
    const host = $("#site-nav");
    if (!host) return;
    const page = location.pathname.split("/").pop() || "index.html";
    host.className = "site-header";
    host.innerHTML =
      '<div class="container header-inner">' +
        '<a class="brand" href="index.html"><span class="brand-mark">G</span>GRE 單字練習</a>' +
        '<nav class="nav" aria-label="主選單">' +
          NAV.map(function (item) {
            const current = item.href === page ? ' aria-current="page"' : "";
            return '<a href="' + item.href + '"' + current + ">" + escapeHtml(item.label) + "</a>";
          }).join("") +
        "</nav>" +
      "</div>";
  }

  function fillUnitSelect(select, current) {
    select.innerHTML =
      '<option value="all">全部單元</option>' +
      allUnits().map(function (u) {
        return '<option value="' + u.id + '">' + escapeHtml(u.id.replace("unit-", "Unit ") + "・" + u.title) + "</option>";
      }).join("");
    select.value = current;
  }

  // ==========================================================
  // 首頁
  // ==========================================================
  async function initHome() {
    renderNav();
    await loadAllUnits();

    const words = getWords("all");
    const known = new Set(words.map(function (w) { return w.word; }));
    const unfamiliarCount = getUnfamiliar().filter(function (w) { return known.has(w); }).length;

    $("#stats").innerHTML =
      stat(allUnits().length, "個單元") +
      stat(words.length, "個單字") +
      stat(unfamiliarCount, "個不熟");

    $("#unit-list").innerHTML = allUnits().map(function (u) {
      const data = unitData(u.id);
      const wordCount = (data.words || []).length;
      const qCount = (data.questions || []).length;
      return (
        '<article class="unit-card">' +
          '<span class="unit-no">' + escapeHtml(u.id.replace("unit-", "UNIT ")) + "</span>" +
          "<h3>" + escapeHtml(u.title) + "</h3>" +
          "<p>" + escapeHtml(u.desc) + "</p>" +
          '<span class="unit-meta">' + wordCount + " 個單字・" + qCount + " 題 GRE 題型</span>" +
          '<div class="btn-row">' +
            '<a class="btn btn-primary" href="flashcards.html?unit=' + u.id + '">單字小卡</a>' +
            '<a class="btn btn-ghost" href="quiz.html?unit=' + u.id + '">題目練習</a>' +
          "</div>" +
        "</article>"
      );
    }).join("");

    function stat(value, label) {
      return '<div class="stat"><span class="stat-value">' + value + '</span><span class="stat-label">' + label + "</span></div>";
    }
  }

  // ==========================================================
  // 單字小卡
  // ==========================================================
  async function initFlashcards() {
    renderNav();
    await loadAllUnits();

    const state = { scope: getScopeParam(), onlyUnfamiliar: getParams().get("unfamiliar") === "1", deck: [], index: 0, flipped: false };
    const select = $("#unit-select");
    const onlyBox = $("#only-unfamiliar");

    fillUnitSelect(select, state.scope);
    onlyBox.checked = state.onlyUnfamiliar;

    select.addEventListener("change", function () {
      state.scope = select.value;
      setParam("unit", state.scope === "all" ? null : state.scope);
      buildDeck(false);
    });

    onlyBox.addEventListener("change", function () {
      state.onlyUnfamiliar = onlyBox.checked;
      setParam("unfamiliar", state.onlyUnfamiliar ? "1" : null);
      buildDeck(false);
    });

    $("#shuffle-btn").addEventListener("click", function () { buildDeck(true); });
    $("#prev-btn").addEventListener("click", function () { go(-1); });
    $("#next-btn").addEventListener("click", function () { go(1); });

    document.addEventListener("keydown", function (e) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "select" || tag === "input" || tag === "button") return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    });

    buildDeck(false);

    function buildDeck(doShuffle) {
      let words = getWords(state.scope);
      if (state.onlyUnfamiliar) {
        const unf = getUnfamiliar();
        words = words.filter(function (w) { return unf.indexOf(w.word) !== -1; });
      }
      state.deck = doShuffle ? shuffle(words) : words;
      state.index = 0;
      state.flipped = false;
      render();
    }

    function go(step) {
      if (!state.deck.length) return;
      state.index = (state.index + step + state.deck.length) % state.deck.length;
      state.flipped = false;
      render();
    }

    function flip() {
      const card = $(".flash-card");
      if (!card) return;
      state.flipped = !state.flipped;
      card.classList.toggle("is-flipped", state.flipped);
    }

    function render() {
      const area = $("#card-area");
      const hasCards = state.deck.length > 0;
      $("#prev-btn").disabled = !hasCards;
      $("#next-btn").disabled = !hasCards;

      if (!hasCards) {
        $("#progress").textContent = "0 / 0";
        area.innerHTML = state.onlyUnfamiliar
          ? '<div class="panel empty-state"><p>這個範圍還沒有標記為「不熟」的單字。</p><p>翻卡時按「標記不熟」，或在題目練習答錯時，單字會自動加入。</p></div>'
          : '<div class="panel empty-state"><p>這個範圍沒有單字。</p></div>';
        return;
      }

      const w = state.deck[state.index];
      const marked = isUnfamiliar(w.word);
      $("#progress").textContent = (state.index + 1) + " / " + state.deck.length;

      area.innerHTML =
        '<div class="flash-card' + (state.flipped ? " is-flipped" : "") + '" role="button" tabindex="0" aria-label="點擊翻面">' +
          '<div class="flash-card-inner">' +
            '<div class="flash-face flash-front">' +
              (marked ? '<span class="unfamiliar-badge">★ 不熟</span>' : "") +
              '<span class="level-badge">' + LEVEL_LABEL[w.level] + "</span>" +
              '<p class="word">' + escapeHtml(w.word) + "</p>" +
              '<p class="pos">' + escapeHtml(w.pos) + " " + (POS_LABEL[w.pos] || "") + "</p>" +
              '<p class="hint">點擊卡片或按空白鍵翻面</p>' +
            "</div>" +
            '<div class="flash-face flash-back">' +
              '<p class="word-sm">' + escapeHtml(w.word) + ' <span class="pos">' + escapeHtml(w.pos) + "</span></p>" +
              '<p class="zh">' + escapeHtml(w.zh) + "</p>" +
              '<p class="en">' + escapeHtml(w.en) + "</p>" +
              '<div class="example">' +
                '<p class="example-en">' + emphasize(w.example) + "</p>" +
                '<p class="example-zh">' + escapeHtml(w.exampleZh) + "</p>" +
              "</div>" +
              '<dl class="relations">' +
                relationRow("同義", w.synonyms) +
                relationRow("反義", w.antonyms) +
              "</dl>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="card-actions">' +
          '<button type="button" class="btn btn-mark' + (marked ? " is-active" : "") + '" id="mark-btn">' +
            (marked ? "★ 已標記不熟" : "☆ 標記不熟") +
          "</button>" +
        "</div>";

      const card = $(".flash-card", area);
      card.addEventListener("click", flip);
      card.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); flip(); }
      });

      $("#mark-btn").addEventListener("click", function () {
        setUnfamiliar(w.word, !isUnfamiliar(w.word));
        if (state.onlyUnfamiliar && !isUnfamiliar(w.word)) {
          state.deck.splice(state.index, 1);
          if (state.index >= state.deck.length) state.index = 0;
        }
        render();
      });
    }

    function relationRow(label, list) {
      if (!list || !list.length) return "";
      return "<div><dt>" + label + "</dt><dd>" +
        list.map(function (x) { return '<span class="chip">' + escapeHtml(x) + "</span>"; }).join("") +
        "</dd></div>";
    }
  }

  // ==========================================================
  // 題目練習
  // ==========================================================

  // 干擾選項：優先選「其他單元、詞性相同」的字，避免同主題近義字造成多個正確答案
  function pickDistractors(target, pool, n) {
    const others = pool.filter(function (w) { return w.word !== target.word && w.zh !== target.zh; });
    const tiers = [
      others.filter(function (w) { return w.unit !== target.unit && w.pos === target.pos; }),
      others.filter(function (w) { return w.unit !== target.unit; }),
      others
    ];
    const chosen = [];
    const seen = new Set();
    tiers.forEach(function (tier) {
      shuffle(tier).forEach(function (w) {
        if (chosen.length < n && !seen.has(w.word)) { seen.add(w.word); chosen.push(w); }
      });
    });
    return chosen;
  }

  function wordSummary(w) {
    return "<p><strong>" + escapeHtml(w.word) + "</strong> " + escapeHtml(w.pos) + " " + escapeHtml(w.zh) + "</p>" +
      "<p>" + emphasize(w.example) + "</p>" +
      '<p class="muted">' + escapeHtml(w.exampleZh) + "</p>";
  }

  function makeAutoQuestion(type, w, pool) {
    const ds = pickDistractors(w, pool, 3);
    let prompt, correct, others, isWord;

    if (type === "synonym") {
      const exclude = new Set([w.word].concat(w.synonyms || [], w.antonyms || []));
      const candidates = [];
      ds.concat(pickDistractors(w, pool, 12)).forEach(function (d) {
        (d.synonyms || []).forEach(function (s) {
          if (!exclude.has(s) && candidates.indexOf(s) === -1) candidates.push(s);
        });
      });
      if (!w.synonyms || !w.synonyms.length || candidates.length < 3) type = "cloze";
      else {
        correct = randomItem(w.synonyms);
        others = shuffle(candidates).slice(0, 3);
        isWord = true;
        prompt = '<p class="q-instruction">選出與這個字意思最接近的字</p>' +
          '<p class="q-word">' + escapeHtml(w.word) + ' <span class="pos">' + escapeHtml(w.pos) + "</span></p>";
      }
    }

    if (type === "en2zh") {
      correct = w.zh;
      others = ds.map(function (d) { return d.zh; });
      isWord = false;
      prompt = '<p class="q-instruction">選出這個字的中文意思</p>' +
        '<p class="q-word">' + escapeHtml(w.word) + ' <span class="pos">' + escapeHtml(w.pos) + "</span></p>";
    } else if (type === "zh2en") {
      correct = w.word;
      others = ds.map(function (d) { return d.word; });
      isWord = true;
      prompt = '<p class="q-instruction">選出對應的英文單字</p>' +
        '<p class="q-zh">' + escapeHtml(w.zh) + ' <span class="pos">' + escapeHtml(w.pos) + "</span></p>";
    } else if (type === "cloze") {
      correct = w.word;
      others = ds.map(function (d) { return d.word; });
      isWord = true;
      prompt = '<p class="q-instruction">選出最適合填入空格的單字（選項為原形）</p>' +
        '<p class="q-sentence">' + renderBlank(w.example.replace(/\*\*(.+?)\*\*/, "____")) + "</p>";
    }

    const options = shuffle([correct].concat(others));
    return {
      kind: "auto",
      label: AUTO_LABEL[type],
      promptHtml: prompt,
      options: options,
      answer: [options.indexOf(correct)],
      multi: false,
      isWord: isWord,
      word: w,
      explainHtml: wordSummary(w)
    };
  }

  function makeCustomQuestion(q) {
    const order = shuffle(q.options.map(function (_, i) { return i; }));
    const instruction = q.type === "se"
      ? "選出「兩個」放入空格後，句意完整且意思相同的字"
      : "選出最適合填入空格的字";
    return {
      kind: "custom",
      label: CUSTOM_LABEL[q.type],
      promptHtml: '<p class="q-instruction">' + instruction + "</p>" +
        '<p class="q-sentence">' + renderBlank(q.sentence) + "</p>",
      options: order.map(function (i) { return q.options[i]; }),
      answer: q.answer.map(function (a) { return order.indexOf(a); }).sort(),
      multi: q.type === "se",
      isWord: true,
      source: q,
      explainHtml: "<p>" + escapeHtml(q.explain) + "</p>"
    };
  }

  function buildQuiz(scope, count) {
    const words = getWords(scope);
    const pool = getWords("all");
    const customs = shuffle(getQuestions(scope));
    if (!words.length) return [];

    const customCount = Math.min(customs.length, Math.round(count * 0.3));
    const autoCount = count - customCount;

    const picked = [];
    while (picked.length < autoCount) picked.push.apply(picked, shuffle(words));

    let types = [];
    const autos = picked.slice(0, autoCount).map(function (w) {
      if (!types.length) types = shuffle(AUTO_TYPES);
      return makeAutoQuestion(types.pop(), w, pool);
    });

    return shuffle(autos.concat(customs.slice(0, customCount).map(makeCustomQuestion)));
  }

  async function initQuiz() {
    renderNav();
    await loadAllUnits();

    const setup = $("#quiz-setup");
    const area = $("#quiz-area");
    const select = $("#unit-select");
    const countSelect = $("#count-select");
    const state = { scope: getScopeParam(), count: 10, questions: [], index: 0, score: 0, wrong: [] };

    fillUnitSelect(select, state.scope);
    updateInfo();

    select.addEventListener("change", function () {
      state.scope = select.value;
      setParam("unit", state.scope === "all" ? null : state.scope);
      updateInfo();
    });

    $("#start-btn").addEventListener("click", start);

    function updateInfo() {
      const w = getWords(state.scope).length;
      const q = getQuestions(state.scope).length;
      $("#setup-info").textContent = "「" + scopeLabel(state.scope) + "」共 " + w + " 個單字、" + q + " 題 GRE 題型。";
    }

    function start() {
      state.count = parseInt(countSelect.value, 10) || 10;
      state.questions = buildQuiz(state.scope, state.count);
      state.index = 0;
      state.score = 0;
      state.wrong = [];
      setup.hidden = true;
      area.hidden = false;
      renderQuestion();
    }

    function renderQuestion() {
      const q = state.questions[state.index];
      const total = state.questions.length;
      const selected = [];

      area.innerHTML =
        '<div class="quiz-top"><span>第 ' + (state.index + 1) + " / " + total + " 題</span><span>答對 " + state.score + "</span></div>" +
        '<div class="progress-bar"><span></span></div>' +
        '<section class="panel">' +
          '<span class="q-type">' + escapeHtml(q.label) + "</span>" +
          q.promptHtml +
          '<div class="quiz-options">' +
            q.options.map(function (opt, i) {
              return '<button type="button" class="quiz-option" data-index="' + i + '">' +
                '<span class="option-key">' + OPTION_KEYS[i] + "</span>" +
                '<span class="option-text' + (q.isWord ? " is-word" : "") + '">' + escapeHtml(opt) + "</span>" +
              "</button>";
            }).join("") +
          "</div>" +
          '<div id="feedback"></div>' +
          '<div class="quiz-actions">' +
            (q.multi ? '<button type="button" class="btn btn-primary" id="confirm-btn" disabled>確認答案</button>' : "") +
            '<button type="button" class="btn btn-primary" id="next-btn" hidden>' + (state.index + 1 < total ? "下一題 →" : "看結果") + "</button>" +
          "</div>" +
        "</section>";

      $(".progress-bar span", area).style.width = (state.index / total * 100) + "%";

      const buttons = Array.prototype.slice.call(area.querySelectorAll(".quiz-option"));
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          const i = parseInt(btn.dataset.index, 10);
          if (!q.multi) { grade([i]); return; }
          const pos = selected.indexOf(i);
          if (pos !== -1) selected.splice(pos, 1);
          else if (selected.length < 2) selected.push(i);
          buttons.forEach(function (b, bi) { b.classList.toggle("is-selected", selected.indexOf(bi) !== -1); });
          $("#confirm-btn").disabled = selected.length !== 2;
        });
      });

      if (q.multi) $("#confirm-btn").addEventListener("click", function () { grade(selected.slice()); });

      $("#next-btn").addEventListener("click", function () {
        state.index += 1;
        if (state.index < state.questions.length) renderQuestion();
        else renderResult();
      });

      function grade(chosen) {
        const isCorrect = chosen.length === q.answer.length &&
          chosen.every(function (c) { return q.answer.indexOf(c) !== -1; });

        buttons.forEach(function (b, bi) {
          b.disabled = true;
          b.classList.remove("is-selected");
          if (q.answer.indexOf(bi) !== -1) b.classList.add("is-correct");
          else if (chosen.indexOf(bi) !== -1) b.classList.add("is-wrong");
        });

        if (isCorrect) state.score += 1;
        else {
          state.wrong.push(q);
          if (q.kind === "auto") setUnfamiliar(q.word.word, true);
        }

        const answerText = q.answer.map(function (a) { return q.options[a]; }).join("、");
        $("#feedback").innerHTML =
          '<div class="feedback ' + (isCorrect ? "is-correct" : "is-wrong") + '">' +
            '<p class="feedback-title">' + (isCorrect ? "答對了！" : "答錯了，正確答案是：" + escapeHtml(answerText)) + "</p>" +
            q.explainHtml +
            (!isCorrect && q.kind === "auto" ? '<p class="muted">已自動加入「不熟」清單。</p>' : "") +
          "</div>";

        if (q.multi) $("#confirm-btn").hidden = true;
        const next = $("#next-btn");
        next.hidden = false;
        next.focus();
      }
    }

    function renderResult() {
      const total = state.questions.length;
      const pct = Math.round(state.score / total * 100);
      const best = store.get("best-score", {});
      const bestMap = best && typeof best === "object" ? best : {};
      const prevBest = typeof bestMap[state.scope] === "number" ? bestMap[state.scope] : null;
      if (prevBest === null || pct > prevBest) { bestMap[state.scope] = pct; store.set("best-score", bestMap); }

      let message = "繼續加油，多翻幾次小卡會更熟！";
      if (pct === 100) message = "全對！太厲害了！";
      else if (pct >= 80) message = "表現很好，再複習一下答錯的字就更完美了。";
      else if (pct >= 60) message = "不錯的開始，把不熟的字多看幾遍吧。";

      area.innerHTML =
        '<section class="panel">' +
          '<div class="result-head">' +
            '<p class="muted">' + escapeHtml(scopeLabel(state.scope)) + "・" + total + " 題</p>" +
            '<p class="result-score">' + state.score + " / " + total + "</p>" +
            "<p>" + pct + "%・" + message + "</p>" +
            '<p class="muted">' + (prevBest === null || pct > prevBest ? "新的最佳成績！" : "最佳成績：" + prevBest + "%") + "</p>" +
          "</div>" +
          (state.wrong.length
            ? "<h2>答錯的題目</h2>" +
              '<ul class="wrong-list">' + state.wrong.map(wrongItem).join("") + "</ul>"
            : "") +
          '<div class="btn-row">' +
            '<button type="button" class="btn btn-primary" id="retry-btn">再練一次</button>' +
            '<button type="button" class="btn btn-ghost" id="setup-btn">換個範圍</button>' +
            (state.wrong.some(function (q) { return q.kind === "auto"; })
              ? '<a class="btn btn-ghost" href="flashcards.html?' + (state.scope === "all" ? "" : "unit=" + state.scope + "&") + 'unfamiliar=1">複習不熟的字</a>'
              : "") +
          "</div>" +
        "</section>";

      $("#retry-btn").addEventListener("click", start);
      $("#setup-btn").addEventListener("click", function () {
        area.hidden = true;
        setup.hidden = false;
      });
    }

    function wrongItem(q) {
      if (q.kind === "auto") {
        return "<li><strong>" + escapeHtml(q.word.word) + "</strong> " + escapeHtml(q.word.pos) + " " + escapeHtml(q.word.zh) +
          ' <span class="muted">（' + escapeHtml(q.label) + "）</span></li>";
      }
      const ans = q.answer.map(function (a) { return q.options[a]; }).join("、");
      return "<li>" + renderBlank(q.source.sentence) + '<br><span class="muted">答案：</span><strong>' + escapeHtml(ans) + "</strong></li>";
    }
  }

  // ---------- 對外介面 ----------
  window.GRE = {
    initHome: initHome,
    initFlashcards: initFlashcards,
    initQuiz: initQuiz
  };
})();
