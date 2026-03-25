/**
 * Open-Meteo WMO weather code → 짧은 날씨 문구
 * https://open-meteo.com/en/docs
 */
export function wmoLabel(code: number | undefined, locale: 'ko' | 'th'): string {
  const c = code ?? 0;
  const ko = (s: string) => s;
  const th = (s: string, t: string) => (locale === 'th' ? t : s);

  if (c === 0) return th('맑음', 'แจ่มใส');
  if (c <= 3) return th('구름 조금', 'มีเมฆบางส่วน');
  if (c <= 48) return th('안개', 'หมอก');
  if (c <= 57) return th('이슬비', 'ฝนปรอย');
  if (c <= 67) return th('비', 'ฝน');
  if (c <= 77) return th('눈', 'หิมะ');
  if (c <= 82) return th('소나기', 'ฝนตกหนักเป็นหย่อม');
  if (c <= 86) return th('눈 소나기', 'หิมะตกหนัก');
  if (c <= 99) return th('뇌우', 'พายุฝนฟ้าคะนอง');
  return th('변동', 'เปลี่ยนแปลง');
}
