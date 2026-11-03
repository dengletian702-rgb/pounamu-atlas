// Original illustrations, drawn in code in one flat language: paper, pounamu ink, tussock gold, lake blue,
// rātā red. They are made for this site (no third-party images), and share the map's wobble filter.

const C = { paper: '#e4e5df', paper2: '#d2d4c6', ink: '#15302b', green: '#1f5c47', moss: '#5f7f5a', gold: '#c99a3e', tussock: '#d7b46a', blue: '#2b5d8c', glacier: '#9cc0cc', red: '#a3313d', snow: '#fbf8f0' };

const wob = (id) => `<defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="3.5" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
const svg = (vb, id, body, label) => `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${wob(id)}<g filter="url(#${id})" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

const peaks = (y, color, pts) => `<path d="M0,${y} ${pts} L400,${y} L400,400 L0,400 Z" fill="${color}"/>`;

export const ART = {
  hike: (l) => svg('0 0 400 400', 'a-hike', `
    <rect width="400" height="400" fill="${C.glacier}" stroke="none"/>
    ${peaks(250, C.snow, 'L60,150 L105,205 L170,90 L230,180 L290,120 L360,210 L400,190')}
    <path d="M150,118 L170,90 L190,122 L178,116 L170,128 L160,116 Z" fill="${C.glacier}" stroke="none"/>
    ${peaks(290, C.moss, 'L70,230 L140,262 L220,215 L310,250 L400,225')}
    <path d="M0,400 L0,300 Q120,270 220,300 Q320,330 400,290 L400,400 Z" fill="${C.tussock}"/>
    <path d="M70,400 Q120,350 170,345 Q230,340 215,300 Q205,272 245,258" fill="none" stroke-dasharray="2 11" stroke-width="5" stroke="${C.ink}"/>
    <g transform="translate(250 205)"><path d="M0,40 L0,8 L22,-8 L44,8 L44,40 Z" fill="${C.red}"/><path d="M-6,10 L22,-12 L50,10" fill="none"/><rect x="16" y="22" width="12" height="18" fill="${C.ink}"/><path d="M34,-2 L34,-14 L40,-14 L40,3" fill="${C.paper}"/></g>
    <g transform="translate(118 300)"><path d="M0,60 L0,0" stroke-width="4"/><path d="M0,0 L18,9 L0,18 Z" fill="#e0782b"/></g>
    ${[[30, 360], [300, 350], [350, 380], [190, 385]].map(([x, y]) => `<path d="M${x},${y} l-6,-18 M${x},${y} l0,-22 M${x},${y} l7,-17" fill="none" stroke="${C.gold}"/>`).join('')}`, l),

  bike: (l) => svg('0 0 400 400', 'a-bike', `
    <rect width="400" height="400" fill="${C.tussock}" stroke="none"/>
    ${peaks(200, C.paper2, 'L80,150 L150,175 L230,120 L320,165 L400,140')}
    <rect x="0" y="200" width="400" height="80" fill="${C.gold}" stroke="none"/>
    <path d="M0,232 L400,232" stroke-width="5"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${30 + i * 92},280 L${30 + i * 92},258 Q${76 + i * 92},214 ${122 + i * 92},258 L${122 + i * 92},280" fill="${C.ink}" stroke="none"/>`).join('')}
    <path d="M0,232 L400,232 L400,244 L0,244 Z" fill="${C.ink}" stroke="none"/>
    <rect x="0" y="280" width="400" height="120" fill="${C.green}" stroke="none"/>
    <path d="M0,300 Q100,290 200,302 T400,296" fill="none" stroke="${C.glacier}" stroke-width="4"/>
    <g transform="translate(160 145)" fill="none" stroke-width="4">
      <circle cx="0" cy="62" r="26"/><circle cx="96" cy="62" r="26"/>
      <path d="M0,62 L34,20 L80,20 L96,62 M34,20 L48,62 L80,20 M48,62 L0,62 M30,8 L42,8 M80,20 L76,2 L88,2"/>
      <path d="M46,-30 q10,-10 20,0 l-4,26 l14,18 M58,-4 L44,22" stroke="${C.red}" stroke-width="6"/>
      <circle cx="56" cy="-40" r="9" fill="${C.ink}" stroke="none"/>
    </g>`, l),

  drive: (l) => svg('0 0 400 400', 'a-drive', `
    <rect width="400" height="400" fill="${C.paper}" stroke="none"/>
    <circle cx="300" cy="88" r="34" fill="${C.gold}"/>
    ${peaks(190, C.blue, 'L50,120 L120,170 L200,80 L270,150 L340,100 L400,140')}
    <path d="M175,112 L200,80 L222,110 L210,106 L200,118 L188,106 Z" fill="${C.snow}" stroke="none"/>
    <path d="M0,190 L400,190 L400,400 L0,400 Z" fill="${C.moss}"/>
    <path d="M200,190 Q150,240 230,270 Q330,305 180,400 L260,400 Q380,300 260,262 Q190,240 214,190 Z" fill="${C.ink}" stroke="none"/>
    <path d="M207,196 Q178,240 244,266 Q330,300 220,400" fill="none" stroke="${C.paper}" stroke-width="3" stroke-dasharray="10 12"/>
    <g transform="translate(232 300) rotate(-24)"><rect x="-24" y="-14" width="48" height="26" fill="${C.red}"/><rect x="-14" y="-24" width="26" height="12" fill="${C.glacier}"/><circle cx="-13" cy="14" r="6" fill="${C.ink}"/><circle cx="14" cy="14" r="6" fill="${C.ink}"/></g>
    ${[[40, 330], [90, 370], [330, 230], [360, 340], [60, 250]].map(([x, y]) => `<path d="M${x},${y} l14,-40 l14,40 Z" fill="${C.green}"/>`).join('')}`, l),

  transit: (l) => svg('0 0 400 400', 'a-transit', `
    <rect width="400" height="400" fill="${C.glacier}" stroke="none"/>
    ${peaks(230, C.snow, 'L70,120 L140,190 L210,100 L290,175 L350,130 L400,160')}
    ${peaks(260, C.green, 'L90,210 L180,240 L270,200 L400,235')}
    <rect x="0" y="260" width="400" height="140" fill="${C.blue}" stroke="none"/>
    <path d="M0,300 L400,300" stroke-width="6"/>
    ${[...Array(9)].map((_, i) => `<path d="M${20 + i * 46},300 L${20 + i * 46},400" stroke-width="5"/>`).join('')}
    <g transform="translate(40 246)">
      <rect x="0" y="0" width="96" height="48" fill="${C.red}"/><rect x="104" y="0" width="96" height="48" fill="${C.red}"/><rect x="208" y="0" width="110" height="48" fill="${C.red}"/>
      <path d="M318,0 L338,24 L338,48 L318,48 Z" fill="${C.ink}"/>
      ${[10, 40, 70, 114, 144, 174, 218, 248, 278].map((x) => `<rect x="${x}" y="10" width="20" height="14" fill="${C.snow}"/>`).join('')}
      ${[16, 80, 120, 184, 224, 300].map((x) => `<circle cx="${x}" cy="52" r="6" fill="${C.ink}"/>`).join('')}
    </g>
    <path d="M300,330 q10,-8 20,0 t20,0 t20,0" fill="none" stroke="${C.snow}"/>`, l),

  weather: (l) => svg('0 0 300 400', 'a-weather', `
    <rect width="300" height="400" fill="${C.blue}" stroke="none"/>
    <circle cx="210" cy="110" r="44" fill="${C.gold}"/>
    <path d="M40,150 q0,-40 40,-40 q14,-34 54,-22 q36,-10 46,26 q34,4 30,36 Z" fill="${C.snow}"/>
    ${[60, 92, 124, 156].map((x) => `<path d="M${x},170 l-10,34 M${x + 14},180 l-8,28" stroke="${C.glacier}" stroke-width="4"/>`).join('')}
    <path d="M0,400 L0,290 L70,220 L120,270 L180,200 L240,262 L300,230 L300,400 Z" fill="${C.snow}"/>
    <path d="M0,400 L0,330 L90,300 L170,330 L300,300 L300,400 Z" fill="${C.green}"/>`, l),

  gear: (l) => svg('0 0 300 400', 'a-gear', `
    <rect width="300" height="400" fill="${C.tussock}" stroke="none"/>
    <rect x="70" y="110" width="160" height="210" rx="36" fill="${C.red}"/>
    <rect x="95" y="190" width="110" height="80" rx="16" fill="${C.ink}"/>
    <path d="M110,110 Q150,60 190,110" fill="none" stroke-width="8"/>
    <rect x="62" y="70" width="176" height="44" rx="22" fill="${C.green}"/>
    <path d="M90,70 L90,114 M210,70 L210,114" stroke="${C.paper}"/>
    <path d="M86,150 L214,150" stroke="${C.paper}" stroke-width="4"/>
    <rect x="235" y="230" width="26" height="60" rx="8" fill="${C.glacier}"/>
    <path d="M40,330 L260,330" stroke-width="5"/>
    <path d="M40,350 q20,-14 40,0 t40,0 t40,0 t40,0 t40,0" fill="none" stroke="${C.green}"/>`, l),

  transport: (l) => svg('0 0 300 400', 'a-transport', `
    <rect width="300" height="400" fill="${C.glacier}" stroke="none"/>
    <path d="M0,170 L60,120 L120,160 L170,110 L230,150 L300,120 L300,210 L0,210 Z" fill="${C.green}"/>
    <rect x="0" y="210" width="300" height="190" fill="${C.blue}" stroke="none"/>
    <g transform="translate(150 230)"><path d="M-110,0 L110,0 L86,46 L-90,46 Z" fill="${C.snow}"/><rect x="-70" y="-30" width="120" height="30" fill="${C.paper}"/><rect x="-40" y="-56" width="60" height="26" fill="${C.paper}"/><path d="M-20,-56 L-20,-80 L0,-80 L0,-56" fill="${C.red}"/>
    ${[-60, -36, -12, 12, 36].map((x) => `<rect x="${x}" y="-22" width="14" height="12" fill="${C.ink}"/>`).join('')}<path d="M-110,0 L110,0" stroke="${C.red}" stroke-width="6"/></g>
    ${[300, 330, 360].map((y, i) => `<path d="M${20 + i * 30},${y} q15,-10 30,0 t30,0 t30,0 t30,0 t30,0 t30,0" fill="none" stroke="${C.snow}"/>`).join('')}`, l),

  booking: (l) => svg('0 0 300 400', 'a-booking', `
    <rect width="300" height="400" fill="${C.green}" stroke="none"/>
    <path d="M40,200 L150,110 L260,200 L260,330 L40,330 Z" fill="${C.paper}"/>
    <path d="M24,206 L150,98 L276,206" fill="none" stroke="${C.red}" stroke-width="12"/>
    <rect x="122" y="250" width="56" height="80" fill="${C.ink}"/>
    <rect x="66" y="230" width="38" height="36" fill="${C.glacier}"/><rect x="196" y="230" width="38" height="36" fill="${C.glacier}"/>
    <path d="M206,140 L206,96 L226,96 L226,158" fill="${C.paper}"/>
    <g transform="translate(150 360) rotate(-6)"><rect x="-80" y="-16" width="160" height="34" fill="${C.gold}"/><circle cx="-80" cy="1" r="9" fill="${C.green}" stroke="none"/><circle cx="80" cy="1" r="9" fill="${C.green}" stroke="none"/><path d="M-50,1 L50,1" stroke-dasharray="4 7"/></g>`, l),

  kea: (l) => svg('0 0 300 300', 'a-kea', `
    <rect width="300" height="300" fill="${C.paper}" stroke="none"/>
    <path d="M60,250 L250,250" stroke-width="10" stroke="${C.ink}"/>
    <path d="M120,248 Q90,170 130,110 Q160,70 196,96 Q220,116 210,160 Q200,210 170,248 Z" fill="${C.moss}"/>
    <path d="M150,140 Q120,190 132,248 L150,248 Q150,200 175,160 Z" fill="${C.green}"/>
    <path d="M130,200 Q118,230 130,248" fill="none" stroke="${C.red}" stroke-width="6"/>
    <path d="M196,96 Q226,92 232,116 Q224,112 214,114" fill="${C.ink}"/>
    <circle cx="186" cy="104" r="5" fill="${C.ink}"/>
    <path d="M150,248 L140,272 M168,248 L176,272" stroke-width="4"/>`, l),

  fiord: (l) => svg('0 0 300 400', 'a-fiord', `
    <rect width="300" height="400" fill="${C.paper2}" stroke="none"/>
    <path d="M110,400 L110,250 L150,40 L196,250 L196,400 Z" fill="${C.green}"/>
    <path d="M136,110 L150,40 L166,112 L156,104 L150,120 L142,104 Z" fill="${C.snow}" stroke="none"/>
    <path d="M0,400 L0,170 L40,120 L90,260 L90,400 Z" fill="${C.moss}"/>
    <path d="M300,400 L300,150 L250,110 L214,270 L214,400 Z" fill="${C.ink}"/>
    <path d="M232,170 Q236,230 228,300" fill="none" stroke="${C.snow}" stroke-width="5"/>
    <rect x="0" y="300" width="300" height="100" fill="${C.blue}" stroke="none"/>
    <path d="M30,330 q15,-8 30,0 t30,0 M170,350 q15,-8 30,0 t30,0" fill="none" stroke="${C.glacier}"/>
    <g transform="translate(120 322)"><path d="M-26,0 L26,0 L18,10 L-20,10 Z" fill="${C.paper}"/><rect x="-12" y="-10" width="22" height="10" fill="${C.red}"/></g>`, l),

  // Wide panorama for the closing section: Aoraki over Lake Pukaki, tussock in front.
  panorama: (l) => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${l}" xmlns="http://www.w3.org/2000/svg">${wob('a-pano')}
    <rect width="1600" height="900" fill="${C.glacier}"/>
    <g filter="url(#a-pano)" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round">
      <path d="M-20,520 L120,430 L210,470 L330,330 L420,250 L470,300 L540,230 L640,380 L760,330 L880,420 L1000,360 L1140,440 L1260,400 L1400,460 L1620,420 L1620,560 L-20,560 Z" fill="${C.snow}"/>
      <path d="M380,290 L420,250 L470,300 L540,230 L585,300 L560,292 L540,318 L512,290 L486,330 L462,310 L432,326 L410,296 Z" fill="${C.paper2}" stroke="none"/>
      <path d="M-20,560 L140,500 L300,540 L520,480 L760,540 L980,500 L1200,550 L1620,500 L1620,600 L-20,600 Z" fill="${C.moss}"/>
      <rect x="-20" y="596" width="1640" height="230" fill="${C.blue}"/>
      <path d="M240,640 q30,-14 60,0 t60,0 M820,680 q30,-14 60,0 t60,0 t60,0 M1300,630 q30,-14 60,0 t60,0" fill="none" stroke="${C.glacier}" stroke-width="4"/>
      <path d="M-20,900 L-20,730 Q300,690 620,740 Q980,790 1300,720 Q1460,690 1620,720 L1620,900 Z" fill="${C.tussock}"/>
      ${[...Array(26)].map((_, i) => { const x = 30 + i * 62 + (i % 3) * 9; const y = 800 + (i % 4) * 22; return `<path d="M${x},${y} l-14,-46 M${x},${y} l0,-56 M${x},${y} l16,-44 M${x},${y} l-26,-30 M${x},${y} l28,-28" fill="none" stroke="${C.gold}" stroke-width="4"/>`; }).join('')}
    </g></svg>`,
};
