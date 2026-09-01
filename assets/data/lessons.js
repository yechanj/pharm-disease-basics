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
