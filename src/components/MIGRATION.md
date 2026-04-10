# UI 마이그레이션 가이드

Tailwind CSS v4 + shadcn/ui 기반 새 컴포넌트 시스템.
기존 BEM CSS 컴포넌트 → 새 Tailwind 컴포넌트 점진적 교체.

## 컴포넌트 매핑

### Shell


| 기존                              | 새 컴포넌트       | 경로                                    |
| ------------------------------- | ------------ | ------------------------------------- |
| `app/_components/GlobalNav.tsx` | `SiteHeader` | `src/components/shell/SiteHeader.tsx` |
| (없음)                            | `SiteFooter` | `src/components/shell/SiteFooter.tsx` |


### Home


| 기존                              | 새 컴포넌트            | 경로                                        |
| ------------------------------- | ----------------- | ----------------------------------------- |
| `HomePageClient` (hero section) | `HeroSection`     | `src/components/home/HeroSection.tsx`     |
| `HomePageClient` (hub tiles)    | `HubTilesSection` | `src/components/home/HubTilesSection.tsx` |
| `HomePageClient` (hot strip)    | `NewsStrip`       | `src/components/home/NewsStrip.tsx`       |
| `HomePageClient` (shops)        | `FeaturedShops`   | `src/components/home/FeaturedShops.tsx`   |
| `HomePageClient` (digest)       | `DigestStrip`     | `src/components/home/DigestStrip.tsx`     |


### Auth


| 기존                  | 새 컴포넌트               | 경로                                           |
| ------------------- | -------------------- | -------------------------------------------- |
| `AuthPageShell`     | `AuthCard`           | `src/components/auth/AuthCard.tsx`           |
| (직접 input)          | `AuthFormField`      | `src/components/auth/AuthFormField.tsx`      |
| `SocialAuthButtons` | `SocialLoginButtons` | `src/components/auth/SocialLoginButtons.tsx` |


### Community


| 기존       | 새 컴포넌트                     | 경로                                        |
| -------- | -------------------------- | ----------------------------------------- |
| (게시글 목록) | `BoardLayout` + `PostCard` | `src/components/community/`               |
| (게시글 상세) | `PostDetail`               | `src/components/community/PostDetail.tsx` |
| (중고거래)   | `TradeCard`                | `src/components/community/TradeCard.tsx`  |


### Minihome


| 기존                 | 새 컴포넌트         | 경로                                         |
| ------------------ | -------------- | ------------------------------------------ |
| `MinihomeRoomView` | `MinihomeRoom` | `src/components/minihome/MinihomeRoom.tsx` |


### Local/Shops


| 기존             | 새 컴포넌트           | 경로                                    |
| -------------- | ---------------- | ------------------------------------- |
| `ShopMiniCard` | `ShopCard`       | `src/components/local/ShopCard.tsx`   |
| (shop detail)  | `ShopDetailView` | `src/components/local/ShopDetail.tsx` |


### Admin


| 기존                     | 새 컴포넌트       | 경로                                    |
| ---------------------- | ------------ | ------------------------------------- |
| `app/admin/layout.tsx` | `AdminShell` | `src/components/admin/AdminShell.tsx` |


## 디자인 토큰

### Tailwind 클래스 ↔ 기존 CSS 변수


| Tailwind 클래스           | CSS 변수                     |
| ---------------------- | -------------------------- |
| `bg-museum-coral`      | `var(--tj-museum-coral)`   |
| `bg-museum-saffron`    | `var(--tj-museum-saffron)` |
| `bg-museum-cobalt`     | `var(--tj-museum-cobalt)`  |
| `bg-museum-teal`       | `var(--tj-museum-teal)`    |
| `text-brand-tai`       | `#6d28d9`                  |
| `text-brand-ja`        | `#be185d`                  |
| `bg-tj-bg`             | `var(--tj-bg)`             |
| `bg-tj-surface`        | `var(--tj-surface)`        |
| `text-tj-ink`          | `var(--tj-ink)`            |
| `text-tj-muted`        | `var(--tj-muted)`          |
| `shadow-retro`         | `var(--tj-shadow)`         |
| `shadow-retro-saffron` | `var(--tj-shadow-saffron)` |


## 교체 순서 (권장)

1. `SiteHeader` → `app/layout.tsx`의 `GlobalNav` 교체
2. `SiteFooter` → `app/layout.tsx` children 뒤에 추가
3. Auth pages → `AuthCard` + `AuthFormField` 교체
4. Home → `HeroSection` + `HubTilesSection` + `NewsStrip` 등 조합
5. Community → `BoardLayout` + `PostCard` 교체
6. 나머지 페이지 점진적

## shadcn/ui 컴포넌트 (설치됨)

`src/components/ui/` 아래 28개:
button, card, input, textarea, badge, avatar, dialog, sheet, tabs,
sonner, skeleton, separator, dropdown-menu, navigation-menu, scroll-area,
select, checkbox, label, alert, tooltip, popover, table, drawer,
toggle, switch, radio-group, collapsible, command

## 태자 전용 컴포넌트

- `MuseumCard` — 두꺼운 보더 + 오프셋 그림자 (레트로 시그니처)
- `RetroBadge` — 스탬프/도장 스타일 뱃지 (7가지 색상)
- `HubTile` — 홈 허브 타일 (6가지 악센트)
- `NatePanel` — 네이트 스타일 유저 패널
- `BrandPhrase` — 태/자 이중색 로고