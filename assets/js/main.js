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

  /* =========================================================
     ===============  제2강 · 당뇨병 인터랙션  ===============
     ========================================================= */

  /* ---------- 오늘의 질문 옵션 (정답 미공개, 브릿지 메시지) ---------- */
  function initCaseOptions() {
    document.querySelectorAll("[data-case-options]").forEach(function (root) {
      var out = root.querySelector("[data-case-bridge]");
      root.querySelectorAll("button[data-opt]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (out) out.classList.add("show");
        });
      });
    });
  }

  /* ---------- 시각화 1 · Glucose Journey ---------- */
  function initGlucoseJourney() {
    var root = document.querySelector("[data-glucose-journey]");
    if (!root) return;
    var blood = root.querySelector(".gj__blood");
    var insulinOn = true;
    var baseline = 3;
    var count = baseline;
    var uptake = { muscle: 0, liver: 0, adipose: 0 };
    var timer = null;
    var pill = root.querySelector(".gj__pill");
    var levelEl = root.querySelector(".gj__level");
    var organEls = {
      muscle: root.querySelector("[data-organ-cnt='muscle']"),
      liver: root.querySelector("[data-organ-cnt='liver']"),
      adipose: root.querySelector("[data-organ-cnt='adipose']")
    };
    function renderDots() {
      var html = "";
      for (var i = 0; i < count; i++) html += "<span class='gj__dot'></span>";
      blood.innerHTML = html;
    }
    function renderStatus() {
      pill.className = "gj__pill " + (insulinOn ? "on" : "off");
      pill.textContent = insulinOn ? "Insulin ON" : "Insulin OFF";
      var lvl = count <= 5 ? "정상" : count <= 10 ? "식후 상승" : "높음";
      levelEl.className = "gj__level " + (count <= 5 ? "bpband n" : count <= 10 ? "bpband e" : "bpband h");
      levelEl.textContent = "혈당: " + lvl + " (glucose " + count + ")";
      Object.keys(organEls).forEach(function (k) {
        if (organEls[k]) organEls[k].textContent = uptake[k];
      });
    }
    function tick() {
      if (insulinOn && count > baseline) {
        count -= 1;
        var target = ["muscle", "liver", "adipose"][count % 3];
        // liver는 "생산 억제"라 uptake로 세지 않고 근육/지방 위주
        if (target === "liver") target = "muscle";
        uptake[target] += 1;
        renderDots(); renderStatus();
      }
    }
    function ensureTimer() { if (!timer) timer = setInterval(tick, 500); }
    root.querySelectorAll("[data-gj]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-gj");
        if (act === "eat") { count += 9; renderDots(); renderStatus(); ensureTimer(); }
        else if (act === "insulin") { insulinOn = !insulinOn; renderStatus(); ensureTimer(); }
        else if (act === "reset") { count = baseline; uptake = { muscle: 0, liver: 0, adipose: 0 }; insulinOn = true; renderDots(); renderStatus(); }
      });
    });
    renderDots(); renderStatus();
  }

  /* ---------- 시각화 2 · Disease Progression ---------- */
  function initProgression() {
    var root = document.querySelector("[data-progression]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var stageEl = root.querySelector(".prog__stage");
    var resFill = root.querySelector(".pbar.res .pbar__fill");
    var secFill = root.querySelector(".pbar.sec .pbar__fill");
    var glcFill = root.querySelector(".pbar.glc .pbar__fill");
    var resV = root.querySelector(".pbar.res .v");
    var secV = root.querySelector(".pbar.sec .v");
    var glcV = root.querySelector(".pbar.glc .v");
    var noteEl = root.querySelector(".prog__note");
    var STAGES = [
      { max: 15, cls: "s1", name: "Stage 1 · Normal", note: "저항 낮음 · 분비 정상 · 혈당 정상." },
      { max: 40, cls: "s2", name: "Stage 2 · Insulin resistance", note: "저항↑ → β-cell이 더 많이 분비(보상). 혈당은 아직 거의 정상." },
      { max: 60, cls: "s3", name: "Stage 3 · Prediabetes", note: "분비가 저항을 따라가기 어려워지며 혈당이 오르기 시작." },
      { max: 82, cls: "s4", name: "Stage 4 · Type 2 diabetes", note: "β-cell 보상 부족 → 혈당 본격 상승." },
      { max: 101, cls: "s5", name: "Stage 5 · Long-standing", note: "β-cell 기능 추가 감소 → 약물 강화·insulin 필요 가능." }
    ];
    function render() {
      var p = parseInt(input.value, 10); // 0..100
      var resistance = Math.min(100, 10 + p * 0.9);
      // 분비: 초기 상승 후 하강(정점 ~45)
      var secretion = p <= 45 ? 45 + p * 1.0 : Math.max(20, 90 - (p - 45) * 1.05);
      // 혈당: ~35 이후 상승
      var glucose = p <= 35 ? 20 : Math.min(100, 20 + (p - 35) * 1.25);
      resFill.style.width = resistance + "%";
      secFill.style.width = secretion + "%";
      glcFill.style.width = glucose + "%";
      if (resV) resV.textContent = Math.round(resistance);
      if (secV) secV.textContent = Math.round(secretion);
      if (glcV) glcV.textContent = Math.round(glucose);
      var st = STAGES.filter(function (s) { return p < s.max; })[0] || STAGES[STAGES.length - 1];
      stageEl.className = "prog__stage " + st.cls;
      stageEl.textContent = st.name;
      if (noteEl) noteEl.textContent = st.note;
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- 시각화 3 · Risk → Mechanism Map (당뇨) ---------- */
  var DIAB_RISK = {
    obesity: { label: "복부비만 (visceral)", chain: "FFA↑ · inflammation · adipokine 변화 → <b>insulin resistance↑</b>" },
    inactive: { label: "운동 부족", chain: "muscle glucose utilization↓ → <b>insulin sensitivity↓</b> · 체중·visceral fat↑" },
    genetics: { label: "유전", chain: "β-cell susceptibility · insulin action에 영향 (조절 어려운 요인)" },
    steroid: { label: "Glucocorticoids", chain: "hepatic glucose output↑ · <b>insulin resistance↑</b> (약물 유발)" },
    diet: { label: "식사 패턴", chain: "총 에너지 과잉 · 정제 탄수화물 · 당 음료 → 체중↑ → 대사 악화" },
    age: { label: "나이", chain: "가령에 따른 위험↑ (단, 젊은 T2DM도 증가)" }
  };
  function initDiabRisk() {
    var root = document.querySelector("[data-diabrisk]");
    if (!root) return;
    var out = root.querySelector(".riskmap__out");
    root.querySelectorAll(".riskcard").forEach(function (card) {
      card.addEventListener("click", function () {
        root.querySelectorAll(".riskcard").forEach(function (c) { c.classList.remove("active"); });
        card.classList.add("active");
        var d = DIAB_RISK[card.getAttribute("data-risk")];
        if (d) out.innerHTML = "<b>" + d.label + "</b><br>" + d.chain + "<div class='paths'><span class='pathtag sns'>→ Hyperglycemia</span></div>";
      });
    });
  }

  /* ---------- 시각화 4 · HbA1c Time Machine ---------- */
  function initHbA1c() {
    var root = document.querySelector("[data-hba1c]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var barsEl = root.querySelector(".hba1c__bars");
    var numEl = root.querySelector(".hba1c__gauge .num");
    var eagEl = root.querySelector(".hba1c__gauge .eag");
    var bandEl = root.querySelector(".hba1c__gauge .band");
    // 12주: 앞 8주 안정(≈120), 최근 4주 slider로 변동
    barsEl.innerHTML = "";
    for (var w = 0; w < 12; w++) {
      var wk = document.createElement("div");
      wk.className = "wk" + (w >= 8 ? " recent" : "");
      wk.innerHTML = "<i></i>";
      barsEl.appendChild(wk);
    }
    function render() {
      var s = parseInt(input.value, 10); // 0..100
      var recentG = 110 + s * 1.4;       // 최근 4주 평균 glucose
      var oldG = 120;
      var weeks = [];
      var wsum = 0, gsum = 0;
      for (var w = 0; w < 12; w++) {
        var g = w >= 8 ? recentG : oldG;
        var weight = w >= 8 ? 2.0 : 1.0; // 최근을 더 크게 반영
        weeks.push(g);
        wsum += weight; gsum += g * weight;
      }
      var avg = gsum / wsum;
      var a1c = (avg + 46.7) / 28.7;
      var bars = barsEl.querySelectorAll(".wk i");
      weeks.forEach(function (g, i) {
        bars[i].style.height = Math.min(100, (g - 80) * 0.9) + "px";
      });
      numEl.textContent = a1c.toFixed(1) + "%";
      eagEl.textContent = "추정 평균혈당 ≈ " + Math.round(avg) + " mg/dL";
      var cls = "n", txt = "정상 범위";
      if (a1c >= 6.5) { cls = "h"; txt = "당뇨병 범위"; }
      else if (a1c >= 5.7) { cls = "e"; txt = "전당뇨병 범위"; }
      bandEl.className = "band bpband " + cls;
      bandEl.textContent = txt;
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- 시각화 6 · Organ Damage Explorer ---------- */
  var ODAMAGE = {
    retina: { name: "👁 망막", what: "고혈당이 미세혈관을 손상시켜 당뇨병망막병증이 진행합니다.", feel: "초기엔 무증상, 진행되면 시야 흐림·비문·시력저하.", check: "정기 안저검사(fundus)." },
    kidney: { name: "🫘 콩팥", what: "사구체 미세혈관 손상으로 당뇨병신장질환이 진행합니다.", feel: "초기 무증상, 진행 시 부종·단백뇨.", check: "urine albumin(ACR) · eGFR." },
    nerve: { name: "🦶 신경", what: "말초신경 손상으로 감각이 저하됩니다.", feel: "손발 저림·통증·감각 둔화. 상처를 잘 못 느낌.", check: "monofilament 등 발 감각 검사 · 정기 발 관리." },
    coronary: { name: "❤️ 관상동맥", what: "대혈관 죽상경화로 관상동맥질환·심근경색 위험↑.", feel: "흉통·호흡곤란(무증상 허혈도 가능).", check: "심혈관 위험 평가 · 지질 · 혈압." },
    brain: { name: "🧠 뇌혈관", what: "죽상경화로 뇌졸중 위험이 증가합니다.", feel: "갑작스런 마비·언어장애·시야 변화.", check: "혈압·지질·흡연 등 위험요인 관리." },
    peripheral: { name: "🦵 말초동맥", what: "말초동맥질환으로 하지 혈류가 감소합니다.", feel: "보행 시 다리 통증(파행)·상처 회복 지연.", check: "맥박·ABI 등 · 발 관리." }
  };
  function initOrganExplorer() {
    var root = document.querySelector("[data-organ-explorer]");
    if (!root) return;
    var panel = root.querySelector(".oexp__panel");
    function show(key) {
      var d = ODAMAGE[key];
      if (!d) return;
      root.querySelectorAll(".otab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-organ") === key); });
      panel.innerHTML =
        "<div class='oexp__row'><span class='k'>무슨 일이?</span>" + d.what + "</div>" +
        "<div class='oexp__row'><span class='k'>환자는 어떻게 느낄까?</span>" + d.feel + "</div>" +
        "<div class='oexp__row'><span class='k'>무엇을 검사할까?</span>" + d.check + "</div>";
    }
    root.querySelectorAll(".otab").forEach(function (t) {
      t.addEventListener("click", function () { show(t.getAttribute("data-organ")); });
    });
    var first = root.querySelector(".otab");
    if (first) show(first.getAttribute("data-organ"));
  }

  /* ---------- 시각화 8 · Drug Organ Map ---------- */
  function initDrugOrganMap() {
    var root = document.querySelector("[data-drugmap2]");
    if (!root) return;
    var cards = Array.prototype.slice.call(root.querySelectorAll(".dcard"));
    // 카드 펼치기
    cards.forEach(function (card) {
      var head = card.querySelector(".dcard__head");
      head.addEventListener("click", function () { card.classList.toggle("open"); });
    });
    // 장기 칩으로 필터/강조
    root.querySelectorAll(".dorgan").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var organ = chip.getAttribute("data-organ");
        var isActive = chip.classList.contains("active");
        root.querySelectorAll(".dorgan").forEach(function (c) { c.classList.remove("active"); });
        cards.forEach(function (c) { c.classList.remove("dim", "match"); });
        if (isActive || organ === "all") return;
        chip.classList.add("active");
        cards.forEach(function (c) {
          if ((c.getAttribute("data-organs") || "").indexOf(organ) >= 0) c.classList.add("match");
          else c.classList.add("dim");
        });
      });
    });
  }

  /* ---------- Hypoglycemia Case Simulator ---------- */
  function initHypoSim() {
    var root = document.querySelector("[data-hyposim]");
    if (!root) return;
    var state = { med: "metformin", meal: "normal", ex: "none" };
    var out = root.querySelector(".hypo__result");
    var riskEl = out.querySelector(".hypo__risk");
    var expEl = out.querySelector(".hypo__exp");
    // med 위험 가중(단독 기준 큰 그림)
    var MED_BASE = { metformin: 0, sglt2: 0, dpp4: 0, su: 2, insulin: 3 };
    var MEAL = { normal: 0, half: 1, fast: 2 };
    var EX = { none: 0, min30: 1, min90: 2 };
    var MED_LABEL = { metformin: "Metformin", sglt2: "SGLT2 inhibitor", dpp4: "DPP-4 inhibitor", su: "Sulfonylurea", insulin: "Insulin" };
    function compute() {
      var base = MED_BASE[state.med];
      var score = base;
      // 저혈당 유발약일 때만 식사/운동이 위험을 크게 키움
      if (base >= 2) { score += MEAL[state.meal] + EX[state.ex]; }
      else { score += Math.max(0, MEAL[state.meal] - 1) * 0.3; }
      var cls, txt, exp;
      if (base < 2) {
        cls = "low"; txt = "저혈당 위험: 낮음";
        exp = MED_LABEL[state.med] + "은 단독으로는 저혈당 위험이 낮은 약입니다. 식사·운동만으로 심한 저혈당을 잘 일으키지 않습니다. (단, insulin/SU와 병용하면 달라집니다.)";
      } else if (score >= 5) {
        cls = "high"; txt = "저혈당 위험: 높음 🔴";
        exp = MED_LABEL[state.med] + "은 insulin secretion을 늘리거나 insulin 그 자체입니다. 여기에 " +
          (state.meal === "fast" ? "금식" : state.meal === "half" ? "식사량 감소" : "정상식") +
          " + " + (state.ex === "min90" ? "장시간 운동" : state.ex === "min30" ? "운동" : "운동 없음") +
          " 조합 → “Insulin은 증가한 상태인데 외부 glucose 공급이 감소”해 저혈당 위험이 큽니다.";
      } else if (score >= 3) {
        cls = "mid"; txt = "저혈당 위험: 중간";
        exp = MED_LABEL[state.med] + " 사용 중에는 식사를 거르거나 운동이 늘면 저혈당 위험이 올라갈 수 있습니다. 규칙적 식사와 혈당 확인을 권합니다.";
      } else {
        cls = "low"; txt = "저혈당 위험: 낮음~중간";
        exp = MED_LABEL[state.med] + " 사용 중이지만 현재 조합에서는 위험이 크지 않습니다. 그래도 식사·활동 변화 시 주의가 필요합니다.";
      }
      riskEl.className = "hypo__risk " + cls;
      riskEl.textContent = txt;
      expEl.textContent = exp;
    }
    root.querySelectorAll(".hypo__opts").forEach(function (grp) {
      var key = grp.getAttribute("data-group");
      grp.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          grp.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          state[key] = b.getAttribute("data-val");
          compute();
        });
      });
      var first = grp.querySelector("button");
      if (first) first.classList.add("active");
    });
    compute();
  }

  /* =========================================================
     ===========  Everyday 01 · 감기 인터랙션  =============
     ========================================================= */

  /* ---------- 읽기 진행바 ---------- */
  function initReadProgress() {
    var bar = document.querySelector(".readprog i");
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 오늘의 상황 · 확인 항목 칩 ---------- */
  var SITUATION = {
    fever: "고열이 뚜렷하면 독감 등 다른 감염 가능성도 생각합니다.",
    body: "심한 근육통·오한·두통은 전형적 감기보다 독감 쪽 단서입니다.",
    dyspnea: "호흡곤란은 단순 감기의 범위를 벗어나는 Red Flag입니다.",
    duration: "증상 기간은 자연경과를 판단하는 핵심입니다.",
    course: "좋아지다가 다시 악화되면 합병증·다른 질환을 고려합니다."
  };
  function initSituation() {
    document.querySelectorAll("[data-situation]").forEach(function (root) {
      var out = root.querySelector(".checkchips__out");
      root.querySelectorAll("button[data-item]").forEach(function (b) {
        b.addEventListener("click", function () {
          b.classList.toggle("active");
          var txt = SITUATION[b.getAttribute("data-item")];
          if (out && txt) out.textContent = txt;
        });
      });
    });
  }

  /* ---------- Viz 1 · Upper Airway Before/After ---------- */
  function initAirway() {
    var root = document.querySelector("[data-airway]");
    if (!root) return;
    var desc = root.querySelector(".airway__desc");
    var TXT = {
      normal: "정상 비점막 — 얇은 점액층과 정상 점막. 코로 편하게 숨을 쉴 수 있습니다.",
      cold: "감기 — 바이러스 감염 → 점막 염증 → 혈관 확장·분비 증가 → 점막이 붓고 점액이 늘어 코막힘·콧물·재채기가 생깁니다. (증상의 상당수는 바이러스 자체보다 우리 면역·염증 반응과 관련됩니다.)"
    };
    root.querySelectorAll(".airway__toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        var st = b.getAttribute("data-state");
        root.querySelectorAll(".airway__toggle button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        root.classList.toggle("is-cold", st === "cold");
        if (desc) desc.textContent = TXT[st];
      });
    });
  }

  /* ---------- Viz 3 · Symptom Fingerprint ---------- */
  var FINGERPRINT = {
    cold: [
      { k: "🤧 코 증상", v: 4 }, { k: "😣 목 증상", v: 3 }, { k: "😷 기침", v: 3 },
      { k: "🤒 고열", v: 1 }, { k: "🥴 심한 몸살", v: 1 }
    ],
    flu: [
      { k: "🤧 코 증상", v: 2 }, { k: "😣 목 증상", v: 2 }, { k: "😷 기침", v: 3 },
      { k: "🤒 고열/발열감", v: 3 }, { k: "🥴 심한 몸살·피로", v: 4 }
    ]
  };
  function initFingerprint() {
    var root = document.querySelector("[data-fingerprint]");
    if (!root) return;
    var rowsEl = root.querySelector(".fp__rows");
    function render(profile) {
      rowsEl.className = "fp__rows " + profile;
      rowsEl.innerHTML = FINGERPRINT[profile].map(function (r) {
        var dots = "";
        for (var i = 1; i <= 4; i++) dots += "<i class='" + (i <= r.v ? "on" : "") + "'></i>";
        return "<div class='fp__row'><span>" + r.k + "</span><span class='fp__dots'>" + dots + "</span></div>";
      }).join("");
      root.querySelectorAll(".fp__toggle button").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-profile") === profile);
      });
    }
    root.querySelectorAll(".fp__toggle button").forEach(function (b) {
      b.addEventListener("click", function () { render(b.getAttribute("data-profile")); });
    });
    render("cold");
  }

  /* ---------- Viz 5 · Build Your Cold Medicine ---------- */
  var BUILD = {
    acetaminophen: { verd: "bad", txt: "이 환자는 열·통증이 없어 지금은 <b>불필요</b>합니다." },
    decongestant: { verd: "good", txt: "심한 <b>코막힘</b>에 적절합니다. (심혈관 기저질환·병용약 확인)" },
    antitussive: { verd: "bad", txt: "기침이 거의 없어 지금은 <b>불필요</b>합니다." },
    antihistamine: { verd: "opt", txt: "<b>콧물</b>이 불편하면 선택적으로 고려. 졸림·구갈 주의." }
  };
  function initBuildMed() {
    var root = document.querySelector("[data-buildmed]");
    if (!root) return;
    var out = root.querySelector(".build__out");
    root.querySelectorAll(".build__pick button").forEach(function (b) {
      b.addEventListener("click", function () { b.classList.toggle("active"); });
    });
    var confirm = root.querySelector("[data-build-confirm]");
    if (confirm) confirm.addEventListener("click", function () {
      var picked = Array.prototype.slice.call(root.querySelectorAll(".build__pick button.active"));
      var html = "";
      if (!picked.length) {
        html = "<div class='build__line opt'>아무 성분도 선택하지 않았습니다. 증상이 가벼우면 자가관리만으로도 충분할 수 있습니다.</div>";
      } else {
        html = picked.map(function (b) {
          var d = BUILD[b.getAttribute("data-comp")];
          return "<div class='build__line " + d.verd + "'>" + b.querySelector(".name").textContent + " — " + d.txt + "</div>";
        }).join("");
      }
      html += "<div class='build__line opt' style='margin-top:8px;'><b>핵심:</b> 모든 성분이 필요한 것은 아니다 — 실제로 불편한 증상에 맞춘 <b>최소한의 약물</b>을 고른다.</div>";
      out.innerHTML = html;
      out.classList.add("show");
    });
  }

  /* =========================================================
     ============  Everyday 02 · 독감 인터랙션  ============
     ========================================================= */

  /* ---------- 정보 칩 (오늘의 상황 · 고위험 레이더 공용) ---------- */
  function initInfoChips() {
    document.querySelectorAll("[data-infochips]").forEach(function (root) {
      var out = root.querySelector(".infochips__out");
      root.querySelectorAll("button[data-text]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("button[data-text]").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          if (out) out.innerHTML = b.getAttribute("data-text");
        });
      });
    });
  }

  /* ---------- Cold vs Flu 증상 분류기 (탭하면 정답 쪽 공개) ---------- */
  function initSymptomSorter() {
    document.querySelectorAll("[data-sorter]").forEach(function (root) {
      root.querySelectorAll(".sortchip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var side = chip.getAttribute("data-side");
          chip.classList.remove("cold", "flu");
          chip.classList.add(side);
          var lab = chip.querySelector(".side");
          if (lab) lab.textContent = side === "cold" ? "감기 쪽" : "독감 쪽";
        });
      });
    });
  }

  /* ---------- Antiviral Decision Flow (hypo CSS 재사용) ---------- */
  function initAntiviral() {
    var root = document.querySelector("[data-antiviral]");
    if (!root) return;
    var state = { severe: "no", highrisk: "no", early: "no" };
    var out = root.querySelector(".hypo__result");
    var riskEl = out.querySelector(".hypo__risk");
    var expEl = out.querySelector(".hypo__exp");
    function compute() {
      var cls, txt, exp;
      if (state.severe === "yes") {
        cls = "high"; txt = "항바이러스제 신속 고려";
        exp = "중증·진행성이거나 입원이 필요한 상황입니다. 검사 결과를 기다리느라 치료를 불필요하게 지연시키지 않는 것이 중요할 수 있고, 발병 후 48시간이 지났더라도 치료가 권고될 수 있습니다.";
      } else if (state.highrisk === "yes") {
        cls = "high"; txt = "항바이러스제 신속 고려";
        exp = "고위험군(고령·소아·임신부·만성 심폐질환·당뇨·면역저하 등)입니다. 합병증 위험이 높아 의심 시 조기 치료의 우선도가 높고, 48시간 이후라도 치료 이득이 있을 수 있습니다.";
      } else if (state.early === "yes") {
        cls = "mid"; txt = "항바이러스 치료 고려 가능";
        exp = "건강한 외래 환자라도 발병 매우 초기(특히 48시간 이내)라면 항바이러스 치료를 고려할 수 있습니다.";
      } else {
        cls = "low"; txt = "대증치료 중심 · 임상상 따라 판단";
        exp = "건강한 사람의 uncomplicated influenza 상당수는 자연회복합니다. 다만 경과 중 악화·Red Flag가 나타나면 재평가합니다.";
      }
      riskEl.className = "hypo__risk " + cls;
      riskEl.textContent = txt;
      expEl.textContent = exp;
    }
    root.querySelectorAll(".hypo__opts").forEach(function (grp) {
      var key = grp.getAttribute("data-group");
      grp.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          grp.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          state[key] = b.getAttribute("data-val");
          compute();
        });
      });
      var first = grp.querySelector("button");
      if (first) first.classList.add("active");
    });
    compute();
  }

  /* =========================================================
     ==========  Core 03 · 이상지질혈증 인터랙션  ==========
     ========================================================= */

  /* ---------- Viz 3 · Atherosclerosis Timeline ---------- */
  var ATHERO = [
    { n: "0 · 정상 동맥", d: "얇고 탄력 있는 정상 혈관. 내피가 건강합니다.", plaque: 4 },
    { n: "1 · LDL entry", d: "혈액 속 LDL particle이 내피 아래로 침투해 retention됩니다.", plaque: 12 },
    { n: "2 · Foam cells", d: "변형·산화된 LDL을 macrophage가 섭취 → foam cell 형성.", plaque: 24 },
    { n: "3 · Fatty streak", d: "여러 foam cell이 모여 초기 병변인 fatty streak.", plaque: 38 },
    { n: "4 · Fibrous plaque", d: "lipid core·염증세포·평활근·fibrous cap으로 구성된 plaque가 혈관을 좁힘.", plaque: 56 },
    { n: "5 · Plaque rupture", d: "plaque가 파열(또는 미란)되며 내부가 노출됩니다.", plaque: 66, rupture: true },
    { n: "6 · Thrombus", d: "혈소판 활성화 → 혈전 → 급성 폐색 → 심근경색/뇌졸중.", plaque: 74, clot: true }
  ];
  function initAthero() {
    var root = document.querySelector("[data-athero]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var plaque = root.querySelector(".athero__plaque");
    var clot = root.querySelector(".athero__clot");
    var stageEl = root.querySelector(".athero__stage");
    var descEl = root.querySelector(".athero__desc");
    var mi = root.querySelector(".oc.mi");
    var stroke = root.querySelector(".oc.stroke");
    function render() {
      var i = parseInt(input.value, 10);
      var s = ATHERO[i];
      plaque.style.width = s.plaque + "%";
      clot.classList.toggle("show", !!s.clot);
      stageEl.textContent = s.n + "  ·  약 " + (i * 5) + "년";
      descEl.textContent = s.d;
      var acute = i >= 6;
      if (mi) mi.classList.toggle("on", acute);
      if (stroke) stroke.classList.toggle("on", acute);
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- Viz 6 · Cardiovascular Risk Stack ---------- */
  function initRiskStack() {
    var root = document.querySelector("[data-riskstack]");
    if (!root) return;
    var marker = root.querySelector(".riskstack__bar i");
    var levelEl = root.querySelector(".riskstack__level");
    function render() {
      var sum = 0, max = 0;
      root.querySelectorAll(".riskstack__opts button").forEach(function (b) {
        var w = parseInt(b.getAttribute("data-w"), 10);
        max += w;
        if (b.classList.contains("active")) sum += w;
      });
      var pct = max ? sum / max * 100 : 0;
      marker.style.left = "calc(" + pct + "% - 3px)";
      var cls, txt;
      if (sum === 0) { cls = "low"; txt = "Low"; }
      else if (sum <= 2) { cls = "mod"; txt = "Moderate"; }
      else if (sum <= 4) { cls = "high"; txt = "High"; }
      else { cls = "vhigh"; txt = "Very high"; }
      levelEl.className = "riskstack__level " + cls;
      levelEl.textContent = "Overall ASCVD risk: " + txt;
    }
    root.querySelectorAll(".riskstack__opts button").forEach(function (b) {
      b.addEventListener("click", function () { b.classList.toggle("active"); render(); });
    });
    render();
  }

  /* ---------- Viz 7 · Lifestyle → Lipid Effect ---------- */
  var LIFELIPID = {
    satfat: { ldl: "down", tg: "neu", hdl: "neu", note: "포화지방↓ → 간 LDL receptor 조절 등을 통해 주로 <b>LDL↓</b>. ‘무엇으로 대체하느냐’(불포화지방·질 좋은 탄수화물)가 중요합니다." },
    weight: { ldl: "neu", tg: "down", hdl: "up", note: "체중 감소 → <b>TG↓</b> · insulin resistance↓ · HDL이 다소 오를 수 있음. TG↑+HDL↓ 형태에서 특히 중요." },
    exercise: { ldl: "neu", tg: "down", hdl: "up", note: "운동은 LDL을 극적으로 낮추진 못해도 <b>TG↓</b>·insulin sensitivity·체중·BP·전반적 CV fitness를 개선." },
    alcohol: { ldl: "neu", tg: "down", hdl: "neu", note: "음주↓ → 특히 <b>TG↓</b>. severe hypertriglyceridemia에서는 음주 여부를 반드시 확인." },
    fiber: { ldl: "down", tg: "neu", hdl: "neu", note: "귀리·콩류 등 soluble fiber → bile acid/cholesterol 대사에 영향 → <b>LDL 다소↓</b>. 단, 매우 높은 LDL을 섬유질만으로 해결하려 하면 안 됩니다." }
  };
  function initLifeLipid() {
    var root = document.querySelector("[data-lifelipid]");
    if (!root) return;
    var note = root.querySelector(".lifelipid__note");
    var arrows = { down: "↓", up: "↑", neu: "↔" };
    function setG(name, dir) {
      var el = root.querySelector(".ll__g." + name + " .arrow");
      if (!el) return;
      el.textContent = arrows[dir];
      el.className = "arrow dir-" + dir;
    }
    root.querySelectorAll(".lifelipid__opts button").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll(".lifelipid__opts button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var d = LIFELIPID[b.getAttribute("data-act")];
        setG("ldl", d.ldl); setG("tg", d.tg); setG("hdl", d.hdl);
        if (note) note.innerHTML = d.note;
      });
    });
  }

  /* ---------- Viz 8 · Statin Mechanism ---------- */
  function initStatinMech() {
    var root = document.querySelector("[data-statinmech]");
    if (!root) return;
    var receptEl = root.querySelector(".sm__recept");
    var dotsEl = root.querySelector(".sm__dots");
    var enzymeEl = root.querySelector(".sm__enzyme");
    var descEl = root.querySelector(".sm__desc");
    function render(on) {
      var receptors = on ? 7 : 3;
      var ldl = on ? 2 : 6;
      receptEl.innerHTML = new Array(receptors + 1).join("<span></span>");
      dotsEl.innerHTML = new Array(ldl + 1).join("<i></i>");
      enzymeEl.className = "sm__enzyme" + (on ? " blocked" : "");
      enzymeEl.textContent = on ? "HMG-CoA reductase ✕ 차단" : "HMG-CoA reductase 작동";
      descEl.innerHTML = on
        ? "Statin이 간 cholesterol 합성을 억제 → 간이 “cholesterol 부족”을 감지 → <b>LDL receptor↑↑</b> → 혈액 속 LDL을 더 많이 회수 → <b>plasma LDL-C↓</b>. (혈액 속 LDL을 직접 녹이는 것이 아님)"
        : "간에 cholesterol이 충분 → LDL receptor 수가 적어 혈액 속 LDL이 많이 남아 있습니다.";
      root.querySelectorAll(".statinmech__toggle button").forEach(function (b) {
        b.classList.toggle("active", (b.getAttribute("data-on") === "1") === on);
      });
    }
    root.querySelectorAll(".statinmech__toggle button").forEach(function (b) {
      b.addEventListener("click", function () { render(b.getAttribute("data-on") === "1"); });
    });
    render(false);
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
    // 제2강 · 당뇨병
    initCaseOptions();
    initGlucoseJourney();
    initProgression();
    initDiabRisk();
    initHbA1c();
    initOrganExplorer();
    initDrugOrganMap();
    initHypoSim();
    // Everyday 01 · 감기
    initReadProgress();
    initSituation();
    initAirway();
    initFingerprint();
    initBuildMed();
    // Everyday 02 · 독감
    initInfoChips();
    initSymptomSorter();
    initAntiviral();
    // Core 03 · 이상지질혈증
    initAthero();
    initRiskStack();
    initLifeLipid();
    initStatinMech();
    // Core 04 · 비만
    initHunger();
    initWLDefense();
    initBmiCalc();
    initWLBenefit();
    // Core 05 · 대사증후군
    initMetNetwork();
    initMetsBuilder();
  });

  /* =========================================================
     ============  Core 05 · 대사증후군 인터랙션  ============
     ========================================================= */

  /* ---------- Metabolic Network (정상 ↔ insulin resistance) ---------- */
  var METNET = {
    normal: {
      rows: [
        { k: "췌장 insulin", dir: "up" }, { k: "근육 glucose uptake", dir: "up" },
        { k: "간 glucose 생산", dir: "down" }, { k: "지방 저장", dir: "up" },
        { k: "혈당 (glucose)", dir: "neu" }, { k: "TG", dir: "neu" }, { k: "혈압 (BP)", dir: "neu" }
      ],
      note: "식후 정상 모드 — insulin이 근육 uptake↑·간 생산↓·지방 저장↑을 조율해 혈당이 정상화됩니다. 여러 장기가 <b>하나의 네트워크</b>로 움직입니다."
    },
    ir: {
      rows: [
        { k: "췌장 insulin", dir: "up" }, { k: "근육 glucose uptake", dir: "down" },
        { k: "간 glucose 생산", dir: "up" }, { k: "FFA / 지방 기능이상", dir: "up" },
        { k: "혈당 (glucose)", dir: "up" }, { k: "TG", dir: "up" }, { k: "혈압 (BP)", dir: "up" }
      ],
      note: "Insulin resistance ON — 근육 uptake↓·간 생산 억제 실패·FFA↑ → 췌장은 insulin을 더 분비(hyperinsulinemia)하지만 <b>혈당↑·TG↑·BP↑</b>가 함께 나타납니다. 이것이 대사증후군 5요소의 공통 뿌리입니다."
    }
  };
  function initMetNetwork() {
    var root = document.querySelector("[data-metnetwork]");
    if (!root) return;
    var rowsEl = root.querySelector(".hz__rows");
    var noteEl = root.querySelector(".metnet__note");
    var arrows = { up: "↑", down: "↓", neu: "↔" };
    function render(mode) {
      var d = METNET[mode];
      rowsEl.innerHTML = d.rows.map(function (r) {
        return "<div class='hz__row'><span>" + r.k + "</span><span class='arrow dir-" + r.dir + "'>" + arrows[r.dir] + "</span></div>";
      }).join("");
      if (noteEl) noteEl.innerHTML = d.note;
      root.querySelectorAll(".metnet__toggle button").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-mode") === mode);
      });
    }
    root.querySelectorAll(".metnet__toggle button").forEach(function (b) {
      b.addEventListener("click", function () { render(b.getAttribute("data-mode")); });
    });
    render("normal");
  }

  /* ---------- Metabolic Syndrome Builder ---------- */
  function initMetsBuilder() {
    var root = document.querySelector("[data-metsbuilder]");
    if (!root) return;
    // criterion: 남성 기준 (waist≥90, TG≥150, HDL<40, BP sys≥130, FPG≥100)
    var FACTORS = {
      waist: { met: function (v) { return v >= 90; }, sev: function (v) { return (v - 80) / 30; }, unit: " cm" },
      tg: { met: function (v) { return v >= 150; }, sev: function (v) { return (v - 100) / 220; }, unit: "" },
      hdl: { met: function (v) { return v < 40; }, sev: function (v) { return (52 - v) / 30; }, unit: "" },
      bp: { met: function (v) { return v >= 130; }, sev: function (v) { return (v - 115) / 45; }, unit: "" },
      fpg: { met: function (v) { return v >= 100; }, sev: function (v) { return (v - 88) / 42; }, unit: "" }
    };
    var scoreEl = root.querySelector(".mets__score");
    var verdictEl = root.querySelector(".mets__verdict");
    var marker = root.querySelector(".mets__riskbar i");
    var riskLab = root.querySelector(".mets__risklab");
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function render() {
      var met = 0, sevSum = 0;
      root.querySelectorAll(".mets__row").forEach(function (row) {
        var key = row.getAttribute("data-f");
        var f = FACTORS[key];
        var v = parseInt(row.querySelector("input").value, 10);
        var valEl = row.querySelector(".val");
        var isMet = f.met(v);
        if (isMet) met++;
        sevSum += clamp01(f.sev(v));
        valEl.className = "val" + (isMet ? " met" : "");
        valEl.innerHTML = v + f.unit + "<span class='dot'></span>";
      });
      scoreEl.innerHTML = met + " <span class='lab'>/ 5 항목</span>";
      var isMets = met >= 3;
      verdictEl.className = "mets__verdict " + (isMets ? "yes" : "no");
      verdictEl.textContent = isMets ? "대사증후군 (≥3 항목)" : "대사증후군 기준 미만";
      var riskPct = sevSum / 5 * 100;
      marker.style.left = "calc(" + Math.max(0, Math.min(100, riskPct)) + "% - 3px)";
      var lvl = riskPct < 25 ? "낮음" : riskPct < 50 ? "중간" : riskPct < 75 ? "높음" : "매우 높음";
      riskLab.textContent = "연속 위험도: " + lvl + " — 진단은 3개에서 나뉘지만 위험은 연속적으로 변합니다.";
    }
    root.querySelectorAll(".mets__row input").forEach(function (inp) {
      inp.addEventListener("input", render);
    });
    render();
  }

  /* =========================================================
     ==============  Core 04 · 비만 인터랙션  ==============
     ========================================================= */

  /* ---------- Viz 1 · Hunger–Satiety Control Center ---------- */
  var HUNGER = {
    fast: {
      rows: [
        { k: "Ghrelin", src: "위", dir: "up" },
        { k: "GLP-1 / PYY", src: "장", dir: "down" },
        { k: "Leptin", src: "지방", dir: "neu" }
      ],
      out: { hunger: "up", satiety: "down", energy: "neu" },
      note: "12시간 공복 → 위에서 <b>ghrelin↑</b>, 장의 <b>GLP-1/PYY↓</b> → 뇌가 hunger를 올립니다."
    },
    meal: {
      rows: [
        { k: "Ghrelin", src: "위", dir: "down" },
        { k: "GLP-1 / PYY", src: "장", dir: "up" },
        { k: "Leptin", src: "지방", dir: "neu" }
      ],
      out: { hunger: "down", satiety: "up", energy: "up" },
      note: "식사 → 위 팽창 + 장의 <b>GLP-1/PYY↑</b> → satiety↑ · hunger↓. (음식의 소화·대사로 TEF도 조금↑)"
    },
    fatloss: {
      rows: [
        { k: "Ghrelin", src: "위", dir: "up" },
        { k: "GLP-1 / PYY", src: "장", dir: "neu" },
        { k: "Leptin", src: "지방", dir: "down" }
      ],
      out: { hunger: "up", satiety: "down", energy: "down" },
      note: "체지방 감소 → <b>leptin↓</b> → 뇌는 “저장이 줄었다”고 인식 → hunger↑ · energy expenditure↓. <b>이것이 감량 후 체중 재증가를 부르는 적응 반응</b>입니다."
    }
  };
  function initHunger() {
    var root = document.querySelector("[data-hunger]");
    if (!root) return;
    var rowsEl = root.querySelector(".hz__rows");
    var noteEl = root.querySelector(".hz__note");
    var arrows = { up: "↑", down: "↓", neu: "↔" };
    function render(sc) {
      var d = HUNGER[sc];
      rowsEl.innerHTML = d.rows.map(function (r) {
        return "<div class='hz__row'><span>" + r.k + " <span class='src'>· " + r.src + "</span></span>" +
          "<span class='arrow dir-" + r.dir + "'>" + arrows[r.dir] + "</span></div>";
      }).join("");
      ["hunger", "satiety", "energy"].forEach(function (k) {
        var g = root.querySelector(".ll__g." + k + " .arrow");
        if (g) { g.textContent = arrows[d.out[k]]; g.className = "arrow dir-" + d.out[k]; }
      });
      if (noteEl) noteEl.innerHTML = d.note;
      root.querySelectorAll(".hz__btns button").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-sc") === sc);
      });
    }
    root.querySelectorAll(".hz__btns button").forEach(function (b) {
      b.addEventListener("click", function () { render(b.getAttribute("data-sc")); });
    });
    render("meal");
  }

  /* ---------- Viz 3 · Weight Loss Defense Slider ---------- */
  function initWLDefense() {
    var root = document.querySelector("[data-wldefense]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var kgEl = root.querySelector(".wl__kg");
    function setBar(name, pct, arrow) {
      var row = root.querySelector(".wl__row." + name);
      if (!row) return;
      row.querySelector(".wl__fill").style.width = pct + "%";
      var v = row.querySelector(".wl__val");
      if (v) v.textContent = arrow;
    }
    function render() {
      var kg = parseInt(input.value, 10);   // 85..100 (현재 체중)
      var lost = 100 - kg;                   // 0..15
      var f = lost / 15;
      if (kgEl) kgEl.textContent = kg + " kg  (−" + lost + " kg)";
      setBar("fat", Math.max(10, 100 - f * 55), f > 0 ? "↓" : "↔");
      setBar("leptin", Math.max(10, 100 - f * 60), f > 0 ? "↓" : "↔");
      setBar("hunger", 30 + f * 60, f > 0 ? "↑" : "↔");
      setBar("energy", Math.max(15, 100 - f * 45), f > 0 ? "↓" : "↔");
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- Viz 4 · BMI Calculator + Risk Layers ---------- */
  function initBmiCalc() {
    var root = document.querySelector("[data-bmicalc]");
    if (!root) return;
    var hIn = root.querySelector("[data-bmi-h]");
    var wIn = root.querySelector("[data-bmi-w]");
    var hLab = root.querySelector("[data-bmi-hlab]");
    var wLab = root.querySelector("[data-bmi-wlab]");
    var valEl = root.querySelector(".bmi__val");
    var catEl = root.querySelector(".bmi__cat");
    function render() {
      var h = parseInt(hIn.value, 10), w = parseInt(wIn.value, 10);
      if (hLab) hLab.textContent = h + " cm";
      if (wLab) wLab.textContent = w + " kg";
      var bmi = w / Math.pow(h / 100, 2);
      valEl.textContent = "BMI " + bmi.toFixed(1);
      var cls, txt;
      if (bmi < 18.5) { cls = "normal"; txt = "저체중"; }
      else if (bmi < 23) { cls = "normal"; txt = "정상"; }
      else if (bmi < 25) { cls = "pre"; txt = "비만 전단계"; }
      else if (bmi < 30) { cls = "ob"; txt = "1단계 비만 (한국 ≥25)"; }
      else if (bmi < 35) { cls = "ob"; txt = "2단계 비만"; }
      else { cls = "ob"; txt = "3단계 비만"; }
      catEl.innerHTML = "<span class='" + cls + "'>" + txt + "</span>";
    }
    hIn.addEventListener("input", render);
    wIn.addEventListener("input", render);
    var toggle = root.querySelector("[data-bmi-toggle]");
    var layers = root.querySelector(".bmi__layers");
    if (toggle && layers) toggle.addEventListener("click", function () {
      var shown = layers.classList.toggle("show");
      toggle.textContent = shown ? "레이어 접기 ▲" : "BMI만 보면 끝? ▼";
    });
    render();
  }

  /* ---------- Weight-loss benefit slider ---------- */
  function initWLBenefit() {
    var root = document.querySelector("[data-wlbenefit]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var pctEl = root.querySelector(".wlb__pct");
    var outEl = root.querySelector(".wlb__out");
    function render() {
      var p = parseInt(input.value, 10); // 0..20
      pctEl.textContent = "−" + p + "%";
      var txt;
      if (p < 3) txt = "아직 뚜렷한 대사 개선을 말하기 이른 구간입니다. 꾸준함이 핵심.";
      else if (p < 8) txt = "<b>5~7% 지속 감량</b> — glycemia·혈압·중성지방 등 대사지표 개선이 시작됩니다(ADA 2026).";
      else if (p < 13) txt = "<b>~10%</b> — 더 큰 대사 개선. 지방간·수면무호흡 등에서도 이득이 커질 수 있습니다.";
      else txt = "<b>15%+</b> — 일부 합병증에서 더 큰 개선 가능. 단 근육 보존(단백질·저항운동)을 함께 챙깁니다.";
      outEl.innerHTML = txt + "<div style='margin-top:6px;font-size:12.5px;color:var(--ink-faint);'>성공 = 정상체중 도달만을 의미하지 않는다.</div>";
    }
    input.addEventListener("input", render);
    render();
  }
})();
