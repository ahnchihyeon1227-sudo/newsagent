# Steering: Briefing Agent

이 문서는 Briefing Agent의 실행 제약, 도구 사용 정책, 사람 개입 조건, 출력 규칙, 재시도 규칙을 정의한다.

---

## 비용 제약

- 1회 실행당 AWS Bedrock(Claude 3 Haiku) 입력 + 출력 토큰 합계는 **50,000 토큰 미만**으로 유지한다.
- 누적 토큰 사용량이 **40,000 토큰에 도달**하면 다음 로그를 출력한다:
  ```
  WARNING: 누적 토큰 사용량이 40,000에 도달했습니다. 현재: {current_tokens}
  ```
- 누적 토큰이 **50,000을 초과**하면 즉시 실행을 중단하고 다음 메시지를 출력한다:
  ```
  ERROR: 토큰 한도(50,000)를 초과했습니다. 실행을 중단합니다.
  ```
- 토큰 체크는 scorer 호출 직후, summarizer 호출 직후 총 2회 수행한다.

---

## 도구 화이트리스트

| 도구 | 허용 여부 |
|------|-----------|
| AWS Bedrock (Claude 3 Haiku) | ✅ 허용 |
| Google News RSS (feedparser) | ✅ 허용 |
| 로컬 파일시스템 (읽기/쓰기) | ✅ 허용 |
| 그 외 외부 API | ❌ 무단 추가 금지 |

외부 API를 추가하려면 이 문서를 먼저 수정하고 승인을 받아야 한다.

---

## 사람 개입 조건 (Human-in-the-loop)

| 조건 | 동작 |
|------|------|
| `keywords`가 빈 배열 | 즉시 실행 중단. 표준 출력에 `ERROR: 키워드가 없습니다` 출력 |
| 수집 기사 0건 | 브리핑 생성 중단. 표준 출력에 `[-] No articles found. Aborting.` 출력 |
| 관심도 3점 미만 기사가 전체의 70% 초과 | `WARNING: 관련 기사가 적습니다` 출력 후 **계속 진행** (중단하지 않음) |

---

## 출력 규칙

- 기사 원문을 그대로 복사하는 것을 **금지**한다. 반드시 요약 형태로만 출력한다.
- 출력 파일명은 반드시 `briefing_YYYYMMDD.md` 형식을 따른다 (예: `briefing_20250428.md`).
- 메타데이터 헤더(`Generated At`, `Total Collected`, `Filtered Out`, `Estimated Tokens`)는 모든 브리핑 파일의 **최상단**에 위치해야 한다.
- `Generated At` 시각은 **KST(UTC+9)** 기준으로 기록한다.
- 요약은 2문장 이상으로 작성한다.

---

## 재시도 규칙

- Google News RSS 파싱 실패 시 **최대 2회 재시도**한다.
  - 1차 실패 후 1초 대기 후 재시도
  - 2회 모두 실패 시 다음 메시지를 출력하고 `None`을 반환한다:
    ```
    ERROR: NewsAPI 호출에 실패했습니다. 재시도 횟수 초과.
    ```
- AWS Bedrock 호출 실패는 재시도하지 않으며, 기본값(스코어 3, 오류 요약 문자열)을 사용한다.

---

## keyword_operators 규칙

- 입력 JSON에 `keyword_operators` 필드가 없거나 길이가 맞지 않으면 기본값 `OR`을 사용한다.
- 허용 값: `"OR"`, `"AND"`
- 예시: `keywords: ["AI", "반도체", "애플"]` + `keyword_operators: ["OR", "AND"]` → 쿼리: `AI OR 반도체 AND 애플`
