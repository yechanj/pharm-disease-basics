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
        : "<span style='color:var(--ok-color,#12a594);font-weight:700;'>✓ 균형 — 공급(" + maxSupply + ") ≥ 수요(" + dem + "). 증상 없음.</span>";
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
        verdictEl.innerHTML = "<span style='color:var(--ok-color,#12a594);font-weight:700;'>⚡ Reperfusion 시행! " + TIM_STAGES[parseInt(slider.value,10)].label + " 기준 salvage 가능 심근 약 " + s.salvage + "%</span>";
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
          result.style.borderLeft = d.cls === "ok" ? "4px solid var(--ok-color,#12a594)" : "4px solid var(--hi,#ef4444)";
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
      if (freqBar) { freqBar.style.width = freq + "%"; freqBar.style.background = freq > 60 ? "var(--hi)" : freq > 35 ? "#ff9800" : "var(--ok-color,#12a594)"; }
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
        if (riskBar) { riskBar.style.width = total + "%"; riskBar.style.background = total > 60 ? "var(--hi)" : total > 35 ? "#ff9800" : "var(--ok-color,#12a594)"; }
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
      { label: "식사 30–60분 전", left: "25%", concLeft: "25%", concW: "35%", pumpLeft: "50%", verdict: "best", msg: "<b style='color:var(--ok-color,#12a594)'>최적 타이밍 ✅</b> — 식사 30–60분 전 복용: 혈중 약물 농도 peak와 식사로 인한 proton pump activation 시점이 잘 맞습니다. 가장 효과적인 acid suppression." },
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
          resultEl.innerHTML = "<div style='padding:12px;border-radius:10px;background:var(--bg-card);'>" + OUTCOMES[outcomeKey].msg + "</div>";
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
        outputColor: "var(--ok-color,#12a594)",
        desc: "<b>H₂RA (famotidine 등)</b> — Parietal cell의 H₂ receptor를 차단합니다. Histamine-stimulated acid secretion을 줄입니다. PPI보다 acid suppression이 약하고 tolerance가 발생할 수 있습니다. 야간 acid 억제에 일부 사용됩니다."
      },
      ppi: {
        pumpHighlight: true,
        h2highlight: false,
        h2text: "",
        pumpText: "PPI 억제 ✕",
        outputText: "H⁺ 분비 크게 감소",
        outputColor: "var(--ok-color,#12a594)",
        desc: "<b>PPI (omeprazole, esomeprazole, lansoprazole, pantoprazole, rabeprazole)</b> — H⁺/K⁺-ATPase(Proton pump)를 비가역적으로 억제합니다. 세 가지 신호(histamine·gastrin·Ach)가 모두 proton pump에서 만나므로 PPI는 강력한 acid suppression을 제공합니다. Acid-activated prodrug이므로 식사 30–60분 전 복용이 효과적."
      },
      pcab: {
        pumpHighlight: true,
        h2highlight: false,
        h2text: "",
        pumpText: "P-CAB 억제 ✕",
        outputText: "H⁺ 분비 감소",
        outputColor: "var(--ok-color,#12a594)",
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
          "<div style='padding:14px;border-radius:10px;background:var(--bg-card);'>" +
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
