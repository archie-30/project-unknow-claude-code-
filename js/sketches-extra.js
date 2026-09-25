const SketchFrame = (body) => `<svg viewBox="0 0 200 130" class="sketch" aria-hidden="true"><g filter="url(#sketch-rough)">${body}<rect x="1.5" y="1.5" width="197" height="127" rx="6" fill="none" ${SketchKit.ink}/></g></svg>`;

const LANDMARK_SKETCHES = (() => {
  const { ink, thin, pine, broadleaf, grass } = SketchKit;
  const plane = SketchFrame(`
    <rect width="200" height="130" fill="#dcecf2"/>
    ${[0, 1, 2, 3].map((i) => `<g class="sk-smoke" style="animation-delay:${-i * 1.1}s"><circle cx="138" cy="70" r="${6 + i}" fill="#c9c5be" ${thin}/></g>`).join('')}
    <path d="M0 92 Q60 80 120 90 T200 86 V130 H0Z" fill="#a9c27f" ${ink}/>
    <ellipse cx="112" cy="102" rx="46" ry="7" fill="#6e6258" opacity="0.55"/>
    <g transform="rotate(-10 110 90)">
      <path d="M66 86 L140 80 Q150 80 150 88 L148 96 L70 100 Q60 99 60 93Z" fill="#efe6d6" ${ink}/>
      <path d="M100 82 L104 98" stroke="#c8583f" stroke-width="5"/>
      <path d="M62 88 L50 70 L58 70 L72 86Z" fill="#c8583f" ${ink}/>
      ${[82, 92, 112, 122].map((x) => `<rect x="${x}" y="86" width="5" height="4" fill="#3f5566" ${thin}/>`).join('')}
      <path d="M136 82 l6 -2 l4 6 l-7 1z" fill="#3f5566" ${thin}/>
      <path d="M150 90 l10 -10 M150 90 l12 6 M150 90 l-2 12" stroke="${SKETCH_INK}" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <path d="M40 108 L78 103 L80 110 L42 115Z" fill="#efe6d6" ${ink}/>
    <path d="M44 107 l8 -1 l1 7 l-8 1z" fill="#c8583f" ${thin}/>
    <path d="M150 112 l6 -3 l4 4 l-6 2z M24 118 l7 -2 l2 4 l-7 1z" fill="#8a8680" ${thin}/>
    ${grass(20, 124)}${grass(170, 122)}${grass(96, 126)}
  `);

  const cabin = SketchFrame(`
    <rect width="200" height="130" fill="#dcecf2"/>
    ${pine(22, 96, 1.2)}${pine(180, 98, 1.4)}
    <path d="M0 96 Q60 88 120 96 T200 92 V130 H0Z" fill="#93b36e" ${ink}/>
    <g class="sk-smoke" style="animation-delay:-2s;opacity:0.5"><circle cx="72" cy="30" r="4" fill="#d9d5ce" ${thin}/></g>
    <rect x="66" y="32" width="11" height="20" fill="#9b958a" ${ink}/>
    <path d="M52 58 L100 30 L148 58Z" fill="#7a6352" ${ink}/>
    <path d="M86 41 l10 -3 l4 6 l-9 4z" fill="#dcecf2" ${ink}/>
    <rect x="58" y="58" width="84" height="44" fill="#9a7352" ${ink}/>
    ${[64, 72, 80, 88, 96].map((y) => `<path d="M58 ${y} H142" ${thin}/>`).join('')}
    <path d="M92 102 V76 H108 V102" fill="#5e4632" ${ink}/>
    <path d="M108 76 L116 80 V104 L108 102Z" fill="#6e5238" ${ink}/>
    <rect x="66" y="70" width="14" height="12" fill="#3f5566" ${ink}/>
    <path d="M73 70 V82 M66 76 H80" ${thin}/>
    <g class="sk-sway" style="animation-duration:4s">
      ${[[124, 66], [131, 72], [127, 80], [134, 86], [122, 90], [130, 96], [138, 78]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3.2 + (i % 2)}" fill="${i % 3 ? '#f0a23a' : '#7fa862'}" ${thin}/>`).join('')}
    </g>
    <path d="M24 112 L26 100 M36 114 L37 102 M26 104 L37 106 M160 110 L158 99 M172 112 L176 101" stroke="#8f7a60" stroke-width="2.5" stroke-linecap="round"/>
    ${grass(50, 124)}${grass(150, 124)}${grass(90, 126)}
  `);

  return { [LANDMARK.PLANE]: plane, [LANDMARK.CABIN]: cabin };
})();

const SPECIES_SKETCHES = (() => {
  const { ink, thin, pine, broadleaf, grass, flower } = SketchKit;
  const ground = (fill, y = 100) => `<path d="M0 ${y} Q60 ${y - 8} 120 ${y} T200 ${y - 4} V130 H0Z" fill="${fill}" ${ink}/>`;
  const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#2b2b2b"/>`;

  const rabbit = SketchFrame(`
    <rect width="200" height="130" fill="#e3f0e8"/>${ground('#a9c27f')}
    ${flower(40, 118, '#f0a23a', 0)}${flower(160, 116, '#b79ad6', -0.6)}
    <g class="sk-hop">
      <ellipse cx="100" cy="92" rx="22" ry="16" fill="#b9a58a" ${ink}/>
      <circle cx="120" cy="80" r="11" fill="#b9a58a" ${ink}/>
      <g class="sk-ear"><path d="M116 70 q-4 -20 2 -24 q5 4 2 24z" fill="#b9a58a" ${ink}/><path d="M117 66 q-2 -12 1 -16" stroke="#e8b8b0" stroke-width="2"/></g>
      <path d="M123 70 q2 -20 9 -22 q3 6 -5 23z" fill="#b9a58a" ${ink}/>
      ${eye(124, 78)}<circle cx="130" cy="82" r="1.8" fill="#d88a8a"/>
      <circle cx="78" cy="88" r="6" fill="#ffffff" ${ink}/>
      <path d="M90 106 q8 4 18 0" fill="#a8957a" ${thin}/>
    </g>
    ${grass(20, 124)}${grass(70, 126)}${grass(180, 124)}
  `);

  const deer = SketchFrame(`
    <rect width="200" height="130" fill="#dcefd9"/>
    ${broadleaf(24, 100, 1.1, -0.5)}${broadleaf(178, 102, 1.2, -1.5)}
    ${ground('#7fa062', 104)}
    <g class="sk-graze">
      <rect x="72" y="62" width="56" height="26" rx="8" fill="#b5794c" ${ink}/>
      <path d="M76 84 q24 8 48 0" fill="#e8d6b8" ${thin}/>
      ${[78, 88, 112, 122].map((x) => `<path d="M${x} 86 L${x} 108" stroke="#8a5a36" stroke-width="4" stroke-linecap="round"/>`).join('')}
      <path d="M120 66 L134 44 L142 48 L130 70Z" fill="#b5794c" ${ink}/>
      <path d="M132 42 l14 -2 q6 4 2 9 l-12 3z" fill="#b5794c" ${ink}/>${eye(140, 44)}
      <path d="M134 40 l-4 -12 m2 6 l-6 -4 M140 38 l4 -12 m-2 6 l6 -4" stroke="#8a6a4a" stroke-width="2" stroke-linecap="round"/>
      <path d="M72 66 l-6 -4" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    </g>
    ${grass(40, 124)}${grass(150, 124)}
  `);

  const squirrel = SketchFrame(`
    <rect width="200" height="130" fill="#d8e9f1"/>
    ${pine(170, 104, 1.6)}${ground('#8e9f6e', 104)}
    <g class="sk-hop">
      <path d="M84 96 q-26 -6 -18 -38 q12 -14 20 0 q-10 8 0 28z" fill="#d07a48" ${ink}/>
      <ellipse cx="100" cy="92" rx="14" ry="11" fill="#c46a3a" ${ink}/>
      <circle cx="112" cy="80" r="8" fill="#c46a3a" ${ink}/>
      <path d="M108 73 l2 -7 l3 6z M114 73 l3 -6 l1 7z" fill="#c46a3a" ${thin}/>
      ${eye(115, 79)}
      <ellipse cx="118" cy="92" rx="5" ry="4" fill="#8a5a36" ${thin}/>
    </g>
    <path d="M40 112 l6 -6 l6 6z" fill="#8a6a4a" ${thin}/>
    ${grass(20, 124)}${grass(130, 124)}
  `);

  const fox = SketchFrame(`
    <rect width="200" height="130" fill="#e4eef5"/>
    ${pine(28, 100, 1.2, ['#2f6b45', '#3a7650', '#45825a'], true)}
    ${ground('#f3f1ec', 102)}
    <g class="sk-trot">
      <path d="M62 84 q-26 -6 -30 -24 q16 8 36 14z" fill="#eef0f0" ${ink}/>
      <path d="M36 62 q-4 -4 -2 -8 q6 2 6 8z" fill="#ffffff" ${thin}/>
      <rect x="64" y="72" width="52" height="20" rx="8" fill="#eef0f0" ${ink}/>
      ${[70, 80, 104, 112].map((x) => `<path d="M${x} 90 L${x} 106" stroke="#b9b9b9" stroke-width="4" stroke-linecap="round"/>`).join('')}
      <path d="M112 76 L126 66 L146 74 L128 84Z" fill="#eef0f0" ${ink}/>
      <path d="M118 70 l2 -12 l6 9z M126 68 l6 -10 l2 11z" fill="#eef0f0" ${ink}/>
      ${eye(130, 72)}<circle cx="146" cy="74" r="2" fill="#2b2b2b"/>
    </g>
    ${Array.from({ length: 8 }, (_, i) => `<g class="sk-snow" style="animation-delay:${-i * 0.6}s"><circle cx="${14 + i * 24}" cy="-4" r="1.5" fill="#ffffff" ${thin}/></g>`).join('')}
  `);

  const antelope = SketchFrame(`
    <rect width="200" height="130" fill="#fbe5bc"/>
    <circle cx="40" cy="44" r="14" fill="#ffb347" ${ink}/>
    ${ground('#d4c48a', 102)}
    <g class="sk-trot">
      <rect x="70" y="64" width="50" height="20" rx="8" fill="#caa06a" ${ink}/>
      <path d="M74 80 q22 6 42 0" fill="#f3ead8" ${thin}/>
      ${[76, 86, 106, 114].map((x) => `<path d="M${x} 82 L${x} 108" stroke="#a8804e" stroke-width="3" stroke-linecap="round"/>`).join('')}
      <path d="M114 68 L126 46 L133 50 L122 72Z" fill="#caa06a" ${ink}/>
      <path d="M124 44 l12 2 q3 5 -2 8 l-10 -2z" fill="#caa06a" ${ink}/>${eye(130, 47)}
      <path d="M126 42 q-6 -16 -14 -20 M130 42 q-2 -16 -8 -22" stroke="#3b3228" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
    ${[20, 50, 150, 176].map((x) => grass(x, 124, '#b8a24a')).join('')}
  `);

  const lizard = SketchFrame(`
    <rect width="200" height="130" fill="#fdecc6"/>
    ${ground('#ecd8a8', 96)}
    <path d="M140 104 l14 -14 l20 4 l6 12z" fill="#d3a578" ${ink}/>
    <g class="sk-scurry">
      <path d="M56 100 q-20 2 -34 -8" stroke="#9a9a52" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="80" cy="100" rx="26" ry="7" fill="#a7a65a" ${ink}/>
      <path d="M68 97 q12 -4 24 0" stroke="#7f8a44" stroke-width="2" fill="none"/>
      <path d="M104 98 q10 -4 16 0 q-6 6 -16 4z" fill="#a7a65a" ${ink}/>${eye(113, 98)}
      <path d="M66 104 l-6 8 M92 104 l6 8 M68 96 l-6 -8 M92 96 l6 -8" stroke="#8f9048" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    ${[0, 1].map((i) => `<path class="sk-shimmer" style="animation-delay:${-i}s" d="M${40 + i * 70} ${60 + i * 4} q5 -3 10 0 t10 0" fill="none" stroke="#e0b96a" stroke-width="1.3"/>`).join('')}
  `);

  const duck = SketchFrame(`
    <rect width="200" height="130" fill="#dcecf2"/>
    <path d="M0 80 H200 V130 H0Z" fill="#8fd0c8" ${ink}/>
    ${[40, 150].map((x, i) => `<path class="sk-shimmer" style="animation-delay:${-i}s" d="M${x - 20} 110 q10 -3 20 0 t20 0" fill="none" stroke="#ffffff" stroke-width="1.5"/>`).join('')}
    <g class="sk-bob">
      <path d="M70 84 q0 -18 34 -16 q20 2 26 16z" fill="#b59a78" ${ink}/>
      <path d="M72 84 q2 -8 12 -10" stroke="#4f7aa8" stroke-width="4"/>
      <path d="M118 70 q-2 -18 12 -18 q10 2 8 14 q-4 6 -12 6z" fill="#3f7a4f" ${ink}/>
      <path d="M137 60 l14 2 l-12 4z" fill="#f0a23a" ${ink}/>${eye(132, 60)}
      <path d="M120 70 q6 2 12 0" stroke="#ffffff" stroke-width="3"/>
      <path d="M66 80 l-8 -8 l10 2z" fill="#8a7458" ${thin}/>
    </g>
    <path d="M50 92 q30 6 90 0" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.8"/>
  `);

  const fish = SketchFrame(`
    <rect width="200" height="130" fill="#dcecf2"/>
    <path d="M0 88 H200 V130 H0Z" fill="#6fb4c8" ${ink}/>
    <ellipse cx="100" cy="92" rx="30" ry="4" fill="none" stroke="#ffffff" stroke-width="1.6"/>
    <ellipse cx="100" cy="92" rx="18" ry="2.5" fill="none" stroke="#ffffff" stroke-width="1.2"/>
    <g class="sk-leap">
      <path d="M86 70 q14 -18 34 -8 q-14 16 -34 8z" fill="#8aa7b8" ${ink}/>
      <path d="M86 70 l-12 -8 l2 14z" fill="#7894a6" ${ink}/>
      <path d="M104 60 l4 -6 l4 6" fill="#7894a6" ${thin}/>${eye(112, 64)}
    </g>
    ${[0, 1, 2].map((i) => `<circle class="sk-drop" style="animation-delay:${-i * 0.3}s" cx="${92 + i * 10}" cy="84" r="1.8" fill="#ffffff" ${thin}/>`).join('')}
  `);

  const sparrow = SketchFrame(`
    <rect width="200" height="130" fill="#e3f0e8"/>${ground('#93b36e')}
    ${[[70, 0], [110, -0.4], [146, -0.9]].map(([x, d]) => `
      <g class="sk-peck" style="animation-delay:${d}s">
        <ellipse cx="${x}" cy="98" rx="11" ry="8" fill="#a07a52" ${ink}/>
        <path d="M${x - 8} 100 q8 4 16 0" fill="#e8dcc6" ${thin}/>
        <circle cx="${x + 10}" cy="90" r="6" fill="#8a6444" ${ink}/>${eye(x + 12, 89)}
        <path d="M${x + 15} 90 l5 1 l-5 2z" fill="#3b3228" ${thin}/>
        <path d="M${x - 10} 96 l-8 -2 l7 5z" fill="#6e5238" ${thin}/>
      </g>`).join('')}
    ${[40, 90, 170].map((x) => `<circle cx="${x}" cy="112" r="1.5" fill="#d9c27a"/>`).join('')}
    ${grass(20, 124)}${grass(186, 124)}
  `);

  const butterfly = SketchFrame(`
    <rect width="200" height="130" fill="#e3f0e8"/>${ground('#a9c27f', 108)}
    ${flower(46, 122, '#f0a23a', 0)}${flower(60, 124, '#f3ead8', -0.4)}${flower(150, 122, '#b79ad6', -0.8)}${flower(164, 124, '#f0a23a', -1.2)}
    <g class="sk-flutter-soft">
      <g class="sk-flap">
        <path d="M100 64 q-26 -28 -34 -6 q-2 14 34 6z" fill="#ff8c42" ${ink}/>
        <path d="M100 64 q-22 8 -24 20 q10 6 24 -20z" fill="#ffd23f" ${ink}/>
        <path d="M100 64 q26 -28 34 -6 q2 14 -34 6z" fill="#ff8c42" ${ink}/>
        <path d="M100 64 q22 8 24 20 q-10 6 -24 -20z" fill="#ffd23f" ${ink}/>
        <circle cx="80" cy="54" r="3" fill="#ffffff" ${thin}/><circle cx="120" cy="54" r="3" fill="#ffffff" ${thin}/>
      </g>
      <path d="M100 52 V80" stroke="${SKETCH_INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M100 52 q-4 -8 -8 -10 M100 52 q4 -8 8 -10" stroke="${SKETCH_INK}" stroke-width="1.2" fill="none"/>
    </g>
  `);

  return {
    [SPECIES.RABBIT]: rabbit,
    [SPECIES.DEER]: deer,
    [SPECIES.SQUIRREL]: squirrel,
    [SPECIES.FOX]: fox,
    [SPECIES.ANTELOPE]: antelope,
    [SPECIES.LIZARD]: lizard,
    [SPECIES.DUCK]: duck,
    [SPECIES.FISH]: fish,
    [SPECIES.SPARROW]: sparrow,
    [SPECIES.BUTTERFLY]: butterfly,
  };
})();

