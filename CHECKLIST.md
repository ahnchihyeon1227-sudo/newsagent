# Briefing Agent — 검증 체크리스트

실행 명령: `python main.py --input test-input/case-1.json`

---

## 정상 케이스 (case-1.json)

- [x] `briefing_YYYYMMDD.md` 파일이 현재 디렉터리에 생성되는가
- [x] 생성된 파일 최상단 헤더에 `Generated At`, `Total Collected`, `Filtered Out`, `Estimated Tokens` 4개 필드가 모두 있는가
- [ ] 브리핑 본문(헤더 제외)의 문자 수가 800자 이상 3000자 이하인가
- [x] 브리핑 본문에 기사 항목이 3개 이상 포함되는가
- [x] 각 기사 항목에 제목, 출처, 요약(2문장 이상), 관심도 스코어(0~10) 4개 필드가 있는가
- [x] 관심도 스코어 3점 미만 기사가 본문에 없는가
- [ ] `main.py` 실행 시작부터 파일 생성 완료까지 경과 시간이 60초 이내인가

---

## 실패 케이스 (case-3.json — keywords 빈 배열)

- [x] `keywords: []` 입력 시 `briefing_YYYYMMDD.md` 파일이 생성되지 않고 표준 출력에 `ERROR: 키워드가 없습니다`가 출력되는가

---

## 엣지 케이스 (case-2.json — 저관련 키워드)

- [ ] 관심도 3점 미만 기사가 전체의 70%를 초과할 때 표준 출력에 `WARNING: 관련 기사가 적습니다`가 출력되는가
