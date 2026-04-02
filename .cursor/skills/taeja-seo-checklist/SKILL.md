---
name: taeja-seo-checklist
description: Applies taeja-world Next.js SEO checklist: metadata, sitemap, robots, OG, canonical, JsonLd. Use when adding public routes, marketing pages, community or news surfaces, or the user says SEO, 색인, 구글, 네이버, 사이트맵, 메타태그.
---

# 태자월드 SEO 체크리스트

## 새 공개 라우트·페이지를 만들 때

1. **`generateMetadata`**  
   - `title` / `description` (i18n이면 `getDictionary` 패턴 유지).  
   - **`alternates.canonical`**: `absoluteUrl('/해당/경로')` (`src/lib/seo/site.ts`).  
   - **`robots`**: 기본 색인이 맞으면 `index: true, follow: true` 명시(다른 공개 페이지와 동일). 로그인 전용·중복이면 `noindex` 근거를 주석으로.

2. **소셜 미리보기**  
   - 허브급이면 `app/community/boards/page.tsx` 처럼 **`openGraph` + `twitter`**(이미지는 절대 URL).

3. **사이트맵**  
   - URL이 **크롤 가치가 있으면** `app/sitemap.ts`에 추가(정적 배열 또는 DB 조회).  
   - 우선순위·`changeFrequency`는 기존 항목과 톤 맞춤.  
   - ISR/캐시가 필요하면 파일 상단 **`revalidate`** 검토.

4. **robots**  
   - 양식·필터 난립·세션형 URL은 `app/robots.ts` **`disallow`** 검토.

5. **구조화 데이터**  
   - 기사·조직 등 해당되면 **`JsonLd`** + 스키마 타입 점검 (필수 속성 누락 금지).

## 변경 후 빠른 확인

- 프로덕션 빌드 또는 스테이징에서 **페이지 소스**에 canonical·title·description 존재 여부.  
- `/sitemap.xml`, `/robots.txt` 응답이 **`getSiteBaseUrl()`** 과 같은 호스트를 가리키는지.

## 하지 말 것

- `metadataBase` / `NEXT_PUBLIC_SITE_URL` / 하드코딩 도메인 **서로 다른 값**으로 두기.  
- 가치 있는 목록·상세에 **이유 없는 `noindex`**.  
- 사이트맵에만 넣고 **robots가 막거나**, 반대로 **공개인데 사이트맵 누락**만 두고 끝내기(의도가 있으면 문서화).
