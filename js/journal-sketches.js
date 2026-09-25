const SKETCH_INK = '#5b3a1e';

const SketchKit = (() => {
  const ink = `stroke="${SKETCH_INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const thin = `stroke="${SKETCH_INK}" stroke-width="1.1" stroke-linecap="round"`;

  function pine(x, y, s, colors = ['#3f7d4f', '#4a8a57', '#55975f'], snow = false) {
    const tiers = [[0, 18, 14], [-9, 14, 12], [-17, 10, 10]];
    let out = `<g class="sk-sway" style="animation-delay:${(x % 7) * -0.4}s">`;
    out += `<rect x="${x - 1.6 * s}" y="${y - 4 * s}" width="${3.2 * s}" height="${6 * s}" fill="#7a5536" ${ink}/>`;
    tiers.forEach(([dy, w, h], i) => {
      const top = y + (dy - h - 2) * s;
      const base = y + (dy - 2) * s;
      out += `<path d="M${x - w * s / 2} ${base} L${x} ${top} L${x + w * s / 2} ${base} Z" fill="${colors[i]}" ${ink}/>`;
      if (snow) out += `<path d="M${x - w * s / 4} ${top + h * s * 0.5} L${x} ${top} L${x + w * s / 4} ${top + h * s * 0.5} Q${x} ${top + h * s * 0.38} ${x - w * s / 4} ${top + h * s * 0.5}Z" fill="#f7fafc" ${thin}/>`;
    });
    return out + '</g>';
  }

  function broadleaf(x, y, s, delay = 0) {
    return `<g class="sk-sway" style="animation-delay:${delay}s">
      <path d="M${x - 2 * s} ${y} L${x - 1 * s} ${y - 16 * s} L${x + 1.2 * s} ${y - 16 * s} L${x + 2.2 * s} ${y}Z" fill="#7d5a3c" ${ink}/>
      <circle cx="${x - 7 * s}" cy="${y - 19 * s}" r="${7 * s}" fill="#65a24a" ${ink}/>
      <circle cx="${x + 7 * s}" cy="${y - 20 * s}" r="${7.5 * s}" fill="#7cba58" ${ink}/>
      <circle cx="${x}" cy="${y - 27 * s}" r="${9 * s}" fill="#6fae50" ${ink}/>
    </g>`;
  }

  function bird(x, y, delay) {
    return `<g class="sk-glide" style="animation-delay:${delay}s"><path class="sk-flap" d="M${x - 5} ${y} q2.5 -3.5 5 0 q2.5 -3.5 5 0" fill="none" ${thin}/></g>`;
  }

  function flower(x, y, color, delay) {
    return `<g class="sk-nod" style="animation-delay:${delay}s"><path d="M${x} ${y} L${x} ${y - 9}" ${thin}/><circle cx="${x}" cy="${y - 10.5}" r="2.6" fill="${color}" ${thin}/></g>`;
  }

  function grass(x, y, color = '#6fae4f') {
    return `<path d="M${x - 3} ${y} L${x - 4} ${y - 6} M${x} ${y} L${x} ${y - 8} M${x + 3} ${y} L${x + 5} ${y - 6}" stroke="${color}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
  }

  return { ink, thin, pine, broadleaf, bird, flower, grass };
})();

