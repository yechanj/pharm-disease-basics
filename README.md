# 약사를 위한 질병 기본교양

약사를 위한 질병 기본교양 학습용 웹 교재. 질병을 증상 암기가 아니라
**정상 생리 → 무엇이 잘못되나 → 왜 위험한가 → 약이 무엇을 건드리나**의 흐름으로 이해합니다.

- 순수 HTML/CSS/JS · 외부 라이브러리 없음
- 모바일(출퇴근) 열람 최적화 · 인터랙티브 시각화 포함
- GitHub Pages로 호스팅

## 강의
- 제1강 · 고혈압 — 혈압 ≈ CO × SVR, RAAS, 진단 기준(대한고혈압학회·ESC·ACC/AHA), 생활습관, 6대 혈압약 지도

## 구조
```
index.html            메인 허브 (강의 카드 자동 생성)
lessons/lesson-0N.html 개별 강의
assets/css/styles.css  공통 디자인 시스템 + 강의별 컴포넌트
assets/js/main.js      공통 인터랙션(사이드바·퀴즈·시뮬레이터 등)
assets/data/lessons.js 강의 메타데이터
assets/fonts/          SCDream · omyu pretty
```

## 새 강의 추가 방법
1. `lessons/lesson-0N.html` 추가 (기존 강의 구조 복사)
2. `assets/data/lessons.js`의 `PHARM_LESSONS` 배열에 항목 한 줄 등록

## 로컬 확인
정적 파일이므로 브라우저로 `index.html`을 열면 됩니다. (권장: 로컬 서버)
```
python -m http.server 8000
```

## 콘텐츠 주의
학습·교육용 자료이며 특정 환자의 진단·처방을 대체하지 않습니다. 실제 임상 판단은 최신 지침과 개별 임상상황을 따릅니다.
