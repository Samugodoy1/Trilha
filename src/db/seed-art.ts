/**
 * Ilustrações originais usadas como "fotografias" e "produções" fictícias da demonstração.
 * Nenhuma imagem real de criança é usada em desenvolvimento.
 */

const crayon = (id: string) => `
  <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/>
  </filter>`;

const paper = (w: number, h: number, tone = "#FBF8F1") => `
  <rect width="${w}" height="${h}" fill="${tone}"/>
  <rect width="${w}" height="${h}" fill="url(#grain)" opacity=".35"/>`;

const grainDef = `
  <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r=".6" fill="#d9cfbd"/><circle cx="4" cy="3.5" r=".5" fill="#e3dac9"/>
  </pattern>`;

const wrap = (w: number, h: number, body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${grainDef}${crayon("c")}${defs}</defs>${body}</svg>`;

export function sunflower() {
  const petals = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const x = 600 + Math.cos(a) * 95;
    const y = 300 + Math.sin(a) * 95;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="62" ry="26" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#F4B400" stroke="#D98E04" stroke-width="5"/>`;
  }).join("");
  return wrap(
    1200,
    900,
    `${paper(1200, 900)}
    <g filter="url(#c)">
      <path d="M600 380 C 590 520, 615 650, 600 860" stroke="#4E9A3E" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M603 600 C 680 540, 760 560, 800 520 C 740 610, 670 620, 603 620Z" fill="#6BBF59" stroke="#3F8A31" stroke-width="5"/>
      <path d="M598 700 C 520 640, 440 660, 400 620 C 460 720, 540 720, 598 720Z" fill="#6BBF59" stroke="#3F8A31" stroke-width="5"/>
      ${petals}
      <circle cx="600" cy="300" r="78" fill="#7A4A1E" stroke="#5A3412" stroke-width="6"/>
      <circle cx="575" cy="285" r="8" fill="#3d2410"/><circle cx="625" cy="285" r="8" fill="#3d2410"/>
      <path d="M570 325 Q600 350 630 325" stroke="#3d2410" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="1030" cy="150" r="70" fill="#FFD54F" stroke="#F2A900" stroke-width="6"/>
      ${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return `<line x1="${1030 + Math.cos(a) * 90}" y1="${150 + Math.sin(a) * 90}" x2="${1030 + Math.cos(a) * 125}" y2="${150 + Math.sin(a) * 125}" stroke="#F2A900" stroke-width="8" stroke-linecap="round"/>`;
      }).join("")}
      <path d="M0 860 Q 300 820 600 860 T 1200 850 L1200 900 L0 900Z" fill="#8BC34A" opacity=".8"/>
    </g>`,
  );
}

export function solarSystem() {
  const planets = [
    [190, 18, "#B0A08E"],
    [270, 26, "#E8B46B"],
    [365, 28, "#4A90D9"],
    [455, 22, "#D2553A"],
    [585, 56, "#D9A066"],
    [735, 48, "#E3C27A"],
    [865, 36, "#7FD3E0"],
    [985, 34, "#4A6FE3"],
  ] as const;
  return wrap(
    1200,
    900,
    `<rect width="1200" height="900" fill="#141A33"/>
    ${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 137) % 1200}" cy="${(i * 263) % 900}" r="${(i % 3) + 1}" fill="#fff" opacity="${0.3 + (i % 5) / 10}"/>`).join("")}
    <g filter="url(#c)">
      <circle cx="40" cy="450" r="130" fill="#FFB300" stroke="#FF8F00" stroke-width="8"/>
      ${planets
        .map(
          ([x, r, c], i) =>
            `<ellipse cx="40" cy="450" rx="${x - 40}" ry="${(x - 40) * 0.42}" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="6 10"/>
            <circle cx="${x}" cy="${450 + (i % 2 ? -1 : 1) * 12}" r="${r}" fill="${c}" stroke="#ffffff" stroke-opacity=".5" stroke-width="3"/>`,
        )
        .join("")}
      <ellipse cx="735" cy="438" rx="88" ry="18" fill="none" stroke="#F3DFA8" stroke-width="7"/>
    </g>
    <text x="600" y="840" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="54" fill="#FFE082" text-anchor="middle">O Sistema Solar</text>`,
  );
}

export function germination() {
  const cup = (x: number, h: number, leaves: boolean) => `
    <g transform="translate(${x} 0)">
      <path d="M0 560 L 30 800 L 170 800 L 200 560Z" fill="#F7F4EE" stroke="#C9C2B5" stroke-width="3"/>
      <path d="M8 610 L 192 610 L 175 800 L 25 800Z" fill="#7B5236"/>
      <path d="M100 610 C 98 ${610 - h * 0.6}, 104 ${610 - h * 0.8}, 100 ${610 - h}" stroke="#7CB342" stroke-width="10" fill="none" stroke-linecap="round"/>
      ${leaves ? `<path d="M100 ${610 - h} C 60 ${560 - h}, 30 ${600 - h}, 40 ${625 - h} C 70 ${630 - h}, 95 ${620 - h}, 100 ${610 - h}Z" fill="#8BC34A"/><path d="M100 ${610 - h} C 140 ${560 - h}, 172 ${600 - h}, 160 ${625 - h} C 130 ${630 - h}, 105 ${620 - h}, 100 ${610 - h}Z" fill="#9CCC65"/>` : `<ellipse cx="100" cy="${600 - h}" rx="22" ry="15" fill="#C8A27A"/>`}
      <rect x="40" y="690" width="120" height="44" rx="6" fill="#fff" opacity=".9"/>
    </g>`;
  return wrap(
    1200,
    900,
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDEFF7"/><stop offset="1" stop-color="#F4F1E8"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#sky)"/>
    <rect x="80" y="60" width="1040" height="460" rx="12" fill="#BFE3F2" stroke="#E8E2D6" stroke-width="22"/>
    <line x1="600" y1="60" x2="600" y2="520" stroke="#E8E2D6" stroke-width="16"/>
    <path d="M80 330 Q 340 260 600 330 T 1120 300 L1120 520 L80 520Z" fill="#A5D6A7" opacity=".7"/>
    <rect x="40" y="790" width="1120" height="40" rx="6" fill="#D7C4A8"/>
    ${cup(110, 40, false)}${cup(370, 120, true)}${cup(630, 190, true)}${cup(890, 250, true)}`,
  );
}

