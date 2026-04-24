# Thai_Ja_World

## Cron (로컬 모의)

Vercel Cron 은 `vercel.json` 의 `crons` 와 같이 `GET` 으로 호출합니다. 서버에서는 `Authorization: Bearer` 에 **값은 넣지 말고** Vercel 환경 변수 `CRON_SECRET` 또는 `BOT_CRON_SECRET` (로컬 `.env.local`에 동일 이름)과 일치시키면 됩니다.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3000/api/cron/quests?date=2026-01-15"
```

미설정 시 `src/lib/cronAuth.ts` 에 따라 **로컬**에서는 인증이 생략될 수 있습니다(프로덕션은 반드시 설정).
