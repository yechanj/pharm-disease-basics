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
    // Core 21 · 인플루엔자
    initIfzVirus();
    initIfzLife();
    initIfzBody();
    initIfzTime();
    initIfzDoor();
    initIfzTest();
    initIfzWin();
    initIfzRel();
    initIfzCap();
    initIfzDrift();
    initIfzVax();
    initIfzWard();
    initIfzDetect();
    // Core 20 · 감기
    initCldDefense();
    initCldVirus();
    initCldMap();
    initCldNose();
    initCldCough();
    initCldFever();
    initCldTimeline();
    initCldInfMap();
    initCldScen();
    initCldAh();
    initCldRebound();
    initCldReflex();
    initCldMucus();
    initCldAbx();
    initCldBuild();
    initCldDetect();
    // Core 19 · 간경변
    initCirPortal();
    initCirAscites();
    initCirNeph();
    initCirSbp();
    initCirBrain();
    initCirLac();
    initCirKidney();
    initCirLabs();
    initCirCp();
    initCirNsbb();
    initCirTips();
    initCirSafety();
    initCirDetective();
    initCirMaster();
    // Core 18 · 간염
    initHepInjury();
    initHepBili();
    initHepImmune();
    initHepSero();
    initHepNuc();
    initHepReact();
    initHepHcv();
    initHepDaa();
    initHepAbc();
    initHepLab();
    initHepDetective();
    // Core 17 · 담석증
    initGbsJourney();
    initGbsBuilder();
    initGbsRisk();
    initGbsColic();
    initGbsTime();
    initGbsMap();
    initGbsCholang();
    initGbsImaging();
    initGbsErcp();
    initGbsWhere();
    // Core 16 · 설사
    initDiaWater();
    initDiaOsmSec();
    initDiaMed();
    initDiaCdi();
    initDiaDehyd();
    initDiaTriage();
    initDiaOrs();
    initDiaLope();
    initDiaChronic();
    initDiaGap();
    initDiaSim();
    // Everyday 07 · 다래끼
    initStyAnat();
    initStyPath();
    initStyMatch();
    initStyWarm();
    initStyHeat();
    initStyPop();
    initStySpread();
    initStyDo();
    // Everyday 06 · 결막염
    initCjvAnat();
    initCjvThree();
    initCjvChain();
    initCjvMatch();
    initCjvTriage();
    initCjvDrop();
    initCjvLens();
    // Everyday 05 · 알레르기비염
    initAlrMatch();
    initAlrMast();
    initAlrDetect();
    initAlrFinger();
    initAlrExpo();
    initAlrPick();
    initAlrRebound();
    initAlrSpray();
    // Everyday 04 · 수족구병
    initHFMDBodyMap();
    initHFMDTransmit();
    initHFMDSymMatch();
    initHFMDHydration();
    initHFMDSchool();
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
    // Core 15 · 변비
    initDefecCoord();
    initColonTransit();
    initClosedDoor();
    initMedConstip();
    initConstipGate();
    initConstipBranch();
    initImpaction();
    initToiletPosture();
    initOsmotic();
    initSecretagogue();
    initLaxMap();
    initPamora();
    initBiofeedback();
    initConstipDetective();
    // Core 14 · 과민성장증후군 (IBS)
    initGutBrainAxis();
    initVisceralViz();
    initIBSMixer();
    initRomeIVCB();
    initIBSTreatMap();
    initPainVolume();
    initIBSRedFlag();
    // Core 13 · 소화성궤양
    initUlcerBalance();
    initHPyloriPath();
    initNSAIDDoubleHit();
    initGIRiskStack();
    initUlcerDepth();
    initUlcerDrugs();
    initUlcerRecurrence();
    initUlcerEmergency();
    // Everyday 03 · 급성 장염
    initFluidLoss();
    initWateryVsInflam();
    initNoroTransmission();
    initHydrationGauge();
    initORSMechanism();
    initTrafficLight();
    initLopeCheck();
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
    // Core 06 · 지방간(MASLD)
    initLiverFat();
    initMasldSpectrum();
    initFib4();
    // Core 07 · 통풍(Gout)
    initIceberg();
    initUrateBalance();
    initCascade();
    initDissolution();
    initAcuteChronic();
    // Core 08 · 동맥경화
    initFoamCell();
    initPlaqueBuilder();
    initStableVuln();
    initPlaque2Thrombus();
    initCae();
    // Core 12 · GERD
    initAntiRefluxBarrier();
    initRefluxMechanism();
    initRefluxVsAcidity();
    initGERDPhenotype();
    init24hMonitor();
    initGERDComplication();
    initTriggerTracker();
    initPPITiming();
    initPPIvsPCAB();
    initPPIFailure();
    initFundoplication();
    initGERDPhenotype2();
    // Core 11 · 위염
    initGastricShield();
    initHPylori();
    initNSAIDShield();
    initAutoimmGastritis();
    initHPyloriTest();
    initCorreaCascade();
    initThreeRoads();
    initTriggerSorter();
    initAcidMap();
    initEradBuilder();
    initCauseDetective();
    // Core 10 · 뇌졸중
    initBrainFlow();
    initPenumbra();
    initStrokeSource();
    initStrokeType();
    initBEFAST();
    initTIAWarn();
    initStrokeImaging();
    initThromboWin();
    initReperfComp();
    initStrokeOpp();
    initStrokeCause();
    initStrokeDrugMap();
    initStrokeSim();
    // Core 09 · 협심증과 심근경색
    initO2Balance();
    initStableSim();
    initACSFlow();
    initACSSpectrum();
    initTimeIsMuscle();
    initTroponinTL();
    initACSDrugMap();
    initACSDecision();
  });

  /* =========================================================
     ===========  Everyday 07 · 다래끼  ===========
     ========================================================= */

  /* ---------- Viz 1 · Eyelid Anatomy ---------- */
  function initStyAnat() {
    var root = document.querySelector("[data-styanat]");
    if (!root) return;
    var wrap = root.querySelector(".sty__lid-wrap");
    var out = root.querySelector(".sty__out");
    var STATE = {
      normal: { cls: "", t: "정상 — 속눈썹 모낭, Zeis/Moll 샘(눈꺼풀 가장자리 앞쪽), meibomian gland(눈꺼풀 안쪽 tarsal plate)가 각자 자리에 있습니다." },
      ext: { cls: "no", t: "<b>External Stye</b> — 속눈썹 뿌리·Zeis/Moll 샘 주위가 붉게 부풀며, <b>속눈썹 모낭/주변 gland의 급성 감염</b>입니다. 겉으로는 작은 여드름 같은 붉은 혹." },
      int: { cls: "no", t: "<b>Internal Stye</b> — 눈꺼풀 안쪽 meibomian gland 하나가 붉게 팽창합니다. <b>Meibomian gland의 급성 감염·염증</b>으로 눈꺼풀이 더 넓게 붓습니다." },
      chal: { cls: "mid", t: "<b>Chalazion</b> — 같은 meibomian gland가 막혀 노란 lipid plug가 남은 모습. <b>감염보다는 막힘과 만성 염증</b>이 중심이라 대개 덜 아픕니다." }
    };
    var PART = {
      follicle: "<b>Eyelash follicle</b> — 속눈썹 뿌리. 이 주변의 급성 감염이 <b>외다래끼</b>입니다.",
      zeis: "<b>Zeis(sebaceous) · Moll(변형 땀샘) gland</b> — 속눈썹 모낭 옆의 작은 샘. 외다래끼와 연관됩니다. Outside = lash-associated gland.",
      meib: "<b>Meibomian gland</b> — 눈꺼풀 안쪽 tarsal plate 속의 큰 기름샘. 급성 감염이면 <b>속다래끼</b>, 막힘이 지속되면 <b>콩다래끼</b>. Inside = meibomian gland."
    };
    function setState(s) {
      wrap.className = "sty__lid-wrap is-" + s;
      root.querySelectorAll("[data-state]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-state") === s); });
      wrap.querySelectorAll("[data-part]").forEach(function (p) { p.classList.remove("sel"); });
      out.className = "sty__out " + STATE[s].cls;
      out.innerHTML = STATE[s].t;
    }
    root.querySelectorAll("[data-state]").forEach(function (b) {
      b.addEventListener("click", function () { setState(b.getAttribute("data-state")); });
    });
    wrap.querySelectorAll("[data-part]").forEach(function (p) {
      p.addEventListener("click", function () {
        wrap.querySelectorAll("[data-part]").forEach(function (x) { x.classList.remove("sel"); });
        p.classList.add("sel");
        out.className = "sty__out";
        out.innerHTML = PART[p.getAttribute("data-part")];
      });
    });
    setState("normal");
  }

  /* ---------- Viz 2 · Stye → Chalazion ---------- */
  function initStyPath() {
    var root = document.querySelector("[data-stypath]");
    if (!root) return;
    var out = root.querySelector(".sty__out");
    var P = {
      a: { cls: "ok", t: "✅ <b>A · 배출 → 사라짐</b> — 고름이 자연 배출되며 통증·부종이 줄고 대부분 약 1주 안팎에 호전됩니다. 온찜질이 이 경로를 돕습니다." },
      b: { cls: "mid", t: "🟡 <b>B · 통증은 사라졌지만 덩어리 지속</b> → <b>Chalazion</b>. 급성 염증은 가라앉았지만 gland가 계속 막혀 단단한 결절로 남은 상태입니다. 오래 지속되면 안과 평가를 권합니다." }
    };
    root.querySelectorAll("[data-path]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = P[b.getAttribute("data-path")];
        root.querySelectorAll("[data-path]").forEach(function (x) { x.classList.toggle("active", x === b); });
        out.className = "sty__out " + p.cls;
        out.innerHTML = p.t;
      });
    });
  }

  /* ---------- Viz 3 · Pain × Location Matcher ---------- */
  function initStyMatch() {
    var root = document.querySelector("[data-stymatch]");
    if (!root) return;
    var pain = root.querySelector("[data-in='pain']");
    var loc = root.querySelector("[data-in='loc']");
    var painV = root.querySelector("[data-val='pain']");
    var locV = root.querySelector("[data-val='loc']");
    var box = root.querySelector(".sty__result");
    function label(v, lo, mid, hi) { return v < 34 ? lo : v < 67 ? mid : hi; }
    function render() {
      var p = +pain.value, l = +loc.value;
      painV.textContent = label(p, "거의 없음", "중간", "심함");
      locV.textContent = label(l, "가장자리", "중간", "깊숙이");
      var hot = p >= 50, deep = l >= 50, cls, name, why;
      if (hot && !deep) { cls = "hot"; name = "External Hordeolum ↑"; why = "속눈썹 바로 옆의 통증성 병변 — 외다래끼. 온찜질 + 눈꺼풀 위생."; }
      else if (hot && deep) { cls = "hot"; name = "Internal Hordeolum ↑"; why = "눈꺼풀 안쪽·깊은 곳의 통증성 병변 — 속다래끼(meibomian gland 급성 염증). 눈꺼풀이 더 넓게 붓기도 합니다."; }
      else if (!hot && deep) { cls = "mid"; name = "Chalazion ↑"; why = "깊고 단단하며 통증이 적은 혹 — 콩다래끼. 오래 지속되면 안과 평가."; }
      else { cls = ""; name = "작고 덜 아픈 가장자리 병변"; why = "초기 다래끼나 눈꺼풀염 등 — 경과를 관찰하고 온찜질·눈꺼풀 위생. 지속되면 평가."; }
      box.className = "sty__result " + cls;
      box.innerHTML = "<b class='name'>" + name + "</b>" + why + "<br><small>⚠️ 눈꺼풀 전체로 퍼지거나 발열·시력 이상이 있으면 이 분류를 넘어 cellulitis를 먼저 평가합니다.</small>";
    }
    pain.addEventListener("input", render);
    loc.addEventListener("input", render);
    render();
  }

  /* ---------- Viz 4 · Warm Compress Mechanism ---------- */
  function initStyWarm() {
    var root = document.querySelector("[data-stywarm]");
    if (!root) return;
    var wrap = root.querySelector(".sty__warm");
    var out = root.querySelector(".sty__out");
    var visc = root.querySelector("[data-meter='visc']");
    var drain = root.querySelector("[data-meter='drain']");
    root.querySelectorAll(".sty__blob").forEach(function (b, i) { b.style.setProperty("--i", i); });
    function set(warm) {
      wrap.classList.toggle("is-warm", warm);
      visc.style.width = warm ? "25%" : "90%";
      drain.style.width = warm ? "85%" : "10%";
      out.className = "sty__out " + (warm ? "ok" : "");
      out.innerHTML = warm
        ? "🔥 열 → 기름의 <b>점도 ↓</b> → 막힌 내용물이 gland opening 쪽으로 움직임 → <b>배출 ↑</b> → 염증 감소."
        : "막힌 gland 안에 끈적하게 굳은 기름이 있습니다.";
    }
    root.querySelector("[data-warm-start]").addEventListener("click", function () { set(true); });
    root.querySelector("[data-warm-reset]").addEventListener("click", function () { set(false); });
    set(false);
  }

  /* ---------- Viz 5 · Warm Compress Simulator ---------- */
  function initStyHeat() {
    var root = document.querySelector("[data-styheat]");
    if (!root) return;
    var out = root.querySelector(".sty__out");
    var massage = root.querySelector(".sty__massage");
    var R = {
      ice: { cls: "no", ok: false, t: "❌ <b>얼음</b> — 기름이 더 굳어 배출에 불리합니다. 다래끼는 차갑게가 아니라 <b>따뜻하게</b>." },
      hot: { cls: "no", ok: false, t: "❌ <b>화상 입을 만큼 뜨겁게</b> — 눈꺼풀 피부는 얇습니다. 뜨거울수록 좋은 것이 아닙니다." },
      comfy: { cls: "ok", ok: true, t: "✅ <b>편안하게 따뜻한 수건을 일정 시간(약 5–15분) 유지</b> — 하루 여러 번 반복하며 gland 분비물의 배출을 돕습니다." }
    };
    root.querySelectorAll("[data-heat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = R[b.getAttribute("data-heat")];
        root.querySelectorAll("[data-heat]").forEach(function (x) { x.classList.remove("correct", "wrong"); });
        b.classList.add(r.ok ? "correct" : "wrong");
        out.className = "sty__out " + r.cls;
        out.innerHTML = r.t;
        massage.classList.toggle("show", r.ok);
      });
    });
  }

  /* ---------- Viz 6 · POP IT? ---------- */
  function initStyPop() {
    var root = document.querySelector("[data-stypop]");
    if (!root) return;
    var wrap = root.querySelector(".sty__pop");
    var out = root.querySelector(".sty__out");
    var R = {
      pop: { cls: "no", c: "is-pop", t: "❌ <b>직접 짠다</b> — 붉은 감염 영역이 눈꺼풀 주변으로 퍼집니다. <b>강제로 압출하면 감염을 주변 조직으로 퍼뜨릴 수 있습니다.</b>" },
      warm: { cls: "ok", c: "is-warm", t: "✅ <b>온찜질한다</b> — 점도가 낮아진 내용물이 <b>자연 배출</b>되고 병변이 가라앉습니다. 따뜻하게 → 배출을 돕는다." }
    };
    function set(k) {
      wrap.className = "sty__pop" + (k ? " " + R[k].c : "");
      out.className = "sty__out " + (k ? R[k].cls : "");
      out.innerHTML = k ? R[k].t : "선택하세요.";
      root.querySelectorAll("[data-pop]").forEach(function (b) {
        b.classList.remove("correct", "wrong");
        if (b.getAttribute("data-pop") === k) b.classList.add(k === "warm" ? "correct" : "wrong");
      });
    }
    root.querySelectorAll("[data-pop]").forEach(function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-pop")); });
    });
    root.querySelector("[data-pop-reset]").addEventListener("click", function () { set(null); });
    set(null);
  }

  /* ---------- Viz 7 · Point vs Whole Lid ---------- */
  function initStySpread() {
    var root = document.querySelector("[data-styspread]");
    if (!root) return;
    var viz = root.querySelector(".sty__spreadviz");
    var out = root.querySelector(".sty__out");
    var S = {
      focal: { cls: "ok", t: "<b>FOCAL</b> — 작은 painful bump. <b>Stye pattern</b>: 온찜질 + 경과 관찰." },
      diffuse: { cls: "mid", t: "<b>DIFFUSE</b> — 눈꺼풀 전체의 홍반·부종. <b>Cellulitis?</b> 점 하나가 아니라 눈꺼풀 전체로 퍼진다 → 빠른 진료." },
      orbital: { cls: "no", t: "<b>ORBITAL</b> — 눈 움직임 제한 · 안구 돌출 · 시력변화. <b>Urgent</b> — orbital cellulitis 등 안와 감염 평가." }
    };
    function set(k) {
      viz.className = "sty__spreadviz is-" + k;
      out.className = "sty__out " + S[k].cls;
      out.innerHTML = S[k].t;
      root.querySelectorAll("[data-sp]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sp") === k); });
    }
    root.querySelectorAll("[data-sp]").forEach(function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-sp")); });
    });
    set("focal");
  }

  /* ---------- Viz 8 · What Do I Do? ---------- */
  function initStyDo() {
    var root = document.querySelector("[data-stydo]");
    if (!root) return;
    var CASES = [
      { q: "작은 아픈 혹, 열 없음. 시력 정상.", a: "home", why: "전형적인 작은 국소 다래끼 — <b>온찜질 + 눈꺼풀 위생</b>으로 집에서 관리하며 경과를 봅니다." },
      { q: "통증은 없어졌지만 한 달째 단단한 혹이 남아 있음.", a: "routine", why: "Chalazion 가능성 — 오래 지속되므로 <b>안과 평가</b>(필요시 steroid injection·배농 등)를 권합니다." },
      { q: "눈꺼풀 전체가 붓고 붉음, 39℃ 발열.", a: "urgent", why: "눈꺼풀 전체 확산 + 발열 — <b>preseptal cellulitis</b> 등을 평가해야 합니다. 신속한 진료." },
      { q: "같은 위치에 계속 재발하고, 모양이 이전과 다름.", a: "routine", why: "반복적·비전형적 병변 — blepharitis 평가와 함께 드물게 eyelid tumor를 배제하기 위한 <b>안과 평가</b>가 필요합니다." },
      { q: "눈이 앞으로 튀어나온 듯하고, 눈을 움직일 때 아프며 시야가 흐림.", a: "urgent", why: "안구 돌출·운동통·시력저하 — 단순 다래끼가 아닙니다. <b>orbital cellulitis 등 응급 평가</b>." }
    ];
    var prog = root.querySelector(".sty__prog");
    var box = root.querySelector(".sty__case");
    var out = root.querySelector(".sty__out");
    var next = root.querySelector("[data-do-next]");
    var opts = root.querySelectorAll("[data-do]");
    var idx = 0;
    function show() {
      prog.textContent = (idx + 1) + " / " + CASES.length;
      box.textContent = CASES[idx].q;
      opts.forEach(function (o) { o.classList.remove("correct", "wrong"); o.disabled = false; });
      out.className = "sty__out";
      out.textContent = "환자 상황을 보고 가장 적절한 대응을 고르세요.";
      next.style.display = "none";
    }
    opts.forEach(function (o) {
      o.addEventListener("click", function () {
        var c = CASES[idx];
        var ok = o.getAttribute("data-do") === c.a;
        opts.forEach(function (x) {
          x.disabled = true;
          if (x.getAttribute("data-do") === c.a) x.classList.add("correct");
        });
        if (!ok) o.classList.add("wrong");
        out.className = "sty__out " + (ok ? "ok" : "no");
        out.innerHTML = (ok ? "✅ " : "❌ ") + c.why;
        next.textContent = idx === CASES.length - 1 ? "↺ 처음부터" : "다음 →";
        next.style.display = "";
      });
    });
    next.addEventListener("click", function () { idx = (idx + 1) % CASES.length; show(); });
    show();
  }

  /* =========================================================
     ===========  Everyday 06 · 결막염  ===========
     ========================================================= */

  /* ---------- Viz 1 · Conjunctiva vs Cornea ---------- */
  function initCjvAnat() {
    var root = document.querySelector("[data-cjvanat]");
    if (!root) return;
    var eye = root.querySelector(".cjv__eye");
    var out = root.querySelector(".cjv__out");
    var TXT = {
      conj: { cls: "mid", t: "<b>결막 (Conjunctiva)</b> — 결막염에서는 이 부위가 충혈되고 분비물·이물감이 생길 수 있습니다. 심한 통증과 시력저하는 전형적이지 않습니다." },
      cornea: { cls: "no", t: "<b>각막 (Cornea)</b> — 동공 앞의 투명한 구조. 각막이 침범되면 <b>통증·눈부심·시력저하</b>가 나타날 수 있으며 더 중요하게 평가해야 합니다." },
      lid: { cls: "", t: "<b>눈꺼풀</b> — 눈꺼풀 안쪽도 결막으로 덮여 있습니다. 부종·분비물로 속눈썹이 붙을 수 있습니다." }
    };
    var STATE = {
      normal: "정상 — 결막은 옅은 투명막, 각막은 동공 앞의 맑은 구조입니다.",
      conj: "결막염 — 결막의 혈관이 확장되어 <b>충혈</b>됩니다. 각막은 맑게 유지됩니다.",
      kera: "각막염 — 중앙의 각막에 염증(흰 혼탁)이 생깁니다. <b>빨간 눈 + 통증·눈부심·시력저하</b>를 기억하세요."
    };
    function setState(s) {
      eye.className = "cjv__eye is-" + s;
      root.querySelectorAll("[data-state]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-state") === s); });
      out.className = "cjv__out" + (s === "kera" ? " no" : s === "conj" ? " mid" : "");
      out.innerHTML = STATE[s];
      eye.querySelectorAll("[data-part]").forEach(function (p) { p.classList.remove("sel"); });
    }
    root.querySelectorAll("[data-state]").forEach(function (b) {
      b.addEventListener("click", function () { setState(b.getAttribute("data-state")); });
    });
    eye.querySelectorAll("[data-part]").forEach(function (p) {
      p.addEventListener("click", function () {
        var k = p.getAttribute("data-part");
        eye.querySelectorAll("[data-part]").forEach(function (x) { x.classList.remove("sel"); });
        p.classList.add("sel");
        out.className = "cjv__out " + TXT[k].cls;
        out.innerHTML = TXT[k].t;
      });
    });
    setState("normal");
  }

  /* ---------- Viz 2 · Three Pink Eyes ---------- */
  function initCjvThree() {
    var root = document.querySelector("[data-cjvthree]");
    if (!root) return;
    var CASES = [
      { a: "allergic", s: ["😖 심한 가려움", "👀 양쪽 눈", "💧 눈물", "🤧 코 가려움·재채기"], why: "<b>Allergic</b> — 양안 + 가려움 + 알레르기비염 동반. 알레르겐에 대한 면역반응이라 옮지 않습니다." },
      { a: "viral", s: ["💧 물 같은 눈물", "🤧 감기 증상", "👁️ 한쪽에서 시작해 반대쪽으로", "😣 모래 들어간 느낌"], why: "<b>Viral</b> — watery discharge + 호흡기 증상 + 한쪽 → 반대쪽. 대부분 자연회복하며 항생제는 효과가 없습니다." },
      { a: "bacterial", s: ["🟡 노랗고 끈적한 분비물", "🌅 아침에 눈꺼풀이 붙음", "🔴 충혈", "🔁 닦아도 다시 생김"], why: "<b>Bacterial</b> — mucopurulent discharge. 단, 눈곱만으로 확진하지 않으며 경증은 자연호전도 많습니다." }
    ];
    var box = root.querySelector(".cjv__case");
    var prog = root.querySelector(".cjv__prog");
    var out = root.querySelector(".cjv__out");
    var next = root.querySelector("[data-cjv-next]");
    var opts = root.querySelectorAll(".cjv__opt");
    var idx = 0;
    function show() {
      box.innerHTML = CASES[idx].s.map(function (t) { return "<div>" + t + "</div>"; }).join("");
      prog.textContent = (idx + 1) + " / " + CASES.length;
      opts.forEach(function (o) { o.classList.remove("correct", "wrong"); o.disabled = false; });
      out.className = "cjv__out";
      out.textContent = "증상 조합을 보고 가장 가능성 높은 유형을 고르세요.";
      next.style.display = "none";
    }
    opts.forEach(function (o) {
      o.addEventListener("click", function () {
        var c = CASES[idx];
        var ok = o.getAttribute("data-ans") === c.a;
        opts.forEach(function (x) {
          x.disabled = true;
          if (x.getAttribute("data-ans") === c.a) x.classList.add("correct");
        });
        if (!ok) o.classList.add("wrong");
        out.className = "cjv__out " + (ok ? "ok" : "no");
        out.innerHTML = (ok ? "✅ " : "❌ ") + c.why;
        next.textContent = idx === CASES.length - 1 ? "↺ 처음부터" : "다음 눈 →";
        next.style.display = "";
      });
    });
    next.addEventListener("click", function () { idx = (idx + 1) % CASES.length; show(); });
    show();
  }

  /* ---------- Viz 3 · Transmission Chain ---------- */
  function initCjvChain() {
    var root = document.querySelector("[data-cjvchain]");
    if (!root) return;
    var out = root.querySelector(".cjv__out");
    var CUTS = { rub: ["rub"], wash: ["wash1", "wash2"], towel: ["towel"] };
    var NAME = { rub: "눈 비비지 않기", wash: "손 씻기", towel: "수건 공유 안 하기" };
    var on = {};
    function render() {
      var cut = {};
      Object.keys(on).forEach(function (k) { if (on[k]) CUTS[k].forEach(function (l) { cut[l] = true; }); });
      root.querySelectorAll("[data-link]").forEach(function (l) { l.classList.toggle("cut", !!cut[l.getAttribute("data-link")]); });
      root.querySelectorAll("[data-stop]").forEach(function (b) { b.classList.toggle("on", !!on[b.getAttribute("data-stop")]); });
      var names = Object.keys(on).filter(function (k) { return on[k]; }).map(function (k) { return NAME[k]; });
      if (!names.length) { out.className = "cjv__out"; out.textContent = "전파 경로가 열려 있습니다."; return; }
      if (names.length === 3) { out.className = "cjv__out ok"; out.innerHTML = "✅ <b>세 곳을 모두 차단</b> — 가장 확실한 예방입니다. 결막염 예방은 눈보다 <b>손 관리</b>가 중요합니다."; return; }
      out.className = "cjv__out mid";
      out.innerHTML = "🔗 <b>" + names.join(" + ") + "</b>로 chain이 끊겼습니다. 다른 경로가 남아 있으니 나머지도 막아 보세요.";
    }
    root.querySelectorAll("[data-stop]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-stop");
        on[k] = !on[k];
        render();
      });
    });
    render();
  }

  /* ---------- Viz 4 · Symptom Matcher (탭으로 chip → 칸) ---------- */
  function initCjvMatch() {
    var root = document.querySelector("[data-cjvmatch]");
    if (!root) return;
    var chips = root.querySelectorAll(".cjv__chip");
    var out = root.querySelector(".cjv__out");
    var NAME = { viral: "Viral", bacterial: "Bacterial", allergic: "Allergic", flag: "Red Flag" };
    var sel = null, done = 0;
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        if (sel) sel.classList.remove("sel");
        sel = c;
        c.classList.add("sel");
        out.className = "cjv__out";
        out.innerHTML = "<b>" + c.textContent + "</b> — 어울리는 칸을 탭하세요. (" + done + " / " + chips.length + ")";
      });
    });
    root.querySelectorAll("[data-bin]").forEach(function (bin) {
      bin.addEventListener("click", function () {
        if (!sel) { out.className = "cjv__out"; out.textContent = "먼저 증상 chip을 탭하세요."; return; }
        var ans = sel.getAttribute("data-ans");
        var key = bin.getAttribute("data-bin");
        if (ans !== key) {
          bin.classList.add("shake");
          setTimeout(function () { bin.classList.remove("shake"); }, 400);
          out.className = "cjv__out no";
          out.innerHTML = "❌ <b>" + sel.textContent + "</b>은(는) " + NAME[key] + " 쪽이 아니에요. 다시 골라보세요.";
          return;
        }
        var tag = document.createElement("i");
        tag.textContent = sel.textContent;
        bin.querySelector(".cjv__bin-list").appendChild(tag);
        sel.classList.remove("sel");
        sel.classList.add("placed");
        sel = null;
        done++;
        out.className = "cjv__out ok";
        out.innerHTML = done === chips.length
          ? "✅ 모두 완료! 가려움 → Allergic · 물 같은 눈물 → Viral · 끈적한 분비물 → Bacterial · <b>통증·눈부심·시력저하 → Red Flag</b>"
          : "✅ 맞아요 — " + NAME[key] + " 쪽입니다. (" + done + " / " + chips.length + ")";
      });
    });
  }

  /* ---------- Viz 5 · Red Eye Triage ---------- */
  function initCjvTriage() {
    var root = document.querySelector("[data-cjvtriage]");
    if (!root) return;
    var STEPS = [
      { q: "심한 눈 통증이 있나요?", yes: "red" },
      { q: "빛을 보면 아프거나 눈을 뜨기 힘든가요? (photophobia)", yes: "red" },
      { q: "닦아도 흐린 시야가 지속되거나 시력이 떨어졌나요?", yes: "red" },
      { q: "콘택트렌즈를 착용하나요?", yes: "lens" },
      { q: "양쪽 눈이 심하게 가렵나요?", yes: "allergic" },
      { q: "물 같은 눈물이 나고 감기·접촉력이 있나요?", yes: "viral" },
      { q: "노랗고 끈적한 고름성 분비물이 뚜렷한가요?", yes: "bacterial" }
    ];
    var RES = {
      red: { cls: "no", t: "🚨 <b>Simple conjunctivitis라고 가정하지 말 것</b> — 통증·눈부심·시력저하는 각막염 등을 생각하게 합니다. → 안과 평가" },
      lens: { cls: "no", t: "👓 <b>렌즈를 빼고 각막염 위험을 확인</b> — 통증·눈부심·시야 흐림이 있으면 신속한 안과 평가. 증상이 있는 동안 렌즈 착용 중단." },
      allergic: { cls: "ok", t: "🌼 <b>Allergic 가능성 ↑</b> — 알레르겐 회피 + 냉찜질 + 인공눈물 + 점안 antihistamine / mast-cell stabilizer. 옮지 않습니다." },
      viral: { cls: "ok", t: "🤧 <b>Viral 가능성 ↑</b> — 증상 완화 + 전염 예방 + 경과 관찰. 항생제는 효과가 없고 손 관리가 중요합니다." },
      bacterial: { cls: "mid", t: "🦠 <b>Bacterial 고려</b> — 경증은 자연호전도 많고, 일부에서 topical antibiotic을 고려합니다. 분비물 하나만으로 확진하지 않습니다." },
      unclear: { cls: "mid", t: "❓ <b>뚜렷한 유형 없음</b> — 지속되거나 악화되면 진료를 권하고, 그동안 인공눈물·냉찜질·손 관리를 합니다." }
    };
    var prog = root.querySelector(".cjv__prog");
    var qEl = root.querySelector(".cjv__q");
    var opts = root.querySelector(".cjv__opts");
    var out = root.querySelector(".cjv__out");
    var idx = 0;
    function ask() {
      opts.style.display = "";
      qEl.textContent = STEPS[idx].q;
      prog.textContent = (idx + 1) + " / " + STEPS.length;
      out.className = "cjv__out";
      out.textContent = "";
    }
    function result(k) {
      opts.style.display = "none";
      prog.textContent = "결과";
      qEl.textContent = "RED EYE → 판단";
      out.className = "cjv__out " + RES[k].cls;
      out.innerHTML = RES[k].t;
    }
    root.querySelectorAll("[data-yn]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-yn") === "yes") { result(STEPS[idx].yes); return; }
        idx++;
        if (idx >= STEPS.length) result("unclear"); else ask();
      });
    });
    root.querySelector("[data-cjv-reset]").addEventListener("click", function () { idx = 0; ask(); });
    ask();
  }

  /* ---------- Viz 6 · Eyedrop Simulator ---------- */
  function initCjvDrop() {
    var root = document.querySelector("[data-cjvdrop]");
    if (!root) return;
    var wrap = root.querySelector(".cjv__drop");
    var bottle = root.querySelector(".cjv__bottle");
    var out = root.querySelector(".cjv__out");
    var POS = {
      cornea: { x: 100, y: 90, cls: "no", t: "❌ <b>각막 위로 직접</b> — 용기 끝이 눈에 가까워 오염·자극 위험이 큽니다. 각막에 직접 떨어뜨리려 하지 않습니다." },
      lash: { x: 38, y: 115, cls: "no", t: "❌ <b>용기 끝이 속눈썹에 닿음</b> — 용기가 오염되어 다시 눈에 병원체가 들어갈 수 있습니다." },
      sac: { x: 110, y: 117, cls: "ok", t: "✅ <b>아래 눈꺼풀을 당긴 pocket</b>(conjunctival sac)에 닿지 않게 1방울. <b>한 방울이면 충분합니다.</b>" }
    };
    root.querySelectorAll("[data-pos]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-pos"), p = POS[k];
        bottle.style.transform = "translate(" + p.x + "px, " + p.y + "px) rotate(65deg)";
        wrap.className = "cjv__drop is-" + p.cls;
        out.className = "cjv__out " + p.cls;
        out.innerHTML = p.t;
        root.querySelectorAll("[data-pos]").forEach(function (x) { x.classList.toggle("active", x === b); });
      });
    });
  }

  /* ---------- Viz 7 · Contact Lens Danger Card ---------- */
  function initCjvLens() {
    var root = document.querySelector("[data-cjvlens]");
    if (!root) return;
    var out = root.querySelector(".cjv__out");
    var sel = {};
    function render() {
      var danger = (sel.pain && sel.photo) || sel.vision;
      var any = sel.red || sel.pain || sel.photo || sel.vision;
      root.classList.toggle("is-danger", !!danger);
      if (danger) {
        out.className = "cjv__out no";
        out.innerHTML = "<div class='cjv__alert'>🚨 CORNEAL INFECTION?<br>빠른 안과 평가</div><b>렌즈를 즉시 제거</b>하세요. 렌즈 + 통증 + 눈부심 또는 시야 변화는 감염성 각막염의 warning pattern이며 영구적 시력저하로 이어질 수 있습니다.";
      } else if (sel.pain || sel.photo) {
        out.className = "cjv__out mid";
        out.innerHTML = "⚠️ <b>렌즈를 제거</b>하고 상태를 확인하세요. 통증이나 눈부심이 있으면 단순 결막염으로 단정하지 말고 안과 평가를 권합니다.";
      } else if (sel.red) {
        out.className = "cjv__out ok";
        out.innerHTML = "<b>렌즈를 제거하고 상태 확인</b> — 통증·눈부심·시야 변화가 생기면 바로 안과 평가. 증상이 있는 동안 렌즈 착용을 중단합니다.";
      } else {
        out.className = "cjv__out";
        out.textContent = any ? "" : "증상을 선택하세요.";
      }
    }
    root.querySelectorAll("[data-sx]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-sx");
        sel[k] = !sel[k];
        b.classList.toggle("active", sel[k]);
        render();
      });
    });
  }

  /* =========================================================
     ===========  Everyday 05 · 알레르기비염  ===========
     ========================================================= */

  /* ---------- Viz 1 · Cold vs Allergy Matcher ---------- */
  function initAlrMatch() {
    var root = document.querySelector("[data-alrmatch]");
    if (!root) return;
    var ITEMS = [
      { t: "👁️ 눈 가려움", side: "alr", why: "코·눈 가려움은 histamine 반응의 대표 신호입니다." },
      { t: "🌡️ 38.5℃ 발열", side: "cold", why: "알레르기비염은 열을 만들지 않습니다. 발열은 감염 쪽을 다시 생각하게 합니다." },
      { t: "🤧 아침마다 연속 재채기", side: "alr", why: "매일 같은 시간·환경에서 재현되는 연속 재채기는 알레르기 pattern입니다." },
      { t: "😣 인후통", side: "cold", why: "인후통·기침은 상기도 감염에서 상대적으로 더 흔합니다." },
      { t: "🌸 매년 봄 반복", side: "alr", why: "계절마다 반복되는 것은 알레르겐 노출과 연결된 가장 강한 단서 중 하나입니다." },
      { t: "🥵 심한 몸살", side: "cold", why: "전신 근육통은 감염에 대한 전신 염증반응입니다. 알레르기비염에서는 전형적이지 않습니다." }
    ];
    var NAME = { alr: "알레르기비염", cold: "감기" };
    var chip = root.querySelector(".alr__match-chip");
    var prog = root.querySelector(".alr__match-prog");
    var btns = root.querySelector(".alr__match-btns");
    var out = root.querySelector(".alr__out");
    var fin = root.querySelector(".alr__match-final");
    var idx = 0, score = 0;

    function show() {
      var done = idx >= ITEMS.length;
      chip.style.display = done ? "none" : "";
      btns.style.display = done ? "none" : "";
      fin.classList.toggle("show", done);
      if (done) { prog.textContent = "완료 · " + score + " / " + ITEMS.length + " 정답"; return; }
      chip.textContent = ITEMS[idx].t;
      prog.textContent = (idx + 1) + " / " + ITEMS.length;
    }
    btns.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var it = ITEMS[idx];
        var ok = b.getAttribute("data-pick") === it.side;
        if (ok) score++;
        out.className = "alr__out " + (ok ? "ok" : "no");
        out.innerHTML = (ok ? "✅ 맞아요" : "❌ 반대쪽이에요") + " — <b>" + it.t + "</b> → " + NAME[it.side] + " 쪽. " + it.why;
        var tag = document.createElement("span");
        tag.textContent = it.t;
        root.querySelector("[data-bin='" + it.side + "']").appendChild(tag);
        idx++;
        show();
      });
    });
    root.querySelector("[data-alr-reset]").addEventListener("click", function () {
      idx = 0; score = 0;
      root.querySelectorAll("[data-bin]").forEach(function (el) { el.innerHTML = ""; });
      out.className = "alr__out";
      out.textContent = "증상을 보고 한쪽을 선택하세요.";
      show();
    });
    show();
  }

  /* ---------- Viz 2 · Histamine vs Inflammation ---------- */
  function initAlrMast() {
    var root = document.querySelector("[data-alrmast]");
    if (!root) return;
    var phases = root.querySelector(".alr__phases");
    var out = root.querySelector(".alr__out");
    var DATA = {
      none: { early: 100, late: 100, txt: "약이 없으면 두 단계가 모두 진행됩니다. 먼저 재채기·가려움·콧물, 이어서 점막 부종으로 인한 코막힘." },
      ah:   { early: 25, late: 85, txt: "<b>H1 항히스타민제</b>는 histamine → H1 수용체 화살표를 끊습니다. 재채기·가려움·콧물은 뚜렷이 줄지만, 여러 mediator가 만드는 <b>점막 부종(코막힘)은 상대적으로 남습니다.</b>" },
      incs: { early: 35, late: 30, txt: "<b>비강 스테로이드</b>는 특정 mediator 하나가 아니라 염증반응 전체를 넓게 억제합니다. 그래서 <b>코막힘을 포함한 비강 증상 전반</b>에 효과적입니다. 단, 충분한 효과에는 꾸준한 사용이 필요합니다." }
    };
    function set(k) {
      var d = DATA[k];
      phases.className = "alr__phases is-" + k;
      ["early", "late"].forEach(function (p) {
        root.querySelector("[data-meter='" + p + "']").style.width = d[p] + "%";
        root.querySelector("[data-sx='" + p + "']").classList.toggle("low", d[p] < 50);
      });
      out.innerHTML = d.txt;
      root.querySelectorAll("[data-drug]").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-drug") === k);
      });
    }
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-drug")); });
    });
    set("none");
  }

  /* ---------- Viz 3 · Allergy Detective ---------- */
  function initAlrDetect() {
    var root = document.querySelector("[data-alrdetect]");
    if (!root) return;
    var SCENES = [
      { q: "\"침구를 털거나 청소할 때마다 재채기와 콧물이 심해져요.\"", a: "mite", why: "침구·먼지와 연결되고 연중 반복된다면 <b>집먼지진드기</b> 가능성이 높습니다." },
      { q: "\"매년 4월, 야외활동을 한 날에 눈과 코가 가려워요.\"", a: "pollen", why: "매년 같은 계절 + 야외 노출 → <b>꽃가루</b> 가능성이 높습니다." },
      { q: "\"고양이를 키우는 친구 집에만 가면 눈·코가 가렵고 재채기가 나요.\"", a: "pet", why: "특정 동물이 있는 공간에서 재현 → <b>동물 알레르겐</b> 가능성이 높습니다." },
      { q: "\"향수 냄새만 맡으면 코가 막혀요. 가렵지는 않고, 알레르기 검사는 음성이었어요.\"", a: "irritant", why: "가려움·재채기가 적고 감작도 확인되지 않음 → <b>비알레르기성 trigger</b>도 고려합니다. 모든 비염이 알레르기는 아닙니다." }
    ];
    var scene = root.querySelector(".alr__scene");
    var prog = root.querySelector(".alr__match-prog");
    var out = root.querySelector(".alr__out");
    var next = root.querySelector("[data-alr-next]");
    var opts = root.querySelectorAll(".alr__opt");
    var idx = 0;

    function show() {
      scene.textContent = SCENES[idx].q;
      prog.textContent = (idx + 1) + " / " + SCENES.length;
      opts.forEach(function (o) { o.classList.remove("correct", "wrong"); o.disabled = false; });
      out.className = "alr__out";
      out.textContent = "상황을 읽고 가장 가능성 높은 원인을 고르세요.";
      next.style.display = "none";
    }
    opts.forEach(function (o) {
      o.addEventListener("click", function () {
        var s = SCENES[idx];
        var ok = o.getAttribute("data-ans") === s.a;
        opts.forEach(function (x) {
          x.disabled = true;
          if (x.getAttribute("data-ans") === s.a) x.classList.add("correct");
        });
        if (!ok) o.classList.add("wrong");
        out.className = "alr__out " + (ok ? "ok" : "no");
        out.innerHTML = (ok ? "✅ " : "❌ ") + s.why;
        next.textContent = idx === SCENES.length - 1 ? "↺ 처음부터" : "다음 상황 →";
        next.style.display = "";
      });
    });
    next.addEventListener("click", function () {
      idx = (idx + 1) % SCENES.length;
      show();
    });
    show();
  }

  /* ---------- Viz 4 · Allergy Symptom Fingerprint (fp__ CSS 재사용) ---------- */
  function initAlrFinger() {
    var root = document.querySelector("[data-alrfinger]");
    if (!root) return;
    var KEYS = ["가려움", "재채기", "맑은 콧물", "코막힘", "인후통·기침", "발열", "몸살", "반복성"];
    var PROFILE = {
      alr:  [4, 4, 4, 3, 1, 0, 0, 4],
      cold: [1, 2, 3, 3, 3, 1, 1, 0]
    };
    var rowsEl = root.querySelector(".fp__rows");
    function render(p) {
      rowsEl.className = "fp__rows " + p;
      rowsEl.innerHTML = KEYS.map(function (k, i) {
        var dots = "";
        for (var n = 1; n <= 4; n++) dots += "<i class='" + (n <= PROFILE[p][i] ? "on" : "") + "'></i>";
        return "<div class='fp__row'><span>" + k + "</span><span class='fp__dots'>" + dots + "</span></div>";
      }).join("");
      root.querySelectorAll(".fp__toggle button").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-profile") === p);
      });
    }
    root.querySelectorAll(".fp__toggle button").forEach(function (b) {
      b.addEventListener("click", function () { render(b.getAttribute("data-profile")); });
    });
    render("alr");
  }

  /* ---------- Viz 5 · Trigger Timeline ---------- */
  function initAlrExpo() {
    var root = document.querySelector("[data-alrexpo]");
    if (!root) return;
    var btn = root.querySelector("[data-alr-expo]");
    var rows = root.querySelectorAll(".alr__expo-row");
    var timers = [];
    btn.addEventListener("click", function () {
      timers.forEach(clearTimeout);
      timers = [];
      rows.forEach(function (r) { r.classList.remove("on"); });
      rows.forEach(function (r, i) {
        timers.push(setTimeout(function () { r.classList.add("on"); }, i * 800));
      });
      btn.textContent = "↺ 다시 털기";
    });
  }

  /* ---------- Viz 6 · Symptom Selector ---------- */
  function initAlrPick() {
    var root = document.querySelector("[data-alrpick]");
    if (!root) return;
    var out = root.querySelector(".alr__out");
    var sel = {};
    function card(k, on) { root.querySelector("[data-rx='" + k + "']").classList.toggle("on", on); }
    function render() {
      var hist = sel.sneeze || sel.itch || sel.runny;
      var incs = !!(sel.block || sel.persist);
      var eye = !!sel.eye;
      card("incs", incs);
      card("ah", !!hist && !incs);
      card("eye", eye);
      var msg;
      if (!hist && !incs && !eye) msg = "증상을 선택하면 어느 약물군이 강조되는지 보여줍니다.";
      else if (incs && sel.block && !hist) msg = "<b>코막힘 중심</b> → INCS. 경구 항히스타민제는 코막힘에 상대적으로 약합니다.";
      else if (incs) msg = "<b>코막힘이 있거나 지속적·수면 방해</b> → INCS 중심으로 생각합니다. INCS는 재채기·가려움·콧물까지 함께 조절합니다.";
      else if (hist) msg = "<b>재채기·가려움·콧물 위주의 간헐적 증상</b> → 2세대 경구 항히스타민제가 편리한 선택이 될 수 있습니다.";
      else msg = "<b>눈 증상 위주</b> → 경구 또는 점안 항히스타민제를 고려할 수 있습니다.";
      if (eye && (hist || incs)) msg += " 눈 가려움이 동반되면 점안제 추가도 고려합니다.";
      out.innerHTML = msg;
    }
    root.querySelectorAll("[data-sx]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-sx");
        sel[k] = !sel[k];
        b.classList.toggle("active", sel[k]);
        render();
      });
    });
  }

  /* ---------- Viz 7 · Decongestant Rebound ---------- */
  function initAlrRebound() {
    var root = document.querySelector("[data-alrrebound]");
    if (!root) return;
    var MSG = [
      "코가 막혀 답답합니다.",
      "혈관수축 스프레이(oxymetazoline 계열)를 뿌립니다. α-agonist가 점막 혈관을 수축시킵니다.",
      "몇 분 안에 뻥 뚫립니다. 그래서 '제일 잘 듣는 약'으로 기억됩니다.",
      "약효가 끝나면 혈관이 다시 확장됩니다. 반복 사용할수록 반동성 충혈이 커집니다.",
      "전보다 더 막힌 느낌 → 또 뿌리게 됩니다."
    ];
    var nodes = root.querySelectorAll(".alr__cyc");
    var out = root.querySelector(".alr__out");
    var loopEl = root.querySelector("[data-alr-loop]");
    var meter = root.querySelector("[data-meter='base']");
    var stepBtn = root.querySelector("[data-alr-step]");
    var idx = -1, loops = 0;

    function render() {
      nodes.forEach(function (n, i) { n.classList.toggle("on", i === idx); });
      loopEl.textContent = loops;
      meter.style.width = Math.min(100, 35 + loops * 22) + "%";
      stepBtn.textContent = idx === 4 ? "↻ 또 뿌린다" : "▶ 다음 단계";
      if (idx < 0) {
        out.className = "alr__out";
        out.textContent = "코막힘 스프레이를 '매일' 쓰면 어떤 일이 생길까요?";
      } else if (loops >= 2 && idx >= 3) {
        out.className = "alr__out no";
        out.innerHTML = "<b>Rhinitis medicamentosa</b> — 약이 코막힘의 원인이 된 상태입니다. 혈관수축성 스프레이는 <b>단기간만</b> 사용하고, 지속적인 코막힘에는 INCS 등 다른 접근을 생각합니다.";
      } else {
        out.className = "alr__out" + (idx === 2 ? " ok" : "");
        out.textContent = MSG[idx];
      }
    }
    stepBtn.addEventListener("click", function () {
      if (idx === 4) { loops++; idx = 1; } else idx++;
      render();
    });
    root.querySelector("[data-alr-reset]").addEventListener("click", function () {
      idx = -1; loops = 0;
      render();
    });
    render();
  }

  /* ---------- Viz 8 · Nasal Spray Simulator ---------- */
  function initAlrSpray() {
    var root = document.querySelector("[data-alrspray]");
    if (!root) return;
    var wrap = root.querySelector(".alr__spray");
    var nozzle = root.querySelector(".alr__nozzle");
    var out = root.querySelector(".alr__out");
    // 정면도: 환자의 오른쪽 콧구멍 = 화면 왼쪽
    var X = { right: 78, left: 162 };
    var ANG = { septum: 24, straight: 0, lateral: -16 };
    var RES = {
      septum:   { cls: "no",  txt: "❌ <b>Too medial</b> — 약이 비중격에 반복적으로 닿으면 자극과 비출혈 가능성이 높아집니다." },
      straight: { cls: "mid", txt: "△ <b>조금 더 바깥쪽으로</b> — 똑바로 위보다는 같은 쪽 귀 방향으로 살짝 기울입니다." },
      lateral:  { cls: "ok",  txt: "✅ <b>Correct direction</b> — 비중격을 피해 바깥쪽 벽(같은 쪽 귀 방향)으로 분무합니다." }
    };
    var state = { side: "right", dir: "" };

    function render() {
      var a = (ANG[state.dir] || 0) * (state.side === "right" ? 1 : -1);
      nozzle.style.transform = "translate(" + X[state.side] + "px, 162px) rotate(" + a + "deg)";
      var r = RES[state.dir];
      wrap.className = "alr__spray" + (r ? " is-" + r.cls : "");
      out.className = "alr__out" + (r ? " " + r.cls : "");
      out.innerHTML = r ? r.txt : "노즐 방향을 선택하세요.";
      root.querySelectorAll("[data-hand]").forEach(function (h) {
        h.classList.toggle("on", h.getAttribute("data-hand") === state.side);
      });
      root.querySelectorAll(".hypo__opts").forEach(function (grp) {
        var key = grp.getAttribute("data-group");
        grp.querySelectorAll("button").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-val") === state[key]);
        });
      });
    }
    root.querySelectorAll(".hypo__opts").forEach(function (grp) {
      var key = grp.getAttribute("data-group");
      grp.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          state[key] = b.getAttribute("data-val");
          render();
        });
      });
    });
    render();
  }

  /* =========================================================
     ===========  Everyday 04 · 수족구병 (HFMD)  ===========
     ========================================================= */

  function initHFMDBodyMap() {
    var root = document.querySelector("[data-hfmdbodymap]");
    if (!root) return;
    var info = root.querySelector(".hfmd__bodyinfo");
    var DATA = {
      mouth: "<b>👄 입</b> — 통증성 수포·궤양이 혀, 잇몸, 볼 안쪽, 입천장 등에 생깁니다. 먹거나 마실 때 아파서 침을 많이 흘리기도 합니다. <b>가장 중요한 부위</b> — 입안 통증이 수분 섭취를 방해합니다.",
      hands: "<b>✋ 손바닥</b> — 손바닥과 손가락에 편평하거나 약간 솟은 붉은 병변 또는 작은 수포가 생깁니다. 수족구병의 핵심 감별 단서입니다.",
      feet: "<b>🦶 발바닥</b> — 발바닥에도 병변이 생긴다는 점이 중요합니다. 일반적인 바이러스 발진은 손바닥·발바닥을 상대적으로 덜 침범합니다.",
      butt: "<b>🍑 엉덩이·팔·다리</b> — 수족구라는 이름과 달리 엉덩이·팔·다리에도 병변이 생길 수 있습니다. Hand + Foot + Mouth는 대표 위치이지 유일한 위치가 아닙니다."
    };
    root.querySelectorAll(".hfmd__zone-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".hfmd__zone-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-bzone");
        if (info && DATA[key]) info.innerHTML = DATA[key];
      });
    });
  }

  function initHFMDTransmit() {
    var root = document.querySelector("[data-hfmdtransmit]");
    if (!root) return;
    var desc = root.querySelector(".hfmd__routedesc");
    var DATA = {
      cup:    "🥤 <b>컵·식기 공유하지 않기</b> — 침 속 바이러스가 공유된 컵을 통해 전달됩니다. 아이들이 같은 컵을 쓰지 않도록 합니다.",
      toy:    "🧸 <b>장난감·표면 소독</b> — 바이러스가 표면에 남아 있을 수 있습니다. 자주 닿는 장난감과 문손잡이 등을 정기적으로 소독합니다.",
      touch:  "✋ <b>비누와 물로 손씻기</b> — 직접 접촉 후 손위생이 가장 중요합니다. 비누와 물로 20초 이상 씻습니다.",
      diaper: "🚼 <b>기저귀 교체 전후 철저한 손위생</b> — 대변-경구 경로는 매우 중요합니다. 기저귀 교체 후 반드시 비누와 물로 손을 씻습니다."
    };
    root.querySelectorAll(".hfmd__route").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".hfmd__route").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-route");
        if (desc && DATA[key]) desc.innerHTML = DATA[key];
      });
    });
  }

  function initHFMDSymMatch() {
    var root = document.querySelector("[data-hfmdsymatch]");
    if (!root) return;
    var result = root.querySelector(".hfmd__symresult");
    var chips = root.querySelectorAll(".hfmd__sym-chip");
    var revealed = 0;
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.classList.contains("revealed")) return;
        chip.classList.add("revealed");
        chip.classList.add(chip.getAttribute("data-sym-ans") === "match" ? "match" : "nomatch");
        revealed++;
        if (!result) return;
        if (revealed < chips.length) {
          result.innerHTML = "모든 chip을 탭해 분류해보세요. (" + revealed + "/" + chips.length + " 완료)";
        } else {
          result.innerHTML = "<b>🟢 HFMD 강한 단서:</b> 손바닥·발바닥 발진, 입안 통증성 궤양, 통증으로 인한 침흘림<br><b>🔴 다른 진단 고려:</b> 심한 가려움·몸통 중심 광범위 수포·여러 단계 병변 동시 → 수두(Varicella) 생각";
        }
      });
    });
  }

  function initHFMDHydration() {
    var root = document.querySelector("[data-hfmdhydration]");
    if (!root) return;
    var contentEl = root.querySelector(".hfmd__hyd-content");
    if (!contentEl) return;
    var STEPS = [
      { q: "① 물이나 음료를 마실 수 있나요?",        yes: 1, no: "drink" },
      { q: "② 소변이 나오나요? (최근 몇 시간 기준)", yes: 2, no: "urine" },
      { q: "③ 아이가 활동하거나 반응하나요?",        yes: "safe", no: "lethargy" }
    ];
    var RESULTS = {
      safe:     { cls: "safe",    html: "🟢 <b>현재: 관찰</b> — 수분 가능·소변 정상·활동 가능. 통증 조절 + 수분 유지를 계속합니다." },
      drink:    { cls: "urgent",  html: "🔴 <b>빠른 진료 권고</b> — 물을 전혀 마실 수 없는 상태. 구강통으로 인한 탈수 위험이 높습니다." },
      urine:    { cls: "caution", html: "🟡 <b>진료 고려</b> — 소변량 감소는 탈수 신호일 수 있습니다. 다른 탈수 증상과 함께 의료기관 평가를 고려합니다." },
      lethargy: { cls: "urgent",  html: "🔴 <b>빠른 진료 권고</b> — 처짐·반응 저하는 중증 탈수 또는 신경계 문제의 경고 신호일 수 있습니다." }
    };
    function showStep(idx) {
      var s = STEPS[idx];
      contentEl.innerHTML =
        "<div class='hfmd__hyd-step'>" +
        "<div class='hfmd__hyd-q'>" + s.q + "</div>" +
        "<div class='hfmd__hyd-btns'>" +
        "<button class='hfmd__hyd-btn' data-ha='yes'>✅ 예</button>" +
        "<button class='hfmd__hyd-btn' data-ha='no'>❌ 아니오</button>" +
        "</div></div>";
      contentEl.querySelectorAll(".hfmd__hyd-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var next = btn.getAttribute("data-ha") === "yes" ? s.yes : s.no;
          if (typeof next === "number") { showStep(next); return; }
          var r = RESULTS[next];
          contentEl.innerHTML =
            "<div class='hfmd__hyd-result " + r.cls + "'>" + r.html + "</div>" +
            "<button class='btn btn--ghost' style='margin-top:10px;width:100%;' id='hfmdHydReset'>↺ 다시 평가</button>";
          var rb = document.getElementById("hfmdHydReset");
          if (rb) rb.addEventListener("click", function () { showStep(0); });
        });
      });
    }
    showStep(0);
  }

  function initHFMDSchool() {
    var root = document.querySelector("[data-hfmdschool]");
    if (!root) return;
    var flipBtn = root.querySelector(".hfmd__school-flip-btn");
    var back = root.querySelector(".hfmd__school-back");
    var content = root.querySelector(".hfmd__school-content");
    var TAB_DATA = {
      kr:   "🇰🇷 <b>한국 (질병관리청)</b><br>2026년 질병관리청은 수족구병 의심 증상이 있으면 어린이집·유치원 등원을 중지하고 다중이용시설 이용을 자제하도록 권고했습니다. <b>회복 후 등원</b>을 안내합니다.<br><br><small style='color:var(--ink-soft)'>해당 시설 및 관할 보건당국의 최신 지침을 함께 확인합니다.</small>",
      intl: "🌎 <b>미국 CDC / AAP</b><br>일반적으로 다음을 만족하면 등원 가능으로 안내:<br>• 발열이 없음<br>• 활동할 만큼 상태가 좋음<br>• 구강 병변으로 인한 조절 안 되는 침흘림 없음<br><br><small style='color:var(--ink-soft)'>바이러스 배출 기간 ≠ 등원 기준. 지역 유행 시 보건당국 별도 지침 따름.</small>"
    };
    if (back) back.style.display = "none";
    if (flipBtn && back) {
      flipBtn.addEventListener("click", function () {
        var showing = back.style.display !== "none";
        back.style.display = showing ? "none" : "block";
        flipBtn.textContent = showing ? "기준 보기 ↓" : "접기 ↑";
      });
    }
    if (content) content.innerHTML = TAB_DATA.kr;
    root.querySelectorAll(".hfmd__stab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        root.querySelectorAll(".hfmd__stab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        if (content) content.innerHTML = TAB_DATA[tab.getAttribute("data-stab")] || "";
      });
    });
  }

  /* =========================================================
     ===========  Core 09 · 협심증·심근경색 인터랙션  ===========
     ========================================================= */

  /* ---------- Viz · Myocardial O₂ Balance ---------- */
  function initO2Balance() {
    var root = document.querySelector("[data-o2balance]");
    if (!root) return;
    var state = { stenosis: 0, hgb: 0, hr: 0, contractility: 0 };
    var supplyFill = root.querySelector("#supplyFill");
    var demandFill = root.querySelector("#demandFill");
    var statusEl  = root.querySelector("#o2Status");
    var labelEl   = root.querySelector("#o2Label");

    function renderBars(f) {
      var lv = state[f], bars = "";
      for (var i = -2; i <= 2; i++) {
        var on = (lv > 0 && i > 0 && i <= lv) || (lv < 0 && i < 0 && i >= lv) || (i === 0);
        bars += "<i class='" + (on ? "on" : "") + "'></i>";
      }
      return bars;
    }
    function render() {
      // supply: base 60%, stenosis↑ = supply↓, hgb↑ = supply↑
      var supply = 60 - state.stenosis * 12 + state.hgb * 8;
      // demand: base 40%, hr↑ and contractility↑ = demand↑
      var demand = 40 + state.hr * 10 + state.contractility * 10;
      supply = Math.max(10, Math.min(100, supply));
      demand = Math.max(10, Math.min(100, demand));
      supplyFill.style.width = supply + "%";
      demandFill.style.width = demand + "%";
      var ischemia = demand > supply + 8;
      var border   = demand > supply - 8 && !ischemia;
      statusEl.className = "o2b__status" + (ischemia ? " ischemia" : border ? " border" : "");
      statusEl.textContent = ischemia ? "⚠ Ischemia" : border ? "경계" : "O₂ 균형";
      labelEl.textContent = ischemia ? "공급 부족!" : "균형";
      // update bars
      root.querySelectorAll(".bpsim__factor").forEach(function (fx) {
        var barsEl = fx.querySelector(".bars");
        if (barsEl) barsEl.innerHTML = renderBars(fx.getAttribute("data-factor"));
      });
    }
    root.addEventListener("click", function (e) {
      var s = e.target.closest(".stepper");
      if (!s) return;
      var fx = s.closest(".bpsim__factor");
      var key = fx.getAttribute("data-factor");
      state[key] = Math.max(-2, Math.min(2, state[key] + parseInt(s.getAttribute("data-step"), 10)));
      render();
    });
    render();
  }

  /* ---------- Viz · Stable Angina Simulator ---------- */
  function initStableSim() {
    var root = document.querySelector("[data-stablesim]");
    if (!root) return;
    var stenoSlider = root.querySelector("#ssStenoSlider");
    var stenoVal    = root.querySelector("#ssStenoVal");
    var stenoFill   = root.querySelector(".stenosis-fill");
    var supplyFill2 = root.querySelector(".supply-fill");
    var demandFill2 = root.querySelector(".demand-fill");
    var supplyV     = root.querySelector("#ssSupply");
    var demandV     = root.querySelector("#ssDemand");
    var resultEl    = root.querySelector("#ssResult");
    var mode = "rest";
    var MODES = {
      rest:     { demand: 35, label: "😴 안정" },
      walk:     { demand: 60, label: "🚶 걷기" },
      exercise: { demand: 85, label: "🏃 운동" }
    };

    function render() {
      var steno = parseInt(stenoSlider.value, 10);
      var maxSupply = Math.round(100 - steno * 0.7);
      var dem = MODES[mode].demand;
      stenoVal.textContent = steno;
      stenoFill.style.width = steno + "%";
      supplyFill2.style.width = maxSupply + "%";
      demandFill2.style.width = dem + "%";
      supplyV.textContent = maxSupply;
      demandV.textContent = dem;
      var ischemia = dem > maxSupply + 5;
      resultEl.innerHTML = ischemia
        ? "<span style='color:var(--hi);font-weight:700;'>⚠ Ischemia — 공급(" + maxSupply + ")이 수요(" + dem + ")를 따라가지 못합니다. 흉통 발생!</span>"
        : "<span style='color:var(--ok);font-weight:700;'>✓ 균형 — 공급(" + maxSupply + ") ≥ 수요(" + dem + "). 증상 없음.</span>";
    }
    stenoSlider.addEventListener("input", render);
    root.querySelectorAll("[data-ss]").forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-ss");
        root.querySelectorAll("[data-ss]").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        render();
      });
    });
    // set rest active by default
    var restBtn = root.querySelector("[data-ss='rest']");
    if (restBtn) { restBtn.classList.add("active"); }
    render();
  }

  /* ---------- Viz · Stable → ACS Flow ---------- */
  var ACSF_DATA = [
    { ico: "🩺", title: "Stable stenosis", body: "Fixed coronary stenosis (예: 60%). 안정 시 혈류는 충분. 운동 시에만 일시적 ischemia가 발생합니다. Plaque는 두꺼운 fibrous cap으로 안정되어 있습니다." },
    { ico: "💥", title: "Plaque rupture", body: "Vulnerable plaque의 thin fibrous cap이 파열됩니다. Plaque 내부(lipid core · tissue factor · collagen)가 혈액에 노출됩니다." },
    { ico: "🔴", title: "Acute thrombosis", body: "Collagen에 platelet이 부착 → 활성화 → 응집. Coagulation cascade 작동 → thrombin → fibrin → 혈전이 빠르게 커집니다." },
    { ico: "⚡", title: "ACS", body: "혈전이 lumen을 부분 또는 완전히 막아 coronary flow가 급감합니다. → Unstable angina · NSTEMI · STEMI 중 하나로 나타납니다." }
  ];
  function initACSFlow() {
    var root = document.querySelector("[data-acsflow]");
    if (!root) return;
    var out   = root.querySelector(".acsf__out");
    var steps = Array.prototype.slice.call(root.querySelectorAll(".acsf__step"));
    var idx = 0;
    function render() {
      steps.forEach(function (s, k) {
        s.classList.toggle("active", k <= idx);
      });
      var d = ACSF_DATA[idx];
      out.innerHTML = "<b>" + d.ico + " " + d.title + "</b> — " + d.body;
    }
    root.querySelector("[data-acsf-step]").addEventListener("click", function () {
      if (idx < ACSF_DATA.length - 1) { idx++; render(); }
    });
    root.querySelector("[data-acsf-reset]").addEventListener("click", function () {
      idx = 0; render();
    });
    render();
  }

  /* ---------- Viz · ACS Spectrum cards ---------- */
  var ACS_DATA = {
    ua: {
      tag: "Ischemia O · Necrosis X",
      cls: "warn",
      detail: "<b>Unstable Angina</b><br>급성 myocardial ischemia가 있지만 명확한 necrosis는 없습니다.<br><b>Troponin 정상</b> — 심근세포가 죽지 않은 상태.<br>새롭게 발생한 심한 angina / 안정시 angina / 빈도·강도 악화 angina.<br>응급 ACS 평가 필요."
    },
    nstemi: {
      tag: "Ischemia O · Necrosis O · Troponin ↑",
      cls: "hi",
      detail: "<b>NSTEMI</b><br>급성 ischemia + myocardial necrosis가 있습니다.<br><b>Troponin 상승</b> — 심근세포가 죽었습니다.<br>ECG에서 persistent ST elevation은 전형적으로 없습니다.<br>ST depression · T-wave inversion · 정상 ECG도 가능."
    },
    stemi: {
      tag: "Ischemia O · Necrosis O · ST elevation",
      cls: "danger",
      detail: "<b>STEMI</b><br>일반적으로 acute coronary occlusion으로 광범위하고 심한 transmural ischemia 발생.<br><b>ECG: ST-segment elevation</b> (전형적).<br>Troponin 상승.<br><b>즉각적인 reperfusion이 핵심</b> — Time is muscle."
    }
  };
  function initACSSpectrum() {
    var root = document.querySelector("[data-acsspectrum]");
    if (!root) return;
    root.querySelectorAll(".acs__card").forEach(function (card) {
      var key = card.getAttribute("data-acs");
      var d = ACS_DATA[key];
      var tagEl = card.querySelector(".acs__tag");
      var detEl = card.querySelector(".acs__detail");
      if (tagEl) { tagEl.textContent = d.tag; tagEl.className = "acs__tag " + d.cls; }
      card.addEventListener("click", function () {
        var open = card.classList.toggle("open");
        if (detEl) {
          detEl.style.display = open ? "block" : "none";
          if (open) detEl.innerHTML = d.detail;
        }
      });
    });
  }

  /* ---------- Viz · Time Is Muscle ---------- */
  var TIM_STAGES = [
    { label: "0분",   r: 0,  desc: "허혈 시작 직후. 아직 reversible injury 단계.", salvage: 100 },
    { label: "20분",  r: 12, desc: "Subendocardial injury 시작. 일부 심근세포 손상 시작.", salvage: 85 },
    { label: "1시간", r: 22, desc: "Irreversible injury 확대 시작. 빠른 reperfusion이 중요해집니다.", salvage: 65 },
    { label: "2시간", r: 32, desc: "Necrosis 범위 확대 중. Subendocardial → transmural로 진행.", salvage: 40 },
    { label: "4시간", r: 42, desc: "상당한 범위의 necrosis. 살릴 수 있는 심근이 줄어들고 있습니다.", salvage: 20 },
    { label: "6시간+", r: 52, desc: "광범위한 necrosis. LV function 손상이 크게 될 수 있습니다.", salvage: 5 }
  ];
  function initTimeIsMuscle() {
    var root = document.querySelector("[data-timemuscle]");
    if (!root) return;
    var slider   = root.querySelector("#timSlider");
    var timeLabel = root.querySelector("#timTimeLabel");
    var descEl   = root.querySelector("#timDesc");
    var necEl    = root.querySelector(".tim__necrosis");
    var necLabel = root.querySelector(".tim__necrosis-label");
    var verdictEl = root.querySelector("#timVerdict");
    var reperfused = false;

    function render() {
      var i = parseInt(slider.value, 10);
      var s = TIM_STAGES[i];
      timeLabel.textContent = s.label;
      descEl.textContent = s.desc;
      necEl.setAttribute("r", s.r);
      necLabel.textContent = s.r > 0 ? "괴사" : "";
      if (reperfused) {
        verdictEl.innerHTML = "<span style='color:var(--ok);font-weight:700;'>⚡ Reperfusion 시행! " + TIM_STAGES[parseInt(slider.value,10)].label + " 기준 salvage 가능 심근 약 " + s.salvage + "%</span>";
      } else {
        verdictEl.innerHTML = s.salvage < 50
          ? "<span style='color:var(--hi);font-weight:700;'>⚠ Salvage 가능 심근이 " + s.salvage + "%로 줄었습니다. 빠른 reperfusion이 필요합니다.</span>"
          : "";
      }
    }
    slider.addEventListener("input", function () { reperfused = false; render(); });
    root.querySelector("#timReperfuse").addEventListener("click", function () {
      reperfused = true; render();
    });
    root.querySelector("#timReset").addEventListener("click", function () {
      slider.value = 0; reperfused = false; render();
    });
    render();
  }

  /* ---------- Viz · Serial Troponin Timeline ---------- */
  function initTroponinTL() {
    var root = document.querySelector("[data-troponin]");
    if (!root) return;
    var normalLine = root.querySelector(".normal-line");
    var acuteLine  = root.querySelector(".acute-line");
    var labelEl    = root.querySelector(".trop__curve-label");
    var descEl     = root.querySelector("#tropDesc");
    root.querySelectorAll("[data-trop]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-trop]").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var k = b.getAttribute("data-trop");
        if (k === "normal") {
          normalLine.style.opacity = 1;
          acuteLine.style.opacity  = 0;
          labelEl.textContent = "정상 — 안정적으로 낮은 수준";
          descEl.innerHTML = "<b>정상 pattern</b> — troponin이 정상 상한 아래에서 안정적으로 유지됩니다. Rise-and-fall 없음.<br>단 한 번의 결과만으로는 충분하지 않으며, 임상상과 함께 serial 측정이 중요합니다.";
        } else {
          normalLine.style.opacity = 0;
          acuteLine.style.opacity  = 1;
          labelEl.textContent = "급성 MI — Rise-and-fall pattern";
          descEl.innerHTML = "<b>급성 MI pattern</b> — 발병 후 수 시간 내에 troponin이 상승(rise)하고, 이후 peak 후 감소(fall)합니다.<br>초기 한 번의 검사가 정상이어도 2~3시간 후 반복(serial) 검사에서 상승할 수 있습니다. 이것이 serial troponin이 중요한 이유입니다.";
        }
      });
    });
  }

  /* ---------- Viz · ACS Drug Map ---------- */
  var ACS_DRUGS = {
    aspirin:  { node: "platelet", out: "<b>Aspirin</b> — COX-1 억제 → Thromboxane A₂↓ → platelet aggregation↓. ACS 초기부터 투여. Plaque rupture 후 혈전 형성을 억제합니다." },
    p2y12:    { node: "platelet", out: "<b>P2Y12 inhibitor</b> (clopidogrel·ticagrelor·prasugrel) — ADP 경로 platelet activation 억제. Aspirin과 함께 DAPT를 구성합니다." },
    anticoag: { node: "coag",     out: "<b>Anticoagulant</b> (heparin·enoxaparin 등) — Coagulation cascade 억제 → thrombin·fibrin 형성↓ → 추가 thrombosis 방지. 급성 ACS 처치의 핵심." },
    nitrate:  { node: "ischemia", out: "<b>Nitrate (NTG)</b> — venodilation → preload↓ → O₂ demand↓ → ischemia 증상 완화. Plaque나 혈전 자체를 제거하지는 않습니다." },
    bb:       { node: "ischemia", out: "<b>β-blocker</b> — HR·contractility↓ → O₂ demand↓ → ischemia↓. 급성기 및 MI 이후 적응증(LV dysfunction·arrhythmia)에서 사용." },
    statin:   { node: "future",   out: "<b>Statin</b> — LDL-C↓ → future plaque progression↓ → recurrent ASCVD event↓. ACS 후 즉시 시작, 장기 사용. '수치가 높지 않아도' 고위험군이기 때문에 사용합니다." },
    acei:     { node: "future",   out: "<b>ACE inhibitor / ARB</b> — LV remodeling 억제, afterload↓. LV dysfunction·고혈압·당뇨·CKD가 있는 경우 특히 중요합니다." }
  };
  function initACSDrugMap() {
    var root = document.querySelector("[data-acsdrugmap]");
    if (!root) return;
    var out = root.querySelector(".adm__out");
    function clearHighlight() {
      root.querySelectorAll(".adm__node").forEach(function (n) { n.classList.remove("targeted"); });
      root.querySelectorAll("[data-adrug]").forEach(function (b) { b.classList.remove("active"); });
    }
    root.querySelectorAll("[data-adrug]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-adrug");
        if (key === "reset") { clearHighlight(); out.textContent = "약물 버튼을 눌러 어느 단계에 작용하는지 확인하세요."; return; }
        var d = ACS_DRUGS[key];
        if (!d) return;
        var already = btn.classList.contains("active");
        clearHighlight();
        if (already) { out.textContent = "약물 버튼을 눌러 어느 단계에 작용하는지 확인하세요."; return; }
        btn.classList.add("active");
        var node = root.querySelector("[data-drug-node='" + d.node + "']");
        if (node) node.classList.add("targeted");
        out.innerHTML = d.out;
      });
    });
  }

  /* ---------- Viz · ACS Decision Simulation ---------- */
  function initACSDecision() {
    var root = document.querySelector("[data-acsdecision]");
    if (!root) return;
    var state = { symptom: null, ecg: null, trop: null };
    var riskEl = root.querySelector(".hypo__risk");
    var expEl  = root.querySelector(".hypo__exp");

    function compute() {
      var s = state.symptom, e = state.ecg, t = state.trop;
      if (!s || !e || !t) { riskEl.textContent = "조합 선택 중..."; expEl.textContent = "세 가지를 모두 선택하면 결과가 나타납니다."; return; }

      var cls, txt, exp;
      if (s === "exertional" && e === "normal" && t === "neg") {
        cls = "low"; txt = "Stable angina 가능성";
        exp = "운동시 흉통 · 정상 ECG · troponin 음성. 전형적인 stable exertional angina 패턴을 생각할 수 있습니다. 만성 CAD 평가가 필요하며 ACS 응급은 아닐 수 있지만 임상 맥락을 함께 판단해야 합니다.";
      } else if (t === "neg" && (s === "rest" || e !== "normal")) {
        cls = "mid"; txt = "Unstable Angina 가능성";
        exp = "Troponin 음성이지만 안정 시 흉통 또는 ECG 변화가 있습니다. ACS(unstable angina)로 평가해야 합니다. Serial troponin으로 NSTEMI를 배제하는 것이 중요합니다.";
      } else if (t === "pos" && e !== "stup") {
        cls = "high"; txt = "NSTEMI 가능성";
        exp = "Troponin 상승 + ST elevation 없음(또는 ST depression/정상). NSTEMI로 평가합니다. 입원 후 조기 침습적 평가(coronary angiography) 전략을 고려합니다.";
      } else if (e === "stup") {
        cls = "danger"; txt = "STEMI — 즉각 reperfusion 필요!";
        exp = "ST elevation + 흉통 + (troponin 상승 또는 상승 예상). STEMI로 평가합니다. 즉각적인 primary PCI 또는 fibrinolysis를 고려해야 하며 시간이 매우 중요합니다. Time is muscle!";
      } else {
        cls = "mid"; txt = "추가 평가 필요";
        exp = "현재 조합만으로는 명확한 분류가 어렵습니다. 실제 임상에서는 전체 임상상·serial troponin·추가 ECG 등을 종합적으로 판단합니다.";
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
    });
    compute();
  }

  /* =========================================================
     ==============  Core 08 · 동맥경화 인터랙션  ==============
     ========================================================= */

  /* ---------- Viz · LDL → Foam Cell ---------- */
  var FOAM = [
    { cap: "1 · 혈액 속 LDL(apoB)", d: "농도가 높을수록 동맥벽 안으로 들어갈 기회가 늘어납니다.", op: { blood: 1 } },
    { cap: "2 · endothelium 통과", d: "일부 apoB 입자가 endothelium을 넘어 intima로 들어갑니다.", op: { blood: 1, intima: 1 } },
    { cap: "3 · intima에 retention", d: "proteoglycan과 결합해 머무릅니다 — response-to-retention. (긁어서 상처를 내는 게 아님)", op: { blood: 1, intima: 1 } },
    { cap: "4 · 변형(oxidation 등)", d: "머문 LDL이 산화·변형 → 내피가 inflammatory phenotype, adhesion molecule↑.", op: { blood: 1, intima: 1, modified: 1 } },
    { cap: "5 · monocyte → macrophage", d: "monocyte가 intima로 들어와 macrophage로 분화합니다.", op: { blood: 1, intima: 1, modified: 1, mono: 1 } },
    { cap: "6 · FOAM CELL", d: "macrophage가 변형 LDL을 섭취 → lipid로 가득 찬 foam cell. 축적되면 fatty streak.", op: { blood: 1, intima: 1, modified: 1, mono: 1, foam: 1 } }
  ];
  function initFoamCell() {
    var root = document.querySelector("[data-foam]");
    if (!root) return;
    var capEl = root.querySelector(".foam__caption");
    var descEl = root.querySelector(".foam__desc");
    var i = 0;
    function render() {
      var f = FOAM[i];
      capEl.textContent = f.cap;
      descEl.textContent = f.d;
      ["blood", "intima", "modified", "mono", "foam"].forEach(function (el) {
        var node = root.querySelector("[data-el='" + el + "']");
        if (node) node.style.opacity = f.op[el] ? 1 : 0.06;
      });
      var nb = root.querySelector("[data-foam-next]");
      if (nb) nb.textContent = i >= FOAM.length - 1 ? "완료 ✓" : "다음 단계 ▸";
    }
    root.querySelectorAll("[data-foam-next]").forEach(function (b) {
      b.addEventListener("click", function () { if (i < FOAM.length - 1) { i++; render(); } });
    });
    root.querySelectorAll("[data-foam-reset]").forEach(function (b) {
      b.addEventListener("click", function () { i = 0; render(); });
    });
    render();
  }

  /* ---------- Viz · Plaque Builder ---------- */
  var PB_STEPS = [
    { key: "retention", size: 16, inflam: 6, cap: 0 },
    { key: "monocyte", size: 6, inflam: 30, cap: 0 },
    { key: "foam", size: 20, inflam: 24, cap: 0 },
    { key: "smc", size: 16, inflam: 0, cap: 0 },
    { key: "collagen", size: 8, inflam: -8, cap: 40 },
    { key: "cap", size: 0, inflam: -12, cap: 45 }
  ];
  function initPlaqueBuilder() {
    var root = document.querySelector("[data-plaquebuilder]");
    if (!root) return;
    var idx = 0, size = 0, inflam = 0, cap = 0;
    var plaqueEl = root.querySelector(".pb__plaque");
    var lumenEl = root.querySelector(".pb__lumen");
    var gS = root.querySelector(".pb__g.size .fill");
    var gI = root.querySelector(".pb__g.inflam .fill");
    var gC = root.querySelector(".pb__g.cap .fill");
    var btns = Array.prototype.slice.call(root.querySelectorAll(".pb__steps button"));
    function clamp(x) { return Math.max(0, Math.min(100, x)); }
    function render() {
      size = clamp(size); inflam = clamp(inflam); cap = clamp(cap);
      plaqueEl.style.height = (size * 0.55) + "px";
      lumenEl.style.height = (60 - size * 0.4) + "px";
      gS.style.width = size + "%"; gI.style.width = inflam + "%"; gC.style.width = cap + "%";
      btns.forEach(function (b, k) { b.disabled = k !== idx; b.classList.toggle("done", k < idx); });
    }
    btns.forEach(function (b, k) {
      b.addEventListener("click", function () {
        if (k !== idx) return;
        var s = PB_STEPS[k];
        size += s.size; inflam += s.inflam; cap += s.cap; idx++;
        render();
      });
    });
    var reset = root.querySelector("[data-pb-reset]");
    if (reset) reset.addEventListener("click", function () { idx = 0; size = 0; inflam = 0; cap = 0; render(); });
    render();
  }

  /* ---------- Viz · Stable vs Vulnerable Plaque ---------- */
  function initStableVuln() {
    var root = document.querySelector("[data-svp]");
    if (!root) return;
    var clot = root.querySelector(".svp__card.vuln .svp__clot");
    var vStable = root.querySelector(".svp__card.stable .svp__verdict");
    var vVuln = root.querySelector(".svp__card.vuln .svp__verdict");
    function stress() {
      vStable.className = "svp__verdict ok"; vStable.textContent = "두꺼운 cap → 변화 없음 (안정)";
      clot.style.width = "60%";
      vVuln.className = "svp__verdict bad"; vVuln.textContent = "얇은 cap 파열 → platelet·thrombus → 급성 폐색!";
    }
    function reset() {
      vStable.className = "svp__verdict"; vStable.textContent = "";
      vVuln.className = "svp__verdict"; vVuln.textContent = "";
      clot.style.width = "0";
    }
    var s = root.querySelector("[data-svp-rupture]"); if (s) s.addEventListener("click", stress);
    var r = root.querySelector("[data-svp-reset]"); if (r) r.addEventListener("click", reset);
  }

  /* ---------- Viz · Plaque → Thrombus timeline ---------- */
  function initPlaque2Thrombus() {
    var root = document.querySelector("[data-p2t]");
    if (!root) return;
    var segs = Array.prototype.slice.call(root.querySelectorAll(".p2t__seg"));
    var timers = [];
    function reset() { timers.forEach(clearTimeout); timers = []; segs.forEach(function (s) { s.classList.remove("on"); }); }
    function play() {
      reset();
      segs.forEach(function (s, k) { timers.push(setTimeout(function () { s.classList.add("on"); }, k * 500)); });
    }
    var p = root.querySelector("[data-p2t-play]"); if (p) p.addEventListener("click", play);
    var r = root.querySelector("[data-p2t-reset]"); if (r) r.addEventListener("click", reset);
  }

  /* ---------- Viz · Cumulative apoB Exposure ---------- */
  function initCae() {
    var root = document.querySelector("[data-cae]");
    if (!root) return;
    var lvIn = root.querySelector("[data-cae-level]");
    var yrIn = root.querySelector("[data-cae-years]");
    var lvLab = root.querySelector("[data-cae-levellab]");
    var yrLab = root.querySelector("[data-cae-yearslab]");
    var particlesEl = root.querySelector(".cae__particles");
    var fillEl = root.querySelector(".cae__gauge .fill");
    var numEl = root.querySelector(".cae__gauge .num");
    function render() {
      var lv = parseInt(lvIn.value, 10);   // 70..220 (LDL-ish)
      var yr = parseInt(yrIn.value, 10);    // 0..40
      lvLab.textContent = "LDL/apoB ≈ " + lv + " mg/dL";
      yrLab.textContent = yr + "년 노출";
      var n = Math.round((lv - 40) / 8);
      particlesEl.innerHTML = new Array(Math.max(1, Math.min(60, n)) + 1).join("<i></i>");
      var exposure = (lv - 40) * yr;        // 누적 노출 지표
      var pct = Math.max(0, Math.min(100, exposure / 6000 * 100));
      fillEl.style.width = pct + "%";
      numEl.innerHTML = "누적 apoB 노출 지표 <b>" + Math.round(exposure) + "</b>";
    }
    lvIn.addEventListener("input", render);
    yrIn.addEventListener("input", render);
    render();
  }

  /* =========================================================
     ==============  Core 07 · 통풍(Gout) 인터랙션  ==============
     ========================================================= */

  /* ---------- Viz · Gout Iceberg ---------- */
  function initIceberg() {
    var root = document.querySelector("[data-iceberg]");
    if (!root) return;
    var flame = root.querySelector(".iceberg__flare");
    var berg = root.querySelector(".iceberg__berg");
    var burdenEl = root.querySelector(".iceberg__berg .burden");
    var out = root.querySelector(".iceberg__out");
    var burden = 100;
    function render() {
      burdenEl.textContent = burden + "%";
      berg.style.transform = "scale(" + (0.55 + burden / 100 * 0.45) + ")";
    }
    root.querySelectorAll("[data-ice]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-ice");
        if (act === "flare") {
          flame.classList.add("out");
          out.innerHTML = "<b>급성 치료(NSAID·colchicine·steroid)</b> — 수면 위 <b>불꽃(염증)</b>만 끕니다. 물밑 <b>crystal burden은 그대로</b> 남습니다.";
        } else if (act === "ult") {
          burden = Math.max(10, burden - 22); render();
          out.innerHTML = "<b>장기 ULT(allopurinol 등)</b> — 물밑 <b>crystal burden</b>을 천천히 줄입니다. (지금 " + burden + "%) 즉각적인 진통은 아닙니다.";
        } else {
          burden = 100; flame.classList.remove("out"); render();
          out.innerHTML = "리셋 — 발작(불꽃)은 빙산의 일각, 진짜 병은 물밑 crystal burden입니다.";
        }
      });
    });
    render();
  }

  /* ---------- Viz · Urate Balance ---------- */
  function initUrateBalance() {
    var root = document.querySelector("[data-urate]");
    if (!root) return;
    var state = { prod: 0, diet: 0, renalexc: 0, gutexc: 0 };
    var mods = { thiazide: false, ckd: false, alcohol: false };
    var fillEl = root.querySelector(".urate__gauge .fill");
    var numEl = root.querySelector(".urate__gauge .num");
    function renderBars(f) {
      var lv = state[f], bars = "";
      for (var i = -2; i <= 2; i++) {
        var on = (lv > 0 && i > 0 && i <= lv) || (lv < 0 && i < 0 && i >= lv) || (i === 0);
        bars += "<i class='" + (on ? "on" : "") + "'></i>";
      }
      return bars;
    }
    function render() {
      var urate = 5.5 + (state.prod + state.diet) * 0.7 - (state.renalexc + state.gutexc) * 0.7;
      if (mods.thiazide) urate += 1.1;
      if (mods.ckd) urate += 1.6;
      if (mods.alcohol) urate += 1.0;
      urate = Math.max(3, Math.min(13, urate));
      fillEl.style.width = (urate / 13 * 100) + "%";
      numEl.innerHTML = "Serum urate ≈ <b>" + urate.toFixed(1) + "</b> mg/dL" +
        (urate > 6.8 ? " <span style='color:var(--hi);font-size:13px'>(과포화 · 결정 형성 유리)</span>" : "");
      root.querySelectorAll(".bpsim__factor").forEach(function (fx) {
        var barsEl = fx.querySelector(".bars");
        if (barsEl) barsEl.innerHTML = renderBars(fx.getAttribute("data-factor"));
      });
    }
    root.addEventListener("click", function (e) {
      var s = e.target.closest(".stepper");
      if (s) {
        var key = s.closest(".bpsim__factor").getAttribute("data-factor");
        state[key] = Math.max(-2, Math.min(2, state[key] + parseInt(s.getAttribute("data-step"), 10)));
        render(); return;
      }
      var m = e.target.closest(".urate__extra button");
      if (m) {
        var mk = m.getAttribute("data-mod");
        mods[mk] = !mods[mk];
        m.classList.toggle("active", mods[mk]);
        render();
      }
    });
    render();
  }

  /* ---------- Viz · Crystal → Inflammation Cascade ---------- */
  var CASC_DRUG = {
    colchicine: { block: ["neutrophil"], out: "<b>Colchicine</b> — microtubule 억제로 <b>neutrophil</b>의 이동·활성을 차단. uric acid는 낮추지 않지만 염증을 끕니다." },
    nsaid: { block: ["pain"], out: "<b>NSAID</b> — COX 억제 → prostaglandin↓ → 통증·염증↓. (상류 cascade는 남지만 통증 신호를 끕니다.)" },
    steroid: { block: ["macrophage", "nlrp3", "il1", "neutrophil"], out: "<b>Corticosteroid</b> — 광범위한 inflammatory signaling 억제. NSAID·colchicine이 어려운 환자에서도 선택 가능." }
  };
  function initCascade() {
    var root = document.querySelector("[data-cascade]");
    if (!root) return;
    var out = root.querySelector(".casc__out");
    function reset() {
      root.querySelectorAll(".casc__step").forEach(function (s) { s.classList.remove("blocked", "calm"); });
      root.querySelectorAll(".casc__btns button").forEach(function (b) { b.classList.remove("active"); });
    }
    root.querySelectorAll(".casc__btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-drug");
        if (key === "reset") { reset(); out.innerHTML = "약을 선택하면 어느 단계를 끄는지 보입니다. <b>serum urate는 그대로 — 이 약들은 염증을 끕니다.</b>"; return; }
        reset();
        btn.classList.add("active");
        var d = CASC_DRUG[key];
        d.block.forEach(function (node) {
          var el = root.querySelector(".casc__step[data-node='" + node + "']");
          if (el) el.classList.add(node === "pain" ? "calm" : "blocked");
        });
        var pain = root.querySelector(".casc__step[data-node='pain']");
        if (pain) pain.classList.add("calm");
        out.innerHTML = d.out + " <b style='color:var(--urate)'>Serum urate는 그대로.</b>";
      });
    });
    out.innerHTML = "약을 선택하면 어느 단계를 끄는지 보입니다. <b>serum urate는 그대로 — 이 약들은 염증을 끕니다.</b>";
  }

  /* ---------- Viz · Crystal Dissolution Simulator ---------- */
  function initDissolution() {
    var root = document.querySelector("[data-dissolution]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var urateEl = root.querySelector(".diss__urate");
    var crystalsEl = root.querySelector(".diss__crystals");
    var verdictEl = root.querySelector(".diss__verdict");
    function render() {
      var u = parseFloat(input.value);
      urateEl.textContent = u.toFixed(1) + " mg/dL";
      // 결정 개수: 높을수록 많음(과포화에서 증가), 낮을수록 감소
      var n = Math.round(Math.max(3, (u - 4) * 7));
      crystalsEl.innerHTML = new Array(n + 1).join("<span></span>");
      var cls, txt;
      if (u > 6.8) { cls = "up"; txt = "과포화 — 결정이 계속 늘어남"; }
      else if (u >= 6) { cls = "eq"; txt = "포화점 근처 — 평형"; }
      else if (u >= 5) { cls = "down"; txt = "<6 — 결정이 천천히 녹음"; }
      else { cls = "down"; txt = "<5 — 결정 부담 큰 환자에서 더 빠른 dissolution"; }
      verdictEl.className = "diss__verdict " + cls;
      verdictEl.innerHTML = txt;
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- Viz · Acute vs Chronic Treatment Simulator ---------- */
  function initAcuteChronic() {
    var root = document.querySelector("[data-acutechronic]");
    if (!root) return;
    var mode = "flare";
    var burden = 80;
    var painFill = root.querySelector(".avc__meter.pain .fill");
    var painV = root.querySelector(".avc__meter.pain .v");
    var burdenFill = root.querySelector(".avc__meter.burden .fill");
    var burdenV = root.querySelector(".avc__meter.burden .v");
    var out = root.querySelector(".avc__out");
    function setMode(m) {
      mode = m; burden = 80;
      root.querySelectorAll(".avc__modes button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-mode") === m); });
      root.querySelectorAll(".avc__btns button").forEach(function (b) { b.classList.remove("active"); });
      render(mode === "flare" ? 100 : 0);
      out.innerHTML = mode === "flare"
        ? "🔥 <b>발작 중</b> — 통증 10/10. 약을 눌러보세요."
        : "🧊 <b>발작 사이</b> — 통증은 없지만 crystal burden은 남아 있습니다. 약을 눌러보세요.";
    }
    function render(pain) {
      painFill.style.width = pain + "%"; painV.textContent = "통증 " + Math.round(pain / 10) + "/10";
      burdenFill.style.width = burden + "%"; burdenV.textContent = "Crystal " + burden + "%";
    }
    root.querySelectorAll(".avc__modes button").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
    });
    root.querySelectorAll(".avc__btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".avc__btns button").forEach(function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        var drug = btn.getAttribute("data-drug");
        var antiInflam = drug === "nsaid" || drug === "colchicine" || drug === "steroid";
        if (mode === "flare") {
          if (antiInflam) { render(15); out.innerHTML = "<b>" + btn.textContent + "</b> → 염증↓ → 통증 완화. 단 <b>crystal burden(" + burden + "%)은 그대로.</b>"; }
          else { render(100); out.innerHTML = "<b>Allopurinol</b> → 지금 통증엔 즉효 없음. 대신 <b>장기 serum urate↓</b>로 crystal을 서서히 줄입니다."; }
        } else {
          if (antiInflam) { render(0); out.innerHTML = "<b>" + btn.textContent + "</b> → 지금 통증이 없어 변화 없음. <b>crystal burden(" + burden + "%)도 그대로.</b>"; }
          else { burden = Math.max(20, burden - 25); render(0); out.innerHTML = "<b>Allopurinol</b> → urate↓ → 시간이 지나며 <b>crystal burden ↓ (" + burden + "%).</b> 발작 사이에도 꾸준히 복용하는 이유입니다."; }
        }
      });
    });
    setMode("flare");
  }

  /* =========================================================
     ============  Core 06 · 지방간(MASLD) 인터랙션  ============
     ========================================================= */

  /* ---------- Viz 1 · Liver Fat Balance ---------- */
  function initLiverFat() {
    var root = document.querySelector("[data-liverfat]");
    if (!root) return;
    // 들어옴(+): ffa, diet, dnl / 나감(−): oxid, vldl
    var state = { ffa: 0, diet: 0, dnl: 0, oxid: 0, vldl: 0 };
    var IN = ["ffa", "diet", "dnl"];
    var fillEl = root.querySelector(".lf__gauge .fill");
    var numEl = root.querySelector(".lf__gauge .num");
    var statusEl = root.querySelector(".lf__gauge .status");
    function renderBars(f) {
      var lv = state[f], bars = "";
      for (var i = -2; i <= 2; i++) {
        var on = (lv > 0 && i > 0 && i <= lv) || (lv < 0 && i < 0 && i >= lv) || (i === 0);
        bars += "<i class='" + (on ? "on" : "") + "'></i>";
      }
      return bars;
    }
    function render() {
      var inSum = state.ffa + state.diet + state.dnl;
      var outSum = state.oxid + state.vldl;
      var fat = 34 + inSum * 9 - outSum * 9;
      fat = Math.max(3, Math.min(100, fat));
      fillEl.style.width = fat + "%";
      numEl.textContent = "Hepatic fat 지표 " + Math.round(fat);
      var cls, txt;
      if (fat < 33) { cls = "ok"; txt = "정상 균형"; }
      else if (fat < 60) { cls = "mid"; txt = "지방 축적(steatosis)"; }
      else { cls = "hi"; txt = "지방 과다"; }
      statusEl.className = "status " + cls;
      statusEl.textContent = txt;
      root.querySelectorAll(".bpsim__factor").forEach(function (fx) {
        var barsEl = fx.querySelector(".bars");
        if (barsEl) barsEl.innerHTML = renderBars(fx.getAttribute("data-factor"));
      });
    }
    root.addEventListener("click", function (e) {
      var s = e.target.closest(".stepper");
      if (!s) return;
      var key = s.closest(".bpsim__factor").getAttribute("data-factor");
      state[key] = Math.max(-2, Math.min(2, state[key] + parseInt(s.getAttribute("data-step"), 10)));
      render();
    });
    render();
  }

  /* ---------- Viz 3 · MASLD Spectrum Slider ---------- */
  var MASLD_SPEC = [
    { n: "정상 간", fat: 6, fibro: 3, rev: "hi", revT: "가역성 높음", d: "지방 축적이 거의 없는 정상 간." },
    { n: "Steatosis (단순 지방간)", fat: 55, fibro: 8, rev: "hi", revT: "가역성 높음", d: "hepatocyte 안 지방 축적. 반드시 심한 염증·섬유화가 있는 것은 아님." },
    { n: "MASH (지방간염)", fat: 62, fibro: 30, rev: "mid", revT: "가역성 중간", d: "지방축적 + hepatocyte injury + inflammation(ballooning). 섬유화 진행 위험↑." },
    { n: "Fibrosis (섬유화)", fat: 55, fibro: 60, rev: "mid", revT: "가역성 감소", d: "반복된 손상·wound healing → collagen 침착. 장기 예후의 핵심 인자." },
    { n: "Cirrhosis (간경변)", fat: 40, fibro: 92, rev: "lo", revT: "가역성 낮음", d: "간 구조 왜곡·nodule. portal hypertension·liver failure·HCC 위험." }
  ];
  function initMasldSpectrum() {
    var root = document.querySelector("[data-masld-spectrum]");
    if (!root) return;
    var input = root.querySelector("input[type=range]");
    var stageEl = root.querySelector(".mspec__stage");
    var fatFill = root.querySelector(".mspec__bar.fat .fill");
    var fatVal = root.querySelector(".mspec__bar.fat .v");
    var fibroFill = root.querySelector(".mspec__bar.fibro .fill");
    var fibroVal = root.querySelector(".mspec__bar.fibro .v");
    var revEl = root.querySelector(".mspec__rev");
    var descEl = root.querySelector(".mspec__desc");
    function render() {
      var s = MASLD_SPEC[parseInt(input.value, 10)];
      stageEl.textContent = s.n;
      fatFill.style.width = s.fat + "%"; if (fatVal) fatVal.textContent = s.fat + "%";
      fibroFill.style.width = s.fibro + "%"; if (fibroVal) fibroVal.textContent = s.fibro + "%";
      revEl.innerHTML = "<span class='" + s.rev + "'>" + s.revT + "</span>";
      descEl.textContent = s.d;
    }
    input.addEventListener("input", render);
    render();
  }

  /* ---------- Viz · FIB-4 Learning Calculator ---------- */
  function initFib4() {
    var root = document.querySelector("[data-fib4]");
    if (!root) return;
    var valEl = root.querySelector(".fib4__val");
    var bandEl = root.querySelector(".fib4__band");
    function num(sel) { var el = root.querySelector(sel); return parseFloat(el && el.value); }
    function render() {
      var age = num("[data-fib4-age]"), ast = num("[data-fib4-ast]"),
        alt = num("[data-fib4-alt]"), plt = num("[data-fib4-plt]");
      if (!(age > 0 && ast > 0 && alt > 0 && plt > 0)) {
        valEl.textContent = "FIB-4 —"; bandEl.className = "fib4__band"; bandEl.textContent = "값을 입력하세요"; return;
      }
      var fib4 = (age * ast) / (plt * Math.sqrt(alt));
      valEl.textContent = "FIB-4 " + fib4.toFixed(2);
      var cls, txt;
      if (fib4 < 1.3) { cls = "low"; txt = "낮은 위험군 — 일차진료 추적/재평가"; }
      else if (fib4 <= 2.67) { cls = "ind"; txt = "불확실 — elastography 등 2차 평가"; }
      else { cls = "high"; txt = "높은 위험 — 전문진료(hepatology) 고려"; }
      bandEl.className = "fib4__band " + cls;
      bandEl.textContent = txt;
    }
    root.querySelectorAll("input").forEach(function (i) { i.addEventListener("input", render); });
    render();
  }

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

  /* =========================================================
     ===========  Core 10 · 뇌졸중 인터랙션  ===========
     ========================================================= */

  /* ---------- Viz 1 · Brain Blood Flow Explorer ---------- */
  function initBrainFlow() {
    var root = document.querySelector("[data-brainflow]");
    if (!root) return;
    var stages = [
      root.querySelector("#bfStage0"),
      root.querySelector("#bfStage1"),
      root.querySelector("#bfStage2"),
      root.querySelector("#bfStage3")
    ];
    var ischemia = root.querySelector("#bfIschemia");
    var occlude = root.querySelector("#bfOcclude");
    var occludeLabel = root.querySelector("#bfOccludeLabel");
    var mcaLeft = root.querySelector(".bf__mca-left");
    var msg = root.querySelector("#bfMsg");

    function setStages(active) {
      stages.forEach(function (s, i) {
        if (!s) return;
        s.style.opacity = i <= active ? "1" : "0.3";
      });
    }
    function setNormal() {
      setStages(0);
      if (ischemia) ischemia.setAttribute("opacity", "0");
      if (occlude) occlude.setAttribute("opacity", "0");
      if (occludeLabel) occludeLabel.setAttribute("opacity", "0");
      if (mcaLeft) mcaLeft.setAttribute("stroke", "#2f6fed");
      if (msg) msg.innerHTML = "정상 상태. Autoregulation이 작동해 뇌혈류가 유지됩니다.";
    }
    function setOcclude() {
      if (mcaLeft) mcaLeft.setAttribute("stroke", "#e5484d");
      if (occlude) occlude.setAttribute("opacity", "1");
      if (occludeLabel) occludeLabel.setAttribute("opacity", "1");
      var step = 0;
      var interval = setInterval(function () {
        step++;
        setStages(step);
        if (ischemia) {
          var op = Math.min(1, step * 0.35);
          ischemia.setAttribute("opacity", String(op));
          var rx = 20 + step * 6, ry = 16 + step * 4;
          ischemia.setAttribute("rx", String(Math.min(rx, 38)));
          ischemia.setAttribute("ry", String(Math.min(ry, 30)));
        }
        if (step >= 3) {
          clearInterval(interval);
          if (msg) msg.innerHTML = "<b>Infarction 진행 중</b>. Downstream tissue가 산소·포도당 공급 없이 기능을 잃어갑니다. 빠른 재관류가 필요합니다.";
        }
      }, 600);
    }
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-bf]");
      if (!btn) return;
      var mode = btn.getAttribute("data-bf");
      if (mode === "normal") setNormal();
      else if (mode === "occlude") setOcclude();
    });
    setNormal();
  }

  /* ---------- Viz 2 · Core vs Penumbra Simulator ---------- */
  function initPenumbra() {
    var root = document.querySelector("[data-penumbra]");
    if (!root) return;
    var slider = root.querySelector("#pbSlider");
    var timeEl = root.querySelector("#pbTime");
    var descEl = root.querySelector("#pbDesc");
    var core = root.querySelector("#pbCore");
    var penumbra = root.querySelector("#pbPenumbra");
    var reperfBtn = root.querySelector("#pbReperfBtn");
    var reperfMsg = root.querySelector("#pbReperfMsg");

    var stages = [
      { time: "발생 후 0분", coreR: 22, penR: 55, desc: "Core는 작고 penumbra가 큽니다. 지금 reperfusion → 많은 조직 구제 가능." },
      { time: "1시간 후", coreR: 30, penR: 50, desc: "Core가 확대되기 시작합니다. 아직 penumbra가 상당히 남아 있습니다." },
      { time: "2시간 후", coreR: 38, penR: 44, desc: "Core 확대 진행 중. 빠른 재관류로 남은 penumbra를 구제해야 합니다." },
      { time: "3시간 후", coreR: 44, penR: 37, desc: "Penumbra가 줄어들고 있습니다. 재관류할수록 구제 가능한 조직이 줄어듭니다." },
      { time: "4시간 후", coreR: 50, penR: 30, desc: "Core가 많이 커졌습니다. Penumbra가 작아졌습니다. 아직 늦지 않았습니다." },
      { time: "5시간 후", coreR: 55, penR: 22, desc: "Penumbra가 많이 줄었습니다. 살릴 수 있는 조직이 점점 감소하고 있습니다." },
      { time: "6시간+ 경과", coreR: 60, penR: 10, desc: "Penumbra가 거의 core로 변했습니다. 이제 구제 가능한 조직이 매우 적습니다." }
    ];

    function render(val) {
      var s = stages[val];
      if (timeEl) timeEl.textContent = s.time;
      if (descEl) descEl.textContent = s.desc;
      if (core) core.setAttribute("r", String(s.coreR));
      if (penumbra) penumbra.setAttribute("r", String(s.penR));
      var savedPct = Math.round((s.penR - 10) / (55 - 10) * 100);
      if (reperfBtn) reperfBtn.textContent = "⚡ Reperfusion NOW — 약 " + Math.max(0, savedPct) + "% penumbra 구제 가능";
      if (reperfMsg) reperfMsg.style.display = "none";
    }
    if (slider) slider.addEventListener("input", function () { render(parseInt(slider.value, 10)); });
    if (reperfBtn) reperfBtn.addEventListener("click", function () {
      var val = slider ? parseInt(slider.value, 10) : 0;
      var s = stages[val];
      var savedPct = Math.round((s.penR - 10) / (55 - 10) * 100);
      if (reperfMsg) {
        reperfMsg.style.display = "block";
        reperfMsg.innerHTML = "✅ <b>Reperfusion 시행!</b> Penumbra(약 " + Math.max(0, savedPct) + "%)를 구제했습니다. <b>Time is Brain</b> — 일찍 시행할수록 더 많은 뇌조직을 살릴 수 있습니다.";
      }
    });
    render(0);
  }

  /* ---------- Viz 3 · Stroke Source Cards ---------- */
  var STROKE_SRC = {
    large: {
      title: "Large Artery Atherosclerosis",
      flow: "경동맥/두개내 동맥 plaque → plaque rupture/thrombosis 또는 artery-to-artery embolism → brain artery occlusion",
      treatment: "재발예방: Antiplatelet + Statin + 위험인자 관리. 경동맥 협착 심한 경우 CEA 또는 stenting 고려."
    },
    cardio: {
      title: "Cardioembolism (AF 등)",
      flow: "AF → left atrial blood stasis → fibrin-rich thrombus → embolism → cerebral artery occlusion",
      treatment: "재발예방: <b>Anticoagulation</b> (DOAC 우선). Aspirin만으로는 AF stroke prevention에 충분하지 않습니다."
    },
    small: {
      title: "Small Vessel Disease (Lacunar)",
      flow: "만성 고혈압·당뇨 → penetrating artery 손상 → small vessel occlusion → lacunar infarction (내포·기저핵·뇌간)",
      treatment: "재발예방: Antiplatelet + 혈압 조절 + 혈당 조절. Lacunar stroke는 주로 small vessel 병변."
    }
  };
  function initStrokeSource() {
    var root = document.querySelector("[data-strokesource]");
    if (!root) return;
    var detail = root.querySelector("#ss2Detail");
    root.querySelectorAll(".ss2__card").forEach(function (card) {
      card.addEventListener("click", function () {
        root.querySelectorAll(".ss2__card").forEach(function (c) { c.classList.remove("open"); });
        card.classList.add("open");
        var src = card.getAttribute("data-src");
        var d = STROKE_SRC[src];
        if (detail && d) {
          detail.innerHTML = "<b>" + d.title + "</b><br>" +
            "<span style='color:var(--brand)'>→ " + d.flow + "</span><br>" +
            "<span style='color:var(--ink-soft);font-size:13px;'>💊 " + d.treatment + "</span>";
        }
      });
    });
  }

  /* ---------- Viz 4 · Blocked vs Ruptured ---------- */
  function initStrokeType() {
    var root = document.querySelector("[data-stroketype]");
    if (!root) return;
    var btn = root.querySelector("#stAspBtn");
    var ans = root.querySelector("#stAns");
    if (!btn || !ans) return;
    btn.addEventListener("click", function () {
      ans.style.display = "block";
      ans.innerHTML = "❌ <b>먼저 CT가 필요합니다.</b> 증상만으로 허혈성·출혈성을 안전하게 구별할 수 없습니다. 출혈성 stroke에서 aspirin은 해로울 수 있습니다.";
      ans.style.padding = "10px";
      ans.style.borderRadius = "8px";
      ans.style.background = "var(--hi-soft)";
      ans.style.color = "var(--hi)";
      ans.style.fontSize = "13.5px";
      ans.style.marginTop = "8px";
    });
  }

  /* ---------- Viz 5 · BE-FAST Body Map ---------- */
  var BEFAST = {
    balance: { letter: "B", label: "Balance", icon: "🏃", desc: "<b>갑작스러운 균형 장애</b> — 걷기 어렵거나, 심한 어지럼증이 갑자기 생기거나, 특히 다른 신경학적 증상과 동반될 때 중요합니다." },
    eyes:    { letter: "E", label: "Eyes", icon: "👁", desc: "<b>갑작스러운 시야 이상</b> — 한쪽 눈이 안 보이거나, 시야의 반쪽이 사라지거나, 복시(두 개로 보임)." },
    face:    { letter: "F", label: "Face", icon: "😶", desc: "<b>얼굴 한쪽 처짐</b> — \"웃어보세요\" 할 때 한쪽만 올라가지 않거나 입이 돌아감. FAST의 대표 증상." },
    arm:     { letter: "A", label: "Arm", icon: "💪", desc: "<b>팔(다리) 한쪽 힘 빠짐</b> — \"양팔을 들어보세요\" 했을 때 한쪽이 내려가거나 힘이 없음. 다리 마비도 포함." },
    speech:  { letter: "S", label: "Speech", icon: "🗣", desc: "<b>언어장애</b> — 말이 어눌하거나(dysarthria), 말이 나오지 않거나(aphasia), 남의 말을 이해 못함. 알아들을 수 없는 말을 함." },
    time:    { letter: "T", label: "Time — 즉시 응급의료", icon: "⏱", desc: "<b>TIME = 즉각 행동</b><br>위 증상 중 하나라도 갑자기 생기면 → <b>지체 없이 119</b>. \"기다리면 나아지겠지\"는 뇌세포를 죽이는 생각입니다. Time is Brain." }
  };
  function initBEFAST() {
    var root = document.querySelector("[data-befast]");
    if (!root) return;
    var detail = root.querySelector("#befDetail");
    root.querySelectorAll(".bef__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".bef__btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-bef");
        var d = BEFAST[key];
        if (detail && d) {
          detail.innerHTML = d.icon + " <b>" + d.label + "</b> — " + d.desc;
        }
      });
    });
  }

  /* ---------- Viz 6 · TIA Warning Window ---------- */
  function initTIAWarn() {
    var root = document.querySelector("[data-tiawarn]");
    if (!root) return;
    var result = root.querySelector("#tiawResult");
    var steps = [root.querySelector("#tiawS1"), root.querySelector("#tiawS2"), root.querySelector("#tiawS3")];
    function animateSteps() {
      var i = 0;
      var t = setInterval(function () {
        i++;
        if (steps[i]) steps[i].classList.add("active");
        if (i >= 2) clearInterval(t);
      }, 500);
    }
    animateSteps();
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tiaw]");
      if (!btn || !result) return;
      var choice = btn.getAttribute("data-tiaw");
      if (choice === "ignore") {
        result.innerHTML = "<div style='padding:12px;border-radius:8px;background:var(--hi-soft);color:var(--hi);font-size:13.5px;'>" +
          "🚨 <b>위험한 선택입니다.</b> 증상이 사라져도 TIA 후 stroke 위험은 사라지지 않습니다. " +
          "원인평가와 예방치료 없이 집에서 기다리면 <b>수 시간~수일 내 stroke</b>가 발생할 수 있습니다." +
          "</div>";
      } else {
        result.innerHTML = "<div style='padding:12px;border-radius:8px;background:var(--ok-soft,#dcf5f1);color:#0a6b5e;font-size:13.5px;'>" +
          "✅ <b>올바른 선택입니다.</b> 응급 평가로: brain imaging, vascular imaging, AF 검사, " +
          "vascular risk factor 평가. 원인을 빨리 찾아 <b>재발예방 치료를 시작</b>하는 것이 목표입니다." +
          "</div>";
      }
    });
  }

  /* ---------- Viz 7 · Stroke Imaging Stack ---------- */
  var SI_DATA = [
    {
      label: "Non-contrast CT",
      question: "Bleeding?",
      detail: "<b>Non-contrast CT — 가장 먼저 시행</b><br>" +
        "핵심 목적: <b>intracranial hemorrhage 여부 빠르게 확인</b>.<br>" +
        "정상 CT ≠ stroke 없음. 초기 ischemic lesion은 CT에서 명확하지 않을 수 있습니다.<br>" +
        "하지만 출혈은 CT에서 잘 보입니다 → thrombolysis 가능 여부 결정의 첫 단계."
    },
    {
      label: "CT Angiography (CTA)",
      question: "Large vessel occlusion?",
      detail: "<b>CT Angiography — 혈관을 본다</b><br>" +
        "핵심 목적: <b>Large vessel occlusion(LVO) 확인</b>.<br>" +
        "ICA·proximal MCA·basilar artery 등이 막혔는지 평가.<br>" +
        "LVO 확인 → mechanical thrombectomy eligibility 평가의 핵심 단계."
    },
    {
      label: "MRI DWI / Perfusion Imaging",
      question: "Salvageable tissue?",
      detail: "<b>MRI / Perfusion imaging — 조직을 본다</b><br>" +
        "DWI(Diffusion-weighted imaging): acute ischemic lesion 고감도 발견.<br>" +
        "Perfusion imaging: 이미 죽은 core vs 아직 살릴 penumbra 구분.<br>" +
        "DWI-FLAIR mismatch: wake-up stroke에서 치료 가능 시간창 판단에 활용 (2026 guideline)."
    }
  ];
  function initStrokeImaging() {
    var root = document.querySelector("[data-strokeimaging]");
    if (!root) return;
    var detail = root.querySelector("#siDetail");
    root.querySelectorAll(".si__step").forEach(function (step) {
      step.addEventListener("click", function () {
        root.querySelectorAll(".si__step").forEach(function (s) { s.classList.remove("open"); });
        step.classList.add("open");
        var idx = parseInt(step.getAttribute("data-si"), 10);
        var d = SI_DATA[idx];
        if (detail && d) detail.innerHTML = d.detail;
      });
    });
  }

  /* ---------- Viz 8 · Thrombolysis Window ---------- */
  function initThromboWin() {
    var root = document.querySelector("[data-thrombowin]");
    if (!root) return;
    var detail = root.querySelector("#twDetail");
    var segs = root.querySelectorAll(".tw__seg");
    segs.forEach(function (seg) {
      seg.addEventListener("click", function () {
        segs.forEach(function (s) { s.classList.remove("active"); });
        seg.classList.add("active");
        if (detail) {
          if (seg.classList.contains("early")) {
            detail.innerHTML = "<b>0–4.5시간 (일반적 치료창)</b><br>" +
              "Alteplase 또는 tenecteplase를 eligible patient에서 사용. " +
              "빠를수록 좋습니다 — \"Time is Brain.\"<br>" +
              "<span style='color:var(--ink-faint);font-size:12.5px;'>금기 평가 필수: BP·imaging·anticoagulant·bleeding risk 등.</span>";
          } else {
            detail.innerHTML = "<b>4.5–9시간 / Wake-up stroke</b><br>" +
              "모든 환자가 대상은 아닙니다. <b>Advanced imaging</b>(DWI-FLAIR mismatch, perfusion imaging)으로 " +
              "salvageable tissue가 있는 선택된 환자에서 고려 가능 (2026 AHA/ASA).<br>" +
              "<span style='color:var(--ink-faint);font-size:12.5px;'>'시간만으로 결정하지 않고 imaging과 함께 본다'는 패러다임 전환.</span>";
          }
        }
      });
    });
  }

  /* ---------- Viz 9 · Reperfusion Comparison ---------- */
  function initReperfComp() {
    /* static display only — no interaction needed beyond CSS */
  }

  /* ---------- Viz 10 · Opposite Stroke Treatments ---------- */
  function initStrokeOpp() {
    /* static display only */
  }

  /* ---------- Viz 11 · Stroke Cause → Treatment ---------- */
  var SC_DATA = {
    athero: {
      label: "Large Artery Atherosclerosis",
      color: "var(--brand)",
      result: "Antiplatelet + Statin",
      detail: "<b>Antiplatelet</b> (aspirin ± clopidogrel) + <b>Statin</b>으로 LDL 적극 조절.<br>" +
        "고혈압·당뇨 등 위험요인 관리. 경동맥 협착이 심한 경우 CEA 또는 stenting 평가."
    },
    af: {
      label: "Atrial Fibrillation",
      color: "var(--hi)",
      result: "Anticoagulant (DOAC 우선)",
      detail: "<b>Anticoagulation</b> — apixaban·rivaroxaban·edoxaban·dabigatran 등 DOAC 우선, 특정 경우 warfarin.<br>" +
        "AF stroke는 fibrin-rich cardioembolic clot → platelet만 억제하는 aspirin으로는 충분하지 않습니다."
    },
    small: {
      label: "Small Vessel / Lacunar",
      color: "#8b5cf6",
      result: "Antiplatelet + Risk factor control",
      detail: "<b>Antiplatelet</b> + <b>혈압·혈당 철저 관리</b>.<br>" +
        "Small vessel stroke는 주로 penetrating artery 손상 → antihypertensive therapy가 재발예방의 핵심."
    },
    unclear: {
      label: "원인 불명 (Cryptogenic)",
      color: "#f5a623",
      result: "추가 검사 + 잠정적 항혈소판",
      detail: "<b>원인 추가 평가</b>: 장기 심전도 모니터링(숨겨진 AF), 혈액 검사(thrombophilia), 심장 초음파(PFO 등).<br>" +
        "원인을 찾을 때까지 잠정적으로 antiplatelet 사용이 일반적."
    }
  };
  function initStrokeCause() {
    var root = document.querySelector("[data-strokecause]");
    if (!root) return;
    var result = root.querySelector("#scResult");
    root.querySelectorAll("[data-sc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll("[data-sc]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-sc");
        var d = SC_DATA[key];
        if (result && d) {
          result.innerHTML = "<div style='font-size:13px;color:var(--ink-faint);margin-bottom:4px;'>원인: " + d.label + "</div>" +
            "<div style='font-weight:700;font-size:16px;color:" + d.color + ";margin-bottom:8px;'>→ " + d.result + "</div>" +
            d.detail;
        }
      });
    });
  }

  /* ---------- Viz 12 · Stroke Drug Map ---------- */
  var SDM_DRUGS = {
    statin:   { nodes: ["athero", "plaque"], desc: "<b>Statin (HMG-CoA reductase 억제)</b><br>LDL↓ → atherosclerosis 진행 억제 → plaque 형성·불안정화 위험 감소. Atherosclerotic stroke secondary prevention의 핵심." },
    antihtn:  { nodes: ["athero"], desc: "<b>Antihypertensive (혈압강하제)</b><br>고혈압 → atherosclerosis 촉진 + ICH 위험↑. 혈압 조절은 ischemic/hemorrhagic stroke 모두에서 중요한 재발예방 요소." },
    aspirin:  { nodes: ["platelet"], desc: "<b>Aspirin (COX-1 억제 → TXA₂↓)</b><br>Platelet aggregation 억제 → 동맥 혈전 예방. Non-cardioembolic ischemic stroke 재발예방. AF stroke에는 단독으로 충분하지 않음." },
    clopi:    { nodes: ["platelet"], desc: "<b>Clopidogrel (P2Y12 억제)</b><br>ADP-mediated platelet activation 억제. Aspirin과 함께 DAPT로 사용하거나 단독 사용. Non-cardioembolic stroke 재발예방." },
    doac:     { nodes: ["af"], desc: "<b>DOAC / Warfarin (항응고제)</b><br>Coagulation cascade 억제 → AF에서 형성되는 fibrin-rich atrial thrombus 예방. AF-related cardioembolic stroke의 핵심 재발예방 전략." },
    tpa:      { nodes: ["clot"], desc: "<b>Alteplase / Tenecteplase (tPA 계열)</b><br>Plasminogen → plasmin → fibrin 분해 → thrombus dissolution. 이미 형성된 acute clot을 녹이는 것 — anticoagulant와 기전이 다릅니다." }
  };
  function initStrokeDrugMap() {
    var root = document.querySelector("[data-strokedrugmap]");
    if (!root) return;
    var desc = root.querySelector("#sdmDesc");
    root.querySelectorAll(".sdm__drug-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".sdm__drug-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-sdm-drug");
        var d = SDM_DRUGS[key];
        if (!d) return;
        root.querySelectorAll(".sdm__node").forEach(function (node) {
          var nk = node.getAttribute("data-sdm-node");
          node.classList.toggle("targeted", d.nodes.indexOf(nk) > -1);
        });
        if (desc) desc.innerHTML = d.desc;
      });
    });
  }

  /* ---------- Viz 13 · Stroke Emergency Simulator ---------- */
  function initStrokeSim() {
    var root = document.querySelector("[data-strokesim]");
    if (!root) return;
    var state = { onset: null, ct: null, cta: null };
    var riskEl = root.querySelector(".hypo__risk");
    var expEl = root.querySelector(".hypo__exp");

    function update() {
      if (!state.onset || !state.ct || !state.cta) return;
      var risk, exp;
      if (state.ct === "bleed") {
        risk = "출혈성 뇌졸중 (Hemorrhagic Stroke)";
        exp = "Thrombolysis 금기. BP management · anticoagulant reversal (해당 시) · neurosurgical 평가가 중심 치료입니다.";
        if (riskEl) riskEl.className = "hypo__risk danger";
      } else if (state.cta === "lvo") {
        if (state.onset === "early") {
          risk = "Ischemic + LVO (초기)";
          exp = "IV thrombolysis (4.5시간 이내) + mechanical thrombectomy 모두 빠르게 평가. 가능하다면 두 치료를 연속 시행합니다.";
        } else if (state.onset === "late") {
          risk = "Ischemic + LVO (늦은 시간창)";
          exp = "IV thrombolysis는 시간창 초과 가능성 — advanced imaging 평가 필요. LVO → thrombectomy는 imaging으로 salvageable tissue 확인 후 늦은 시간까지 가능.";
        } else {
          risk = "Ischemic + LVO (Wake-up stroke)";
          exp = "Wake-up stroke + LVO: DWI-FLAIR mismatch 또는 perfusion imaging으로 tissue time 평가. 선택된 환자에서 IV thrombolysis 및/또는 thrombectomy 고려.";
        }
        if (riskEl) riskEl.className = "hypo__risk hi";
      } else {
        if (state.onset === "early") {
          risk = "Ischemic Stroke (초기, LVO 없음)";
          exp = "4.5시간 이내 + LVO 없음: IV thrombolysis evaluation. Thrombectomy는 LVO가 없으면 일반적으로 해당 없음.";
        } else if (state.onset === "late") {
          risk = "Ischemic Stroke (늦은 시간창, LVO 없음)";
          exp = "4.5시간 초과 + LVO 없음: IV thrombolysis는 advanced imaging으로 일부 선택된 환자에서 가능. 원인평가와 재발예방 치료 시작.";
        } else {
          risk = "Ischemic Stroke (Wake-up, LVO 없음)";
          exp = "Wake-up stroke + LVO 없음: DWI-FLAIR mismatch 또는 perfusion imaging으로 치료 가능 여부 평가. 원인평가 병행.";
        }
        if (riskEl) riskEl.className = "hypo__risk mid";
      }
      if (riskEl) riskEl.textContent = risk;
      if (expEl) expEl.textContent = exp;
    }

    root.querySelectorAll(".hypo__opts").forEach(function (group) {
      group.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          var g = group.getAttribute("data-group");
          state[g] = btn.getAttribute("data-val");
          update();
        });
      });
    });
  }


  /* ===========  Core 13 · 소화성궤양 인터랙션  =========== */

  /* =====================================================================
     Core 21 · 인플루엔자  (cst__ 공용 UI · cirSeg/cirBars/cldCardQuiz 재사용 + ifz__ 전용)
     ===================================================================== */

  /* ---------- Viz 1 · Virus Explorer ---------- */
  function initIfzVirus() {
    var root = document.querySelector("[data-ifzvirus]");
    if (!root) return;
    var P = {
      ha: "<b>Hemagglutinin (HA)</b> — 세포 표면 <b>sialic acid</b>에 결합해 붙고 들어가는 단백질. endosome 안에서 모양을 바꿔 막 융합도 일으킵니다. <b>백신 중화항체의 주요 표적</b>.",
      na: "<b>Neuraminidase (NA)</b> — sialic acid를 잘라 새 바이러스를 세포에서 <b>떼어내 퍼지게</b> 하는 효소. → <b>Oseltamivir · zanamivir · peramivir</b>의 표적.",
      rnp: "<b>RNA 8조각 + polymerase(PB1·PB2·PA)</b> — 핵에서 전사·복제. 조각나 있어 다른 바이러스와 <b>조각을 바꿔 낄 수 있음</b>(shift). PA의 endonuclease → <b>baloxavir</b>의 표적.",
      m2: "<b>M2 이온채널 (A형)</b> — endosome의 H⁺를 바이러스 안으로 들여 uncoating을 돕습니다. → <b>amantadine</b>의 표적이었지만 현재 광범위 내성. B형에는 없음."
    };
    var cur = null;
    root.querySelectorAll("[data-part]").forEach(function (b) {
      b.addEventListener("click", function () {
        cur = cur === b.getAttribute("data-part") ? null : b.getAttribute("data-part");
        root.querySelectorAll("[data-part]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-part") === cur); });
        cstEl(root, "virion").className = "ifz__virion" + (cur ? " hl-" + cur : "");
        cstOut(cstEl(root, "out"), cur ? P[cur] : "구조를 탭하세요.");
      });
    });
  }

  /* ---------- Viz 3 · Lifecycle + drug targets ---------- */
  function initIfzLife() {
    var root = document.querySelector("[data-ifzlife]");
    if (!root) return;
    var stages = root.querySelectorAll("[data-s]"), timer = null;
    var D = {
      osel: [5, "<b>Oseltamivir</b> — ⑥ Release 차단. NA가 sialic acid를 못 잘라 새 바이러스가 세포에 붙잡힘 → 이웃 세포 감염 ↓. 이미 만들어진 바이러스를 \"죽이는\" 약이 아닙니다."],
      zana: [5, "<b>Zanamivir</b> — ⑥ Release 차단 (흡입). 같은 NA 표적, 다른 경로."],
      pera: [5, "<b>Peramivir</b> — ⑥ Release 차단 (정맥). 같은 NA 표적, 다른 경로."],
      balo: [3, "<b>Baloxavir</b> — ④ Transcription 차단. PA endonuclease를 막아 cap-snatching 실패 → 바이러스 mRNA·단백질 ↓ → 새 바이러스 자체가 덜 만들어짐."],
      aman: [2, "<b>Amantadine</b> — ③ Uncoating 차단(M2). 하지만 <b>현재 계절성 A형에 광범위 내성</b> · B형엔 M2가 없음 → 독감 치료에 권고되지 않습니다."]
    };
    function clear() {
      if (timer) { clearInterval(timer); timer = null; }
      stages.forEach(function (s) { s.className = "ifz__stage"; });
    }
    root.querySelector("[data-act='play']").addEventListener("click", function () {
      clear();
      root.querySelectorAll("[data-drug]").forEach(function (x) { x.classList.remove("on"); });
      var i = 0;
      cstOut(cstEl(root, "out"), "바이러스가 세포에 붙어 → 들어가 → 풀리고 → 핵에서 복제 → 조립 → 떨어져 나갑니다.");
      timer = setInterval(function () {
        stages.forEach(function (s, k) { s.classList.toggle("on", k <= i); s.classList.toggle("cur", k === i); });
        i++;
        if (i > 5) { clearInterval(timer); timer = null; cstOut(cstEl(root, "out"), "⑥ 이후 새 바이러스가 <b>이웃 세포</b>로 → 생활사가 다시 시작됩니다. 이제 약을 눌러 어디를 끊는지 보세요.", "mid"); }
      }, 550);
    });
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () {
        clear();
        root.querySelectorAll("[data-drug]").forEach(function (x) { x.classList.toggle("on", x === b); });
        var d = D[b.getAttribute("data-drug")];
        stages.forEach(function (s, k) {
          s.classList.toggle("on", k < d[0]);
          s.classList.toggle("is-block", k === d[0]);
          s.classList.toggle("is-dim", k > d[0]);
        });
        cstOut(cstEl(root, "out"), d[1], b.getAttribute("data-drug") === "aman" ? "bad" : "ok");
      });
    });
  }

  /* ---------- Viz 4 · Local infection, systemic symptoms ---------- */
  function initIfzBody() {
    var root = document.querySelector("[data-ifzbody]");
    if (!root) return;
    var B = {
      lung: ["mid", "🫁 <b>기도</b> — 실제 바이러스가 증식하는 곳. 상피 손상 → 기침 · 인후통. 여기서 interferon·cytokine 신호가 출발합니다."],
      brain: ["ok", "🧠 <b>뇌</b> — 바이러스가 간 것이 아니라 cytokine이 시상하부 <b>PGE₂</b>를 올려 set point ↑ → 발열·오한·두통."],
      muscle: ["ok", "💪 <b>근육</b> — 대개 근육 감염이 아니라 전신 염증 신호에 의한 <b>근육통</b>. 드물게 진짜 근염·횡문근융해(콜라색 소변)는 별도 평가."],
      whole: ["ok", "🧍 <b>전신</b> — 같은 cytokine 신호가 피로 · 권태 · 식욕저하를 만듭니다. 감기보다 이 반응이 훨씬 큽니다."]
    };
    cirSeg(root, "data-b", function (k) { cstOut(cstEl(root, "out"), B[k][1], B[k][0]); });
  }

  /* ---------- Viz 5 · Influenza Timeline ---------- */
  function initIfzTime() {
    var root = document.querySelector("[data-ifztime]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var V = { vir: [40, 85, 90, 70, 45, 25, 12, 6, 3, 2, 1, 0], inf: [45, 90, 85, 70, 50, 30, 15, 8, 4, 2, 0, 0], fev: [0, 85, 90, 75, 50, 25, 10, 5, 0, 0, 0, 0], cou: [0, 30, 55, 70, 70, 65, 60, 50, 40, 30, 22, 15] };
    function update() {
      var d = +range.value, i = d + 1;
      cstEl(root, "day").textContent = d < 0 ? "증상 하루 전" : "Day " + d;
      cirBars(root, ["vir", "inf", "fev", "cou"], [V.vir[i], V.inf[i], V.fev[i], V.cou[i]]);
      var msg, tone = "";
      if (d < 0) { msg = "⚠️ <b>증상이 없는데 이미 전염 가능</b> — 성인은 증상 약 하루 전부터 바이러스를 내보냅니다."; tone = "bad"; }
      else if (d <= 2) { msg = "<b>갑작스러운 고열 · 오한 · 근육통</b>. 바이러스 증식과 전염력이 가장 높은 시기 — 항바이러스제의 이득도 가장 큽니다."; tone = "bad"; }
      else if (d <= 5) msg = "기침과 피로가 앞으로 나오고 열이 이어질 수 있습니다.";
      else if (d <= 7) msg = "전신 증상이 줄어듭니다. 전염력은 대개 이 무렵까지.";
      else { msg = "열은 내렸지만 <b>기침 · 피로가 남을 수 있음</b>. 이 시기의 새 고열·호흡곤란은 합병증 신호입니다."; tone = "mid"; }
      cstOut(cstEl(root, "out"), msg, tone);
    }
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 6 · Influenza Opens the Door ---------- */
  function initIfzDoor() {
    var root = document.querySelector("[data-ifzdoor]");
    if (!root) return;
    var M = [
      [85, 85, 5, "ok", "<b>정상 기도</b> — 점액 + 섬모 + 온전한 상피가 들어온 세균을 쓸어냅니다."],
      [35, 40, 30, "mid", "<b>독감 감염</b> — 섬모 기능 ↓ · 상피 손상 · 국소 면역 변화. 세균이 붙을 자리가 생겼습니다."],
      [35, 40, 85, "bad", "<b>+ 세균 노출</b> — 폐렴구균 · 황색포도알균(MRSA 포함) 등이 손상된 상피에 부착·침입 → <b>이차 세균성 폐렴</b>. 바이러스가 문을 열어 둔 셈입니다."]
    ];
    cirSeg(root, "data-m", function (k) { var d = M[+k]; cirBars(root, ["cil", "bar", "bac"], d); cstOut(cstEl(root, "out"), d[4], d[3]); });
    root.querySelector("[data-m='0']").click();
  }

  /* ---------- Viz 7 · Antigen vs PCR ---------- */
  function initIfzTest() {
    var root = document.querySelector("[data-ifztest]");
    if (!root) return;
    var range = root.querySelector("input[type=range]"), test = "rat";
    var LV = ["낮음", "보통", "높음"];
    function update() {
      var v = +range.value;
      cstEl(root, "v").textContent = LV[v];
      var pos = test === "pcr" ? true : v >= 1;
      var res = cstEl(root, "res");
      res.textContent = pos ? "양성 ＋" : "음성 −  (위음성 가능)";
      res.className = "ifz__result " + (pos ? "is-pos" : "is-neg");
      var msg;
      if (test === "rat") msg = "<b>신속항원검사</b> — 바이러스 <b>단백질</b>을 검출. 빠르고 접근성이 좋지만 바이러스 양이 적으면(검체 채취·시기·소아 외 성인 등) <b>위음성</b>이 생길 수 있습니다." + (pos ? "" : "<br>👉 유행기 + 전형적 증상이면 음성이어도 독감을 배제하지 않습니다 — 분자검사나 임상 판단.");
      else msg = "<b>분자검사 · RT-PCR</b> — 바이러스 <b>RNA</b>를 역전사해 증폭. 적은 양도 잡아 민감도가 높습니다. 입원·중증·집단발생 원인 확인에 중요합니다.";
      cstOut(cstEl(root, "out"), msg, pos ? "ok" : "mid");
    }
    cirSeg(root, "data-t", function (k) { test = k; update(); });
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 8 · Antiviral Treatment Window ---------- */
  function initIfzWin() {
    var root = document.querySelector("[data-ifzwin]");
    if (!root) return;
    var T = [0, 12, 24, 36, 48, 60, 72, 96, 120], U = [20, 60, 90, 95, 85, 65, 45, 20, 8];
    var h = 24, hr = false, hrBtn = root.querySelector("[data-hr]");
    function update() {
      var startIdx = T.indexOf(h), base = U[startIdx];
      cstEl(root, "chart").innerHTML = T.map(function (t, i) {
        var tr = t <= h ? U[i] : Math.min(U[i], Math.round(base * Math.pow(0.55, (t - h) / 12)));
        return "<div class=\"ifz__col" + (t === 48 ? " is-48" : "") + (t === h ? " is-start" : "") + "\"><i class=\"ifz__u\" style=\"height:" + U[i] + "%\"></i><i class=\"ifz__t" + (t > h ? " is-tx" : "") + "\" style=\"height:" + tr + "%\"></i><em>" + t + "h</em></div>";
      }).join("");
      var msg, tone;
      if (h <= 24) { msg = "<b>" + h + "시간</b> — 바이러스가 아직 늘어나는 중. 여기서 막으면 <b>새로 감염될 세포를 많이 지킬 수 있습니다</b> (회색과 파란 막대의 차이)."; tone = "ok"; }
      else if (h === 48) { msg = "<b>48시간</b> — 건강한 외래 성인에서 흔히 쓰는 기준. 하지만 이 선을 넘는다고 효과가 0이 되지는 않습니다."; tone = "mid"; }
      else if (hr) { msg = "<b>72시간 · 고위험/입원/중증</b> — <b>48시간 이후에도 치료를 고려합니다.</b> 남은 증식을 줄이고 중증 진행·합병증 위험을 낮추는 것이 목표입니다. 가능한 한 빨리 oseltamivir."; tone = "ok"; }
      else { msg = "<b>72시간 · 건강한 외래 성인</b> — 이미 정점을 지나 이득이 작아질 수 있습니다. 그래도 \"효과가 갑자기 사라지는 선\"은 아닙니다. 위험군 버튼을 눌러 보세요."; tone = "mid"; }
      cstOut(cstEl(root, "out"), msg, tone);
    }
    cirSeg(root, "data-h", function (k) { h = +k; update(); });
    hrBtn.addEventListener("click", function () { hr = !hr; hrBtn.classList.toggle("on", hr); update(); });
    update();
  }

  /* ---------- Viz 9 · Oseltamivir Release Block ---------- */
  function initIfzRel() {
    var root = document.querySelector("[data-ifzrel]");
    if (!root) return;
    var btn = root.querySelector("[data-osel]"), on = false;
    function update() {
      cstEl(root, "free").textContent = on ? "" : "🦠 ↗   🦠 ↗   🦠 ↗";
      cstEl(root, "stuck").textContent = on ? "🦠🦠🦠🦠🦠🦠🦠" : "🦠";
      cstEl(root, "surf").classList.toggle("is-block", on);
      cirBars(root, ["rel", "nb"], on ? [15, 15] : [85, 80]);
      if (on) cstOut(cstEl(root, "out"), "💊 <b>NA 차단</b> — sialic acid가 잘리지 않아 새 바이러스가 세포 표면에 <b>붙잡히고 서로 뭉칩니다</b> → 이웃 세포 감염 ↓ → 면역계가 정리할 시간.", "ok");
      else cstOut(cstEl(root, "out"), "<b>정상</b> — NA가 sialic acid를 잘라 새 바이러스가 떨어져 나가 이웃 세포로 퍼집니다.");
    }
    btn.addEventListener("click", function () { on = !on; btn.classList.toggle("on", on); update(); });
    update();
  }

  /* ---------- Viz 11 · Cap-Snatching ---------- */
  function initIfzCap() {
    var root = document.querySelector("[data-ifzcap]");
    if (!root) return;
    var step = -1, balo = false, baloBtn = root.querySelector("[data-act='balo']");
    var MSG = [
      "<b>PB2</b>가 숙주 mRNA의 5′ cap을 붙잡았습니다.",
      "<b>PA endonuclease</b>가 cap 뒤 10여 개 염기에서 잘라 <b>cap 달린 조각</b>을 훔쳤습니다. ✂️",
      "<b>PB1</b>이 훔친 조각을 primer로 <b>바이러스 mRNA</b>를 만듭니다 — 숙주 리보솜이 \"정상 mRNA\"로 착각합니다.",
      "리보솜 → 바이러스 단백질 → 새 바이러스. 숙주 mRNA는 cap을 잃어 분해됩니다."
    ];
    function render() {
      root.querySelectorAll("[data-step]").forEach(function (s) {
        var n = +s.getAttribute("data-step");
        var blocked = balo && n >= 1 && step >= 1;
        s.classList.toggle("on", n <= step && !(balo && n >= 1));
        s.classList.toggle("cur", n === step && !blocked);
        s.classList.toggle("ifz__blocked", balo && n === 1 && step >= 1);
        s.classList.toggle("ifz__dim", balo && n >= 2 && step >= 1);
      });
      cstEl(root, "host").textContent = step >= 1 && !balo ? "─ A U G C ✂️ U A G C ─ 숙주 mRNA" : "─ A U G C U A G C ─ 숙주 mRNA";
      var out = cstEl(root, "out");
      if (step < 0) cstOut(out, balo ? "💊 Baloxavir가 PA에 결합해 있습니다. 다음 단계를 눌러 보세요." : "버튼을 눌러 cap-snatching을 따라가 보세요.");
      else if (balo && step >= 1) cstOut(out, "🚫 <b>PA endonuclease 차단</b> → cap 조각 획득 실패 → 바이러스 mRNA ↓ → 단백질 ↓ → <b>새 바이러스 생산 ↓</b>. 숙주 자신의 단백질 합성은 직접 막지 않습니다.", "ok");
      else cstOut(out, MSG[step], step === 3 ? "bad" : "");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "next") step = Math.min(3, step + 1);
        else if (a === "balo") { balo = !balo; baloBtn.classList.toggle("on", balo); }
        else { step = -1; balo = false; baloBtn.classList.remove("on"); }
        render();
      });
    });
    render();
  }

  /* ---------- Viz 12 · Drift vs Shift ---------- */
  function initIfzDrift() {
    var root = document.querySelector("[data-ifzdrift]");
    if (!root) return;
    var s = 0, vs = 0, mixed = false;
    var SEG = ["PB2", "PB1", "PA", "HA", "NP", "NA", "M", "NS"];
    function renderDrift() {
      var html = "";
      for (var k = 0; k <= Math.max(s, 3); k++) {
        var sites = "";
        for (var j = 0; j < 6; j++) sites += "<i class=\"" + (j < k ? "is-mut" : "") + "\"></i>";
        html += "<div class=\"" + (k === s ? "is-now" : "") + (k > s ? " is-future" : "") + "\"><small>절기 " + (k + 1) + (k === vs ? " · 💉" : "") + "</small><span>" + sites + "</span></div>";
      }
      cstEl(root, "seasons").innerHTML = html;
      var ab = Math.max(15, 95 - 22 * (s - vs));
      cstEl(root, "ab").style.width = ab + "%";
      var msg = s === vs ? "백신 항원과 유행주의 <b>HA가 잘 맞습니다</b> — 항체가 잘 결합합니다." :
        "작은 변이(빨간 칸)가 " + (s - vs) + "절기 동안 쌓여 <b>기존 항체의 결합이 약해졌습니다</b>. 작년 면역으로는 부족 → <b>올해 백신</b>을 눌러 보세요.";
      cstOut(cstEl(root, "out"), msg + " (시간이 지나며 면역 자체도 줄어듭니다.)", s === vs ? "ok" : "mid");
    }
    function segs(arr) { return arr.map(function (c, i) { return "<b class=\"is-" + c + "\">" + SEG[i] + "</b>"; }).join(""); }
    function renderShift() {
      cstEl(root, "h").innerHTML = segs(["h", "h", "h", "h", "h", "h", "h", "h"]);
      cstEl(root, "b").innerHTML = segs(["b", "b", "b", "b", "b", "b", "b", "b"]);
      cstEl(root, "n").innerHTML = mixed ? segs(["h", "h", "b", "b", "h", "h", "h", "h"]) : "<i>아직 없음</i>";
      if (mixed) cstOut(cstEl(root, "out"), "🔀 <b>Reassortment</b> — 사람 바이러스의 대부분 조각 + 조류의 <b>HA</b>(·PA). 사람 면역이 <b>처음 보는 HA</b> → 이 바이러스가 사람 사이에서 효율적으로 전파되면 <b>pandemic</b> 가능. 모든 재조합이 그렇게 되지는 않습니다.", "bad");
      else cstOut(cstEl(root, "out"), "Influenza A는 유전체가 <b>8조각</b>입니다. 두 종류가 한 세포(예: 돼지)에 동시에 감염되면 조각이 섞일 수 있습니다.");
    }
    cirSeg(root, "data-mode", function (k) {
      cstEl(root, "driftbox").style.display = k === "drift" ? "" : "none";
      cstEl(root, "shiftbox").style.display = k === "shift" ? "" : "none";
      if (k === "drift") renderDrift(); else renderShift();
    });
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "season") s = Math.min(5, s + 1);
        if (a === "vax") vs = s;
        if (a === "mix") mixed = true;
        if (a === "mix") renderShift(); else renderDrift();
      });
    });
    renderDrift();
  }

  /* ---------- Viz 13 · Vaccine Protection Layers ---------- */
  function initIfzVax() {
    var root = document.querySelector("[data-ifzvax]");
    if (!root) return;
    var layers = root.querySelectorAll("[data-l]");
    cirSeg(root, "data-v", function (k) {
      var vax = k === "1";
      var W = vax ? [60, 42, 22] : [100, 100, 100];
      layers.forEach(function (l, i) { l.style.setProperty("--w", W[i] + "%"); l.classList.toggle("is-vax", vax); });
      if (vax) cstOut(cstEl(root, "out"), "💉 <b>접종</b> — 일부는 감염 자체를 막고, 감염돼도 증상을 줄이고, 무엇보다 <b>중증·입원·사망</b>으로 가는 비율을 크게 낮춥니다. 층마다 걸러지는 정도는 절기와 사람마다 다릅니다.", "ok");
      else cstOut(cstEl(root, "out"), "<b>미접종</b> — 노출된 바이러스가 세 층을 거의 그대로 통과합니다.", "bad");
    });
    root.querySelector("[data-v='0']").click();
  }

  /* ---------- Viz 14 · Long-Term Care Outbreak ---------- */
  function initIfzWard() {
    var root = document.querySelector("[data-ifzward]");
    if (!root) return;
    var st, f, day;
    function reset() {
      st = []; for (var i = 0; i < 20; i++) st.push("s");
      [2, 3, 7].forEach(function (i) { st[i] = "i"; });
      [1, 4, 6, 8, 12].forEach(function (i) { st[i] = "e"; });
      f = {}; day = 1;
      root.querySelectorAll(".cst__chip[data-act]").forEach(function (x) { x.classList.remove("on"); });
    }
    function render(msg, tone) {
      cstEl(root, "ward").innerHTML = st.map(function (s, i) {
        var badge = "";
        if ((s === "i" || s === "c") && f.treat) badge = "💊";
        if (s === "e" && f.pep) badge = "🛡️";
        if (s === "e" && f.assess && !f.pep) badge = "📋";
        return "<div class=\"ifz__bed is-" + s + "\"><small>" + (i + 1) + "</small>" + badge + "</div>";
      }).join("");
      var n = { s: 0, e: 0, i: 0, c: 0 };
      st.forEach(function (s) { n[s]++; });
      cstOut(cstEl(root, "out"), "<b>Day " + day + "</b> · 증상 " + n.i + " · 확진 " + n.c + " · 노출 " + n.e + " · 감수성 " + n.s + (msg ? "<br>" + msg : ""), tone || "");
    }
    var ACT = {
      test: ["🧪 <b>원인 확인</b> — 증상 환자 검사 → 독감 확진(COVID-19·RSV 동반 여부도). 대응의 출발점.", function () { st = st.map(function (s) { return s === "i" ? "c" : s; }); }],
      treat: ["💊 <b>조기 치료</b> — 증상 환자 개개인의 중증 진행을 줄이는 <b>환자 치료</b>. 신기능 감량 확인. (전파 차단과는 다른 목표)", null],
      ic: ["🧤 <b>감염관리</b> — 격리·cohorting · PPE · 손 위생 · 환기 · 직원/방문객 증상 확인 → <b>병동 전파 차단</b>.", null],
      assess: ["📋 <b>노출 평가</b> — 누가 노출됐는지, 누가 고위험인지 → 예방투여 대상 결정.", null],
      pep: ["🛡️ <b>예방투여</b> — 노출 환자에게 oseltamivir <b>하루 1회</b>(신기능 감량). 기간은 국내 지침·원내 규정 (미국 CDC 시설 기준: 최소 2주 + 마지막 발생 후 7일).", null]
    };
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "reset") { reset(); render("병동에 증상 환자 3명, 노출 5명. 대응 버튼을 누르고 하루씩 넘겨 보세요."); return; }
        if (a === "day") {
          day++;
          var converted = 0;
          st = st.map(function (s) { if (s === "e" && !f.pep && converted < 2) { converted++; return f.test ? "c" : "i"; } return s; });
          if (!f.ic) {
            var add = 0, src = [];
            st.forEach(function (s, i) { if (s === "i" || s === "c") src.push(i); });
            src.forEach(function (i) { [i - 1, i + 1, i + 5].forEach(function (j) { if (add < 3 && st[j] === "s") { st[j] = "e"; add++; } }); });
          }
          var why = (f.ic ? "감염관리로 새 노출이 거의 없었습니다." : "⚠️ 감염관리가 없어 <b>새 노출</b>이 생겼습니다.") + (f.pep ? " 예방투여로 노출 환자의 발병이 줄었습니다." : converted ? " 노출 환자 " + converted + "명이 발병했습니다." : "");
          render(why, f.ic && f.pep ? "ok" : f.ic || f.pep ? "mid" : "bad");
          return;
        }
        f[a] = true;
        b.classList.add("on");
        if (ACT[a][1]) ACT[a][1]();
        render(ACT[a][0], "ok");
      });
    });
    reset();
    render("병동에 증상 환자 3명, 노출 5명. 대응 버튼을 누르고 하루씩 넘겨 보세요.");
  }

  /* ---------- Viz 15 · Pharmacist Detective ---------- */
  function initIfzDetect() {
    var root = document.querySelector("[data-ifzdetect]");
    if (!root) return;
    cldCardQuiz(root, { early: "조기 항바이러스 치료", renal: "신기능 감량", zana: "흡입 zanamivir 피하기", cation: "다가 양이온 상호작용", pep: "노출 후 예방 평가" }, " — 약보다 먼저 환자 정보.", "ifz");
  }

  /* =====================================================================
     Core 20 · 감기  (cst__ 공용 UI · cirSeg/cirBars 헬퍼 재사용 + cld__ 전용)
     ===================================================================== */

  /* 카드별 보기 선택 퀴즈 공통 (PREFIX__q > p + 생성된 PREFIX__opts · 기본 prefix cld) */
  function cldCardQuiz(root, OPT, tail, p) {
    p = p || "cld";
    var keys = Object.keys(OPT), qs = root.querySelectorAll("." + p + "__q"), done = 0, right = 0;
    qs.forEach(function (q) {
      var box = document.createElement("div"), fb = document.createElement("div");
      box.className = p + "__opts";
      fb.className = p + "__fb";
      keys.forEach(function (k) {
        var b = document.createElement("button");
        b.className = p + "__opt";
        b.textContent = OPT[k];
        b.addEventListener("click", function () {
          if (q.getAttribute("data-done")) return;
          q.setAttribute("data-done", "1");
          var ans = q.getAttribute("data-ans"), ok = k === ans;
          done++; if (ok) right++;
          box.querySelectorAll("." + p + "__opt").forEach(function (x, i) { if (keys[i] === ans) x.classList.add("is-right"); });
          if (!ok) b.classList.add("is-wrong");
          q.classList.add(ok ? "is-right" : "is-wrong");
          fb.innerHTML = (ok ? "✅ " : "❌ 정답은 " + OPT[ans] + " — ") + q.getAttribute("data-why");
          cstOut(cstEl(root, "out"), done + " / " + qs.length + " · 정답 " + right + "개" + (done === qs.length ? tail : ""), done === qs.length ? (right === qs.length ? "ok" : "mid") : "");
        });
        box.appendChild(b);
      });
      q.appendChild(box);
      q.appendChild(fb);
    });
  }

  /* ---------- Viz 1 · Respiratory Defense ---------- */
  function initCldDefense() {
    var root = document.querySelector("[data-clddefense]");
    if (!root) return;
    var M = {
      normal: [85, 85, "ok", "<b>정상</b> — 점액이 입자와 바이러스를 붙잡고, 섬모가 한 방향으로 쓸어 인두 쪽으로 보냅니다. 대부분의 노출은 감염 없이 끝납니다."],
      smoke: [30, 60, "bad", "<b>흡연</b> — 섬모 운동 ↓ · 점액 과다·끈적 → 청소 기능이 떨어져 감염이 쉽고 회복이 느립니다. 기침이 더 오래 남기도 합니다."],
      viral: [45, 35, "mid", "<b>바이러스 감염</b> — 상피세포가 감염·손상되고 일부 섬모세포가 떨어져 나갑니다. 청소 ↓ + 염증 → 증상, 그리고 <b>이차 세균감염</b>이 비집고 들어올 틈."]
    };
    cirSeg(root, "data-mode", function (k) {
      var d = M[k];
      cstEl(root, "epi").className = "cld__epi is-" + k;
      cirBars(root, ["clear", "barrier"], d);
      cstOut(cstEl(root, "out"), d[3], d[2]);
    });
    root.querySelector("[data-mode='normal']").click();
  }

  /* ---------- Viz 2 · Virus vs Immune Response ---------- */
  function initCldVirus() {
    var root = document.querySelector("[data-cldvirus]");
    if (!root) return;
    var range = root.querySelector("input[type=range]"), medBtn = root.querySelector("[data-med]");
    var VIR = [20, 80, 95, 70, 45, 25, 12, 6, 3, 2], INF = [10, 45, 80, 90, 75, 55, 35, 20, 12, 8];
    var med = false;
    function update() {
      var d = +range.value, i = d - 1;
      var sym = Math.round(INF[i] * 0.95 * (med ? 0.5 : 1));
      cstEl(root, "day").textContent = "Day " + d;
      cirBars(root, ["vir", "inf", "sym"], [VIR[i], INF[i], sym]);
      var msg = d <= 2 ? "바이러스가 먼저 늘어납니다. 아직 증상은 약하지만 <b>전파력은 이미 높을 수 있습니다</b>." :
        d <= 5 ? "증상은 바이러스 양보다 <b>염증 반응</b>을 따라갑니다 — 바이러스가 줄기 시작해도 증상은 정점." :
        "바이러스와 염증이 함께 가라앉으며 자연 회복합니다.";
      if (med) msg += "<br>💊 증상완화제로 <b>느끼는 증상만</b> 줄었습니다. 바이러스 양은 그대로입니다.";
      cstOut(cstEl(root, "out"), msg, med ? "mid" : "");
    }
    range.addEventListener("input", update);
    medBtn.addEventListener("click", function () { med = !med; medBtn.classList.toggle("on", med); update(); });
    update();
  }

  /* ---------- Viz 3 · Cold Symptom Mechanism Map ---------- */
  function initCldMap() {
    var root = document.querySelector("[data-cldmap]");
    if (!root) return;
    var S = {
      rhin: ["혈관 투과성 ↑ → 혈장 유래 액체 + <b>부교감 반사</b>로 분비샘 분비 ↑", "Cytokine · bradykinin · cholinergic 신경반사 (histamine은 작은 역할)", "1세대 항히스타민제(항콜린 작용 포함) · 생리식염수"],
      cong: ["점막 <b>정맥총 확장 + 부종</b> → 공기 통로가 좁아짐", "염증 매개물질 → 혈관 확장 · 투과성 ↑", "비충혈제거제 — pseudoephedrine · 국소 oxymetazoline(단기)"],
      throat: ["인두 염증 → 감각신경 자극·과민 → 통증", "Bradykinin · prostaglandin", "Acetaminophen · NSAID · 가글·로젠지"],
      cough: ["후비루 · 기도 염증 · <b>기침 과민</b> → 뇌간 기침 네트워크 → 반사", "감각 구심신경(후두·하기도는 미주신경)", "진해제(DXM · levodropropizine · codeine) / 가래가 문제면 점액용해제"],
      fever: ["Pyrogenic cytokine → 시상하부 <b>PGE₂ ↑ → set point ↑</b> + 몸살·피로", "IL-1 · IL-6 · TNF · PGE₂", "Acetaminophen · NSAID (목표는 숫자가 아니라 불편감)"]
    };
    cirSeg(root, "data-s", function (k) {
      cstEl(root, "mech").innerHTML = S[k][0];
      cstEl(root, "med").innerHTML = S[k][1];
      cstEl(root, "drug").innerHTML = S[k][2];
    });
  }

  /* ---------- Viz 4 · Runny vs Blocked Nose ---------- */
  function initCldNose() {
    var root = document.querySelector("[data-cldnose]");
    if (!root) return;
    var LV = ["없음", "약함", "보통", "심함", "매우 심함"];
    var v = { sec: 2, swell: 2 }, drug = {};
    function update() {
      var sec = Math.max(0, v.sec - (drug.ah ? 2 : 0) - (drug.saline ? 1 : 0));
      var sw = Math.max(0, v.swell - (drug.pse ? 2 : 0));
      cstEl(root, "v-sec").textContent = LV[v.sec];
      cstEl(root, "v-swell").textContent = LV[v.swell];
      var wall = 6 + sw * 8.5;
      cstEl(root, "wl").style.width = wall + "%";
      cstEl(root, "wr").style.width = wall + "%";
      cstEl(root, "drops").textContent = new Array(sec * 2 + 1).join("💧");
      var flow = Math.max(0, Math.min(100, 100 - sw * 21 - sec * 4));
      cstEl(root, "flow").textContent = "💨 " + flow + "%";
      var msg, tone;
      if (sw >= 3 && sec <= 1) { msg = "분비는 적은데 <b>꽉 막힘</b> — 원인은 콧물이 아니라 <b>점막 부종</b>입니다. 코를 풀어도 소용없습니다."; tone = "bad"; }
      else if (sec >= 3 && sw <= 1) { msg = "<b>콧물은 줄줄</b>, 통로는 비교적 열려 있음 — 분비의 문제입니다."; tone = "mid"; }
      else if (flow >= 75) { msg = "공기가 잘 통합니다."; tone = "ok"; }
      else { msg = "분비와 부종이 함께 — 감기에서 가장 흔한 조합입니다."; tone = "mid"; }
      var notes = [];
      if (drug.ah) notes.push("💊 <b>1세대 항히스타민제</b> — 분비 ↓ (부종엔 거의 영향 없음) · 졸림·항콜린 주의");
      if (drug.pse) notes.push("💊 <b>Pseudoephedrine</b> — 혈관 수축 → 부종 ↓ (콧물을 말리는 약이 아님) · 혈압·요폐 주의");
      if (drug.saline) notes.push("🧂 <b>생리식염수</b> — 분비물 제거 · 점막 불편감 완화");
      cstOut(cstEl(root, "out"), msg + (notes.length ? "<br>" + notes.join("<br>") : ""), tone);
    }
    root.querySelectorAll("input[data-k]").forEach(function (r) {
      r.addEventListener("input", function () { v[r.getAttribute("data-k")] = +r.value; update(); });
    });
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-drug"); drug[k] = !drug[k]; b.classList.toggle("on", drug[k]); update(); });
    });
    update();
  }

  /* ---------- Viz 5 · Cough Sensitivity ---------- */
  function initCldCough() {
    var root = document.querySelector("[data-cldcough]");
    if (!root) return;
    var VIR = [90, 30, 0, 0], SENS = [60, 80, 55, 15];
    var MSG = ["Day 1 — 바이러스 활동이 활발하고 기도가 예민해지기 시작합니다.", "Day 7 — 바이러스는 줄었지만 <b>기침 민감도는 오히려 정점</b>.", "Week 3 — 바이러스는 없는데 신경 과민이 남음 = <b>감염 후 기침</b>(아급성).", "Week 6 — 대부분 정상화. 이때도 심하면 천식·GERD·약물 등 다른 원인을 평가합니다."];
    var NAME = { 1: "찬 공기", 2: "오래 말하기", 3: "향수" };
    var t = 0, st = null;
    function update() {
      cirBars(root, ["vir", "sens"], [VIR[t], SENS[t]]);
      var msg = MSG[t], tone = "";
      if (st) {
        var cough = SENS[t] >= 50;
        msg += "<br>" + (cough ? "💨 <b>" + NAME[st] + " → 기침!</b> 평소엔 아무렇지 않던 자극에도 반사가 켜집니다." : "🙂 " + NAME[st] + " → 기침 없음.");
        tone = cough ? "bad" : "ok";
      }
      cstOut(cstEl(root, "out"), msg, tone);
    }
    cirSeg(root, "data-t", function (k) { t = +k; update(); });
    root.querySelectorAll("[data-st]").forEach(function (b) {
      b.addEventListener("click", function () {
        st = b.getAttribute("data-st");
        root.querySelectorAll("[data-st]").forEach(function (x) { x.classList.toggle("on", x === b); });
        update();
      });
    });
    update();
  }

  /* ---------- Viz 6 · Fever Thermostat ---------- */
  function initCldFever() {
    var root = document.querySelector("[data-cldfever]");
    if (!root) return;
    var F = [
      ["37℃", "37℃", "균형", "ok", "<b>정상</b> — set point와 체온이 같아 몸은 편안합니다."],
      ["39℃", "37.2℃", "🥶 춥다 · 오한", "mid", "<b>감염 초기</b> — cytokine → PGE₂ → set point 39℃. 실제 체온이 상대적으로 \"낮다\"고 느껴 <b>말초혈관 수축 · 떨림</b>으로 열을 만듭니다. 그래서 열이 오르기 전에 춥고 떨립니다."],
      ["39℃", "39℃", "🤒 열 · 몸살", "bad", "<b>열 도달</b> — 체온이 새 set point에 도달. 같은 cytokine 신호로 근육통·피로·두통이 함께 옵니다."],
      ["37.5℃", "38.6℃", "🥵 덥다 · 땀", "ok", "<b>해열제</b> — PGE₂ 신호 ↓ → set point 정상화 → 이번엔 체온이 \"높다\"고 느껴 <b>혈관 확장·땀</b>으로 열을 내보냅니다. 바이러스가 사라진 것은 아닙니다."]
    ];
    cirSeg(root, "data-f", function (k) {
      var d = F[+k];
      cstEl(root, "sp").textContent = d[0];
      cstEl(root, "bt").textContent = d[1];
      cstEl(root, "resp").textContent = d[2];
      cstOut(cstEl(root, "out"), d[4], d[3]);
    });
    root.querySelector("[data-f='0']").click();
  }

  /* ---------- Viz 7 · Cold Timeline ---------- */
  function initCldTimeline() {
    var root = document.querySelector("[data-cldtimeline]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var C = {
      throat: [80, 70, 45, 30, 20, 12, 8, 5, 3, 0, 0, 0, 0, 0],
      rhin: [20, 70, 85, 80, 65, 45, 30, 20, 12, 8, 5, 3, 0, 0],
      cong: [5, 40, 75, 80, 70, 55, 40, 28, 18, 10, 6, 3, 0, 0],
      cough: [5, 20, 50, 65, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20]
    };
    function update() {
      var d = +range.value, i = d - 1;
      cstEl(root, "day").textContent = "Day " + d;
      cirBars(root, ["throat", "rhin", "cong", "cough"], [C.throat[i], C.rhin[i], C.cong[i], C.cough[i]]);
      var col = cstEl(root, "color");
      if (d <= 3) { col.textContent = "콧물 색 · 맑음"; col.className = "cld__mucuscolor is-clear"; }
      else if (d <= 7) { col.textContent = "콧물 색 · 노랑 / 녹색"; col.className = "cld__mucuscolor is-yellow"; }
      else { col.textContent = "콧물 · 줄어듦"; col.className = "cld__mucuscolor"; }
      var msg, tone = "";
      if (d <= 2) msg = "목이 따끔 → 재채기 · 맑은 콧물로 시작합니다.";
      else if (d <= 3) msg = "콧물·코막힘·기침이 늘며 <b>증상이 정점</b>에 가까워집니다.";
      else if (d <= 7) { msg = "콧물이 노랗거나 녹색 — <b>정상적인 바이러스성 감기의 경과에서도 발생할 수 있는 변화입니다.</b> 전반적으로 좋아지는 중인지가 중요합니다."; tone = "ok"; }
      else if (d <= 10) msg = "대부분의 증상이 줄어듭니다. 기침이 가장 늦게 남습니다.";
      else { msg = "기침은 몇 주 남을 수 있습니다. 하지만 <b>코 증상이 10일 넘게 호전 없음</b>이라면 평가가 필요합니다."; tone = "mid"; }
      cstOut(cstEl(root, "out"), msg, tone);
    }
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 8 · Respiratory Infection Map ---------- */
  function initCldInfMap() {
    var root = document.querySelector("[data-cldinfmap]");
    if (!root) return;
    var L = {
      nose: "👃 <b>비강</b> — <b>감기</b> · 알레르기비염. 콧물·코막힘·재채기.",
      sinus: "🦴 <b>부비동</b> — <b>부비동염</b>. 대부분 바이러스성이며, 세균성은 10일 지속 · 고열+안면통증 · 재악화 패턴으로 의심.",
      pharynx: "👅 <b>인두</b> — <b>인두염</b>. 대부분 바이러스. 발열 + 편도 삼출 + 압통성 림프절 + 기침 없음이면 GAS 가능성.",
      larynx: "🗣️ <b>후두</b> — <b>후두염</b>. 쉰 목소리 · 마른기침. 소아는 크룹(개 짖는 기침), 침 삼키기 어려움·호흡곤란은 응급.",
      bronchi: "🌿 <b>기관지</b> — <b>급성 기관지염</b>. 기침이 주증상, 수 주 지속 가능. 대부분 바이러스로 항생제 불필요.",
      alveoli: "🫁 <b>폐포</b> — <b>폐렴</b>. 호흡곤란 · 빈호흡 · 저산소증 · 흉통 · 고령자 의식변화. 상기도 감염과 다른 차원의 평가."
    };
    cirSeg(root, "data-loc", function (k) { cstOut(cstEl(root, "out"), L[k], k === "alveoli" ? "bad" : k === "nose" ? "ok" : "mid"); });
  }

  /* ---------- Viz 9 · Cold or Complication ---------- */
  function initCldScen() {
    var root = document.querySelector("[data-cldscen]");
    if (!root) return;
    var S = {
      a: [["D1 인후통", ""], ["D2 맑은 콧물", ""], ["D4 노란 콧물", "y"], ["D6 호전 중", "g"]], aT: ["ok", "✅ <b>전형적인 바이러스성 감기</b> — 노란 콧물에도 경과가 좋아지는 중. 대증요법과 관찰."],
      b: [["D1 콧물·코막힘", ""], ["D5 그대로", ""], ["D10 그대로", "y"], ["D12 호전 없음", "r"]], bT: ["mid", "<b>Pattern A · Persistent</b> — 10일 이상 호전 없음. 세균성 부비동염 평가를 권합니다."],
      c: [["D1–5 감기", ""], ["D6 호전", "g"], ["D8 고열 + 안면통증", "r"], ["D8 비루 증가", "r"]], cT: ["bad", "<b>Pattern C · Double worsening</b> — 좋아지다 다시 악화. 세균성 부비동염을 고려합니다.<br><span style=\"font-size:12.5px\">또 다른 패턴 B · Severe onset — 처음부터 약 39℃ 이상 고열 + 화농성 비루 또는 심한 안면통증이 수일 연속.</span>"],
      d: [["기침", ""], ["호흡수 28/분", "r"], ["SpO₂ 90%", "r"], ["새 혼돈", "r"]], dT: ["bad", "🚨 <b>상기도 감염을 넘어섬</b> — 빈호흡 · 저산소증 → 폐렴 등 <b>응급 평가</b>. 항생제 여부 이전에 중증도가 먼저입니다."]
    };
    cirSeg(root, "data-sc", function (k) {
      cstEl(root, "days").innerHTML = S[k].map(function (e) { return "<span class=\"" + (e[1] ? "is-" + e[1] : "") + "\">" + e[0] + "</span>"; }).join("");
      var t = S[k + "T"];
      cstOut(cstEl(root, "out"), t[1], t[0]);
    });
    root.querySelector("[data-sc='a']").click();
  }

  /* ---------- Viz 10 · Antihistamine CNS ---------- */
  function initCldAh() {
    var root = document.querySelector("[data-cldah]");
    if (!root) return;
    var A = {
      cpm: ["💊💊", 40, 85, 70, "bad", "<b>Chlorpheniramine (1세대)</b> — 지용성 · BBB를 잘 통과 → 뇌 H1 억제 → <b>졸림·반응속도 저하</b>. 항무스카린 작용으로 감기 콧물을 조금 줄이지만 <b>입마름·변비·요폐·혼돈</b>도 함께."],
      cet: ["💊", 15, 35, 10, "mid", "<b>Cetirizine (2세대)</b> — BBB 통과가 적지만 2세대 중에서는 <b>졸림이 비교적 흔한 편</b>. 신기능 저하 시 용량 조절. 알레르기비염에는 좋지만 감기 콧물 효과는 제한적."],
      fex: ["", 10, 5, 5, "ok", "<b>Fexofenadine (2세대)</b> — P-gp가 뇌에서 밀어내 <b>거의 졸리지 않음</b>. 항콜린 작용도 거의 없음 → 알레르기비염엔 좋고, 감기 콧물엔 별로입니다."]
    };
    cirSeg(root, "data-ah", function (k) {
      var d = A[k];
      cstEl(root, "brain").textContent = d[0] || "—";
      cirBars(root, ["cold", "sed", "ach"], [d[1], d[2], d[3]]);
      cstOut(cstEl(root, "out"), d[5], d[4]);
    });
    root.querySelector("[data-ah='cpm']").click();
  }

  /* ---------- Viz 11 · Topical decongestant rebound ---------- */
  function initCldRebound() {
    var root = document.querySelector("[data-cldrebound]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    function update() {
      var d = +range.value;
      var relief = d <= 3 ? 90 : Math.max(35, 90 - (d - 3) * 6);
      var dur = d <= 3 ? 80 : Math.max(15, 80 - (d - 3) * 7);
      var reb = d <= 3 ? 5 : Math.min(95, (d - 3) * 10);
      cstEl(root, "d").textContent = d + "일";
      cirBars(root, ["relief", "dur", "reb"], [relief, dur, reb]);
      if (d <= 3) cstOut(cstEl(root, "out"), "✅ <b>단기 사용</b> — 빠르고 확실한 코막힘 완화. 이 범위에서 끝내는 것이 원칙입니다.", "ok");
      else if (d <= 5) cstOut(cstEl(root, "out"), "⚠️ <b>권장 기간의 끝</b> — 더 쓰기 전에 원인(감기 회복 중인지, 알레르기인지)을 다시 봅니다.", "mid");
      else cstOut(cstEl(root, "out"), "🚨 <b>반동성 코막힘 악순환</b> — 약효는 짧아지고 끊으면 더 막힘 → 더 자주 뿌림. 중단 계획(한쪽씩 끊기, 비강 스테로이드 등)을 상의합니다.", "bad");
    }
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 12 · Cough Reflex Drug Map ---------- */
  function initCldReflex() {
    var root = document.querySelector("[data-cldreflex]");
    if (!root) return;
    var D = {
      levo: ["periph", "<b>Levodropropizine</b> — <b>말초</b> 감각 구심신호를 줄여 반사의 입구를 낮춥니다. 중추 opioid와 다른 방식. 졸림·어지럼 가능."],
      dxm: ["central", "<b>Dextromethorphan</b> — <b>뇌간</b> 기침 네트워크 조절. 어지럼·졸림·오심, <b>serotonergic</b>(MAOI 금기 · SSRI/SNRI 주의) · CYP2D6 억제제로 노출 ↑ · 과량 시 해리 증상."],
      cod: ["central", "<b>Codeine · dihydrocodeine</b> — 중추 opioid 관련. 진정 · <b>호흡억제</b> · 변비 · 의존. 감기 급성 기침엔 기대만큼 효과적이지 않다는 근거. 소아는 엄격한 연령 제한."],
      nac: ["mucus", "<b>Acetylcysteine</b> — 반사가 아니라 <b>점액</b>을 겨냥. 점도를 낮춰 배출을 돕습니다. 진해제가 아닙니다."]
    };
    var cur = null;
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () {
        cur = cur === b.getAttribute("data-drug") ? null : b.getAttribute("data-drug");
        root.querySelectorAll("[data-drug]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-drug") === cur); });
        root.querySelectorAll("[data-p]").forEach(function (s) {
          var hit = cur && s.getAttribute("data-p") === D[cur][0];
          s.classList.toggle("on", !!hit);
          s.classList.toggle("cur", !!hit);
        });
        cstOut(cstEl(root, "out"), cur ? D[cur][1] : "약을 탭하면 작용 위치와 주의점이 표시됩니다.");
      });
    });
  }

  /* ---------- Viz 13 · Mucus Viscosity ---------- */
  function initCldMucus() {
    var root = document.querySelector("[data-cldmucus]");
    if (!root) return;
    var st = { nac: false, sup: false };
    function update() {
      var clear = st.nac ? (st.sup ? 45 : 80) : (st.sup ? 15 : 50);
      cirBars(root, ["visc", "cough", "clear"], [st.nac ? 30 : 85, st.sup ? 20 : 70, clear]);
      cstEl(root, "mucin").classList.toggle("is-cut", st.nac);
      var msg, tone;
      if (st.nac && !st.sup) { msg = "💊 <b>NAC</b> — disulfide 결합이 끊겨 점액이 묽어지고, 기침으로 <b>더 잘 뱉어집니다</b>."; tone = "ok"; }
      else if (!st.nac && st.sup) { msg = "🤐 <b>끈적한 가래 + 기침 억제</b> — 기침은 줄었지만 분비물이 <b>고입니다</b>. 가래를 못 뱉는 고령자에서 흡인·폐렴 위험."; tone = "bad"; }
      else if (st.nac && st.sup) { msg = "묽어졌지만 내보낼 기침이 약해졌습니다 — 병용이 항상 틀린 것은 아니지만 <b>목표가 서로 반대</b>임을 알고 씁니다."; tone = "mid"; }
      else { msg = "끈적한 점액 — mucin 사슬이 <b>S–S(disulfide) 결합</b>으로 엮여 있습니다. 두 버튼을 각각 눌러 보세요."; tone = ""; }
      cstOut(cstEl(root, "out"), msg, tone);
    }
    root.querySelectorAll("[data-a]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-a"); st[k] = !st[k]; b.classList.toggle("on", st[k]); update(); });
    });
    update();
  }

  /* ---------- Viz 14 · Natural Recovery vs Antibiotics ---------- */
  function initCldAbx() {
    var root = document.querySelector("[data-cldabx]");
    if (!root) return;
    var H = [30, 60, 85, 80, 60, 35, 20, 10, 5, 3];
    ["a", "b"].forEach(function (row) {
      cstEl(root, row).innerHTML = H.map(function (h, i) {
        return "<i style=\"height:" + h + "%\" class=\"" + (row === "b" && i >= 3 && i <= 7 ? "is-abx" : "") + "\"><em>" + (i + 1) + "</em></i>";
      }).join("");
    });
    var btn = root.querySelector("[data-show]"), shown = false;
    btn.addEventListener("click", function () {
      shown = !shown;
      btn.classList.toggle("on", shown);
      if (shown) cstOut(cstEl(root, "out"), "두 곡선은 같습니다. B가 <b>추가로</b> 얻은 것: 설사 · 알레르기 위험 · 상호작용 · <b>C. difficile</b> · 내성균 선택압 · 장내세균 변화. 그리고 \"다음에도 항생제\"라는 믿음.", "bad");
      else cstOut(cstEl(root, "out"), "두 환자 모두 Day 6 즈음 좋아집니다. B는 \"항생제 덕분\"이라고 느낍니다.");
    });
  }

  /* ---------- Viz 15 · Build Your Cold Medicine ---------- */
  function initCldBuild() {
    var root = document.querySelector("[data-cldbuild]");
    if (!root) return;
    var SYM = { fever: "analg", throat: "analg", rhin: "ah", cong: "decong", dry: "tuss", wet: "muco" };
    var CLS = { analg: "해열진통제 — acetaminophen · NSAID", ah: "1세대 항히스타민제 (또는 생리식염수)", decong: "비충혈제거제 — pseudoephedrine · 국소 분무(단기)", tuss: "진해제 — DXM · levodropropizine", muco: "점액용해·거담제 — NAC · ambroxol 등 (기침 억제는 신중)" };
    var WARN = {
      htn: { decong: "고혈압 — 혈압 상승, 조절 상태 확인 (가능하면 국소·단기)", analg: "고혈압 — NSAID는 혈압 ↑·강압제 효과 ↓" },
      bph: { ah: "BPH — 항콜린 → 요폐", decong: "BPH — 방광 출구 긴장 → 요폐" },
      ckd: { analg: "CKD — NSAID 피함 → acetaminophen" },
      dem: { ah: "치매·고령 — 1세대는 섬망·낙상, 피함", tuss: "치매·고령 — codeine 등 진정성 진해제 주의" },
      ssri: { tuss: "항우울제 — DXM serotonergic·CYP2D6 상호작용", decong: "MAOI 복용이면 비충혈제거제 금기(고혈압 위기)" },
      liver: { analg: "간질환·과음 — acetaminophen 보수적 용량·총량 확인" },
      acoag: { analg: "항응고제 — NSAID 출혈 ↑ → acetaminophen 우선" }
    };
    var sym = {}, risk = {};
    function update() {
      var classes = [];
      Object.keys(sym).forEach(function (s) { if (sym[s] && classes.indexOf(SYM[s]) < 0) classes.push(SYM[s]); });
      var list = cstEl(root, "list");
      list.innerHTML = classes.map(function (c) {
        var w = [];
        Object.keys(risk).forEach(function (r) { if (risk[r] && WARN[r][c]) w.push(WARN[r][c]); });
        return "<div class=\"cld__item" + (w.length ? " is-warn" : "") + "\"><b>" + CLS[c] + "</b>" + (w.length ? "<small>⚠️ " + w.join("<br>⚠️ ") + "</small>" : "<small>✅ 선택한 위험요인과 특별한 충돌 없음</small>") + "</div>";
      }).join("");
      var warnN = list.querySelectorAll(".is-warn").length;
      if (!classes.length) cstOut(cstEl(root, "out"), "증상을 선택하세요.");
      else cstOut(cstEl(root, "out"), "필요한 약물군 " + classes.length + "개" + (warnN ? " · <b>주의 " + warnN + "개</b> — 해당 성분을 빼거나 대체를 생각합니다." : ".") + " 증상이 없는 성분은 넣지 않는 것이 원칙입니다.", warnN ? "bad" : "ok");
    }
    root.querySelectorAll("[data-sym]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-sym"); sym[k] = !sym[k]; b.classList.toggle("on", sym[k]); update(); });
    });
    root.querySelectorAll("[data-r]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-r"); risk[k] = !risk[k]; b.classList.toggle("on", risk[k]); update(); });
    });
  }

  /* ---------- Viz 16 · Cold Medicine Safety Detective ---------- */
  function initCldDetect() {
    var root = document.querySelector("[data-clddetect]");
    if (!root) return;
    cldCardQuiz(root, { none: "필요한 성분만", urine: "요폐 (항히스타민·비충혈제거)", ach: "항콜린 부담", nsaid: "NSAID", dxm: "DXM 상호작용" }, " — 환자마다 위험한 성분이 다릅니다.");
  }

  /* =====================================================================
     Core 19 · 간경변  (cst__ 공용 UI 재사용 + cir__ 전용)
     ===================================================================== */

  /* 단일 선택 seg 공통 헬퍼 */
  function cirSeg(root, attr, fn) {
    root.querySelectorAll("[" + attr + "]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[" + attr + "]").forEach(function (x) { x.classList.toggle("on", x === b); });
        fn(b.getAttribute(attr));
      });
    });
  }
  function cirBars(root, keys, vals) {
    keys.forEach(function (k, i) { cstEl(root, k).style.width = vals[i] + "%"; });
  }

  /* ---------- Viz 2 · Portal Hypertension Simulator ---------- */
  function initCirPortal() {
    var root = document.querySelector("[data-cirportal]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var LBL = ["F0 · 정상", "F1 · 초기 섬유화", "F2 · 의미 있는 섬유화", "F3 · 진행된 섬유화", "F4 · 간경변"];
    var RES = [10, 25, 45, 65, 90], HV = [3, 5, 7, 9, 14];
    var MSG = [
      ["ok", "혈액이 장·비장 → 문맥 → 간 → 간정맥 → 심장으로 <b>막힘 없이</b> 흐릅니다. Sinusoid는 저항이 낮은 통로입니다."],
      ["ok", "초기 섬유화 — 아직 혈류에는 큰 변화가 없습니다."],
      ["mid", "의미 있는 섬유화 — collagen이 sinusoid 주변에 쌓이며 저항이 오르기 시작합니다."],
      ["mid", "진행된 섬유화 — 저항이 커져 문맥압이 오르고, 혈액이 <b>우회로</b>를 찾기 시작합니다."],
      ["bad", "<b>간경변</b> — 재생결절과 구조 변형으로 간내 저항이 크게 증가. 문맥압이 CSPH 수준을 넘어 <b>정맥류 · 비장비대 · 복수 · shunt</b>가 동시에 나타납니다."]
    ];
    var ORG = {
      eso: "<b>식도</b> — 문맥혈이 식도 하부 정맥총으로 우회 → <b>정맥류</b>. 벽은 얇고 압력은 높아 파열 시 대량 출혈.",
      spleen: "<b>비장</b> — 비장 정맥혈이 빠지지 못해 울혈 → <b>비장비대</b> → 혈소판 격리 → 혈소판 감소.",
      asc: "<b>복강</b> — 내장 정수압 ↑ + 유효 동맥혈량 ↓에 따른 Na·물 저류 → <b>복수</b> (8번에서 자세히).",
      shunt: "<b>간 우회로(portosystemic shunt)</b> — 장의 혈액이 간을 거치지 않고 전신으로 → ammonia가 뇌로 → <b>간성뇌증</b>."
    };
    var stage = 0, organ = null;
    function update() {
      stage = +range.value;
      cstEl(root, "stage").textContent = LBL[stage];
      cstEl(root, "anat").className = "cir__anat s" + stage;
      cstEl(root, "res").style.width = RES[stage] + "%";
      cstEl(root, "pp").style.width = Math.min(100, HV[stage] / 18 * 100) + "%";
      var h = HV[stage];
      cstEl(root, "hvpg").innerHTML = "HVPG 약 <b>" + h + " mmHg</b> — " + (h <= 5 ? "정상 범위" : h < 10 ? "문맥고혈압" : "CSPH (≥10) · 정맥류 출혈 위험 수준 (≥12)");
      var m = MSG[stage], txt = m[1];
      if (organ) txt += "<br><br>" + ORG[organ] + (stage < 3 ? " <i>(이 단계에서는 아직 뚜렷하지 않음)</i>" : "");
      cstOut(cstEl(root, "out"), txt, m[0]);
    }
    range.addEventListener("input", update);
    root.querySelectorAll("[data-organ]").forEach(function (b) {
      b.addEventListener("click", function () {
        organ = organ === b.getAttribute("data-organ") ? null : b.getAttribute("data-organ");
        root.querySelectorAll("[data-organ]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-organ") === organ); });
        update();
      });
    });
    update();
  }

  /* ---------- Viz 3 · The Ascites Paradox ---------- */
  function initCirAscites() {
    var root = document.querySelector("[data-cirascites]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var LBL = ["대상성", "초기 문맥고혈압", "내장혈관 확장", "비대상성 · 복수", "불응성 복수 · 저나트륨"];
    var V = { tbw: [50, 55, 65, 80, 92], eabv: [80, 70, 55, 40, 28], raas: [10, 25, 50, 75, 92], adh: [8, 15, 30, 60, 88], asc: [0, 5, 20, 60, 92], na: [70, 70, 68, 58, 40] };
    var TBW = ["정상", "정상", "↑", "↑↑", "↑↑↑"], EAB = ["정상", "↓", "↓↓", "↓↓", "↓↓↓"];
    var MSG = [
      ["ok", "대상성 — 순환이 아직 균형을 유지합니다."],
      ["mid", "문맥압이 오르며 내장혈관에서 nitric oxide 등 확장 물질이 늘기 시작합니다."],
      ["mid", "내장혈관 확장으로 혈액이 내장에 고임 → <b>유효 동맥혈량 ↓</b> → 신장이 RAAS를 켭니다. 아직 복수는 적을 수 있습니다."],
      ["bad", "Na·물 저류가 누적 → 복수 · 부종. <b>전체 체액은 늘었는데 유효 동맥혈량은 줄어든</b> 역설."],
      ["bad", "ADH까지 강하게 켜져 자유수가 저류 → <b>희석성 저나트륨혈증</b>. 신장혈관 수축이 심해지면 HRS-AKI로 이어집니다 (14번)."]
    ];
    var DRUG = {
      spiro: "💊 <b>Spironolactone</b> — ④ 신장 Na 저류 단계에서 <b>aldosterone을 직접 차단</b>. 원인 기전(이차성 고알도스테론증)과 맞닿은 약입니다.",
      furo: "💊 <b>Furosemide</b> — ④ 단계, Henle 고리에서 Na 재흡수를 막아 spironolactone의 효과를 키웁니다.",
      alb: "💊 <b>Albumin</b> — ③ 단계, 혈관 안 용적을 보충해 유효 동맥혈량을 지탱합니다 (대량 천자 후 · SBP · HRS-AKI 등 특정 상황).",
      terli: "💊 <b>Terlipressin</b> — ② 단계, 과도하게 열린 <b>내장혈관을 조여</b> 유효 순환을 되돌립니다 (HRS-AKI · 정맥류 출혈).",
      nsbb: "💊 <b>NSBB</b> — ① 단계, 문맥 유입을 줄여 문맥압 ↓. 단, 진행된 복수에서 저혈압이 있으면 신관류를 해칠 수 있어 조정이 필요합니다."
    };
    var drug = null;
    function update() {
      var lv = +range.value;
      cstEl(root, "lv").textContent = LBL[lv];
      Object.keys(V).forEach(function (k) { cstEl(root, k).style.width = V[k][lv] + "%"; });
      cstEl(root, "tbw-t").textContent = TBW[lv];
      cstEl(root, "eabv-t").textContent = EAB[lv];
      cstOut(cstEl(root, "out"), MSG[lv][1] + (drug ? "<br><br>" + DRUG[drug] : ""), MSG[lv][0]);
    }
    range.addEventListener("input", update);
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () {
        drug = drug === b.getAttribute("data-drug") ? null : b.getAttribute("data-drug");
        root.querySelectorAll("[data-drug]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-drug") === drug); });
        update();
      });
    });
    update();
  }

  /* ---------- Viz 4 · Ascites Drug Target Map ---------- */
  function initCirNeph() {
    var root = document.querySelector("[data-cirneph]");
    if (!root) return;
    var D = {
      spiro: { seg: ["cd"], na: 45, water: 40, k: ["up", "K ↑ 경향 — 고칼륨혈증 주의"], msg: "<b>Spironolactone</b> — 집합관의 aldosterone 작용 차단. 효과는 비교적 완만하게(수일) 나타나며, 원인 기전에 직접 작용하는 기본 약입니다." },
      furo: { seg: ["loop"], na: 70, water: 70, k: ["down", "K ↓ 경향 — 저칼륨·저Mg 주의"], msg: "<b>Furosemide</b> — Henle 고리 NKCC2 억제. 강하지만 간경변 복수에서 <b>단독</b>으로는 잘 쓰지 않습니다 (aldosterone이 원위부에서 Na를 다시 붙잡음)." },
      both: { seg: ["loop", "cd"], na: 90, water: 85, k: ["mid", "K 변화 일부 상쇄 — 그래도 정기 측정 필수"], msg: "<b>병용</b> — 서로 다른 nephron 부위를 막아 Na 배설 ↑. 대표 시작 비율 <b>100 : 40</b>, 상황에 따라 단독·저용량." }
    };
    function show(k) {
      var d = D[k];
      root.querySelectorAll("[data-seg]").forEach(function (s) { s.classList.toggle("on", d.seg.indexOf(s.getAttribute("data-seg")) >= 0); });
      cirBars(root, ["na", "water"], [d.na, d.water]);
      var kEl = cstEl(root, "k");
      kEl.textContent = d.k[1];
      kEl.className = "cir__k is-" + d.k[0];
      cstOut(cstEl(root, "out"), d.msg);
    }
    cirSeg(root, "data-d", show);
    show("spiro");
  }

  /* ---------- Viz 5 · SBP PMN ---------- */
  function initCirSbp() {
    var root = document.querySelector("[data-cirsbp]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    function update() {
      var v = +range.value;
      cstEl(root, "v").textContent = v;
      cstEl(root, "bar").style.width = (v / 10) + "%";
      cstEl(root, "bar").className = v >= 250 ? "is-bad" : "";
      if (v >= 250) cstOut(cstEl(root, "out"), "🚨 <b>SBP 기준 충족 (PMN ≥ 250)</b> — 배양 결과를 기다리지 않고 경험적 항생제(3세대 cephalosporin 등) 시작. 신기능 저하 위험이 높으면 albumin 병용을 고려합니다.", "bad");
      else cstOut(cstEl(root, "out"), "기준 미충족 — 하지만 발열·복통·HE 악화·신기능 저하 등 임상상이 있으면 배양 결과와 함께 추가 평가합니다.", v >= 150 ? "mid" : "ok");
    }
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 6 · Gut–Liver–Brain Axis ---------- */
  function initCirBrain() {
    var root = document.querySelector("[data-cirbrain]");
    if (!root) return;
    var mode = "normal", pf = {}, tx = {};
    function update() {
      var cirr = mode === "cirr";
      var reasons = [];
      root.querySelectorAll("[data-pf]").forEach(function (b) { if (pf[b.getAttribute("data-pf")]) reasons.push(b.getAttribute("data-why")); });
      var n = reasons.length;
      var nh3 = cirr ? 40 + n * 10 : 6 + n * 3;
      if (tx.lac) nh3 -= cirr ? 18 : 2;
      if (tx.rif) nh3 -= cirr ? 10 : 1;
      nh3 = Math.max(4, Math.min(98, nh3));
      cirBars(root, ["detox", "shunt", "nh3"], [cirr ? 35 : 90, cirr ? 60 : 5, nh3]);
      var txt = cirr ? "<b>간경변</b> — 해독 ↓ + shunt ↑ → 장에서 온 ammonia가 뇌에 도달합니다." : "<b>정상 간</b> — 문맥으로 온 ammonia 대부분이 간에서 urea로 처리됩니다.";
      if (n) txt += "<br>악화 요인:<br>• " + reasons.join("<br>• ");
      if (tx.lac) txt += "<br>💊 Lactulose — 대장 산성화(NH₄⁺ trapping) + 배변 촉진.";
      if (tx.rif) txt += "<br>💊 Rifaximin — 장내세균의 ammonia 관련 대사 ↓.";
      if (cirr && n && !tx.lac && !tx.rif) txt += "<br><b>약보다 먼저 악화 요인을 찾아 교정합니다.</b>";
      var tone = nh3 >= 70 ? "bad" : nh3 >= 40 ? "mid" : "ok";
      if (tone === "bad") txt = "🚨 <b>Overt HE 위험</b><br>" + txt;
      cstOut(cstEl(root, "out"), txt, tone);
    }
    cirSeg(root, "data-mode", function (m) { mode = m; update(); });
    root.querySelectorAll("[data-pf]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-pf"); pf[k] = !pf[k]; b.classList.toggle("on", pf[k]); update(); });
    });
    root.querySelectorAll("[data-tx]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-tx"); tx[k] = !tx[k]; b.classList.toggle("on", tx[k]); update(); });
    });
    update();
  }

  /* ---------- Viz 7 · Lactulose Ammonia Trap ---------- */
  function initCirLac() {
    var root = document.querySelector("[data-cirlac]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var L = [
      ["없음", "NH₃ NH₃ NH₃ NH₃", "NH₃ NH₃ NH₃", 80, 10, 5, "bad", "<b>변비 지속</b> — 대장 pH가 높아 NH₃가 그대로 흡수되고, 질소화합물이 오래 머뭅니다."],
      ["부족", "NH₃ NH₃ NH₄⁺ NH₄⁺", "NH₃ NH₃", 65, 25, 5, "mid", "<b>부족</b> — 배변이 하루 1회 미만. 용량을 올려 목표에 맞춥니다."],
      ["적절", "NH₄⁺ NH₄⁺ NH₄⁺ NH₃", "NH₃", 45, 55, 10, "ok", "✅ <b>적절</b> — 하루 2–3회 부드러운 배변. pH ↓로 NH₄⁺가 장 안에 갇히고 배변으로 빠져나갑니다."],
      ["과다", "NH₄⁺ NH₄⁺ NH₄⁺ NH₄⁺", "NH₃", 35, 85, 60, "mid", "⚠️ <b>과다</b> — 물설사. ammonia는 더 줄지 않는데 탈수·저칼륨 위험이 커집니다 → 처방의와 감량 상의."],
      ["매우 과다", "NH₄⁺ NH₄⁺ NH₄⁺ NH₄⁺", "NH₃ ⚠️", 30, 98, 92, "bad", "🚨 <b>매우 과다</b> — 탈수 → 저칼륨 · AKI → <b>오히려 간성뇌증 악화</b>. 설사를 많이 할수록 좋은 약이 아닙니다."]
    ];
    function update() {
      var d = L[+range.value];
      cstEl(root, "lv").textContent = d[0];
      cstEl(root, "lumen").textContent = d[1];
      cstEl(root, "blood").textContent = d[2];
      cirBars(root, ["ph", "bm", "risk"], [d[3], d[4], d[5]]);
      cstEl(root, "wall").classList.toggle("is-trap", +range.value >= 2);
      cstOut(cstEl(root, "out"), d[7], d[6]);
    }
    range.addEventListener("input", update);
    update();
  }

  /* ---------- Viz 8 · Liver–Kidney Paradox ---------- */
  function initCirKidney() {
    var root = document.querySelector("[data-cirkidney]");
    if (!root) return;
    var M = {
      normal: [10, 85, 10, 90, 5, "ok", "<b>정상</b> — 내장혈관 긴장도가 유지되어 신장 관류도 정상입니다."],
      hrs: [90, 30, 90, 20, 10, "bad", "<b>진행 간경변</b> — 내장혈관이 과도하게 열려 유효 동맥혈량 ↓ → 몸이 혈압을 지키려고 RAAS·교감신경을 켜고 → <b>신장혈관이 수축</b> → GFR ↓ = HRS-AKI."],
      terli: [45, 65, 45, 60, 25, "ok", "💊 <b>Terlipressin + albumin</b> — V1 작용으로 <b>내장혈관을 조여</b> 유효 순환을 되돌리면, 신장에 걸리던 보상성 수축이 풀려 GFR이 회복될 수 있습니다."],
      over: [20, 85, 30, 55, 88, "bad", "⚠️ <b>과도한 사용</b> — 과한 혈관수축은 <b>허혈</b>(장·말초·심장), 과한 albumin은 <b>체액 과다·폐부종·호흡부전</b>. 산소포화도와 체액상태를 모니터링합니다."]
    };
    function show(k) {
      var d = M[k];
      cirBars(root, ["spl", "eabv", "renal", "gfr", "adv"], d);
      cstOut(cstEl(root, "out"), d[6], d[5]);
    }
    cirSeg(root, "data-mode", show);
    show("normal");
  }

  /* ---------- Viz 10 · Cirrhosis Lab Decoder ---------- */
  function initCirLabs() {
    var root = document.querySelector("[data-cirlabs]");
    if (!root) return;
    var PT = {
      a: ["acute", "AST/ALT가 크게 오르지만 합성기능(albumin·INR)은 정상 → <b>급성 간세포 손상</b> 가능 (Core 18의 급성 간염 패턴)."],
      b: ["fib", "손상 수치는 경미하지만 혈소판 ↓ + stiffness ↑ → <b>진행된 섬유화·문맥고혈압</b> 평가가 필요합니다. 간수치만 봤다면 놓쳤을 환자."],
      c: ["decomp", "Albumin ↓ · INR ↑ · bilirubin ↑ · 복수 → <b>간기능 저하·비대상화</b> 우려. AST/ALT와 무관하게 중증입니다."]
    };
    var cur = null, opts = cstEl(root, "opts");
    root.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-pt]").forEach(function (x) { x.classList.toggle("on", x === b); });
        cur = b.getAttribute("data-pt");
        opts.style.display = "flex";
        opts.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
        cstOut(cstEl(root, "out"), "해석을 선택하세요.");
      });
    });
    opts.querySelectorAll("[data-v]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!cur) return;
        opts.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.toggle("on", x === b); });
        var ok = b.getAttribute("data-v") === PT[cur][0];
        cstOut(cstEl(root, "out"), (ok ? "✅ " : "❌ ") + PT[cur][1], ok ? "ok" : "bad");
      });
    });
  }

  /* ---------- Viz 11 · Child–Pugh Calculator ---------- */
  function initCirCp() {
    var root = document.querySelector("[data-circp]");
    if (!root) return;
    var st = { bil: 1, alb: 1, inr: 1, asc: 1, he: 1 };
    function render() {
      Object.keys(st).forEach(function (k) {
        root.querySelectorAll("[data-k='" + k + "'] [data-p]").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-p") === st[k]); });
      });
      var sum = st.bil + st.alb + st.inr + st.asc + st.he;
      var cls = sum <= 6 ? "A" : sum <= 9 ? "B" : "C";
      var res = cstEl(root, "res");
      res.innerHTML = "<b>" + sum + "점</b> · Child–Pugh <b>" + cls + "</b>";
      res.className = "cir__cpres is-" + cls;
      var MSG = {
        A: ["ok", "<b>Class A</b> — 비교적 잘 보상된 상태. 많은 약을 표준 용량으로 쓰지만, 간대사가 큰 약은 \"경도 간장애\" 허가사항을 확인합니다."],
        B: ["mid", "<b>Class B</b> — 중등도. 간대사 약물의 <b>감량·일부 금기</b>가 시작되는 구간입니다 (예: glecaprevir/pibrentasvir 사용하지 않음)."],
        C: ["bad", "<b>Class C</b> — 중증. 많은 약이 금기·감량 대상이며 <b>간이식 평가</b>가 필요한 단계입니다. 진정제·NSAID는 특히 피합니다."]
      };
      cstOut(cstEl(root, "out"), MSG[cls][1], MSG[cls][0]);
    }
    root.querySelectorAll("[data-k]").forEach(function (row) {
      row.querySelectorAll("[data-p]").forEach(function (b) {
        b.addEventListener("click", function () { st[row.getAttribute("data-k")] = +b.getAttribute("data-p"); render(); });
      });
    });
    root.querySelector("[data-preset]").addEventListener("click", function () {
      st = { bil: 3, alb: 3, inr: 2, asc: 2, he: 2 };
      render();
      cstOut(cstEl(root, "out"), "📋 <b>오늘의 환자</b> — Bilirubin 3.2(3) · Albumin 2.5(3) · INR 1.7(2) · 복수(2) · 수면 역전·집중력 저하(2) = <b>12점, Class C</b>. AST 48 · ALT 35는 이 점수에 들어가지도 않습니다.", "bad");
    });
    render();
  }

  /* ---------- Viz 12 · Beta Blocker Portal Pressure Map ---------- */
  function initCirNsbb() {
    var root = document.querySelector("[data-cirnsbb]");
    if (!root) return;
    var B = {
      b1: [["co"], 30, "mid", "<b>β1 선택적 (bisoprolol 등)</b> — 심박출량만 ↓. β2 차단이 없어 <b>내장혈류 감소 효과가 빠집니다</b> → 문맥고혈압 치료용 NSBB를 대신하지 않습니다."],
      prop: [["co", "spl"], 60, "ok", "<b>Propranolol</b> — β1(심박출량 ↓) + β2(내장혈관 확장 억제 → 문맥 유입 ↓). 고전적인 NSBB."],
      carv: [["co", "spl", "ihr"], 80, "ok", "<b>Carvedilol</b> — β1 + β2 + <b>α1 차단</b>(간내 혈관 저항 ↓)으로 문맥압을 더 낮출 수 있어 주요 선택지. 대신 <b>저혈압</b>에 더 주의합니다."]
    };
    function show(k) {
      var d = B[k];
      root.querySelectorAll("[data-t]").forEach(function (t) { t.classList.toggle("on", d[0].indexOf(t.getAttribute("data-t")) >= 0); });
      cstEl(root, "drop").style.width = d[1] + "%";
      cstOut(cstEl(root, "out"), d[3], d[2]);
    }
    cirSeg(root, "data-bb", show);
    show("carv");
  }

  /* ---------- Viz 13 · TIPS Trade-off ---------- */
  function initCirTips() {
    var root = document.querySelector("[data-cirtips]");
    if (!root) return;
    var T = [
      [90, 80, 85, 30, 30, "bad", "<b>TIPS 전</b> — 문맥압이 높아 불응성 복수와 정맥류 출혈 위험이 큽니다."],
      [25, 35, 20, 85, 75, "mid", "<b>TIPS 후</b> — 문맥압 ↓ → 복수 · 정맥류 압력 개선. 하지만 문맥혈이 간을 거치지 않아 <b>ammonia 해독 ↓ → 간성뇌증 위험 ↑</b>. 심장으로 돌아오는 혈액도 늘어 심기능 평가가 필요합니다."]
    ];
    function show(k) {
      var d = T[+k];
      cirBars(root, ["pp", "asc", "var", "shunt", "he"], d);
      cstOut(cstEl(root, "out"), d[6], d[5]);
    }
    cirSeg(root, "data-tips", show);
    show("0");
  }

  /* ---------- Viz 15 · Medication Safety Checker ---------- */
  function initCirSafety() {
    var root = document.querySelector("[data-cirsafety]");
    if (!root) return;
    var M = {
      nsaid: [["kid", "lyte", "liver"], "bad", "<b>NSAID</b> — 신장 prostaglandin ↓ → 신혈관 수축 → <b>AKI</b> · Na 저류 → 복수 악화 · 이뇨제 반응 ↓ · <b>위장관 출혈</b>. 복수 환자에서는 피합니다."],
      apap: [["liver"], "ok", "<b>Acetaminophen</b> — 안정적인 간경변에서 흔히 <b>하루 2 g 이하</b>로 보수적으로 사용. 지속 음주 · 영양실조 · 급성 간손상 · 복합제 중복을 확인합니다."],
      bzd: [["cns"], "bad", "<b>Benzodiazepine</b> — CNS 억제 → <b>간성뇌증 유발·악화</b>, HE와 구분도 어려움, 낙상. 대사 저하로 축적. 불필요한 장기복용을 재평가합니다."],
      opioid: [["cns"], "mid", "<b>Opioid</b> — CNS 억제 + <b>변비</b> → HE 이중 위험. 청소율 저하로 축적 → 약물·용량·간격 개별화, 변비 예방을 함께."],
      acei: [["kid", "lyte"], "mid", "<b>ACEi · ARB</b> — 비대상성(복수·저혈압)에서는 RAAS가 신관류를 지키는 보상기전 → 차단 시 저혈압·AKI. 대상성에서 무조건 금기는 아니며 적절성을 재평가합니다."],
      ppi: [["liver", "cns"], "mid", "<b>PPI 장기</b> — 관찰연구에서 SBP·감염·HE와 연관이 보고됨(인과 미확립). 필요한 PPI는 유지하되 <b>적응증 없는 장기 처방</b>을 재평가합니다."],
      spiro: [["lyte", "kid"], "mid", "<b>Spironolactone</b> — K · Cr · BP 모니터링. 다른 K 상승 약(ACEi·ARB·TMP-SMX·K 보충제) 병용 주의. 여성형유방."],
      lac: [["lyte", "kid", "cns"], "mid", "<b>Lactulose</b> — 하루 2–3회 부드러운 변이 목표. 물설사 → 탈수·저칼륨·AKI → 오히려 HE 악화. HE 예방 목적이면 임의 중단 금지."],
      carv: [["lyte", "kid"], "mid", "<b>Carvedilol</b> — BP · HR 모니터링. 비대상성에서 저혈압(수축기 약 90 미만)·HRS-AKI·SBP가 생기면 감량·일시 중단을 검토합니다."],
      herb: [["liver"], "bad", "<b>한약 · 건강기능식품</b> — DILI 원인이 될 수 있습니다. \"간에 좋다는\" 제품도 예외가 아니며, UDCA 같은 특정 약도 모든 간경변의 섬유화를 되돌리지는 않습니다."]
    };
    var on = {};
    root.querySelectorAll("[data-med]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-med");
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        var hit = {};
        Object.keys(on).forEach(function (x) { if (on[x]) M[x][0].forEach(function (t) { hit[t] = 1; }); });
        root.querySelectorAll("[data-target]").forEach(function (t) { t.classList.toggle("on", !!hit[t.getAttribute("data-target")]); });
        var n = Object.keys(on).filter(function (x) { return on[x]; }).length;
        if (on[k]) cstOut(cstEl(root, "out"), M[k][2], M[k][1]);
        else cstOut(cstEl(root, "out"), n ? "선택된 약 " + n + "개." : "약을 탭하면 위험과 모니터링 항목이 나타납니다.");
      });
    });
  }

  /* ---------- Viz 16 · Complication Detective ---------- */
  function initCirDetective() {
    var root = document.querySelector("[data-cirdetective]");
    if (!root) return;
    var OPT = { asc: "복수", he: "간성뇌증", "var": "정맥류 출혈", sbp: "SBP", hrs: "HRS-AKI 감별" };
    var keys = Object.keys(OPT), qs = root.querySelectorAll(".cir__q"), done = 0, right = 0;
    qs.forEach(function (q) {
      var box = document.createElement("div"), fb = document.createElement("div");
      box.className = "cir__opts";
      fb.className = "cir__fb";
      keys.forEach(function (k) {
        var b = document.createElement("button");
        b.className = "cir__opt";
        b.textContent = OPT[k];
        b.addEventListener("click", function () {
          if (q.getAttribute("data-done")) return;
          q.setAttribute("data-done", "1");
          var ans = q.getAttribute("data-ans"), ok = k === ans;
          done++; if (ok) right++;
          box.querySelectorAll(".cir__opt").forEach(function (x, i) { if (keys[i] === ans) x.classList.add("is-right"); });
          if (!ok) b.classList.add("is-wrong");
          q.classList.add(ok ? "is-right" : "is-wrong");
          fb.innerHTML = (ok ? "✅ " : "❌ 정답은 " + OPT[ans] + " — ") + q.getAttribute("data-why");
          cstOut(cstEl(root, "out"), done + " / " + qs.length + " · 정답 " + right + "개" + (done === qs.length ? " — 합병증마다 약과 모니터링이 따라옵니다." : ""), done === qs.length ? (right === qs.length ? "ok" : "mid") : "");
        });
        box.appendChild(b);
      });
      q.appendChild(box);
      q.appendChild(fb);
    });
  }

  /* ---------- Viz 17 · Cirrhosis Master Map ---------- */
  function initCirMaster() {
    var root = document.querySelector("[data-cirmaster]");
    if (!root) return;
    var C = {
      "var": ["문맥혈이 식도 정맥총으로 우회 → 정맥류, 파열 시 대량 출혈", "예방: NSBB(carvedilol) · EVL<br>출혈: 혈관작용제 + 항생제 + 내시경", "BP · HR · 흑색변·토혈 교육"],
      asc: ["유효 동맥혈량 ↓ → RAAS/ADH → Na·물 저류 (+ 저알부민)", "Spironolactone ± furosemide · 저염 · 대량 천자 + albumin", "체중 · Na · K · Cr · 소변량 · NSAID 회피"],
      spl: ["비장 울혈 → 혈소판 격리 + TPO 생성 ↓", "원인·문맥고혈압 관리 (혈소판 자체보다)", "새로운·급격한 감소는 다른 원인(약물) 평가"],
      hrs: ["내장혈관 확장 → 신장혈관 수축 → GFR ↓", "원인 감별 후 terlipressin + albumin · 간이식", "Cr · 소변량 · 신독성 약 · 과이뇨 · 산소포화도"],
      shunt: ["장의 혈액이 간을 우회 → ammonia가 전신·뇌로", "TIPS는 이 shunt를 늘리는 치료 → HE 주의", "TIPS 후 의식 변화 · lactulose 순응도"],
      alb: ["합성 ↓ → oncotic pressure ↓ → 부종·복수에 기여", "Albumin은 특정 적응증에만 · 영양(단백질 1.2–1.5 g/kg)", "부종 · 체중 · 근육량(체중만 보지 않기)"],
      coag: ["응고인자와 항응고 단백질이 함께 ↓ → rebalanced hemostasis", "INR만 보고 혈장 일률 투여 X · 혈전·출혈 모두 고려", "출혈 징후 · 항혈소판·항응고제 병용 위험"],
      jaun: ["Bilirubin 처리·배출 ↓ → 황달 · 진한 소변", "원인 치료 · 급격히 악화하면 즉시 평가", "Bilirubin 추세 · Child–Pugh · 담즙 배설 약물"],
      he: ["해독 ↓ + shunt → ammonia → astrocyte 스트레스", "악화요인 교정 + lactulose(2–3회/일) ± rifaximin", "의식 · 배변 횟수 · 탈수 · K · 진정제·opioid 회피"]
    };
    root.querySelectorAll("[data-c]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-c]").forEach(function (x) { x.classList.toggle("on", x === b); });
        var d = C[b.getAttribute("data-c")];
        cstEl(root, "what").innerHTML = d[0];
        cstEl(root, "tx").innerHTML = d[1];
        cstEl(root, "mon").innerHTML = d[2];
      });
    });
  }

  /* =====================================================================
     Core 18 · 간염  (cst__ 공용 UI 재사용 + hep__ 전용)
     ===================================================================== */

  /* ---------- Viz 2 · Injury vs Function ---------- */
  function initHepInjury() {
    var root = document.querySelector("[data-hepinjury]");
    if (!root) return;
    var M = {
      normal: [5, 5, 10, 85, 10, "ok", "<b>정상</b> — 손상도 없고 기능도 정상입니다."],
      acute: [95, 80, 45, 80, 15, "mid", "<b>급성 간염</b> — ALT ↑↑↑. 하지만 albumin은 반감기(약 3주)가 길어 초기엔 거의 정상이고, INR도 정상일 수 있습니다. <b>손상은 크지만 기능은 아직 유지</b>되는 상태."],
      cirr: [20, 25, 40, 35, 55, "bad", "<b>간경변</b> — 남은 간세포가 적어 AST/ALT는 정상–약간 상승. 그런데 albumin ↓ · INR ↑ · bilirubin ↑. <b>\"간수치 정상 = 간 건강\"이 아닙니다.</b>"],
      alf: [40, 45, 85, 60, 95, "bad", "<b>급성 간부전(후기)</b> — 간세포가 대량으로 죽어 효소를 내보낼 세포 자체가 줄어 AST/ALT가 떨어지기 시작하는데, <b>INR ↑↑ · bilirubin ↑↑ · 뇌증</b>. 응급입니다."]
    };
    function show(k) {
      var d = M[k];
      root.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-mode") === k); });
      ["alt", "ast", "bil", "alb", "inr"].forEach(function (key, i) { cstEl(root, key).style.width = d[i] + "%"; });
      cstOut(cstEl(root, "out"), d[6], d[5]);
    }
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-mode")); });
    });
    show("normal");
  }

  /* ---------- Viz 3 · Bilirubin Journey ---------- */
  function initHepBili() {
    var root = document.querySelector("[data-hepbili]");
    if (!root) return;
    /* [unc, con, eye, urine, stool] — 두 번째 값 true면 이상 */
    var M = {
      normal: { node: null, s: [["정상", 0], ["정상", 0], ["정상", 0], ["맑은 노랑", 0], ["갈색", 0]], tone: "ok", msg: "<b>정상</b> — 만들어진 bilirubin이 간에서 포합되어 담즙으로 빠져나갑니다." },
      hemo: { node: "rbc", s: [["↑", 1], ["정상", 0], ["약간 노랑", 1], ["거의 정상", 0], ["정상–진함", 0]], tone: "mid", msg: "<b>용혈</b> — 적혈구가 많이 깨져 unconjugated bilirubin이 간의 처리 용량을 넘습니다. 지용성이라 <b>소변으로 나가지 못해 소변 색은 거의 그대로</b>입니다." },
      hep: { node: "liver", s: [["↑", 1], ["↑", 1], ["노랑", 1], ["진함 (콜라색)", 1], ["옅어질 수 있음", 1]], tone: "bad", msg: "<b>간염</b> — 손상된 간세포가 섭취·포합·배출을 모두 못 해 두 형태가 함께 오릅니다. 수용성 conjugated bilirubin이 소변으로 나가 <b>소변이 진해집니다</b>." },
      obs: { node: "bile", s: [["정상", 0], ["↑↑", 1], ["노랑", 1], ["진함", 1], ["회색 · 점토색", 1]], tone: "bad", msg: "<b>담도 폐쇄</b> (Core 17) — 포합은 됐지만 담즙으로 못 내려가 conjugated bilirubin이 역류합니다. 장에 색소가 가지 않아 <b>대변이 회색</b>이 됩니다." }
    };
    var KEYS = ["s-unc", "s-con", "s-eye", "s-urine", "s-stool"];
    function show(k) {
      var d = M[k];
      root.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-mode") === k); });
      root.querySelectorAll("[data-node]").forEach(function (n) { n.classList.toggle("is-bad", n.getAttribute("data-node") === d.node); });
      KEYS.forEach(function (key, i) {
        var el = cstEl(root, key);
        el.querySelector("b").textContent = d.s[i][0];
        el.classList.toggle("is-bad", !!d.s[i][1]);
      });
      cstOut(cstEl(root, "out"), d.msg, d.tone);
    }
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-mode")); });
    });
    show("normal");
  }

  /* ---------- Viz 5 · HBV Immune Interaction ---------- */
  function initHepImmune() {
    var root = document.querySelector("[data-hepimmune]");
    if (!root) return;
    var LV = ["매우 낮음", "낮음", "보통", "높음", "매우 높음"];
    var LI = ["매우 약함", "약함", "보통", "강함", "매우 강함"];
    var v = { vir: 4, imm: 1 };
    function update() {
      cstEl(root, "v-vir").textContent = LV[v.vir];
      cstEl(root, "v-imm").textContent = LI[v.imm];
      var dna = 8 + v.vir * 22;
      var alt = v.vir === 0 ? 8 : Math.min(95, 8 + v.imm * 21);
      var fib = Math.min(95, Math.round(alt * 0.7 + v.vir * 6));
      cstEl(root, "dna").style.width = dna + "%";
      cstEl(root, "alt").style.width = alt + "%";
      cstEl(root, "fib").style.width = fib + "%";
      var out = cstEl(root, "out");
      if (v.vir >= 3 && v.imm <= 1) cstOut(out, "<b>바이러스는 많은데 ALT는 정상일 수 있음</b> — 과거 \"immune-tolerant\"라 부르던 상태. 면역이 공격하지 않아 간수치는 조용합니다. 하지만 바이러스 양 자체가 장기 HCC 위험과 연결되어, <b>나이(40세 이상)나 섬유화</b>가 있으면 치료를 고려합니다.", "mid");
      else if (v.vir >= 2 && v.imm >= 2) cstOut(out, "<b>바이러스 증식 + 강한 면역 공격</b> → ALT ↑ · 섬유화 진행 = 활동성 만성 B형간염. 치료 필요성이 큽니다.", "bad");
      else if (v.vir <= 1 && v.imm >= 2) cstOut(out, "<b>면역이 바이러스를 강하게 누르는 중</b> — 바이러스는 줄었지만 그 과정에서 간염(ALT ↑)이 동반될 수 있습니다. HBeAg seroconversion 같은 전환기에 볼 수 있습니다.", "mid");
      else cstOut(out, "<b>바이러스도 적고 공격도 약함</b> — 비활동성 상태(과거 \"비활동성 보유자\"). 치료보다 정기 추적이 중심입니다.", "ok");
    }
    root.querySelectorAll("input[data-k]").forEach(function (r) {
      r.addEventListener("input", function () { v[r.getAttribute("data-k")] = +r.value; update(); });
    });
    update();
  }

  /* ---------- Viz 6 · HBV Serology Builder ---------- */
  function initHepSero() {
    var root = document.querySelector("[data-hepsero]");
    if (!root) return;
    var st = { s: 0, c: 0, a: 0 };
    var R = {
      "000": ["Susceptible", "mid", "감염된 적도, 면역도 없습니다 → <b>B형간염 백신</b> 접종 대상입니다."],
      "001": ["Vaccinated", "ok", "<b>백신으로 생긴 면역</b>. 백신은 HBsAg만 들어 있어 anti-HBs만 생기고 anti-HBc는 생기지 않습니다."],
      "011": ["Past infection · recovered", "ok", "<b>감염을 겪고 회복</b>했습니다 (anti-HBc = 감염 흔적, anti-HBs = 면역). 하지만 간세포 안에 cccDNA가 남을 수 있어 <b>강한 면역억제 치료 시 재활성화</b> 대상입니다."],
      "010": ["Isolated anti-HBc", "mid", "해석이 여러 가지입니다 — 과거 감염 후 anti-HBs가 사라진 경우(가장 흔함), 숨은(occult) 감염, 급성 감염 회복기(window), 위양성. 필요하면 HBV DNA를 확인하고, 면역억제 치료 시에는 <b>재활성화 위험군</b>으로 다룹니다."],
      "110": ["Current infection", "bad", "<b>현재 HBV 감염</b>. 급성인지 만성인지는 IgM anti-HBc와 기간(6개월 이상 지속 → 만성)으로 구분합니다. 다음은 HBeAg · HBV DNA · ALT · 섬유화 평가."],
      "100": ["Very early acute infection?", "mid", "<b>anti-HBc가 생기기 전의 매우 초기 급성 감염</b>일 수 있습니다. 백신 접종 직후 일시적으로 HBsAg가 검출되기도 합니다. 재검이 필요합니다."],
      "111": ["Current infection (드문 조합)", "bad", "드물게 현재 감염이 있으면서 anti-HBs도 검출됩니다(다른 subtype에 대한 항체 등). <b>현재 감염으로 취급</b>해 평가합니다."],
      "101": ["Atypical", "mid", "전형적이지 않은 조합 — 백신 직후 일시적 HBsAg 검출 등을 생각하고 재검합니다."]
    };
    function render() {
      root.querySelectorAll("[data-m]").forEach(function (b) {
        var on = !!st[b.getAttribute("data-m")];
        b.classList.toggle("on", on);
        b.querySelector("b").textContent = on ? "+" : "−";
      });
      var r = R["" + st.s + st.c + st.a];
      var vd = cstEl(root, "verdict");
      vd.textContent = r[0];
      vd.className = "hep__verdict is-" + r[1];
      cstOut(cstEl(root, "out"), r[2], r[1]);
    }
    root.querySelectorAll("[data-m]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.getAttribute("data-m"); st[k] = st[k] ? 0 : 1; render(); });
    });
    render();
  }

  /* ---------- Viz 8 · HBV Replication Block ---------- */
  function initHepNuc() {
    var root = document.querySelector("[data-hepnuc]");
    if (!root) return;
    var state = 0; /* 0 치료 전 · 1 복용 중 · 2 중단 */
    function render() {
      root.querySelectorAll("[data-step]").forEach(function (el) {
        var n = +el.getAttribute("data-step");
        el.classList.toggle("on", state !== 1 || n <= 1);
        el.classList.toggle("cur", state === 1 && n === 0);
        el.classList.toggle("hep__blocked", state === 1 && n >= 2);
      });
      root.querySelectorAll(".cst__chip").forEach(function (c) {
        c.classList.toggle("on", (c.getAttribute("data-act") === "drug" && state === 1) || (c.getAttribute("data-act") === "stop" && state === 2));
      });
      cstEl(root, "dna").style.width = (state === 1 ? 5 : state === 2 ? 88 : 90) + "%";
      cstEl(root, "ccc").style.width = (state === 1 ? 78 : 85) + "%";
      var out = cstEl(root, "out");
      if (state === 1) cstOut(out, "✅ <b>Polymerase(역전사) 차단</b> → 새 HBV DNA ↓↓ → 혈중 HBV DNA 미검출 가능. 하지만 <b>① cccDNA는 핵 안에 그대로</b> 남아 있습니다 (아주 천천히만 줄어듦).", "ok");
      else if (state === 2) cstOut(out, "⚠️ <b>임의 중단</b> → 남아 있던 cccDNA에서 다시 복제 → HBV DNA rebound → 면역 공격 → <b>간염 악화(flare)</b>. 간경변 환자에서는 간부전으로 이어질 수 있습니다.", "bad");
      else cstOut(out, "치료 전 — cccDNA를 주형으로 바이러스가 계속 만들어집니다.");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "stop" && state !== 1) { cstOut(cstEl(root, "out"), "먼저 약을 복용해 보세요."); return; }
        state = a === "drug" ? 1 : a === "stop" ? 2 : 0;
        render();
      });
    });
    render();
  }

  /* ---------- Viz 9 · HBV Reactivation ---------- */
  function initHepReact() {
    var root = document.querySelector("[data-hepreact]");
    if (!root) return;
    var stage = 0, prophy = false;
    var NO = [
      [5, 50, 8, "ok", "<b>과거 감염 · 조절됨</b> — 면역이 HBV를 cccDNA 상태로 눌러두고 있습니다. HBV DNA 미검출, 간수치 정상."],
      [90, 10, 20, "mid", "<b>면역억제 치료 중</b> — 감시가 풀려 HBV 복제 ↑↑. 면역이 약해 아직 간 손상은 크지 않을 수 있습니다 — 폭풍 전야."],
      [70, 95, 95, "bad", "<b>면역 회복</b> → 늘어난 감염 간세포를 한꺼번에 공격 → <b>심한 간염(flare)</b>, 간부전 가능. 항암 일정이 중단되기도 합니다."]
    ];
    var YES = [
      [5, 50, 8, "ok", "<b>과거 감염 · 조절됨</b> — 면역억제 치료 시작과 함께 예방적 항바이러스제를 시작합니다."],
      [8, 10, 10, "ok", "🛡️ 예방적 항바이러스제가 복제를 막아 <b>HBV DNA가 낮게 유지</b>됩니다."],
      [10, 70, 15, "ok", "🛡️ 면역이 돌아와도 <b>공격할 바이러스가 적어 flare가 없습니다</b>. 예방 투여는 면역억제 종료 후에도 일정 기간(흔히 6–12개월, rituximab은 더 길게) 유지합니다."]
    ];
    function render() {
      var d = (prophy ? YES : NO)[stage];
      root.querySelectorAll("[data-stage]").forEach(function (x) { x.classList.toggle("on", +x.getAttribute("data-stage") === stage); });
      cstEl(root, "dna").style.width = d[0] + "%";
      cstEl(root, "imm").style.width = d[1] + "%";
      cstEl(root, "alt").style.width = d[2] + "%";
      cstOut(cstEl(root, "out"), d[4], d[3]);
    }
    root.querySelectorAll("[data-stage]").forEach(function (b) {
      b.addEventListener("click", function () { stage = +b.getAttribute("data-stage"); render(); });
    });
    var pb = root.querySelector("[data-prophy]");
    pb.addEventListener("click", function () { prophy = !prophy; pb.classList.toggle("on", prophy); render(); });
    render();
  }

  /* ---------- Viz 10 · HCV Testing ---------- */
  function initHepHcv() {
    var root = document.querySelector("[data-hephcv]");
    if (!root) return;
    var NODES = {
      ab: { q: "<b>Anti-HCV</b> 결과는?", opts: [["음성", "neg"], ["양성", "rna"]] },
      neg: { end: "✅ <b>대개 감염 없음</b>. 단, 최근 6개월 안의 노출이 의심되거나 면역저하자라면 항체가 생기기 전일 수 있어 HCV RNA를 확인하기도 합니다.", tone: "ok" },
      rna: { q: "Anti-HCV 양성 → <b>HCV RNA</b>는?", opts: [["음성", "cleared"], ["양성", "active"]] },
      cleared: { end: "<b>과거 감염</b> — 자연 회복 또는 치료로 완치된 상태. anti-HCV는 평생 양성으로 남을 수 있지만 면역은 아니어서 <b>재감염이 가능</b>합니다.", tone: "mid" },
      active: { end: "🔥 <b>현재 활동성 HCV 감염</b> → 섬유화 평가 · HBV 동시감염 확인 · 약물상호작용 검토 → <b>DAA로 완치</b> 목표.", tone: "bad" }
    };
    var trail = [];
    function render(key) {
      var n = NODES[key], opts = cstEl(root, "opts");
      cstEl(root, "trail").innerHTML = trail.map(function (t) { return "<span>" + t + "</span>"; }).join("");
      opts.innerHTML = "";
      if (n.end) cstOut(cstEl(root, "q"), n.end, n.tone);
      else {
        cstOut(cstEl(root, "q"), n.q);
        n.opts.forEach(function (o) {
          var b = document.createElement("button");
          b.className = "cst__chip";
          b.textContent = o[0];
          b.addEventListener("click", function () { trail.push((key === "ab" ? "anti-HCV " : "HCV RNA ") + o[0]); render(o[1]); });
          opts.appendChild(b);
        });
      }
      if (trail.length) {
        var r = document.createElement("button");
        r.className = "btn btn--ghost";
        r.textContent = "↺ 처음부터";
        r.addEventListener("click", function () { trail = []; render("ab"); });
        opts.appendChild(r);
      }
    }
    render("ab");
  }

  /* ---------- Viz 11 · HCV Drug Targets ---------- */
  function initHepDaa() {
    var root = document.querySelector("[data-hepdaa]");
    if (!root) return;
    var D = {
      glecaprevir: { t: "ns3", msg: "<b>Glecaprevir</b> — <b>-previr</b> = NS3/4A <b>protease</b> inhibitor. Polyprotein을 자르지 못하게 합니다." },
      pibrentasvir: { t: "ns5a", msg: "<b>Pibrentasvir</b> — <b>-asvir</b> = <b>NS5A</b> inhibitor. 복제 복합체와 바이러스 조립을 막습니다." },
      sofosbuvir: { t: "ns5b", msg: "<b>Sofosbuvir</b> — <b>-buvir</b> = <b>NS5B polymerase</b> inhibitor (nucleotide analogue). 내성장벽이 높습니다. Amiodarone 병용 시 심한 서맥 주의." },
      velpatasvir: { t: "ns5a", msg: "<b>Velpatasvir</b> — <b>-asvir</b> = <b>NS5A</b> inhibitor. 위산이 있어야 잘 녹아 PPI·H2RA 병용에 주의합니다." },
      ledipasvir: { t: "ns5a", msg: "<b>Ledipasvir</b> — <b>-asvir</b> = <b>NS5A</b> inhibitor. 역시 위산억제제와 상호작용." }
    };
    var COMBO = {
      "glecaprevir+pibrentasvir": "<b>Glecaprevir / pibrentasvir</b> — protease + NS5A. Pan-genotypic, 치료경험 없는 환자 다수에서 <b>8주</b>. 음식과 함께 복용.",
      "sofosbuvir+velpatasvir": "<b>Sofosbuvir / velpatasvir</b> — polymerase + NS5A. Pan-genotypic, 대개 <b>12주</b>.",
      "ledipasvir+sofosbuvir": "<b>Ledipasvir / sofosbuvir</b> — polymerase + NS5A. 주로 일부 genotype에서 쓰였던 조합입니다."
    };
    var on = {};
    root.querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-drug");
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        var sel = Object.keys(D).filter(function (x) { return on[x]; });
        var targets = {};
        sel.forEach(function (x) { targets[D[x].t] = 1; });
        root.querySelectorAll("[data-t]").forEach(function (s) { s.classList.toggle("on", !!targets[s.getAttribute("data-t")]); });
        var key = sel.slice().sort().join("+");
        var nT = Object.keys(targets).length, msg;
        if (!sel.length) msg = "약을 탭하세요. 여러 개를 켜면 조합이 됩니다.";
        else if (COMBO[key]) msg = "✅ " + COMBO[key];
        else if (sel.length >= 2 && nT === 1) msg = "같은 표적(NS5A)의 약 두 개 — 실제로는 이렇게 조합하지 않습니다. <b>서로 다른 표적</b>을 묶어야 내성을 막습니다.";
        else if (sel.length >= 2) msg = "서로 다른 표적 " + nT + "개를 막는 조합입니다. 실제 regimen은 정해진 고정용량 복합제를 씁니다.";
        else msg = D[k] && on[k] ? D[k].msg : D[sel[0]].msg;
        cstOut(cstEl(root, "out"), msg, COMBO[key] ? "ok" : "");
      });
    });
  }

  /* ---------- Viz 12 · Hepatitis ABC Cards ---------- */
  function initHepAbc() {
    var root = document.querySelector("[data-hepabc]");
    if (!root) return;
    var F = {
      route: ["🍽️ <b>Fecal-oral</b><br>오염된 음식 · 물", "🩸 <b>혈액 · 체액</b><br>성접촉 · 출산", "💉 <b>주로 혈액</b><br>주사기 공유 · 과거 수혈"],
      chronic: ["❌ <b>만성화 없음</b><br>급성만", "⚠️ <b>가능</b><br>신생아 ~90% · 성인 &lt;5%", "⚠️ <b>흔함</b><br>절반 이상"],
      vaccine: ["✅ <b>있음</b><br>2회 접종", "✅ <b>있음</b><br>3회 · 출생 시 시작", "❌ <b>없음</b>"],
      tx: ["<b>Supportive</b><br>회복 후 평생 면역", "<b>장기 억제</b><br>TAF·TDF·ETV·BSV", "<b>완치</b><br>DAA 8–12주"],
      hcc: ["해당 없음", "<b>가능</b><br>간경변 없이도 HCC", "<b>만성 감염에서 가능</b><br>간경변이면 완치 후에도 감시"]
    };
    function show(k) {
      root.querySelectorAll("[data-f]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-f") === k); });
      ["a", "b", "c"].forEach(function (key, i) { cstEl(root, key).innerHTML = F[k][i]; });
    }
    root.querySelectorAll("[data-f]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-f")); });
    });
    show("route");
  }

  /* ---------- Viz 13 · Liver Lab Decoder ---------- */
  function initHepLab() {
    var root = document.querySelector("[data-heplab]");
    if (!root) return;
    var BIN = { inj: "INJURY", chol: "CHOLESTASIS", func: "FUNCTION" };
    var keys = Object.keys(BIN);
    var cards = root.querySelectorAll(".hep__lab");
    var done = 0, right = 0;
    cards.forEach(function (card) {
      var ans = card.getAttribute("data-ans").split(" ");
      var box = document.createElement("div");
      box.className = "hep__bins";
      var fb = document.createElement("div");
      fb.className = "hep__fb";
      keys.forEach(function (k) {
        var b = document.createElement("button");
        b.className = "hep__bin";
        b.textContent = BIN[k];
        b.addEventListener("click", function () {
          if (card.getAttribute("data-done")) return;
          card.setAttribute("data-done", "1");
          var ok = ans.indexOf(k) >= 0;
          done++; if (ok) right++;
          box.querySelectorAll(".hep__bin").forEach(function (x, i) { if (ans.indexOf(keys[i]) >= 0) x.classList.add("is-right"); });
          if (!ok) b.classList.add("is-wrong");
          card.classList.add(ok ? "is-right" : "is-wrong");
          fb.innerHTML = (ok ? "✅ " : "❌ ") + card.getAttribute("data-why");
          cstOut(cstEl(root, "out"), done + " / " + cards.length + " · 정답 " + right + "개" + (done === cards.length ? " — 손상 · 담즙정체 · 기능을 따로 읽는 습관이 핵심입니다." : ""), done === cards.length ? (right === cards.length ? "ok" : "mid") : "");
        });
        box.appendChild(b);
      });
      card.appendChild(box);
      card.appendChild(fb);
    });
  }

  /* ---------- Viz 14 · Viral Hepatitis Detective ---------- */
  function initHepDetective() {
    var root = document.querySelector("[data-hepdetective]");
    if (!root) return;
    var PT = {
      a: { dx: "hav", tx: "support", why: "IgM anti-HAV + → <b>급성 A형간염</b>. 만성화하지 않으며 supportive care로 회복합니다." },
      b: { dx: "hbv", tx: "suppress", why: "HBsAg가 수년간 지속 → <b>만성 B형간염</b>. HBV DNA · ALT · 섬유화 · 나이를 평가해 적응이 되면 장기 억제 치료." },
      c: { dx: "hcv", tx: "cure", why: "HCV RNA + → <b>활동성 C형간염</b>. DAA 8–12주로 완치를 목표로 합니다." }
    };
    var cur = null, pick = {};
    function evaluate() {
      var out = cstEl(root, "out");
      if (!pick.dx || !pick.tx) { cstOut(out, "진단과 치료 전략을 모두 선택하세요."); return; }
      var d = PT[cur], okD = pick.dx === d.dx, okT = pick.tx === d.tx;
      if (okD && okT) cstOut(out, "✅ <b>정확합니다.</b> " + d.why, "ok");
      else cstOut(out, "❌ " + (okD ? "진단은 맞지만 치료 전략이 어긋났습니다." : okT ? "치료 전략은 맞지만 진단을 다시 보세요." : "진단과 치료 전략 모두 다시 생각해 보세요.") + "<br>" + d.why, "bad");
    }
    root.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-pt]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        cur = b.getAttribute("data-pt");
        pick = {};
        root.querySelectorAll("[data-group] .cst__chip").forEach(function (x) { x.classList.remove("on"); });
        cstEl(root, "steps").style.display = "block";
        cstOut(cstEl(root, "out"), "진단과 치료 전략을 모두 선택하세요.");
      });
    });
    root.querySelectorAll("[data-group]").forEach(function (g) {
      g.querySelectorAll(".cst__chip").forEach(function (b) {
        b.addEventListener("click", function () {
          g.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          pick[g.getAttribute("data-group")] = b.getAttribute("data-v");
          evaluate();
        });
      });
    });
  }

  /* =====================================================================
     Core 17 · 담석증  (cst__ 공용 UI 재사용 + gbs__ 전용)
     ===================================================================== */

  /* ---------- Viz 1 · Bile Journey ---------- */
  function initGbsJourney() {
    var root = document.querySelector("[data-gbsjourney]");
    if (!root) return;
    var MODE = {
      fast: { gb: 85, flow: 10, tone: "", msg: "<b>공복</b> — Oddi 괄약근이 닫혀 있어, 간에서 내려온 담즙이 담낭으로 들어가 <b>저장·농축</b>됩니다 (수 배 농축)." },
      meal: { gb: 25, flow: 90, tone: "ok", msg: "<b>지방식</b> → 십이지장에서 <b>CCK ↑</b> → 담낭 수축 + Oddi 이완 → 농축된 담즙이 십이지장으로 쏟아져 지방을 유화합니다." },
      none: { gb: 0, flow: 55, tone: "mid", msg: "<b>담낭절제 후</b> — 저장 탱크가 없어 담즙이 간에서 장으로 <b>조금씩 계속</b> 흐릅니다. 담즙 생성은 그대로이므로 지방 소화는 유지됩니다." }
    };
    var anat = cstEl(root, "anat");
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-mode")); });
    });
    function show(k) {
      var d = MODE[k];
      root.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-mode") === k); });
      anat.className = "gbs__anat j-" + k;
      cstEl(root, "gbvol").style.width = d.gb + "%";
      cstEl(root, "flow").style.width = d.flow + "%";
      cstOut(cstEl(root, "out"), d.msg, d.tone);
    }
    show("fast");
  }

  /* ---------- Viz 2 · Cholesterol Stone Builder ---------- */
  function initGbsBuilder() {
    var root = document.querySelector("[data-gbsbuilder]");
    if (!root) return;
    var LBL = ["매우 낮음", "낮음", "보통", "높음", "매우 높음"];
    var GRAINS = [[], [[3, 8]], [[5, 10], [8, 4]], [[12, 6]], [[22, 3], [14, 3]]];
    var MSG = [
      { tone: "ok", msg: "<b>맑은 담즙</b> — bile salt·phospholipid micelle이 cholesterol을 충분히 녹이고 있습니다. 과포화가 없으면 다른 조건이 나빠도 cholesterol stone은 잘 생기지 않습니다." },
      { tone: "mid", msg: "<b>Cholesterol crystal</b> — 과포화된 담즙에서 미세 결정이 생기기 시작했습니다. 아직 돌은 아닙니다." },
      { tone: "mid", msg: "<b>Sludge · 작은 돌</b> — 결정이 점액과 뭉쳐 sludge가 되고 작은 돌로 자랍니다. 담낭이 잘 비워지지 않을수록 빨라집니다." },
      { tone: "bad", msg: "<b>Small stones</b> — 여러 개의 작은 돌. 작은 돌은 담낭관·총담관으로 <b>이동하기 쉬워</b> 오히려 합병증과 연결되기 쉽습니다." },
      { tone: "bad", msg: "<b>Large · multiple stones</b> — 세 조건이 모두 겹쳐 돌이 크고 많아졌습니다." }
    ];
    var v = { chol: 1, stasis: 1, nucl: 1 };
    function update() {
      Object.keys(v).forEach(function (k) { cstEl(root, "v-" + k).textContent = LBL[v[k]]; });
      var stage;
      if (v.chol <= 1) stage = 0;
      else {
        var s = v.chol + v.stasis + v.nucl;
        stage = s <= 5 ? 1 : s <= 8 ? 2 : s <= 10 ? 3 : 4;
      }
      var jar = cstEl(root, "jar");
      jar.innerHTML = "";
      GRAINS[stage].forEach(function (g) {
        for (var i = 0; i < g[1]; i++) {
          var e = document.createElement("i");
          e.style.width = e.style.height = g[0] + "px";
          jar.appendChild(e);
        }
      });
      cstOut(cstEl(root, "out"), MSG[stage].msg, MSG[stage].tone);
    }
    root.querySelectorAll("input[data-k]").forEach(function (r) {
      r.addEventListener("input", function () { v[r.getAttribute("data-k")] = +r.value; update(); });
    });
    update();
  }

  /* ---------- Viz 3 · Gallstone Risk Map ---------- */
  function initGbsRisk() {
    var root = document.querySelector("[data-gbsrisk]");
    if (!root) return;
    var R = {
      obesity: { t: ["chol"], msg: "<b>비만</b> — 간의 cholesterol 분비 ↑ → 담즙 과포화." },
      rapid: { t: ["chol"], msg: "<b>급격한 체중감량</b> — 지방조직의 cholesterol 동원 ↑ + 담낭 배출 ↓. 비만대사수술·초저열량식에서 특히 중요합니다." },
      preg: { t: ["chol"], msg: "<b>임신</b> — estrogen(cholesterol 분비 ↑) + progesterone(담낭 운동 ↓)이 겹칩니다." },
      estrogen: { t: ["chol"], msg: "<b>Estrogen · 경구피임약 · 호르몬요법</b> — 담즙 cholesterol 분비 ↑. 여성에서 담석이 더 흔한 이유 중 하나입니다." },
      age: { t: ["chol", "pig"], msg: "<b>고령</b> — 담즙 cholesterol 포화도 ↑, black pigment stone 위험도 함께 증가합니다." },
      gene: { t: ["chol"], msg: "<b>가족력 · 유전</b> — 담즙 cholesterol transporter 등의 유전적 차이가 영향을 줍니다." },
      dm: { t: ["chol"], msg: "<b>당뇨 · 대사질환</b> — insulin resistance, 담낭 운동 저하와 연관됩니다 (Core 05 대사증후군과 연결)." },
      hemolysis: { t: ["pig"], msg: "<b>만성 용혈</b> — bilirubin 생성 ↑ → calcium bilirubinate 침전 → <b>black pigment stone</b>." },
      cirrhosis: { t: ["pig"], msg: "<b>간경변</b> — black pigment stone 위험 ↑." },
      infect: { t: ["pig"], msg: "<b>담도 감염 · 정체</b> — 세균 효소가 bilirubin 포합을 풀어 침전 → <b>brown pigment stone</b> (주로 담관 안)." },
      ceftriaxone: { t: ["sludge"], msg: "<b>Ceftriaxone</b> — 담즙으로 많이 배설되며 calcium과 결합해 침전 → biliary sludge · <b>pseudolithiasis</b>. 소아·고용량에서 잘 보이며 대개 중단 후 사라집니다." },
      octreotide: { t: ["chol", "sludge"], msg: "<b>Octreotide</b> — CCK 분비와 담낭 수축 억제 → 정체 → sludge·담석. 장기 사용 시 주의합니다." },
      fibrate: { t: ["chol"], msg: "<b>Fibrate</b> — 담즙 cholesterol 분비 ↑ → 과포화. 허가사항에 담석 관련 주의가 있습니다." },
      glp1: { t: ["chol"], msg: "<b>GLP-1 RA</b> — 담석증·담낭염 등 담낭 관련 이상반응이 보고됩니다. 빠른 체중감량과 담낭 운동 변화가 관여하는 것으로 생각됩니다." }
    };
    var on = {};
    root.querySelectorAll("[data-r]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-r");
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        var hit = {};
        Object.keys(on).forEach(function (x) { if (on[x]) R[x].t.forEach(function (t) { hit[t] = 1; }); });
        root.querySelectorAll("[data-target]").forEach(function (box) {
          box.classList.toggle("on", !!hit[box.getAttribute("data-target")]);
        });
        var n = Object.keys(on).filter(function (x) { return on[x]; }).length;
        cstOut(cstEl(root, "out"), on[k] ? R[k].msg : (n ? "선택된 위험인자 " + n + "개." : "위험인자를 탭하면 기전이 나타납니다."));
      });
    });
  }

  /* ---------- Viz 4 · Biliary Colic Simulator ---------- */
  function initGbsColic() {
    var root = document.querySelector("[data-gbscolic]");
    if (!root) return;
    var stage = 0; /* 0 조용 · 1 막힘 · 2 빠짐 */
    function render() {
      cstEl(root, "s-gb").textContent = stage === 1 ? "" : "🪨";
      cstEl(root, "s-cystic").textContent = stage === 1 ? "🪨" : "";
      root.querySelector("[data-slot='cystic']").classList.toggle("is-block", stage === 1);
      cstEl(root, "press").style.width = (stage === 1 ? 88 : 10) + "%";
      cstEl(root, "pain").style.width = (stage === 1 ? 85 : 0) + "%";
      var out = cstEl(root, "out");
      if (stage === 1) cstOut(out, "🥓 → <b>CCK ↑ → 담낭 수축</b> → 돌이 담낭관 입구를 막음 → 담낭 압력 ↑ → <b>RUQ 통증 · 어깨 방사 · 오심</b>.", "bad");
      else if (stage === 2) cstOut(out, "⏳ 돌이 다시 담낭 쪽으로 빠짐 → 압력 ↓ → <b>통증 소실</b>. 염증이 자리 잡기 전에 끝났으므로 열도 없습니다 = <b>담도산통</b>.", "ok");
      else cstOut(out, "담낭 안에 돌이 조용히 있습니다. 지방식을 먹어보세요.");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "meal") stage = 1;
        else if (a === "later") { if (stage !== 1) { cstOut(cstEl(root, "out"), "아직 돌이 막지 않았습니다. 먼저 지방식을 먹어보세요."); return; } stage = 2; }
        else stage = 0;
        render();
      });
    });
  }

  /* ---------- Viz 5 · Colic vs Cholecystitis (time) ---------- */
  function initGbsTime() {
    var root = document.querySelector("[data-gbstime]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var path = "a";
    function badge(key, txt, bad) {
      var el = cstEl(root, key);
      el.querySelector("b").textContent = txt;
      el.classList.toggle("is-on", !!bad);
    }
    function update() {
      var t = +range.value, press, inflam, msg, tone;
      cstEl(root, "t").textContent = t + (t >= 24 ? "시간+" : "시간");
      var moved = path === "a" && t >= 2;
      if (moved) {
        press = 10; inflam = 5;
        badge("b-pain", "소실", false); badge("b-fever", "없음", false); badge("b-murphy", "없음", false);
        msg = "돌이 빠졌습니다 → 압력 ↓ → <b>통증 소실</b>. 염증이 자리 잡기 전에 끝났습니다 = <b>담도산통</b>."; tone = "ok";
      } else {
        press = Math.min(95, 85 + t / 2); inflam = Math.min(95, t * 7);
        badge("b-pain", t < 2 ? "심함" : "지속", true);
        badge("b-fever", t >= 6 ? "있음" : "없음", t >= 6);
        badge("b-murphy", t >= 6 ? "양성" : "약함", t >= 6);
        if (t < 2) { msg = "0–2시간 — 돌이 담낭관을 막고 압력이 오릅니다. <b>이 시점에서는 산통과 담낭염을 구별할 수 없습니다.</b>"; tone = "mid"; }
        else if (t < 6) { msg = "돌이 그대로 — 담낭이 팽창하고 벽에 <b>허혈·화학적 염증</b>이 시작됩니다. 통증이 수 시간째 가라앉지 않는 것이 첫 경고입니다."; tone = "mid"; }
        else if (t < 24) { msg = "<b>염증 확립 = 급성 담낭염</b> — 발열 · 압통 · Murphy 양성 · 백혈구/CRP ↑. 이차 세균감염이 동반될 수 있습니다."; tone = "bad"; }
        else { msg = "치료 없이 지속되면 <b>괴저 · 천공 · 농양 · sepsis</b> 위험."; tone = "bad"; }
      }
      cstEl(root, "press").style.width = press + "%";
      cstEl(root, "inflam").style.width = inflam + "%";
      cstOut(cstEl(root, "out"), msg, tone);
    }
    range.addEventListener("input", update);
    root.querySelectorAll("[data-path]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-path]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        path = b.getAttribute("data-path");
        update();
      });
    });
    update();
  }

  /* ---------- Viz 6 · Stone Location Map ---------- */
  function initGbsMap() {
    var root = document.querySelector("[data-gbsmap]");
    if (!root) return;
    var LOC = {
      gb: { x: 200, y: 150, tone: "ok", name: "무증상 담낭결석 (cholelithiasis)", sym: "없음 — 평생 증상이 없을 수도 있음", lab: "초음파에서 우연히 발견 · 혈액검사 정상", tx: "대개 <b>관찰</b>" },
      colic: { x: 156, y: 137, tone: "mid", name: "담도산통 (biliary colic)", sym: "식후 RUQ 통증 수십 분–수 시간 → 저절로 호전 · 열 없음", lab: "대개 정상", tx: "진통(NSAID) → <b>담낭절제술</b> 고려" },
      chole: { x: 156, y: 137, tone: "bad", name: "급성 담낭염 (acute cholecystitis)", sym: "지속 RUQ 통증 · 발열 · Murphy 양성", lab: "백혈구·CRP ↑ · 초음파 벽 비후 · bilirubin은 대개 정상", tx: "수액·진통 ± 항생제 → <b>조기 담낭절제술</b>" },
      cbd: { x: 117, y: 178, tone: "mid", name: "총담관결석 (choledocholithiasis)", sym: "통증 ± <b>황달</b> · 진한 소변 · 회색변 · 가려움", lab: "Bilirubin · ALP · GGT ↑ · CBD 확장", tx: "<b>ERCP</b>로 CBD 돌 제거 → 담낭절제술" },
      cholang: { x: 117, y: 178, tone: "bad", name: "급성 담관염 (acute cholangitis)", sym: "발열 + 황달 + RUQ 통증 (± 저혈압 · 의식 변화)", lab: "염증수치 ↑ + 담즙정체 + 담관 확장", tx: "수액 + 항생제 + <b>긴급 담도 배액</b>" },
      panc: { x: 106, y: 221, tone: "bad", name: "담석성 췌장염 (gallstone pancreatitis)", sym: "등으로 뻗는 심한 명치 통증 · 구토", lab: "<b>Lipase ↑</b> (정상 상한 3배 이상)", tx: "췌장염 치료 · 담관염 동반 시 ERCP · 재발 예방 담낭절제술" }
    };
    var anat = cstEl(root, "anat"), stone = cstEl(root, "stone");
    function show(k) {
      var d = LOC[k];
      root.querySelectorAll("[data-loc]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-loc") === k); });
      anat.className = "gbs__anat st-" + k;
      stone.style.transform = "translate(" + d.x + "px," + d.y + "px)";
      cstEl(root, "sym").innerHTML = d.sym;
      cstEl(root, "lab").innerHTML = d.lab;
      cstEl(root, "tx").innerHTML = d.tx;
      cstOut(cstEl(root, "out"), "<b>" + d.name + "</b>", d.tone);
    }
    root.querySelectorAll("[data-loc]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-loc")); });
    });
    show("gb");
  }

  /* ---------- Viz 7 · Cholangitis Sepsis Path ---------- */
  function initGbsCholang() {
    var root = document.querySelector("[data-gbscholang]");
    if (!root) return;
    var on = { abx: false, drain: false };
    var S = {
      none: [90, 90, 85, "bad", "치료 전 — 막힌 담관 안에서 세균이 자라고, 높은 압력이 세균을 혈액 쪽으로 밀어냅니다. 치료를 하나씩 켜보세요."],
      abx: [90, 55, 60, "mid", "<b>항생제만</b> — 세균량은 줄지만 <b>폐쇄가 그대로</b>입니다. 담관 압력이 높아 세균이 계속 혈액으로 밀려나고, 막힌 담관 안에는 약도 충분히 들어가기 어렵습니다. 부분 호전 · 재악화 위험."],
      drain: [15, 50, 40, "mid", "<b>배액만</b> — 폐쇄가 풀려 압력 ↓ · 감염원 배출(source control). 하지만 이미 혈액으로 퍼진 세균에는 항생제가 필요합니다."],
      both: [10, 12, 10, "ok", "✅ <b>항생제 + 담도 배액</b> — 감염 치료와 source control이 함께. 여기에 수액 소생을 더한 것이 담관염 치료의 기본 구조입니다."]
    };
    function update() {
      var k = on.abx && on.drain ? "both" : on.abx ? "abx" : on.drain ? "drain" : "none";
      var d = S[k];
      cstEl(root, "press").style.width = d[0] + "%";
      cstEl(root, "bact").style.width = d[1] + "%";
      cstEl(root, "sepsis").style.width = d[2] + "%";
      cstOut(cstEl(root, "out"), d[4], d[3]);
    }
    root.querySelectorAll("[data-tx]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-tx");
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        update();
      });
    });
  }

  /* ---------- Viz 8 · Imaging Strategy ---------- */
  function initGbsImaging() {
    var root = document.querySelector("[data-gbsimaging]");
    if (!root) return;
    var IMG = {
      us: [5, 35, 0, "<b>Ultrasound</b> — <i>\"담석이 있나? CBD가 늘어났나?\"</i> 담낭결석·담낭염에 민감하고 방사선이 없으며 저렴합니다. 하지만 CBD 하부의 작은 돌은 장 가스에 가려 놓치기 쉽습니다."],
      mrcp: [10, 85, 0, "<b>MRCP</b> — <i>\"CBD에 정말 돌이 있나?\"</i> MRI로 담관을 비침습적으로 그립니다. 확인은 하지만 치료는 못 합니다."],
      eus: [40, 92, 0, "<b>EUS</b> — 내시경을 십이지장에 두고 바로 옆 담관을 초음파로 봅니다. 작은 CBD 돌에 매우 민감합니다. 진정이 필요하지만 ERCP보다 합병증이 적습니다."],
      ercp: [85, 95, 100, "<b>ERCP</b> — <i>\"돌을 빼자.\"</i> 괄약근 절개 · 돌 제거 · 스텐트까지 하는 <b>치료 시술</b>입니다. 합병증 때문에 진단만을 위해서는 쓰지 않습니다."]
    };
    function show(k) {
      var d = IMG[k];
      root.querySelectorAll("[data-img]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-img") === k); });
      cstEl(root, "inv").style.width = d[0] + "%";
      cstEl(root, "dx").style.width = d[1] + "%";
      cstEl(root, "tx").style.width = d[2] + "%";
      cstOut(cstEl(root, "out"), d[3]);
    }
    root.querySelectorAll("[data-img]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-img")); });
    });
    show("us");
  }

  /* ---------- Viz 9 · ERCP vs Cholecystectomy ---------- */
  function initGbsErcp() {
    var root = document.querySelector("[data-gbsercp]");
    if (!root) return;
    var st = { gb: "stones", cbd: "stone" };
    var GB = { stones: "🪨🪨 돌 여러 개", emptied: "돌 꺼냄 · 담낭은 남음", removed: "✂️ 제거됨" };
    function render() {
      var gbEl = cstEl(root, "gb"), cbdEl = cstEl(root, "cbd");
      gbEl.querySelector("b").textContent = GB[st.gb];
      cbdEl.querySelector("b").textContent = st.cbd === "stone" ? "🪨 돌 · 황달" : "✅ 깨끗함";
      gbEl.className = st.gb === "removed" ? "is-ok" : st.gb === "emptied" ? "is-mid" : "is-bad";
      cbdEl.className = st.cbd === "stone" ? "is-bad" : "is-ok";
      cstEl(root, "flow").textContent = st.cbd === "stone" ? "막힘" : "흐름 ✅";
      var out = cstEl(root, "out");
      if (st.gb === "removed" && st.cbd === "clear") cstOut(out, "✅ <b>CBD 정리 + 담낭절제</b> — 막힌 관을 열고 돌의 공급원을 없앴습니다. 담즙은 간 → 총담관 → 장으로 계속 흐릅니다.", "ok");
      else if (st.gb === "removed") cstOut(out, "담낭은 제거했지만 <b>총담관 돌은 그대로</b> → 황달·담관염 위험. CBD 정리(수술 전후 ERCP 또는 수술 중 담관 탐색)가 필요합니다.", "bad");
      else if (st.gb === "emptied") cstOut(out, "담낭에서 돌만 꺼냈습니다. 하지만 <b>과포화 담즙 + 정체라는 '돌 공장'은 그대로</b> → 새 돌이 다시 생깁니다. 그래서 표준은 담낭 자체를 제거합니다." + (st.cbd === "stone" ? " 게다가 총담관 돌은 아직 남아 있습니다." : ""), "mid");
      else if (st.cbd === "clear") cstOut(out, "ERCP로 <b>지금 막힌 총담관</b>은 열렸습니다 — 황달 해소. 하지만 담낭에 남은 돌이 다시 CBD로 내려올 수 있습니다 → 적절한 시점에 <b>담낭절제술</b>.", "mid");
      else cstOut(out, "치료를 순서대로 선택해 보세요.");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "reset") { st = { gb: "stones", cbd: "stone" }; root.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); }); }
        else {
          if (a === "ercp") st.cbd = "clear";
          if (a === "stoneonly" && st.gb !== "removed") st.gb = "emptied";
          if (a === "chole") st.gb = "removed";
          b.classList.add("on");
        }
        render();
      });
    });
    render();
  }

  /* ---------- Viz 10 · Where Is the Stone? ---------- */
  function initGbsWhere() {
    var root = document.querySelector("[data-gbswhere]");
    if (!root) return;
    var OPT = { gb: "담낭 안", colic: "담낭관 · 잠깐", chole: "담낭관 · 계속", cbd: "총담관", cholang: "총담관 + 감염", panc: "팽대부" };
    var keys = Object.keys(OPT);
    var qs = root.querySelectorAll(".gbs__q");
    var done = 0, right = 0;
    qs.forEach(function (q) {
      var box = document.createElement("div");
      box.className = "gbs__opts";
      var fb = document.createElement("div");
      fb.className = "gbs__fb";
      keys.forEach(function (k) {
        var b = document.createElement("button");
        b.className = "gbs__opt";
        b.textContent = OPT[k];
        b.addEventListener("click", function () {
          if (q.getAttribute("data-done")) return;
          q.setAttribute("data-done", "1");
          var ans = q.getAttribute("data-ans"), ok = k === ans;
          done++; if (ok) right++;
          box.querySelectorAll(".gbs__opt").forEach(function (x, i) { if (keys[i] === ans) x.classList.add("is-right"); });
          if (!ok) b.classList.add("is-wrong");
          q.classList.add(ok ? "is-right" : "is-wrong");
          fb.innerHTML = (ok ? "✅ " : "❌ 정답은 " + OPT[ans] + " — ") + q.getAttribute("data-why");
          cstOut(cstEl(root, "out"), done + " / " + qs.length + " · 정답 " + right + "개" + (done === qs.length ? " — 돌의 위치가 곧 진단입니다." : ""), done === qs.length ? (right === qs.length ? "ok" : "mid") : "");
        });
        box.appendChild(b);
      });
      q.appendChild(box);
      q.appendChild(fb);
    });
  }

  /* =====================================================================
     Core 16 · 설사  (cst__ 공용 UI 재사용 + dia__ 전용)
     ===================================================================== */

  /* ---------- Viz 1 · Intestinal Water Balance ---------- */
  function initDiaWater() {
    var root = document.querySelector("[data-diawater]");
    if (!root) return;
    var MODE = {
      normal: { inL: 9, colon: 1.5, stool: 0.15, tone: "ok", msg: "<b>정상</b> — 소장이 대부분(약 7 L)을, 대장이 나머지 대부분을 흡수합니다. 대변에 남는 물은 0.1–0.2 L." },
      secretory: { inL: 12, colon: 6, stool: 2, tone: "bad", msg: "<b>소장 분비 ↑</b> (enterotoxin·cholera) — 소장이 물을 쏟아내 대장에 도달하는 양이 대장의 최대 흡수능(약 4–5 L)을 넘습니다. 남는 물이 그대로 설사가 됩니다." },
      colitis: { inL: 9, colon: 1.5, stool: 0.9, tone: "bad", msg: "<b>대장 흡수 ↓</b> (colitis) — 대장에 도달하는 양은 정상이지만, 손상된 점막이 물을 흡수하지 못합니다. 점액·혈액·삼출물도 함께 나옵니다." }
    };
    function fmt(v) { return (v < 1 ? v.toFixed(2).replace(/0$/, "") : v) + " L"; }
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var d = MODE[b.getAttribute("data-mode")];
        cstEl(root, "in").style.width = Math.min(100, d.inL / 12 * 100) + "%";
        cstEl(root, "colon").style.width = Math.min(100, d.colon / 12 * 100) + "%";
        cstEl(root, "stool").style.width = Math.max(2, d.stool / 12 * 100) + "%";
        cstEl(root, "v-in").textContent = fmt(d.inL);
        cstEl(root, "v-colon").textContent = fmt(d.colon);
        cstEl(root, "v-stool").textContent = fmt(d.stool);
        cstOut(cstEl(root, "out"), d.msg, d.tone);
      });
    });
  }

  /* ---------- Viz 2 · Osmotic vs Secretory (Fasting) ---------- */
  function initDiaOsmSec() {
    var root = document.querySelector("[data-diaosmsec]");
    if (!root) return;
    function drops(n) { return new Array(n + 1).join("💧"); }
    root.querySelectorAll("[data-fast]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-fast]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var fast = b.getAttribute("data-fast") === "1";
        cstEl(root, "osm-tok").textContent = fast ? "—" : "🍬🍬🍬🍬";
        cstEl(root, "osm-drop").textContent = fast ? "💧" : drops(6);
        cstEl(root, "sec-drop").textContent = drops(7);
        cstEl(root, "osm").classList.toggle("is-calm", fast);
        cstEl(root, "sec").classList.toggle("is-bad", fast);
        if (fast) cstOut(cstEl(root, "out"), "<b>Osmotic ↓↓↓</b> — 원인 물질이 들어오지 않으니 물을 끌어당길 osmole이 사라졌습니다.<br><b>Secretory → 지속</b> — 장세포의 Cl⁻ 분비는 음식과 무관하게 계속됩니다.", "mid");
        else cstOut(cstEl(root, "out"), "두 환자 모두 많은 물설사를 합니다. 금식 버튼을 눌러보세요.");
      });
    });
  }

  /* ---------- Viz 5 · Medication Diarrhea Checker ---------- */
  function initDiaMed() {
    var root = document.querySelector("[data-diamed]");
    if (!root) return;
    var MED = {
      metformin: { t: ["mot", "bio", "muc"], msg: "<b>Metformin</b> — 가장 흔한 약물성 설사 중 하나. 담즙산 재흡수 ↓, 장 serotonin 분비, microbiome 변화가 겹칩니다. 저용량 시작·식후 복용·서방형 전환으로 줄일 수 있습니다." },
      mg: { t: ["osm"], msg: "<b>Magnesium 제산제·하제</b> — 흡수되지 않는 Mg 염이 lumen에 남아 물을 붙잡는 전형적인 <b>osmotic</b> 설사." },
      lactulose: { t: ["osm", "bio"], msg: "<b>Lactulose</b> — 흡수되지 않는 당 + 대장 세균의 발효 → 삼투 입자·가스 ↑. 간성뇌증 치료에서는 이 설사 효과를 일부러 이용합니다." },
      abx: { t: ["bio"], msg: "<b>항생제</b> — microbiome 변화로 <b>antibiotic-associated diarrhea</b>. 심하거나 발열이 있으면 <b>C. difficile</b>을 생각합니다. (Erythromycin·amoxicillin-clavulanate는 장운동 자극 작용도 있음)" },
      ppi: { t: ["bio"], msg: "<b>PPI</b> — 위산 장벽 ↓ → 장내세균 변화. 일부 환자에서 설사, <b>CDI</b>·microscopic colitis와의 연관성이 보고됩니다." },
      colchicine: { t: ["muc"], msg: "<b>Colchicine</b> — microtubule 억제 → 빠르게 분열하는 장 상피세포에 독성. 설사가 대표적 부작용이며 <b>독성의 초기 신호</b>일 수 있습니다 (CYP3A4·P-gp 억제제 병용 주의)." },
      ssri: { t: ["mot"], msg: "<b>SSRI</b> — 장에는 몸의 serotonin 대부분이 있습니다. Serotonergic 작용으로 장운동 ↑ → 설사. 대개 초기에 흔하고 줄어듭니다." },
      glp1: { t: ["mot"], msg: "<b>GLP-1 RA</b> — 오심·구토·설사 또는 변비 등 위장관 부작용. 용량 증량 시기에 흔합니다." },
      chemo: { t: ["muc"], msg: "<b>항암제·면역항암제</b> — 점막 독성(irinotecan·5-FU 등), 또는 면역관문억제제에 의한 <b>immune-mediated colitis</b>. 중증일 수 있어 즉시 의료진에게 알립니다." }
    };
    var on = {};
    function update(last) {
      var hit = {};
      Object.keys(on).forEach(function (k) { if (on[k]) MED[k].t.forEach(function (t) { hit[t] = 1; }); });
      root.querySelectorAll("[data-target]").forEach(function (box) {
        box.classList.toggle("on", !!hit[box.getAttribute("data-target")]);
      });
      var total = Object.keys(on).filter(function (k) { return on[k]; }).length;
      var msg = last && on[last] ? MED[last].msg : (total ? "선택된 약 " + total + "개." : "약을 선택하면 기전 설명이 나타납니다.");
      cstOut(cstEl(root, "out"), msg);
    }
    root.querySelectorAll("[data-med]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-med");
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        update(k);
      });
    });
  }

  /* ---------- Viz 6 · Antibiotic → CDI ---------- */
  function initDiaCdi() {
    var root = document.querySelector("[data-diacdi]");
    if (!root) return;
    var N = 40, biome = cstEl(root, "biome"), wall = cstEl(root, "wall");
    var cells = [];
    for (var i = 0; i < N; i++) {
      var s = document.createElement("span");
      s.className = "dia__bug";
      biome.appendChild(s);
      cells.push(s);
    }
    var MSG = [
      "다양한 장내세균이 영양분과 자리를 차지하고 있어 C. difficile가 들어와도 자라지 못합니다 — <b>colonization resistance</b>.",
      "광범위 항생제가 정상 세균 대부분을 없앴습니다. 빈자리가 생겼습니다.",
      "항생제에 살아남은 <b>C. difficile 포자</b>가 발아해 빈자리를 차지합니다.",
      "C. difficile가 <b>toxin A/B</b>를 만들어 대장 점막을 손상 → colitis → 물설사·발열·복통. 심하면 toxic megacolon."
    ];
    var step = 0;
    function render() {
      cells.forEach(function (c, i) {
        var kind = "dia__bug dia__bug--" + (i % 4);
        if (step >= 1 && i % 5 !== 0) kind = "dia__bug dia__bug--gone";
        if (step >= 2 && i % 5 !== 0 && i % 3 !== 2) kind = "dia__bug dia__bug--cd";
        c.className = kind;
      });
      wall.classList.toggle("is-inflamed", step >= 3);
      wall.textContent = step >= 3 ? "대장 점막 — 염증 · 손상 (colitis)" : "대장 점막";
      root.querySelectorAll("[data-step]").forEach(function (el) {
        var n = +el.getAttribute("data-step");
        el.classList.toggle("on", n <= step);
        el.classList.toggle("cur", n === step);
      });
      cstOut(cstEl(root, "out"), MSG[step], step === 0 ? "ok" : step === 3 ? "bad" : "mid");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        step = b.getAttribute("data-act") === "reset" ? 0 : Math.min(3, step + 1);
        render();
      });
    });
    render();
    cstOut(cstEl(root, "out"), "버튼을 눌러 한 단계씩 따라가 보세요.");
  }

  /* ---------- Viz 7 · Dehydration Gauge ---------- */
  function initDiaDehyd() {
    var root = document.querySelector("[data-diadehyd]");
    if (!root) return;
    var range = root.querySelector("input[type=range]");
    var vulnBtn = root.querySelector("[data-vuln]");
    var intake = 1, vuln = false;
    var ZONE = [
      { urine: "정상", hr: "정상", bp: "정상", tone: "ok", msg: "✅ <b>Normal hydration</b> — 손실을 섭취가 따라잡고 있습니다. 평소처럼 마시고 먹습니다." },
      { urine: "감소 ↓", hr: "약간 ↑", bp: "대체로 유지", tone: "mid", msg: "⚠️ <b>Mild–moderate dehydration</b> — 갈증·입마름·소변 감소. <b>ORS를 조금씩 자주</b> 마시게 하고, 악화되면 진료를 권합니다." },
      { urine: "거의 없음", hr: "빈맥 ↑↑", bp: "기립성 저하 ↓", tone: "bad", msg: "🚨 <b>Severe dehydration</b> — 기립성 어지럼·의식 변화·소변 거의 없음. <b>즉시 의료기관</b> (정맥 수액이 필요할 수 있음)." }
    ];
    function update() {
      var n = +range.value;
      var net = n - [0, 3, 7][intake] + (vuln ? 3 : 0);
      var z = net <= 2 ? 0 : net <= 6 ? 1 : 2;
      var pct = Math.max(3, Math.min(97, (net + 2) / 14 * 100));
      cstEl(root, "n").textContent = n + "회";
      cstEl(root, "needle").style.left = pct + "%";
      cstEl(root, "urine").textContent = ZONE[z].urine;
      cstEl(root, "hr").textContent = ZONE[z].hr;
      cstEl(root, "bp").textContent = ZONE[z].bp;
      var msg = ZONE[z].msg;
      if (vuln && z > 0) msg += "<br>고위험군은 같은 설사 횟수에서도 더 빨리 위험해집니다.";
      cstOut(cstEl(root, "out"), msg, ZONE[z].tone);
    }
    range.addEventListener("input", update);
    root.querySelectorAll("[data-intake]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-intake]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        intake = +b.getAttribute("data-intake");
        update();
      });
    });
    vulnBtn.addEventListener("click", function () {
      vuln = !vuln;
      vulnBtn.classList.toggle("on", vuln);
      update();
    });
    update();
  }

  /* ---------- Viz 8 · Acute Diarrhea Triage ---------- */
  function initDiaTriage() {
    var root = document.querySelector("[data-diatriage]");
    if (!root) return;
    var NODES = {
      dehyd: { q: "급성 설사 환자입니다. <b>심한 탈수</b> 징후(의식 저하 · 소변 거의 없음 · 기립성 어지럼 · 계속 토해서 못 마심)가 있습니까?", opts: [["있다", "urgent"], ["없다", "inflam"]] },
      urgent: { end: "🚑 <b>즉시 의료기관</b> — 수액 보충과 원인 평가가 먼저입니다.", tone: "bad" },
      inflam: { q: "<b>혈변 · 고열 · 심한 복통/압통</b>이 있습니까?", opts: [["있다", "inflamEnd"], ["없다", "abx"]] },
      inflamEnd: { end: "🔥 <b>Inflammatory diarrhea 평가</b> — stool test를 위해 진료. Loperamide는 피하고 수분 보충은 계속합니다. 혈변이라고 경험적 항생제를 자동으로 쓰지도 않습니다 (STEC).", tone: "bad" },
      abx: { q: "<b>최근 항생제 사용 · 입원력</b> 후에 생긴 심한 설사입니까?", opts: [["그렇다", "cdi"], ["아니다", "host"]] },
      cdi: { end: "🧫 <b>C. difficile 평가</b> — 진료와 stool test가 필요합니다. 지사제로 증상만 막지 않습니다.", tone: "bad" },
      host: { q: "<b>고령 · 면역저하 · 심한 기저질환</b>이 있거나, <b>1주 이상</b> 지속됩니까?", opts: [["그렇다", "refer"], ["아니다", "mild"]] },
      refer: { end: "🏥 <b>진료 권유</b> — 예비력이 적거나 지속되는 설사는 단순 장염으로 단정하지 않습니다.", tone: "mid" },
      mild: { end: "✅ <b>가벼운 물설사</b> — 수분 보충(ORS) ± 증상 완화(성인이면 loperamide 단기). 악화 신호가 생기면 다시 평가합니다.", tone: "ok" }
    };
    var trail = [];
    function render(key) {
      var n = NODES[key];
      var opts = cstEl(root, "opts");
      cstEl(root, "trail").innerHTML = trail.map(function (t) { return "<span>" + t + "</span>"; }).join("");
      opts.innerHTML = "";
      if (n.end) {
        cstOut(cstEl(root, "q"), n.end, n.tone);
      } else {
        cstOut(cstEl(root, "q"), n.q);
        n.opts.forEach(function (o) {
          var b = document.createElement("button");
          b.className = "cst__chip";
          b.textContent = o[0];
          b.addEventListener("click", function () { trail.push(o[0]); render(o[1]); });
          opts.appendChild(b);
        });
      }
      if (trail.length) {
        var r = document.createElement("button");
        r.className = "btn btn--ghost";
        r.textContent = "↺ 처음부터";
        r.addEventListener("click", function () { trail = []; render("dehyd"); });
        opts.appendChild(r);
      }
    }
    render("dehyd");
  }

  /* ---------- Viz 9 · ORS Mechanism ---------- */
  function initDiaOrs() {
    var root = document.querySelector("[data-diaors]");
    if (!root) return;
    var DRINK = {
      water: { lumen: "H₂O", cell: "💧💧", gate: false, na: 5, abs: 35, osm: 5, tone: "mid", msg: "<b>물</b> — 가벼운 설사라면 충분할 수 있습니다. 하지만 Na⁺·glucose가 없어 SGLT1을 활용하지 못하고, 반복적인 설사로 잃은 <b>전해질을 보충하지 못합니다</b> (심하면 저나트륨혈증 위험)." },
      sports: { lumen: "Na⁺ G G G G", cell: "💧💧💧", gate: true, na: 25, abs: 50, osm: 60, tone: "mid", msg: "<b>스포츠음료</b> — 땀 보충용이라 Na⁺는 적고 당은 많습니다. 일부 흡수는 돕지만, 탈수가 있는 설사에는 ORS만큼 효율적이지 않습니다." },
      ors: { lumen: "Na⁺ G Na⁺ Na⁺ G", cell: "💧💧💧💧💧", gate: true, na: 80, abs: 90, osm: 35, tone: "ok", msg: "✅ <b>ORS</b> — Na⁺와 glucose가 <b>균형 잡힌 비율</b>로 SGLT1을 최대한 이용합니다. 삼투압은 혈장보다 약간 낮아(245 mOsm/L) 물이 장에서 몸 쪽으로 이동합니다." },
      juice: { lumen: "G G G G G G G", cell: "💧", gate: false, na: 3, abs: 15, osm: 95, tone: "bad", msg: "❌ <b>주스·탄산음료</b> — 당이 너무 많고 Na⁺는 거의 없습니다. 흡수되지 못한 당이 osmole로 남아 <b>물을 오히려 장으로 끌어당겨</b> 설사를 악화시킬 수 있습니다." }
    };
    function show(k) {
      var d = DRINK[k];
      root.querySelectorAll("[data-drink]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-drink") === k); });
      cstEl(root, "lumen").textContent = d.lumen;
      cstEl(root, "cell").textContent = d.cell;
      cstEl(root, "gate").classList.toggle("is-on", d.gate);
      cstEl(root, "na").style.width = d.na + "%";
      cstEl(root, "abs").style.width = d.abs + "%";
      cstEl(root, "osm").style.width = d.osm + "%";
      cstOut(cstEl(root, "out"), d.msg, d.tone);
    }
    root.querySelectorAll("[data-drink]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-drink")); });
    });
    show("ors");
  }

  /* ---------- Viz 10 · Loperamide Safety Gate ---------- */
  function initDiaLope() {
    var root = document.querySelector("[data-dialope]");
    if (!root) return;
    function update() {
      var chips = root.querySelectorAll(".cst__chip.on");
      var reds = [];
      chips.forEach(function (c) { if (c.getAttribute("data-flag") === "1") reds.push(c.getAttribute("data-why")); });
      var out = cstEl(root, "out");
      if (!chips.length) cstOut(out, "항목을 선택하면 판정이 나타납니다.");
      else if (reds.length) cstOut(out, "🚫 <b>STOP — Avoid antimotility, evaluate cause</b><br>• " + reds.join("<br>• "), "bad");
      else cstOut(out, "✅ <b>Loperamide may be considered</b> — ORS로 수분을 먼저·함께 보충하고, 단기간 사용합니다. 허가 용량을 지키고 48시간 안에 호전이 없거나 red flag가 생기면 중단·진료.", "ok");
    }
    root.querySelectorAll("[data-flag]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-flag") === "reset") {
          root.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
        } else {
          b.classList.toggle("on");
        }
        update();
      });
    });
  }

  /* ---------- Viz 11 · Chronic Diarrhea Sorter ---------- */
  function initDiaChronic() {
    var root = document.querySelector("[data-diachronic]");
    if (!root) return;
    var LABEL = { watery: "💧 Watery", fatty: "🧈 Fatty", inflammatory: "🔥 Inflammatory" };
    var cards = root.querySelectorAll(".dia__card");
    var done = 0, right = 0;
    cards.forEach(function (card) {
      var bins = document.createElement("div");
      bins.className = "dia__bins";
      var fb = document.createElement("div");
      fb.className = "dia__fb";
      Object.keys(LABEL).forEach(function (k) {
        var b = document.createElement("button");
        b.className = "dia__bin";
        b.textContent = LABEL[k];
        b.addEventListener("click", function () {
          if (card.getAttribute("data-done")) return;
          card.setAttribute("data-done", "1");
          var ans = card.getAttribute("data-ans");
          var ok = k === ans;
          done++; if (ok) right++;
          bins.querySelectorAll(".dia__bin").forEach(function (x, i) {
            if (Object.keys(LABEL)[i] === ans) x.classList.add("is-right");
          });
          if (!ok) b.classList.add("is-wrong");
          card.classList.add(ok ? "is-right" : "is-wrong");
          fb.innerHTML = (ok ? "✅ " : "❌ 정답은 " + LABEL[ans] + " — ") + card.getAttribute("data-why");
          cstOut(cstEl(root, "out"), done + " / " + cards.length + " 분류 · 정답 " + right + "개" + (done === cards.length ? " — 다음 섹션에서 갈래별 검사를 봅니다." : ""), done === cards.length ? (right === cards.length ? "ok" : "mid") : "");
        });
        bins.appendChild(b);
      });
      card.appendChild(bins);
      card.appendChild(fb);
    });
  }

  /* ---------- Viz 12 · Stool Osmotic Gap ---------- */
  function initDiaGap() {
    var root = document.querySelector("[data-diagap]");
    if (!root) return;
    var v = { na: 30, k: 30 };
    function update() {
      var gap = 290 - 2 * (v.na + v.k);
      cstEl(root, "na").textContent = v.na;
      cstEl(root, "k").textContent = v.k;
      cstEl(root, "gap").textContent = gap;
      var out = cstEl(root, "out");
      if (gap < 0) cstOut(out, "계산값이 음수 — 실제로는 검체 오염(소변·물 혼입 등)을 의심하는 상황입니다.", "mid");
      else if (gap > 125) cstOut(out, "<b>Osmotic 패턴</b> — 전해질로 설명되지 않는 osmole(흡수 안 된 당·Mg 등)이 물을 붙잡고 있습니다.", "ok");
      else if (gap < 50) cstOut(out, "<b>Secretory 패턴</b> — 대변의 삼투압 대부분을 Na⁺·K⁺가 차지합니다. 장세포가 전해질을 분비하고 있다는 뜻입니다.", "bad");
      else cstOut(out, "<b>중간 영역</b> — 혼합형이거나 판정이 애매합니다. 임상상과 함께 봅니다.", "mid");
    }
    root.querySelectorAll("input[data-k]").forEach(function (r) {
      r.addEventListener("input", function () { v[r.getAttribute("data-k")] = +r.value; update(); });
    });
    update();
  }

  /* ---------- Viz 13 · Diarrhea Triage Simulator ---------- */
  function initDiaSim() {
    var root = document.querySelector("[data-diasim]");
    if (!root) return;
    var NAME = { ors: "ORS", lope: "Loperamide", stool: "Stool test·진료", abx: "경험적 항생제", cdi: "CDI 치료" };
    /* need: 꼭 필요 · ok: 선택 가능 · no: 피함 */
    var PT = {
      a: { need: ["ors"], ok: ["lope"], why: { stool: "합병증 없는 물설사에서 stool test는 대부분 불필요합니다.", abx: "지역사회 급성 물설사에 routine 항생제는 권장되지 않습니다.", cdi: "항생제 노출이 없어 CDI 치료 대상이 아닙니다." }, sum: "Hydration first — ORS가 중심이고, 성인이니 loperamide는 단기간 선택 가능합니다." },
      b: { need: ["ors", "stool"], ok: [], why: { lope: "혈변·고열 — antimotility drug는 피합니다.", abx: "원인 확인 전 자동 투여는 아닙니다 — STEC라면 HUS 위험과 연관될 수 있습니다.", cdi: "CDI를 시사하는 항생제 노출이 없습니다." }, sum: "Inflammatory pathway — 수분 보충을 유지하며 stool test로 원인을 확인합니다. 지사제·자동 항생제는 피합니다." },
      c: { need: ["stool", "cdi"], ok: ["ors"], why: { lope: "CDI 의심 — 증상만 막으면 toxin이 장에 머물고 toxic megacolon 위험이 있습니다.", abx: "일반 경험적 항생제는 오히려 CDI를 악화시킬 수 있습니다. 필요한 것은 C. difficile를 겨냥한 치료입니다." }, sum: "Consider C. difficile — stool test로 확인하고 fidaxomicin 또는 경구 vancomycin. 수분 보충도 함께." }
    };
    var cur = null, pick = {};
    var chips = root.querySelectorAll("[data-tx]");
    root.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-pt]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        cur = b.getAttribute("data-pt");
        pick = {};
        chips.forEach(function (x) { x.classList.remove("on"); });
        cstEl(root, "steps").style.display = "block";
        cstOut(cstEl(root, "out"), "대응을 모두 고른 뒤 판정을 누르세요.");
      });
    });
    chips.forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-tx");
        pick[k] = !pick[k];
        b.classList.toggle("on", pick[k]);
      });
    });
    root.querySelector("[data-act='check']").addEventListener("click", function () {
      if (!cur) return;
      var d = PT[cur], wrong = [], miss = [];
      Object.keys(NAME).forEach(function (k) {
        var allowed = d.need.indexOf(k) >= 0 || d.ok.indexOf(k) >= 0;
        if (pick[k] && !allowed) wrong.push("❌ <b>" + NAME[k] + "</b> — " + d.why[k]);
        if (!pick[k] && d.need.indexOf(k) >= 0) miss.push(NAME[k]);
      });
      var out = cstEl(root, "out");
      if (!wrong.length && !miss.length) cstOut(out, "✅ <b>정확합니다.</b> " + d.sum, "ok");
      else cstOut(out, wrong.join("<br>") + (miss.length ? (wrong.length ? "<br>" : "") + "➕ 빠진 것: <b>" + miss.join(", ") + "</b>" : "") + "<br>" + d.sum, "bad");
    });
  }

  /* =====================================================================
     Core 15 · 변비
     ===================================================================== */
  function cstEl(root, key) { return root.querySelector("[data-el='" + key + "']"); }
  function cstOut(el, html, tone) {
    if (!el) return;
    el.innerHTML = html;
    el.className = "cst__out" + (tone ? " is-" + tone : "");
  }

  /* ---------- Viz 1 · Defecation Coordination ---------- */
  function initDefecCoord() {
    var root = document.querySelector("[data-defeccoord]");
    if (!root) return;
    var state = { push: false, relax: false };
    var canal = cstEl(root, "canal"), gate = cstEl(root, "gate");
    function update() {
      cstEl(root, "rectal").style.width = (state.push ? 85 : 20) + "%";
      cstEl(root, "anal").style.width = (state.relax ? 15 : 80) + "%";
      root.querySelectorAll("[data-act]").forEach(function (b) {
        var a = b.getAttribute("data-act");
        if (a !== "reset") b.classList.toggle("on", state[a]);
      });
      gate.textContent = state.relax ? "열림" : "닫힘";
      canal.classList.toggle("is-open", state.relax);
      canal.classList.toggle("is-out", state.push && state.relax);
      canal.classList.toggle("is-blocked", state.push && !state.relax);
      var out = cstEl(root, "out");
      if (state.push && state.relax) cstOut(out, "✅ <b>배변 성공</b> — 직장 압력 ↑ + 출구 이완이 동시에 일어났습니다.", "ok");
      else if (state.push) cstOut(out, "⛔ <b>Blocked</b> — 힘은 주는데 골반저·괄약근이 닫혀 있습니다. 이것이 dyssynergic defecation의 모습입니다.", "bad");
      else if (state.relax) cstOut(out, "출구는 열렸지만 밀어내는 힘이 없습니다. 변이 내려오지 않습니다.", "mid");
      else cstOut(out, "안정 상태 — 항문괄약근이 닫혀 변을 붙잡고 있습니다.");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "reset") { state.push = false; state.relax = false; }
        else state[a] = !state[a];
        update();
      });
    });
  }

  /* ---------- Viz 2 · Colon Transit Simulator ---------- */
  function initColonTransit() {
    var root = document.querySelector("[data-colontransit]");
    if (!root) return;
    var LV = [
      { t: 10, w: 92, tone: "bad", msg: "<b>Bristol 7형</b> — 물을 흡수할 시간이 없어 액체 상태로 나옵니다 (설사)." },
      { t: 30, w: 72, tone: "mid", msg: "<b>Bristol 5–6형</b> — 무르고 형태가 흐트러진 변." },
      { t: 50, w: 50, tone: "ok", msg: "<b>Bristol 3–4형</b> — 형태가 잡힌 부드러운 변." },
      { t: 75, w: 28, tone: "mid", msg: "<b>Bristol 2형</b> — 수분이 많이 흡수되어 울퉁불퉁하고 단단합니다." },
      { t: 95, w: 10, tone: "bad", msg: "<b>Bristol 1형</b> — 토끼똥처럼 마르고 분리된 덩어리. 배변도 드물어집니다 (slow-transit constipation)." }
    ];
    root.querySelectorAll("[data-lv]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-lv]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var d = LV[+b.getAttribute("data-lv")];
        cstEl(root, "time").style.width = d.t + "%";
        cstEl(root, "absorb").style.width = d.t + "%";
        cstEl(root, "water").style.width = d.w + "%";
        cstOut(cstEl(root, "out"), d.msg, d.tone);
      });
    });
  }

  /* ---------- Viz 3 · Push Against a Closed Door ---------- */
  function initClosedDoor() {
    var root = document.querySelector("[data-closeddoor]");
    if (!root) return;
    var MODE = {
      normal: { anal: 15, door: "🚪 문 열림 → 💩 통과", tone: "ok", msg: "힘을 줄 때 항문 압력이 <b>떨어집니다</b>. 밀어내는 힘 &gt; 출구 저항 → 배변 성공." },
      dys: { anal: 90, door: "💩 → 🚪 문 닫힘", tone: "bad", msg: "힘을 줄 때 항문 압력이 <b>같이 올라갑니다</b>. 닫힌 문을 계속 미는 상태 — 변이 아무리 부드러워도 나오지 못합니다." }
    };
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-mode]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var d = MODE[b.getAttribute("data-mode")];
        cstEl(root, "anal").style.width = d.anal + "%";
        var door = cstEl(root, "door");
        door.textContent = d.door;
        door.classList.toggle("is-closed", d.tone === "bad");
        cstOut(cstEl(root, "out"), d.msg, d.tone);
      });
    });
  }

  /* ---------- Viz 4 · Medication Constipation Checker ---------- */
  function initMedConstip() {
    var root = document.querySelector("[data-medconstip]");
    if (!root) return;
    var MED = {
      opioid: { paths: ["mot", "sec"], msg: "<b>Opioid</b> — 장의 μ receptor 활성 → 추진운동 ↓ + 분비 ↓ + 수분 흡수 ↑. 가장 대표적인 약물성 변비이며 내성이 잘 생기지 않습니다." },
      antichol: { paths: ["mot", "sec"], msg: "<b>Anticholinergic</b> — 1세대 항히스타민, 방광 항무스카린제, 일부 항정신병약. Acetylcholine 차단 → 장운동·분비 ↓." },
      tca: { paths: ["mot", "sec"], msg: "<b>TCA</b> — 항콜린 작용이 강합니다. 지난 강의에서 IBS-D에는 이 작용을 이용했지만, 변비 환자에게는 악화 요인입니다." },
      verapamil: { paths: ["mot"], msg: "<b>Verapamil</b> — 장 평활근의 calcium channel 차단 → 수축력 ↓. CCB 중 변비가 가장 흔합니다." },
      iron: { paths: ["hard"], msg: "<b>철분제</b> — 변이 단단해지고 위장 증상이 생깁니다. 변 색도 검게 변합니다. 임의 중단보다 제형·일정 조정을 먼저." },
      calcium: { paths: ["hard"], msg: "<b>칼슘 보충제</b> — 일부 환자에서 변비. 특히 calcium carbonate." },
      alum: { paths: ["mot", "hard"], msg: "<b>Aluminum 함유 제산제</b> — 변비를 유발합니다. 반대로 magnesium 제산제는 설사 쪽 — 그래서 둘을 섞은 복합제가 많습니다." }
    };
    var on = {};
    function update(last) {
      var n = { mot: 0, sec: 0, hard: 0 };
      Object.keys(on).forEach(function (k) { if (on[k]) MED[k].paths.forEach(function (p) { n[p]++; }); });
      ["mot", "sec", "hard"].forEach(function (p) {
        cstEl(root, "n-" + p).textContent = n[p];
        var box = root.querySelector("[data-path='" + p + "']");
        box.classList.toggle("on", n[p] > 0);
        box.classList.toggle("heavy", n[p] >= 2);
      });
      var total = Object.keys(on).filter(function (k) { return on[k]; }).length;
      var msg = last && on[last] ? MED[last].msg : (total ? "선택된 약 " + total + "개." : "약을 탭하면 기전 설명이 나타납니다.");
      if (total >= 3) msg += "<br><b>⚠️ 변비 유발 약물이 " + total + "개 겹쳤습니다 — 완하제를 더하기 전에 처방 검토가 먼저입니다.</b>";
      cstOut(cstEl(root, "out"), msg, total >= 3 ? "bad" : "");
    }
    root.querySelectorAll("[data-med]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-med");
        if (k === "reset") {
          on = {};
          root.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
          update();
          return;
        }
        on[k] = !on[k];
        b.classList.toggle("on", on[k]);
        update(k);
      });
    });
  }

  /* ---------- Viz 5 · Constipation Red Flag Gate ---------- */
  function initConstipGate() {
    var root = document.querySelector("[data-constipgate]");
    if (!root) return;
    function update() {
      var chips = root.querySelectorAll(".cst__chip.on");
      var reds = [];
      chips.forEach(function (c) { if (c.getAttribute("data-flag") === "1") reds.push(c.getAttribute("data-why")); });
      var out = cstEl(root, "out");
      if (!chips.length) cstOut(out, "증상을 선택하면 분류 결과가 나타납니다.");
      else if (reds.length) cstOut(out, "🚨 <b>Further evaluation needed</b><br>• " + reds.join("<br>• "), "bad");
      else cstOut(out, "✅ <b>Functional pattern likely</b> — Red flag 없음. 복용 약물을 확인하고 생활습관 + fiber/PEG부터 시작할 수 있습니다.", "ok");
    }
    root.querySelectorAll("[data-flag]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-flag") === "reset") {
          root.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
        } else {
          b.classList.toggle("on");
        }
        update();
      });
    });
  }

  /* ---------- Viz 6 · Diagnostic Branch ---------- */
  function initConstipBranch() {
    var root = document.querySelector("[data-constipbranch]");
    if (!root) return;
    var NODES = {
      alarm: { q: "변비 증상이 있는 환자입니다. <b>Alarm feature</b>(혈변·체중감소·빈혈·새로운 배변습관 변화 등)가 있습니까?", opts: [["있다", "organic"], ["없다", "secondary"]] },
      organic: { end: "🔭 <b>기질적 질환 평가</b> — 대장내시경 등. Functional constipation으로 단정하지 않습니다.", tone: "bad" },
      secondary: { q: "<b>변비 유발 약물</b>이나 이차 원인(갑상선기능저하·고칼슘혈증·당뇨 등)이 있습니까?", opts: [["있다 → 조정 후에도 지속", "trial"], ["없다", "trial"]] },
      trial: { q: "<b>표준치료</b>(생활습관 + fiber + PEG)를 충분히 시도했습니다. 반응이 있습니까?", opts: [["호전됨", "maintain"], ["지속됨", "pattern"]] },
      maintain: { end: "✅ <b>현재 치료 유지</b> — 전문검사는 필요하지 않습니다.", tone: "ok" },
      pattern: { q: "남아 있는 <b>주된 증상</b>은 무엇입니까?", opts: [["드물고 딱딱한 변", "transit"], ["막힌 느낌·잔변감·손으로 누름", "outlet"]] },
      transit: { end: "⏱️ <b>Transit 평가 고려</b> (colon transit study) + stimulant·secretagogue·prucalopride 단계로 진행.", tone: "mid" },
      outlet: { end: "🎈 <b>Balloon expulsion test · anorectal manometry</b> → dyssynergia가 확인되면 biofeedback.", tone: "mid" }
    };
    var trail = [];
    function render(key) {
      var n = NODES[key];
      var opts = cstEl(root, "opts");
      cstEl(root, "trail").innerHTML = trail.map(function (t) { return "<span>" + t + "</span>"; }).join("");
      opts.innerHTML = "";
      if (n.end) {
        cstOut(cstEl(root, "q"), n.end, n.tone);
      } else {
        cstOut(cstEl(root, "q"), n.q);
        n.opts.forEach(function (o) {
          var b = document.createElement("button");
          b.className = "cst__chip";
          b.textContent = o[0];
          b.addEventListener("click", function () { trail.push(o[0]); render(o[1]); });
          opts.appendChild(b);
        });
      }
      if (trail.length) {
        var r = document.createElement("button");
        r.className = "btn btn--ghost";
        r.textContent = "↺ 처음부터";
        r.addEventListener("click", function () { trail = []; render("alarm"); });
        opts.appendChild(r);
      }
    }
    render("alarm");
  }

  /* ---------- Viz 7 · Impaction & Overflow ---------- */
  function initImpaction() {
    var root = document.querySelector("[data-impaction]");
    if (!root) return;
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var flow = b.getAttribute("data-act") === "flow";
        cstEl(root, "rectum").classList.toggle("is-overflow", flow);
        if (flow) cstOut(cstEl(root, "out"), "💧 <b>Overflow diarrhea</b> — 단단한 덩어리를 통과하지 못한 묽은 변이 옆으로 새어 나옵니다. 겉으로는 설사·변실금처럼 보입니다.", "bad");
        else cstOut(cstEl(root, "out"), "직장에 단단한 변 덩어리가 쌓여 있습니다. 주로 <b>쇠약한 고령자, 신경질환, opioid 복용</b> 환자에서 문제가 됩니다.");
      });
    });
  }

  /* ---------- Viz 8 · Toilet Posture ---------- */
  function initToiletPosture() {
    var root = document.querySelector("[data-toiletposture]");
    if (!root) return;
    root.querySelectorAll("[data-pos]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-pos]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var stool = b.getAttribute("data-pos") === "stool";
        cstEl(root, "seg").classList.toggle("is-straight", stool);
        if (stool) cstOut(cstEl(root, "out"), "무릎이 고관절보다 높아짐 → 고관절 굴곡 ↑ → anorectal angle이 <b>펴져</b> 변이 지나가기 유리해집니다.", "ok");
        else cstOut(cstEl(root, "out"), "무릎이 고관절과 같은 높이 — anorectal angle이 꺾여 있어 변이 지나가는 길이 굽어 있습니다.");
      });
    });
  }

  /* ---------- Viz 9 · Osmotic Laxative ---------- */
  function initOsmotic() {
    var root = document.querySelector("[data-osmotic]");
    if (!root) return;
    var LV = [
      { body: "🪨", w: 15, tone: "", msg: "Bristol 1형 — 수분이 빠져나간 단단한 변." },
      { body: "🔹💧 🪨 💧", w: 40, tone: "mid", msg: "PEG 입자(🔹)가 lumen에 남아 물(💧)을 붙잡기 시작합니다. 변이 조금 부드러워집니다." },
      { body: "🔹💧💧 💩 💧💧🔹", w: 65, tone: "ok", msg: "✅ <b>목표 달성</b> — Bristol 3–4형. 부드럽고 형태가 있는 변." },
      { body: "🔹💧💧💧🔹💧💧💧🔹", w: 92, tone: "bad", msg: "⚠️ <b>과량</b> — 묽은 변·복부 팽만. PEG는 용량을 조절해 가며 맞추는 약입니다." }
    ];
    var lv = 0;
    function update() {
      var d = LV[lv];
      cstEl(root, "body").textContent = d.body;
      cstEl(root, "water").style.width = d.w + "%";
      cstOut(cstEl(root, "out"), d.msg, d.tone);
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        lv = b.getAttribute("data-act") === "reset" ? 0 : Math.min(lv + 1, LV.length - 1);
        update();
      });
    });
  }

  /* ---------- Viz 10 · Secretagogue Water Channel ---------- */
  function initSecretagogue() {
    var root = document.querySelector("[data-secretagogue]");
    if (!root) return;
    var MSG = [
      "Linaclotide는 거의 흡수되지 않고 <b>장관 내에서 국소적으로</b> 작용합니다.",
      "GC-C는 장 상피세포의 lumen 쪽 표면에 있는 수용체입니다.",
      "cGMP가 세포 안에서 2차 전달자로 작용합니다. 세포 밖으로 나간 cGMP는 <b>내장 통증 신경</b>의 흥분도 낮춥니다.",
      "CFTR 채널이 열려 음이온이 lumen으로 나갑니다.",
      "삼투로 물이 따라 나옵니다. 지나치면 <b>설사</b> — 가장 흔한 부작용입니다."
    ];
    var steps = root.querySelectorAll("[data-step]");
    var cur = -1;
    function update() {
      steps.forEach(function (s, i) { s.classList.toggle("on", i <= cur); s.classList.toggle("cur", i === cur); });
      cstOut(cstEl(root, "out"), cur < 0 ? "버튼을 눌러 한 단계씩 따라가 보세요." : MSG[cur], cur === steps.length - 1 ? "ok" : "");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        cur = b.getAttribute("data-act") === "reset" ? -1 : Math.min(cur + 1, steps.length - 1);
        update();
      });
    });
  }

  /* ---------- Viz 11 · Laxative Mechanism Map ---------- */
  function initLaxMap() {
    var root = document.querySelector("[data-laxmap]");
    if (!root) return;
    var LAX = {
      psyllium: { t: ["bulk"], msg: "<b>Psyllium</b> — 물을 흡수해 gel을 만들고 변의 부피와 수분을 늘립니다. 충분한 물과 함께, 천천히 증량." },
      peg: { t: ["water"], msg: "<b>PEG</b> — 흡수되지 않고 lumen에 남아 삼투로 물을 붙잡습니다. 장을 자극하지 않습니다. CIC 강한 권고." },
      bisacodyl: { t: ["motility", "secretion"], msg: "<b>Bisacodyl</b> — 장 점막·신경을 자극해 수축과 분비를 모두 늘립니다. 빠르고 강력 → 단기·rescue. 복부 경련 가능." },
      linaclotide: { t: ["secretion"], msg: "<b>Linaclotide</b> — GC-C → cGMP → CFTR. 상피세포가 Cl⁻·HCO₃⁻와 물을 분비하게 합니다. 통증 신호 감소 효과도." },
      prucalopride: { t: ["motility"], msg: "<b>Prucalopride</b> — 5-HT₄ agonist. Enteric neuron을 통해 대장의 추진운동(HAPC)을 늘립니다." }
    };
    root.querySelectorAll("[data-lax]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-lax]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var d = LAX[b.getAttribute("data-lax")];
        root.querySelectorAll("[data-target]").forEach(function (t) {
          t.classList.toggle("on", d.t.indexOf(t.getAttribute("data-target")) >= 0);
        });
        cstOut(cstEl(root, "out"), d.msg);
      });
    });
  }

  /* ---------- Viz 12 · PAMORA ---------- */
  function initPamora() {
    var root = document.querySelector("[data-pamora]");
    if (!root) return;
    var state = { opioid: false, pamora: false };
    function update() {
      root.querySelectorAll("[data-act]").forEach(function (b) {
        var a = b.getAttribute("data-act");
        if (a !== "reset") b.classList.toggle("on", state[a]);
      });
      var brain = cstEl(root, "brain"), gut = cstEl(root, "gut"), out = cstEl(root, "out");
      var gutBlocked = state.opioid && state.pamora;
      brain.className = "cst__organ" + (state.opioid ? " is-good" : "");
      gut.className = "cst__organ" + (gutBlocked ? " is-good" : state.opioid ? " is-bad" : "");
      cstEl(root, "brain-t").textContent = state.opioid ? "Opioid 결합 → 진통 ✅" : "비어 있음";
      cstEl(root, "gut-t").textContent = gutBlocked ? "PAMORA가 차단 → 장기능 회복" : state.opioid ? "Opioid 결합 → 변비 ⛔" : state.pamora ? "PAMORA 결합 (opioid 없음)" : "비어 있음";
      if (gutBlocked) cstOut(out, "✅ <b>Pain control maintained + Bowel function improved</b><br>PAMORA는 BBB를 거의 통과하지 못해 뇌의 진통 효과는 그대로 두고 장의 μ receptor만 차단합니다.", "ok");
      else if (state.opioid) cstOut(out, "Opioid는 뇌와 장의 μ receptor에 <b>모두</b> 결합합니다. 진통은 얻지만 장운동·분비가 떨어져 변비가 생깁니다.", "bad");
      else if (state.pamora) cstOut(out, "Opioid가 없으면 PAMORA는 할 일이 없습니다 — OIC에만 쓰는 기전 특이적 치료입니다.");
      else cstOut(out, "Opioid를 먼저 켜보세요.");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "reset") { state.opioid = false; state.pamora = false; }
        else state[a] = !state[a];
        update();
      });
    });
  }

  /* ---------- Viz 13 · Biofeedback Trainer ---------- */
  function initBiofeedback() {
    var root = document.querySelector("[data-biofeedback]");
    if (!root) return;
    var push = 0, relax = 0;
    function update() {
      var rectal = 20 + push * 22;
      var anal = Math.max(10, 60 + push * 10 - relax * 28);
      cstEl(root, "rectal").style.width = Math.min(rectal, 95) + "%";
      cstEl(root, "anal").style.width = Math.min(anal, 95) + "%";
      var out = cstEl(root, "out");
      if (!push && !relax) cstOut(out, "힘을 주면 직장 압력이 오릅니다. 그런데 이 환자는 힘을 줄 때 항문도 함께 조여집니다.");
      else if (rectal > anal + 25) cstOut(out, "✅ <b>Effective defecation</b> — 직장 압력이 항문 압력을 충분히 넘어섰습니다. 힘을 더 주는 것이 아니라 <b>이완을 배운 것</b>이 열쇠였습니다.", "ok");
      else if (push >= 2 && relax === 0) cstOut(out, "⛔ 세게 밀수록 항문 압력도 따라 올라갑니다. <b>Push harder만으로는 실패</b>합니다 — 완하제를 올리는 것과 같은 상황입니다.", "bad");
      else cstOut(out, "아직 직장 압력이 출구 저항을 충분히 넘지 못합니다. Push와 이완의 조합을 찾아보세요.", "mid");
    }
    root.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "reset") { push = 0; relax = 0; }
        else if (a === "push") push = Math.min(push + 1, 3);
        else relax = Math.min(relax + 1, 3);
        update();
      });
    });
  }

  /* ---------- Viz 14 · Constipation Mechanism Detective ---------- */
  function initConstipDetective() {
    var root = document.querySelector("[data-constipdetective]");
    if (!root) return;
    var PT = {
      a: { mech: "transit", tx: "laxative", why: "딱딱한 변 + 드문 배변, 출구 증상 없음 → <b>transit(slow/normal) 문제</b>. Fiber·PEG부터 시작하고 반응이 없으면 다음 단계로." },
      b: { mech: "outlet", tx: "biofeedback", why: "변은 부드러운데 배출 실패 + manual maneuver → <b>defecatory disorder</b>. 검사로 확인 후 biofeedback." },
      c: { mech: "drug", tx: "pamora", why: "Opioid 시작 후 새로 생긴 변비 → <b>OIC</b>. Bowel regimen(stimulant ± osmotic)을 쓰고, 부족하면 PAMORA를 고려." }
    };
    var cur = null, pick = {};
    function evaluate() {
      var out = cstEl(root, "out");
      if (!pick.mech || !pick.tx) { cstOut(out, "기전과 치료를 모두 선택하세요."); return; }
      var d = PT[cur];
      var okM = pick.mech === d.mech, okT = pick.tx === d.tx;
      if (okM && okT) cstOut(out, "✅ <b>정확합니다.</b> " + d.why, "ok");
      else cstOut(out, "❌ " + (okM ? "기전은 맞지만 치료가 어긋났습니다." : okT ? "치료는 맞지만 기전을 다시 생각해 보세요." : "기전과 치료 모두 다시 생각해 보세요.") + "<br>" + d.why, "bad");
    }
    root.querySelectorAll("[data-pt]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-pt]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        cur = b.getAttribute("data-pt");
        pick = {};
        root.querySelectorAll("[data-group] .cst__chip").forEach(function (x) { x.classList.remove("on"); });
        cstEl(root, "steps").style.display = "block";
        cstOut(cstEl(root, "out"), "기전과 치료를 모두 선택하세요.");
      });
    });
    root.querySelectorAll("[data-group]").forEach(function (g) {
      g.querySelectorAll(".cst__chip").forEach(function (b) {
        b.addEventListener("click", function () {
          g.querySelectorAll(".cst__chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          pick[g.getAttribute("data-group")] = b.getAttribute("data-v");
          evaluate();
        });
      });
    });
  }

  /* =====================================================================
     Core 14 · 과민성장증후군 (IBS)
     ===================================================================== */

  /* ---------- Gut-Brain Axis ---------- */
  function initGutBrainAxis() {
    var root = document.querySelector("[data-gutbrainaxis]");
    if (!root) return;
    var btns = root.querySelectorAll(".gba__btn");
    var brainDesc = root.querySelector("#gba-brain-desc");
    var gutDesc = root.querySelector("#gba-gut-desc");
    var result = root.querySelector("#gba-result");
    var arrowDown = root.querySelector("#gba-down");
    var arrowUp = root.querySelector("#gba-up");
    var data = {
      normal: {
        brain: "하행 억제 신호 정상 → 장 통증 신호 조절",
        gut: "정상 역치 → 적당한 신호만 올라감",
        result: "정상: 뇌의 하행 억제가 장 통증 신호를 적절히 조절합니다",
        down: "↓ 하행 억제 (강함)",
        up: "↑ 장 신호 (약함)",
        cls: ""
      },
      ibs: {
        brain: "하행 억제 감소 → 중추 감작(central sensitization) 발생",
        gut: "역치 저하 → 과도한 신호 올라감 (visceral hypersensitivity)",
        result: "IBS: 뇌의 억제가 약해지고, 장은 과민 신호를 강하게 보냅니다 → 통증↑",
        down: "↓ 하행 억제 감소 ⚠️",
        up: "↑ 장 신호 과다 🔥",
        cls: "gba__result--ibs"
      }
    };
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var d = data[btn.getAttribute("data-mode")];
        if (!d) return;
        if (brainDesc) brainDesc.textContent = d.brain;
        if (gutDesc) gutDesc.textContent = d.gut;
        if (result) { result.textContent = d.result; result.className = "gba__result " + d.cls; }
        if (arrowDown) arrowDown.textContent = d.down;
        if (arrowUp) arrowUp.textContent = d.up;
      });
    });
  }

  /* ---------- Visceral Visualization ---------- */
  function initVisceralViz() {
    var root = document.querySelector("[data-visceralviz]");
    if (!root) return;
    var btn = root.querySelector("#vsv-demo-btn");
    var fillA = root.querySelector("#vsv-fillA");
    var fillB = root.querySelector("#vsv-fillB");
    var labelA = root.querySelector("#vsv-labelA");
    var labelB = root.querySelector("#vsv-labelB");
    if (!btn) return;
    var ran = false;
    btn.addEventListener("click", function () {
      if (ran) {
        if (fillA) { fillA.style.transition = "none"; fillA.style.width = "0%"; }
        if (fillB) { fillB.style.transition = "none"; fillB.style.width = "0%"; }
        if (labelA) labelA.textContent = "통증 2/10";
        if (labelB) labelB.textContent = "통증 7/10";
        btn.textContent = "시뮬레이션 보기";
        ran = false;
        return;
      }
      ran = true;
      btn.textContent = "초기화";
      if (labelA) labelA.textContent = "";
      if (labelB) labelB.textContent = "";
      if (fillA) { fillA.style.width = "0%"; fillA.style.transition = "none"; }
      if (fillB) { fillB.style.width = "0%"; fillB.style.transition = "none"; }
      setTimeout(function () {
        if (fillA) { fillA.style.transition = "width 1.2s ease"; fillA.style.width = "20%"; }
        setTimeout(function () { if (labelA) labelA.textContent = "통증 2/10"; }, 1000);
        setTimeout(function () {
          if (fillB) { fillB.style.transition = "width 1.4s ease"; fillB.style.width = "70%"; }
          setTimeout(function () { if (labelB) labelB.textContent = "통증 7/10"; }, 1200);
        }, 800);
      }, 50);
    });
  }

  /* ---------- IBS Mechanism Mixer ---------- */
  function initIBSMixer() {
    var root = document.querySelector("[data-ibsmixer]");
    if (!root) return;
    var togs = root.querySelectorAll(".ibx__tog");
    var fpain = root.querySelector("#ibx-fill-pain");
    var fbloat = root.querySelector("#ibx-fill-bloat");
    var fdiarr = root.querySelector("#ibx-fill-diarr");
    var fconst = root.querySelector("#ibx-fill-const");
    var note = root.querySelector("#ibx-note");
    var state = { sensitivity: true, motility: true, microbiome: true, stress: true };
    function update() {
      var s = state;
      var pain = 0, bloat = 0, diarr = 0, cnst = 0;
      if (s.sensitivity) { pain += 40; bloat += 20; }
      if (s.motility) { diarr += 30; cnst += 25; }
      if (s.microbiome) { bloat += 35; diarr += 15; }
      if (s.stress) { pain += 35; bloat += 20; diarr += 15; cnst += 20; }
      if (fpain) fpain.style.width = Math.min(pain, 95) + "%";
      if (fbloat) fbloat.style.width = Math.min(bloat, 95) + "%";
      if (fdiarr) fdiarr.style.width = Math.min(diarr, 95) + "%";
      if (fconst) fconst.style.width = Math.min(cnst, 95) + "%";
      var total = [s.sensitivity, s.motility, s.microbiome, s.stress].filter(Boolean).length;
      var msgs = ["모든 요소 꺼짐 — 증상 없음", "1개 요소 활성", "2개 요소 활성 — 증상 중등도", "3개 요소 활성 — 증상 다양", "4가지 요소 모두 활성 → 증상이 가장 다양하게 나타납니다"];
      if (note) note.textContent = msgs[total] || "";
    }
    togs.forEach(function (tog) {
      tog.addEventListener("click", function () {
        var f = tog.getAttribute("data-factor");
        state[f] = !state[f];
        tog.classList.toggle("active", state[f]);
        update();
      });
    });
    update();
  }

  /* ---------- Rome IV Checkbox Builder ---------- */
  function initRomeIVCB() {
    var root = document.querySelector("[data-romeivcb]");
    if (!root) return;
    var cbs = root.querySelectorAll("input[type='checkbox']");
    var result = root.querySelector("#riv-result");
    if (!result) return;
    function update() {
      var base = root.querySelector("[data-riv='base']");
      var b1 = root.querySelector("[data-riv='bowel1']");
      var b2 = root.querySelector("[data-riv='bowel2']");
      var b3 = root.querySelector("[data-riv='bowel3']");
      if (!base || !base.checked) {
        result.textContent = "반복적 복통 기준(①)이 충족되어야 합니다";
        result.className = "riv__result riv__result--none";
        return;
      }
      var sub = [b1, b2, b3].filter(function (c) { return c && c.checked; }).length;
      if (sub < 2) {
        result.textContent = "① 충족. 배변 관련 기준 " + sub + "/3 — " + (2 - sub) + "개 더 필요합니다";
        result.className = "riv__result riv__result--partial";
      } else {
        result.textContent = "Rome IV 기준 충족 ✅ — IBS 진단 가능";
        result.className = "riv__result riv__result--ok";
      }
    }
    cbs.forEach(function (cb) { cb.addEventListener("change", update); });
  }

  /* ---------- IBS Treatment Map ---------- */
  function initIBSTreatMap() {
    var root = document.querySelector("[data-ibstreatmap]");
    if (!root) return;
    var tabs = root.querySelectorAll(".itm__tab");
    var ladder = root.querySelector("#itm-ladder");
    if (!ladder) return;
    var content = {
      all: [
        { step: "모든 아형 공통 — 1단계", items: ["환자 교육 + 안심: \"통증은 진짜이고, 관리 가능한 질환\"", "규칙적 식사, 과식·고지방·알코올·카페인 제한", "유산소 운동 (30분/일 이상)", "스트레스 관리, 수면 규칙화"], cls: "itm__step--1" },
        { step: "증상 패턴별 접근 — 2단계", items: ["Bristol Scale로 아형 확인 (C/D/M)", "아형에 맞는 약물 시작", "Low-FODMAP 식이 시도 (팽만·가스 심할 때)"], cls: "itm__step--2" },
        { step: "반응 불충분 시 — 3단계", items: ["Neuromodulators (TCA 저용량 10–25mg)", "Gut-directed CBT / 최면요법", "Probiotics 시도 (4–6주)"], cls: "itm__step--3" }
      ],
      c: [
        { step: "IBS-C 1단계", items: ["Psyllium (수용성 섬유) + 충분한 수분", "식이 조절, Low-FODMAP (Polyol 제한)", "규칙적 배변 시간"], cls: "itm__step--1" },
        { step: "IBS-C 2단계", items: ["PEG (삼투성 완하제): 변 부드럽게", "Linaclotide: 변비 + 통증 동시 개선 (GC-C)", "Lubiprostone: 여성 IBS-C"], cls: "itm__step--2" },
        { step: "IBS-C 3단계", items: ["Prucalopride (5-HT4 효현제)", "SSRI: 운동성↑ + 불안 동반 시", "TCA 주의: 변비 악화 가능"], cls: "itm__step--3" }
      ],
      d: [
        { step: "IBS-D 1단계", items: ["Loperamide: 설사·긴박감 조절 (통증 효과 없음)", "식이: Low-FODMAP, 카페인·지방 줄이기", "규칙적 식사"], cls: "itm__step--1" },
        { step: "IBS-D 2단계", items: ["Rifaximin (2주): 장내 세균 불균형·SIBO 동반 시", "Ondansetron (5-HT3 길항): 설사·긴박감", "Cholestyramine: 담낭절제술 후 IBS-D"], cls: "itm__step--2" },
        { step: "IBS-D 3단계", items: ["TCA 저용량 (10–25mg): 통증 + 운동성↓ (IBS-D에 적합)", "Gut-directed CBT / 최면요법", "SNRI (duloxetine): 통증+불안 동반"], cls: "itm__step--3" }
      ],
      pain: [
        { step: "복통 중심 — 1단계", items: ["Antispasmodics: Mebeverine, Hyoscine (식전 30분)", "Low-FODMAP 식이", "생활습관 기본"], cls: "itm__step--1" },
        { step: "복통 중심 — 2단계", items: ["TCA 저용량 (10–25mg): 가장 근거 강한 통증 neuromodulator", "IBS-D: TCA 선호 / IBS-C: TCA 주의 (SSRI 선호)", "Linaclotide (IBS-C 복통): GC-C 경로로 통증↓"], cls: "itm__step--2" },
        { step: "복통 중심 — 3단계", items: ["Gut-directed hypnotherapy / CBT", "SNRI (duloxetine): 통증+우울·불안 동반", "전문과 의뢰"], cls: "itm__step--3" }
      ]
    };
    function render(key) {
      var steps = content[key] || content.all;
      ladder.innerHTML = steps.map(function (s, i) {
        return (i > 0 ? "<div class='itm__step-arrow'>▼</div>" : "") +
          "<div class='itm__step " + s.cls + "'><div class='itm__step-name'>" + s.step + "</div><ul class='itm__step-list'>" +
          s.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") +
          "</ul></div>";
      }).join("");
    }
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        render(tab.getAttribute("data-subtype"));
      });
    });
    render("all");
  }

  /* ---------- Pain Volume Control (TCA) ---------- */
  function initPainVolume() {
    var root = document.querySelector("[data-painvolume]");
    if (!root) return;
    var btn = root.querySelector("#pvl-btn");
    var fill = root.querySelector("#pvl-fill");
    var icon = root.querySelector("#pvl-icon");
    var score = root.querySelector("#pvl-score");
    if (!btn) return;
    var on = false;
    btn.addEventListener("click", function () {
      on = !on;
      if (on) {
        btn.textContent = "← TCA 끄기";
        if (fill) { fill.style.transition = "height 1s ease"; fill.style.height = "30%"; }
        if (icon) icon.textContent = "🔇";
        if (score) { score.textContent = "통증 3/10"; score.style.color = "var(--ok)"; }
      } else {
        btn.textContent = "TCA 켜기 →";
        if (fill) { fill.style.transition = "height 1s ease"; fill.style.height = "80%"; }
        if (icon) icon.textContent = "📢";
        if (score) { score.textContent = "통증 7/10"; score.style.color = "var(--hi)"; }
      }
    });
  }

  /* ---------- IBS Red Flag Classifier ---------- */
  function initIBSRedFlag() {
    var root = document.querySelector("[data-ibsredflag]");
    if (!root) return;
    var ptns = root.querySelectorAll(".irf__pt");
    var result = root.querySelector("#irf-result");
    if (!result) return;
    var data = {
      a: { ok: true, title: "Patient A — IBS 가능", body: "25세 여성, 2년, 내시경 정상, Red Flag 없음 → <b>Rome IV 기준 확인</b> 후 IBS 진단 가능. 스트레스 악화, 혈변 없음, 젊은 여성 — IBS-M 패턴. 생활습관 + Low-FODMAP + 증상별 약물로 시작합니다." },
      b: { ok: false, title: "Patient B — 🚨 Red Flags — 대장내시경 필요", body: "<b>Red Flags 복수 해당:</b><br>① 52세 이후 새 증상<br>② 간헐적 혈변<br>③ 의도치 않은 체중 감소 3kg<br>④ 대장암 가족력<br>→ IBS로 단정 금지. <b>즉시 대장내시경</b> 권유. 대장암·IBD·허혈성 대장염 배제 필요." },
      c: { ok: true, title: "Patient C — PI-IBS 가능", body: "35세 남성, 급성 장염 후 3개월. Red Flag 없음, 혈액검사 정상 → <b>PI-IBS (Post-Infection IBS)</b> 고려. 급성 장염 후 10–25%에서 IBS 발생. IBS-D 접근. Rifaximin이 PI-IBS에 특히 도움됩니다." }
    };
    ptns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        ptns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var d = data[btn.getAttribute("data-irf")];
        if (!d) return;
        result.style.display = "block";
        result.className = "irf__result " + (d.ok ? "irf__result--ok" : "irf__result--danger");
        result.innerHTML = "<b>" + d.title + "</b><br><br>" + d.body;
      });
    });
  }

  /* ---------- Viz 1 · Ulcer Balance Scale ---------- */
  function initUlcerBalance() {
    var wrap = document.querySelector("[data-ulcerbalance]");
    if (!wrap) return;
    var beam = document.getElementById("ubsBeam");
    var result = document.getElementById("ubsResult");
    var state = { hpylori: false, nsaid: false };
    var info = {
      base:   { tilt: 0,   cls: "",          text: "균형 유지 — 점막 보호" },
      hp:     { tilt: -8,  cls: "tilt-left",  text: "H. pylori: 만성 염증 → 방어 약화, 산분비 조절 변화 → 궤양 위험 ↑" },
      nsaid:  { tilt: -8,  cls: "tilt-left",  text: "NSAID: Prostaglandin ↓ → Mucus·HCO₃⁻·Blood flow ↓ → 점막 방어 약화" },
      both:   { tilt: -15, cls: "tilt-left",  text: "H. pylori + NSAID 동시: 궤양 위험이 더 크게 증가합니다." }
    };
    function render() {
      var key = state.hpylori && state.nsaid ? "both" : state.hpylori ? "hp" : state.nsaid ? "nsaid" : "base";
      var d = info[key];
      if (beam) { beam.style.transform = "rotate(" + d.tilt + "deg)"; }
      if (result) {
        result.textContent = d.text;
        result.style.background = key === "base" ? "" : "var(--hi-soft)";
        result.style.borderLeft = key === "base" ? "" : "4px solid var(--hi)";
      }
    }
    wrap.querySelectorAll("[data-ubs]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-ubs");
        if (act === "reset") { state.hpylori = false; state.nsaid = false; wrap.querySelectorAll("[data-ubs]").forEach(function (b) { b.classList.remove("active"); }); }
        else if (act === "hpylori") { state.hpylori = !state.hpylori; btn.classList.toggle("active", state.hpylori); }
        else if (act === "nsaid") { state.nsaid = !state.nsaid; btn.classList.toggle("active", state.nsaid); }
        render();
      });
    });
    render();
  }

  /* ---------- Viz 2 · H. pylori Two Paths ---------- */
  function initHPyloriPath() {
    var wrap = document.querySelector("[data-hpyloripath]");
    if (!wrap) return;
    var desc = document.getElementById("hppDesc");
    var info = {
      duo: "<b>십이지장궤양 경로</b> — H. pylori antral gastritis → somatostatin↓ → gastrin↑ → acid output↑ → duodenal acid load↑ → gastric metaplasia → H. pylori colonization → 십이지장궤양. 세균이 위에 있어도 병변은 십이지장에 생깁니다.",
      gas: "<b>위궤양 경로</b> — H. pylori corpus/pangastritis → 만성 염증·mucosal defense↓ → 점막 방어 약화 → 위궤양 위험 증가. 위산 분비가 감소되는 경우도 있습니다."
    };
    wrap.querySelectorAll("[data-hpp]").forEach(function (el) {
      el.addEventListener("click", function () {
        wrap.querySelectorAll("[data-hpp]").forEach(function (e) { e.classList.remove("active"); });
        el.classList.add("active");
        if (desc) desc.innerHTML = info[el.getAttribute("data-hpp")] || "";
      });
    });
  }

  /* ---------- Viz 3 · NSAID Double Hit ---------- */
  function initNSAIDDoubleHit() {
    var wrap = document.querySelector("[data-nsaiddoublehit]");
    if (!wrap) return;
    var pathA = document.getElementById("nshPathA");
    var pathB = document.getElementById("nshPathB");
    wrap.querySelectorAll("[data-nsh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-nsh");
        if (act === "reset") {
          if (pathA) { pathA.style.opacity = "1"; pathA.style.borderColor = ""; }
          if (pathB) { pathB.style.opacity = "1"; pathB.style.borderColor = ""; }
        } else if (act === "a") {
          if (pathA) { pathA.style.opacity = "1"; pathA.style.borderColor = "var(--brand)"; }
          if (pathB) { pathB.style.opacity = "0.35"; pathB.style.borderColor = ""; }
        } else if (act === "b") {
          if (pathA) { pathA.style.opacity = "0.35"; pathA.style.borderColor = ""; }
          if (pathB) { pathB.style.opacity = "1"; pathB.style.borderColor = "var(--hi)"; }
        }
      });
    });
  }

  /* ---------- Viz 4 · GI Risk Stack ---------- */
  function initGIRiskStack() {
    var wrap = document.querySelector("[data-giriskstack]");
    if (!wrap) return;
    var bar = document.getElementById("grsBar");
    var label = document.getElementById("grsLevelLabel");
    var msg = document.getElementById("grsMsg");
    var score = 0;
    var added = {};
    function update() {
      var pct = Math.min(score, 100);
      var col, lv, text;
      if (pct < 25)  { col = "#12a594"; lv = "낮음";    text = "GI 합병증 위험이 낮습니다. 일반적인 관찰이면 충분합니다."; }
      else if (pct < 50) { col = "#f59e0b"; lv = "중간"; text = "위험인자가 쌓이고 있습니다. NSAID 최소화·H. pylori 확인을 고려합니다."; }
      else if (pct < 75) { col = "#f97316"; lv = "높음";   text = "GI risk가 높습니다. PPI gastroprotection을 강하게 고려합니다."; }
      else               { col = "#ef4444"; lv = "매우 높음"; text = "⚠️ 매우 높은 위험 — NSAID 재평가 + PPI 필수 + H. pylori 확인 + 주의 깊은 모니터링."; }
      if (bar)   { bar.style.width = pct + "%"; bar.style.background = col; }
      if (label) label.textContent = lv;
      if (msg)   msg.textContent = text;
    }
    wrap.querySelectorAll(".grs__chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-grs");
        if (act === "reset") {
          score = 0; added = {};
          wrap.querySelectorAll(".grs__chip").forEach(function (b) { b.classList.remove("selected"); });
          update(); return;
        }
        if (added[act]) return;
        added[act] = true;
        score += Number(btn.getAttribute("data-score") || 0);
        btn.classList.add("selected");
        update();
      });
    });
    update();
  }

  /* ---------- Viz 5 · Ulcer Depth ---------- */
  function initUlcerDepth() {
    var wrap = document.querySelector("[data-ulcerdepth]");
    if (!wrap) return;
    var hole = document.getElementById("uldHole");
    var info = document.getElementById("uldInfo");
    var layers = wrap.querySelectorAll(".uld__layer");
    var data = {
      0: { depth: "18px", col: "#f59e0b", danger: "low",    text: "Gastritis / Erosion — 표면 점막 손상. 통증·불편감이 주증상. 출혈·천공은 일반적으로 드뭅니다." },
      1: { depth: "50px", col: "#f97316", danger: "mid",    text: "궤양 (Submucosa까지) — 깊어진 결손. 혈관이 지나는 층 근처. 출혈 위험이 증가합니다." },
      2: { depth: "80px", col: "#ef4444", danger: "high",   text: "혈관 도달 — 혈관이 침식되면 melena·hematemesis 같은 GI bleeding 위험이 높습니다. Life-threatening." },
      3: { depth: "110px",col: "#b91c1c", danger: "urgent", text: "Full-thickness 관통 → Perforation — 위·십이지장 내용물이 복강으로 유출 → peritonitis. 즉각적인 응급처치 필요." }
    };
    wrap.querySelectorAll("[data-uld]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        wrap.querySelectorAll("[data-uld]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var lv = Number(btn.getAttribute("data-uld"));
        var d = data[lv];
        if (hole) { hole.style.height = d.depth; hole.style.background = d.col; }
        layers.forEach(function (layer) {
          var n = Number(layer.getAttribute("data-layer"));
          layer.classList.toggle("damaged", n <= lv);
        });
        if (info) {
          info.textContent = d.text;
          info.style.borderLeft = "4px solid " + d.col;
          info.style.background = d.danger === "urgent" ? "#fef2f2" : d.danger === "high" ? "#fff7ed" : "var(--surface-2)";
        }
      });
    });
  }

  /* ---------- Viz 6 · Ulcer Drug Target Map ---------- */
  function initUlcerDrugs() {
    var wrap = document.querySelector("[data-ulcerdrugs]");
    if (!wrap) return;
    var msg = document.getElementById("udgMsg");
    var info = {
      ppi:   "<b>PPI / P-CAB</b> — Parietal cell의 H⁺/K⁺-ATPase를 억제(PPI: 비가역적 / P-CAB: 가역적 K⁺ 경쟁). 산분비를 강력히 억제해 ulcer healing 환경을 만들고 출혈 부위의 clot을 안정시킵니다.",
      h2ra:  "<b>H2RA (famotidine 등)</b> — Parietal cell의 Histamine H2 receptor를 차단해 acid↓. PPI보다 약한 편이지만 H2RA도 ulcer 치료에 사용됩니다.",
      sucral:"<b>Sucralfate</b> — 궤양 표면에 protective barrier를 형성해 acid·pepsin으로부터 병변을 보호합니다. 위산에 의해 활성화되므로 공복에 투여합니다.",
      miso:  "<b>Misoprostol (PGE1 analogue)</b> — 감소된 prostaglandin을 보충 → mucus·bicarbonate↑, mucosal blood flow↑. NSAID-induced ulcer 예방에 논리적으로 적합하지만 diarrhea·cramp가 흔하고 <b>임신부 금기</b>입니다."
    };
    wrap.querySelectorAll("[data-udg]").forEach(function (el) {
      el.addEventListener("click", function () {
        wrap.querySelectorAll("[data-udg]").forEach(function (e) { e.classList.remove("active"); });
        el.classList.add("active");
        if (msg) msg.innerHTML = info[el.getAttribute("data-udg")] || "";
      });
    });
  }

  /* ---------- Viz 7 · Ulcer Recurrence Loop ---------- */
  function initUlcerRecurrence() {
    var wrap = document.querySelector("[data-ulcerrecurrence]");
    if (!wrap) return;
    // Static — already rendered by HTML, no additional JS needed
  }

  /* ---------- Viz 8 · Ulcer Emergency Simulator ---------- */
  function initUlcerEmergency() {
    var wrap = document.querySelector("[data-ulceremergency]");
    if (!wrap) return;
    var selectedLabel = document.getElementById("uesSelected");
    var choices = document.getElementById("uesChoices");
    var result = document.getElementById("uesResult");
    var currentPt = null;
    var answers = {
      a: {
        otc:       { ok: false, html: "❌ 단순 OTC 약으로 지켜보기엔 3주 지속 증상은 내시경 등 평가가 필요할 수 있습니다." },
        clinic:    { ok: true,  html: "✅ 3주 지속 명치 통증 → <b>외래 평가 권고</b>가 적절합니다. 내시경 및 H. pylori 검사를 포함한 평가가 필요할 수 있습니다." },
        emergency: { ok: false, html: "❌ 위급한 Red Flag(출혈·천공 신호)는 없어 즉시 응급실이 필요한 상황은 아닙니다." }
      },
      b: {
        otc:       { ok: false, html: "❌ 흑색변 + 빈맥은 GI bleeding의 Red Flag입니다. OTC 약으로 지켜보는 것은 위험합니다." },
        clinic:    { ok: false, html: "⚠️ Melena + 빈맥 110회는 즉각적인 평가가 필요합니다. 외래 예약보다 더 신속한 평가가 필요합니다." },
        emergency: { ok: true,  html: "✅ 흑색변 + 어지럼 + 빈맥 → <b>상부위장관 출혈 가능성</b> → 즉시 응급실 평가가 맞습니다." }
      },
      c: {
        otc:       { ok: false, html: "❌ Board-like rigidity는 복막 자극 신호입니다. 제산제로 해결할 수 있는 상황이 아닙니다." },
        clinic:    { ok: false, html: "❌ 갑작스러운 극심한 복통 + 복벽 경직은 perforation 등 응급상황을 의심합니다." },
        emergency: { ok: true,  html: "✅ 갑작스러운 극심한 복통 + board-like rigidity → <b>Ulcer perforation 의심</b> → 즉시 응급실. 지체 시 peritonitis·sepsis로 악화될 수 있습니다." }
      }
    };
    wrap.querySelectorAll("[data-ues-pt]").forEach(function (pt) {
      pt.addEventListener("click", function () {
        wrap.querySelectorAll("[data-ues-pt]").forEach(function (p) { p.classList.remove("active"); });
        pt.classList.add("active");
        currentPt = pt.getAttribute("data-ues-pt");
        if (selectedLabel) selectedLabel.textContent = "선택된 환자: Patient " + currentPt.toUpperCase() + " — 이제 대응을 선택하세요.";
        if (choices) choices.style.display = "flex";
        if (result) result.innerHTML = "";
      });
    });
    if (choices) {
      choices.querySelectorAll("[data-ues-choice]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!currentPt) return;
          var choice = btn.getAttribute("data-ues-choice");
          var d = (answers[currentPt] || {})[choice];
          if (result && d) {
            result.innerHTML = d.html;
            result.style.background = d.ok ? "var(--ok-soft,#d1fae5)" : "var(--hi-soft,#fee2e2)";
            result.style.borderLeft = d.ok ? "4px solid var(--ok)" : "4px solid var(--hi,#ef4444)";
          }
        });
      });
    }
  }

  /* ===========  Everyday 03 · 급성 장염 인터랙션  =========== */

  /* ---------- Viz 1 · Fluid Loss ---------- */
  function initFluidLoss() {
    var wrap = document.querySelector("[data-fluidloss]");
    if (!wrap) return;
    var WaterBar = document.getElementById("flsWater");
    var NaBar = document.getElementById("flsNa");
    var KBar = document.getElementById("flsK");
    var RiskBar = document.getElementById("flsRisk");
    var RiskLabel = document.getElementById("flsRiskLabel");
    var Msg = document.getElementById("flsMsg");
    var data = {
      0: { w: 5, na: 4, k: 3, risk: 5, risk_lv: "🟢 낮음", risk_col: "#12a594", msg: "기준 상태 — 아직 수분 손실이 없습니다." },
      3: { w: 30, na: 25, k: 20, risk: 25, risk_lv: "🟡 경도", risk_col: "#f59e0b", msg: "설사 3회 — 경도 탈수 가능성. ORS로 조금씩 자주 수분 보충을 권고합니다." },
      6: { w: 60, na: 55, k: 48, risk: 55, risk_lv: "🟡 중등도", risk_col: "#f97316", msg: "설사 6회 — 중등도 탈수 가능성. ORS가 중요합니다. 탈수 징후(갈증·소변 감소)를 확인합니다." },
      10: { w: 90, na: 85, k: 78, risk: 88, risk_lv: "🔴 심한 탈수 주의", risk_col: "#ef4444", msg: "설사 10회 + 구토 — 심한 탈수 위험. 구토로 수분 섭취도 어려울 수 있습니다. 의료기관 평가가 필요할 수 있습니다." }
    };
    function setBar(el, pct, col) {
      if (!el) return;
      el.style.width = pct + "%";
      if (col) el.style.background = col;
    }
    function render(n) {
      var d = data[n] || data[0];
      setBar(WaterBar, d.w, "#2196f3");
      setBar(NaBar, d.na, "#ff9800");
      setBar(KBar, d.k, "#9c27b0");
      setBar(RiskBar, d.risk, d.risk_col);
      if (RiskLabel) RiskLabel.textContent = d.risk_lv;
      if (Msg) Msg.textContent = d.msg;
    }
    render(0);
    wrap.querySelectorAll("[data-fls]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        wrap.querySelectorAll("[data-fls]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        render(Number(btn.getAttribute("data-fls")));
      });
    });
  }

  /* ---------- Viz 2 · Watery vs Inflammatory ---------- */
  function initWateryVsInflam() {
    var wrap = document.querySelector("[data-wateryvsflam]");
    if (!wrap) return;
    var chips = wrap.querySelectorAll(".wvi__chip");
    var wateryZone = document.getElementById("wviWateryZone");
    var inflamZone = document.getElementById("wviInflamZone");
    var result = document.getElementById("wviResult");
    var scored = { watery: [], inflam: [] };
    var total = chips.length;
    var answered = 0;
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.classList.contains("done")) return;
        var ans = chip.getAttribute("data-wvi-ans");
        var label = chip.getAttribute("data-label");
        chip.classList.add("done");
        answered++;
        if (ans === "watery") {
          chip.classList.add("wvi__chip--watery");
          scored.watery.push(label);
          if (wateryZone) wateryZone.textContent = scored.watery.join(" · ");
        } else {
          chip.classList.add("wvi__chip--inflam");
          scored.inflam.push(label);
          if (inflamZone) inflamZone.textContent = scored.inflam.join(" · ");
        }
        if (answered === total && result) {
          result.innerHTML = "✅ 완료! Watery: " + scored.watery.join(", ") + " | Inflammatory: " + scored.inflam.join(", ");
        }
      });
    });
  }

  /* ---------- Viz 3 · Norovirus Transmission ---------- */
  function initNoroTransmission() {
    var wrap = document.querySelector("[data-norotransmission]");
    if (!wrap) return;
    var desc = document.getElementById("nrtDesc");
    var info = {
      fomite: "<b>오염된 표면·문손잡이</b><br>예방: 화장실·접촉면 정기 소독(차아염소산나트륨 등), 손씻기 후 표면 만지기.",
      stool: "<b>대변 → 손</b><br>예방: 화장실 이용 후 비누와 물로 최소 20초 손씻기. 손소독제만으로는 부족합니다.",
      food: "<b>손 → 음식 조리</b><br>예방: 증상 회복 후 최소 48시간 음식 조리 금지. 조리 전 손씻기.  <b>(CDC 권고)</b>",
      water: "<b>오염된 음식·물 섭취</b><br>예방: 안전한 식수, 특히 굴 등 이매패류는 잘 익혀 먹기."
    };
    wrap.querySelectorAll("[data-nrt]").forEach(function (el) {
      el.addEventListener("click", function () {
        wrap.querySelectorAll("[data-nrt]").forEach(function (e) { e.classList.remove("active"); });
        el.classList.add("active");
        var key = el.getAttribute("data-nrt");
        if (desc) desc.innerHTML = info[key] || "";
      });
    });
  }

  /* ---------- Viz 4 · Hydration Gauge ---------- */
  function initHydrationGauge() {
    var wrap = document.querySelector("[data-hydrationgauge]");
    if (!wrap) return;
    var bar = document.getElementById("hygBar");
    var levelLabel = document.getElementById("hygLevelLabel");
    var msg = document.getElementById("hygMsg");
    var score = 0;
    var added = {};
    function update() {
      var pct = Math.min(score, 100);
      if (bar) bar.style.height = pct + "%";
      var lv, col, text;
      if (pct < 30) { lv = "🟢 Hydrated"; col = "#12a594"; text = "탈수 징후 없음. 일반적인 수분 보충으로 충분합니다."; }
      else if (pct < 60) { lv = "🟡 Mild Dehydration"; col = "#f59e0b"; text = "경도 탈수 가능성. ORS를 조금씩 자주 마십니다."; }
      else if (pct < 85) { lv = "🟠 Moderate Dehydration"; col = "#f97316"; text = "중등도 탈수. ORS 적극 섭취. 개선 없으면 진료를 권고합니다."; }
      else { lv = "🔴 Severe Dehydration"; col = "#ef4444"; text = "심한 탈수 — 신속한 의료 평가가 필요합니다."; }
      if (bar) bar.style.background = col;
      if (levelLabel) levelLabel.textContent = lv;
      if (msg) msg.textContent = text;
    }
    wrap.querySelectorAll(".hyg__sym").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-hyg");
        if (key === "reset") {
          score = 0; added = {};
          wrap.querySelectorAll(".hyg__sym").forEach(function (b) { b.classList.remove("selected"); });
          update(); return;
        }
        if (added[key]) return;
        added[key] = true;
        score += Number(btn.getAttribute("data-score") || 0);
        btn.classList.add("selected");
        update();
      });
    });
    update();
  }

  /* ---------- Viz 5 · ORS Mechanism (SGLT1) ---------- */
  function initORSMechanism() {
    var wrap = document.querySelector("[data-orsmechanism]");
    if (!wrap) return;
    var msg = document.getElementById("orsMsg");
    var steps = [
      "Na⁺와 Glucose가 장관 내에 존재합니다.",
      "SGLT1이 Na⁺와 Glucose를 인식해서 함께 세포 안으로 운반합니다.",
      "Na⁺가 세포 안으로 들어가면 삼투압 차이로 물이 따라 흡수됩니다.",
      "결과: Glucose + Na⁺ → Water follows. 설사 중에도 SGLT1은 기능을 유지하므로 이 경로가 ORS 치료의 근거입니다."
    ];
    var step = 0;
    wrap.querySelectorAll("[data-ors]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-ors");
        if (act === "reset") { step = 0; if (msg) msg.textContent = steps[0]; return; }
        if (act === "demo") {
          step = (step + 1) % steps.length;
          if (msg) msg.textContent = steps[step];
        }
      });
    });
    if (msg) msg.textContent = steps[0];
  }

  /* ---------- Viz 6 · Traffic Light ---------- */
  function initTrafficLight() {
    var wrap = document.querySelector("[data-trafficlight]");
    if (!wrap) return;
    wrap.querySelectorAll(".tfl__level").forEach(function (level) {
      level.addEventListener("click", function () {
        wrap.querySelectorAll(".tfl__level").forEach(function (l) { l.classList.remove("expanded"); });
        level.classList.toggle("expanded");
      });
    });
  }

  /* ---------- Loperamide Check ---------- */
  function initLopeCheck() {
    var wrap = document.querySelector("[data-lopecheck]");
    if (!wrap) return;
    var result = document.getElementById("lpcResult");
    var data = {
      a: { cls: "ok", html: "✅ <b>Patient A — 고려 가능</b><br>건강한 성인의 물설사, 발열·혈변 없음. 단순 물설사에서 loperamide를 고려할 수 있습니다. ORS 병행 권고." },
      b: { cls: "danger", html: "❌ <b>Patient B — 피하세요</b><br>발열 39℃ + 혈변 + 복부경련 → 염증성 설사 가능성. Loperamide는 이 상황에서 권고되지 않습니다. <b>의료기관 평가 필요.</b> (IDSA)" },
      c: { cls: "danger", html: "❌ <b>Patient C — 소아에게 권하지 않음</b><br>소아의 급성 설사에서 loperamide는 IDSA가 권고하지 않습니다. ORS가 핵심입니다." }
    };
    wrap.querySelectorAll("[data-lpc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        wrap.querySelectorAll("[data-lpc]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var key = btn.getAttribute("data-lpc");
        var d = data[key];
        if (result && d) {
          result.innerHTML = d.html;
          result.style.background = d.cls === "ok" ? "var(--ok-soft,#d1fae5)" : "var(--hi-soft,#fee2e2)";
          result.style.borderLeft = d.cls === "ok" ? "4px solid var(--ok)" : "4px solid var(--hi,#ef4444)";
        }
      });
    });
  }

  /* ===========  Core 12 · GERD 인터랙션  =========== */

  function initAntiRefluxBarrier() {
    var root = document.querySelector("[data-antirefluxbarrier]");
    if (!root) return;
    var lesLabel = root.querySelector("#arbLESLabel");
    var msg = root.querySelector("#arbMsg");
    var FACTORS = [
      { el: root.querySelector("#arbF1"), bar: null },
      { el: root.querySelector("#arbF2"), bar: null },
      { el: root.querySelector("#arbF3"), bar: null },
      { el: root.querySelector("#arbF4"), bar: null },
      { el: root.querySelector("#arbF5"), bar: null }
    ];
    FACTORS.forEach(function (f) {
      if (f.el) f.bar = f.el.querySelector(".arb__fbar-fill");
    });

    function setState(vals, msgText, lesText) {
      FACTORS.forEach(function (f, i) {
        if (f.bar) f.bar.style.width = vals[i] + "%";
      });
      if (lesLabel) lesLabel.textContent = lesText || "LES ●CLOSED";
      if (msg) msg.innerHTML = msgText;
    }

    root.querySelectorAll("[data-arb]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-arb");
        if (mode === "normal") {
          setState([100,100,100,100,100], "정상 상태 — LES·횡격막·연동운동·타액·중력 모두 작동 중입니다.", "LES ●CLOSED");
        } else if (mode === "swallow") {
          setState([60,100,100,100,100], "<b>삼키기 발생</b> — LES가 일시적으로 이완됩니다. 음식이 내려간 후 다시 닫힙니다. 이것은 정상입니다. 삼키지 않았는데도 일어나는 TLESR이 문제입니다.", "LES ◐OPEN");
        } else if (mode === "liedown") {
          setState([100,100,70,80,20], "<b>누운 자세</b> — Gravity 효과가 크게 감소합니다. Esophageal clearance도 감소합니다. 야간 수면 중 acid exposure가 증가하는 이유입니다.", "LES ●CLOSED");
        } else if (mode === "sleep") {
          setState([100,100,40,30,20], "<b>수면 중</b> — Swallowing↓ + Saliva↓ + Gravity 감소. Esophageal clearance가 가장 낮은 상태입니다. 야간 역류가 장기적으로 식도에 더 큰 손상을 줄 수 있습니다.", "LES ●CLOSED");
        } else {
          setState([100,100,100,100,100], "정상 상태 — LES·횡격막·연동운동·타액·중력 모두 작동 중입니다.", "LES ●CLOSED");
        }
      });
    });
  }

  function initRefluxMechanism() {
    var root = document.querySelector("[data-refluxmechanism]");
    if (!root) return;
    var freqBar = root.querySelector("#rfmFreqBar");
    var barrierBar = root.querySelector("#rfmBarrierBar");
    var msg = root.querySelector("#rfmMsg");
    var lesEl = root.querySelector("#rfmLES");
    var diaphEl = root.querySelector("#rfmDiaphragm");
    var stomachEl = root.querySelector("#rfmStomach");

    function setState(freq, barrier, msgText, lesStyle, diaphStyle, stomachStyle) {
      if (freqBar) { freqBar.style.width = freq + "%"; freqBar.style.background = freq > 60 ? "var(--hi)" : freq > 35 ? "#ff9800" : "var(--ok)"; }
      if (barrierBar) barrierBar.style.width = barrier + "%";
      if (msg) msg.innerHTML = msgText;
      if (lesEl) lesEl.style.cssText = lesStyle || "";
      if (diaphEl) diaphEl.style.cssText = diaphStyle || "";
      if (stomachEl) stomachEl.style.cssText = stomachStyle || "";
    }

    root.querySelectorAll("[data-rfm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-rfm");
        if (mode === "tlesr") {
          setState(70, 50, "<b>TLESR 발생</b> — 삼키지 않았는데 LES가 일시적으로 이완됩니다. GERD에서 가장 중요한 기전입니다. 위 내용물이 식도로 올라올 기회가 생깁니다.", "border-color:var(--hi);background:var(--hi-soft);", "", "");
        } else if (mode === "meal") {
          setState(65, 60, "<b>과식</b> — 위 팽창 → TLESR 빈도 증가 → 역류 가능성↑. 특히 식후 눕는 것이 더 위험합니다.", "", "", "transform:scale(1.12);background:rgba(229,72,77,.15);");
        } else if (mode === "obesity") {
          setState(75, 55, "<b>비만/복압 증가</b> — Intra-abdominal pressure↑ → stomach→esophagus 방향 압력 증가 → 역류↑. 체중감량이 GERD 개선에 효과적인 이유입니다.", "", "", "");
        } else if (mode === "hiatal") {
          setState(80, 30, "<b>Hiatal Hernia</b> — 위 일부가 횡격막 위로 올라가면서 LES와 diaphragmatic pinch가 분리됩니다. Anti-reflux barrier가 크게 약화됩니다.", "", "border-color:var(--hi);background:var(--hi-soft);", "margin-top:-10px;");
        } else {
          setState(20, 90, "정상 상태입니다.", "", "", "");
        }
      });
    });
    setState(20, 90, "정상 상태입니다.", "", "", "");
  }

  function initRefluxVsAcidity() {
    var root = document.querySelector("[data-refluxvsacidity]");
    if (!root) return;
    var particles = root.querySelector("#rvaParticles");
    var count = root.querySelector("#rvaCount");
    var phFill = root.querySelector("#rvaPhFill");
    var phText = root.querySelector("#rvaPhText");
    var heartburn = root.querySelector("#rvaHeartburn");
    var regurg = root.querySelector("#rvaRegurg");
    var msg = root.querySelector("#rvaMsg");

    function buildParticles(n, color) {
      if (!particles) return;
      particles.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var d = document.createElement("div");
        d.className = "rva__particle";
        d.style.background = color;
        particles.appendChild(d);
      }
    }

    function setState(ppiOn) {
      if (ppiOn) {
        buildParticles(7, "#ff9800");
        if (count) count.textContent = "6–8회/일";
        if (phFill) { phFill.style.height = "30%"; phFill.style.background = "#ff9800"; }
        if (phText) phText.textContent = "pH 4–5";
        if (heartburn) { heartburn.style.opacity = ".3"; heartburn.style.textDecoration = "line-through"; }
        if (regurg) regurg.style.opacity = "1";
        if (msg) msg.innerHTML = "<b style='color:var(--brand)'>PPI 복용 중</b> — 역류 횟수는 크게 변하지 않았지만 역류물의 산도가 크게 낮아졌습니다.<br>Heartburn 감소 ↓. <b>Regurgitation은 여전히 남을 수 있습니다</b>.";
      } else {
        buildParticles(8, "var(--hi)");
        if (count) count.textContent = "8회/일";
        if (phFill) { phFill.style.height = "80%"; phFill.style.background = "var(--hi)"; }
        if (phText) phText.textContent = "pH 1–2";
        if (heartburn) { heartburn.style.opacity = "1"; heartburn.style.textDecoration = ""; }
        if (regurg) regurg.style.opacity = "1";
        if (msg) msg.textContent = "PPI 없는 상태 — 역류 횟수와 산도 모두 높습니다.";
      }
    }

    root.querySelectorAll("[data-rva]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setState(btn.getAttribute("data-rva") === "ppi");
      });
    });
    setState(false);
  }

  var GERD_PHENOTYPES = {
    "erosion-high-pos": { name: "Erosive GERD (LA A–D)", color: "var(--hi)", more: "내시경 미란 + 비정상 acid exposure. PPI/P-CAB이 핵심치료. LA C/D = severe erosive esophagitis로 장기 유지치료 필요성이 큼. Barrett 위험 평가도 고려." },
    "erosion-high-neg": { name: "Erosive GERD", color: "var(--hi)", more: "내시경 미란 + 비정상 acid exposure. Reflux-symptom association이 뚜렷하지 않아도 미란이 있으면 치료 대상입니다." },
    "erosion-normal-pos": { name: "Erosive GERD (atypical acid pattern)", color: "var(--hi)", more: "미란이 있으므로 GERD. Acid exposure가 정상으로 나온 것은 검사 조건이나 day-to-day variability 때문일 수 있습니다." },
    "erosion-normal-neg": { name: "Erosive GERD (evaluate further)", color: "var(--hi)", more: "미란이 있으므로 GERD 치료 대상. 산 노출이 정상이고 증상 연관도 없다면 EoE 등 다른 원인도 평가합니다." },
    "normal-high-pos": { name: "NERD (Non-erosive Reflux Disease)", color: "var(--brand)", more: "내시경 정상 + 비정상 acid + symptom association (+). 전형적 NERD. PPI/P-CAB 치료 대상. Erosive보다 PPI response가 덜 일정할 수 있음." },
    "normal-high-neg": { name: "NERD (증상 연관 불명확)", color: "var(--brand)", more: "내시경 정상 + acid ↑ + association (−). GERD 자체는 있지만 증상이 reflux와 연관되지 않을 수 있음. PPI trial 후 재평가." },
    "normal-normal-pos": { name: "Reflux Hypersensitivity", color: "#ff9800", more: "내시경 정상 + acid 정상 + symptom association (+). 정상 범위의 역류에 식도가 과민하게 반응. PPI만으로 충분하지 않을 수 있으며 neuromodulator 등 다른 접근 필요." },
    "normal-normal-neg": { name: "Functional Heartburn", color: "var(--ink-soft)", more: "내시경 정상 + acid 정상 + symptom association (−). 역류와 무관한 기능성 식도 질환. PPI 증량보다 진단 재평가가 중요. 로마 기준 IV의 functional esophageal disorder." }
  };

  function initGERDPhenotype() {
    var root = document.querySelector("[data-gerdphenotype]");
    if (!root) return;
    var state = { endo: null, acid: null, assoc: null };
    var resultEl = root.querySelector("#gptResult");

    root.querySelectorAll(".gpt__sw").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-gpt-key");
        root.querySelectorAll("[data-gpt-key='" + key + "']").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state[key] = btn.getAttribute("data-gpt-val");
        if (state.endo && state.acid && state.assoc) {
          var key2 = state.endo + "-" + state.acid + "-" + state.assoc;
          var d = GERD_PHENOTYPES[key2];
          if (d && resultEl) {
            resultEl.innerHTML = "<div style='font-size:16px;font-weight:800;color:" + d.color + ";margin-bottom:8px;'>" + d.name + "</div>" + d.more;
          }
        }
      });
    });
  }

  function initGERDPhenotype2() {
    var root = document.querySelector("[data-gerdphenotype2]");
    if (!root) return;
    var resultEl = root.querySelector("#gpt2Result");
    var CASES = {
      a: { key: "erosion-high-pos", title: "Patient A" },
      b: { key: "normal-high-pos", title: "Patient B" },
      c: { key: "normal-normal-pos", title: "Patient C" },
      d: { key: "normal-normal-neg", title: "Patient D" }
    };
    root.querySelectorAll(".gpt2__pt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".gpt2__pt").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var c = CASES[btn.getAttribute("data-gpt2")];
        var d = GERD_PHENOTYPES[c.key];
        if (d && resultEl) {
          resultEl.innerHTML = "<b>" + c.title + "</b>: <span style='font-weight:700;color:" + d.color + ";'>" + d.name + "</span><br><br>" + d.more;
        }
      });
    });
  }

  function init24hMonitor() {
    var root = document.querySelector("[data-24hmonitor]");
    if (!root) return;
    var canvas = root.querySelector("#phmCanvas");
    var eventsEl = root.querySelector("#phmEvents");
    var msg = root.querySelector("#phmMsg");
    var events = [];
    var hour = 7;

    function redraw() {
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      var W = canvas.offsetWidth || 320;
      var H = 80;
      canvas.width = W;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "var(--surface-2, #f5f5f5)";
      ctx.fillRect(0, 0, W, H);
      // pH baseline
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.3);
      ctx.lineTo(W, H * 0.3);
      ctx.stroke();
      ctx.fillStyle = "#aaa";
      ctx.font = "10px sans-serif";
      ctx.fillText("pH 4", 2, H * 0.3 - 2);
      ctx.fillText("pH 2", 2, H * 0.85);
      // draw events as pH drops
      events.forEach(function (ev) {
        var x = (ev.h / 24) * W;
        if (ev.type === "meal") {
          ctx.fillStyle = "#66bb6a";
          ctx.fillRect(x - 2, 0, 4, H);
          ctx.fillStyle = "#2e7d32";
          ctx.font = "12px sans-serif";
          ctx.fillText("🍚", x - 6, 15);
        } else if (ev.type === "sleep") {
          ctx.fillStyle = "rgba(100,100,200,.2)";
          ctx.fillRect(x, 0, W * 0.3, H);
          ctx.fillStyle = "#666";
          ctx.font = "10px sans-serif";
          ctx.fillText("💤", x + 2, 14);
        } else if (ev.type === "symptom") {
          ctx.fillStyle = "var(--hi, #e5484d)";
          ctx.beginPath();
          ctx.moveTo(x - 4, H * 0.3 + 5);
          ctx.lineTo(x, H * 0.85);
          ctx.lineTo(x + 4, H * 0.3 + 5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#e5484d";
          ctx.font = "12px sans-serif";
          ctx.fillText("🔥", x - 5, H - 4);
        }
      });
    }

    root.querySelectorAll("[data-phm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = btn.getAttribute("data-phm");
        if (t === "reset") { events = []; hour = 7; if (eventsEl) eventsEl.innerHTML = ""; if (msg) msg.textContent = "이벤트를 추가하면 24시간 pH 그래프가 업데이트됩니다."; redraw(); return; }
        events.push({ type: t, h: hour });
        hour = Math.min(hour + 2 + Math.floor(Math.random() * 2), 23);
        var labels = { meal: "🍚 식사", sleep: "🛏️ 취침", symptom: "🔥 증상" };
        if (eventsEl) { var tag = document.createElement("span"); tag.style.cssText = "font-size:12px;padding:3px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);"; tag.textContent = labels[t]; eventsEl.appendChild(tag); }
        redraw();
        if (msg) {
          var symCount = events.filter(function (e) { return e.type === "symptom"; }).length;
          var refluxCount = events.filter(function (e) { return e.type === "meal"; }).length;
          if (symCount > 0 && refluxCount > 0) msg.innerHTML = "증상 발생 시점과 식사 후 pH 저하 시점이 겹칩니다 — <b>Symptom-reflux association (+)</b>. 이것이 GERD 확인의 핵심입니다.";
          else msg.textContent = "더 많은 이벤트를 추가해 패턴을 확인하세요.";
        }
      });
    });
    redraw();
  }

  function initGERDComplication() {
    var root = document.querySelector("[data-gerdcomplication]");
    if (!root) return;
    var steps = root.querySelectorAll(".gct__step");
    var desc = root.querySelector("#gctDesc");
    var GCT_TEXT = [
      "<b>정상 식도</b> — 정상 stratified squamous epithelium. 반복 역류 없음. 위험: 기저 수준.",
      "<b>Erosive Esophagitis</b> — 반복 acid/pepsin exposure → mucosal injury. Los Angeles grade A–D로 분류. C/D = severe.",
      "<b>Peptic Stricture</b> — 반복 염증·healing 과정에서 fibrosis → narrowing → progressive dysphagia. PPI 장기치료로 예방 가능.",
      "<b>Barrett Esophagus</b> — Squamous → intestinal-type columnar metaplasia. 반복 역류 injury에 대한 적응. Esophageal adenocarcinoma risk 증가와 연관. Barrett ≠ cancer.",
      "<b>Dysplasia</b> — Low-grade / high-grade. High-grade dysplasia는 암으로 진행 위험이 높아 적극 평가 필요.",
      "<b>Esophageal Adenocarcinoma</b> — Barrett → dysplasia → cancer의 경로. 모든 GERD 환자가 이 경로로 진행하는 것은 아닙니다."
    ];
    steps.forEach(function (step, i) {
      step.addEventListener("click", function () {
        steps.forEach(function (s) { s.classList.remove("open"); });
        step.classList.add("open");
        if (desc) desc.innerHTML = GCT_TEXT[i] || "";
      });
    });
  }

  function initTriggerTracker() {
    var root = document.querySelector("[data-triggertacker]");
    if (!root) return;
    var riskBar = root.querySelector("#trkRiskBar");
    var riskPct = root.querySelector("#trkRiskPct");
    var trkMsg = root.querySelector("#trkMsg");
    var state = {};
    var IMPACTS = { bigmeal: 20, lateeat: 20, liedown: 18, obesity: 18, alcohol: 12, smoking: 10, coffee: 6, spicy: 5 };

    root.querySelectorAll(".trk__item").forEach(function (item) {
      var key = item.getAttribute("data-trk");
      var toggle = item.querySelector(".trk__toggle");
      state[key] = false;
      item.addEventListener("click", function () {
        state[key] = !state[key];
        if (toggle) toggle.textContent = state[key] ? "ON" : "OFF";
        item.classList.toggle("trk__item--on", state[key]);
        var total = 0;
        Object.keys(state).forEach(function (k) { if (state[k]) total += (IMPACTS[k] || 0); });
        total = Math.min(total, 100);
        if (riskBar) { riskBar.style.width = total + "%"; riskBar.style.background = total > 60 ? "var(--hi)" : total > 35 ? "#ff9800" : "var(--ok)"; }
        if (riskPct) riskPct.textContent = total < 20 ? "낮음" : total < 50 ? "중간" : "높음";
        var on = Object.keys(state).filter(function (k) { return state[k]; });
        if (trkMsg) {
          if (on.length === 0) trkMsg.textContent = "모든 사람에게 동일한 trigger가 적용되지는 않습니다. 나만의 재현 가능한 trigger를 찾으세요.";
          else {
            var high = on.filter(function (k) { return IMPACTS[k] >= 15; });
            trkMsg.innerHTML = "선택된 요인 " + on.length + "개. " + (high.length ? "<b>" + high.join("·") + "</b>은 역류에 영향이 큰 요인입니다." : "개인마다 다릅니다.");
          }
        }
      });
    });
  }

  function initPPITiming() {
    var root = document.querySelector("[data-ppitiming]");
    if (!root) return;
    var slider = root.querySelector("#pitSlider");
    var result = root.querySelector("#pitResult");
    var concBar = root.querySelector("#pitConcBar");
    var pumpBar = root.querySelector("#pitPumpBar");
    var ppiMarker = root.querySelector("#pitPPIMarker");

    var TIMING = [
      { label: "식사 90분 전", left: "5%", concLeft: "5%", concW: "30%", pumpLeft: "40%", verdict: "ok", msg: "식사 90분 전 복용: 혈중 농도가 식사 타이밍보다 훨씬 앞서 peak에 도달합니다. 식사 시작 전 농도가 다소 감소. 식전 30–60분이 더 권장됩니다." },
      { label: "식사 30–60분 전", left: "25%", concLeft: "25%", concW: "35%", pumpLeft: "50%", verdict: "best", msg: "<b style='color:var(--ok)'>최적 타이밍 ✅</b> — 식사 30–60분 전 복용: 혈중 약물 농도 peak와 식사로 인한 proton pump activation 시점이 잘 맞습니다. 가장 효과적인 acid suppression." },
      { label: "식사와 동시", left: "45%", concLeft: "45%", concW: "30%", pumpLeft: "45%", verdict: "sub", msg: "식사와 동시 복용: pump activation과 약물 도달이 거의 겹치지만 최적보다 덜 효과적입니다. 식전 복용보다 효과가 떨어집니다." },
      { label: "식사 후 1시간", left: "58%", concLeft: "58%", concW: "28%", pumpLeft: "45%", verdict: "sub", msg: "식사 후 1시간: 이미 pump가 활성화된 상태에서 약물이 늦게 도달합니다. 효과가 크게 감소합니다." },
      { label: "식사 후 5시간", left: "80%", concLeft: "80%", concW: "20%", pumpLeft: "45%", verdict: "poor", msg: "<b style='color:var(--hi)'>비최적 ⚠️</b> 식사 후 5시간: 위산 분비가 이미 진행된 후에 복용합니다. 이미 활성화·결합한 pump에는 효과가 있지만 그 이후로는 pump 교체(turnover)까지 기다려야 합니다." }
    ];

    function update() {
      var v = parseInt(slider.value, 10);
      var t = TIMING[v];
      if (ppiMarker) ppiMarker.style.left = t.left;
      if (concBar) { concBar.style.left = t.concLeft; concBar.style.width = t.concW; }
      if (result) result.innerHTML = t.msg;
    }

    if (slider) { slider.addEventListener("input", update); update(); }
  }

  function initPPIvsPCAB() {
    // Static visualization — rendered by HTML
    var root = document.querySelector("[data-ppivpcab]");
    if (!root) return;
  }

  function initPPIFailure() {
    var root = document.querySelector("[data-ppifailure]");
    if (!root) return;
    var resultEl = root.querySelector("#pfdResult");
    var state = {};

    var OUTCOMES = {
      "0fail": { msg: "<b style='color:var(--hi)'>복용법 문제 확인!</b> 식후 복용 또는 불규칙 복용은 PPI 효과를 크게 감소시킵니다. <b>먼저 타이밍과 순응도를 교정</b>하고 재평가합니다.", next: false },
      "1high": { msg: "Acid exposure 여전히 높음 → <b>실제 persistent acid reflux</b>. PPI 용량 최적화 또는 P-CAB으로 전환·추가 고려. 또는 STEP 3으로.", next: true },
      "1normal2pos": { msg: "Acid exposure 정상 + Symptom association (+) → <b>Reflux Hypersensitivity</b>. 역류 자체보다 식도 과민성이 문제. PPI 증량보다 neuromodulator 등 다른 접근 고려.", next: false },
      "1normal2neg": { msg: "Acid exposure 정상 + Symptom association (−) → <b>Functional Heartburn</b>. GERD 기전이 아닌 functional esophageal disorder. PPI 계속 강화보다 진단 재평가가 중요합니다.", next: false }
    };

    root.querySelectorAll(".pfd__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = parseInt(btn.getAttribute("data-pfd-step"), 10);
        var ans = btn.getAttribute("data-pfd-ans");
        root.querySelectorAll("[data-pfd-step='" + step + "']").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state[step] = ans;

        var outcomeKey = "";
        if (state[0] === "fail") { outcomeKey = "0fail"; }
        else if (state[0] === "ok") {
          if (state[1] === "high") { outcomeKey = "1high"; }
          else if (state[1] === "normal" && state[2]) {
            outcomeKey = "1normal2" + state[2];
          }
        }
        if (outcomeKey && OUTCOMES[outcomeKey] && resultEl) {
          resultEl.innerHTML = "<div style='padding:12px;border-radius:10px;background:var(--surface-2);'>" + OUTCOMES[outcomeKey].msg + "</div>";
        }
      });
    });
  }

  function initFundoplication() {
    // Static visualization — rendered by HTML
    var root = document.querySelector("[data-fundoplication]");
    if (!root) return;
  }

  /* ===========  Core 11 · 위염 인터랙션  =========== */

  function initGastricShield() {
    var root = document.querySelector("[data-gastricshield]");
    if (!root) return;
    var layers = [
      { bar: root.querySelector("#gsL1Bar"), full: 100, nsaid: 30 },
      { bar: root.querySelector("#gsL2Bar"), full: 100, nsaid: 35 },
      { bar: root.querySelector("#gsL3Bar"), full: 100, nsaid: 50 },
      { bar: root.querySelector("#gsL4Bar"), full: 100, nsaid: 40 }
    ];
    var pgBar = root.querySelector("#gsPGBar");
    var acidBar = root.querySelector("#gsAcidBar");
    var acidNote = root.querySelector("#gsAcidNote");
    var msg = root.querySelector("#gsMsg");

    function setState(mode) {
      if (mode === "nsaid") {
        layers.forEach(function (l) { if (l.bar) l.bar.style.width = l.nsaid + "%"; });
        if (pgBar) pgBar.style.width = "20%";
        if (acidBar) acidBar.style.width = "60%";
        if (acidNote) acidNote.textContent = "변화 없음 (위산은 그대로)";
        if (msg) msg.innerHTML = "<b style='color:var(--hi)'>NSAID 복용 중</b> — Prostaglandin ↓<br>방어막이 약해졌지만 위산은 변하지 않았습니다. 같은 산에도 손상 위험이 증가합니다.";
      } else {
        layers.forEach(function (l) { if (l.bar) l.bar.style.width = "100%"; });
        if (pgBar) pgBar.style.width = "100%";
        if (acidBar) acidBar.style.width = "60%";
        if (acidNote) acidNote.textContent = "일정";
        if (msg) msg.textContent = "정상 상태 — 방어기전이 충분히 작동 중입니다.";
      }
    }

    root.querySelectorAll("[data-gs]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setState(btn.getAttribute("data-gs"));
      });
    });
    setState("normal");
  }

  function initHPylori() {
    var root = document.querySelector("[data-hpylori]");
    if (!root) return;
    var steps = root.querySelectorAll(".hpj__step");
    var desc = root.querySelector("#hpjDesc");
    var slider = root.querySelector("#hpjSlider");
    var timeline = root.querySelector("#hpjTimeline");
    var currentStep = 0;

    var STEP_TEXT = [
      "H. pylori가 위강에 도착했습니다. pH 1–2의 강산 속 — 어떻게 살아남을까요?",
      "핵심 무기: <b>Urease</b>. Urea를 분해해 ammonia를 만들고 주변 산을 중화합니다. Ammonia로 산 환경에서 생존 가능한 공간을 만듭니다.",
      "<b>Flagella(편모)</b>를 이용해 mucus layer 안으로 이동합니다. 점액층 안은 상대적으로 산이 적고 보호되어 있습니다.",
      "위 상피세포에 <b>부착(colonization)</b>합니다. 이제 면역반응으로부터 방어하면서 장기 감염이 시작됩니다.",
      "지속적인 감염 → 면역세포 침윤 → <b>만성 위염</b>. 이 염증이 위축·장상피화생으로 이어질 수 있습니다."
    ];

    var TIMELINE_TEXT = [
      "감염 초기: H. pylori가 위에 정착. Acute gastric inflammation 가능. 많은 경우 무증상.",
      "2–5년: Chronic antral gastritis 정착. Acid hypersecretion이 나타날 수 있음. Peptic ulcer 위험.",
      "5–10년: 점진적 gastric atrophy 시작 가능. 위축 부위 확대.",
      "10년+: Intestinal metaplasia 발생 가능. Gastric cancer 위험 증가 시작.",
      "장기: Correa cascade 진행 — Dysplasia 가능성. 제균이 이 시점에서도 유익."
    ];

    function goToStep(n) {
      currentStep = n;
      steps.forEach(function (s, i) {
        s.classList.toggle("active", i <= n);
      });
      if (desc) desc.innerHTML = STEP_TEXT[n] || "";
    }

    var nextBtn = root.querySelector("[data-hpj-step]");
    var resetBtn = root.querySelector("[data-hpj-reset]");
    if (nextBtn) nextBtn.addEventListener("click", function () {
      goToStep(Math.min(currentStep + 1, steps.length - 1));
    });
    if (resetBtn) resetBtn.addEventListener("click", function () { goToStep(0); });

    if (slider) {
      slider.addEventListener("input", function () {
        var v = parseInt(slider.value, 10);
        if (timeline) timeline.innerHTML = TIMELINE_TEXT[v] || "";
      });
      if (timeline) timeline.innerHTML = TIMELINE_TEXT[0];
    }

    goToStep(0);
  }

  function initNSAIDShield() {
    var root = document.querySelector("[data-nsaidshield]");
    if (!root) return;
    var shields = root.querySelectorAll(".nss__shield");
    var pgBox = root.querySelector("#nssPG");
    var protBox = root.querySelector("#nssProtected");
    var msg = root.querySelector("#nssMsg");

    function setState(mode) {
      if (mode === "nsaid") {
        if (pgBox) { pgBox.style.background = "#fce8e8"; pgBox.style.color = "var(--hi)"; pgBox.textContent = "Prostaglandin ↓↓↓"; }
        shields.forEach(function (s) { s.style.opacity = "0.25"; s.style.textDecoration = "line-through"; });
        if (protBox) { protBox.style.background = "#fce8e8"; protBox.textContent = "손상된 점막 ⚠️"; }
        if (msg) msg.innerHTML = "<b style='color:var(--hi)'>NSAID 투여</b> — COX 억제 → Prostaglandin 합성 감소<br>Mucus·HCO₃⁻·Blood flow·Repair 모두 감소. <b>위산은 변하지 않았습니다.</b>";
      } else {
        if (pgBox) { pgBox.style.background = ""; pgBox.style.color = ""; pgBox.textContent = "Prostaglandin (PGE₂ 등)"; }
        shields.forEach(function (s) { s.style.opacity = ""; s.style.textDecoration = ""; });
        if (protBox) { protBox.style.background = ""; protBox.textContent = "보호된 점막"; }
        if (msg) msg.textContent = "정상 상태 — COX가 prostaglandin을 만들어 방어막을 유지합니다.";
      }
    }

    root.querySelectorAll("[data-nss]").forEach(function (btn) {
      btn.addEventListener("click", function () { setState(btn.getAttribute("data-nss")); });
    });
    setState("normal");
  }

  function initAutoimmGastritis() {
    // Static visualization — rendered by HTML, no additional JS needed
    var root = document.querySelector("[data-autoimgastritis]");
    if (!root) return;
  }

  function initHPyloriTest() {
    var root = document.querySelector("[data-hpyloritest]");
    if (!root) return;
    var result = root.querySelector("#hptResult");

    var RESULTS = {
      invasive: "<b>침습 검사 (내시경 이용)</b><br>" +
        "• <b>Rapid urease test</b>: biopsy를 이용한 빠른 검사. PPI 사용 시 false negative 가능성 — PPI 2주 중단 권장.<br>" +
        "• <b>Histology</b>: 조직에서 H. pylori 직접 확인. 위축·장상피화생도 동시 평가 가능.<br>" +
        "• <b>Culture</b>: 내성 확인용. 임상에서 일반적 사용 제한적.",
      noninvasive: "<b>비침습 검사 (내시경 없이)</b><br>" +
        "• <b>Urea Breath Test (UBT)</b>: Active infection 확인에 우수. 치료 후 eradication 확인에도 사용. PPI·항생제 4주 중단 후 권장.<br>" +
        "• <b>Stool Antigen Test</b>: 비침습. Active infection 반영. Eradication 확인에도 사용. PPI 중단 권장.<br>" +
        "• <b>Serology</b>: 과거 감염·현재 감염 구별 어려움. Active infection 판단에 한계. 치료 후 cure 확인에 부적합."
    };

    root.querySelectorAll("[data-hpt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (result) result.innerHTML = RESULTS[btn.getAttribute("data-hpt")] || "";
      });
    });
  }

  function initCorreaCascade() {
    var root = document.querySelector("[data-correacascade]");
    if (!root) return;
    var steps = root.querySelectorAll(".cc__step");
    var desc = root.querySelector("#ccDesc");

    var CC_TEXT = [
      "<b>정상 점막</b> — 정상 gastric gland 구조. H. pylori 감염 없음. 위암 위험: 기저 수준.",
      "<b>H. pylori 만성 위염</b> — 지속적인 H. pylori 감염으로 인한 mucosal inflammation. 많은 경우 무증상. 위험: 이 단계에서 제균이 cascade 진행을 막는 데 가장 효과적.",
      "<b>위축성 위염 (Atrophic gastritis)</b> — 정상 gastric gland 소실. 위산 분비 감소 가능. 장상피화생 및 위암 위험이 높아지는 시작점.",
      "<b>장상피화생 (Intestinal metaplasia)</b> — 위 점막이 장 상피 phenotype으로 변화. 위암 위험 표지. 범위·유형에 따라 추적 전략이 달라짐.",
      "<b>이형성증 (Dysplasia)</b> — 명확한 전암성 변화. Low-grade와 high-grade dysplasia 구분. High-grade는 위암으로의 위험이 높아 적극 평가 필요.",
      "<b>위선암 (Gastric adenocarcinoma)</b> — H. pylori 관련 intestinal type 위암의 주된 경로. 조기 발견 시 치료 가능. 국내에서 중요한 암."
    ];

    steps.forEach(function (step, i) {
      step.addEventListener("click", function () {
        steps.forEach(function (s) { s.classList.remove("open"); });
        step.classList.add("open");
        if (desc) desc.innerHTML = CC_TEXT[i] || "";
      });
    });
  }

  function initThreeRoads() {
    // Static — HTML renders the diagram
    var root = document.querySelector("[data-threeroads]");
    if (!root) return;
  }

  function initTriggerSorter() {
    var root = document.querySelector("[data-triggersorter]");
    if (!root) return;
    var cards = root.querySelectorAll(".ts__card");
    var causeZone = root.querySelector("#tsCauseZone");
    var triggerZone = root.querySelector("#tsTriggerZone");
    var resultEl = root.querySelector("#tsResult");
    var placed = {};

    root.querySelectorAll("[data-zone]").forEach(function (zone) {
      zone.addEventListener("click", function () {
        var selectedCard = root.querySelector(".ts__card.ts__card--selected");
        if (!selectedCard) return;
        var label = selectedCard.getAttribute("data-label");
        var answer = selectedCard.getAttribute("data-answer");
        var zoneType = zone.getAttribute("data-zone");
        placed[label] = { chosen: zoneType, correct: answer };
        var tag = "<span class='ts__placed-tag " + (zoneType === answer ? "ts__correct" : "ts__wrong") + "'>" + label + "</span>";
        var dropEl = zoneType === "cause" ? causeZone : triggerZone;
        if (dropEl) {
          if (dropEl.textContent.indexOf("여기에") !== -1) dropEl.innerHTML = "";
          dropEl.innerHTML += tag;
        }
        selectedCard.classList.remove("ts__card--selected");
        selectedCard.style.opacity = "0.4";

        var total = cards.length;
        var done = Object.keys(placed).length;
        if (done === total) {
          var correct = Object.values(placed).filter(function (p) { return p.chosen === p.correct; }).length;
          if (resultEl) resultEl.innerHTML = "결과: " + correct + "/" + total + " 정답. " + (correct === total ? "완벽합니다! 원인과 유발인자를 구분할 수 있습니다." : "다시 생각해보세요. 원인(H. pylori, NSAID, 자가면역)과 증상 유발인자(음식 등)는 다릅니다.");
        }
      });
    });

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        cards.forEach(function (c) { c.classList.remove("ts__card--selected"); });
        card.classList.add("ts__card--selected");
        if (resultEl) resultEl.textContent = "위의 '원인' 또는 '유발인자' 영역을 탭해 분류하세요.";
      });
    });
  }

  function initAcidMap() {
    var root = document.querySelector("[data-acidmap]");
    if (!root) return;
    var pumpEl = root.querySelector("#amPump");
    var pumpDrug = root.querySelector("#amPumpDrug");
    var h2Drug = root.querySelector("#amH2Drug");
    var h2Box = root.querySelector("#amH2");
    var output = root.querySelector("#amOutput");
    var desc = root.querySelector("#amDesc");

    var DRUG_DATA = {
      h2ra: {
        pumpHighlight: false,
        h2highlight: true,
        h2text: "H₂RA 차단 ✕",
        pumpText: "",
        outputText: "H⁺ 분비 → (histamine 경로 차단됨)",
        outputColor: "var(--ok)",
        desc: "<b>H₂RA (famotidine 등)</b> — Parietal cell의 H₂ receptor를 차단합니다. Histamine-stimulated acid secretion을 줄입니다. PPI보다 acid suppression이 약하고 tolerance가 발생할 수 있습니다. 야간 acid 억제에 일부 사용됩니다."
      },
      ppi: {
        pumpHighlight: true,
        h2highlight: false,
        h2text: "",
        pumpText: "PPI 억제 ✕",
        outputText: "H⁺ 분비 크게 감소",
        outputColor: "var(--ok)",
        desc: "<b>PPI (omeprazole, esomeprazole, lansoprazole, pantoprazole, rabeprazole)</b> — H⁺/K⁺-ATPase(Proton pump)를 비가역적으로 억제합니다. 세 가지 신호(histamine·gastrin·Ach)가 모두 proton pump에서 만나므로 PPI는 강력한 acid suppression을 제공합니다. Acid-activated prodrug이므로 식사 30–60분 전 복용이 효과적."
      },
      pcab: {
        pumpHighlight: true,
        h2highlight: false,
        h2text: "",
        pumpText: "P-CAB 억제 ✕",
        outputText: "H⁺ 분비 감소",
        outputColor: "var(--ok)",
        desc: "<b>P-CAB (vonoprazan, tegoprazan, fexuprazan)</b> — H⁺/K⁺-ATPase의 K⁺ binding site와 경쟁적으로 결합해 acid secretion을 억제합니다. Acid activation이 필요 없어 빠른 발현이 특징입니다. 2025 개정 국내 H. pylori 제균 지침에 포함됩니다."
      },
      reset: {
        pumpHighlight: false,
        h2highlight: false,
        h2text: "",
        pumpText: "",
        outputText: "H⁺ 분비 → 위강으로",
        outputColor: "",
        desc: "약물을 선택하면 타깃 부위가 강조됩니다."
      }
    };

    root.querySelectorAll(".am__drug-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".am__drug-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var d = DRUG_DATA[btn.getAttribute("data-am")] || DRUG_DATA.reset;
        if (pumpEl) pumpEl.style.background = d.pumpHighlight ? "#fce8e8" : "";
        if (pumpDrug) { pumpDrug.style.display = d.pumpText ? "" : "none"; pumpDrug.textContent = d.pumpText; }
        if (h2Drug) { h2Drug.style.display = d.h2highlight ? "" : "none"; }
        if (h2Box) h2Box.style.background = d.h2highlight ? "#fce8e8" : "";
        if (output) { output.textContent = d.outputText; output.style.color = d.outputColor; }
        if (desc) desc.innerHTML = d.desc;
      });
    });
  }

  function initEradBuilder() {
    var root = document.querySelector("[data-eradbuilder]");
    if (!root) return;
    var gauge = root.querySelector("#ebGauge");
    var pct = root.querySelector("#ebGaugePct");
    var result = root.querySelector("#ebResult");
    var state = { acid: null, ab1: null, ab2: null, bismuth: null };

    function calcGauge() {
      var score = 0;
      var notes = [];
      if (!state.acid) return { score: 0, text: "요소를 선택하면 regimen이 완성됩니다." };
      if (state.acid === "pcab") { score += 30; notes.push("P-CAB: 빠른 acid suppression, H. pylori 제균요법에 유리한 pH 환경 제공"); }
      else if (state.acid === "ppi") { score += 25; notes.push("PPI: 표준 acid suppression — 식사 전 복용이 중요"); }

      if (!state.ab1) return { score: score, text: notes.join("<br>") + "<br><b>Antibiotic A를 선택하세요.</b>" };
      if (state.ab1 === "amox") { score += 20; notes.push("Amoxicillin: resistance 드물어 선호됨"); }
      else { score += 15; notes.push("Tetracycline: bismuth quadruple에서 사용"); }

      if (!state.ab2) return { score: score, text: notes.join("<br>") + "<br><b>Antibiotic B를 선택하세요.</b>" };
      if (state.ab2 === "clari") {
        if (state.bismuth !== "yes") { score += 10; notes.push("⚠️ Clarithromycin: 국내 내성률 증가 — 감수성 확인 없이 사용 시 제균 실패 위험. Tailored therapy 또는 bismuth quadruple 권장"); }
        else { score += 15; notes.push("Clarithromycin + Bismuth: bismuth 추가로 내성 부분 극복 가능"); }
      } else {
        score += 20; notes.push("Metronidazole: 내성 가능성 있으나 bismuth quadruple에서 효과적");
      }

      if (!state.bismuth) return { score: score, text: notes.join("<br>") + "<br><b>Bismuth 여부를 선택하세요.</b>" };
      if (state.bismuth === "yes") { score += 15; notes.push("Bismuth: H. pylori를 직접 억제 + 다른 항생제 보완. 국내 지침 bismuth quadruple 권고."); }
      else { notes.push("Bismuth 없음: triple therapy. Clarithromycin 내성 있는 경우 실패율 높음."); }

      var total = Math.min(score, 90);
      var label = total >= 80 ? " — 높은 예상 제균율 ✅" : total >= 60 ? " — 중간 예상 제균율" : " — 낮은 예상 제균율 ⚠️";
      return { score: total, text: notes.join("<br>") + "<br><b style='color:var(--brand)'>" + total + "% 개념적 제균율" + label + "</b><br><small style='color:var(--ink-faint)'>*이 게이지는 개념적 이해를 위한 것입니다. 실제 제균율은 내성 패턴·순응도에 따라 달라집니다.</small>" };
    }

    root.querySelectorAll(".eb__opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var g = btn.getAttribute("data-eb-group");
        root.querySelectorAll("[data-eb-group='" + g + "']").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state[g] = btn.getAttribute("data-eb-val");
        var res = calcGauge();
        if (gauge) gauge.style.width = res.score + "%";
        if (pct) pct.textContent = res.score + "%";
        if (result) result.innerHTML = res.text;
      });
    });
  }

  function initCauseDetective() {
    var root = document.querySelector("[data-causedetective]");
    if (!root) return;
    var resultEl = root.querySelector("#cdResult");

    var CD_DATA = {
      a: {
        title: "Patient A — H. pylori 위염",
        cause: "원인: <b>H. pylori 감염</b>",
        mech: "기전: H. pylori → urease → 생존 → epithelium 부착 → 만성 염증 → atrophy/metaplasia 위험",
        treat: "치료: <b>H. pylori 제균</b> (acid suppressor + 항생제 ± bismuth). 제균 후 eradication 성공 확인.",
        note: "NSAID가 없으므로 NSAID 중단은 해당 없음. Symptom 개선이 있어도 제균 완료가 중요."
      },
      b: {
        title: "Patient B — NSAID Gastropathy",
        cause: "원인: <b>NSAID (ibuprofen) 장기 복용</b>",
        mech: "기전: COX 억제 → prostaglandin ↓ → 점막 방어 약화 → erosion/ulcer 위험. 위산 자체는 증가하지 않음.",
        treat: "치료: ① NSAID 필요성 재평가 (중단·감량·대체 가능 여부) ② 고위험군 → <b>PPI gastroprotection</b> ③ 출혈 증상 모니터링",
        note: "H. pylori negative이므로 제균은 해당 없음. 증상치료(PPI)와 병행해 NSAID 사용 자체를 재평가."
      },
      c: {
        title: "Patient C — Autoimmune Gastritis",
        cause: "원인: <b>자가면역 — Parietal cell 자가항체</b>",
        mech: "기전: 자가항체 → Parietal cell 파괴 → HCl↓ + Intrinsic factor↓ → B12 흡수 불가 → B12 결핍 → megaloblastic anemia. Gastrin 반응성 상승.",
        treat: "치료: <b>Vitamin B12 보충 (parenteral or oral high-dose)</b>. 철분 결핍 평가. Gastric cancer risk 추적. 위염 자체의 근본 '치료'는 현재 없음.",
        note: "H. pylori 제균이나 PPI가 autoimmune gastritis의 원인치료가 아닙니다. B12/iron 보충이 핵심."
      },
      d: {
        title: "Patient D — Functional Dyspepsia (의심)",
        cause: "원인: <b>구조적 이상 없음 — Functional Dyspepsia 가능성</b>",
        mech: "기전: H. pylori negative, NSAID 없음, 자가면역 없음. Dyspeptic symptom이 있지만 내시경 이상 없음 → visceral hypersensitivity, gastric motility 이상 등 functional mechanism 가능.",
        treat: "치료: ① H. pylori가 있다면 test-and-treat 전략 ② 생활습관 조정 ③ PPI는 제한적 효과 가능 ④ 필요 시 prokinetics",
        note: "이 환자에서 막연하게 '위염 때문에'라고 설명하는 것은 부정확합니다. Functional dyspepsia는 별도의 개념."
      }
    };

    root.querySelectorAll(".cd__pt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".cd__pt").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var d = CD_DATA[btn.getAttribute("data-cd")];
        if (!d) return;
        if (resultEl) resultEl.innerHTML =
          "<div style='padding:14px;border-radius:10px;background:var(--surface-2);'>" +
          "<b style='font-size:15px;'>" + d.title + "</b><br><br>" +
          "<div style='margin-bottom:6px;'>🎯 " + d.cause + "</div>" +
          "<div style='margin-bottom:6px;color:var(--ink-soft);font-size:13px;'>⚙️ " + d.mech + "</div>" +
          "<div style='margin-bottom:6px;'>💊 " + d.treat + "</div>" +
          "<div style='font-size:12.5px;color:var(--ink-faint);border-top:1px solid var(--line);padding-top:6px;margin-top:6px;'>📝 " + d.note + "</div>" +
          "</div>";
      });
    });
  }

})();
