# Design: Briefing Agent

## 전체 처리 흐름

```
입력 JSON (test-input/case-N.json)
        │
        ▼
  [main.py] 파싱 & 유효성 검사
        │  keywords 빈 배열 → "ERROR: 키워드가 없습니다" 출력 후 종료
        ▼
  [fetcher.py] Google News RSS 기사 수집 (feedparser)
        │  파싱 실패 → 최대 2회 재시도 → 실패 시 None 반환 → 종료
        │  수집 결과 0건 → "[-] No articles found." 출력 후 종료
        ▼
  [scorer.py] AWS Bedrock (Claude 3 Haiku) 관심도 스코어링
        │  전체 기사 배치 1회 호출 → 정수 배열 반환
        │  호출 실패 시 기본값 score=3 적용
        │  token_counter 누적
        ▼
  [main.py] check_tokens() — 40,000 WARNING / 50,000 초과 시 중단
        │
        ▼
  [main.py] URL 기준 중복 제거
        │
        ▼
  [main.py] score < 3 기사 필터링
        │  필터링 비율 > 70% → "WARNING: 관련 기사가 적습니다" 출력 후 계속
        │  필터링 후 0건 → "[-] All articles filtered out." 출력 후 종료
        ▼
  [summarizer.py] AWS Bedrock (Claude 3 Haiku) 기사별 요약 생성
        │  기사별 개별 호출 (max_tokens=300)
        │  호출 실패 시 기본 오류 문자열 삽입
        │  token_counter 누적
        ▼
  [main.py] check_tokens() — 40,000 WARNING / 50,000 초과 시 중단
        │
        ▼
  [writer.py] 메타데이터 계산 + 마크다운 파일 생성 (KST 기준 시각)
        │
        ▼
출력: briefing_YYYYMMDD.md
```

---

## 모듈별 역할 및 인터페이스

### `main.py`
- **역할**: 전체 파이프라인 오케스트레이션, 입력 파싱, 중복 제거, 필터링, 토큰 체크, 경고 출력
- **입력**: CLI 인자 `--input <path>` 또는 positional arg로 JSON 파일 경로
- **처리**: 각 모듈 순서대로 호출, 에러/경고 조건 판단, `token_counter` dict 공유
- **반환**: 없음 (파일 생성 및 stdout 출력)

### `agent/fetcher.py` — `NewsFetcher`
- **역할**: Google News RSS를 feedparser로 파싱하여 기사 목록 수집. API 키 불필요.
- **입력**: `keywords: list[str]`, `max_articles: int`, `keyword_operators: list[str] | None`
- **동작**: keywords를 `keyword_operators`(기본 OR)로 결합 → URL 인코딩 → Google News RSS 요청
- **반환**: `list[dict]` (성공) / `None` (2회 모두 실패)
- **에러 처리**: 1차 실패 후 1초 대기 후 재시도. 2회 실패 시 에러 메시지 출력 후 `None` 반환

### `agent/scorer.py` — `NewsScorer`
- **역할**: AWS Bedrock(Claude 3 Haiku)으로 전체 기사의 키워드 관련도를 배치 스코어링
- **입력**: `articles: list[dict]`, `keywords: list[str]`
- **동작**: 전체 기사 제목+설명을 하나의 프롬프트로 묶어 1회 호출 → 정수 배열 파싱
- **반환**: `list[dict]` — 각 article에 `score: int` 필드 추가
- **에러 처리**: 호출 실패 또는 파싱 실패 시 모든 기사에 기본값 `score=3` 적용
- **토큰**: `input_tokens + output_tokens`를 `token_counter['total']`에 누적

### `agent/summarizer.py` — `NewsSummarizer`
- **역할**: AWS Bedrock(Claude 3 Haiku)으로 각 기사를 지정 언어로 2~3문장 요약
- **입력**: `articles: list[dict]`, `lang: str` (예: `"ko"`)
- **동작**: 기사별 개별 호출 (max_tokens=300)
- **반환**: `list[dict]` — 각 article에 `summary: str` 필드 추가
- **에러 처리**: 호출 실패 시 기본 오류 문자열(`"요약을 생성할 수 없습니다."`) 삽입
- **토큰**: `input_tokens + output_tokens`를 `token_counter['total']`에 누적

### `agent/writer.py` — `BriefingWriter`
- **역할**: 최종 Article 목록을 마크다운 파일로 직렬화. 시각은 KST(UTC+9) 기준.
- **입력**: `articles: list[dict]`, `date_str: str`, `total_collected: int`, `filtered_count: int`, `total_tokens: int`
- **반환**: `str` — 생성된 파일명 (`briefing_YYYYMMDD.md`)

---

## Article 객체 필드 목록

모듈 간 전달되는 Article dict의 필드:

| 필드명 | 타입 | 출처 | 설명 |
|--------|------|------|------|
| `title` | str | Google News RSS | 기사 제목 |
| `url` | str | Google News RSS | 기사 원문 URL (중복 제거 키) |
| `source` | dict | Google News RSS | `{"name": "출처명"}` |
| `description` | str | Google News RSS | RSS summary 필드 |
| `content` | str | Google News RSS | RSS summary 필드 (description과 동일) |
| `publishedAt` | str | Google News RSS | 발행 일시 (RFC 2822) |
| `score` | int | scorer | Bedrock 관심도 스코어 (0~10) |
| `summary` | str | summarizer | Bedrock 생성 요약 (2문장 이상) |

---

## 에러 분기 흐름

```
keywords == [] ?
  YES → print("ERROR: 키워드가 없습니다") → sys.exit(0)
  NO  → 계속

fetcher.fetch() 결과 == None ?
  YES → sys.exit(1)  ← 재시도 2회 모두 실패
  NO  → 계속

fetcher.fetch() 결과 == [] ?
  YES → print("[-] No articles found. Aborting.") → sys.exit(0)
  NO  → 계속

check_tokens() — scorer 호출 후
  total > 50,000 → print("ERROR: 토큰 한도 초과") → sys.exit(1)
  total >= 40,000 → print("WARNING: 누적 토큰 40,000 도달") → 계속

(len(unique) - len(filtered)) / len(unique) > 0.7 ?
  YES → print("WARNING: 관련 기사가 적습니다") → 계속 진행
  NO  → 계속

filtered_articles == [] ?
  YES → print("[-] All articles filtered out.") → sys.exit(0)
  NO  → 계속

check_tokens() — summarizer 호출 후
  total > 50,000 → print("ERROR: 토큰 한도 초과") → sys.exit(1)
  total >= 40,000 → print("WARNING: 누적 토큰 40,000 도달") → 계속
```

---

## 출력 파일 구조

```markdown
# News Briefing - YYYY-MM-DD

**Generated At:** YYYY-MM-DD HH:MM:SS KST
**Total Collected:** N
**Filtered Out:** N
**Estimated Tokens:** N

---

### [기사 제목]
- **Source:** [출처명]
- **Score:** N/10
- **Link:** [Read More](URL)

**Summary:**
[2문장 이상 요약]

---
```
