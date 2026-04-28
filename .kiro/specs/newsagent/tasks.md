# Tasks: Briefing Agent

## 구현 태스크 목록

---

- [x] Task 1: 입력 JSON 파싱 및 유효성 검사

  `main.py`에서 `--input` 또는 positional 인자로 전달된 JSON 파일을 읽어 `keywords`, `date`, `max_articles`, `briefing_lang`, `keyword_operators` 필드를 파싱한다. `keywords`가 빈 배열이면 `ERROR: 키워드가 없습니다`를 출력하고 즉시 종료한다.

  **Done when:** `case-3.json`(빈 keywords)으로 실행 시 브리핑 파일이 생성되지 않고 표준 출력에 `ERROR: 키워드가 없습니다`가 출력된다.

---

- [x] Task 2: Google News RSS로 키워드별 기사 수집

  `fetcher.py`의 `NewsFetcher.fetch()`가 `keywords`를 `keyword_operators`(기본 OR)로 결합하여 Google News RSS URL을 구성하고 feedparser로 파싱한다. 실패 시 최대 2회 재시도한다.

  **Done when:** 유효한 키워드로 실행 시 1개 이상의 article dict 목록이 반환된다.

---

- [x] Task 3: 중복 기사 제거

  `main.py`에서 `url` 필드를 기준으로 동일 URL의 기사를 제거하여 고유 기사 목록을 생성한다.

  **Done when:** 동일 URL을 가진 기사가 2개 이상 포함된 목록을 입력했을 때 결과 목록에 해당 URL이 1개만 존재한다.

---

- [x] Task 4: AWS Bedrock으로 관심도 스코어링

  `scorer.py`의 `NewsScorer.score_articles()`가 전체 기사 제목+설명을 하나의 프롬프트로 묶어 Bedrock(Claude 3 Haiku)에 1회 호출하고, 반환된 정수 배열을 파싱하여 각 `article['score']`에 저장한다.

  **Done when:** 반환된 article 목록의 모든 항목에 `score` 키가 존재하고 값이 0 이상 10 이하의 정수다.

---

- [x] Task 5: 3점 미만 기사 필터링

  `main.py`에서 `score < 3`인 기사를 제거한다. 필터링된 기사 비율이 전체의 70%를 초과하면 `WARNING: 관련 기사가 적습니다`를 출력하고 계속 진행한다.

  **Done when:** 필터링 후 반환된 목록의 모든 항목의 `score`가 3 이상이며, 70% 초과 조건에서 WARNING이 출력된다.

---

- [x] Task 6: AWS Bedrock으로 기사별 요약 생성

  `summarizer.py`의 `NewsSummarizer.summarize_articles()`가 각 기사의 `title`과 `description`/`content`를 Bedrock(Claude 3 Haiku)에 개별 호출하여 지정 언어(`briefing_lang`)로 2~3문장 요약을 생성하고 `article['summary']`에 저장한다.

  **Done when:** 반환된 article 목록의 모든 항목에 `summary` 키가 존재하고 값이 빈 문자열이 아니다.

---

- [x] Task 7: 메타데이터 계산 (수집 수, 필터링 수, 토큰 수)

  `main.py`에서 `token_counter` dict를 scorer와 summarizer에 공유하여 누적 토큰을 집계한다. `writer.py`의 `BriefingWriter.write()`에서 `total_collected`, `filtered_count`, `total_tokens`를 헤더에 기록한다. 시각은 KST 기준.

  **Done when:** 생성된 `.md` 파일 최상단에 `Generated At (KST)`, `Total Collected`, `Filtered Out`, `Estimated Tokens` 4개 필드가 모두 존재한다.

---

- [x] Task 8: 브리핑 마크다운 파일 생성

  `writer.py`의 `BriefingWriter.write()`가 메타데이터 헤더 + 기사 목록(제목, 출처, 스코어, 링크, 요약)을 `briefing_YYYYMMDD.md` 파일로 저장한다.

  **Done when:** 실행 후 `briefing_YYYYMMDD.md` 파일이 생성되고, 파일 내 기사 항목이 3개 이상이며 본문 길이가 800자 이상 3000자 이하다.

---

- [x] Task 9: 에러/경고 케이스 처리 검증

  AC-8(빈 keywords), AC-9(70% 초과 WARNING) 케이스를 `case-2.json`, `case-3.json`으로 실행하여 각각 올바른 메시지가 출력되는지 확인한다.

  **Done when:** `case-3.json` 실행 시 `ERROR: 키워드가 없습니다`가 출력되고 파일이 생성되지 않는다. `case-2.json` 실행 시 70% 초과 조건 충족 시 `WARNING: 관련 기사가 적습니다`가 출력된다.