BIOME_SKETCHES[BIOME.OCEAN] = (() => {
  const { ink, thin, bird } = SketchKit;
  return SketchFrame(`
    <rect width="200" height="130" fill="#d8eef4"/>
    <circle cx="150" cy="30" r="12" fill="#ffe27a" ${ink}/>
    <g class="sk-drift"><path d="M24 30 q2 -8 12 -6 q6 -8 15 -1 q9 -1 8 6 h-31 q-6 -1 -4 1z" fill="#ffffff" ${ink}/></g>
    ${bird(70, 24, 0)}${bird(86, 30, -1.4)}
    <path d="M0 62 H200 V130 H0Z" fill="#5f9fbf" ${ink}/>
    <path d="M0 74 H200 V130 H0Z" fill="#78b4c8"/>
    ${[0, 1, 2].map((i) => `<path class="sk-wave" style="animation-delay:${-i * 0.9}s" d="M${-10 + i * 12} ${80 + i * 10} q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>`).join('')}
    <g class="sk-bob" style="animation-duration:3s">
      <path d="M120 70 h30 l-6 7 h-19z" fill="#c8583f" ${ink}/>
      <path d="M135 70 V44 L150 66Z" fill="#f3ead8" ${ink}/>
      <path d="M134 70 V48 L122 66Z" fill="#efe6d6" ${thin}/>
    </g>
    <path d="M0 112 Q50 100 110 110 T200 104 V130 H0Z" fill="#ecdfb8" ${ink}/>
    <path class="sk-foam" d="M0 112 Q50 100 110 110 T200 104" fill="none" stroke="#ffffff" stroke-width="3"/>
    <path d="M40 122 q4 -6 8 0z" fill="#f2b8a8" ${thin}/><path d="M150 120 l4 -4 l4 4 l-4 3z" fill="#f0a23a" ${thin}/>
  `);
})();
