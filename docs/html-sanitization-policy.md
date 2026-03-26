# HTML Sanitization Policy (Rich Text)

이 문서는 티켓/게시판 Rich Text의 XSS 방어 정책입니다.  
클라이언트 렌더링 전 정제 + 서버 저장 전 정제를 함께 적용합니다(이중 방어).

## 적용 위치

- 클라이언트 공통 sanitizer: `client/src/lib/sanitizeHtml.ts`
- 티켓 상세 렌더링: `client/src/pages/TicketDetailPage.tsx`
- 게시판 상세 렌더링: `client/src/pages/BoardDetailPage.tsx`
- 서버 공통 sanitizer: `server/src/utils/sanitizeHtml.js`
- 서버 저장 시점 적용:
  - `server/src/routes/boardRoutes.js` (`POST`, `PUT`)
  - `server/src/routes/ticketRoutes.js` (`POST`, `PUT`, 댓글 저장 포함 기존 sanitizeHtml 경로)

## 허용 태그 (Allowlist)

- 문단/레이아웃: `p`, `br`, `div`, `span`
- 강조: `strong`, `b`, `em`, `i`, `u`, `s`
- 인용/코드: `blockquote`, `code`, `pre`
- 제목: `h1` ~ `h6`
- 목록: `ul`, `ol`, `li`
- 링크/이미지: `a`, `img`

## 허용 속성 (Allowlist)

- 링크: `href`, `target`, `rel`, `title`
- 이미지: `src`, `alt`, `title`

그 외 속성(`on*` 이벤트, 임의 속성, `style`, `data-*`)은 제거됩니다.

## URL 정책

- 허용 프로토콜: `http:`, `https:`, `mailto:`, `tel:`
- 상대 경로(`/...`)와 앵커(`#...`) 허용
- 그 외 스킴(`javascript:`, `data:` 등)은 제거

## 차단 태그

다음 태그는 컨텐츠/실행 위험으로 제거합니다.

- `script`, `style`, `iframe`, `object`, `embed`, `form`

## 에디터 확장 시 체크리스트

1. 새 노드/마크 추가 전, 본 문서의 허용 태그/속성에 반영
2. 클라이언트 sanitizer와 서버 sanitizer를 **동시에** 업데이트
3. `dangerouslySetInnerHTML` 직전에 공통 sanitizer 적용 여부 확인
4. 링크/이미지 관련 속성 추가 시 URL 정책(허용 스킴) 재검토
5. 코드블록(`pre`, `code`) 확장 시 `class` 등 새 속성을 허용해야 한다면 보안 검토 후 최소 허용
