// Wichtelomat-Icon: Wichtel mit roter Zipfelmütze, Knubbelnase und Rauschebart.
// rounded=true → abgerundetes Quadrat (Favicon, Android „any“); false → randlos (iOS, maskable).
// scale < 1 → Motiv kleiner (Safe-Zone für maskable Icons).
export function iconSvg({ rounded = true, scale = 1 } = {}) {
  const t = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="wbg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#1f7a50"/>
      <stop offset="1" stop-color="#0c3f2b"/>
    </linearGradient>
    <linearGradient id="what" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#ef4b58"/>
      <stop offset="1" stop-color="#b51d2f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="116"' : ''} fill="url(#wbg)"/>
  <g fill="#ffffff" opacity=".2">
    <circle cx="84" cy="96" r="10"/><circle cx="142" cy="176" r="6"/><circle cx="64" cy="250" r="7"/>
    <circle cx="452" cy="250" r="8"/><circle cx="456" cy="372" r="6"/><circle cx="58" cy="398" r="9"/>
  </g>
  <g transform="translate(${t - 12 * scale} ${t}) scale(${scale})">
    <!-- Bart -->
    <path d="M118 300 C112 372 146 430 196 456 C222 470 240 478 256 478 C272 478 290 470 316 456 C366 430 400 372 394 300 Z" fill="#f8f4ec"/>
    <path d="M196 380 C200 412 214 440 232 458 M256 392 L256 470 M316 380 C312 412 298 440 280 458" stroke="#e4dccd" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Mütze -->
    <path d="M116 306 C128 220 176 128 270 76 C318 50 382 52 418 92 C434 110 444 132 444 152 C420 132 392 124 362 134 C372 196 392 254 396 306 Z" fill="url(#what)"/>
    <path d="M362 134 C372 196 392 254 396 306 L372 306 C364 250 350 196 340 140 Z" fill="#000" opacity=".12"/>
    <!-- Stern -->
    <path d="M230 168 l11 22 24 4 -17 17 4 24 -22 -11 -22 11 4 -24 -17 -17 24 -4 Z" fill="#f6c453"/>
    <!-- Bommel -->
    <circle cx="440" cy="160" r="34" fill="#f8f4ec"/>
    <circle cx="430" cy="150" r="10" fill="#ffffff"/>
    <!-- Krempe -->
    <rect x="98" y="282" width="316" height="52" rx="26" fill="#f8f4ec"/>
    <rect x="98" y="314" width="316" height="20" rx="10" fill="#e4dccd" opacity=".6"/>
    <!-- Schnurrbart -->
    <path d="M256 366 C236 392 196 398 168 376 C196 380 226 368 250 350 Z" fill="#ffffff" stroke="#e4dccd" stroke-width="4" stroke-linejoin="round"/>
    <path d="M256 366 C276 392 316 398 344 376 C316 380 286 368 262 350 Z" fill="#ffffff" stroke="#e4dccd" stroke-width="4" stroke-linejoin="round"/>
    <!-- Nase -->
    <circle cx="256" cy="350" r="38" fill="#f29b77"/>
    <circle cx="244" cy="337" r="11" fill="#ffffff" opacity=".55"/>
  </g>
</svg>`;
}
