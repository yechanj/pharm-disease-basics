/* =========================================================
   데일리 테스트 (문제은행 기반 복습)
   - assets/data/questions/index.json → 각 질병 JSON 로드
   - 질병 섞어 랜덤 10문제 / 오답 다시 풀기
   - 점수·오답을 localStorage에 저장
   순수 JS · 외부 의존성 없음
   ========================================================= */
(function () {
  "use strict";

  var Q_DIR = "assets/data/questions/";
  var DAILY_COUNT = 10;
  var LS_STATS = "pharm_quiz_stats";     // { id: {seen, correct, wrong} }
  var LS_HISTORY = "pharm_quiz_history"; // [{date, mode, score, total}]
  var LS_CYCLE = "pharm_quiz_cycle";     // 이번 회차에 이미 출제된 문제 id 배열
  var LS_FILTER = "pharm_quiz_filter";   // { coreOn, coreFrom, coreTo, everydayOn, everydayFrom, everydayTo }

  var ALL = [];        // 모든 문제
  var INDEX_META = []; // 로드된 파일 메타 [{category, no, disease}]
  var current = [];    // 이번 세션 문제들
  var pos = 0;         // 현재 문제 인덱스
  var sessionScore = 0;
  var sessionMode = "daily";

  var el = {};

  /* ---------- localStorage 유틸 ---------- */
  function readLS(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function getStats() { return readLS(LS_STATS, {}); }
  function recordAnswer(id, ok) {
    var s = getStats();
    var r = s[id] || { seen: 0, correct: 0, wrong: 0, streak: 0 };
    r.seen++;
    if (ok) { r.correct++; r.streak = (r.streak || 0) + 1; }
    else     { r.wrong++;   r.streak = 0; }
    s[id] = r;
    writeLS(LS_STATS, s);
  }
  function pushHistory(entry) {
    var h = readLS(LS_HISTORY, []);
    h.unshift(entry);
    writeLS(LS_HISTORY, h.slice(0, 30));
  }

  /* ---------- 순환(coverage) 출제: 이번 회차에 이미 낸 문제 추적 ---------- */
  function getServed() { return readLS(LS_CYCLE, []); }
  function markServed(id) {
    var s = getServed();
    if (s.indexOf(id) < 0) { s.push(id); writeLS(LS_CYCLE, s); }
  }
  function resetCycle() { writeLS(LS_CYCLE, []); }

  /* ---------- 배열 셔플 (Fisher–Yates) ---------- */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function levelKo(lv) { return lv === 1 ? "핵심" : lv === 2 ? "기전" : "통합"; }
  function levelEn(lv) { return lv === 1 ? "Core" : lv === 2 ? "Mechanism" : "Integration"; }

  /* ---------- 데이터 로드 ---------- */
  function loadAll() {
    return fetch(Q_DIR + "index.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("index"); return r.json(); })
      .then(function (idx) {
        var ready = (idx.files || []).filter(function (f) { return f.status === "ready"; });
        INDEX_META = ready.map(function (f) { return { category: f.category, no: f.no, disease: f.disease }; });
        return Promise.all(ready.map(function (f) {
          return fetch(Q_DIR + f.file, { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error(f.file); return r.json(); })
            .then(function (list) {
              list.forEach(function (q) { q._cat = f.category; q._no = f.no; });
              return list;
            })
            .catch(function () { return []; });
        }));
      })
      .then(function (lists) {
        ALL = [];
        lists.forEach(function (l) { ALL = ALL.concat(l); });
        return ALL;
      });
  }

  /* ---------- 시작 화면 ---------- */
  function wrongPool() {
    var s = getStats();
    return getFilteredPool().filter(function (q) { var r = s[q.id]; return r && r.wrong > 0 && (r.streak || 0) < 2; });
  }

  /* ---------- 출제 범위 필터 ---------- */
  function getCatNos(cat) {
    var nos = [];
    INDEX_META.forEach(function (m) { if (m.category === cat) nos.push(m.no); });
    return nos.sort(function (a, b) { return a - b; });
  }

  function defaultFilter() {
    var cn = getCatNos("core"), en = getCatNos("everyday");
    return {
      coreOn: cn.length > 0,
      coreFrom: cn[0] || 1,
      coreTo: cn[cn.length - 1] || 1,
      everydayOn: en.length > 0,
      everydayFrom: en[0] || 1,
      everydayTo: en[en.length - 1] || 1
    };
  }

  function readFilter() {
    var saved = readLS(LS_FILTER, null);
    var def = defaultFilter();
    if (!saved) return def;
    var cn = getCatNos("core"), en = getCatNos("everyday");
    function validNo(nos, v, fallback) { return nos.indexOf(v) >= 0 ? v : fallback; }
    var cf = validNo(cn, saved.coreFrom, def.coreFrom);
    var ct = validNo(cn, saved.coreTo, def.coreTo);
    var ef = validNo(en, saved.everydayFrom, def.everydayFrom);
    var et = validNo(en, saved.everydayTo, def.everydayTo);
    if (ct < cf) ct = cf;
    if (et < ef) et = ef;
    return {
      coreOn: typeof saved.coreOn === "boolean" ? saved.coreOn : def.coreOn,
      coreFrom: cf, coreTo: ct,
      everydayOn: typeof saved.everydayOn === "boolean" ? saved.everydayOn : def.everydayOn,
      everydayFrom: ef, everydayTo: et
    };
  }

  function getFilteredPool() {
    var f = readFilter();
    return ALL.filter(function (q) {
      if (q._cat === "core") return f.coreOn && q._no >= f.coreFrom && q._no <= f.coreTo;
      if (q._cat === "everyday") return f.everydayOn && q._no >= f.everydayFrom && q._no <= f.everydayTo;
      return true;
    });
  }

  function buildFilterSelect(nos, selected, id) {
    return "<select id='" + id + "' class='qd-fsel'>" +
      nos.map(function (n) {
        return "<option value='" + n + "'" + (n === selected ? " selected" : "") + ">" + n + "강</option>";
      }).join("") +
    "</select>";
  }

  /* 데일리 출제: 이번 회차에 안 낸 문제를 우선, 전부 소진되면 리셋 후 새 회차 */
  function dailyPick() {
    var pool = getFilteredPool();
    var servedSet = {};
    getServed().forEach(function (id) { servedSet[id] = 1; });
    var unseen = pool.filter(function (q) { return !servedSet[q.id]; });
    if (unseen.length === 0) { resetCycle(); unseen = pool.slice(); }
    var picked = shuffle(unseen).slice(0, DAILY_COUNT);
    if (picked.length < DAILY_COUNT) {
      resetCycle();
      var pickedIds = {};
      picked.forEach(function (q) { pickedIds[q.id] = 1; });
      var rest = shuffle(pool.filter(function (q) { return !pickedIds[q.id]; }))
        .slice(0, DAILY_COUNT - picked.length);
      picked = picked.concat(rest);
    }
    return picked;
  }

  function renderStart() {
    var pool = getFilteredPool();
    var s = getStats();
    var answered = pool.filter(function (q) { return s[q.id] && s[q.id].seen > 0; }).length;
    var wrongN = wrongPool().length;
    var servedSet = {};
    getServed().forEach(function (id) { servedSet[id] = 1; });
    var servedCount = pool.filter(function (q) { return servedSet[q.id]; }).length;
    var cycleDone = pool.length > 0 && servedCount >= pool.length;
    var hist = readLS(LS_HISTORY, []);

    var coreNos = getCatNos("core");
    var evNos = getCatNos("everyday");
    var filt = readFilter();

    var filterHtml =
      "<div class='qd-filter'>" +
        "<div class='qd-filter-label'>출제 범위</div>" +
        "<div class='qd-frow" + (!filt.coreOn ? " off" : "") + "'>" +
          "<label class='qd-ftoggle'>" +
            "<input type='checkbox' id='qdf-core-on'" + (filt.coreOn ? " checked" : "") + ">" +
            "<span class='qd-ftoggle-track'><span class='qd-ftoggle-thumb'></span></span>" +
          "</label>" +
          "<span class='qd-fcat'><span class='qd-fcat-badge qd-fcat-badge--core'>CORE</span></span>" +
          (coreNos.length ?
            "<div class='qd-frange'>" +
              buildFilterSelect(coreNos, filt.coreFrom, "qdf-core-from") +
              "<span class='qd-frange-sep'>~</span>" +
              buildFilterSelect(coreNos, filt.coreTo, "qdf-core-to") +
            "</div>"
          : "<span class='qd-fno'>문제 없음</span>") +
        "</div>" +
        "<div class='qd-frow" + (!filt.everydayOn ? " off" : "") + "'>" +
          "<label class='qd-ftoggle'>" +
            "<input type='checkbox' id='qdf-ev-on'" + (filt.everydayOn ? " checked" : "") + ">" +
            "<span class='qd-ftoggle-track'><span class='qd-ftoggle-thumb'></span></span>" +
          "</label>" +
          "<span class='qd-fcat'><span class='qd-fcat-badge qd-fcat-badge--ev'>EVERYDAY</span></span>" +
          (evNos.length ?
            "<div class='qd-frange'>" +
              buildFilterSelect(evNos, filt.everydayFrom, "qdf-ev-from") +
              "<span class='qd-frange-sep'>~</span>" +
              buildFilterSelect(evNos, filt.everydayTo, "qdf-ev-to") +
            "</div>"
          : "<span class='qd-fno'>문제 없음</span>") +
        "</div>" +
      "</div>";

    var histHtml = hist.length
      ? hist.slice(0, 5).map(function (h) {
          var pct = Math.round((h.score / h.total) * 100);
          return "<div class='qd-hrow'><span class='qd-hdate'>" + h.date + "</span>" +
            "<span class='qd-hmode'>" + (h.mode === "wrong" ? "오답복습" : "데일리") + "</span>" +
            "<span class='qd-hscore'>" + h.score + "/" + h.total + " (" + pct + "%)</span></div>";
        }).join("")
      : "<p class='qd-empty'>아직 기록이 없습니다. 첫 데일리 테스트를 시작해 보세요.</p>";

    el.stage.innerHTML =
      "<div class='qd-start'>" +
        filterHtml +
        "<div class='qd-stat-row'>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + pool.length + "</span><span class='qd-stat-l'>선택 문제</span></div>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + answered + "</span><span class='qd-stat-l'>학습한 문제</span></div>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + wrongN + "</span><span class='qd-stat-l'>오답 문제</span></div>" +
        "</div>" +
        "<div class='qd-cycle'>" +
          "<div class='qd-cycle-top'><span>이번 회차 진행</span><span class='qd-cycle-num'>" + servedCount + " / " + pool.length + "</span></div>" +
          "<div class='qd-cycle-bar'><span style='width:" + (pool.length ? Math.round(servedCount / pool.length * 100) : 0) + "%'></span></div>" +
          (cycleDone ? "<div class='qd-cycle-done'>🎉 전체를 한 바퀴 풀었습니다 · 다음 테스트부터 새 회차로 리셋됩니다</div>" :
            "<div class='qd-cycle-hint'>이미 푼 문제는 다시 안 나오고, 전부 풀면 자동으로 리셋돼요</div>") +
        "</div>" +
        "<div class='qd-actions'>" +
          (pool.length
            ? "<button class='qd-btn qd-btn--primary' id='qdDaily'>데일리 테스트 시작 · " + Math.min(DAILY_COUNT, pool.length) + "문제</button>"
            : "<button class='qd-btn qd-btn--primary' disabled>범위를 선택해 주세요</button>") +
          "<button class='qd-btn' id='qdWrong'" + (wrongN ? "" : " disabled") + ">오답 다시 풀기" + (wrongN ? " · " + Math.min(DAILY_COUNT, wrongN) + "문제" : " (없음)") + "</button>" +
          "<button class='qd-btn qd-btn--ghost' id='qdProgress'>과목별 진행도</button>" +
        "</div>" +
        "<div class='qd-history'><h3>최근 기록</h3>" + histHtml + "</div>" +
      "</div>";

    var db = document.getElementById("qdDaily");
    if (db && !db.disabled) db.addEventListener("click", function () { startSession("daily"); });
    var wb = document.getElementById("qdWrong");
    if (wb && !wb.disabled) wb.addEventListener("click", function () { startSession("wrong"); });
    var pb = document.getElementById("qdProgress");
    if (pb) pb.addEventListener("click", function () { renderProgress(); window.scrollTo(0, 0); });

    function readCurrentFilter() {
      function gv(id, fallback) { var e = document.getElementById(id); return e ? e.value : fallback; }
      function gc(id, fallback) { var e = document.getElementById(id); return e ? e.checked : fallback; }
      return {
        coreOn: gc("qdf-core-on", filt.coreOn),
        coreFrom: parseInt(gv("qdf-core-from", filt.coreFrom), 10),
        coreTo: parseInt(gv("qdf-core-to", filt.coreTo), 10),
        everydayOn: gc("qdf-ev-on", filt.everydayOn),
        everydayFrom: parseInt(gv("qdf-ev-from", filt.everydayFrom), 10),
        everydayTo: parseInt(gv("qdf-ev-to", filt.everydayTo), 10)
      };
    }

    function saveAndRender(f) { writeLS(LS_FILTER, f); renderStart(); }

    var filterBindings = [
      ["qdf-core-on",   function () { saveAndRender(readCurrentFilter()); }],
      ["qdf-ev-on",     function () { saveAndRender(readCurrentFilter()); }],
      ["qdf-core-from", function () { var f = readCurrentFilter(); if (f.coreTo < f.coreFrom) f.coreTo = f.coreFrom; saveAndRender(f); }],
      ["qdf-core-to",   function () { var f = readCurrentFilter(); if (f.coreFrom > f.coreTo) f.coreFrom = f.coreTo; saveAndRender(f); }],
      ["qdf-ev-from",   function () { var f = readCurrentFilter(); if (f.everydayTo < f.everydayFrom) f.everydayTo = f.everydayFrom; saveAndRender(f); }],
      ["qdf-ev-to",     function () { var f = readCurrentFilter(); if (f.everydayFrom > f.everydayTo) f.everydayFrom = f.everydayTo; saveAndRender(f); }]
    ];
    filterBindings.forEach(function (b) {
      var node = document.getElementById(b[0]);
      if (node) node.addEventListener("change", b[1]);
    });
  }

  /* ---------- 과목별 진행도 ---------- */
  function renderProgress() {
    var s = getStats();

    // ALL 문제를 (category, no, disease) 단위로 묶기
    var byKey = {};
    var keyOrder = [];
    ALL.forEach(function (q) {
      var key = q._cat + "|" + q._no;
      if (!byKey[key]) {
        byKey[key] = { cat: q._cat, no: q._no, disease: q.disease, qs: [] };
        keyOrder.push(key);
      }
      byKey[key].qs.push(q);
    });
    keyOrder.sort(function (a, b) {
      var ga = byKey[a], gb = byKey[b];
      if (ga.cat !== gb.cat) return ga.cat === "core" ? -1 : 1;
      return ga.no - gb.no;
    });

    // 카테고리별로 그룹화
    var sections = {}, catOrder = [];
    keyOrder.forEach(function (key) {
      var g = byKey[key];
      if (!sections[g.cat]) { sections[g.cat] = []; catOrder.push(g.cat); }
      sections[g.cat].push(g);
    });

    function cardHtml(g) {
      var n = g.qs.length;
      var correct = 0, wrong = 0, unseen = 0;
      g.qs.forEach(function (q) {
        var r = s[q.id];
        if (!r || !r.seen) { unseen++; }
        else if (r.wrong > 0 && (r.streak || 0) < 2) { wrong++; }
        else { correct++; }
      });
      var pct     = n ? Math.round((correct + wrong) / n * 100) : 0;
      var okPct   = n ? (correct / n * 100).toFixed(2) : 0;
      var noPct   = n ? (wrong   / n * 100).toFixed(2) : 0;
      var noStr   = g.no < 10 ? "0" + g.no : "" + g.no;
      var isCo    = g.cat === "core";
      var badge   = (isCo ? "CORE" : "EVERYDAY") + " " + noStr;
      var bCls    = isCo ? "qd-pgcard-badge--core" : "qd-pgcard-badge--ev";
      var pctCls  = pct >= 100 ? " qd-pgcard-pct--done" : "";

      return "<div class='qd-pgcard'>" +
        "<div class='qd-pgcard-top'>" +
          "<span class='qd-pgcard-badge " + bCls + "'>" + badge + "</span>" +
          "<span class='qd-pgcard-name'>" + escapeHtml(g.disease) + "</span>" +
          "<span class='qd-pgcard-pct" + pctCls + "'>" + pct + "%</span>" +
        "</div>" +
        "<div class='qd-pgbar'>" +
          "<span class='qd-pgbar-ok' style='width:" + okPct + "%'></span>" +
          "<span class='qd-pgbar-no' style='width:" + noPct + "%'></span>" +
        "</div>" +
        "<div class='qd-pgcard-stats'>" +
          "<span class='qd-pgstat--ok'>✓ " + correct + "개</span>" +
          "<span class='qd-pgstat--no'>✗ " + wrong + "개</span>" +
          "<span class='qd-pgstat--un'>○ " + unseen + "개</span>" +
          "<span class='qd-pgstat--tot'>" + n + "문제</span>" +
        "</div>" +
      "</div>";
    }

    var sectHtml = catOrder.map(function (cat) {
      return "<div class='qd-pgsec'>" +
        "<div class='qd-pgsec-label'>" + (cat === "core" ? "CORE" : "EVERYDAY") + "</div>" +
        sections[cat].map(cardHtml).join("") +
      "</div>";
    }).join("");

    el.stage.innerHTML =
      "<div class='qd-pgview'>" +
        "<div class='qd-pgview-head'>" +
          "<button class='qd-pg-back' id='qdPgBack'>← 돌아가기</button>" +
          "<span class='qd-pgview-title'>과목별 진행도</span>" +
        "</div>" +
        sectHtml +
      "</div>";

    document.getElementById("qdPgBack").addEventListener("click", function () {
      renderStart(); window.scrollTo(0, 0);
    });
  }

  /* ---------- 세션 시작 ---------- */
  function startSession(mode) {
    sessionMode = mode;
    var pool = mode === "wrong" ? shuffle(wrongPool()).slice(0, DAILY_COUNT) : dailyPick();
    current = pool.map(function (q) {
      // 보기 순서 셔플: 정답 텍스트를 추적해 새 인덱스 계산
      var order = shuffle([0, 1, 2, 3].slice(0, q.options.length));
      var opts = order.map(function (i) { return q.options[i]; });
      var newAnswer = order.indexOf(q.answer);
      return { q: q, opts: opts, answer: newAnswer, picked: null };
    });
    pos = 0;
    sessionScore = 0;
    renderQuestion();
  }

  /* ---------- 문제 렌더 ---------- */
  function renderQuestion() {
    var item = current[pos];
    var q = item.q;
    var total = current.length;

    var optsHtml = item.opts.map(function (text, i) {
      var letter = String.fromCharCode(65 + i);
      return "<li class='qd-opt' data-i='" + i + "'>" +
        "<span class='qd-optl'>" + letter + "</span>" +
        "<span class='qd-opttx'>" + escapeHtml(text) + "</span>" +
      "</li>";
    }).join("");

    el.stage.innerHTML =
      "<div class='qd-quiz'>" +
        "<div class='qd-prog'><span style='width:" + Math.round(((pos + 1) / total) * 100) + "%'></span></div>" +
        "<div class='qd-head'>" +
          "<div class='qd-qno'><span class='qd-qno-cur'>Q" + (pos + 1) + "</span>" +
            "<span class='qd-qno-tot'>/ " + total + "</span></div>" +
          "<span class='qd-lvpill qd-lv" + q.level + "'>Lv" + q.level + " " + levelKo(q.level) + "</span>" +
        "</div>" +
        "<div class='qd-qtext'>" + escapeHtml(q.question) + "</div>" +
        "<div class='qd-meta'>" +
          "<span class='qd-chip qd-chip--dis'>" + escapeHtml(q.disease) + "</span>" +
          "<span class='qd-chip qd-chip--con'>" + escapeHtml(q.concept) + "</span>" +
          (q.source === "extension" ? "<span class='qd-chip qd-chip--ext'>교재 밖 확장</span>" : "") +
        "</div>" +
        "<ul class='qd-opts'>" + optsHtml + "</ul>" +
        "<div class='qd-exp' hidden></div>" +
        "<div class='qd-nav'><button class='qd-btn qd-btn--primary' id='qdNext' hidden></button></div>" +
      "</div>";

    var listEl = el.stage.querySelector(".qd-opts");
    listEl.querySelectorAll(".qd-opt").forEach(function (li) {
      li.addEventListener("click", function () { pick(parseInt(li.getAttribute("data-i"), 10)); });
    });
  }

  function pick(i) {
    var item = current[pos];
    if (item.picked !== null) return; // 이미 답함
    item.picked = i;
    var ok = i === item.answer;
    if (ok) sessionScore++;
    recordAnswer(item.q.id, ok);
    markServed(item.q.id); // 이번 회차에 푼 문제로 기록 (순환 출제용)

    var listEl = el.stage.querySelector(".qd-opts");
    listEl.classList.add("done");
    listEl.querySelectorAll(".qd-opt").forEach(function (li) {
      var idx = parseInt(li.getAttribute("data-i"), 10);
      if (idx === item.answer) li.classList.add("correct");
      if (idx === i && !ok) li.classList.add("wrong");
    });

    var exp = el.stage.querySelector(".qd-exp");
    exp.className = "qd-exp " + (ok ? "qd-exp--ok" : "qd-exp--no");
    exp.innerHTML = "<b class='qd-exp-h'>" + (ok ? "정답입니다" : "오답입니다") + "</b>" +
      "<span class='qd-exp-txt'>" + escapeHtml(item.q.explanation) + "</span>";
    exp.hidden = false;

    var next = document.getElementById("qdNext");
    next.textContent = (pos + 1 < current.length) ? "다음 문제 →" : "결과 보기";
    next.hidden = false;
    next.addEventListener("click", function () {
      if (pos + 1 < current.length) { pos++; renderQuestion(); window.scrollTo(0, 0); }
      else renderResults();
    });
  }

  /* ---------- 결과 ---------- */
  function renderResults() {
    var total = current.length;
    var pct = total ? Math.round((sessionScore / total) * 100) : 0;
    var today = new Date().toISOString().slice(0, 10);
    pushHistory({ date: today, mode: sessionMode, score: sessionScore, total: total });

    var wrongs = current.filter(function (it) { return it.picked !== it.answer; });
    var wrongHtml = wrongs.length
      ? wrongs.map(function (it) {
          var q = it.q;
          return "<div class='qd-rev'>" +
            "<div class='qd-rev-q'>" + escapeHtml(q.question) + "</div>" +
            "<div class='qd-rev-a'>정답: " + escapeHtml(it.opts[it.answer]) + "</div>" +
            "<div class='qd-rev-e'>" + escapeHtml(q.explanation) + "</div>" +
            "<a class='qd-rev-link' href='lessons/" + q.lessonRef + "'>→ " + escapeHtml(q.disease) + " 강의에서 복습</a>" +
          "</div>";
        }).join("")
      : "<p class='qd-empty'>모두 맞혔습니다! 훌륭해요 🎉</p>";

    var grade = pct >= 90 ? "🎉" : pct >= 70 ? "👍" : pct >= 50 ? "💪" : "📚";

    el.stage.innerHTML =
      "<div class='qd-result'>" +
        "<div class='qd-score'>" + grade + "<span class='qd-score-n'>" + sessionScore + " / " + total + "</span>" +
          "<span class='qd-score-p'>" + pct + "%</span></div>" +
        "<h3>다시 볼 문제 (" + wrongs.length + ")</h3>" +
        "<div class='qd-revlist'>" + wrongHtml + "</div>" +
        "<div class='qd-actions'>" +
          "<button class='qd-btn qd-btn--primary' id='qdAgain'>새 문제로 다시</button>" +
          "<button class='qd-btn' id='qdHome'>처음으로</button>" +
        "</div>" +
      "</div>";

    document.getElementById("qdAgain").addEventListener("click", function () { startSession("daily"); window.scrollTo(0, 0); });
    document.getElementById("qdHome").addEventListener("click", function () { renderStart(); window.scrollTo(0, 0); });
  }

  /* ---------- HTML 이스케이프 ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 초기화 ---------- */
  function init() {
    el.stage = document.getElementById("qdStage");
    if (!el.stage) return;
    el.stage.innerHTML = "<div class='qd-loading'>문제를 불러오는 중…</div>";
    loadAll()
      .then(function () {
        if (!ALL.length) throw new Error("empty");
        renderStart();
      })
      .catch(function (err) {
        el.stage.innerHTML =
          "<div class='qd-error'>" +
            "<b>문제를 불러오지 못했습니다.</b>" +
            "<p>이 페이지는 문제은행(JSON)을 <code>fetch</code>로 읽기 때문에 <b>웹 서버로 열어야</b> 합니다. " +
            "파일을 더블클릭(file://)하면 브라우저 보안 정책상 로드가 막힐 수 있습니다.</p>" +
            "<p>GitHub Pages에 올리면 정상 동작하며, 로컬에서는 VS Code <b>Live Server</b>나 " +
            "<code>python -m http.server</code>로 열어 주세요.</p>" +
          "</div>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