const BIOME_SKETCHES = (() => {
  const { ink, thin, pine, broadleaf, bird, flower, grass } = SketchKit;
  const frame = (body) => `<svg viewBox="0 0 200 130" class="sketch" aria-hidden="true"><g filter="url(#sketch-rough)">${body}<rect x="1.5" y="1.5" width="197" height="127" rx="6" fill="none" ${ink}/></g></svg>`;

  const meadow = frame(`
    <rect width="200" height="130" fill="#d6eef5"/>
    <g class="sk-spin" style="transform-origin:165px 28px">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M165 28 m${Math.cos(a * Math.PI / 180) * 15} ${Math.sin(a * Math.PI / 180) * 15} l${Math.cos(a * Math.PI / 180) * 6} ${Math.sin(a * Math.PI / 180) * 6}" ${ink}/>`).join('')}
    </g>
    <circle cx="165" cy="28" r="11" fill="#ffd45e" ${ink}/>
    <g class="sk-drift"><path d="M22 34 q2 -10 13 -7 q6 -9 16 -2 q10 -2 9 7 q4 4 -3 6 h-33 q-6 -2 -2 -4z" fill="#ffffff" ${ink}/></g>
    <path d="M0 86 Q45 60 95 78 T200 70 V130 H0Z" fill="#a8d36a" ${ink}/>
    ${broadleaf(150, 92, 0.9, -1.2)}
    <path d="M0 102 Q60 84 120 98 T200 94 V130 H0Z" fill="#86c05a" ${ink}/>
    ${[[18, '#e8443a'], [30, '#ffd23f'], [44, '#ffffff'], [57, '#9b6ade'], [72, '#f28cb1'], [96, '#ffd23f'], [110, '#e8443a'], [126, '#ffffff'], [168, '#9b6ade'], [182, '#f28cb1']]
      .map(([x, c], i) => flower(x, 118 + (i % 3) * 3, c, i * -0.3)).join('')}
    ${grass(86, 124)}${grass(140, 122)}${grass(8, 126)}
    <g class="sk-flutter"><g class="sk-flap">
      <path d="M78 64 q-8 -9 -10 -1 q2 6 10 1z" fill="#ff8c42" ${thin}/><path d="M78 64 q8 -9 10 -1 q-2 6 -10 1z" fill="#ffd23f" ${thin}/>
    </g></g>
  `);

  const forest = frame(`
    <rect width="200" height="130" fill="#dcefd9"/>
    ${[12, 34, 58, 84, 110, 136, 162, 188].map((x, i) => `<circle cx="${x}" cy="${46 + (i % 2) * 6}" r="${15 + (i % 3) * 3}" fill="#9cc783" ${thin}/>`).join('')}
    <path d="M0 64 H200 V130 H0Z" fill="#8fbf73"/>
    <path d="M0 96 Q50 86 100 94 T200 90 V130 H0Z" fill="#6ea856" ${ink}/>
    ${broadleaf(34, 100, 1.25, -0.4)}
    <g class="sk-sway" style="animation-delay:-1.8s">
      <path d="M96 100 L97 50 L101 50 L102 100Z" fill="#f2efe6" ${ink}/>
      <path d="M97 60 h3 M98 72 h3 M97 84 h4" ${ink}/>
      <ellipse cx="99" cy="44" rx="10" ry="14" fill="#a3cf55" ${ink}/>
      <ellipse cx="108" cy="54" rx="7" ry="9" fill="#b3d862" ${ink}/>
    </g>
    ${broadleaf(160, 104, 1.45, -2.6)}
    <g transform="translate(118 112)">
      <rect x="0" y="-2" width="44" height="10" rx="4" fill="#7d5a3c" ${ink}/>
      <ellipse cx="44" cy="3" rx="4" ry="5" fill="#c9a878" ${ink}/>
      <path d="M8 -2 q10 -3 22 0" stroke="#6e9e45" stroke-width="2.5" fill="none"/>
    </g>
    <g transform="translate(62 116)">
      <path d="M0 0 v-6" stroke="#f1e6cf" stroke-width="3"/><path d="M-6 -5 q6 -9 12 0z" fill="#d8453b" ${ink}/>
      <circle cx="-2" cy="-7" r="1" fill="#fff"/><circle cx="2" cy="-8" r="1" fill="#fff"/>
      <path d="M10 2 v-4" stroke="#f1e6cf" stroke-width="2.4"/><path d="M6 -2 q4 -6 8 0z" fill="#d8453b" ${ink}/>
    </g>
    ${[[50, 0], [132, -2], [84, -3.5], [178, -1.2]].map(([x, d]) => `<g class="sk-fall" style="animation-delay:${d}s"><ellipse cx="${x}" cy="20" rx="2.6" ry="1.4" fill="#d9a441" ${thin}/></g>`).join('')}
    ${grass(10, 124, '#4d8f3f')}${grass(90, 126, '#4d8f3f')}
  `);

  const taiga = frame(`
    <rect width="200" height="130" fill="#d8e9f1"/>
    <path d="M-5 80 L40 22 L70 58 L100 30 L150 84Z" fill="#a9b4ba" ${ink}/>
    <path d="M30 35 L40 22 L50 35 L44 32 L40 37 L36 32Z M92 40 L100 30 L108 41 L102 38 L99 43Z" fill="#f4f7f8" ${thin}/>
    <path d="M110 84 L160 30 L205 84Z" fill="#b6c0c5" ${ink}/>
    ${bird(120, 20, 0)}${bird(136, 26, -1.5)}${bird(150, 18, -3)}
    <path d="M0 84 Q60 76 110 84 T200 80 V130 H0Z" fill="#7f9c5e" ${ink}/>
    ${pine(22, 102, 1.3)}${pine(52, 96, 1.0)}${pine(82, 108, 1.55)}${pine(140, 100, 1.2)}${pine(172, 110, 1.6)}
    <path d="M104 118 l8 -9 l10 2 l4 7z" fill="#a29d95" ${ink}/>
    <path d="M36 122 l5 -6 l7 1 l2 5z" fill="#98a2a8" ${ink}/>
    ${grass(120, 126, '#6d8c55')}${grass(8, 126, '#6d8c55')}
  `);

  const snow = frame(`
    <rect width="200" height="130" fill="#e4eef5"/>
    <path d="M10 92 L70 18 L130 92Z" fill="#c9d6de" ${ink}/>
    <path d="M52 40 L70 18 L88 40 L80 36 L74 44 L66 36 L58 43Z" fill="#ffffff" ${ink}/>
    <path d="M100 92 L150 38 L200 92Z" fill="#d6e0e6" ${ink}/>
    <path d="M136 52 L150 38 L164 52 L157 49 L150 55 L143 49Z" fill="#ffffff" ${ink}/>
    <path d="M0 92 Q50 82 100 92 T200 88 V130 H0Z" fill="#f2f5f8" ${ink}/>
    ${pine(28, 112, 1.25, ['#2f6b45', '#3a7650', '#45825a'], true)}
    ${pine(160, 116, 1.45, ['#2f6b45', '#3a7650', '#45825a'], true)}
    ${pine(122, 104, 0.9, ['#2f6b45', '#3a7650', '#45825a'], true)}
    <path d="M70 118 l7 -7 l9 2 l3 6z" fill="#98a2a8" ${ink}/><path d="M71 113 l6 -2 l8 1" stroke="#fff" stroke-width="2.5" fill="none"/>
    ${Array.from({ length: 16 }, (_, i) => `<g class="sk-snow" style="animation-delay:${(-i * 0.47).toFixed(2)}s;animation-duration:${(4 + (i % 4)).toFixed(1)}s"><circle cx="${8 + i * 12}" cy="-4" r="${1.3 + (i % 3) * 0.4}" fill="#ffffff" ${thin}/></g>`).join('')}
  `);

  const savanna = frame(`
    <rect width="200" height="130" fill="#fbe5bc"/>
    <g class="sk-pulse"><circle cx="46" cy="62" r="20" fill="#ffb347" ${ink}/></g>
    <path d="M0 78 Q40 70 90 76 T200 72 V90 H0Z" fill="#d9c27a" ${thin}/>
    ${bird(120, 34, 0)}${bird(134, 40, -1.2)}${bird(110, 44, -2.4)}
    <path d="M0 86 Q70 80 130 88 T200 84 V130 H0Z" fill="#cdc36b" ${ink}/>
    <g class="sk-sway" style="animation-delay:-0.8s">
      <path d="M128 110 L131 80 L126 70 M131 80 L142 68 M130 88 L120 76" fill="none" stroke="${SKETCH_INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M100 70 Q134 52 170 68 Q136 76 100 70Z" fill="#8fa04a" ${ink}/>
      <path d="M116 62 Q140 50 160 60" fill="none" ${thin}/>
    </g>
    <g class="sk-sway" style="animation-delay:-2s">
      <path d="M40 104 L42 90 M42 90 L48 84 M42 94 L36 88" fill="none" stroke="${SKETCH_INK}" stroke-width="2" stroke-linecap="round"/>
      <path d="M28 88 Q44 80 60 86 Q44 90 28 88Z" fill="#9fae55" ${ink}/>
    </g>
    ${[12, 30, 58, 76, 92, 150, 168, 186].map((x, i) => grass(x, 120 + (i % 3) * 3, '#b8a24a')).join('')}
  `);

  const desert = frame(`
    <rect width="200" height="130" fill="#fdecc6"/>
    <circle cx="160" cy="28" r="18" fill="#fff6d0" opacity="0.8"/>
    <circle cx="160" cy="28" r="11" fill="#ffe27a" ${ink}/>
    ${[0, 1, 2].map((i) => `<path class="sk-shimmer" style="animation-delay:${-i * 0.7}s" d="M${30 + i * 40} ${70 + i * 3} q5 -3 10 0 t10 0 t10 0" fill="none" stroke="#e0b96a" stroke-width="1.3" stroke-linecap="round"/>`).join('')}
    <path d="M0 84 Q40 66 90 80 T200 74 V130 H0Z" fill="#f2dea8" ${ink}/>
    <path d="M0 104 Q70 86 120 100 T200 96 V130 H0Z" fill="#ecd49a" ${ink}/>
    <path d="M60 94 q20 -8 40 2" fill="none" ${thin}/><path d="M130 110 q16 -6 34 0" fill="none" ${thin}/>
    <g class="sk-sway" style="animation-duration:5s">
      <path d="M44 110 V66 q0 -6 5 -6 q5 0 5 6 V110Z" fill="#5d9b4f" ${ink}/>
      <path d="M44 88 h-6 q-4 0 -4 -4 V74 q0 -3 3 -3 q3 0 3 3 V82 h4" fill="#5d9b4f" ${ink}/>
      <path d="M54 80 h6 q4 0 4 -4 V68 q0 -3 -3 -3 q-3 0 -3 3 V74 h-4" fill="#5d9b4f" ${ink}/>
      <path d="M49 72 v30" stroke="#4a8440" stroke-width="1"/>
      <circle cx="49" cy="59" r="2.8" fill="#f06a8a" ${thin}/>
    </g>
    <g class="sk-sway" style="animation-duration:6s;animation-delay:-2s">
      <path d="M150 108 V84 q0 -4 3.5 -4 q3.5 0 3.5 4 V108Z" fill="#6aa85a" ${ink}/>
      <path d="M150 96 h-5 q-3 0 -3 -3 V88 q0 -2 2 -2 q2 0 2 2 V92 h4" fill="#6aa85a" ${ink}/>
    </g>
    <path d="M96 118 l10 -12 l16 3 l6 9z" fill="#cf9a66" ${ink}/>
    <path d="M100 116 l8 -2 M112 110 l6 4" ${thin}/>
    <g class="sk-roll"><circle cx="-10" cy="120" r="5" fill="none" ${thin}/><path d="M-14 118 l8 4 M-12 123 l5 -7 M-7 117 l-6 6" ${thin}/></g>
  `);

  return {
    [BIOME.MEADOW]: meadow,
    [BIOME.FOREST]: forest,
    [BIOME.TAIGA]: taiga,
    [BIOME.SNOW]: snow,
    [BIOME.SAVANNA]: savanna,
    [BIOME.DESERT]: desert,
  };
})();

const SKETCH_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="sketch-rough" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

const SCROLL_ICON = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <rect x="14" y="14" width="36" height="36" rx="3" fill="#f3e2bf" stroke="${SKETCH_INK}" stroke-width="2.4"/>
  <path d="M20 24 h24 M20 31 h20 M20 38 h22" stroke="#a07a4c" stroke-width="2" stroke-linecap="round"/>
  <rect x="9" y="8" width="46" height="9" rx="4.5" fill="#8a5a33" stroke="${SKETCH_INK}" stroke-width="2.4"/>
  <rect x="9" y="47" width="46" height="9" rx="4.5" fill="#8a5a33" stroke="${SKETCH_INK}" stroke-width="2.4"/>
  <circle cx="9" cy="12.5" r="3.5" fill="#c9a36a" stroke="${SKETCH_INK}" stroke-width="2"/>
  <circle cx="55" cy="12.5" r="3.5" fill="#c9a36a" stroke="${SKETCH_INK}" stroke-width="2"/>
  <circle cx="9" cy="51.5" r="3.5" fill="#c9a36a" stroke="${SKETCH_INK}" stroke-width="2"/>
  <circle cx="55" cy="51.5" r="3.5" fill="#c9a36a" stroke="${SKETCH_INK}" stroke-width="2"/>
  <path d="M46 44 l6 10 l2 -5 l5 1 z" fill="#c0392b" stroke="${SKETCH_INK}" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
