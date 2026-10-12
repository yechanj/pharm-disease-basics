# 약사를 위한 질병 기본교양 — 교재 제작 규칙

## 기술 스택
- 순수 HTML/CSS/Vanilla JS — 외부 라이브러리 없음
- 모바일 우선 반응형

## 파일 구조
```
index.html                  허브 페이지 (강의 카드 자동 생성)
lessons/core/NN.html        Core Disease 강의
lessons/everyday/NN.html    Everyday Disease 강의
assets/css/styles.css       공통 스타일 + 강의별 컴포넌트 CSS
assets/js/main.js           모든 JS (DOMContentLoaded 단일 블록)
assets/data/lessons.js      강의 메타데이터 (PHARM_LESSONS 배열)
```

---

## 강의 HTML 구조 규칙

### 섹션 순서 (Core 기준)
오늘의 질문(00) → 한 문장으로(01) → 정상 생리 → 병태생리 → 진단 → 치료 전체 → 생활습관/비약물 → 약물 각론 → Deep Dive → 비교표 → FAQ → 팩트체크 → Case Study → Final Quiz → 30초 Summary

Everyday Disease는 더 가볍게: 오늘의 상황 → 증상/병태생리 → 진단·감별 → 치료 → 집에서 할 것 → Red Flags → 예방 → FAQ → Myth vs Fact → Deep Dive → Case → Quiz → Summary

### 필수 컴포넌트
- **Opening case**: `data-case-options` + `button[data-opt]` + `data-case-bridge` 패턴 (Core) 또는 `data-infochips` + `.checkchips` 패턴 (Everyday)
- **Active Recall MCQ**: `.mcq[data-answer="X"]` + `li[data-opt]` + `.answer.mcq-exp`
- **FAQ**: `.faq` > `.faq__item` > `.faq__q` + `.faq__a` (아코디언)
- **Factcheck**: `.factcheck` > `.fc-item` > `.fc-claim` + `.fc-verdict` + `.fc-exp`
- **Case reveal**: `.qcard` > `.reveal-btn` + `.answer`
- **30초 Summary**: `.eightcards` > `.factcard` > `span.n` + `p` (8장 카드)
- **Quick Review 패널**: `.quickrev` + `.quickrev__btn` + `.quickrev__panel` + `.qr-row`
- **페이지 끝**: `section.closing` (한 문장 정리 + 다음 강의) → `nav.bottomnav` → `.quickrev`

### 공용 레이아웃 클래스 (새로 지어내지 말고 이것을 사용)
- 시각화 틀: `.figure` > `.figure__title` + 내용 + `.figure__cap`
- 2단 비교: `.twopanel` > `.panel.panel--normal` / `.panel.panel--drug` (제목은 `h5`)
- 표: `.table-scroll` > `table.data`
- 세로 단계: `.timeline-v` > `.tv__item`(강조는 `.tv__item--key`) > `.tv__dot` + `.tv__content` > `.tv__label` + `p`
- 팩트체크 판정: `.fc-verdict.wrong` / `.fc-verdict.partial`
- 버튼: `.btn`, `.btn--ghost`
- 새 강의는 **직전 강의 HTML을 먼저 읽고** 같은 마크업을 따른다

### 인터랙티브 시각화
- 컨테이너에 `data-*` attribute 부여 → JS `init*()` 함수에서 `querySelector("[data-xxx]")`로 연결
- 강의마다 CSS 클래스 prefix(네임스페이스) 부여 (예: `gs__`, `hpj__`, `arb__`, `fls__`)
- 터치/클릭 이벤트만 사용 (drag-and-drop 안 씀)

---

## JS 규칙

### DOMContentLoaded 블록
- 모든 `init*()` 호출을 단일 블록에 모음
- 새 강의 함수는 기존 강의 블록 **앞에** 추가 (최신 강의가 위쪽)
- 섹션 주석으로 구분: `// Core 12 · GERD`

### init 함수 패턴
```js
function initXxx() {
  var wrap = document.querySelector("[data-xxx]");
  if (!wrap) return;  // 해당 페이지에 없으면 조용히 종료
  // ...
}
```

### 문법 검증
새 강의 추가 후 반드시 확인:
```
node -e "var fs=require('fs'); var js=fs.readFileSync('assets/js/main.js','utf8'); try{new Function(js);console.log('OK');}catch(e){console.error(e.message);}"
```

### 클래스 검증
HTML에 쓴 class가 styles.css에 실제로 있는지 확인 (없는 클래스는 무스타일로 렌더링됨 — 문법 검사로는 안 잡힘):
```
node -e "var fs=require('fs'),h=fs.readFileSync('lessons/core/NN.html','utf8'),c=fs.readFileSync('assets/css/styles.css','utf8'),s={};(h.match(/class=\"[^\"]+\"/g)||[]).forEach(function(m){m.slice(7,-1).split(/\s+/).forEach(function(k){s[k]=1})});console.log(Object.keys(s).filter(function(k){return c.indexOf('.'+k)<0}).join(', '))"
```
`mcq-exp`, `case-box`는 CSS 정의가 없어도 정상 (JS 훅·의미용 클래스).

---

## CSS 규칙
- 새 강의 컴포넌트 CSS는 `styles.css` **끝에 추가**
- 강의별 prefix로 충돌 방지 (Core 11: `gs__`, `hpj__` / Core 12: `arb__`, `rfm__` / Core 15: `cst__` / Everyday 03: `fls__`, `wvi__`, `nrt__`, `hyg__`, `ors__`, `tfl__`, `lpc__`)
- CSS 변수 적극 활용: `var(--brand)`, `var(--brand-soft)`, `var(--surface)`, `var(--surface-2)`, `var(--line)`, `var(--ink-soft)`, 상태색 `var(--ok)`/`var(--ok-soft)`, `var(--mid)`/`var(--mid-soft)`, `var(--hi)`/`var(--hi-soft)`
- `--ok-color`, `--bg-card`는 **정의되어 있지 않음** — 사용 금지

---

## 콘텐츠 스타일 규칙

### 교수 철학
모든 강의는 **"오해를 깨는 것"으로 시작**. 예: "속쓰림 = 위산 과다 아님", "설사 = 멈춰야 함 아님".
흐름: 정상 생리 → 무엇이 망가지나 → 왜 위험한가 → 약이 무엇을 건드리나

### 카드/콜아웃 색상 의미
- `.card--key` (파랑): 핵심 개념·원칙
- `.card--pharm` (초록/테마컬러): 약사 관점·임상 적용
- `.card--caution` (빨강): 주의·금기·위험

### lessons.js `desc` 필드
문자열 안에 큰따옴표 포함 시 반드시 이스케이프: `\"텍스트\"` — 이스케이프 없으면 허브 페이지 전체가 로드되지 않음

---

## 하지 말 것
- **퀴즈 JSON 파일 생성 금지** (`assets/data/questions/core-NN.json` 등) — 나중에 일괄 생성 예정
- **`assets/data/questions/index.json` 수정 금지**
- 강의별 외부 폰트·라이브러리 추가 금지
