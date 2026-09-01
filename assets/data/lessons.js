/* =========================================================
   강의 메타데이터 — 새 강의 추가 시 이 배열에 한 줄만 등록하면
   메인 허브 카드가 자동 생성된다.
   ========================================================= */
window.PHARM_LESSONS = [
  {
    no: 1,
    href: "lessons/lesson-01.html",
    title: "고혈압",
    desc: "혈압 ≈ Cardiac Output × Vascular Resistance라는 지도로 고혈압의 구조를 이해하고, 무증상인데도 치료하는 이유, 진단 기준 차이(대한고혈압학회·ESC·ACC/AHA), 생활습관과 6대 혈압약이 무엇을 건드리는지까지.",
    tags: ["혈압 생리", "RAAS", "약물 지도", "진단 기준", "약사 상담"],
    status: "ready"
  },
  {
    no: 2,
    href: "#",
    title: "(준비 중)",
    desc: "다음 강의가 곧 추가됩니다.",
    tags: [],
    status: "coming"
  }
];

/* 허브 페이지에서 호출: 카드 렌더링 */
window.PHARM_renderHub = function (mountSelector) {
  var mount = document.querySelector(mountSelector);
  if (!mount || !window.PHARM_LESSONS) return;
  mount.innerHTML = window.PHARM_LESSONS.map(function (l) {
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
  }).join("");
};
