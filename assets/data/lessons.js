/* =========================================================
   강의 메타데이터
   - 새 강의 추가: PHARM_LESSONS 배열에 항목 한 줄 등록
   - category 는 "core" 또는 "everyday"
   - no 는 해당 카테고리(폴더) 안에서의 순번
   ========================================================= */
window.PHARM_CATEGORIES = [
  {
    id: "core",
    name: "Core Disease",
    ko: "핵심 만성질환",
    desc: "약국·병원에서 가장 자주 만나는 만성질환. 병태생리부터 약물 선택까지 깊게 이해합니다.",
    icon: "🫀"
  },
  {
    id: "everyday",
    name: "Everyday Disease",
    ko: "일상적인 질환",
    desc: "감기·두통·소화불량처럼 일상에서 흔히 접하고 상담하게 되는 질환을 다룹니다.",
    icon: "🩹"
  }
];

window.PHARM_LESSONS = [
  {
    no: 1,
    category: "core",
    href: "lessons/core/01.html",
    title: "고혈압",
    desc: "혈압 ≈ Cardiac Output × Vascular Resistance라는 지도로 고혈압의 구조를 이해하고, 무증상인데도 치료하는 이유, 진단 기준 차이(대한고혈압학회·ESC·ACC/AHA), 생활습관과 6대 혈압약이 무엇을 건드리는지까지.",
    tags: ["혈압 생리", "RAAS", "약물 지도", "진단 기준", "약사 상담"],
    status: "ready"
  },
  {
    no: 2,
    category: "core",
    href: "lessons/core/02.html",
    title: "당뇨병",
    desc: "“단 걸 많이 먹어서 생기는 병”이라는 오해를 넘어, 정상 혈당 조절 → insulin resistance·β-cell dysfunction → 진단(HbA1c) → 합병증 → 약이 어느 장기를 고치는가를 하나의 모델로. 저혈당 위험까지.",
    tags: ["혈당 생리", "Insulin resistance", "HbA1c", "약물 장기지도", "저혈당"],
    status: "ready"
  },
  {
    no: 3,
    category: "core",
    href: "lessons/core/03.html",
    title: "이상지질혈증",
    desc: "“LDL은 나쁘고 HDL은 좋다”를 넘어, 지질이 왜 lipoprotein에 실려 다니고 → LDL이 왜 동맥벽을 망가뜨리며 → non-HDL·apoB·Lp(a)로 무엇을 읽고 → statin·ezetimibe·PCSK9이 어디에 작용하는지를 하나의 흐름으로.",
    tags: ["lipoprotein", "동맥경화", "LDL/non-HDL", "statin 기전", "ASCVD 위험"],
    status: "ready"
  },
  {
    no: 4,
    category: "core",
    href: "lessons/core/04.html",
    title: "비만",
    desc: "“덜 먹고 많이 움직이면 된다”를 넘어, 에너지 균형 → 뇌의 식욕 조절(leptin·ghrelin·GLP-1) → 지방조직 기능 이상 → 합병증 → 감량 후 보상반응 → 비만치료제(GLP-1/GIP·NB·PT·orlistat)가 건드리는 시스템까지.",
    tags: ["에너지 균형", "식욕 조절", "내장지방", "BMI 한계", "비만치료제"],
    status: "ready"
  },
  {
    no: 5,
    category: "core",
    href: "lessons/core/05.html",
    title: "대사증후군",
    desc: "앞 4강(고혈압·당뇨·이상지질혈증·비만)을 하나로 묶는 통합 강의. 복부비만+insulin resistance라는 공통 뿌리, 5개 중 3개 진단의 의미(위험은 연속적), LDL이 기준에 없는 이유, CKM continuum, 그리고 ‘전용 약이 없는’ 요소별 치료까지.",
    tags: ["통합", "insulin resistance", "5개 중 3개", "CKM", "요소별 치료"],
    status: "ready"
  },
  {
    no: 6,
    category: "core",
    href: "lessons/core/06.html",
    title: "지방간 (MASLD)",
    desc: "술이 아니라 대사 이상이 만드는 지방간. 간 지방대사의 균형(FFA·DNL vs 산화·VLDL) → insulin resistance → steatosis vs MASH → 왜 fibrosis가 예후의 핵심인지 → FIB-4 단계적 진단 → 체중·대사 관리와 resmetirom·semaglutide까지.",
    tags: ["MASLD/MASH", "간 지방대사", "섬유화", "FIB-4", "resmetirom"],
    status: "ready"
  },
  {
    no: 7,
    category: "core",
    href: "lessons/core/07.html",
    title: "통풍 (Gout)",
    desc: "“요산이 높은 병”을 넘어 Hyperuricemia → Crystal deposition → Gout flare의 3단계로 이해하고, 급성 염증 끄기(NSAID·colchicine·steroid)와 장기적으로 결정을 녹이는 요산저하치료(allopurinol·treat-to-target)를 혼동하지 않게. HLA-B*58:01·ULT 초기 발작까지.",
    tags: ["요산/결정/염증", "colchicine", "allopurinol", "treat-to-target", "HLA-B*58:01"],
    status: "ready"
  },
  {
    no: 8,
    category: "core",
    href: "lessons/core/08.html",
    title: "동맥경화",
    desc: "고혈압·당뇨·이상지질혈증·비만이 결국 만나는 동맥벽. LDL(apoB)의 retention → foam cell → plaque → rupture → 혈전으로 이어지는 흐름, ‘많이 좁아야 위험’이라는 오해, stable vs vulnerable plaque, CAC의 의미, statin과 antiplatelet의 역할 차이까지.",
    tags: ["apoB retention", "foam cell/plaque", "rupture→혈전", "CAC", "statin vs 항혈소판"],
    status: "ready"
  },
  {
    no: 9,
    category: "core",
    href: "lessons/core/09.html",
    title: "협심증과 심근경색",
    desc: "제8강 동맥경화 plaque가 만들어진 다음. 심근 O₂ 공급과 수요의 불균형 → stable angina, plaque rupture + 혈전 → ACS(UA·NSTEMI·STEMI)의 흐름을 이해하고, troponin·ECG의 역할, 'Time is muscle', nitroglycerin·aspirin·P2Y12·statin의 각자 다른 목표까지.",
    tags: ["O₂ 균형", "stable vs ACS", "troponin", "DAPT", "reperfusion"],
    status: "ready"
  },
  {
    no: 10,
    category: "core",
    href: "lessons/core/10.html",
    title: "뇌졸중",
    desc: "제9강 심근경색과 같은 혈관 사고이지만 이번엔 뇌. 허혈성(막힘)과 출혈성(터짐)의 치료 방향이 반대라는 것, ischemic penumbra와 Time is Brain, 4.5시간 IV thrombolysis·LVO에서 thrombectomy, 그리고 재발예방에서 원인에 따라 antiplatelet vs anticoagulant를 구분하는 것까지.",
    tags: ["허혈성 vs 출혈성", "penumbra", "BE-FAST", "thrombolysis", "antiplatelet vs anticoagulant"],
    status: "ready"
  },
  {
    no: 11,
    category: "core",
    href: "lessons/core/11.html",
    title: "위염",
    desc: "\"속쓰림 = 위산 과다\"라는 단순 공식을 깨는 강의. 정상 위 점막 방어기전(prostaglandin·mucus·bicarbonate)이 무너지는 세 가지 길 — H. pylori·NSAID·자가면역 — 과 Correa cascade, 그리고 PPI가 왜 위염의 원인치료가 아닌지까지.",
    tags: ["점막 방어", "H. pylori / Correa cascade", "NSAID gastropathy", "autoimmune / B12", "PPI·P-CAB·제균"],
    status: "ready"
  },
  {
    no: 12,
    category: "core",
    href: "lessons/core/12.html",
    title: "위식도역류질환 (GERD)",
    desc: "\"역류성 식도염 = 위산 과다\"를 깨는 강의. LES·TLESR·횡격막의 역류 방어 시스템, 내시경이 정상인데도 GERD인 NERD, PPI가 식전에 효과적인 이유, P-CAB과의 차이, refractory GERD 평가 흐름까지. 2025 Seoul update 반영.",
    tags: ["역류 방어 시스템", "TLESR / NERD", "PPI 타이밍", "P-CAB", "Barrett esophagus"],
    status: "ready"
  },
  {
    no: 3,
    category: "everyday",
    href: "lessons/everyday/03.html",
    title: "급성 장염·감염성 설사",
    desc: "\"설사를 멈추는 것보다 탈수를 막는 것이 먼저.\" 물설사와 혈변을 동반한 설사의 구별, ORS와 SGLT1 원리, Loperamide를 피해야 하는 경우, STEC와 HUS, 노로바이러스 예방까지. 장염 상담의 순서: 탈수 → 혈변·발열 → 위험요인 → 약물.",
    tags: ["탈수·ORS", "Watery vs Inflammatory", "Loperamide 금기", "STEC·HUS", "노로바이러스"],
    status: "ready"
  },
  {
    no: 1,
    category: "everyday",
    href: "lessons/everyday/01.html",
    title: "감기 (Common Cold)",
    desc: "감기를 하나의 바이러스가 아닌 상기도 바이러스 감염으로 이해하고, 독감·알레르기비염·부비동염 감별, 콧물 색과 항생제, 증상별 감기약 선택, 그리고 ‘그냥 감기’로 넘기면 안 되는 Red Flag까지.",
    tags: ["상기도 감염", "감별진단", "항생제 X", "증상별 약", "Red Flag"],
    status: "ready"
  },
  {
    no: 2,
    category: "everyday",
    href: "lessons/everyday/02.html",
    title: "독감 (Influenza)",
    desc: "감기와의 증상 패턴 구별, 항바이러스제를 빨리 고려해야 하는 사람, ‘48시간이 지났으니 소용없다’는 오해 교정, 고위험군·전염 시기·2026–2027절기 예방접종, 폐렴 등 합병증 Red Flag까지.",
    tags: ["influenza", "항바이러스제", "48시간 오해", "고위험군", "예방접종"],
    status: "ready"
  }
];

