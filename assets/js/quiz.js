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

  var ALL = [];        // 모든 문제
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
    var r = s[id] || { seen: 0, correct: 0, wrong: 0 };
    r.seen++;
    if (ok) r.correct++; else r.wrong++;
    s[id] = r;
    writeLS(LS_STATS, s);
  }
  function pushHistory(entry) {
    var h = readLS(LS_HISTORY, []);
    h.unshift(entry);
    writeLS(LS_HISTORY, h.slice(0, 30));
  }

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
        return Promise.all(ready.map(function (f) {
          return fetch(Q_DIR + f.file, { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error(f.file); return r.json(); })
            .then(function (list) { return list; })
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
    return ALL.filter(function (q) { return s[q.id] && s[q.id].wrong > 0; });
  }

  function renderStart() {
    var s = getStats();
    var answered = Object.keys(s).length;
    var wrongN = wrongPool().length;
    var hist = readLS(LS_HISTORY, []);

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
        "<div class='qd-stat-row'>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + ALL.length + "</span><span class='qd-stat-l'>전체 문제</span></div>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + answered + "</span><span class='qd-stat-l'>학습한 문제</span></div>" +
          "<div class='qd-stat'><span class='qd-stat-n'>" + wrongN + "</span><span class='qd-stat-l'>오답 문제</span></div>" +
        "</div>" +
        "<div class='qd-actions'>" +
          "<button class='qd-btn qd-btn--primary' id='qdDaily'>데일리 테스트 시작 · " + Math.min(DAILY_COUNT, ALL.length) + "문제</button>" +
          "<button class='qd-btn' id='qdWrong'" + (wrongN ? "" : " disabled") + ">오답 다시 풀기" + (wrongN ? " · " + Math.min(DAILY_COUNT, wrongN) + "문제" : " (없음)") + "</button>" +
        "</div>" +
        "<div class='qd-history'><h3>최근 기록</h3>" + histHtml + "</div>" +
      "</div>";

    document.getElementById("qdDaily").addEventListener("click", function () { startSession("daily"); });
    var wb = document.getElementById("qdWrong");
    if (wb && !wb.disabled) wb.addEventListener("click", function () { startSession("wrong"); });
  }

  /* ---------- 세션 시작 ---------- */
  function startSession(mode) {
    sessionMode = mode;
    var pool = mode === "wrong" ? wrongPool() : ALL;
    current = shuffle(pool).slice(0, DAILY_COUNT).map(function (q) {
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