export function textProduction(title: string, lines: string[]) {
  return wrap(
    1200,
    900,
    `${paper(1200, 900, "#FFFEF9")}
    ${Array.from({ length: 13 }, (_, i) => `<line x1="80" y1="${190 + i * 52}" x2="1120" y2="${190 + i * 52}" stroke="#A9C7E8" stroke-width="2"/>`).join("")}
    <line x1="150" y1="40" x2="150" y2="900" stroke="#F2A4A4" stroke-width="3"/>
    <text x="600" y="130" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="54" fill="#2B3A67" text-anchor="middle">${title}</text>
    ${lines
      .map(
        (l, i) =>
          `<text x="180" y="${180 + i * 52}" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="34" fill="#2B3A67">${l}</text>`,
      )
      .join("")}`,
  );
}

export function houseDrawing() {
  return wrap(
    1200,
    900,
    `${paper(1200, 900)}
    <g filter="url(#c)">
      <path d="M0 720 Q 600 660 1200 720 L1200 900 L0 900Z" fill="#9CCC65"/>
      <rect x="380" y="400" width="420" height="320" fill="#FFCC80" stroke="#E08E2B" stroke-width="7"/>
      <path d="M350 410 L 590 230 L 830 410Z" fill="#E57373" stroke="#C0392B" stroke-width="7"/>
      <rect x="550" y="560" width="90" height="160" fill="#8D6E63" stroke="#5D4037" stroke-width="6"/>
      <rect x="430" y="460" width="90" height="80" fill="#B3E5FC" stroke="#4A90D9" stroke-width="6"/>
      <rect x="670" y="460" width="90" height="80" fill="#B3E5FC" stroke="#4A90D9" stroke-width="6"/>
      ${[[200, 620, "#F06292"], [260, 640, "#4A90D9"], [930, 630, "#7E57C2"], [990, 650, "#FFB300"]]
        .map(
          ([x, y, c]) => `
        <circle cx="${x}" cy="${Number(y) - 90}" r="30" fill="#FFE0B2" stroke="#8D6E63" stroke-width="5"/>
        <path d="M${x} ${Number(y) - 60} L ${x} ${Number(y) + 10}" stroke="${c}" stroke-width="22" stroke-linecap="round"/>
        <path d="M${Number(x) - 35} ${Number(y) - 30} L ${Number(x) + 35} ${Number(y) - 30}" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
        <path d="M${x} ${y} L ${Number(x) - 20} ${Number(y) + 70} M${x} ${y} L ${Number(x) + 20} ${Number(y) + 70}" stroke="#5D4037" stroke-width="9" stroke-linecap="round"/>`,
        )
        .join("")}
      <circle cx="160" cy="140" r="70" fill="#FFD54F" stroke="#F2A900" stroke-width="6"/>
      <path d="M820 150 q 40 -40 80 0 q 40 -30 70 10 q 30 30 -10 50 h -130 q -40 -20 -10 -60z" fill="#fff" stroke="#B0BEC5" stroke-width="5"/>
    </g>`,
  );
}

export function mathSheet() {
  const problems = ["24 + 18 = 42", "57 − 23 = 34", "3 × 4 = 12", "120 + 85 = 205"];
  return wrap(
    1200,
    900,
    `${paper(1200, 900, "#FFFFFF")}
    <rect x="70" y="60" width="1060" height="780" rx="16" fill="none" stroke="#E3E1DB" stroke-width="3"/>
    <text x="110" y="140" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="40" fill="#1D1D1F">Problemas de adição e subtração</text>
    <text x="110" y="190" font-family="Inter, Arial, sans-serif" font-size="26" fill="#6E6E73">Resolva e mostre como você pensou.</text>
    ${problems
      .map(
        (p, i) => `
      <text x="110" y="${300 + i * 140}" font-family="Inter, Arial, sans-serif" font-size="30" fill="#1D1D1F">${i + 1}.</text>
      <text x="170" y="${300 + i * 140}" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="44" fill="#2B3A67">${p}</text>
      <path d="M760 ${270 + i * 140} l 18 22 l 40 -48" stroke="#2E9E6B" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${i === 1 ? `<g transform="translate(860 ${235 + i * 140})">${Array.from({ length: 5 }, (_, k) => `<rect x="${k * 34}" y="0" width="24" height="60" rx="4" fill="#90CAF9"/>`).join("")}</g>` : ""}`,
      )
      .join("")}`,
  );
}

