export function thumbGradientForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  const h2 = (h + 48) % 360;
  return `linear-gradient(135deg, hsl(${h} 42% 36%), hsl(${h2} 48% 42%))`;
}
