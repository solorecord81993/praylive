export const demoSubtitles = [
  { start:0,end:6,text_th:'ขอความสงบจงบังเกิดแก่ทุกดวงใจ',text_en:'May peace arise in every heart',text_pi:'Sabbe sattā sukhī hontu' },
  { start:6,end:12,text_th:'ขอสรรพสัตว์ทั้งหลายจงเป็นสุข',text_en:'May all beings be happy',text_pi:'Averā hontu abyāpajjhā hontu' },
  { start:12,end:18,text_th:'ตั้งจิตมั่น อยู่กับลมหายใจ',text_en:'Rest the mind gently with the breath',text_pi:'Satiṃ upaṭṭhapetvā' }
];
export function subtitleAt(items, time, lang) {
  const row = items.find(x => time >= x.start && time < x.end); if (!row) return '';
  return row[`text_${lang}`] || row.text_th || row.text_en || row.text_pi || '';
}