export function genreMural() {
  const cards = [
    ["Receita", "#FFCDD2", "#C62828"],
    ["Bilhete", "#C8E6C9", "#2E7D32"],
    ["Poema", "#BBDEFB", "#1565C0"],
    ["Notícia", "#FFE0B2", "#E65100"],
    ["Carta", "#E1BEE7", "#6A1B9A"],
    ["Fábula", "#FFF9C4", "#F9A825"],
  ];
  return wrap(
    1200,
    900,
    `<rect width="1200" height="900" fill="#C9A77C"/>
    <rect width="1200" height="900" fill="url(#grain)" opacity=".5"/>
    <rect x="60" y="50" width="1080" height="800" rx="10" fill="#B88B5A" opacity=".35"/>
    <text x="600" y="150" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="64" fill="#3E2723" text-anchor="middle">Gêneros textuais</text>
    ${cards
      .map(([t, bg, fg], i) => {
        const x = 130 + (i % 3) * 330;
        const y = 220 + Math.floor(i / 3) * 300;
        const rot = ((i * 37) % 9) - 4;
        return `<g transform="rotate(${rot} ${x + 140} ${y + 120})"><rect x="${x}" y="${y}" width="280" height="240" fill="${bg}"/>
          <circle cx="${x + 140}" cy="${y + 14}" r="12" fill="${fg}"/>
          <text x="${x + 140}" y="${y + 110}" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="44" fill="${fg}" text-anchor="middle">${t}</text>
          ${[150, 180, 210].map((ly) => `<line x1="${x + 40}" y1="${y + ly}" x2="${x + 240}" y2="${y + ly}" stroke="${fg}" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`).join("")}</g>`;
      })
      .join("")}`,
  );
}

export function leafCollage() {
  const leaf = (x: number, y: number, r: number, c: string) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 C 60 -80, 160 -60, 200 0 C 160 60, 60 80, 0 0Z" fill="${c}"/><path d="M0 0 L 190 0" stroke="#fff" stroke-opacity=".5" stroke-width="4"/></g>`;
  return wrap(
    1200,
    900,
    `${paper(1200, 900, "#FAF6EC")}
    ${leaf(200, 260, -20, "#E57A3A")}${leaf(520, 180, 15, "#C2A43A")}${leaf(820, 300, -35, "#8DAA4A")}
    ${leaf(260, 600, 25, "#B5543A")}${leaf(620, 520, -10, "#D99A2B")}${leaf(860, 680, 40, "#6E9B4A")}
    <g filter="url(#c)"><path d="M480 470 c -40 -60, -120 -40, -100 20 c 10 40, 60 50, 100 -20z M480 470 c 40 -60, 120 -40, 100 20 c -10 40, -60 50, -100 -20z" fill="#7E57C2" stroke="#4527A0" stroke-width="5"/>
    <path d="M480 440 L480 520" stroke="#311B92" stroke-width="8" stroke-linecap="round"/></g>`,
  );
}

export function readingCorner() {
  return wrap(
    1200,
    900,
    `<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EFE3"/><stop offset="1" stop-color="#EFE5D3"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#wall)"/>
    <rect x="0" y="700" width="1200" height="200" fill="#D9C3A0"/>
    <rect x="120" y="140" width="420" height="520" rx="10" fill="#C08A57"/>
    ${[0, 1, 2].map((s) => `<rect x="140" y="${170 + s * 165}" width="380" height="12" fill="#9A6A3C"/>${Array.from({ length: 9 }, (_, k) => `<rect x="${150 + k * 40}" y="${190 + s * 165 - 0}" width="${30 + (k % 3) * 4}" height="${110 + ((k * 7) % 30)}" rx="3" fill="${["#E57373", "#64B5F6", "#FFD54F", "#81C784", "#BA68C8", "#FF8A65"][(k + s) % 6]}" transform="translate(0 ${30 - ((k * 7) % 30)})"/>`).join("")}`).join("")}
    <ellipse cx="850" cy="760" rx="260" ry="60" fill="#B0D4C8"/>
    <circle cx="760" cy="640" r="80" fill="#F2B6A0"/><circle cx="930" cy="650" r="70" fill="#A7C7E7"/>
    <rect x="700" y="420" width="380" height="200" rx="40" fill="#F7F2E9" opacity=".9"/>
    <text x="890" y="535" font-family="'Segoe Print','Bradley Hand','Comic Sans MS',cursive" font-size="48" fill="#5D4037" text-anchor="middle">Cantinho da leitura</text>`,
  );
}
