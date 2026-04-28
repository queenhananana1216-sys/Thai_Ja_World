const EMERGENCY_CONTACTS = [
  {
    name: '주태국 대한민국 대사관',
    phone: '+66-2-247-7537',
    telLink: '+6622477537',
    icon: '🏛️',
  },
  {
    name: '태국 관광경찰 (한국어 통역)',
    phone: '1155',
    telLink: '1155',
    icon: '🚓',
  },
  {
    name: '응급차 / 구조대',
    phone: '1669',
    telLink: '1669',
    icon: '🚑',
  },
  {
    name: '한인회',
    phone: '+66-2-253-5330',
    telLink: '+6622535330',
    icon: '🤝',
  },
] as const;

export default function EmergencyLifelineWidget() {
  return (
    <section className="rounded-xl border border-slate-500/30 bg-slate-900/60 p-2 backdrop-blur-md">
      <h3 className="mb-2 text-xs font-extrabold text-slate-100">🚨 긴급 연락처</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {EMERGENCY_CONTACTS.map((contact) => (
          <li key={contact.telLink} className="w-full">
            <a
              href={`tel:${contact.telLink}`}
              className="flex w-full flex-col rounded-lg border border-slate-700/70 bg-slate-900/50 p-2 transition-colors hover:bg-slate-800/80"
              aria-label={`${contact.name} 전화 걸기`}
            >
              <span className="break-keep text-xs text-slate-400">
                {contact.icon} {contact.name}
              </span>
              <strong className="mt-1 break-keep text-sm font-bold tracking-wider text-white">
                {contact.phone}
              </strong>
            </a>
          </li>
        ))}
      </ul>
      {/* Array Mapping 구조를 유지해 /admin에서 연락처 데이터 소스로 확장하기 쉽게 설계 */}
    </section>
  );
}