/* ---------- 허브 렌더링 ---------- */
(function () {
  function lessonCard(l) {
    var ready = l.status === "ready";
    var tags = (l.tags || []).map(function (t) { return "<span class='lc-tag'>" + t + "</span>"; }).join("");
    var statusTxt = ready ? "학습 시작 →" : "준비 중";
    var cls = "lesson-card" + (ready ? "" : " disabled");
    var href = ready ? l.href : "#";
    return (
      "<a class='" + cls + "' href='" + href + "'>" +
        "<div class='lc-no'>제" + l.no + "강</div>" +
        "<h3>" + l.title + "</h3>" +
        "<p>" + l.desc + "</p>" +
        (tags ? "<div class='lc-tags'>" + tags + "</div>" : "") +
        "<div class='lc-status'>" + statusTxt + "</div>" +
      "</a>"
    );
  }

  function emptyCard(cat) {
    return (
      "<div class='lesson-card disabled'>" +
        "<div class='lc-no'>준비 중</div>" +
        "<h3>곧 추가됩니다</h3>" +
        "<p>" + cat.name + " 강의가 순차적으로 업로드됩니다.</p>" +
        "<div class='lc-status'>준비 중</div>" +
      "</div>"
    );
  }

  window.PHARM_renderHub = function (folderSel, gridSel) {
    var folderMount = document.querySelector(folderSel);
    var gridMount = document.querySelector(gridSel);
    if (!folderMount || !gridMount) return;
    var cats = window.PHARM_CATEGORIES || [];
    var lessons = window.PHARM_LESSONS || [];

    function countReady(id) {
      return lessons.filter(function (l) { return l.category === id && l.status === "ready"; }).length;
    }

    // 폴더 선택 카드
    folderMount.innerHTML = cats.map(function (c) {
      var n = countReady(c.id);
      var badge = n > 0 ? (n + "개 강의") : "준비 중";
      return (
        "<button class='folder-card' data-cat='" + c.id + "' type='button'>" +
          "<div class='folder-card__ico'>" + c.icon + "</div>" +
          "<div class='folder-card__body'>" +
            "<div class='folder-card__name'>" + c.name + "</div>" +
            "<div class='folder-card__ko'>" + c.ko + "</div>" +
            "<p>" + c.desc + "</p>" +
            "<span class='folder-card__badge'>" + badge + "</span>" +
          "</div>" +
        "</button>"
      );
    }).join("");

    function renderGrid(catId) {
      var cat = cats.filter(function (c) { return c.id === catId; })[0];
      var items = lessons.filter(function (l) { return l.category === catId; })
        .sort(function (a, b) { return a.no - b.no; });
      var cards = items.length ? items.map(lessonCard).join("") : emptyCard(cat || { name: "" });
      gridMount.innerHTML =
        "<div class='grid-head'><span class='grid-head__ico'>" + (cat ? cat.icon : "") + "</span>" +
        "<span>" + (cat ? cat.name + " · " + cat.ko : "") + "</span></div>" +
        "<div class='lesson-grid'>" + cards + "</div>";
      folderMount.querySelectorAll(".folder-card").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-cat") === catId);
      });
    }

    folderMount.querySelectorAll(".folder-card").forEach(function (b) {
      b.addEventListener("click", function () { renderGrid(b.getAttribute("data-cat")); });
    });

    // 기본 선택: core
    renderGrid((cats[0] || {}).id || "core");
  };
})();
