/* =========================================================
   약사를 위한 질병 기본교양 — 공통 인터랙션 (바닐라 JS · 외부 의존 없음)
   ASP 교재와 동일한 UX 규칙을 공유한다.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. 모바일 사이드바 드로어 ---------- */
  function initSidebar() {
    var sidebar = document.querySelector(".sidebar");
    var burger = document.querySelector(".hamburger");
    var scrim = document.querySelector(".scrim");
    if (!sidebar || !burger) return;
    function open() {
      sidebar.classList.add("open");
      if (scrim) scrim.classList.add("show");
      burger.setAttribute("aria-expanded", "true");
    }
    function close() {
      sidebar.classList.remove("open");
      if (scrim) scrim.classList.remove("show");
      burger.setAttribute("aria-expanded", "false");
    }
    burger.addEventListener("click", function () {
      sidebar.classList.contains("open") ? close() : open();
    });
    if (scrim) scrim.addEventListener("click", close);
    document.querySelectorAll("[data-open-toc]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        sidebar.classList.contains("open") ? close() : open();
      });
    });
    sidebar.querySelectorAll(".toc a").forEach(function (a) {
      a.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 860px)").matches) close();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 2. 스크롤스파이 ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
    if (!links.length) return;
    var map = {};
    var sections = [];
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) { map[id] = a; sections.push(el); }
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          var active = map[en.target.id];
          if (active) active.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }

  /* ---------- 3. Quiz reveal (정답 보기) ---------- */
  function initQuiz() {
    document.querySelectorAll(".qcard .reveal-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ans = btn.parentElement.querySelector(".answer");
        if (!ans) return;
        var shown = ans.classList.toggle("show");
        btn.textContent = shown ? "정답 숨기기" : "정답 보기";
      });
    });
  }

  /* ---------- 4. MCQ ---------- */
  function initMCQ() {
    document.querySelectorAll(".mcq").forEach(function (list) {
      var answer = list.getAttribute("data-answer");
      list.querySelectorAll("li").forEach(function (li) {
        li.addEventListener("click", function () {
          if (list.getAttribute("data-done")) return;
          list.setAttribute("data-done", "1");
          list.querySelectorAll("li").forEach(function (x) {
            if (x.getAttribute("data-opt") === answer) x.classList.add("correct");
          });
          if (li.getAttribute("data-opt") !== answer) li.classList.add("wrong");
          var exp = list.parentElement.querySelector(".mcq-exp");
          if (exp) exp.style.display = "block";
        });
      });
    });
  }

  /* ---------- 5. 일반 selector (탭) ---------- */
  function initSelectors() {
    document.querySelectorAll("[data-selector]").forEach(function (root) {
      var btns = root.querySelectorAll(".sel-btn");
      var panels = root.querySelectorAll(".sel-panel");
      function show(target) {
        btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-target") === target); });
        panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === target); });
      }
      btns.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-target")); }); });
      if (btns.length) show(btns[0].getAttribute("data-target"));
    });
  }

  /* ---------- 6. Quick Review 플로팅 패널 ---------- */
  function initQuickReview() {
    var root = document.querySelector(".quickrev");
    if (!root) return;
    var btn = root.querySelector(".quickrev__btn");
    var panel = root.querySelector(".quickrev__panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function (e) { e.stopPropagation(); panel.classList.toggle("show"); });
    document.addEventListener("click", function (e) { if (!root.contains(e.target)) panel.classList.remove("show"); });
  }

  /* ---------- 7. Case Hero 버튼 ---------- */
  function initCaseHero() {
    document.querySelectorAll("[data-case-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetSel = btn.getAttribute("data-case-btn");
        if (targetSel.charAt(0) === "#") {
          var el = document.querySelector(targetSel);
          if (el) el.scrollIntoView({ behavior: "smooth" });
          return;
        }
        var box = btn.closest(".case-hero").querySelector("[data-case-reveal='" + targetSel + "']");
        if (box) box.classList.toggle("show");
      });
    });
  }

  /* =========================================================
     시각화 1 · BP 결정요인 시뮬레이터
     ========================================================= */
  var BP_FACTORS = {
    // side: co(심박출량) / svr(혈관저항). dir: +1 이면 증가시 BP↑, -1 이면 증가시 BP↓
    heart:  { side: "co",  dir: 1, label: "심박수 (HR)" },
    contr:  { side: "co",  dir: 1, label: "수축력 (Contractility)" },
    volume: { side: "co",  dir: 1, label: "혈액량 (Volume)" },
    diam:   { side: "svr", dir: -1, label: "혈관 직경 (Vessel diameter)" },
    sns:    { side: "svr", dir: 1, label: "교감신경 활성 (SNS)" },
    angii:  { side: "svr", dir: 1, label: "Angiotensin II" }
  };
  function initBpSim() {
    var root = document.querySelector("[data-bpsim]");
    if (!root) return;
    var state = { heart: 0, contr: 0, volume: 0, diam: 0, sns: 0, angii: 0 };
    var numEl = root.querySelector(".bpsim__gauge .num");
    var statusEl = root.querySelector(".bpsim__gauge .status");
    var derivedEl = root.querySelector(".bpsim__derived");

    function renderBars(f) {
      // level -2..+2 -> 5칸 인디케이터. 0을 기준으로 방향으로 채운다.
      var lv = state[f];
      var bars = "";
      for (var i = -2; i <= 2; i++) {
        var on = (lv > 0 && i > 0 && i <= lv) || (lv < 0 && i < 0 && i >= lv) || (i === 0);
        bars += "<i class='" + (on ? "on" : "") + "'></i>";
      }
      return bars;
    }
    function compute() {
      var coIdx = state.heart * BP_FACTORS.heart.dir + state.contr + state.volume;
      var svrIdx = state.diam * BP_FACTORS.diam.dir + state.sns + state.angii;
      var sbp = 120 + coIdx * 7 + svrIdx * 7;
      var dbp = 80 + coIdx * 3 + svrIdx * 5;
      sbp = Math.max(90, Math.min(210, Math.round(sbp)));
      dbp = Math.max(55, Math.min(130, Math.round(dbp)));
      return { sbp: sbp, dbp: dbp, co: coIdx, svr: svrIdx };
    }
    function render() {
      var r = compute();
      numEl.innerHTML = r.sbp + "<span style='font-size:.5em;color:var(--ink-faint)'> / " + r.dbp + "</span>";
      var band = "ok", txt = "정상 범위";
      if (r.sbp >= 140 || r.dbp >= 90) { band = "hi"; txt = "고혈압 범위"; }
      else if (r.sbp >= 130 || r.dbp >= 80) { band = "mid"; txt = "주의 (Elevated~1기)"; }
      statusEl.className = "status " + band;
      statusEl.textContent = txt;
      derivedEl.innerHTML =
        "심박출량 지표 <b>" + (r.co >= 0 ? "+" : "") + r.co + "</b> · 혈관저항 지표 <b>" + (r.svr >= 0 ? "+" : "") + r.svr + "</b>" +
        "<br>혈관 직경을 <b>줄이면</b> 저항이 커져 혈압이 올라갑니다.";
      // 막대 갱신
      root.querySelectorAll(".bpsim__factor").forEach(function (fx) {
        var key = fx.getAttribute("data-factor");
        var barsEl = fx.querySelector(".bars");
        if (barsEl) barsEl.innerHTML = renderBars(key);
      });
    }
    root.addEventListener("click", function (e) {
      var s = e.target.closest(".stepper");
      if (!s) return;
      var fx = s.closest(".bpsim__factor");
      var key = fx.getAttribute("data-factor");
      var delta = parseInt(s.getAttribute("data-step"), 10);
      state[key] = Math.max(-2, Math.min(2, state[key] + delta));
      render();
    });
    render();
  }

  /* =========================================================
     시각화 2 · flow step 토글 (RAAS/SNS)
     ========================================================= */
  function initFlowSteps() {
    document.querySelectorAll(".fstep .exp").forEach(function (exp) {
      var step = exp.closest(".fstep");
      step.addEventListener("click", function () { step.classList.toggle("open"); });
    });
  }

  /* =========================================================
     시각화 3 · 혈관 노화 슬라이더
     ========================================================= */
  function initVessel() {
    var root = document.querySelector("[data-vessel]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var wall = root.querySelector("[data-vessel-wall]");
    var wallB = root.querySelector("[data-vessel-wall-b]");
    var lumen = root.querySelector("[data-vessel-lumen]");
    var yearsEl = root.querySelector("[data-vessel-years]");
    var elEl = root.querySelector("[data-vessel-elastic]");
    var sbpEl = root.querySelector("[data-vessel-sbp]");
    function render() {
      var t = parseInt(input.value, 10); // 0..20
      var f = t / 20;
      var wallH = 14 + f * 26;        // 벽 두께 14→40
      var lumenH = 92 - f * 44;       // 내경 92→48
      var cy = 100;
      if (wall) { wall.setAttribute("height", wallH); wall.setAttribute("y", cy - lumenH / 2 - wallH); }
      if (wallB) { wallB.setAttribute("height", wallH); wallB.setAttribute("y", cy + lumenH / 2); }
      if (lumen) { lumen.setAttribute("height", lumenH); lumen.setAttribute("y", cy - lumenH / 2); }
      if (yearsEl) yearsEl.textContent = t + "년";
      var elastic = Math.round(100 - f * 55);
      if (elEl) elEl.innerHTML = "탄성 <b>" + elastic + "%</b>";
      var sbp = Math.round(118 + f * 42);
      if (sbpEl) sbpEl.innerHTML = "수축기 혈압 <b>~" + sbp + "</b>";
    }
    input.addEventListener("input", render);
    render();
  }

  /* =========================================================
     시각화 4 · Risk Factor Map
     ========================================================= */
  var RISK = {
    age:      { label: "나이", paths: ["svr"], text: "노화로 혈관 탄성이 감소하고 큰 동맥이 뻣뻣해져 특히 수축기 혈압이 오릅니다." },
    genetics: { label: "유전/가족력", paths: ["vol", "svr", "sns"], text: "혈압 조절에는 수많은 유전적 요소가 관여합니다. 조절 불가능한 위험요인." },
    obesity:  { label: "비만", paths: ["vol", "svr", "sns"], text: "SNS 활성↑, RAAS 변화, insulin resistance, 신장 Na 재흡수↑ 등 여러 경로로 혈압을 올립니다." },
    sodium:   { label: "고염분", paths: ["vol"], text: "Na가 많으면 수분 저류로 혈액량이 증가합니다. salt-sensitive에서 특히 뚜렷." },
    inactive: { label: "운동 부족", paths: ["svr", "sns"], text: "혈관 기능·체중·교감신경 활성에 불리하게 작용합니다." },
    alcohol:  { label: "과음", paths: ["sns", "svr"], text: "지속적인 과음은 혈압 상승과 관련됩니다." },
    ckd:      { label: "만성콩팥병", paths: ["vol", "svr"], text: "Na·수분 조절 장애와 RAAS 변화로 고혈압이 매우 흔합니다." },
    apnea:    { label: "수면무호흡", paths: ["sns"], text: "야간 저산소·각성이 교감신경을 반복 활성화시켜 혈압과 관련됩니다." },
    drugs:    { label: "약물", paths: ["vol", "svr", "sns"], text: "NSAIDs·경구피임약·스테로이드·비충혈제거제 등 다양한 약물이 혈압을 올릴 수 있습니다. (약사 핵심 포인트)" }
  };
  var PATH_LABEL = { vol: "Volume ↑", svr: "Vascular resistance ↑", sns: "SNS ↑" };
  function initRiskMap() {
    var root = document.querySelector("[data-riskmap]");
    if (!root) return;
    var out = root.querySelector(".riskmap__out");
    root.querySelectorAll(".riskcard").forEach(function (card) {
      card.addEventListener("click", function () {
        root.querySelectorAll(".riskcard").forEach(function (c) { c.classList.remove("active"); });
        card.classList.add("active");
        var d = RISK[card.getAttribute("data-risk")];
        if (!d) return;
        var tags = d.paths.map(function (p) { return "<span class='pathtag " + p + "'>" + PATH_LABEL[p] + "</span>"; }).join("");
        out.innerHTML = "<b>" + d.label + "</b> — " + d.text + "<div class='paths'>" + tags + "</div>";
      });
    });
  }

  /* =========================================================
     시각화 5 · Office × Home BP matrix
     ========================================================= */
  var MATRIX = {
    normo:     { title: "지속성 정상혈압", text: "진료실·가정 모두 정상. 일반적으로 정상 범위로 봅니다." },
    white:     { title: "White-coat HTN", text: "진료실에서만 높음. 진료환경·불안의 영향일 수 있습니다. HBPM/ABPM으로 확인합니다." },
    masked:    { title: "Masked HTN", text: "진료실은 정상인데 일상에서 높음. 놓치면 위험하므로 out-of-office 측정이 중요합니다." },
    sustained: { title: "Sustained HTN", text: "진료실·가정 모두 높음. 지속적인 고혈압으로 치료 대상입니다." }
  };
  function initMatrix() {
    var root = document.querySelector("[data-matrix]");
    if (!root) return;
    var out = root.querySelector(".matrix2__out");
    root.querySelectorAll(".cell").forEach(function (cell) {
      cell.addEventListener("click", function () {
        root.querySelectorAll(".cell").forEach(function (c) { c.classList.remove("active"); });
        cell.classList.add("active");
        var d = MATRIX[cell.getAttribute("data-cell")];
        if (d) out.innerHTML = "<b>" + d.title + "</b> — " + d.text;
      });
    });
  }

  /* =========================================================
     시각화 6 · 장기 손상 timeline
     ========================================================= */
  var ORGANS = [
    { key: "brain",  ico: "🧠", name: "뇌",   d: ["혈관 부담 시작", "뇌혈관 손상 위험 축적", "뇌졸중(경색/출혈) 위험 증가"] },
    { key: "heart",  ico: "❤️", name: "심장", d: ["좌심실 부하 증가", "좌심실 비대(LVH)", "장기적으로 심부전 위험"] },
    { key: "kidney", ico: "🫘", name: "콩팥", d: ["사구체 압력 부담", "신기능 저하 시작", "만성콩팥병(CKD) 진행"] },
    { key: "eye",    ico: "👁", name: "눈",   d: ["망막혈관 변화", "고혈압성 망막병증 진행", "시력 위협 가능"] },
    { key: "artery", ico: "🩸", name: "동맥", d: ["내피 기능 이상", "동맥경화 진행", "혈관 손상·경화 심화"] }
  ];
  function initOrganTL() {
    var root = document.querySelector("[data-organtl]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var steps = root.querySelectorAll(".organtl__steps span");
    var grid = root.querySelector(".organtl__grid");
    grid.innerHTML = ORGANS.map(function (o) {
      return "<div class='organcard' data-organ='" + o.key + "'>" +
        "<div class='ico'>" + o.ico + "</div><h6>" + o.name + "</h6>" +
        "<span class='risk lv1'>위험 낮음</span><div class='desc'></div></div>";
    }).join("");
    var riskTxt = ["위험 낮음", "위험 중등도", "위험 높음"];
    function render() {
      var i = parseInt(input.value, 10); // 0,1,2
      steps.forEach(function (s, idx) { s.classList.toggle("on", idx === i); });
      grid.querySelectorAll(".organcard").forEach(function (card) {
        var o = ORGANS.filter(function (x) { return x.key === card.getAttribute("data-organ"); })[0];
        var riskEl = card.querySelector(".risk");
        riskEl.className = "risk lv" + (i + 1);
        riskEl.textContent = riskTxt[i];
        card.querySelector(".desc").textContent = o.d[i];
        card.classList.toggle("hot", i === 2);
      });
    }
    input.addEventListener("input", render);
    render();
  }

  /* =========================================================
     시각화 7 · Drug Mechanism Map
     ========================================================= */
  var DRUGS = {
    acei:    { axis: "raas",   node: "ace",   effect: "relaxed",
      out: "<b>ACE inhibitor</b> — ACE를 차단해 Angiotensin II 생성↓ → 혈관수축·aldosterone↓ → 혈압↓. bradykinin↑로 마른기침이 특징." },
    arb:     { axis: "raas",   node: "at1",   effect: "relaxed",
      out: "<b>ARB</b> — AT₁ 수용체를 차단 → 혈관수축·aldosterone 효과↓ → 혈압↓. bradykinin 영향이 적어 기침이 드묾." },
    mra:     { axis: "raas",   node: "aldo",  effect: "relaxed",
      out: "<b>MRA (spironolactone 등)</b> — aldosterone 수용체를 차단 → Na 저류↓. 저항성 고혈압에서 중요. hyperkalemia 주의." },
    ccb:     { axis: "vessel", node: "catype", effect: "relaxed",
      out: "<b>CCB (amlodipine 등)</b> — 혈관 평활근의 L-type Ca channel 억제 → 혈관 확장 → 저항↓ → 혈압↓. 발목 부종이 흔함." },
    thiazide:{ axis: "volume", node: "nare",  effect: "relaxed",
      out: "<b>Thiazide 이뇨제</b> — 신장의 Na 재흡수↓ → Na·물 배설↑ → 혈액량↓ → 혈압↓. hypoK·요산↑ 주의." },
    bb:      { axis: "heart",  node: "b1",    effect: "relaxed",
      out: "<b>β-blocker</b> — β 수용체 차단 → 심박수·수축력·renin↓ → 혈압↓. 동반질환(허혈성심질환·부정맥 등)에서 특히 유용." }
  };
  function initDrugMap() {
    var root = document.querySelector("[data-drugmap]");
    if (!root) return;
    var out = root.querySelector(".drugmap__out");
    function clearAll() {
      root.querySelectorAll(".mnode").forEach(function (n) { n.classList.remove("blocked", "relaxed"); });
      root.querySelectorAll(".dbtn").forEach(function (b) { b.classList.remove("active"); });
    }
    root.querySelectorAll(".dbtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-drug");
        var d = DRUGS[key];
        if (!d) return;
        var already = btn.classList.contains("active");
        clearAll();
        if (already) { out.innerHTML = "약물 버튼을 눌러 어느 지점을 건드리는지 확인하세요."; return; }
        btn.classList.add("active");
        var node = root.querySelector(".mnode[data-node='" + d.node + "']");
        if (node) node.classList.add(d.effect === "relaxed" && (key === "ccb") ? "relaxed" : "blocked");
        out.innerHTML = d.out;
      });
    });
  }

  /* =========================================================
     FAQ 아코디언 & fact-check(정적)
     ========================================================= */
  function initFaq() {
    document.querySelectorAll(".faq__q").forEach(function (q) {
      q.addEventListener("click", function () { q.closest(".faq__item").classList.toggle("open"); });
    });
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initSidebar();
    initScrollSpy();
    initQuiz();
    initMCQ();
    initSelectors();
    initQuickReview();
    initCaseHero();
    initBpSim();
    initFlowSteps();
    initVessel();
    initRiskMap();
    initMatrix();
    initOrganTL();
    initDrugMap();
    initFaq();
  });
})();
