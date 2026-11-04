(function () {
  "use strict";

  const screens = {
    inicio: "inicio.html",
    habitaciones: "habitaciones.html",
    limpiezas: "limpiezas.html",
    historial: "historial.html",
    personal: "personal.html"
  };
  const responsiveStyles = `
    html, body { width: 100%; height: 100%; min-height: 0 !important; }
    body { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
    body > main {
      flex: 1 1 0%; min-height: 0; overflow-x: hidden; overflow-y: auto;
      overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #9ac9c8 transparent;
      padding-bottom: .75rem !important;
    }
    body > main > div:first-child { padding-bottom: 1rem; }
    :root {
      --hotel-ocean: #123a4a;
      --hotel-ocean-dark: #0d2c3a;
      --hotel-mint: #26b7a6;
      --hotel-mist: #eff5f4;
      --hotel-ink: #183642;
      --hotel-muted: #71868c;
      --hotel-line: #dce8e7;
    }
    html { background: var(--hotel-mist); }
    body { background: var(--hotel-mist) !important; color: var(--hotel-ink); font-family: "Plus Jakarta Sans", sans-serif; }
    body > header { background: linear-gradient(105deg, var(--hotel-ocean-dark), var(--hotel-ocean)) !important; box-shadow: 0 5px 22px rgb(13 44 58 / 18%) !important; }
    body > header > div { color: #f0f8f7; }
    body > header .text-text-main, body > header .text-text-muted { color: #f0f8f7 !important; }
    body > header .text-text-muted { opacity: .78; }
    body > header .bg-status-occupied-bg { border: 1px solid rgb(134 223 211 / 40%); background: rgb(255 255 255 / 9%) !important; }
    body > header .text-coral-primary { color: #86dfd3 !important; }
    body > header .bg-primary { border: 1px solid rgb(134 223 211 / 50%); background: #86dfd3 !important; }
    body > header .text-on-primary { color: var(--hotel-ocean-dark) !important; }
    body > main { background: var(--hotel-mist) !important; }
    body > main > div:first-child { color: var(--hotel-ink); }
    h1, h2, h3, .text-headline-xl, .text-headline-xl-mobile, .text-headline-lg, .text-headline-lg-mobile, .text-headline-md, .text-headline-sm {
      font-family: "Plus Jakarta Sans", sans-serif !important;
      letter-spacing: -.035em;
    }
    .bg-surface-card, .bg-surface-container-lowest, .bg-white { background-color: #fff !important; }
    .bg-canvas-warm, .bg-surface-container-low { background-color: #e2eeed !important; }
    .bg-status-free-bg { background-color: #e0f4ee !important; }
    .bg-status-occupied-bg { background-color: #fce9e8 !important; }
    .bg-status-pending-bg { background-color: #fff1dc !important; }
    .bg-status-cleaning-bg { background-color: #e9e9fb !important; }
    .bg-coral-primary, .bg-primary { background-color: var(--hotel-ocean) !important; }
    .text-coral-primary, .text-primary { color: #118a80 !important; }
    .text-text-main, .text-on-surface { color: var(--hotel-ink); }
    .text-text-muted, .text-on-surface-variant { color: var(--hotel-muted); }
    button { font-family: "Plus Jakarta Sans", sans-serif; }
    .screen-staff #staff-list > .staff-card {
      display: flex; min-width: 0; min-height: 0; flex-direction: column; gap: .9rem;
      padding: 1rem; border: 1px solid #dce8e7; border-radius: 1.1rem;
      background: linear-gradient(145deg, #fff 0%, #f9fcfb 100%);
      box-shadow: 0 7px 20px rgb(24 54 66 / 6%);
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .screen-staff #staff-list > .staff-card:hover {
      transform: translateY(-2px); border-color: #c5dfda; box-shadow: 0 12px 26px rgb(24 54 66 / 10%);
    }
    .screen-staff .staff-card-heading { display: flex; min-width: 0; align-items: flex-start; gap: .75rem; }
    .screen-staff .staff-card-avatar {
      display: grid; width: 2.8rem; height: 2.8rem; flex: 0 0 auto; place-items: center;
      border: 1px solid #d6ece7; border-radius: .95rem;
      background: linear-gradient(145deg, #eaf8f4, #d9f0e9); color: #167c74;
      font-size: .85rem; font-weight: 800; letter-spacing: .02em;
    }
    .screen-staff .staff-card-identity { min-width: 0; flex: 1; }
    .screen-staff .staff-card-name {
      overflow: hidden; color: #183642; font-size: .9rem; font-weight: 800;
      line-height: 1.25rem; text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-staff .staff-card-phone {
      display: flex; min-width: 0; align-items: center; gap: .35rem; margin-top: .25rem;
      color: #71868c; font-size: .72rem; line-height: 1rem; overflow-wrap: anywhere;
    }
    .screen-staff .staff-card-phone .material-symbols-outlined { flex: 0 0 auto; font-size: .9rem; }
    .screen-staff .staff-card-shift {
      display: inline-flex; align-items: center; gap: .25rem; margin-top: .55rem;
      padding: .2rem .5rem; border: 1px solid #dcebe8; border-radius: 999px;
      background: #eff7f5; color: #267c77; font-size: .65rem; font-weight: 800;
      line-height: 1rem; white-space: nowrap;
    }
    .screen-staff .staff-card-shift .material-symbols-outlined { font-size: .8rem; }
    .screen-staff .staff-card-delete {
      display: grid; width: 2rem; height: 2rem; flex: 0 0 auto; place-items: center;
      border: 1px solid #e8eeee; border-radius: .7rem; background: #fff; color: #82969b;
      transition: color .18s ease, background-color .18s ease, border-color .18s ease;
    }
    .screen-staff .staff-card-delete:hover { border-color: #f2d9d9; background: #fff5f4; color: #be5960; }
    .screen-staff .staff-card-actions {
      display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: .5rem;
      margin-top: auto; padding-top: .75rem; border-top: 1px solid #e9efee;
    }
    .screen-staff .staff-card-action {
      display: inline-flex; min-width: 0; min-height: 2.45rem; align-items: center; justify-content: center;
      gap: .35rem; padding: .45rem .55rem; border: 1px solid #dce8e7; border-radius: .75rem;
      background: #fff; color: #176273; font-size: .68rem; font-weight: 800; line-height: 1rem;
      text-align: center; transition: background-color .18s ease, border-color .18s ease, transform .18s ease;
    }
    .screen-staff .staff-card-action:hover { transform: translateY(-1px); border-color: #b8dcd4; background: #f0f8f6; }
    .screen-staff .staff-card-action-primary {
      border-color: #176273; background: linear-gradient(105deg, #123a4a, #176273); color: #fff;
      box-shadow: 0 4px 10px rgb(18 58 74 / 15%);
    }
    .screen-staff .staff-card-action-primary:hover { border-color: #218a8d; background: #176273; color: #fff; }
    .screen-staff .staff-card-action .material-symbols-outlined { flex: 0 0 auto; font-size: 1rem; }
    button.bg-coral-primary, #quickActionBtn { color: #f0f8f7 !important; box-shadow: 0 8px 18px rgb(18 58 74 / 22%) !important; }
    .shadow-sm, .shadow-xs { box-shadow: 0 5px 18px rgb(24 54 66 / 8%) !important; }
    .rounded-3xl { border-radius: 1.1rem !important; }
    .rounded-2xl { border-radius: .9rem !important; }
    input { border: 1px solid var(--hotel-line) !important; background: #fffdf8 !important; }
    input:focus { border-color: var(--hotel-mint) !important; box-shadow: 0 0 0 3px rgb(38 183 166 / 18%) !important; }

    .screen-home > main { background: linear-gradient(180deg, #f1f8f7 0, #f8fbfa 34%, #f5f8f8 100%) !important; }
    .screen-home #dashboard-content {
      gap: 1.15rem !important;
      background:
        radial-gradient(ellipse at 2% 16%, rgb(91 195 171 / 8%), transparent 26rem),
        radial-gradient(ellipse at 100% 48%, rgb(226 167 133 / 8%), transparent 24rem);
    }
    .screen-home #dashboard-welcome {
      position: relative; overflow: hidden; min-height: 118px; justify-content: center;
      margin-top: 0; padding: 1.1rem 1.25rem; border: 1px solid rgb(134 223 211 / 28%); border-radius: 1.35rem;
      background:
        radial-gradient(ellipse at 85% 0, rgb(111 226 197 / 25%), transparent 36%),
        radial-gradient(ellipse at 100% 100%, rgb(246 134 147 / 18%), transparent 38%),
        linear-gradient(118deg, #102f3b, #145262 62%, #176273);
      box-shadow: 0 16px 34px rgb(13 44 58 / 19%), inset 0 1px 0 rgb(255 255 255 / 13%);
    }
    .screen-home #dashboard-welcome::after {
      position: absolute; right: 2rem; bottom: -3.2rem; width: 8rem; height: 8rem; content: "";
      border: 1px solid rgb(134 223 211 / 30%); border-radius: 50%; box-shadow: 0 0 0 14px rgb(134 223 211 / 8%), 0 0 0 30px rgb(134 223 211 / 5%);
      pointer-events: none;
    }
    .screen-home #dashboard-welcome > div,
    .screen-home #dashboard-welcome > p { position: relative; z-index: 1; }
    .screen-home #dashboard-welcome h1 { color: #f2fbfa !important; font-size: clamp(1.55rem, 3vw, 2.3rem); line-height: 1.15; }
    .screen-home #dashboard-welcome span,
    .screen-home #dashboard-welcome p { color: #c1e0df !important; }
    .screen-home #dashboard-welcome > div > div:last-child { width: 2.75rem; height: 2.75rem; background: rgb(134 223 211 / 16%) !important; }
    .screen-home #dashboard-welcome > p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .screen-home #dashboard-actions {
      align-self: stretch; gap: .6rem; padding: .55rem; border: 1px solid var(--hotel-line);
      border-radius: 1.1rem; background: rgb(255 255 255 / 88%); box-shadow: 0 8px 22px rgb(24 54 66 / 7%);
      backdrop-filter: blur(12px);
    }
    .screen-home #dashboard-actions button {
      min-width: 0; height: 46px; border-radius: .85rem;
      transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
    }
    .screen-home #dashboard-actions button:hover { transform: translateY(-2px); filter: saturate(1.08); }
    .screen-home #quickActionBtn {
      background: linear-gradient(105deg, #79d8bc, #59c4af) !important; color: #103c43 !important;
      box-shadow: 0 7px 16px rgb(53 164 147 / 24%), inset 0 1px 0 rgb(255 255 255 / 45%) !important;
    }
    .screen-home #dashboard-actions #dashboardRoomsBtn {
      padding-inline: .85rem; border: 1px solid #dcebe9; background: linear-gradient(145deg, #fff, #f2f8f6) !important;
      color: #176273 !important; box-shadow: 0 4px 10px rgb(24 54 66 / 5%);
    }
    .screen-home #dashboard-actions #dashboardRoomsBtn .material-symbols-outlined {
      display: grid; width: 1.8rem; height: 1.8rem; place-items: center;
      border-radius: .6rem; background: #e4f3ef; color: #258d7c !important;
    }
    .screen-home #dashboard-performance {
      position: relative; overflow: hidden; min-width: 0; padding: 1rem;
      border: 1px solid #dcebe8; border-radius: 1.25rem;
      background:
        radial-gradient(ellipse at 100% 0, rgb(104 203 174 / 12%), transparent 34%),
        linear-gradient(145deg, #fff, #f5faf8 72%, #f9f7f5);
      box-shadow: 0 12px 28px rgb(24 54 66 / 7%), inset 0 1px 0 #fff;
    }
    .screen-home #dashboard-performance > * { position: relative; z-index: 1; }
    .screen-home #dashboard-performance::before {
      position: absolute; top: 0; left: 1rem; right: 1rem; height: 3px; content: "";
      border-radius: 0 0 999px 999px;
      background: linear-gradient(90deg, #55b999, #e6a16c 54%, #9b79c5);
    }
    .screen-home #dashboard-performance-title { letter-spacing: -.025em; }
    .screen-home #dashboard-performance-title + p { color: #72878b; }
    .screen-home .dashboard-performance-live {
      display: inline-flex; align-items: center; gap: .4rem; padding: .35rem .6rem;
      border: 1px solid #cfe9df; border-radius: 999px; background: linear-gradient(135deg, #eff9f5, #e7f5ef);
      color: #327865; font-size: 10px; font-weight: 700; white-space: nowrap;
      box-shadow: inset 0 1px 0 #fff;
    }
    .screen-home .dashboard-performance-live > span {
      width: 7px; height: 7px; border-radius: 50%; background: #45ac8d;
      box-shadow: 0 0 0 3px rgb(69 172 141 / 12%);
    }
    .screen-home .dashboard-performance-layout { display: grid; gap: 1rem; }
    .screen-home .dashboard-cleaning-overview {
      display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center;
      gap: .85rem; min-width: 0;
    }
    .screen-home .dashboard-cleaning-gauge {
      position: relative; width: 76px; height: 76px; flex: 0 0 76px;
      filter: drop-shadow(0 4px 8px rgb(205 142 84 / 13%));
    }
    .screen-home .dashboard-cleaning-gauge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .screen-home .dashboard-cleaning-gauge circle { fill: none; stroke-width: 8; }
    .screen-home .dashboard-cleaning-gauge-track { stroke: #e9eeee; }
    .screen-home .dashboard-cleaning-gauge-value {
      stroke: #e49a5e; stroke-linecap: round; stroke-dasharray: 263.9;
      stroke-dashoffset: 263.9; transition: stroke-dashoffset .4s ease;
    }
    .screen-home .dashboard-cleaning-gauge-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .05rem;
    }
    .screen-home .dashboard-cleaning-gauge-center strong {
      color: var(--hotel-ink); font-size: 15px; font-weight: 800; line-height: 1;
    }
    .screen-home .dashboard-cleaning-gauge-center span { color: var(--hotel-muted); font-size: 8px; }
    .screen-home .dashboard-cleaning-overview-copy { display: flex; flex-direction: column; min-width: 0; }
    .screen-home .dashboard-performance-kicker {
      display: block; margin-bottom: .15rem; color: var(--hotel-muted); font-size: 11px; font-weight: 600;
    }
    .screen-home .dashboard-cleaning-overview-copy > strong {
      color: var(--hotel-ocean); font-size: 1.35rem; font-weight: 700; letter-spacing: -.04em; line-height: 1.2;
    }
    .screen-home .dashboard-cleaning-overview-copy > strong span,
    .screen-home .dashboard-performance-total {
      color: var(--hotel-muted); font-size: 10px; font-weight: 500;
    }
    .screen-home .dashboard-cleaning-load {
      min-width: 0; padding: .7rem .75rem; border: 1px solid #edf1f1;
      border-radius: .9rem; background: linear-gradient(135deg, rgb(255 255 255 / 95%), rgb(248 251 250 / 94%));
      box-shadow: 0 5px 14px rgb(24 54 66 / 4%);
    }
    .screen-home .dashboard-cleaning-load-heading {
      display: flex; align-items: center; justify-content: space-between; gap: .5rem;
      color: var(--hotel-muted); font-size: 10px;
    }
    .screen-home .dashboard-cleaning-load-heading > span:first-child { color: #60747a; font-size: 10px; font-weight: 700; }
    .screen-home .dashboard-cleaning-load-percent {
      flex: 0 0 auto; padding: .2rem .45rem; border-radius: 999px;
      background: #fff4e8; color: #a65c19; font-size: 10px; font-weight: 700;
    }
    .screen-home .dashboard-cleaning-load-track {
      display: flex; height: 7px; margin-top: .6rem; overflow: hidden;
      border-radius: 999px; background: #edf1f1;
    }
    .screen-home .dashboard-cleaning-load-track > span { display: block; height: 100%; transition: width .35s ease; }
    .screen-home .dashboard-cleaning-load-track [data-cleaning-load-segment="pending"] { background: #e9a16d; }
    .screen-home .dashboard-cleaning-load-track [data-cleaning-load-segment="cleaning"] { background: #9b79c5; }
    .screen-home .dashboard-cleaning-load-legend {
      display: flex; justify-content: space-between; gap: .5rem; margin-top: .5rem;
      color: #60747a; font-size: 9px;
    }
    .screen-home .dashboard-cleaning-load-legend > span { display: inline-flex; align-items: center; gap: .3rem; }
    .screen-home .dashboard-cleaning-load-legend b { color: var(--hotel-ink); }
    .screen-home .dashboard-performance-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #e9a16d; }
    .screen-home .dashboard-cleaning-load-legend > span:first-child .dashboard-performance-dot { background: #e9a16d; }
    .screen-home .dashboard-cleaning-load-legend > span:last-child .dashboard-performance-dot { background: #9b79c5; }
    .screen-home .dashboard-cleaning-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
    .screen-home .dashboard-cleaning-kpi {
      display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .25rem .4rem;
      min-width: 0; padding: .55rem .6rem; border: 1px solid #e8eeee;
      border-radius: .9rem; background: linear-gradient(145deg, #fff, #f9fbfa);
      box-shadow: 0 4px 12px rgb(24 54 66 / 4%);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .screen-home .dashboard-cleaning-kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgb(24 54 66 / 8%); }
    .screen-home .dashboard-cleaning-kpi .material-symbols-outlined {
      display: grid; width: 1.65rem; height: 1.65rem; place-items: center;
      border-radius: .55rem; background: #fff1e2; font-size: 15px; color: #b97838;
    }
    .screen-home .dashboard-cleaning-kpi > span:nth-child(2) {
      min-width: 0; overflow: hidden; color: #60747a; font-size: 9px;
      font-weight: 600; text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-home .dashboard-cleaning-kpi strong {
      grid-column: 2; color: var(--hotel-ink); font-size: 15px; font-weight: 800; line-height: 1;
    }
    .screen-home .dashboard-cleaning-kpi-active .material-symbols-outlined { background: #f1eafb; color: #8464aa; }
    .screen-home .dashboard-cleaning-kpi-completed .material-symbols-outlined { background: #e4f5ed; color: #278b70; }
    .screen-home .dashboard-activity {
      min-width: 0; padding: 1rem; border: 1px solid #e1e9e9; border-radius: 1.2rem;
      background: linear-gradient(145deg, rgb(255 255 255 / 96%), rgb(247 250 250 / 93%));
      box-shadow: 0 10px 24px rgb(24 54 66 / 6%);
    }
    .screen-home .dashboard-activity-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
    .screen-home .dashboard-activity-heading h2 { letter-spacing: -.02em; }
    .screen-home .dashboard-activity-heading p { margin-top: .1rem; color: var(--hotel-muted); font-size: 11px; }
    .screen-home .dashboard-activity-heading button {
      flex: 0 0 auto; padding: .45rem .7rem; border: 1px solid #d1e8e2;
      border-radius: 999px; background: linear-gradient(135deg, #f1faf6, #e9f5f1); color: #176273;
      font-size: 10px; font-weight: 700; box-shadow: 0 3px 8px rgb(24 54 66 / 4%);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .screen-home .dashboard-activity-heading button:hover { transform: translateY(-1px); box-shadow: 0 6px 12px rgb(24 54 66 / 8%); }
    .screen-home .dashboard-activity-list { display: grid; gap: .45rem; margin-top: .75rem; }
    .screen-home .dashboard-activity-item {
      display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center;
      gap: .6rem; min-width: 0; padding: .55rem .6rem; border: 1px solid #edf1f1;
      border-radius: .85rem; background: linear-gradient(135deg, #fff, #fbfdfc);
      box-shadow: 0 3px 10px rgb(24 54 66 / 3%);
    }
    .screen-home .dashboard-activity-icon {
      display: grid; width: 2rem; height: 2rem; place-items: center;
      border-radius: .7rem; background: linear-gradient(145deg, #e5f5f0, #edf7f4); color: #218a80;
    }
    .screen-home .dashboard-activity-icon .material-symbols-outlined { font-size: 17px; }
    .screen-home .dashboard-activity-main { min-width: 0; }
    .screen-home .dashboard-activity-title {
      overflow: hidden; color: var(--hotel-ink); font-size: 11px; font-weight: 700;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-home .dashboard-activity-meta {
      overflow: hidden; margin-top: .1rem; color: var(--hotel-muted); font-size: 9px;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-home .dashboard-activity-status {
      padding: .25rem .45rem; border-radius: 999px; background: #eff4f4;
      color: #536970; font-size: 9px; font-weight: 700; white-space: nowrap;
    }
    .screen-home .dashboard-activity-empty {
      padding: .9rem; border: 1px dashed #dce8e7; border-radius: .8rem;
      background: linear-gradient(135deg, #f8fbfa, #fff); color: var(--hotel-muted);
      font-size: 11px; text-align: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .screen-home #dashboard-actions button,
      .screen-home .dashboard-cleaning-kpi,
      .screen-home .dashboard-activity-heading button,
      .screen-home .dashboard-cleaning-gauge-value,
      .screen-home .dashboard-cleaning-load-track > span {
        transition: none;
      }
    }
    .screen-rooms > main > div:first-child > section:first-of-type > div {
      overflow: hidden; position: relative; border: 1px solid rgb(134 223 211 / 28%);
      border-radius: 1rem; background: linear-gradient(115deg, #123a4a, #176273) !important;
      box-shadow: 0 12px 26px rgb(13 44 58 / 14%);
    }
    .screen-rooms > main > div:first-child > section:first-of-type { display: none; }
    .screen-rooms > main > div:first-child > section:first-of-type h2 { color: #f2fbfa !important; font-size: 1.65rem; }
    .screen-rooms > main > div:first-child > section:first-of-type span { color: #c1e0df !important; }
    .screen-rooms > main > div:first-child > section:first-of-type .bg-surface-container-lowest { border: 1px solid rgb(134 223 211 / 34%); background: rgb(255 255 255 / 10%) !important; }
    .screen-rooms #roomDetailPanel[data-state="empty"] {
      border: 1px dashed #cbd4d8; background: #e8edef !important;
      box-shadow: inset 0 1px 2px rgb(40 58 66 / 4%); color: #78868c;
      cursor: not-allowed;
    }
    .screen-rooms #roomDetailEmpty { color: #78868c; }
    .screen-rooms #roomDetailEmpty[hidden],
    .screen-rooms #roomDetailContent[hidden] { display: none !important; }
    .screen-rooms #roomDetailEmpty > div:first-child {
      border: 1px solid #d4dde0; background: #dde4e7 !important; color: #849197 !important;
    }
    .screen-rooms #roomDetailEmpty h3 { color: #68777e !important; }
    .screen-rooms #roomDetailEmpty p { color: #7e8b91 !important; }
    .screen-rooms #roomDetailPanel[data-state="selected"] { cursor: default; }
    .screen-rooms .room-detail-card {
      transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
    }
    .screen-rooms .room-detail-card:hover {
      transform: translateY(-1px);
      border-color: #bce3dc;
      box-shadow: 0 4px 12px rgba(13, 44, 58, 0.05);
    }
    .screen-rooms #sheetActionButtons button {
      transition: all .16s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .screen-rooms #sheetActionButtons button:active {
      transform: scale(0.98);
    }
    .screen-rooms .room-cleaning-plan-readonly {
      display: flex; align-items: center; gap: .5rem; min-height: 38px;
      padding: .5rem .65rem; border-radius: .7rem;
      background: #e8f3f1; color: #176273; font-size: 12px; font-weight: 700;
    }
    .screen-rooms .room-cleaning-plan-readonly[data-assigned="false"] {
      background: #f0f3f3; color: #718186; font-weight: 500;
    }
    .screen-rooms #roomsGrid > *,
    .screen-cleaning #rooms-list > *,
    .screen-history #room-list > * {
      border: 1px solid var(--hotel-line); border-radius: .9rem;
      box-shadow: 0 5px 18px rgb(24 54 66 / 7%); transition: transform .18s ease, box-shadow .18s ease;
    }
    .screen-rooms #roomsGrid { grid-auto-rows: 5.25rem; }
    .screen-rooms #roomsGrid > .room-card {
      position: relative; display: flex; flex-direction: row; align-items: center; gap: .7rem;
      align-self: stretch; height: 100%; min-width: 0; min-height: 0; padding: .4rem .6rem;
      overflow: hidden; isolation: isolate; border: 1px solid #e6eceb;
      border-radius: .9rem; background: linear-gradient(145deg, #fff, #f8fbfa);
      box-shadow: 0 3px 10px rgb(24 54 66 / 5%);
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .screen-rooms #roomsGrid > .room-card.hidden { display: none; }
    .screen-rooms .room-card-image {
      position: relative; width: 3rem; height: 3rem; flex: 0 0 3rem;
      overflow: hidden; border: 1px solid #e8eeee; border-radius: .65rem;
      background: linear-gradient(135deg, #e8f2f0, #f1e8e8 55%, #f4f0e7);
    }
    .screen-rooms .room-card-image img {
      display: block; width: 100%; height: 100%; object-fit: cover;
      filter: saturate(.9); transition: transform .25s ease, filter .25s ease;
    }
    .screen-rooms .room-card-image[data-image-unavailable="true"]::before {
      position: absolute; inset: 0; display: grid; place-items: center;
      color: rgb(24 54 66 / 42%); content: "bed"; font-family: "Material Symbols Outlined";
      font-size: 24px; font-feature-settings: "liga";
    }
    .screen-rooms .room-card-content {
      display: grid; flex: 1; min-width: 0;
    }
    .screen-rooms .room-card-heading { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: .35rem; }
    .screen-rooms .room-card-title {
      overflow: hidden; color: var(--hotel-ink); font-size: 13px; font-weight: 750;
      line-height: 1.2; letter-spacing: -.01em; text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-rooms .room-card-status {
      display: inline-flex; flex: 0 0 auto; align-items: center; gap: .3rem;
      padding: .25rem .42rem !important; border: 1px solid transparent;
      border-radius: 999px; background: #e8f4ef !important;
      color: #28735f !important; font-size: 8px !important; font-weight: 700;
      line-height: 1.2;
    }
    .screen-rooms .room-card-status::before {
      width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%; content: "";
      background: #1c9a82;
    }
    .screen-rooms .room-card-status.bg-status-occupied-bg { background: #fff0f1 !important; color: #b94a5d !important; }
    .screen-rooms .room-card-status.bg-status-pending-bg { background: #fff4e8 !important; color: #a65c19 !important; }
    .screen-rooms .room-card-status.bg-status-cleaning-bg { background: #f3edff !important; color: #6848a1 !important; }
    .screen-rooms .room-card-status.bg-status-occupied-bg::before { background: #d94f68; }
    .screen-rooms .room-card-status.bg-status-pending-bg::before { background: #de842b; }
    .screen-rooms .room-card-status.bg-status-cleaning-bg::before { background: #8051c8; }
    .screen-rooms #roomsGrid > .room-card::before {
      position: absolute; z-index: 2; top: .65rem; bottom: .65rem; left: 0; width: 3px;
      border-radius: 0 999px 999px 0; content: ""; background: #52b69c;
    }
    .screen-rooms #roomsGrid > .room-card[data-status="occupied"]::before { background: #e77988; }
    .screen-rooms #roomsGrid > .room-card[data-status="pending"]::before { background: #eda45b; }
    .screen-rooms #roomsGrid > .room-card[data-status="cleaning"]::before { background: #9b72cf; }
    .screen-rooms #roomsGrid > .room-card:hover {
      transform: translateY(-2px); border-color: #c9ded9;
      box-shadow: 0 8px 18px rgb(13 44 58 / 10%);
    }
    .screen-rooms #roomsGrid > .room-card:hover .room-card-image img {
      filter: saturate(1); transform: scale(1.04);
    }
    @media (max-width: 420px) {
      .screen-rooms #roomsGrid { grid-auto-rows: 4.8rem; gap: .5rem; }
      .screen-rooms #roomsGrid > .room-card { gap: .45rem; padding: .4rem .45rem; border-radius: .75rem; }
      .screen-rooms .room-card-image { width: 2.45rem; height: 2.45rem; flex-basis: 2.45rem; border-radius: .5rem; }
      .screen-rooms .room-card-heading { align-items: flex-start; flex-direction: column; gap: .2rem; }
      .screen-rooms .room-card-title { font-size: 11px; }
      .screen-rooms .room-card-status { gap: .22rem; padding: .18rem .32rem !important; font-size: 7px !important; }
    }
    .screen-rooms #roomsGrid > * { overflow: visible; }
    .screen-rooms #roomsGrid > *:hover,
    .screen-cleaning #rooms-list > *:hover,
    .screen-history #room-list > *:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgb(24 54 66 / 12%); }

    .screen-cleaning > main > div:first-child > div:first-child {
      margin: .5rem 1.25rem .25rem; padding: 1.1rem 1.25rem; border: 1px solid rgb(134 223 211 / 28%);
      border-radius: 1rem; color: #f2fbfa; background: linear-gradient(115deg, #123a4a, #176273);
    }
    .screen-cleaning > main > div:first-child > div:first-child h1,
    .screen-cleaning > main > div:first-child > div:first-child span { color: #f2fbfa !important; }
    .screen-cleaning > main > div:first-child > div:first-child button { border: 1px solid rgb(134 223 211 / 45%); background: var(--hotel-mint) !important; color: var(--hotel-ocean-dark) !important; }
    .screen-cleaning #cleaning-workspace {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem;
      margin: .25rem 1rem 1rem;
    }
    .screen-cleaning .cleaning-selection,
    .screen-cleaning .cleaning-config-panel {
      min-width: 0; padding: 1rem; border: 1px solid var(--hotel-line);
      border-radius: 1.15rem; background: #fff; box-shadow: 0 6px 20px rgb(24 54 66 / 6%);
    }
    .screen-cleaning .cleaning-section-heading {
      display: flex; align-items: center; gap: .65rem; margin: 0 0 .85rem;
      color: var(--hotel-ink); font-size: 15px; font-weight: 700;
    }
    .screen-cleaning .cleaning-step-number {
      display: grid; width: 1.8rem; height: 1.8rem; flex: 0 0 auto;
      place-items: center; border-radius: 50%; background: #e4f5f1;
      color: #167f72; font-size: 12px;
    }
    .screen-cleaning #filter-container {
      display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; margin-bottom: .75rem;
    }
    .screen-cleaning .filter-tab {
      min-height: 34px; padding: .35rem .7rem; border: 1px solid #e3ebeb;
      background: #f7f9f9; color: #63777c; font-size: 11px; font-weight: 700;
    }
    .screen-cleaning .filter-tab.active {
      border-color: var(--hotel-ocean); background: var(--hotel-ocean) !important;
      color: #fff !important;
    }
    .screen-cleaning #cleaning-room-options {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem;
    }
    .screen-cleaning .cleaning-room-option {
      display: flex; min-width: 0; min-height: 76px; align-items: center; gap: .65rem;
      padding: .65rem; border: 1px solid #e2eaea; border-radius: .9rem;
      background: #fbfdfd; color: var(--hotel-ink); text-align: left;
      transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
    }
    .screen-cleaning .cleaning-room-option:hover { border-color: #9dcfc7; }
    .screen-cleaning .cleaning-room-option[aria-pressed="true"] {
      border-color: #168d80; background: #eef9f7;
      box-shadow: 0 0 0 2px rgb(38 183 166 / 15%);
    }
    .screen-cleaning .cleaning-room-option[hidden] { display: none !important; }
    .screen-cleaning .cleaning-room-number {
      display: grid; width: 2.65rem; height: 2.65rem; flex: 0 0 auto;
      place-items: center; border-radius: .8rem; background: #e9f1f1;
      color: var(--hotel-ocean); font-size: 15px; font-weight: 800;
    }
    .screen-cleaning .cleaning-room-option[data-status="cleaning"] .cleaning-room-number { background: #f0eafa; color: #7545b0; }
    .screen-cleaning .cleaning-room-option[data-status="pending"] .cleaning-room-number { background: #fff1e5; color: #bd682d; }
    .screen-cleaning .cleaning-room-copy { display: grid; min-width: 0; gap: .2rem; }
    .screen-cleaning .cleaning-room-name {
      overflow: hidden; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-cleaning .cleaning-room-status {
      display: flex; min-width: 0; align-items: flex-start; gap: .3rem;
      color: #71868c; font-size: 10px; line-height: 1.35;
    }
    .screen-cleaning .cleaning-room-status .material-symbols-outlined { flex: 0 0 auto; margin-top: .05rem; }
    .screen-cleaning .cleaning-config-panel {
      min-height: 520px; height: auto; overflow: visible;
    }
    .screen-cleaning .cleaning-config-panel > .cleaning-section-heading { margin-bottom: 1rem; }
    .screen-cleaning .cleaning-config-empty {
      display: grid; min-height: 220px; align-content: center; justify-items: center;
      padding: 1rem; color: #71868c; text-align: center;
    }
    .screen-cleaning .cleaning-config-empty-icon {
      display: grid; width: 3.2rem; height: 3.2rem; margin-bottom: .75rem;
      place-items: center; border-radius: 1rem; background: #edf5f4; color: #4a8f87;
      font-size: 25px;
    }
    .screen-cleaning .cleaning-config-empty strong { color: var(--hotel-ink); font-size: 14px; }
    .screen-cleaning .cleaning-config-empty p { max-width: 260px; margin: .35rem 0 0; font-size: 12px; line-height: 1.5; }
    .screen-cleaning .cleaning-detail-header {
      display: flex; align-items: center; justify-content: space-between; gap: .75rem;
      margin-bottom: .25rem; padding-bottom: 1rem; border-bottom: 1px solid #edf1f1;
    }
    .screen-cleaning .cleaning-detail-room { display: flex; min-width: 0; align-items: center; gap: .7rem; }
    .screen-cleaning .cleaning-detail-icon {
      display: grid; width: 2.8rem; height: 2.8rem; flex: 0 0 auto;
      place-items: center; border-radius: .9rem; background: #e5f4f1; color: #168d80;
    }
    .screen-cleaning .cleaning-detail-room h3 { margin: 0; color: var(--hotel-ink); font-size: 16px; }
    .screen-cleaning .cleaning-detail-room p { margin: .2rem 0 0; color: #71868c; font-size: 11px; }
    .screen-cleaning .cleaning-status-pill {
      flex: 0 0 auto; padding: .35rem .6rem; border-radius: 999px;
      background: #edf3f3; color: #5b7176; font-size: 10px; font-weight: 700;
    }
    .screen-cleaning .cleaning-field-label {
      display: block; margin: 1rem 0 .55rem; color: #536970;
      font-size: 11px; font-weight: 700;
    }
    .screen-cleaning .cleaning-staff-select {
      width: 100%; min-height: 42px; padding: .6rem .75rem;
      border: 1px solid #dfe8e8; border-radius: .75rem;
      background: #fff; color: var(--hotel-ink); font: inherit; font-size: 12px;
    }
    .screen-cleaning .cleaning-details-input {
      display: block; width: 100%; min-height: 88px; resize: vertical;
      padding: .65rem .75rem; border: 1px solid #dfe8e8; border-radius: .75rem;
      background: #fff; color: var(--hotel-ink); font: inherit; font-size: 12px;
      line-height: 1.45;
    }
    .screen-cleaning .cleaning-details-input::placeholder { color: #96a5a8; }
    .screen-cleaning .cleaning-assignment-section {
      margin-top: 1.35rem; padding: 1rem; border: 1px solid #e6eded;
      border-radius: .9rem; background: #f8fbfb;
    }
    .screen-cleaning .cleaning-assignment-section .cleaning-section-heading {
      margin-bottom: .75rem; font-size: 13px;
    }
    .screen-cleaning .cleaning-type-options {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .45rem;
    }
    .screen-cleaning .cleaning-type-option {
      display: flex; min-width: 0; min-height: 62px; align-items: center; gap: .4rem;
      padding: .5rem; border: 1px solid #e1e9e9; border-radius: .75rem;
      background: #fbfcfc; color: #60757a; font-size: 10px; font-weight: 700;
      text-align: left;
    }
    .screen-cleaning .cleaning-type-option .material-symbols-outlined { font-size: 18px; }
    .screen-cleaning .cleaning-type-copy { display: grid; min-width: 0; gap: .15rem; }
    .screen-cleaning .cleaning-type-copy strong { font-size: 10px; line-height: 1.2; }
    .screen-cleaning .cleaning-type-copy small { color: #71868c; font-size: 9px; line-height: 1.2; }
    .screen-cleaning .cleaning-type-option[aria-pressed="true"] {
      border-color: #168d80; background: #edf8f6; color: #126d64;
    }
    .screen-cleaning .cleaning-type-option[aria-pressed="true"] small { color: #4a817a; }
    .screen-cleaning .cleaning-config-actions {
      display: grid; grid-template-columns: minmax(0, 1fr);
      gap: .5rem; margin-top: 1rem;
    }
    .screen-cleaning .cleaning-config-actions button {
      min-height: 44px; padding: .55rem .7rem; border: 0; border-radius: .8rem;
      font: inherit; font-size: 11px; font-weight: 700;
    }
    .screen-cleaning .cleaning-config-actions .cleaning-save-button:not(:disabled) {
      background: linear-gradient(105deg, #218266, #2b9a72); color: #fff;
      box-shadow: 0 4px 10px rgb(33 130 102 / 18%);
    }
    .screen-cleaning .cleaning-config-actions .cleaning-save-button:not(:disabled):hover {
      background: linear-gradient(105deg, #176d55, #218266);
    }
    .screen-cleaning .cleaning-save-button {
      min-height: 42px; padding: .55rem .7rem; border: 0; border-radius: .8rem;
      background: #eaf3f2; color: #35525a; font: inherit; font-size: 11px; font-weight: 700;
    }
    .screen-cleaning .cleaning-config-actions button:disabled { cursor: not-allowed; opacity: .48; }
    .screen-cleaning .cleaning-save-button:disabled { cursor: not-allowed; opacity: .48; }
    .screen-cleaning .cleaning-staff-help {
      margin: .45rem 0 0; color: #71868c; font-size: 11px; line-height: 1.45;
    }
    .screen-cleaning .cleaning-staff-help button {
      padding: 0; border: 0; background: none; color: #147d73;
      font: inherit; font-weight: 700; text-decoration: underline;
    }
    .screen-cleaning #rooms-list { display: none !important; }
    .screen-history > main > div:first-child {
      gap: 1.25rem !important; padding-bottom: 2.5rem !important;
    }
    .screen-history .history-kpi-card {
      transition: transform .18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .18s ease, border-color .18s ease;
    }
    .screen-history .history-kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px -4px rgba(13, 44, 58, 0.08);
      border-color: #bce3dc;
    }
    .screen-history .history-heading {
      display: flex; align-items: center; justify-content: space-between;
      margin: .25rem 0 0; color: var(--hotel-ink); font-size: 19px; font-weight: 800;
    }
    .screen-history .history-heading small {
      color: #71868c; font-size: 11px; font-weight: 500;
    }
    .screen-history .history-toolbar {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: .65rem;
    }
    .screen-history .history-search-wrap { position: relative; min-width: 0; width: 100%; }
    .screen-history .history-search-wrap > .material-symbols-outlined {
      position: absolute; top: 50%; left: .85rem; transform: translateY(-50%);
      color: #637d84; font-size: 20px; pointer-events: none;
    }
    .screen-history .history-search {
      width: 100%; height: 44px; padding: 0 2.5rem;
      border: 1px solid #dce8e6; border-radius: 1rem;
      outline: none; background: #fff; color: var(--hotel-ink);
      font: inherit; font-size: 13px; font-weight: 500;
      box-shadow: 0 2px 8px rgba(13, 44, 58, 0.03);
      transition: border-color .18s ease, box-shadow .18s ease;
    }
    .screen-history .history-search:focus {
      border-color: #26b7a6;
      box-shadow: 0 0 0 3px rgba(38, 183, 166, 0.16);
    }
    .screen-history .history-search-clear {
      position: absolute; top: 50%; right: .65rem; transform: translateY(-50%);
      display: grid; width: 26px; height: 26px; place-items: center; border: 0;
      border-radius: 50%; background: #edf2f2; color: #526970; cursor: pointer;
      transition: background .15s ease, color .15s ease;
    }
    .screen-history .history-search-clear:hover {
      background: #e1ebec; color: #0d2c3a;
    }
    .screen-history .history-period-filters { display: flex; gap: .4rem; overflow-x: auto; padding: 2px 0; }
    .screen-history .history-period-filters .filter-btn {
      min-height: 36px; padding: .4rem .95rem; border: 1px solid #e1e9e9;
      border-radius: 9999px; background: #fff; color: #526970;
      font-size: 11px; font-weight: 700; white-space: nowrap; cursor: pointer;
      box-shadow: 0 1px 4px rgba(13, 44, 58, 0.04);
      transition: all .18s ease;
    }
    .screen-history .history-period-filters .filter-btn:hover {
      background: #f4f8f7; color: #0d2c3a; border-color: #cde1df;
    }
    .screen-history .history-period-filters .filter-btn.active,
    .screen-history .history-period-filters .filter-btn.bg-coral-primary {
      border-color: #123a4a !important; background: #123a4a !important;
      color: #fff !important; box-shadow: 0 4px 12px rgba(18, 58, 74, 0.22);
    }
    .screen-history #room-list {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: .65rem;
    }
    .screen-history #room-list > .room-item {
      position: relative;
      display: grid; grid-template-columns: 2.75rem minmax(0, 1fr) auto;
      align-items: center; gap: .85rem; min-width: 0; min-height: 74px;
      margin: 0 !important; padding: .85rem 1rem; overflow: hidden;
      border: 1px solid #e3ebea; border-radius: 1.15rem; background: #fff;
      box-shadow: 0 3px 12px rgba(13, 44, 58, 0.04);
      cursor: pointer;
      transition: transform .18s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color .18s ease,
                  box-shadow .18s ease;
    }
    .screen-history #room-list > .room-item::before {
      content: "";
      position: absolute; left: 0; top: 12px; bottom: 12px; width: 4px;
      border-radius: 0 4px 4px 0; background: #26b7a6;
      transition: width .18s ease;
    }
    .screen-history #room-list > .room-item[data-status="free"]::before { background: #26b7a6; }
    .screen-history #room-list > .room-item[data-status="cleaning"]::before { background: #8a63d2; }
    .screen-history #room-list > .room-item[data-status="pending"]::before { background: #e58e37; }
    .screen-history #room-list > .room-item[data-status="occupied"]::before { background: #f05d72; }

    .screen-history #room-list > .room-item:hover {
      transform: translateY(-2px);
      border-color: #b8dcda;
      box-shadow: 0 10px 24px -4px rgba(13, 44, 58, 0.09);
    }
    .screen-history #room-list > .room-item:hover::before {
      width: 6px;
    }
    .screen-history #room-list > .room-item:active {
      transform: scale(0.99);
    }
    .screen-history .history-event-icon {
      display: grid; width: 2.75rem; height: 2.75rem; place-items: center;
      border-radius: .85rem; background: #edf7f5; color: #1c8274;
      font-size: 21px; flex-shrink: 0;
      transition: transform .18s ease;
    }
    .screen-history #room-list > .room-item:hover .history-event-icon {
      transform: scale(1.06);
    }
    .screen-history .history-event-icon[data-status="pending"] { background: #fff4ec; color: #c26227; }
    .screen-history .history-event-icon[data-status="cleaning"] { background: #f4eefd; color: #7545b0; }
    .screen-history .history-event-icon[data-status="occupied"] { background: #fdf0f3; color: #c83256; }
    .screen-history .history-event-icon[data-status="free"] { background: #e8f8f4; color: #1c8274; }

    .screen-history .history-event-copy { display: grid; min-width: 0; gap: .25rem; }
    .screen-history .history-event-title {
      display: flex; align-items: center; gap: .45rem;
      overflow: hidden; color: #0d2c3a; font-size: 13px; font-weight: 800;
      text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;
    }
    .screen-history .history-room-tag {
      display: inline-flex; align-items: center; padding: 2px 7px;
      border-radius: 6px; background: #eaf3f3; color: #123a4a;
      font-size: 11px; font-weight: 800; letter-spacing: -0.01em; flex-shrink: 0;
    }
    .screen-history .history-event-meta {
      display: flex; align-items: center; gap: .3rem;
      overflow: hidden; color: #617b82; font-size: 11px; font-weight: 500;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-history .history-event-meta .material-symbols-outlined {
      font-size: 14px; opacity: .8;
    }
    .screen-history .history-event-time {
      display: grid; justify-items: end; gap: .25rem; color: #123a4a;
      font-size: 11px; font-weight: 800; white-space: nowrap;
    }
    .screen-history .history-event-time small {
      color: #799097; font-size: 9.5px; font-weight: 600;
      background: #f1f6f6; padding: 1px 5px; border-radius: 4px;
    }
    .screen-history .history-event-badge {
      display: inline-flex; align-items: center; gap: 4px; width: fit-content; max-width: 100%;
      padding: .2rem .55rem; overflow: hidden; border-radius: 999px;
      background: #edf7f5; color: #1c8274; font-size: 9.5px; font-weight: 700;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-history .history-event-badge::before {
      content: ""; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor; flex-shrink: 0;
    }
    .screen-history .history-event-badge[data-status="pending"] { background: #fff4ec; color: #c26227; }
    .screen-history .history-event-badge[data-status="cleaning"] { background: #f4eefd; color: #7545b0; }
    .screen-history .history-event-badge[data-status="occupied"] { background: #fdf0f3; color: #c83256; }
    .screen-history .history-event-badge[data-status="free"] { background: #e8f8f4; color: #1c8274; }

    .screen-history #room-list > .room-item { cursor: pointer; }
    .screen-history #room-list > .room-item:focus-visible {
      outline: 3px solid rgb(38 183 166 / 32%); outline-offset: 2px;
    }
    .screen-history .history-detail-overlay {
      position: fixed; z-index: 120; inset: 0; display: flex; align-items: center;
      justify-content: center; padding: 1rem; background: rgba(13, 44, 58, 0.45);
      backdrop-filter: blur(8px); animation: history-overlay-in .18s ease-out;
    }
    .screen-history .history-detail-dialog {
      width: min(100%, 430px); overflow: hidden; border: 1px solid #dbe6e5;
      border-radius: 1.5rem; background: #fff;
      box-shadow: 0 24px 60px -8px rgba(13, 44, 58, 0.25);
      animation: history-dialog-in .2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .screen-history .history-detail-heading {
      display: flex; align-items: center; gap: .9rem; padding: 1.25rem 1.4rem;
      border-bottom: 1px solid #edf4f3; background: #fafdfc;
    }
    .screen-history .history-detail-mark {
      display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center;
      border-radius: .95rem; background: #e8f8f4; color: #1c8274; font-size: 24px;
    }
    .screen-history .history-detail-mark[data-status="pending"] { background: #fff4ec; color: #c26227; }
    .screen-history .history-detail-mark[data-status="cleaning"] { background: #f4eefd; color: #7545b0; }
    .screen-history .history-detail-mark[data-status="occupied"] { background: #fdf0f3; color: #c83256; }
    .screen-history .history-detail-mark[data-status="free"] { background: #e8f8f4; color: #1c8274; }

    .screen-history .history-detail-title { min-width: 0; flex: 1; }
    .screen-history .history-detail-title h2 {
      margin: 0 0 .2rem; color: #0d2c3a; font-size: 16px; font-weight: 800;
      line-height: 1.2;
    }
    .screen-history .history-detail-title p {
      margin: 0; color: #617b82; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere;
    }
    .screen-history .history-detail-close {
      display: grid; width: 2.1rem; height: 2.1rem; flex: 0 0 auto; place-items: center;
      border: 1px solid #e1e9e8; border-radius: .75rem; background: #fff; color: #637c83;
      cursor: pointer; transition: all .16s ease;
    }
    .screen-history .history-detail-close:hover { background: #eef5f4; color: #0d2c3a; }
    .screen-history .history-detail-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem;
      padding: 1.25rem 1.4rem 1.4rem;
    }
    .screen-history .history-detail-field {
      min-width: 0; padding: .8rem .9rem; border: 1px solid #e9f0ef;
      border-radius: .9rem; background: #f8fbfb;
    }
    .screen-history .history-detail-field-wide { grid-column: 1 / -1; }
    .screen-history .history-detail-label {
      display: block; margin-bottom: .3rem; color: #7f959c; font-size: 10px;
      font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    }
    .screen-history .history-detail-value {
      display: block; color: #0d2c3a; font-size: 13px; font-weight: 700;
      line-height: 1.4; overflow-wrap: anywhere;
    }
    @keyframes history-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes history-dialog-in { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (prefers-reduced-motion: reduce) {
      .screen-history .history-detail-overlay, .screen-history .history-detail-dialog { animation: none; }
    }
    .screen-history #empty-state {
      grid-column: 1 / -1; min-height: 160px; border: 1px dashed #cbdcda;
      background: #f8fbfb; box-shadow: none;
    }
    .screen-history .history-export {
      display: flex; flex-direction: row !important; gap: .85rem; align-items: center !important;
      justify-content: space-between; padding: .85rem 1.1rem; border: 1px solid #e1e9e9;
      border-radius: 1.15rem; background: #fff; box-shadow: 0 2px 10px rgba(13, 44, 58, 0.03);
    }
    .screen-history #export-btn {
      min-height: 40px; height: 40px; padding: 0 1.15rem;
      border-radius: .8rem; background: #123a4a !important; color: #fff !important;
      font-size: 12px; font-weight: 700; border: none; cursor: pointer;
      box-shadow: 0 4px 12px rgba(18, 58, 74, 0.2);
      transition: background .18s ease, transform .15s ease;
    }
    .screen-history #export-btn:hover { background: #0d2c3a !important; transform: translateY(-1px); }
    .screen-history #export-btn > span:first-child { display: inline-flex; }
    .screen-history .history-export > span {
      margin: 0 !important; text-align: left; font-size: 11px; line-height: 1.4;
    }
    @media (max-width: 600px) {
      .screen-rooms #roomSearchInput {
        height: 38px; padding-left: 2.25rem; padding-right: 2.25rem;
        border-radius: .7rem; font-size: 13px; line-height: 1.2;
        box-shadow: 0 2px 8px rgb(13 44 58 / 5%);
      }
      .screen-rooms #filterChipsTrack {
        display: flex; flex-direction: column; align-items: stretch;
        gap: .25rem; padding: .125rem 1rem;
      }
      .screen-rooms #filterChipsTrack .room-filter-row {
        display: grid; align-items: center; gap: .25rem;
      }
      .screen-rooms #filterChipsTrack .room-status-filter-row {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .screen-rooms #filterChipsTrack .room-plan-filter-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .screen-rooms #filterChipsTrack .filter-chip {
        display: flex; width: 100%; min-width: 0; height: 36px; min-height: 36px;
        flex: 0 0 auto; flex-wrap: nowrap; justify-content: center; gap: 3px;
        padding: 3px 2px; overflow: hidden; border: 1px solid #e1e9e9;
        border-radius: 12px; background: #fff; color: #536970;
        box-shadow: 0 2px 6px rgb(13 44 58 / 5%);
        font-size: 9px; font-weight: 700; line-height: 1.05; text-align: center;
        white-space: normal; transition: background-color .18s ease, color .18s ease,
          border-color .18s ease, box-shadow .18s ease;
      }
      .screen-rooms #filterChipsTrack .filter-chip > span.w-2 { display: none; }
      .screen-rooms #filterChipsTrack .filter-chip > span:not(.w-2) { min-width: 0; }
      .screen-rooms #filterChipsTrack .filter-chip[data-filter^="service-"] > [data-filter-label] {
        display: inline !important; visibility: visible !important; flex: 0 1 auto;
      }
      .screen-rooms #filterChipsTrack .filter-chip > span.font-label-sm {
        flex: 0 0 auto; padding: 1px 3px; border-radius: 999px;
        background: #edf2f2; font-size: 8px; line-height: 1.2;
      }
      .screen-rooms #filterChipsTrack .filter-chip[data-filter="free"] { border-color: #cfe9df; }
      .screen-rooms #filterChipsTrack .filter-chip[data-filter="occupied"] { border-color: #f0d7dc; }
      .screen-rooms #filterChipsTrack .filter-chip[data-filter="pending"] { border-color: #f1e0cf; }
      .screen-rooms #filterChipsTrack .filter-chip[data-filter="cleaning"] { border-color: #e4d9f2; }
      .screen-rooms #filterChipsTrack .filter-chip.active {
        border-color: #123a4a !important;
        background: linear-gradient(135deg, #123a4a, #176273) !important;
        color: #fff !important; box-shadow: 0 4px 10px rgb(18 58 74 / 20%);
      }
      .screen-rooms #filterChipsTrack .filter-chip.active > span.font-label-sm {
        background: rgb(255 255 255 / 18%); color: #fff;
      }
    }
    @media (min-width: 640px) {
      html, body { width: 100%; min-height: 100%; }
      body { min-height: 100dvh; }
      body > header > div { max-width: 1360px; margin-inline: auto; }
      body > main > div:first-child { width: 100%; max-width: 1200px; margin-inline: auto; }
      main { padding-bottom: 2rem !important; }
      #roomsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
      #rooms-list, #room-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      #rooms-list > *, #room-list > * { margin-top: 0 !important; }
      #rooms-list > .room-item, #room-list > .room-item { min-width: 0; }
      .screen-cleaning #cleaning-workspace { margin: .25rem 1.5rem 1rem; }
      .screen-cleaning #cleaning-room-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .screen-history > main > div:first-child { padding-left: 1rem; padding-right: 1rem; }
      .screen-history #room-list > .room-item { grid-template-columns: 2rem minmax(0, 1fr) auto; gap: .5rem; padding: .6rem; }
      .screen-history .history-event-icon { width: 2rem; height: 2rem; }
      .screen-history .history-event-title { font-size: 11px; }
      .screen-history .history-event-time { font-size: 9px; }
      .screen-home .dashboard-cleaning-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      #quickModal > div { margin-inline: auto; border-radius: 1.5rem; }
      #sheet-content { left: 50%; right: auto; width: min(100%, 560px); transform: translate(-50%, 100%); border-radius: 2rem 2rem 0 0; }
      #sheet-content:not(.translate-y-full) { transform: translate(-50%, 0); }
      .fixed.inset-0 > .max-w-md { max-width: 560px; }
    }
    @media (min-width: 768px) and (max-width: 1023px) {
      .screen-rooms > main > div:first-child {
        display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
        grid-template-rows: auto auto auto minmax(0, 1fr);
        height: 100%; min-height: 0;
        column-gap: 1rem; row-gap: .75rem; align-content: stretch;
      }
      .screen-rooms > main { height: 100%; min-height: 0; overflow: hidden; padding-bottom: 0 !important; }
      .screen-rooms > main > div:first-child > section:nth-of-type(1),
      .screen-rooms > main > div:first-child > section:nth-of-type(2),
      .screen-rooms > main > div:first-child > section:nth-of-type(3) { grid-column: 1 / -1; }
      .screen-rooms > main > div:first-child > section:nth-of-type(1) { padding: .3rem 1rem .2rem; }
      .screen-rooms > main > div:first-child > section:nth-of-type(1) > div { padding: .55rem .85rem; }
      .screen-rooms > main > div:first-child > section:nth-of-type(1) h2 { font-size: 1.3rem; line-height: 1.2; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) { padding: 0 1rem .2rem; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) input { height: 42px; }
      .screen-rooms > main > div:first-child > section:nth-of-type(3) { padding-bottom: .2rem; }
      .screen-rooms #filterChipsTrack { gap: .4rem; padding-top: 0; padding-bottom: 0; }
      .screen-rooms #filterChipsTrack .filter-chip { height: 32px; padding-inline: .65rem; font-size: 10px; }
      .screen-rooms > main > div:first-child > section:nth-of-type(4) {
        grid-column: 1 / 10; grid-row: 4; display: flex; flex-direction: column;
        min-height: 0; overflow: hidden; padding: 0 0 .5rem 1rem;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(5) {
        grid-column: 10 / -1; grid-row: 4; display: flex; flex-direction: column;
        min-height: 0; height: 100%; overflow: hidden;
        align-self: stretch; padding: 0 1rem .5rem 0;
      }
      .screen-rooms #roomsGrid {
        grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 5.25rem; gap: .55rem;
      }
      .screen-rooms #roomsGrid > .room-card {
        align-self: stretch; height: 100%; min-height: 0; gap: .45rem; padding: .4rem;
      }
      .screen-rooms .room-card-image { width: 2.6rem; height: 2.6rem; flex-basis: 2.6rem; }
      .screen-rooms .room-card-heading { align-items: flex-start; flex-direction: column; gap: .2rem; }
      .screen-rooms .room-card-title { font-size: 11px; }
      .screen-rooms .room-card-status { padding: .18rem .32rem !important; font-size: 7px !important; }
      .screen-rooms #roomsGrid {
        display: grid; flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
        align-content: start; scrollbar-width: thin; scrollbar-color: #9ac9c8 transparent;
      }
      .screen-rooms #roomDetailPanel {
        height: 100%; min-height: 0; padding: .75rem; overflow-y: auto;
        scrollbar-width: thin; scrollbar-color: #26b7a6 transparent;
        border: 1px solid #dce8e7; border-radius: 1.1rem;
        box-shadow: 0 10px 24px rgb(13 44 58 / 9%);
      }
      .screen-rooms #roomDetailPanel[data-state="empty"] { display: flex; }
      .screen-rooms #roomDetailEmpty { flex: 1; min-height: 0; width: 100%; }
      .screen-rooms #roomDetailContent > .flex.justify-center { display: none; }
      .screen-rooms #sheetInfoGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .45rem; }
      .screen-rooms .room-detail-card { padding: .45rem .55rem; border-radius: .75rem; }
    }
    @media (min-width: 900px) and (max-width: 1023px) {
      .screen-rooms > main > div:first-child > section:nth-of-type(4) {
        grid-column: 1 / 9;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(5) {
        grid-column: 9 / -1; padding-left: 0;
      }
      .screen-rooms #roomsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .screen-rooms #roomDetailPanel { padding: .65rem; }
      .screen-rooms #roomDetailContent:not([hidden]) { gap: .4rem; }
      .screen-rooms #roomDetailContent > div:nth-child(2) { gap: .35rem; margin-bottom: .45rem; }
      .screen-rooms #sheetInfoGrid { gap: .35rem; }
      .screen-rooms .room-detail-card { gap: .35rem; padding: .4rem; }
      .screen-rooms .room-detail-card > div:first-child {
        width: 1.5rem; height: 1.5rem; border-radius: .5rem;
      }
      .screen-rooms .room-detail-card > div:first-child .material-symbols-outlined { font-size: 13px; }
      .screen-rooms .room-detail-fact-value { font-size: 10px; }
      .screen-rooms #sheetActionButtons button {
        min-height: 40px; padding-inline: .5rem; font-size: 10px; line-height: 1.35;
      }
    }
    @media (min-width: 960px) {
      #roomsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
      #rooms-list, #room-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      body > main > div:first-child { max-width: 1360px; }
      body > header > div { max-width: 1360px; }
      .screen-cleaning > main > div:first-child > section.flex.flex-col.gap-3 > .flex.flex-col.gap-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .screen-cleaning #cleaning-workspace {
        grid-template-columns: minmax(0, 1.1fr) minmax(340px, .9fr);
        align-items: start;
        margin-bottom: .25rem;
      }
      .screen-cleaning .cleaning-selection,
      .screen-cleaning .cleaning-config-panel {
        min-height: 0;
      }
      .screen-cleaning .cleaning-selection {
        max-height: calc(100dvh - 200px); min-height: 0; overflow-y: auto;
        overscroll-behavior: contain;
      }
      .screen-cleaning .cleaning-config-panel {
        min-height: 520px; max-height: none; overflow: visible;
      }
      .screen-cleaning .cleaning-selection { display: flex; flex-direction: column; }
      .screen-cleaning #cleaning-room-options { min-height: 0; overflow-y: auto; }
      .screen-cleaning #cleaning-room-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .screen-cleaning .cleaning-config-panel { padding: 1rem; }
      .screen-cleaning .cleaning-config-panel > .cleaning-section-heading { margin-bottom: .8rem; }
      .screen-cleaning .cleaning-detail-header { padding-bottom: .8rem; }
      .screen-cleaning .cleaning-field-label { margin: .75rem 0 .4rem; }
      .screen-cleaning .cleaning-type-option { min-height: 58px; padding: .45rem; }
      .screen-cleaning .cleaning-type-options { gap: .45rem; }
      .screen-cleaning .cleaning-details-input { min-height: 72px; padding: .55rem .65rem; }
      .screen-cleaning .cleaning-assignment-section { margin-top: 1rem; padding: .8rem; }
      .screen-cleaning .cleaning-assignment-section .cleaning-section-heading { margin-bottom: .55rem; }
      .screen-cleaning .cleaning-staff-select { min-height: 40px; padding: .45rem .6rem; }
      .screen-cleaning .cleaning-staff-help { margin-top: .4rem; }
      .screen-cleaning .cleaning-config-actions { gap: .4rem; margin-top: .65rem; }
      .screen-cleaning .cleaning-config-actions button { min-height: 40px; padding: .45rem .6rem; }
      .screen-history .history-toolbar { grid-template-columns: minmax(220px, .9fr) minmax(0, 1.1fr); align-items: center; }
      .screen-history .history-period-filters { justify-content: flex-end; }
      .screen-history #room-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 1024px) {
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) > main {
        height: 100dvh; min-height: 0; overflow: hidden;
        padding-bottom: .75rem !important;
      }
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) > main > div:first-child {
        display: grid; height: 100%; min-height: 0; overflow: hidden;
        grid-template-rows: auto minmax(0, 1fr); gap: .75rem !important;
        padding-bottom: 0;
      }
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) #staff-directory-view {
        min-height: 0; overflow: hidden; grid-template-rows: minmax(0, 1fr); gap: .75rem;
      }
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) #staff-directory-view > section {
        display: flex; min-height: 0; flex-direction: column; overflow: hidden;
      }
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) #staff-list {
        flex: 1 1 auto; min-height: 0; align-content: start;
        grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: max-content; gap: .6rem;
        overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
        scrollbar-width: thin; scrollbar-color: #9ac9c8 transparent;
      }
      .screen-staff:has(#staff-report-view:not([hidden])) > main { overflow-y: auto; }
      .screen-staff:not(:has(#staff-report-view:not([hidden]))) #staff-directory-view {
        grid-template-columns: minmax(260px, .7fr) minmax(0, 1.3fr);
      }
      .screen-staff #staff-form { padding: 1rem; }
      .screen-staff #staff-form > div:first-child { margin-bottom: .75rem; gap: .65rem; }
      .screen-staff #staff-form > div:first-child > span {
        width: 2.5rem; height: 2.5rem;
      }
      .screen-staff #staff-form .space-y-4 { display: grid; gap: .65rem; }
      .screen-staff #staff-form .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 0; }
      .screen-staff #staff-form .space-y-4 > label > span:first-child { margin-bottom: .25rem; }
      .screen-staff #staff-form input,
      .screen-staff #staff-form select { padding: .55rem .75rem; }
      .screen-staff #staff-form .space-y-4 > button { padding-block: .65rem; }
      .screen-staff #staff-form #staff-feedback { min-height: 1rem; }
      .screen-staff #staff-list > .staff-card { gap: .6rem; padding: .75rem; }
      .screen-staff .staff-card-avatar { width: 2.4rem; height: 2.4rem; }
      .screen-staff .staff-card-shift { margin-top: .35rem; padding: .15rem .4rem; }
      .screen-staff .staff-card-actions {
        grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: .35rem; padding-top: .55rem;
      }
      .screen-staff .staff-card-action {
        min-height: 2.2rem; gap: .2rem; padding: .35rem .3rem; font-size: .62rem;
      }
      .screen-staff .staff-card-action .material-symbols-outlined { font-size: .9rem; }
      body > main { padding-top: 4.25rem !important; }
      body > main > div:first-child { max-width: 1360px; padding-left: 2.5rem; padding-right: 2.5rem; }
      body > header > div { padding-left: 2.5rem; padding-right: 2.5rem; }
      body > header { background: linear-gradient(105deg, #0d2c3a, #123a4a) !important; border-bottom: 1px solid rgb(134 223 211 / 24%); }

      .screen-home #dashboard-content {
        display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
        column-gap: 1.5rem; row-gap: 1.15rem; align-content: start;
      }
      .screen-home #dashboard-welcome {
        grid-column: 1 / 9; grid-row: 1; min-height: 124px; padding: 1.2rem 1.5rem;
        border-radius: 1.35rem;
      }
      .screen-home #dashboard-welcome h1 { font-size: clamp(2rem, 2.5vw, 2.6rem); }
      .screen-home #dashboard-welcome > div > div:last-child { width: 3.25rem; height: 3.25rem; }
      .screen-home #dashboard-actions {
        grid-column: 9 / -1; grid-row: 1; align-self: center; align-items: center;
        padding: .65rem; border-radius: 1.2rem;
      }
      .screen-home #dashboard-actions button { height: 52px; }
      .screen-home #dashboard-actions #dashboardRoomsBtn { flex: 0 0 auto; }
      .screen-home #dashboard-performance {
        grid-column: 1 / -1; grid-row: 2; gap: 1.1rem; padding: 1.2rem 1.4rem;
        border-radius: 1.3rem; box-shadow: 0 10px 26px rgb(24 54 66 / 6%);
      }
      .screen-home .dashboard-performance-layout {
        grid-template-columns: minmax(0, 1fr); align-items: stretch; gap: .85rem;
      }
      .screen-home .dashboard-cleaning-gauge { width: 92px; height: 92px; flex-basis: 92px; }
      .screen-home .dashboard-cleaning-gauge-center strong { font-size: 18px; }
      .screen-home .dashboard-cleaning-overview-copy > strong { font-size: 1.5rem; }
      .screen-home .dashboard-cleaning-kpis { gap: .6rem; }
      .screen-home .dashboard-cleaning-kpi { padding: .65rem .75rem; }
      .screen-home .dashboard-cleaning-kpi > span:nth-child(2) { font-size: 10px; }
      .screen-home .dashboard-cleaning-kpi strong { font-size: 17px; }
      .screen-home .dashboard-activity { grid-column: 1 / -1; grid-row: 3; padding: 1rem 1.2rem; }
      .screen-home .dashboard-activity-list { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; }

      .screen-rooms > main {
        height: 100%; min-height: 0; overflow: hidden;
        padding-bottom: 0 !important;
      }
      .screen-rooms > main > div:first-child {
        display: grid; height: 100%; min-height: 0;
        grid-template-columns: repeat(28, minmax(0, 1fr));
        grid-template-rows: auto auto auto minmax(0, 1fr);
        column-gap: 1.5rem; row-gap: .5rem; align-content: stretch;
        padding-bottom: .5rem;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(1) { display: none; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2),
      .screen-rooms > main > div:first-child > section:nth-of-type(3) { grid-column: 1 / -1; }
      .screen-rooms > main > div:first-child > section:nth-of-type(4) {
        grid-column: 1 / 21; grid-row: 4; display: flex; flex-direction: column;
        min-height: 0; overflow: hidden;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(5) {
        grid-column: 21 / -1; grid-row: 4; display: flex; flex-direction: column;
        min-height: 0; height: 100%; overflow: hidden;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) {
        grid-column: 1 / 10; padding: 0 1.5rem .15rem;
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) > div { max-width: 360px; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) input {
        height: 34px; padding-left: 2.25rem; padding-right: 2.25rem;
        border-radius: .7rem; font-size: 13px; line-height: 1.2;
        box-shadow: 0 2px 8px rgb(13 44 58 / 5%);
      }
      .screen-rooms > main > div:first-child > section:nth-of-type(3) { padding-bottom: .1rem; }
      .screen-rooms #filterChipsTrack { gap: .45rem; padding-top: 0; padding-bottom: 0; }
      .screen-rooms #filterChipsTrack .filter-chip { height: 32px; padding-inline: .75rem; font-size: 11px; }
      .screen-rooms > main > div:first-child > section:nth-of-type(4) { padding-bottom: .5rem; }
      .screen-rooms > main > div:first-child > section:nth-of-type(5) { padding: 0 1.5rem .5rem; }
      .screen-rooms #roomsGrid {
        flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
        align-content: start; grid-auto-rows: max-content; padding: .2rem .5rem .5rem .1rem;
        scrollbar-width: thin; scrollbar-color: #9ac9c8 transparent;
      }
      .screen-rooms #roomsGrid { grid-auto-rows: 5.25rem; }
      .screen-rooms #roomsGrid > .room-card {
        position: relative;
        align-self: stretch; min-width: 0; height: 100%; min-height: 0; padding: .4rem .6rem;
      }
      .screen-rooms #roomDetailPanel {
        position: relative; height: 100%; min-height: 0; overflow-y: auto;
        scrollbar-width: thin; scrollbar-color: #9ac9c8 transparent;
        border: 1px solid #dce8e7; border-radius: 1.25rem;
        background: linear-gradient(160deg, #fff 0%, #f8fbfb 100%) !important;
        box-shadow: 0 10px 28px rgb(13 44 58 / 8%);
        transition: background-color .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .screen-rooms #roomDetailPanel::before {
        position: absolute; top: 0; right: 0; left: 0; height: 4px; content: "";
        background: linear-gradient(90deg, #26b7a6, #79d3c7 55%, #c9ede7);
      }
      .screen-rooms #roomDetailPanel[data-state="empty"] {
        display: flex; padding: 1rem; border-style: dashed;
        border-color: #cbd4d8; background: linear-gradient(145deg, #eef2f3, #e5ebed) !important;
        box-shadow: inset 0 1px 2px rgb(40 58 66 / 4%);
        cursor: not-allowed; color: #78868c;
      }
      .screen-rooms #roomDetailEmpty {
        flex: 1; min-height: 0; width: 100%; color: #78868c;
      }
      .screen-rooms #roomDetailEmpty > div:first-child {
        width: 3.25rem; height: 3.25rem; border: 1px solid #d4dde0;
        border-radius: 1rem; background: #dde4e7 !important; color: #849197 !important;
      }
      .screen-rooms #roomDetailEmpty h3 { color: #68777e !important; }
      .screen-rooms #roomDetailEmpty p { color: #7e8b91 !important; }
      .screen-rooms #roomDetailPanel[data-state="selected"] {
        padding: 1rem; border-style: solid;
        box-shadow: 0 14px 32px rgb(13 44 58 / 12%);
      }
      .screen-rooms #roomDetailContent > .flex.justify-center { display: none; }
      .screen-rooms #roomDetailContent > div:nth-child(2) {
        display: grid; grid-template-columns: minmax(0, 1fr) auto;
        align-items: center; gap: .6rem; margin: .15rem 0 .85rem;
      }
      .screen-rooms #sheetRoomNumber { font-size: clamp(1.05rem, 1.4vw, 1.35rem); line-height: 1.25; }
      .screen-rooms #sheetRoomBadge { padding: .3rem .6rem; white-space: nowrap; }
      .screen-rooms #sheetGuestName { margin-top: .15rem; font-size: .8rem; line-height: 1.1rem; }
      .screen-rooms #cleaning-plan-panel {
        margin-bottom: .65rem; padding: .7rem; border: 1px solid #e6eded;
        border-radius: 1rem; background: #f5f9f8 !important;
      }
      .screen-rooms #cleaning-plan-panel > div:first-child { margin-bottom: .35rem; }
      .screen-rooms #cleaning-plan-panel > div:first-child > p { display: none; }
      .screen-rooms .service-badge-btn {
        min-width: 0; min-height: 46px; padding: .35rem .25rem; border-radius: .75rem;
        border-color: #e0e9e8; box-shadow: 0 2px 6px rgb(13 44 58 / 4%);
        transition: border-color .18s ease, background-color .18s ease, transform .18s ease, box-shadow .18s ease;
      }
      .screen-rooms .service-badge-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 12px rgb(13 44 58 / 8%); }
      .screen-rooms .service-badge-btn[aria-pressed="true"] {
        border-color: #26b7a6; background: #e8f7f4 !important;
        box-shadow: inset 0 0 0 1px #26b7a6, 0 3px 8px rgb(38 183 166 / 10%);
      }
      .screen-rooms .service-badge-btn > span:last-child { margin-top: .1rem; font-size: 9px; line-height: 12px; }
      .screen-rooms #cleaning-plan-feedback { min-height: 14px; margin-top: .35rem; font-size: 10px; line-height: 14px; }
      .screen-rooms #save-cleaning-plan-btn {
        height: 34px; margin-top: .35rem; border: 0;
        border-radius: .75rem; background: linear-gradient(100deg, #123a4a, #176273) !important;
        box-shadow: 0 5px 12px rgb(18 58 74 / 17%);
      }
      .screen-cleaning > main > div:first-child { max-width: 1360px; }
      .screen-cleaning #rooms-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .screen-history #room-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .screen-rooms #roomsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
      #sheet-content { width: min(100%, 620px); }
      .fixed.inset-0 > .max-w-md { max-width: 620px; }
    }
    @media (max-height: 760px) {
      body > header > div { height: 3.5rem !important; }
      body > main { padding-top: 3.75rem !important; }
      body > main > div:first-child { gap: 1rem !important; padding-bottom: .5rem; }
      .screen-home #dashboard-welcome { min-height: 104px; padding: .8rem 1.1rem; }
      .screen-home #dashboard-welcome h1 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.15; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) { padding-bottom: .1rem; }
      .screen-rooms > main > div:first-child > section:nth-of-type(2) input { height: 38px; }
      .screen-rooms > main > div:first-child > section:nth-of-type(3) { padding-bottom: .1rem; }
      .screen-rooms #filterChipsTrack .filter-chip { height: 30px; }
      .screen-rooms #roomDetailPanel { padding-block: .75rem; }
    }
    @media (min-width: 960px) and (max-height: 760px) {
      .screen-cleaning > main > div:first-child { gap: .65rem !important; padding-bottom: .25rem; }
      .screen-cleaning #cleaning-workspace { gap: .6rem; margin-top: .1rem; margin-bottom: .35rem; }
      .screen-cleaning .cleaning-config-panel {
        min-height: 580px; max-height: none; padding: .9rem; overflow: visible;
      }
      .screen-cleaning .cleaning-config-panel > .cleaning-section-heading {
        gap: .55rem; margin-bottom: .75rem; font-size: 14px;
      }
      .screen-cleaning .cleaning-config-panel .cleaning-step-number {
        width: 1.5rem; height: 1.5rem; font-size: 10px;
      }
      .screen-cleaning .cleaning-detail-header { gap: .6rem; margin-bottom: .15rem; padding-bottom: .7rem; }
      .screen-cleaning .cleaning-detail-icon { width: 2.3rem; height: 2.3rem; }
      .screen-cleaning .cleaning-detail-room { gap: .6rem; }
      .screen-cleaning .cleaning-detail-room h3 { font-size: 14px; }
      .screen-cleaning .cleaning-detail-room p { margin-top: .1rem; font-size: 10px; line-height: 1.25; }
      .screen-cleaning .cleaning-status-pill { padding: .25rem .45rem; font-size: 9px; }
      .screen-cleaning .cleaning-field-label { margin: .7rem 0 .4rem; font-size: 11px; }
      .screen-cleaning .cleaning-type-options { gap: .4rem; }
      .screen-cleaning .cleaning-type-option { min-height: 52px; gap: .4rem; padding: .4rem; font-size: 10px; }
      .screen-cleaning .cleaning-type-option .material-symbols-outlined { font-size: 16px; }
      .screen-cleaning .cleaning-type-copy strong { font-size: 10px; }
      .screen-cleaning .cleaning-type-copy small { font-size: 9px; }
      .screen-cleaning .cleaning-details-input { min-height: 68px; max-height: none; padding: .5rem .6rem; font-size: 11px; }
      .screen-cleaning .cleaning-assignment-section { margin-top: .9rem; padding: .7rem; }
      .screen-cleaning .cleaning-assignment-section .cleaning-section-heading { margin-bottom: .45rem; }
      .screen-cleaning .cleaning-staff-select { min-height: 38px; padding: .4rem .55rem; font-size: 11px; }
      .screen-cleaning .cleaning-staff-help { margin-top: .35rem; font-size: 10px; line-height: 1.4; }
      .screen-cleaning .cleaning-config-actions { gap: .4rem; margin-top: .55rem; }
      .screen-cleaning .cleaning-config-actions button { min-height: 38px; padding: .4rem .5rem; font-size: 10px; }
    }
    @media (min-width: 1280px) {
      .screen-rooms #roomsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    .screen-rooms #roomDetailPanel {
      display: flex; flex-direction: column;
      height: 100% !important; min-height: 0; max-height: 100%;
      overflow: hidden !important; padding: .75rem;
      border: 1px solid #e1ebe9; border-radius: 1.25rem;
      background: #f7faf9 !important;
      box-shadow: 0 12px 30px rgb(18 58 74 / 8%);
    }
    .screen-rooms #roomDetailPanel[data-state="empty"] {
      border: 1px dashed #cbd9d7; background: #f1f5f4 !important;
      box-shadow: none;
    }
    .screen-rooms #roomDetailEmpty { min-height: 160px !important; gap: .6rem; }
    .screen-rooms #roomDetailEmpty > div:first-child {
      width: 2.75rem; height: 2.75rem; border-radius: 1rem;
    }
    .screen-rooms #roomDetailContent:not([hidden]) {
      position: relative; display: flex; flex-direction: column; gap: .55rem; min-height: 0;
    }
    .screen-rooms .room-detail-header {
      flex: 0 0 auto; gap: .6rem; min-height: 2.8rem; padding: 0 0 .55rem;
      border-color: #e4ecea;
    }
    .screen-rooms #sheetRoomNumber { color: #123a4a; font-size: 17px; font-weight: 750; }
    .screen-rooms #sheetRoomType { margin-top: .2rem; color: #71858a; font-size: 10px; }
    .screen-rooms #sheetRoomIcon {
      width: 2.35rem; height: 2.35rem; border-radius: .85rem;
      box-shadow: none;
    }
    .screen-rooms #sheetInfoGrid {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: .45rem;
    }
    .screen-rooms .room-detail-card {
      display: grid; grid-template-columns: 1.65rem minmax(0, 1fr); align-items: center; gap: .45rem;
      min-width: 0; min-height: 3.35rem; padding: .45rem;
      border: 1px solid #e7eeed; border-radius: .9rem;
      background: #ffffff; box-shadow: 0 2px 6px rgb(18 58 74 / 3%);
    }
    .screen-rooms .room-detail-card > div:last-child {
      display: flex; min-width: 0; flex-direction: column; gap: .15rem;
    }
    .screen-rooms .room-detail-card > div:first-child {
      width: 1.65rem; height: 1.65rem; border-radius: .6rem; border: 0;
    }
    .screen-rooms .room-detail-card > div:first-child .material-symbols-outlined { font-size: 15px; }
    .screen-rooms .room-detail-card .room-detail-fact-label {
      color: #829398; font-size: 8px; font-weight: 750;
      letter-spacing: .07em; line-height: 1.2; text-transform: uppercase;
    }
    .screen-rooms .room-detail-card .room-detail-fact-value {
      overflow: hidden; color: #173d4b; font-size: 11px; font-weight: 750;
      line-height: 1.2; text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-rooms .room-detail-card > div:last-child > span:last-child {
      overflow: hidden; color: #7c8e92; font-size: 9px; line-height: 1.2;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .screen-rooms .room-detail-card:hover {
      transform: translateY(-1px); border-color: #d3e5e1;
      box-shadow: 0 5px 12px rgb(18 58 74 / 6%);
    }
    .screen-rooms .room-detail-extras {
      display: grid; grid-template-columns: minmax(0, 1fr); gap: .35rem;
      min-height: 0; padding: .6rem .65rem;
      border: 1px solid #e2ece9; border-radius: .95rem;
      background: #ffffff; box-shadow: 0 2px 6px rgb(18 58 74 / 3%);
    }
    .screen-rooms .room-detail-extras-heading { gap: .4rem; color: #47656b; }
    .screen-rooms .room-detail-extras-heading > span:first-child { font-size: 9px; letter-spacing: .07em; }
    .screen-rooms .room-detail-extras-heading .material-symbols-outlined { font-size: 14px; }
    .screen-rooms #sheetPriority {
      padding: .2rem .5rem; border-radius: 999px; font-size: 9px; font-weight: 700;
    }
    .screen-rooms #sheetCleaningDetails {
      display: grid; gap: .15rem; margin: 0; padding-left: 1rem;
      color: #50686e; font-size: 10px; line-height: 1.3; list-style: disc;
    }
    .screen-rooms #sheetCleaningDetails li {
      padding-left: .1rem; overflow-wrap: anywhere;
    }
    .screen-rooms #sheetActionButtons { width: 100%; align-items: stretch; gap: .4rem; padding-top: 0; }
    .screen-rooms #sheetActionButtons button {
      width: 100%; min-height: 2.6rem; border-radius: .8rem; box-shadow: none;
      font-size: 11px; transition: background-color .16s ease, transform .16s ease;
    }
    .screen-rooms #sheetActionButtons .room-check-in-button {
      display: flex; align-items: center; justify-content: center; gap: .55rem;
      padding: .55rem .8rem; border: 1px solid #0d5261;
      background: linear-gradient(110deg, #123a4a, #176273); color: #fff;
      font-size: 12px; font-weight: 700;
      box-shadow: 0 4px 10px rgb(18 58 74 / 15%);
    }
    .screen-rooms #sheetActionButtons .room-check-in-button:hover {
      background: linear-gradient(110deg, #0d2c3a, #145666);
      box-shadow: 0 6px 14px rgb(18 58 74 / 20%);
    }
    .screen-rooms #sheetActionButtons .room-check-in-button .material-symbols-outlined { font-size: 18px; }
    @media (max-width: 767px) {
      .screen-rooms #roomDetailPanel {
        height: auto !important; max-height: none; overflow: visible !important; padding: .7rem !important;
      }
      .screen-rooms #roomDetailContent:not([hidden]) { gap: .55rem; }
      .screen-rooms #roomDetailContent > .flex.justify-center { display: none; }
      .screen-rooms .room-detail-header { padding-bottom: .55rem; }
      .screen-rooms #sheetInfoGrid { gap: .45rem; }
      .screen-rooms .room-detail-card { min-height: 3.5rem; padding: .45rem; }
      .screen-rooms .room-detail-extras { padding: .65rem; }
    }
    #quickModal { padding: 1rem; }
    #quickModal > div {
      width: calc(100% - 2rem); max-height: calc(100dvh - 2rem);
      overflow-y: auto; border-radius: 1.5rem;
    }
    @media (min-width: 768px) {
      .screen-rooms > main > div:first-child > section:nth-of-type(5) {
        height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
      }
    }
    @media (min-width: 768px) and (max-height: 760px) {
      .screen-rooms #roomDetailPanel { padding: .45rem; }
      .screen-rooms #roomDetailContent:not([hidden]) { gap: .35rem; }
      .screen-rooms .room-detail-header { min-height: 2.35rem; padding-bottom: .35rem; }
      .screen-rooms #sheetRoomIcon { width: 1.9rem; height: 1.9rem; }
      .screen-rooms #sheetInfoGrid { gap: .3rem; }
      .screen-rooms .room-detail-card { min-height: 2.9rem; padding: .35rem; }
      .screen-rooms .room-detail-extras { gap: .25rem; padding: .4rem .5rem; }
      .screen-rooms #sheetActionButtons button { min-height: 2rem; }
    }
    html[data-theme="dark"] {
      color-scheme: dark;
      --hotel-mist: #131e23;
      --hotel-ink: #e2ecee;
      --hotel-muted: #a0b2b8;
      --hotel-line: #34464d;
    }
    html[data-theme="dark"] body,
    html[data-theme="dark"] body > main,
    html[data-theme="dark"] body > main > div:first-child {
      background-color: #131e23 !important; color: #e2ecee !important;
    }
    html[data-theme="dark"] .bg-surface-card,
    html[data-theme="dark"] .bg-surface-container-lowest,
    html[data-theme="dark"] .bg-white,
    html[data-theme="dark"] [class*="bg-white/"] {
      background-color: #1c2a30 !important;
    }
    html[data-theme="dark"] .bg-canvas-warm,
    html[data-theme="dark"] .bg-surface-container-low,
    html[data-theme="dark"] .bg-surface-container,
    html[data-theme="dark"] [class*="bg-[#f"],
    html[data-theme="dark"] [class*="bg-[#e"] {
      background-color: #24343a !important;
    }
    html[data-theme="dark"] .text-text-main,
    html[data-theme="dark"] .text-on-surface,
    html[data-theme="dark"] .text-headline-xl,
    html[data-theme="dark"] .text-headline-xl-mobile,
    html[data-theme="dark"] .text-headline-lg,
    html[data-theme="dark"] .text-headline-lg-mobile,
    html[data-theme="dark"] .text-headline-md,
    html[data-theme="dark"] .text-headline-sm,
    html[data-theme="dark"] .screen-staff .staff-card-name {
      color: #e2ecee !important;
    }
    html[data-theme="dark"] .text-text-muted,
    html[data-theme="dark"] .text-on-surface-variant,
    html[data-theme="dark"] .screen-staff .staff-card-phone {
      color: #a0b2b8 !important;
    }
    html[data-theme="dark"] .border,
    html[data-theme="dark"] [class*="border-[#"],
    html[data-theme="dark"] .screen-rooms #roomDetailPanel,
    html[data-theme="dark"] .screen-staff #staff-list > .staff-card {
      border-color: #34464d !important;
    }
    html[data-theme="dark"] input,
    html[data-theme="dark"] select,
    html[data-theme="dark"] textarea {
      border-color: #40545b !important; background-color: #1a282e !important; color: #e2ecee !important;
      color-scheme: dark;
    }
    html[data-theme="dark"] input::placeholder,
    html[data-theme="dark"] textarea::placeholder { color: #8da1a7 !important; }
    html[data-theme="dark"] .screen-rooms #roomsGrid > .room-card,
    html[data-theme="dark"] .screen-cleaning #rooms-list > *,
    html[data-theme="dark"] .screen-history #room-list > *,
    html[data-theme="dark"] .screen-staff #staff-list > .staff-card,
    html[data-theme="dark"] .screen-rooms .room-detail-card,
    html[data-theme="dark"] .screen-rooms .room-detail-extras,
    html[data-theme="dark"] .screen-rooms #roomDetailPanel,
    html[data-theme="dark"] .screen-cleaning .cleaning-config-panel,
    html[data-theme="dark"] .screen-cleaning .cleaning-selection {
      border-color: #34464d !important; background: #1c2a30 !important;
      box-shadow: 0 7px 20px rgb(0 0 0 / 18%);
    }
    html[data-theme="dark"] .screen-rooms .room-detail-fact-value,
    html[data-theme="dark"] .screen-rooms .room-detail-extras-heading,
    html[data-theme="dark"] .screen-rooms #sheetRoomNumber,
    html[data-theme="dark"] .screen-rooms #sheetCleaningDetails,
    html[data-theme="dark"] .screen-cleaning .cleaning-type-copy strong,
    html[data-theme="dark"] .screen-staff .staff-card-action {
      color: #dce8ea !important;
    }
    html[data-theme="dark"] .screen-rooms #roomDetailPanel[data-state="empty"],
    html[data-theme="dark"] .screen-rooms #cleaning-plan-panel,
    html[data-theme="dark"] .screen-staff .staff-card-shift,
    html[data-theme="dark"] .screen-staff .staff-card-action {
      background: #24343a !important;
    }
    html[data-theme="dark"] .screen-rooms .room-card-image {
      border-color: #3a4b50; background: linear-gradient(135deg, #263d40, #43343b 55%, #3b3940);
    }
    html[data-theme="dark"] .screen-home #dashboard-welcome,
    html[data-theme="dark"] .screen-cleaning > main > div:first-child > div:first-child {
      color: #eff8f8 !important;
    }
    html[data-theme="dark"] .screen-home > main {
      background: linear-gradient(180deg, #16262b 0, #131e23 100%) !important;
    }
    html[data-theme="dark"] .screen-home #dashboard-content {
      background:
        radial-gradient(ellipse at 2% 16%, rgb(91 195 171 / 7%), transparent 26rem),
        radial-gradient(ellipse at 100% 48%, rgb(226 167 133 / 5%), transparent 24rem);
    }
    html[data-theme="dark"] .screen-home #dashboard-actions,
    html[data-theme="dark"] .screen-home #dashboard-performance,
    html[data-theme="dark"] .screen-home .dashboard-activity {
      border-color: #34464d !important; background: linear-gradient(145deg, #1c2a30, #1a282e) !important;
      box-shadow: 0 10px 24px rgb(0 0 0 / 18%);
    }
    html[data-theme="dark"] .screen-home #dashboard-actions #dashboardRoomsBtn,
    html[data-theme="dark"] .screen-home .dashboard-cleaning-load,
    html[data-theme="dark"] .screen-home .dashboard-cleaning-kpi,
    html[data-theme="dark"] .screen-home .dashboard-activity-item {
      border-color: #34464d !important; background: linear-gradient(145deg, #24343a, #1f3036) !important;
      color: #e2ecee !important;
    }
    html[data-theme="dark"] .screen-home #dashboard-performance-title,
    html[data-theme="dark"] .screen-home .dashboard-cleaning-overview-copy > strong,
    html[data-theme="dark"] .screen-home .dashboard-cleaning-kpi strong,
    html[data-theme="dark"] .screen-home .dashboard-activity-title,
    html[data-theme="dark"] .screen-home .dashboard-activity-heading h2 {
      color: #e2ecee !important;
    }
    html[data-theme="dark"] .screen-home .dashboard-cleaning-kpi > span:nth-child(2),
    html[data-theme="dark"] .screen-home .dashboard-cleaning-overview-copy > strong span,
    html[data-theme="dark"] .screen-home .dashboard-performance-total,
    html[data-theme="dark"] .screen-home .dashboard-activity-meta {
      color: #a0b2b8 !important;
    }
    html[data-theme="dark"] .screen-home .dashboard-activity-icon {
      background: #29413f; color: #7dd3bd;
    }
    html[data-theme="dark"] .screen-home .dashboard-cleaning-load-percent {
      background: #493a2d; color: #f0bf86;
    }
    html[data-theme="dark"] .screen-home .dashboard-activity-heading button {
      border-color: #35534f; background: #243a39; color: #9de0ce;
    }
    html[data-theme="dark"] .screen-home .dashboard-activity-empty {
      border-color: #40545b; background: #1c2a30; color: #a0b2b8;
    }
    html[data-theme="dark"] .shadow-sm,
    html[data-theme="dark"] .shadow-xs { box-shadow: 0 5px 18px rgb(0 0 0 / 22%) !important; }
  `;
  const storageKey = "control-habitaciones-state-v3";
  const themeStorageKey = "hotel-color-theme";
  const cleaningPlanOptions = {
    standard: { label: "Estándar", frequency: "Mensual", service: "Estándar mensual" },
    premium: { label: "Premium", frequency: "Semanal", service: "Premium semanal" },
    plus: { label: "Premium Plus", frequency: "Atención especial", service: "Premium Plus" }
  };

  const cleaningWorkTypes = {
    standard: { label: "Estándar mensual" },
    premium: { label: "Premium semanal" },
    plus: { label: "Premium Plus" },
    retoque: { label: "Retoque" },
    integral: { label: "Integral" }
  };

  function calculateStats(rooms) {
    const stats = { free: 0, occupied: 0, pending: 0, cleaning: 0, finished: 0 };
    Object.values(rooms || {}).forEach(status => {
      if (Object.prototype.hasOwnProperty.call(stats, status)) stats[status]++;
    });
    return stats;
  }

  const initialStats = calculateStats({});
  let memoryState = {
    rooms: {},
    guests: {},
    servicePlans: {},
    cleaningDetails: {},
    assignedCleanings: {},
    roomAssignments: [],
    cleaningWork: [],
    attendance: [],
    novelties: [],
    staff: [],
    events: [],
    stats: { ...initialStats }
  };

  function statsForRooms(rooms) {
    return calculateStats(rooms);
  }

  function readState() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.rooms && Array.isArray(parsed.events)) {
          if (!parsed.guests) parsed.guests = {};
          if (!parsed.servicePlans) parsed.servicePlans = {};
          if (!parsed.cleaningDetails) parsed.cleaningDetails = {};
          if (!parsed.assignedCleanings) parsed.assignedCleanings = {};
          if (!Array.isArray(parsed.cleaningWork)) parsed.cleaningWork = [];
          if (!Array.isArray(parsed.attendance)) parsed.attendance = [];
          if (!Array.isArray(parsed.novelties)) parsed.novelties = [];
          if (!Array.isArray(parsed.staff)) parsed.staff = [];
          if (!Array.isArray(parsed.roomAssignments)) parsed.roomAssignments = [];
          parsed.staff = parsed.staff.map(person => ({
            ...person,
            contact: person.contact || person.phone || ""
          }));
          parsed.stats = statsForRooms(parsed.rooms);
          return parsed;
        }
        console.error("El estado guardado del hotel tiene un formato no válido.");
      }
    } catch (error) {
      console.error("No se pudo leer el estado guardado del hotel.", error);
    }
    return memoryState;
  }

  function writeState(state) {
    memoryState = state;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("No se pudo guardar el estado del hotel en este navegador.", error);
      return false;
    }
  }

  function record(room, status, action, guest, cleaner, cleaningType, eventGuest) {
    const state = readState();
    const roomId = String(room);
    if (!Object.prototype.hasOwnProperty.call(state.rooms, roomId)) {
      console.error("No se puede registrar un movimiento para una habitación no registrada.");
      return;
    }
    state.rooms[roomId] = status;
    if (guest !== undefined) state.guests[roomId] = guest;
    state.stats = statsForRooms(state.rooms);
    const ev = {
      room: String(room),
      status,
      action,
      guest: eventGuest || null,
      actor: cleaner?.name || "No Registrado",
      cleanerId: cleaner?.id || null,
      cleaningType: cleaningType || null,
      time: new Date().toISOString()
    };
    state.events.unshift(ev);
    state.events = state.events.slice(0, 100);
    writeState(state);

    // Sync con Supabase
    if (window.HotelDB) {
      window.HotelDB.updateRoom(roomId, {
        status,
        guest
      });
      window.HotelDB.addEvent(ev);
    }
  }

  function recordCleaningWork(room, cleaner, cleaningType) {
    if (!cleaner) return;
    const type = cleaningWorkTypes[cleaningType] ? cleaningType : null;
    const state = readState();
    const work = {
      staffId: cleaner.id,
      staffName: cleaner.name,
      room: String(room),
      cleaningType: type,
      time: new Date().toISOString()
    };
    state.cleaningWork.push(work);
    writeState(state);

    if (window.HotelDB) {
      window.HotelDB.addCleaningWork(work);
    }
  }

  function recordCleaningPlan(room, planKey) {
    const plan = cleaningPlanOptions[planKey];
    if (!plan) return null;
    const state = readState();
    const roomId = String(room);
    if (!Object.prototype.hasOwnProperty.call(state.rooms, roomId)) {
      console.error("No se puede asignar un plan a una habitación no registrada.");
      return null;
    }
    state.servicePlans[roomId] = planKey;
    if (state.assignedCleanings[roomId]) {
      state.assignedCleanings[roomId].cleaningType = planKey;
    }
    const ev = {
      room: roomId,
      status: state.rooms[roomId],
      action: "Plan de limpieza asignado: " + plan.service,
      actor: "No Registrado",
      time: new Date().toISOString()
    };
    state.events.unshift(ev);
    state.events = state.events.slice(0, 100);
    writeState(state);
    return ev;
  }

  function showToast(doc, message) {
    let toast = doc.getElementById("app-feedback");
    if (!toast) {
      toast = doc.createElement("div");
      toast.id = "app-feedback";
      toast.setAttribute("role", "status");
      toast.style.cssText = "position:fixed;z-index:100;left:50%;bottom:90px;transform:translateX(-50%);padding:11px 18px;border-radius:999px;background:#261921;color:white;font:600 13px sans-serif;box-shadow:0 8px 24px #26192133;max-width:90%;text-align:center;transition:opacity .2s;pointer-events:none";
      doc.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = "0"; }, 2400);
  }

  function route(screen, notice) {
    if (!screens[screen] || window.parent === window) return;
    window.parent.postMessage({ type: "hotel:navigate", screen, notice }, "*");
  }

  function statusLabel(status) {
    return {
      free: ["Libre", "bg-status-free-bg", "text-status-free-fg"],
      occupied: ["Ocupada", "bg-status-occupied-bg", "text-status-occupied-fg"],
      pending: ["Por Limpiar", "bg-status-pending-bg", "text-status-pending-fg"],
      cleaning: ["En Limpieza", "bg-status-cleaning-bg", "text-status-cleaning-fg"],
      finished: ["Finalizado", "bg-status-free-bg", "text-status-free-fg"]
    }[status];
  }

  function renderDashboardPerformance(doc, stats, state) {
    const total = ["free", "occupied", "pending", "cleaning", "finished"]
      .reduce((sum, status) => sum + (Number(stats[status]) || 0), 0);
    const pending = Math.max(0, Number(stats.pending) || 0);
    const cleaning = Math.max(0, Number(stats.cleaning) || 0);
    const cleaningLoad = pending + cleaning;
    const cleaningLoadRatio = total ? Math.round(cleaningLoad / total * 100) : null;
    const loadRatio = doc.querySelector("[data-cleaning-load-ratio]");
    if (loadRatio) loadRatio.textContent = cleaningLoadRatio === null
      ? "No Registrado"
      : cleaningLoadRatio + "%";
    const loadCount = doc.querySelector("[data-cleaning-load-count]");
    if (loadCount) loadCount.textContent = total ? String(cleaningLoad) : "No Registrado";
    const loadTotal = doc.querySelector("[data-cleaning-load-total]");
    if (loadTotal) loadTotal.textContent = total ? String(total) : "No Registrado";
    const loadRing = doc.querySelector("[data-cleaning-load-ring]");
    if (loadRing) {
      const circumference = 2 * Math.PI * 42;
      loadRing.style.strokeDashoffset = total
        ? String(circumference * (1 - cleaningLoad / total))
        : String(circumference);
    }
    const cleaningGauge = doc.querySelector(".dashboard-cleaning-gauge");
    if (cleaningGauge) cleaningGauge.setAttribute("aria-label", total
      ? `Carga de aseo: ${cleaningLoadRatio}% (${cleaningLoad} de ${total} habitaciones por limpiar o en curso)`
      : "Carga de aseo: no hay habitaciones registradas");
    const cleaningLoadPercent = doc.querySelector("[data-cleaning-load-percent]");
    if (cleaningLoadPercent) cleaningLoadPercent.textContent = total
      ? Math.round(cleaningLoad / total * 100) + "% del total"
      : "No Registrado";
    doc.querySelectorAll("[data-cleaning-load-pending]").forEach(node => {
      node.textContent = total ? String(pending) : "No Registrado";
    });
    doc.querySelectorAll("[data-cleaning-load-cleaning]").forEach(node => {
      node.textContent = total ? String(cleaning) : "No Registrado";
    });
    const pendingSegment = doc.querySelector('[data-cleaning-load-segment="pending"]');
    const cleaningSegment = doc.querySelector('[data-cleaning-load-segment="cleaning"]');
    if (pendingSegment) pendingSegment.style.width = total ? pending / total * 100 + "%" : "0%";
    if (cleaningSegment) cleaningSegment.style.width = total ? cleaning / total * 100 + "%" : "0%";
    const cleaningLoadChart = doc.querySelector(".dashboard-cleaning-load-track");
    if (cleaningLoadChart) cleaningLoadChart.setAttribute("aria-label", total
      ? `${cleaningLoad} habitaciones requieren atención de limpieza: ${pending} por limpiar y ${cleaning} en curso`
      : "No Registrado: no hay habitaciones registradas");

    const today = new Date();
    const dateKey = date => Number.isNaN(date.getTime())
      ? null
      : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const todayKey = dateKey(today);
    const completedToday = (Array.isArray(state.cleaningWork) ? state.cleaningWork : [])
      .filter(work => {
        const workDate = new Date(work.time);
        return dateKey(workDate) === todayKey;
      });
    (Array.isArray(state.events) ? state.events : [])
      .filter(event => event.action === "Limpieza completada" && dateKey(new Date(event.time)) === todayKey)
      .forEach(event => {
        const alreadyLogged = completedToday.some(work =>
          String(work.room) === String(event.room) &&
          work.cleaningType === (event.cleaningType || null) &&
          dateKey(new Date(work.time)) === todayKey
        );
        if (!alreadyLogged) completedToday.push(event);
      });
    const completedTodayNode = doc.querySelector("[data-cleaning-completed-today]");
    if (completedTodayNode) completedTodayNode.textContent = String(completedToday.length);

    const liveStatus = doc.querySelector(".dashboard-performance-live");
    if (liveStatus) {
      const liveDot = liveStatus.querySelector("span");
      liveStatus.lastChild.textContent = total ? "Aseo actualizado" : "Sin habitaciones registradas";
      if (liveDot) liveDot.hidden = !total;
    }
  }

  function renderDashboardActivity(doc, events) {
    const list = doc.getElementById("dashboard-activity-list");
    if (!list) return;
    list.replaceChildren();
    const recentEvents = Array.isArray(events) ? events.slice(0, 3) : [];
    if (!recentEvents.length) {
      const empty = doc.createElement("p");
      empty.className = "dashboard-activity-empty";
      empty.textContent = "Aún no hay movimientos registrados. Los check-ins, salidas y limpiezas aparecerán aquí.";
      list.appendChild(empty);
      return;
    }

    const icons = {
      free: "check_circle",
      occupied: "login",
      pending: "logout",
      cleaning: "cleaning_services",
      finished: "task_alt"
    };
    recentEvents.forEach(event => {
      const item = doc.createElement("article");
      item.className = "dashboard-activity-item";
      const icon = doc.createElement("span");
      icon.className = "dashboard-activity-icon";
      const iconName = doc.createElement("span");
      iconName.className = "material-symbols-outlined";
      iconName.textContent = icons[event.status] || "history";
      icon.appendChild(iconName);

      const main = doc.createElement("div");
      main.className = "dashboard-activity-main";
      const title = doc.createElement("p");
      title.className = "dashboard-activity-title";
      title.textContent = `Hab. ${event.room || "No Registrado"} · ${event.action || "No Registrado"}`;
      const meta = doc.createElement("p");
      meta.className = "dashboard-activity-meta";
      const date = new Date(event.time);
      const time = Number.isNaN(date.getTime())
        ? "No Registrado"
        : new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(date);
      meta.textContent = `${event.guest ? "Huésped: " + event.guest : event.actor || "No Registrado"} · ${time}`;
      main.append(title, meta);

      const badge = doc.createElement("span");
      badge.className = "dashboard-activity-status";
      badge.textContent = statusLabel(event.status)?.[0] || "No Registrado";
      item.append(icon, main, badge);
      list.appendChild(item);
    });
  }

  function syncRoomCard(card, status) {
    const config = statusLabel(status);
    if (!config) return;
    card.dataset.status = status;
    const badge = Array.from(card.querySelectorAll("span")).find(item =>
      ["Libre", "Ocupada", "Por Limpiar", "En Limpieza"].includes(item.textContent.trim())
    );
    if (!badge) return;
    badge.textContent = config[0];
    badge.classList.remove("bg-status-free-bg", "text-status-free-fg", "bg-status-occupied-bg", "text-status-occupied-fg", "bg-status-pending-bg", "text-status-pending-fg", "bg-status-cleaning-bg", "text-status-cleaning-fg");
    badge.classList.add(config[1], config[2]);
  }

  function requestText(doc, title, label, onSubmit) {
    const overlay = doc.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:20px;background:#26192166;backdrop-filter:blur(4px)";
    const dialog = doc.createElement("form");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", title);
    dialog.style.cssText = "width:100%;max-width:380px;padding:24px;border-radius:24px;background:white;box-shadow:0 20px 60px #26192133;font-family:sans-serif";
    const heading = doc.createElement("h2");
    heading.textContent = title;
    heading.style.cssText = "margin:0 0 16px;font-size:20px;color:#261921";
    const caption = doc.createElement("label");
    caption.textContent = label;
    caption.style.cssText = "display:block;margin-bottom:8px;font-size:13px;font-weight:600;color:#584142";
    const input = doc.createElement("input");
    input.required = true;
    input.maxLength = 80;
    input.autocomplete = "name";
    input.style.cssText = "width:100%;padding:12px;border:1px solid #dfbfc0;border-radius:12px;font:inherit";
    caption.appendChild(input);
    const controls = doc.createElement("div");
    controls.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:18px";
    const cancel = doc.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.style.cssText = "padding:10px 14px;border:0;border-radius:999px;background:#fff0f0;color:#584142;font-weight:600";
    cancel.addEventListener("click", () => overlay.remove());
    const submit = doc.createElement("button");
    submit.type = "submit";
    submit.textContent = "Guardar";
    submit.style.cssText = "padding:10px 16px;border:0;border-radius:999px;background:#f05d72;color:white;font-weight:700";
    controls.append(cancel, submit);
    dialog.append(heading, caption, controls);
    dialog.addEventListener("submit", event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      onSubmit(value);
      overlay.remove();
    });
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.appendChild(dialog);
    doc.body.appendChild(overlay);
    input.focus();
  }

  const staffWeekdays = [
    ["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"], ["thu", "Jueves"],
    ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"]
  ];
  const noveltyTypes = {
    inasistencia: "Inasistencia",
    permiso: "Permiso",
    incapacidad: "Incapacidad",
    horas_extra: "Horas extra",
    cambio_turno: "Cambio de turno",
    otra: "Otra"
  };
  const localDateKey = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  };

  function showStaffScheduleEditor(doc, person) {
    const overlay = doc.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:16px;background:#123a4a66;backdrop-filter:blur(4px)";
    const form = doc.createElement("form");
    form.setAttribute("role", "dialog");
    form.setAttribute("aria-modal", "true");
    form.setAttribute("aria-label", "Editar horario de " + person.name);
    form.style.cssText = "width:100%;max-width:680px;max-height:90vh;overflow:auto;padding:22px;border-radius:22px;background:#fff;box-shadow:0 20px 60px #123a4a33;font-family:sans-serif";
    const heading = doc.createElement("h2");
    heading.textContent = "Horario de " + person.name;
    heading.style.cssText = "margin:0 0 6px;font-size:20px;font-weight:800;color:#183642";
    const help = doc.createElement("p");
    help.textContent = "Define la jornada semanal y, si el turno es rotativo, excepciones por fecha.";
    help.style.cssText = "margin:0 0 16px;font-size:13px;color:#71868c";
    const typeLabel = doc.createElement("label");
    typeLabel.textContent = "Tipo de horario";
    typeLabel.style.cssText = "display:grid;gap:6px;margin-bottom:16px;font-size:13px;font-weight:700;color:#183642";
    const type = doc.createElement("select");
    type.name = "scheduleType";
    type.style.cssText = "padding:11px;border:1px solid #dce8e7;border-radius:10px;font:inherit";
    [["weekly", "Semanal fijo"], ["rotating", "Rotativo con cambios por fecha"]].forEach(([value, label]) => {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = label;
      type.appendChild(option);
    });
    type.value = person.schedule?.type || (person.shift === "Rotativo" ? "rotating" : "weekly");
    typeLabel.appendChild(type);
    const scheduleGrid = doc.createElement("div");
    scheduleGrid.style.cssText = "display:grid;gap:8px";
    const currentWeekly = person.schedule?.weekly || {};
    staffWeekdays.forEach(([key, label]) => {
      const row = doc.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:minmax(0,1.3fr) repeat(2,minmax(0,1fr));align-items:center;gap:8px;padding:8px;border-radius:10px;background:#f3f8f7";
      const dayLabel = doc.createElement("label");
      dayLabel.style.cssText = "display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#183642";
      const enabled = doc.createElement("input");
      enabled.type = "checkbox";
      enabled.name = "day-" + key;
      enabled.checked = Boolean(currentWeekly[key]?.start && currentWeekly[key]?.end);
      dayLabel.append(enabled, doc.createTextNode(label));
      const start = doc.createElement("input");
      start.type = "time";
      start.name = "start-" + key;
      start.value = currentWeekly[key]?.start || "08:00";
      start.setAttribute("aria-label", label + " hora de entrada");
      const end = doc.createElement("input");
      end.type = "time";
      end.name = "end-" + key;
      end.value = currentWeekly[key]?.end || "16:00";
      end.setAttribute("aria-label", label + " hora de salida");
      [start, end].forEach(input => {
        input.style.cssText = "width:100%;padding:8px;border:1px solid #dce8e7;border-radius:8px;background:#fff;font:inherit";
        input.disabled = !enabled.checked;
      });
      enabled.addEventListener("change", () => {
        start.disabled = !enabled.checked;
        end.disabled = !enabled.checked;
      });
      row.append(dayLabel, start, end);
      scheduleGrid.appendChild(row);
    });
    const exceptionsTitle = doc.createElement("h3");
    exceptionsTitle.textContent = "Horario específico para una fecha";
    exceptionsTitle.style.cssText = "margin:18px 0 8px;font-size:14px;font-weight:800;color:#183642";
    const exceptionHelp = doc.createElement("p");
    exceptionHelp.textContent = "Guarda un turno distinto o un día libre para una fecha; las excepciones anteriores se conservan.";
    exceptionHelp.style.cssText = "margin:0 0 10px;font-size:12px;color:#71868c";
    const exceptionRow = doc.createElement("div");
    exceptionRow.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:8px";
    const date = doc.createElement("input");
    date.type = "date";
    date.name = "overrideDate";
    date.value = localDateKey(new Date());
    const dayOffLabel = doc.createElement("label");
    dayOffLabel.style.cssText = "display:flex;align-items:center;gap:6px;font-size:12px;color:#183642";
    const dayOff = doc.createElement("input");
    dayOff.type = "checkbox";
    dayOff.name = "dayOff";
    dayOffLabel.append(dayOff, doc.createTextNode("Día libre"));
    const overrideStart = doc.createElement("input");
    overrideStart.type = "time";
    overrideStart.name = "overrideStart";
    overrideStart.value = "08:00";
    const overrideEnd = doc.createElement("input");
    overrideEnd.type = "time";
    overrideEnd.name = "overrideEnd";
    overrideEnd.value = "16:00";
    [date, overrideStart, overrideEnd].forEach(input => {
      input.style.cssText = "width:100%;min-width:0;padding:8px;border:1px solid #dce8e7;border-radius:8px;background:#fff;font:inherit";
    });
    const updateOverride = () => {
      overrideStart.disabled = dayOff.checked;
      overrideEnd.disabled = dayOff.checked;
      date.disabled = type.value !== "rotating";
      dayOff.disabled = type.value !== "rotating";
      overrideStart.disabled = type.value !== "rotating" || dayOff.checked;
      overrideEnd.disabled = type.value !== "rotating" || dayOff.checked;
    };
    dayOff.addEventListener("change", updateOverride);
    type.addEventListener("change", updateOverride);
    updateOverride();
    exceptionRow.append(date, dayOffLabel, overrideStart, overrideEnd);
    const controls = doc.createElement("div");
    controls.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:20px";
    const cancel = doc.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.style.cssText = "padding:10px 14px;border:0;border-radius:999px;background:#e2eeed;color:#183642;font-weight:700";
    cancel.addEventListener("click", () => overlay.remove());
    const save = doc.createElement("button");
    save.type = "submit";
    save.textContent = "Guardar horario";
    save.style.cssText = "padding:10px 16px;border:0;border-radius:999px;background:#123a4a;color:white;font-weight:700";
    controls.append(cancel, save);
    form.append(heading, help, typeLabel, scheduleGrid, exceptionsTitle, exceptionHelp, exceptionRow, controls);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const weekly = {};
      for (const [key] of staffWeekdays) {
        if (!form.elements["day-" + key].checked) continue;
        const start = form.elements["start-" + key].value;
        const end = form.elements["end-" + key].value;
        if (!start || !end || start === end) {
          showToast(doc, "Completa una entrada y salida distintas para cada día activo.");
          return;
        }
        weekly[key] = { start, end };
      }
      if (Object.keys(weekly).length === 0 && type.value === "weekly") {
        showToast(doc, "Selecciona al menos un día de trabajo para el horario semanal.");
        return;
      }
      const schedule = { type: type.value, weekly, overrides: { ...(person.schedule?.overrides || {}) } };
      if (type.value === "rotating" && date.value) {
        if (dayOff.checked) schedule.overrides[date.value] = { dayOff: true };
        else if (overrideStart.value && overrideEnd.value && overrideStart.value !== overrideEnd.value) {
          schedule.overrides[date.value] = { start: overrideStart.value, end: overrideEnd.value };
        } else {
          showToast(doc, "Completa las horas del turno rotativo o marca el día como libre.");
          return;
        }
      }
      const latest = readState();
      const member = latest.staff.find(item => item.id === person.id);
      if (!member) return;
      member.schedule = schedule;
      writeState(latest);
      renderPersonnel(doc, latest.staff);
      showToast(doc, "Horario guardado para " + person.name + ".");
      overlay.remove();
    });
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.appendChild(form);
    doc.body.appendChild(overlay);
  }

  function showStaffNoveltyEditor(doc, person) {
    const overlay = doc.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:16px;background:#123a4a66;backdrop-filter:blur(4px)";
    const form = doc.createElement("form");
    form.setAttribute("role", "dialog");
    form.setAttribute("aria-modal", "true");
    form.setAttribute("aria-label", "Registrar novedad de " + person.name);
    form.style.cssText = "width:100%;max-width:460px;padding:22px;border-radius:22px;background:#fff;box-shadow:0 20px 60px #123a4a33;font-family:sans-serif";
    const heading = doc.createElement("h2");
    heading.textContent = "Novedad · " + person.name;
    heading.style.cssText = "margin:0 0 16px;font-size:20px;font-weight:800;color:#183642";
    const fields = doc.createElement("div");
    fields.style.cssText = "display:grid;gap:12px";
    const makeField = (labelText, control) => {
      const label = doc.createElement("label");
      label.style.cssText = "display:grid;gap:6px;font-size:13px;font-weight:700;color:#183642";
      label.append(doc.createTextNode(labelText), control);
      control.style.cssText = "width:100%;padding:10px;border:1px solid #dce8e7;border-radius:10px;background:#fff;font:inherit";
      fields.appendChild(label);
    };
    const date = doc.createElement("input");
    date.type = "date";
    date.name = "date";
    date.required = true;
    date.value = localDateKey(new Date());
    makeField("Fecha", date);
    const type = doc.createElement("select");
    type.name = "type";
    Object.entries(noveltyTypes).forEach(([value, label]) => {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = label;
      type.appendChild(option);
    });
    makeField("Tipo de novedad", type);
    const extra = doc.createElement("input");
    extra.type = "number";
    extra.name = "extraHours";
    extra.min = "0.25";
    extra.max = "24";
    extra.step = "0.25";
    extra.value = "1";
    const extraField = doc.createElement("label");
    extraField.style.cssText = "display:none;gap:6px;font-size:13px;font-weight:700;color:#183642";
    extraField.append(doc.createTextNode("Horas extra no incluidas en la marcación; se suman al total mensual"), extra);
    extra.style.cssText = "width:100%;padding:10px;border:1px solid #dce8e7;border-radius:10px;background:#fff;font:inherit";
    type.addEventListener("change", () => {
      extraField.style.display = type.value === "horas_extra" ? "grid" : "none";
      extra.required = type.value === "horas_extra";
    });
    fields.appendChild(extraField);
    const notes = doc.createElement("textarea");
    notes.name = "notes";
    notes.maxLength = 500;
    notes.rows = 3;
    notes.placeholder = "Detalle u observación";
    makeField("Observación", notes);
    const controls = doc.createElement("div");
    controls.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:18px";
    const cancel = doc.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.style.cssText = "padding:10px 14px;border:0;border-radius:999px;background:#e2eeed;color:#183642;font-weight:700";
    cancel.addEventListener("click", () => overlay.remove());
    const save = doc.createElement("button");
    save.type = "submit";
    save.textContent = "Guardar novedad";
    save.style.cssText = "padding:10px 16px;border:0;border-radius:999px;background:#123a4a;color:white;font-weight:700";
    controls.append(cancel, save);
    form.append(heading, fields, controls);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const latest = readState();
      const member = latest.staff.find(item => item.id === person.id);
      if (!member) return;
      const typeLabel = noveltyTypes[type.value];
      if (!typeLabel) {
        showToast(doc, "Selecciona un tipo de novedad válido.");
        return;
      }
      const extraHours = Number(extra.value);
      if (type.value === "horas_extra" && (!Number.isFinite(extraHours) || extraHours <= 0 || extraHours > 24)) {
        showToast(doc, "Indica una cantidad válida de horas extra (máximo 24).");
        return;
      }
      latest.novelties.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        staffId: member.id,
        staffName: member.name,
        date: date.value,
        type: type.value,
        label: typeLabel,
        notes: notes.value.trim().slice(0, 500),
        extraMinutes: type.value === "horas_extra" ? Math.round(extraHours * 60) : 0,
        createdAt: new Date().toISOString()
      });
      writeState(latest);
      renderPersonnel(doc, latest.staff);
      showToast(doc, "Novedad registrada para " + member.name + ".");
      overlay.remove();
    });
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.appendChild(form);
    doc.body.appendChild(overlay);
  }

  function renderPersonnel(doc, staff) {
    const list = doc.getElementById("staff-list");
    const empty = doc.getElementById("staff-empty");
    const count = doc.getElementById("staff-count");
    const directory = doc.getElementById("staff-directory-view");
    const report = doc.getElementById("staff-report-view");
    if (!list || !empty || !count) return;
    if (directory) {
      directory.hidden = false;
      directory.classList.remove("hidden");
    }
    doc.body.classList.remove("staff-report-open");
    if (report) {
      report.hidden = true;
      report.classList.add("hidden");
    }
    list.replaceChildren();
    count.textContent = staff.length
      ? staff.length + (staff.length === 1 ? " integrante" : " integrantes")
      : "No Registrado";
    empty.classList.toggle("hidden", staff.length > 0);

    staff.forEach(person => {
      const card = doc.createElement("article");
      card.className = "staff-card";

      const avatar = doc.createElement("span");
      avatar.className = "staff-card-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = person.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("es-MX");

      const details = doc.createElement("div");
      details.className = "staff-card-identity";
      const name = doc.createElement("h3");
      name.className = "staff-card-name";
      name.textContent = person.name;

      const phone = doc.createElement("p");
      phone.className = "staff-card-phone";
      const phoneIcon = doc.createElement("span");
      phoneIcon.className = "material-symbols-outlined";
      phoneIcon.setAttribute("aria-hidden", "true");
      phoneIcon.textContent = person.contact?.includes("@") ? "mail" : "call";
      phone.append(phoneIcon, doc.createTextNode(person.contact || "No Registrado"));
      details.append(name, phone);

      const heading = doc.createElement("div");
      heading.className = "staff-card-heading";
      heading.append(avatar, details);

      const actions = doc.createElement("div");
      actions.className = "staff-card-actions";
      const actionButton = (label, icon, dataName, value) => {
        const button = doc.createElement("button");
        button.type = "button";
        button.dataset[dataName] = value;
        button.className = "staff-card-action";
        const symbol = doc.createElement("span");
        symbol.className = "material-symbols-outlined";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = icon;
        button.append(symbol, doc.createTextNode(label));
        return button;
      };
      actions.appendChild(actionButton("Novedad", "event_note", "staffNovelty", person.id));

      const historyButton = doc.createElement("button");
      historyButton.type = "button";
      historyButton.dataset.staffHistory = person.id;
      historyButton.className = "staff-card-action staff-card-action-primary";
      historyButton.append(doc.createTextNode("Resumen mensual"));
      const historyIcon = doc.createElement("span");
      historyIcon.className = "material-symbols-outlined";
      historyIcon.setAttribute("aria-hidden", "true");
      historyIcon.textContent = "calendar_month";
      historyButton.prepend(historyIcon);
      actions.appendChild(historyButton);

      const remove = doc.createElement("button");
      remove.type = "button";
      remove.dataset.removeStaff = person.id;
      remove.setAttribute("aria-label", "Eliminar ficha de " + person.name);
      remove.className = "staff-card-delete";
      const removeIcon = doc.createElement("span");
      removeIcon.className = "material-symbols-outlined text-lg";
      removeIcon.setAttribute("aria-hidden", "true");
      removeIcon.textContent = "delete";
      remove.appendChild(removeIcon);

      heading.appendChild(remove);
      card.append(heading, actions);
      list.appendChild(card);
    });
  }

  function renderStaffReport(doc, person, state, month) {
    const directory = doc.getElementById("staff-directory-view");
    const report = doc.getElementById("staff-report-view");
    const monthInput = doc.getElementById("staff-report-month");
    if (!directory || !report || !monthInput || !person) return;

    doc.body.classList.add("staff-report-open");
    directory.hidden = true;
    directory.classList.add("hidden");
    report.hidden = false;
    report.classList.remove("hidden");
    doc.getElementById("staff-report-name").textContent = person.name;
    monthInput.value = month || (() => {
      const now = new Date();
      return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    })();

    const monthKey = monthInput.value;
    const monthDate = value => {
      if (!value) return null;
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
      const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
      if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const dayLabel = value => {
      const date = monthDate(value);
      return date ? new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(date) : "No Registrado";
    };
    const timeLabel = value => {
      const date = monthDate(value);
      return date ? new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(date) : "Pendiente";
    };
    const formatMinutes = minutes => {
      const safeMinutes = Math.max(0, Math.floor(minutes));
      return Math.floor(safeMinutes / 60) + " h " + String(safeMinutes % 60).padStart(2, "0") + " min";
    };
    const belongsToMonth = date => date && date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") === monthKey;
    const attendance = state.attendance.filter(item => item.staffId === person.id)
      .map(item => ({ ...item, start: monthDate(item.checkIn), end: monthDate(item.checkOut) }))
      .filter(item => belongsToMonth(item.start))
      .sort((left, right) => right.start - left.start);
    const allWork = state.cleaningWork.filter(item => item.staffId === person.id).slice();
    state.events.filter(item => item.cleanerId === person.id && item.action === "Limpieza completada")
      .forEach(event => {
        const eventDate = monthDate(event.time);
        const type = cleaningWorkTypes[event.cleaningType] ? event.cleaningType : null;
        const alreadyLogged = allWork.some(item => {
          const itemDate = monthDate(item.time);
          return String(item.room) === String(event.room) && item.cleaningType === type &&
            itemDate && eventDate && itemDate.getFullYear() === eventDate.getFullYear() &&
            itemDate.getMonth() === eventDate.getMonth() && itemDate.getDate() === eventDate.getDate();
        });
        if (!alreadyLogged) {
          allWork.push({ staffId: person.id, room: event.room, cleaningType: type, time: event.time });
        }
      });
    const work = allWork
      .map(item => ({ ...item, date: monthDate(item.time) }))
      .filter(item => belongsToMonth(item.date))
      .sort((left, right) => right.date - left.date);
    const [reportYear, reportMonth] = monthKey.split("-").map(Number);
    const monthStart = new Date(reportYear, reportMonth - 1, 1);
    const nextMonthStart = new Date(reportYear, reportMonth, 1);
    const assignments = (state.roomAssignments || [])
      .filter(item => item.staffId === person.id)
      .map(item => ({
        ...item,
        start: monthDate(item.assignedAt),
        end: monthDate(item.unassignedAt)
      }))
      .filter(item => item.start && item.start < nextMonthStart && (!item.end || item.end >= monthStart))
      .sort((left, right) => right.start - left.start);
    const novelties = state.novelties.filter(item => item.staffId === person.id && String(item.date).slice(0, 7) === monthKey)
      .sort((left, right) => right.date.localeCompare(left.date));
    const minutesForAttendance = item => item.start && item.end && item.end > item.start
      ? Math.floor((item.end - item.start) / 60000) : 0;
    const closedAttendance = attendance.filter(item => item.start && item.end && item.end > item.start);
    const attendanceMinutes = attendance.reduce((sum, item) => sum + minutesForAttendance(item), 0);
    const extraRecords = novelties.filter(item =>
      item.type === "horas_extra" && item.extraMinutes !== null && item.extraMinutes !== undefined
    );
    const extraMinutes = extraRecords
      .reduce((sum, item) => sum + (Number(item.extraMinutes) || 0), 0);
    const totalMinutes = attendanceMinutes + extraMinutes;
    const workedDays = new Set(attendance
      .map(item => item.start.getFullYear() + "-" + String(item.start.getMonth() + 1).padStart(2, "0") + "-" + String(item.start.getDate()).padStart(2, "0")));
    doc.getElementById("staff-report-hours").textContent =
      closedAttendance.length || extraRecords.length ? formatMinutes(totalMinutes) : "No Registrado";
    doc.getElementById("staff-report-attendance-hours").textContent =
      closedAttendance.length ? formatMinutes(attendanceMinutes) : "No Registrado";
    doc.getElementById("staff-report-extra-hours").textContent =
      extraRecords.length ? formatMinutes(extraMinutes) : "No Registrado";
    doc.getElementById("staff-report-days").textContent = attendance.length ? String(workedDays.size) : "No Registrado";
    doc.getElementById("staff-report-novelty-count").textContent = novelties.length ? String(novelties.length) : "No Registrado";

    const attendanceRows = doc.getElementById("staff-attendance-rows");
    attendanceRows.replaceChildren();
    attendance.forEach(item => {
      const row = doc.createElement("tr");
      const values = [
        [dayLabel(item.start), "whitespace-nowrap px-4 py-3 text-[#526c73]"],
        [timeLabel(item.checkIn), "whitespace-nowrap px-4 py-3 text-[#526c73]"],
        [timeLabel(item.checkOut), "whitespace-nowrap px-4 py-3 text-[#526c73]"],
        [item.end ? formatMinutes(minutesForAttendance(item)) : "Pendiente", "whitespace-nowrap px-4 py-3 text-right font-semibold text-[#176273]"]
      ];
      values.forEach(([text, className]) => {
        const cell = doc.createElement("td");
        cell.className = className;
        cell.textContent = text;
        row.appendChild(cell);
      });
      attendanceRows.appendChild(row);
    });
    doc.getElementById("staff-attendance-empty").classList.toggle("hidden", attendance.length > 0);
    doc.getElementById("staff-attendance-table-wrap").classList.toggle("hidden", attendance.length === 0);

    const workRows = doc.getElementById("staff-work-rows");
    workRows.replaceChildren();
    work.forEach(item => {
      const row = doc.createElement("tr");
      [dayLabel(item.date), "Hab. " + (item.room || "No Registrado"), cleaningWorkTypes[item.cleaningType]?.label || "No Registrado"].forEach((value, index) => {
        const cell = doc.createElement("td");
        cell.className = index === 1 ? "whitespace-nowrap px-4 py-3 font-bold text-[#183642]" : "px-4 py-3 text-[#526c73]";
        cell.textContent = value;
        row.appendChild(cell);
      });
      workRows.appendChild(row);
    });
    doc.getElementById("staff-work-empty").classList.toggle("hidden", work.length > 0);
    doc.getElementById("staff-work-table-wrap").classList.toggle("hidden", work.length === 0);

    const assignmentRows = doc.getElementById("staff-assignment-rows");
    assignmentRows.replaceChildren();
    assignments.forEach(item => {
      const row = doc.createElement("tr");
      [dayLabel(item.start), "Hab. " + (item.roomId || "No Registrado"), item.end ? dayLabel(item.end) : "Activa"]
        .forEach(value => {
          const cell = doc.createElement("td");
          cell.className = "whitespace-nowrap px-4 py-3 text-[#526c73]";
          cell.textContent = value;
          row.appendChild(cell);
        });
      assignmentRows.appendChild(row);
    });
    doc.getElementById("staff-assignment-empty").classList.toggle("hidden", assignments.length > 0);
    doc.getElementById("staff-assignment-table-wrap").classList.toggle("hidden", assignments.length === 0);

    const noveltyRows = doc.getElementById("staff-novelty-rows");
    noveltyRows.replaceChildren();
    novelties.forEach(item => {
      const row = doc.createElement("tr");
      const cells = [
        [dayLabel(item.date), "whitespace-nowrap px-4 py-3 text-[#526c73]"],
        [item.label || item.type, "px-4 py-3 font-semibold text-[#183642]"],
        [item.notes || "No Registrado", "px-4 py-3 text-[#526c73]"],
        [item.type === "horas_extra"
          ? item.extraMinutes === null || item.extraMinutes === undefined
            ? "No Registrado" : formatMinutes(Number(item.extraMinutes) || 0)
          : "No Registrado", "whitespace-nowrap px-4 py-3 text-right text-[#176273]"]
      ];
      cells.forEach(([value, className]) => {
        const cell = doc.createElement("td");
        cell.className = className;
        cell.textContent = value;
        row.appendChild(cell);
      });
      noveltyRows.appendChild(row);
    });
    doc.getElementById("staff-novelty-empty").classList.toggle("hidden", novelties.length > 0);
    doc.getElementById("staff-novelty-table-wrap").classList.toggle("hidden", novelties.length === 0);

    monthInput.onchange = () => renderStaffReport(doc, person, readState(), monthInput.value);
    doc.getElementById("staff-report-export").onclick = () => {
      const csvCell = value => '"' + String(value).replace(/"/g, '""') + '"';
      const csvRows = [
        ["Personal", person.name],
        ["Mes", monthKey],
        ["Días trabajados", attendance.length ? workedDays.size : "No Registrado"],
        ["Horas marcadas", closedAttendance.length ? formatMinutes(attendanceMinutes) : "No Registrado"],
        ["Horas extra", extraRecords.length ? formatMinutes(extraMinutes) : "No Registrado"],
        ["Total horas para nómina", closedAttendance.length || extraRecords.length ? formatMinutes(totalMinutes) : "No Registrado"],
        [],
        ["ASISTENCIA"],
        ["Día", "Entrada", "Salida", "Horas trabajadas"]
      ];
      attendance.slice().reverse().forEach(item => csvRows.push([
        dayLabel(item.start), timeLabel(item.checkIn), timeLabel(item.checkOut),
        item.end ? formatMinutes(minutesForAttendance(item)) : "Pendiente"
      ]));
      csvRows.push([], ["HABITACIONES Y TRABAJOS"], ["Día", "Habitación", "Trabajo realizado"]);
      work.slice().reverse().forEach(item => csvRows.push([
        dayLabel(item.date), item.room || "No Registrado", cleaningWorkTypes[item.cleaningType]?.label || "No Registrado"
      ]));
      csvRows.push([], ["HISTORIAL DE HABITACIONES ASIGNADAS"], ["Asignada", "Habitación", "Retirada"]);
      assignments.slice().reverse().forEach(item => csvRows.push([
        dayLabel(item.start), item.roomId || "No Registrado", item.end ? dayLabel(item.end) : "Activa"
      ]));
      csvRows.push([], ["NOVEDADES"], ["Día", "Tipo", "Observación", "Horas extra"]);
      novelties.slice().reverse().forEach(item => csvRows.push([
        item.date, item.label || item.type, item.notes || "",
        item.type === "horas_extra"
          ? item.extraMinutes === null || item.extraMinutes === undefined
            ? "No Registrado" : formatMinutes(Number(item.extraMinutes) || 0)
          : "No Registrado"
      ]));
      const csv = "\uFEFF" + csvRows.map(row => row.map(csvCell).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = doc.defaultView.URL.createObjectURL(blob);
      const link = doc.createElement("a");
      const safeName = person.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
      link.href = url;
      link.download = "resumen-nomina-" + safeName + "-" + monthKey + ".csv";
      doc.body.appendChild(link);
      link.click();
      link.remove();
      doc.defaultView.setTimeout(() => doc.defaultView.URL.revokeObjectURL(url), 1000);
    };
  }

  function startShell() {
    const frames = {
      inicio: document.getElementById("frame-inicio"),
      habitaciones: document.getElementById("frame-habitaciones"),
      limpiezas: document.getElementById("frame-limpiezas"),
      historial: document.getElementById("frame-historial"),
      personal: document.getElementById("frame-personal")
    };
    const links = Array.from(document.querySelectorAll(".nav-link"));
    let selectedStaffId = null;
    let currentScreen = "inicio";
    let currentTheme = "light";
    try {
      currentTheme = localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
    } catch (error) {
      console.warn("No se pudo leer la preferencia de tema.", error);
    }

    function applyTheme() {
      const isDark = currentTheme === "dark";
      document.documentElement.dataset.theme = currentTheme;
      document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
        meta.setAttribute("content", isDark ? "#10191e" : "#0d2c3a");
      });
      Object.values(frames).forEach(frame => {
        const childRoot = frame?.contentDocument?.documentElement;
        if (childRoot) childRoot.dataset.theme = currentTheme;
      });
      const toggle = document.getElementById("theme-toggle");
      if (toggle) {
        const label = isDark ? "Activar modo claro" : "Activar modo oscuro";
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.title = label;
        toggle.querySelector(".material-symbols-outlined").textContent = isDark ? "light_mode" : "dark_mode";
        toggle.querySelector(".theme-toggle-label").textContent = isDark ? "Modo claro" : "Modo oscuro";
      }
    }

    document.getElementById("theme-toggle")?.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme();
      try {
        localStorage.setItem(themeStorageKey, currentTheme);
      } catch (error) {
        console.error("No se pudo guardar la preferencia de tema.", error);
        showToast(document, "El tema cambió, pero no se pudo guardar la preferencia.");
      }
    });
    applyTheme();

    function refreshFrame(screenName) {
      const f = frames[screenName];
      if (!f || !f.contentDocument) return;
      try {
        const doc = f.contentDocument;
        if (screenName === "habitaciones") {
          enhanceRooms(doc);
        } else if (screenName === "limpiezas") {
          enhanceCleaning(doc);
        } else if (screenName === "historial") {
          enhanceHistory(doc);
        } else if (screenName === "personal") {
          const state = readState();
          renderPersonnel(doc, state.staff);
          if (selectedStaffId) {
            const person = state.staff.find(p => p.id === selectedStaffId);
            if (person) renderStaffReport(doc, person, state);
          }
        }
      } catch (e) {
        console.warn("Error refrescando vista " + screenName, e);
      }
    }

    function showScreen(requested) {
      const target = screens[requested] ? requested : "inicio";
      currentScreen = target;

      Object.entries(frames).forEach(([name, el]) => {
        if (!el) return;
        if (name === target) {
          el.classList.remove("hidden");
          refreshFrame(name);
        } else {
          el.classList.add("hidden");
        }
      });

      links.forEach(link => {
        const active = link.dataset.screen === target;
        link.querySelector("span:last-child").classList.toggle("font-bold", active);
        link.querySelector("span:last-child").classList.toggle("font-medium", !active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }

    document.querySelector("nav").addEventListener("click", event => {
      const link = event.target.closest("[data-screen]");
      if (!link) return;
      event.preventDefault();
      const screen = link.dataset.screen;
      if (location.hash !== "#" + screen) history.pushState({ screen }, "", "#" + screen);
      showScreen(screen);
    });
    window.addEventListener("popstate", () => showScreen(location.hash.slice(1)));
    window.addEventListener("hashchange", () => showScreen(location.hash.slice(1)));

    window.addEventListener("message", async event => {
      const senderFrame = Object.values(frames).find(f => f && f.contentWindow === event.source);
      if (!senderFrame || !event.data) return;

      if (event.data.type === "hotel:staff:create") {
        const person = event.data.staff;
        if (!person || typeof person.name !== "string" || typeof person.contact !== "string" ||
            !person.name.trim() || !person.contact.trim()) {
          showToast(document, "Revisa los datos del personal e inténtalo de nuevo.");
          return;
        }
        const contact = person.contact.trim();
        const validPhone = /^[+0-9(). -]+$/.test(contact) && contact.replace(/\D/g, "").length >= 7;
        if (!validPhone) {
          showToast(document, "Ingresa un número de teléfono válido para habilitar el acceso.");
          return;
        }
        const staffMember = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          name: person.name.trim().slice(0, 80),
          contact: contact.slice(0, 254)
        };
        let password = null;
        if (window.HotelDB) {
          try {
            password = await window.HotelDB.createStaff(staffMember);
          } catch (error) {
            console.error("[HotelDB] No se pudo guardar el personal.", error);
            const feedback = senderFrame.contentDocument.getElementById("staff-feedback");
            if (feedback) feedback.textContent = "No se pudo guardar la ficha en Supabase.";
            showToast(document, "No se pudo guardar el personal en Supabase.");
            return;
          }
        }
        const state = readState();
        state.staff.unshift(staffMember);
        writeState(state);
        renderPersonnel(senderFrame.contentDocument, state.staff);
        senderFrame.contentDocument.getElementById("staff-form")?.reset();
        const fb = senderFrame.contentDocument.getElementById("staff-feedback");
        if (fb) fb.textContent = password
          ? "Ficha guardada. Clave de acceso (compártela con el aseador): " + password
          : "Ficha guardada localmente. Conecta Supabase para crear el acceso.";
        showToast(document, "Personal agregado correctamente.");
        return;
      }
      if (event.data.type === "hotel:staff:remove") {
        const state = readState();
        if (state.attendance.some(item => item.staffId === event.data.id && !item.checkOut)) {
          showToast(document, "Registra la salida pendiente antes de eliminar esta ficha.");
          return;
        }
        state.staff = state.staff.filter(person => person.id !== event.data.id);
        const unassignedAt = new Date().toISOString();
        state.roomAssignments.forEach(assignment => {
          if (assignment.staffId === event.data.id && !assignment.unassignedAt) {
            assignment.unassignedAt = unassignedAt;
          }
        });
        Object.entries(state.assignedCleanings).forEach(([room, assignment]) => {
          if (assignment.staffId === event.data.id) delete state.assignedCleanings[room];
        });
        if (selectedStaffId === event.data.id) selectedStaffId = null;
        writeState(state);
        if (window.HotelDB) window.HotelDB.removeStaff(event.data.id);
        renderPersonnel(senderFrame.contentDocument, state.staff);
        showToast(document, "Ficha eliminada.");
        return;
      }
      if (event.data.type === "hotel:staff:history") {
        const state = readState();
        const person = state.staff.find(item => item.id === event.data.id);
        if (person) {
          selectedStaffId = person.id;
          renderStaffReport(senderFrame.contentDocument, person, state);
        }
        return;
      }
      if (event.data.type === "hotel:staff:schedule") {
        const state = readState();
        const person = state.staff.find(item => item.id === event.data.id);
        if (person) showStaffScheduleEditor(senderFrame.contentDocument, person);
        return;
      }
      if (event.data.type === "hotel:staff:novelty") {
        const person = readState().staff.find(item => item.id === event.data.id);
        if (person) showStaffNoveltyEditor(senderFrame.contentDocument, person);
        return;
      }
      if (event.data.type === "hotel:staff:attendance") {
        const state = readState();
        const person = state.staff.find(item => item.id === event.data.id);
        if (!person || !["in", "out"].includes(event.data.action)) return;
        const activeSession = state.attendance.find(item => item.staffId === person.id && !item.checkOut);
        if (event.data.action === "in") {
          if (activeSession) {
            showToast(document, person.name + " ya tiene una entrada sin salida.");
            return;
          }
          const newAtt = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            staffId: person.id,
            staffName: person.name,
            checkIn: new Date().toISOString(),
            checkOut: null
          };
          state.attendance.unshift(newAtt);
          if (window.HotelDB) window.HotelDB.saveAttendance(newAtt);
        } else {
          if (!activeSession) {
            showToast(document, "No hay una entrada abierta para " + person.name + ".");
            return;
          }
          const checkOut = new Date();
          if (checkOut <= new Date(activeSession.checkIn)) {
            showToast(document, "La hora de salida debe ser posterior a la entrada.");
            return;
          }
          activeSession.checkOut = checkOut.toISOString();
          if (window.HotelDB) window.HotelDB.saveAttendance(activeSession);
        }
        writeState(state);
        renderPersonnel(senderFrame.contentDocument, state.staff);
        showToast(document, event.data.action === "in" ? "Entrada registrada para " + person.name + "." : "Salida registrada para " + person.name + ".");
        return;
      }
      if (event.data.type === "hotel:staff:list") {
        selectedStaffId = null;
        renderPersonnel(senderFrame.contentDocument, readState().staff);
        return;
      }
      if (event.data.type !== "hotel:navigate") return;
      const screen = event.data.screen;
      if (!screens[screen]) return;
      history.pushState({ screen }, "", "#" + screen);
      showScreen(screen);
      if (event.data.notice) showToast(document, event.data.notice);
    });

    // Inyectar dependencias y estilos en cada iframe una sola vez al cargar
    Object.entries(frames).forEach(([screenName, frameEl]) => {
      if (!frameEl) return;
      const integrateFrame = () => {
        try {
          const child = frameEl.contentDocument;
          if (!child || !child.body || child.body.dataset.hotelIntegrated === "true") return;
          child.body.dataset.hotelIntegrated = "true";
          child.documentElement.dataset.theme = currentTheme;
          const pageClass = screenName === "habitaciones" ? "screen-rooms" :
            screenName === "limpiezas" ? "screen-cleaning" :
              screenName === "historial" ? "screen-history" :
                screenName === "personal" ? "screen-staff" : "screen-home";
          child.body.classList.add(pageClass);
          if (pageClass === "screen-staff") {
            const state = readState();
            renderPersonnel(child, state.staff);
          }
          const originalNav = child.querySelector("body > nav");
          if (originalNav) originalNav.hidden = true;
          if (!child.getElementById("hotel-responsive-layout")) {
            const responsive = child.createElement("style");
            responsive.id = "hotel-responsive-layout";
            responsive.textContent = responsiveStyles;
            child.head.appendChild(responsive);
          }
          if (!child.getElementById("hotel-db-script")) {
            const dbScript = child.createElement("script");
            dbScript.id = "hotel-db-script";
            dbScript.src = new URL("db.js", document.baseURI).href;
            child.head.appendChild(dbScript);
          }
          if (!child.getElementById("hotel-app-script")) {
            const bridge = child.createElement("script");
            bridge.id = "hotel-app-script";
            bridge.src = new URL("app.js", document.baseURI).href;
            child.body.appendChild(bridge);
          }
        } catch (error) {
          console.error("No se pudo integrar la pantalla " + screenName, error);
        }
      };
      frameEl.addEventListener("load", integrateFrame);
      if (frameEl.contentDocument?.readyState === "complete") integrateFrame();
    });

    showScreen(location.hash.slice(1) || "inicio");

    // Sincronización remota inicial y suscripción en tiempo real
    if (window.HotelDB) {
      window.HotelDB.fetchRemoteState().then(remoteState => {
        if (remoteState) {
          const current = readState();
          const merged = { ...current, ...remoteState };
          merged.stats = statsForRooms(merged.rooms);
          writeState(merged);
          // Refrescar todas las pantallas abiertas en segundo plano
          Object.keys(frames).forEach(refreshFrame);
        }
      });

      window.HotelDB.subscribeRealtime(async () => {
        const remoteState = await window.HotelDB.fetchRemoteState();
        if (remoteState) {
          const current = readState();
          const merged = { ...current, ...remoteState };
          merged.stats = statsForRooms(merged.rooms);
          writeState(merged);
          Object.keys(frames).forEach(refreshFrame);
        }
      });
    }

    // Inicializar UI del Bot IA en el Shell
    initBotUI();

    // Inicializar Sistema de Autenticación / Login Seguro
    initAuthUI();
  }

  function initAuthUI() {
    const authScreen = document.getElementById("auth-screen");
    const authForm = document.getElementById("auth-form");
    const authEmail = document.getElementById("auth-email");
    const authPassword = document.getElementById("auth-password");
    const authError = document.getElementById("auth-error");
    const authErrorText = document.getElementById("auth-error-text");
    const togglePwdBtn = document.getElementById("auth-toggle-pwd");
    const logoutBtn = document.getElementById("logout-btn");
    const submitBtn = document.getElementById("auth-submit-btn");
    const cleanerScreen = document.getElementById("cleaner-screen");
    const cleanerName = document.getElementById("cleaner-name");
    const cleanerList = document.getElementById("cleaner-room-list");
    const cleanerEmpty = document.getElementById("cleaner-empty");
    const cleanerFeedback = document.getElementById("cleaner-feedback");
    let cleanerSession = null;

    if (!authScreen || !authForm) return;

    function showCleanerFeedback(message) {
      if (!cleanerFeedback) return;
      cleanerFeedback.textContent = message || "";
      cleanerFeedback.classList.toggle("hidden", !message);
    }

    function renderCleanerRooms(rooms) {
      if (!cleanerList || !cleanerEmpty) return;
      cleanerList.replaceChildren();
      cleanerEmpty.classList.toggle("hidden", rooms.length > 0);

      rooms.forEach(room => {
        const card = document.createElement("article");
        card.className = "rounded-2xl border border-[#dce8e7] bg-white p-4 shadow-sm";
        const heading = document.createElement("div");
        heading.className = "flex items-start justify-between gap-3";
        const title = document.createElement("h2");
        title.className = "text-lg font-extrabold";
        title.textContent = "Habitación " + room.id_habitacion;
        const status = document.createElement("span");
        const isFinished = room.estado === "finalizado";
        const statusLabels = {
          libre: "Libre",
          ocupada: "Ocupada",
          pendiente: "Pendiente",
          limpieza: "En limpieza",
          finalizado: "Finalizado"
        };
        status.className = "shrink-0 rounded-full px-3 py-1 text-xs font-bold " +
          (isFinished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700");
        status.textContent = statusLabels[room.estado] || "Asignada";
        heading.append(title, status);
        card.appendChild(heading);

        const details = [room.plan_limpieza, room.tipo_limpieza_asignada, room.detalles_limpieza]
          .filter(value => typeof value === "string" && value.trim());
        if (room.nombre_huesped) details.unshift("Huésped: " + room.nombre_huesped);
        if (details.length) {
          const description = document.createElement("p");
          description.className = "mt-2 whitespace-pre-wrap text-sm text-[#71868c]";
          description.textContent = details.join(" · ");
          card.appendChild(description);
        }

        if (!isFinished) {
          const finishButton = document.createElement("button");
          finishButton.type = "button";
          finishButton.dataset.finishRoom = room.id_habitacion;
          finishButton.className = "mt-4 w-full rounded-xl bg-[#123a4a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#176273] disabled:cursor-wait disabled:opacity-60";
          finishButton.textContent = "Marcar como finalizado";
          card.appendChild(finishButton);
        }
        cleanerList.appendChild(card);
      });
    }

    async function refreshCleanerRooms() {
      if (!cleanerSession) return;
      showCleanerFeedback("");
      try {
        const rooms = await window.HotelDB.getCleanerRooms(
          cleanerSession.phone,
          cleanerSession.password
        );
        renderCleanerRooms(rooms);
      } catch (error) {
        console.error("[Auth] No se pudieron cargar las habitaciones del aseador.", error);
        showCleanerFeedback("No se pudieron cargar tus habitaciones. Intenta actualizar o vuelve a iniciar sesión.");
      }
    }

    function startCleanerSession(profile, phone, password) {
      cleanerSession = { phone, password };
      if (cleanerName) cleanerName.textContent = profile.nombre || "Mis habitaciones";
      authScreen.classList.add("hidden");
      cleanerScreen?.classList.remove("hidden");
      refreshCleanerRooms();
    }

    // Alternar visibilidad de contraseña
    togglePwdBtn?.addEventListener("click", () => {
      const isPwd = authPassword.type === "password";
      authPassword.type = isPwd ? "text" : "password";
      togglePwdBtn.querySelector("span").textContent = isPwd ? "visibility_off" : "visibility";
    });

    // Validar sesión al cargar
    async function checkAuth() {
      if (!window.HotelAuth) {
        authScreen.classList.remove("hidden");
        return;
      }
      try {
        const user = await window.HotelAuth.getSession();
        if (user) {
          authScreen.classList.add("hidden");
          console.log("[Auth] Usuario autenticado:", user.email);
        } else {
          authScreen.classList.remove("hidden");
          authEmail?.focus();
        }
      } catch (error) {
        console.error("[Auth] No se pudo comprobar la sesión.", error);
        authScreen.classList.remove("hidden");
        authError.classList.remove("hidden");
        authErrorText.textContent = "No se pudo comprobar la sesión. Intenta iniciar sesión.";
      }
    }

    checkAuth();

    // Manejo de Login
    authForm.addEventListener("submit", async e => {
      e.preventDefault();
      authError.classList.add("hidden");
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-60");

      try {
        const email = authEmail.value;
        const pwd = authPassword.value;
        const phoneDigits = email.replace(/\D/g, "");
        const isPhone = !email.includes("@") && /^[+0-9(). -]+$/.test(email) && phoneDigits.length >= 7;

        if (isPhone) {
          const profile = await window.HotelDB.loginCleaner(email, pwd);
          if (profile) {
            authForm.reset();
            startCleanerSession(profile, email, pwd);
            return;
          }
          authError.classList.remove("hidden");
          authErrorText.textContent = "Teléfono o clave incorrectos.";
          return;
        }

        const { user, error } = await window.HotelAuth.signIn(email, pwd);

        if (error) {
          authError.classList.remove("hidden");
          authErrorText.textContent = error.message || "Usuario o contraseña inválidos";
        } else if (user) {
          authScreen.classList.add("hidden");
          authForm.reset();
          showToast(document, "Bienvenido al sistema");
        }
      } catch (err) {
        console.error("[Auth] Error al iniciar sesión.", err);
        authError.classList.remove("hidden");
        authErrorText.textContent = err.message || "Error al intentar iniciar sesión.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60");
      }
    });

    // Manejo de Logout
    logoutBtn?.addEventListener("click", async () => {
      if (confirm("¿Estás seguro de que deseas salir del sistema?")) {
        await window.HotelAuth.signOut();
        authScreen.classList.remove("hidden");
        authEmail?.focus();
      }
    });

    document.getElementById("cleaner-refresh")?.addEventListener("click", refreshCleanerRooms);
    document.getElementById("cleaner-logout")?.addEventListener("click", () => {
      cleanerSession = null;
      cleanerScreen?.classList.add("hidden");
      authScreen.classList.remove("hidden");
      authEmail?.focus();
    });
    cleanerList?.addEventListener("click", async event => {
      const button = event.target.closest("[data-finish-room]");
      if (!button || !cleanerSession) return;
      button.disabled = true;
      button.textContent = "Guardando...";
      try {
        await window.HotelDB.finishCleanerRoom(
          cleanerSession.phone,
          cleanerSession.password,
          button.dataset.finishRoom
        );
        await refreshCleanerRooms();
      } catch (error) {
        console.error("[Auth] No se pudo finalizar la habitación asignada.", error);
        showCleanerFeedback(error.message || "No se pudo finalizar la habitación.");
        button.disabled = false;
        button.textContent = "Marcar como finalizado";
      }
    });

    // Escuchar cambios de estado en segundo plano
    window.HotelAuth?.onAuthStateChange(user => {
      if (!user) {
        authScreen.classList.remove("hidden");
      }
    });
  }

  function initBotUI() {
    const modal = document.getElementById("bot-modal");
    const openBtn = document.getElementById("open-bot-btn");
    const closeBtn = document.getElementById("close-bot-btn");
    const form = document.getElementById("bot-form");
    const input = document.getElementById("bot-input");
    const messages = document.getElementById("bot-messages");
    if (!modal || !openBtn || !closeBtn || !form || !input || !messages) return;

    let chatHistory = [];

    function appendMessage(role, text) {
      const isUser = role === "user";
      const wrapper = document.createElement("div");
      wrapper.className = isUser ? "flex justify-end" : "flex gap-2.5 max-w-[85%]";

      if (isUser) {
        wrapper.innerHTML = `
          <div class="p-3 rounded-2xl rounded-tr-none bg-[#176273] text-white shadow-sm max-w-[85%]">
            <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
        `;
      } else {
        wrapper.innerHTML = `
          <div class="w-6 h-6 rounded-lg bg-[#23b6a7]/20 flex items-center justify-center text-[#176273] shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[15px]">smart_toy</span>
          </div>
          <div class="p-3 rounded-2xl rounded-tl-none bg-white text-[#183642] shadow-sm border border-[#e2eceb]">
            <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
          </div>
        `;
      }

      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
      return wrapper;
    }

    function appendLoading() {
      const wrapper = document.createElement("div");
      wrapper.className = "flex gap-2.5 max-w-[85%] bot-loading-bubble";
      wrapper.innerHTML = `
        <div class="w-6 h-6 rounded-lg bg-[#23b6a7]/20 flex items-center justify-center text-[#176273] shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-[15px]">smart_toy</span>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-white text-[#183642] shadow-sm border border-[#e2eceb] flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#176273] animate-bounce"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#176273] animate-bounce [animation-delay:0.2s]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#176273] animate-bounce [animation-delay:0.4s]"></span>
          <span class="text-[11px] text-[#71868c] ml-1">Consultando base de datos...</span>
        </div>
      `;
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
      return wrapper;
    }

    const floatingTrigger = document.getElementById("bot-floating-trigger");

    function openChat() {
      modal.classList.remove("hidden");
      floatingTrigger?.classList.add("hidden");
      input.focus();
    }

    function closeChat() {
      modal.classList.add("hidden");
      floatingTrigger?.classList.remove("hidden");
    }

    openBtn?.addEventListener("click", openChat);
    floatingTrigger?.addEventListener("click", openChat);
    closeBtn?.addEventListener("click", closeChat);

    document.getElementById("bot-backdrop")?.addEventListener("click", closeChat);

    // Soporte para chips de preguntas rápidas
    document.querySelectorAll(".bot-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        input.value = chip.textContent.trim();
        form.dispatchEvent(new Event("submit"));
      });
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      input.value = "";
      appendMessage("user", query);
      chatHistory.push({ role: "user", content: query });

      const loadingBubble = appendLoading();

      try {
        if (!window.HotelBot) throw new Error("Bot no inicializado.");
        const answer = await window.HotelBot.ask(query, chatHistory);
        loadingBubble.remove();
        appendMessage("assistant", answer);
        chatHistory.push({ role: "assistant", content: answer });
        // Mantener historial controlado
        if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
      } catch (err) {
        loadingBubble.remove();
        appendMessage("assistant", "⚠️ " + (err.message || "Error al conectar con la IA."));
      }
    });
  }

  function enhanceRooms(doc) {
    doc.documentElement.dataset.hotelRoomFiltersManaged = "true";
    const state = readState();
    const roomDetailPanel = doc.getElementById("roomDetailPanel");
    const previouslySelectedRoom = roomDetailPanel?.dataset.roomId ||
      doc.querySelector(".room-card[data-room-id].ring-2")?.dataset.roomId || null;
    const roomImageSources = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA4KmRP5VKmH1m2Sv3yImJtfriNgnZDFoGSkIseRaRlCE3nju62RQ6iXjVn1AwWKBVsOkmE3AMW4crT7BQnKVU7DzKAJZ5yfggXovGMcgP7VcMUIxxAtTTGzP9vmGBSy6O08JLHehjAz4z6M2uMQeNTh_V7HFu-cVeiQbYdAmWrGZWM2hVK5fkFpsREzgYpUECByyPg0Zp10OLXOtXzwZSzpGcQtJKP9IOKXlu8Dg4",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBjq28pH_wfqpOpBYkcdpXE4kYwcbs-5l3LraklhjAu1MCVB4CGxJRky80SildeqyvED4MvjISAQ554o1MPVfbihxQ3Xp6eho9Nlv9DYUuUH1W08rl2VY5S5Er_6Eye1-ecXdgeTnh7s0JHch9N1eujDX4X4iARmXwwMj2uY95J3F9tcLgR7PMgiIDweng6_JMuUPFjwEBHlQDEqMcPmDqK-gMutlUvnpujmvb3gc4",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCXYA_QxTNr7mqTOFknYNUkgGnXlp2R2zyhyCUswYsLo1w2pD4a6D6sKX_gDHRJ2sVj0lJ3-Kdk8loO1fXNO6dK_QLBAFmNAFWcPI2WGzhJVpng8PGpiiHAQhAlejN2fYyjU_wa6ALn_mxCeVpDIx2MsorwA_6CmvFia4p5IjWNPsA4lPEpZk6kSpptWhl9B5DhAsXUTnnS-lnGNkiyKhNrJfbgceqST7FxYW0kUEk",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD_3duYKaCvoALXJS5PdRMoaa9MCvQZ8vRESSO328mnnAKYMmWZ3cdIDGvnE3uZAhy2aR61bETNn0GeTWfQXLcTSl2BDOW3VsZUrsxQfEH8xq5qImgdOVaIHdQMUYIC9Lt2niYMfDb1cGt3765GMCdeydc2pmGo1vYNbB_T9XTAFQTAcn2-eicDLrmGbQTFNdh4ZEP362It2lI5-d1OsGifjEhcB6ygrvKJRHTHK7g"
    ];
    const roomCount = Object.keys(state.rooms).length;
    const summaryCount = doc.getElementById("room-summary-count");
    if (summaryCount) summaryCount.textContent = roomCount ? `${roomCount} habitaciones` : "No Registrado";
    doc.getElementById("room-summary-status")?.parentElement?.remove();
    if (roomCount === 0) {
      const emptyTitle = doc.querySelector("#roomDetailEmpty h3");
      const emptyDescription = doc.querySelector("#roomDetailEmpty p");
      if (emptyTitle) emptyTitle.textContent = "No hay habitaciones registradas";
      if (emptyDescription) emptyDescription.textContent = "Cuando se registren habitaciones, aparecerán aquí.";
    }
    const roomsGrid = doc.getElementById("roomsGrid");
    if (roomsGrid) {
      roomsGrid.replaceChildren();
      roomsGrid.removeAttribute("hidden");
      Object.entries(state.rooms)
        .sort(([roomA], [roomB]) => roomA.localeCompare(roomB, undefined, { numeric: true }))
        .forEach(([roomId, status], index) => {
          const card = doc.createElement("article");
          card.className = "room-card relative bg-surface-container-lowest rounded-2xl p-3.5 cursor-pointer shadow-[0_4px_16px_-2px_rgba(189,137,158,0.08)] hover:shadow-md transition-all duration-200 active:scale-[0.98] flex flex-col justify-between";
          card.dataset.roomId = roomId;
          card.dataset.status = status;
          const plan = state.servicePlans[roomId];
          if (plan && cleaningPlanOptions[plan]) card.dataset.serviceLevel = plan;
          const config = statusLabel(status);
          card.innerHTML = `
            <div class="room-card-image" aria-hidden="true">
              <img alt="" loading="lazy" decoding="async">
            </div>
            <div class="room-card-content">
              <div class="room-card-heading">
                <span class="room-card-title"></span>
                <span class="room-card-status rounded-full px-2 py-1 font-label-sm text-label-sm"></span>
              </div>
            </div>
          `;
          const roomImage = card.querySelector(".room-card-image");
          const roomImageElement = roomImage.querySelector("img");
          roomImageElement.src = roomImageSources[index % roomImageSources.length];
          roomImageElement.addEventListener("error", () => {
            roomImage.dataset.imageUnavailable = "true";
            roomImageElement.remove();
          }, { once: true });
          card.querySelector(".room-card-title").textContent = "Hab. " + roomId;
          const statusElement = card.querySelector(".room-card-status");
          statusElement.textContent = config?.[0] || "No Registrado";
          if (config) statusElement.classList.add(config[1], config[2]);
          else statusElement.setAttribute("aria-label", "No Registrado");
          roomsGrid.append(card);
        });
      if (Object.keys(state.rooms).length === 0) {
        const emptyState = doc.createElement("p");
        emptyState.className = "rooms-empty-state col-span-2 rounded-2xl bg-surface-container-lowest p-6 text-center text-text-muted";
        emptyState.textContent = "No hay habitaciones registradas.";
        roomsGrid.append(emptyState);
      }
    }
    const roomsLoading = doc.getElementById("roomsLoading");
    if (roomsLoading) roomsLoading.hidden = true;
    const cards = Array.from(doc.querySelectorAll(".room-card[data-room-id]"));
    const resultCount = doc.getElementById("room-result-count");
    if (resultCount) resultCount.textContent = cards.length ? `${cards.length} registradas` : "No Registrado";
    const roomDetailEmpty = doc.getElementById("roomDetailEmpty");
    const roomDetailContent = doc.getElementById("roomDetailContent");
    if (roomDetailPanel) {
      roomDetailPanel.dataset.state = "empty";
      roomDetailPanel.removeAttribute("aria-disabled");
    }
    if (roomDetailEmpty) roomDetailEmpty.hidden = false;
    if (roomDetailContent) roomDetailContent.hidden = true;
    doc.querySelector("#cleaning-plan-panel [role='group']")?.remove();
    doc.getElementById("save-cleaning-plan-btn")?.remove();
    doc.getElementById("cleaning-plan-feedback")?.remove();
    const roomSearchInput = doc.getElementById("roomSearchInput");
    const applyRoomFilters = () => {
      const activeRoomFilter = doc.documentElement.dataset.hotelRoomFilter || "all";
      const query = roomSearchInput?.value.trim().toLocaleLowerCase("es") || "";
      doc.querySelectorAll(".room-card[data-room-id]").forEach(card => {
        const statusMatch = activeRoomFilter === "all" ||
          (activeRoomFilter.startsWith("service-")
            ? card.dataset.serviceLevel === activeRoomFilter.replace("service-", "")
            : card.dataset.status === activeRoomFilter);
        const currentState = readState();
        const searchMatch = !query ||
          (card.dataset.roomId + " " + (currentState.guests[card.dataset.roomId] || "") + " " +
            (currentState.assignedCleanings[card.dataset.roomId]?.staffName || "") + " " +
            (currentState.cleaningDetails[card.dataset.roomId] || "")).toLocaleLowerCase("es").includes(query);
        const shouldHide = !statusMatch || !searchMatch;
        card.hidden = shouldHide;
        card.classList.toggle("hidden", shouldHide);
      });
      doc.querySelectorAll(".filter-chip").forEach(chip => {
        chip.classList.toggle("active", (chip.dataset.filter || "all") === activeRoomFilter);
      });
    };
    doc.querySelectorAll(".filter-chip").forEach(chip => {
      if (chip.dataset.roomFilterBound) return;
      chip.dataset.roomFilterBound = "true";
      chip.addEventListener("click", () => {
        doc.documentElement.dataset.hotelRoomFilter = chip.dataset.filter || "all";
        applyRoomFilters();
      });
    });
    if (roomSearchInput && !roomSearchInput.dataset.roomSearchBound) {
      roomSearchInput.dataset.roomSearchBound = "true";
      roomSearchInput.addEventListener("input", applyRoomFilters);
    }
    applyRoomFilters();
    const refreshRoomFilters = () => {
      if (roomSearchInput) roomSearchInput.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
    };

    const planForCard = card => {
      const currentState = readState();
      const saved = currentState.servicePlans[card.dataset.roomId];
      if (saved && cleaningPlanOptions[saved]) return saved;
      return null;
    };

    const updateCardPlanLabel = (card, planKey) => {
      const currentState = readState();
      const room = card.dataset.roomId;
      const plan = cleaningPlanOptions[planKey || currentState.servicePlans[room]];
      card.dataset.serviceLevel = plan ? (planKey || currentState.servicePlans[room]) : "";
    };

    const renderPlanAssignment = card => {
      if (!card) return;
      const currentState = readState();
      const room = card.dataset.roomId;
      const status = currentState.rooms[room] || "unknown";
      const assignment = currentState.assignedCleanings[room];
      const planKey = assignment?.cleaningType || currentState.servicePlans[room];
      const cleaningType = cleaningWorkTypes[planKey]?.label || "No Registrado";
      const cleaner = assignment?.staffName || "No Registrado";
      const cleanerRole = "No Registrado";
      const guest = currentState.guests[room] || "No Registrado";
      const guestSub = "No Registrado";
      const nextCleaning = "No Registrado";
      const nextCleaningTime = "No Registrado";
      const cleaningScope = "No Registrado";

      // DOM updates
      const roomNumberEl = doc.getElementById("sheetRoomNumber");
      if (roomNumberEl) roomNumberEl.textContent = "Habitación " + room;

      const roomTypeEl = doc.getElementById("sheetRoomType");
      if (roomTypeEl) {
        roomTypeEl.innerHTML = '<span class="material-symbols-outlined text-[15px] text-[#26b7a6]">meeting_room</span><span>No Registrado</span>';
      }

      const roomBadgeEl = doc.getElementById("sheetRoomBadge");
      if (roomBadgeEl) {
        const config = statusLabel(status);
        roomBadgeEl.className = `px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold flex items-center gap-1 shadow-sm ${config?.[1] || ""} ${config?.[2] || ""}`;
        roomBadgeEl.textContent = config?.[0] || "No Registrado";
      }

      const roomIconEl = doc.getElementById("sheetRoomIcon");
      if (roomIconEl) {
        const config = statusLabel(status);
        roomIconEl.className = `w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${config?.[1] || ""} ${config?.[2] || ""}`;
      }

      const guestLabel = doc.getElementById("sheetGuestName");
      if (guestLabel) guestLabel.textContent = guest;
      const guestSubEl = doc.getElementById("sheetGuestSub");
      if (guestSubEl) guestSubEl.textContent = guestSub;

      const cleanerLabel = doc.getElementById("sheetCleaner");
      if (cleanerLabel) cleanerLabel.textContent = cleaner;
      const cleanerRoleEl = doc.getElementById("sheetCleanerRole");
      if (cleanerRoleEl) cleanerRoleEl.textContent = cleanerRole;

      const cleaningTypeLabel = doc.getElementById("sheetCleaningType");
      if (cleaningTypeLabel) cleaningTypeLabel.textContent = cleaningType;
      const cleaningScopeEl = doc.getElementById("sheetCleaningScope");
      if (cleaningScopeEl) cleaningScopeEl.textContent = cleaningScope;
      const cleaningDetailsEl = doc.getElementById("sheetCleaningDetails");
      if (cleaningDetailsEl) {
        const cleaningDetails = currentState.cleaningDetails[room];
        const cleaningItems = typeof cleaningDetails === "string"
          ? cleaningDetails.split(/\r?\n|;/).map(item => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean)
          : [];
        cleaningDetailsEl.replaceChildren();
        (cleaningItems.length ? cleaningItems : ["No Registrado"]).forEach(item => {
          const listItem = doc.createElement("li");
          listItem.textContent = item;
          cleaningDetailsEl.appendChild(listItem);
        });
        cleaningDetailsEl.title = cleaningItems.join("\n") || "No Registrado";
      }

      const nextCleaningLabel = doc.getElementById("sheetNextCleaning");
      if (nextCleaningLabel) nextCleaningLabel.textContent = nextCleaning;
      const nextCleaningTimeEl = doc.getElementById("sheetNextCleaningTime");
      if (nextCleaningTimeEl) nextCleaningTimeEl.textContent = nextCleaningTime;

      const priorityEl = doc.getElementById("sheetPriority");
      if (priorityEl) {
        priorityEl.textContent = "No Registrado";
      }

      // Render contextual action buttons
      const actionContainer = doc.getElementById("sheetActionButtons");
      if (actionContainer) {
        actionContainer.innerHTML = "";
        if (status === "occupied") {
          // Check-Out button
          const btnOut = doc.createElement("button");
          btnOut.type = "button";
          btnOut.className = "w-full h-10 rounded-xl bg-[#fdf0f3] hover:bg-[#fae3e7] text-[#c83256] border border-[#f5cbd2] text-[12px] font-bold flex items-center justify-center gap-2 shadow-xs transition-all";
          btnOut.innerHTML = '<span class="material-symbols-outlined text-[17px]">logout</span><span>Registrar Salida / Check-Out</span>';
          btnOut.onclick = () => {
            const checkedOutGuest = readState().guests[room] || null;
            record(room, "pending", "Salida de huésped registrada", null, null, null, checkedOutGuest);
            syncRoomCard(card, "pending");
            card.dataset.status = "pending";
            delete card.dataset.guest;
            updateFilterChipsCounts();
            renderPlanAssignment(card);
            refreshRoomFilters();
            showToast(doc, `Check-out completado en Hab. ${room}. Pendiente de aseo.`);
          };
          actionContainer.append(btnOut);

        } else if (status === "cleaning") {
          const btnDone = doc.createElement("button");
          btnDone.type = "button";
          btnDone.className = "w-full h-11 rounded-xl bg-[#1c8274] hover:bg-[#16695e] text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all";
          btnDone.innerHTML = '<span class="material-symbols-outlined text-[18px]">task_alt</span><span>Finalizar Limpieza y Marcar Lista</span>';
          btnDone.onclick = () => {
            record(room, "free", "Limpieza completada con éxito", null, { name: cleaner }, planKey);
            syncRoomCard(card, "free");
            card.dataset.status = "free";
            delete card.dataset.guest;
            updateFilterChipsCounts();
            renderPlanAssignment(card);
            refreshRoomFilters();
            showToast(doc, `¡Habitación ${room} limpia, desinfectada y disponible!`);
          };
          actionContainer.append(btnDone);

        } else if (status === "free") {
          const btnCheckIn = doc.createElement("button");
          btnCheckIn.type = "button";
          btnCheckIn.className = "room-check-in-button";
          btnCheckIn.setAttribute("aria-label", "Registrar Check-In / Asignar Huésped");
          btnCheckIn.title = "Registrar Check-In / Asignar Huésped";
          btnCheckIn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">person_add</span><span>Registrar Check-In</span>';
          btnCheckIn.onclick = () => {
            requestText(doc, "Registrar check-in", "Nombre del nuevo huésped", newGuest => {
              record(room, "occupied", "Check-in registrado", newGuest, null, null, newGuest);
              syncRoomCard(card, "occupied");
              card.dataset.status = "occupied";
              card.dataset.guest = newGuest;
              updateFilterChipsCounts();
              renderPlanAssignment(card);
              refreshRoomFilters();
              showToast(doc, `Check-in registrado para ${newGuest} en Hab. ${room}.`);
            });
          };
          actionContainer.append(btnCheckIn);
        }
      }

      const planKeyForCard = planForCard(card);
      updateCardPlanLabel(card, planKeyForCard);
    };

    cards.forEach(card => {
      const status = state.rooms[card.dataset.roomId];
      if (status) syncRoomCard(card, status);
      const guest = state.guests[card.dataset.roomId];
      if (guest) card.dataset.guest = guest;
      updateCardPlanLabel(card, planForCard(card));
    });

    const serviceFilterLabels = {
      standard: "Mensual",
      premium: "Semanal",
      plus: "Premium"
    };
    Object.entries(serviceFilterLabels).forEach(([plan, labelText]) => {
      const chip = doc.querySelector(`.filter-chip[data-filter="service-${plan}"]`);
      if (!chip) return;
      let label = chip.querySelector("[data-filter-label]");
      if (!label) {
        label = doc.createElement("span");
        label.dataset.filterLabel = "";
        chip.append(label);
      }
      label.textContent = labelText;
      let count = chip.querySelector("[data-filter-count]");
      if (!count) {
        count = Array.from(chip.children).find(child =>
          child !== label && !child.classList.contains("w-2")
        );
        if (!count) {
          count = doc.createElement("span");
          chip.append(count);
        }
        count.dataset.filterCount = "";
      }
    });

    // Actualizar contadores dinámicos de los chips de filtro
    const updateFilterChipsCounts = () => {
      const currentState = readState();
      const currentStats = statsForRooms(currentState.rooms);
      const totalRooms = Object.values(currentStats).reduce((a, b) => a + b, 0);
      const allCount = doc.querySelector('.filter-chip[data-filter="all"] span:last-child');
      if (allCount) allCount.textContent = totalRooms ? String(totalRooms) : "No Registrado";
      const freeCount = doc.querySelector('.filter-chip[data-filter="free"] span:last-child');
      if (freeCount) freeCount.textContent = totalRooms ? `(${currentStats.free || 0})` : "(No Registrado)";
      const occCount = doc.querySelector('.filter-chip[data-filter="occupied"] span:last-child');
      if (occCount) occCount.textContent = totalRooms ? `(${currentStats.occupied || 0})` : "(No Registrado)";
      const pendCount = doc.querySelector('.filter-chip[data-filter="pending"] span:last-child');
      if (pendCount) pendCount.textContent = totalRooms ? `(${currentStats.pending || 0})` : "(No Registrado)";
      const cleanCount = doc.querySelector('.filter-chip[data-filter="cleaning"] span:last-child');
      if (cleanCount) cleanCount.textContent = totalRooms ? `(${currentStats.cleaning || 0})` : "(No Registrado)";
      ["standard", "premium", "plus"].forEach(plan => {
        const count = Object.values(currentState.servicePlans).filter(value => value === plan).length;
        const node = doc.querySelector(`.filter-chip[data-filter="service-${plan}"] [data-filter-count]`);
        if (node) node.textContent = totalRooms ? `(${count})` : "(No Registrado)";
      });
    };
    updateFilterChipsCounts();

    doc.querySelectorAll(".room-card[data-room-id]").forEach(card => {
      card.addEventListener("click", () => setTimeout(() => {
        doc.querySelectorAll(".room-card[data-room-id].ring-2").forEach(selectedCard => {
          selectedCard.classList.remove("ring-2", "ring-coral-primary", "shadow-[0_8px_24px_-4px_rgba(240,93,114,0.22)]");
          selectedCard.classList.add("shadow-[0_4px_16px_-2px_rgba(189,137,158,0.08)]");
        });
        card.classList.remove("shadow-[0_4px_16px_-2px_rgba(189,137,158,0.08)]");
        card.classList.add("ring-2", "ring-coral-primary", "shadow-[0_8px_24px_-4px_rgba(240,93,114,0.22)]");
        if (roomDetailPanel) {
          roomDetailPanel.dataset.state = "selected";
          roomDetailPanel.dataset.roomId = card.dataset.roomId;
          roomDetailPanel.removeAttribute("aria-disabled");
        }
        if (roomDetailEmpty) roomDetailEmpty.hidden = true;
        if (roomDetailContent) roomDetailContent.hidden = false;
        renderPlanAssignment(card);
      }, 0));
    });
    const selectedRoom = cards.find(card => card.dataset.roomId === previouslySelectedRoom) ||
      doc.querySelector(".room-card[data-room-id].ring-2");
    if (selectedRoom && roomDetailPanel) {
      roomDetailPanel.dataset.state = "selected";
      roomDetailPanel.dataset.roomId = selectedRoom.dataset.roomId;
      selectedRoom.classList.remove("shadow-[0_4px_16px_-2px_rgba(189,137,158,0.08)]");
      selectedRoom.classList.add("ring-2", "ring-coral-primary", "shadow-[0_8px_24px_-4px_rgba(240,93,114,0.22)]");
      roomDetailPanel.removeAttribute("aria-disabled");
      if (roomDetailEmpty) roomDetailEmpty.hidden = true;
      if (roomDetailContent) roomDetailContent.hidden = false;
      const room = selectedRoom.dataset.roomId;
      const title = doc.getElementById("sheetRoomNumber");
      if (title) title.textContent = "Habitación " + room;
      renderPlanAssignment(selectedRoom);
    } else if (roomDetailPanel) {
      delete roomDetailPanel.dataset.roomId;
    }
    if (!selectedRoom) renderPlanAssignment(null);

    doc.querySelectorAll(".room-card[data-room-id]").forEach(card => {
      const assignButton = Array.from(card.querySelectorAll("button")).find(button => /Asignar Huésped/i.test(button.textContent));
      if (!assignButton) return;
      assignButton.addEventListener("click", event => {
        event.stopPropagation();
        requestText(doc, "Registrar check-in", "Nombre del huésped", guest => {
          record(card.dataset.roomId, "occupied", "Check-in registrado", guest, null, null, guest);
          syncRoomCard(card, "occupied");
          card.dataset.guest = guest;
          renderPlanAssignment(card);
          refreshRoomFilters();
          showToast(doc, "Check-in registrado para " + guest + ".");
        });
      });
    });

    doc.querySelectorAll("[data-path]").forEach(link => {
      if (link.dataset.hotelPathBound) return;
      const screen = link.dataset.path;
      if (screens[screen]) {
        link.dataset.hotelPathBound = "true";
        link.addEventListener("click", event => {
          event.preventDefault();
          route(screen);
        });
      }
    });
  }

  function enhanceCleaning(doc) {
    const list = doc.getElementById("rooms-list");
    if (!list) return;
    const previousWorkspace = doc.getElementById("cleaning-workspace");
    const previousSelectedRoom = previousWorkspace?.dataset.selectedRoom || null;
    const filterContainer = doc.getElementById("filter-container");
    const filterBar = filterContainer?.parentElement;
    if (previousWorkspace?.contains(list)) {
      const workspaceParent = previousWorkspace.parentElement;
      if (workspaceParent) {
        if (filterBar && previousWorkspace.contains(filterBar)) {
          workspaceParent.insertBefore(filterBar, previousWorkspace.nextSibling);
        }
        workspaceParent.insertBefore(list, filterBar?.nextSibling || previousWorkspace.nextSibling);
      }
    }
    previousWorkspace?.remove();
    const summary = filterBar?.previousElementSibling;
    if (summary) summary.style.display = "none";
    doc.getElementById("open-quick-modal-btn")?.remove();
    doc.getElementById("quick-action-sheet")?.remove();
    doc.getElementById("trigger-quick-card-btn")?.closest(".px-margin")?.remove();

    const title = doc.querySelector(".font-headline-lg-mobile");
    if (title) {
      title.textContent = "Limpiezas";
      const subtitle = title.nextElementSibling;
      if (subtitle) subtitle.textContent = "Selecciona una habitación y configura su servicio.";
    }

    const state = readState();
    const staff = state.staff;
    const emptyFallback = doc.getElementById("cleaning-empty-fallback");
    if (emptyFallback) {
      if (Object.keys(state.rooms).length) emptyFallback.remove();
      else {
        emptyFallback.textContent = "No hay habitaciones registradas.";
        emptyFallback.hidden = true;
      }
    }
    const assignmentFor = room => readState().assignedCleanings[room] || null;
    const saveAssignment = async (room, assignment, roomUpdates = {}) => {
      const current = readState();
      const previous = current.assignedCleanings[room];
      const previousStaffId = previous?.staffId || null;
      const nextStaffId = assignment?.staffId || null;
      if (previousStaffId !== nextStaffId) {
        const time = new Date().toISOString();
        const openAssignment = current.roomAssignments.find(item =>
          String(item.roomId) === String(room) && item.staffId === previousStaffId && !item.unassignedAt
        );
        if (openAssignment) openAssignment.unassignedAt = time;
        if (nextStaffId) {
          current.roomAssignments.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            roomId: String(room),
            staffId: nextStaffId,
            cleaningType: assignment.cleaningType || null,
            assignedAt: time,
            unassignedAt: null
          });
        }
      }
      if (assignment) current.assignedCleanings[room] = assignment;
      else delete current.assignedCleanings[room];
      if (roomUpdates.cleaningDetails !== undefined) {
        current.cleaningDetails[room] = roomUpdates.cleaningDetails;
      }
      if (roomUpdates.servicePlan !== undefined) {
        current.servicePlans[room] = roomUpdates.servicePlan;
      }
      const savedLocally = writeState(current);
      let syncedToSupabase = false;
      if (window.HotelDB) {
        const person = assignment && current.staff.find(item => item.id === assignment.staffId);
        syncedToSupabase = await window.HotelDB.updateRoom(room, {
          status: current.rooms[room],
          assignedCleaner: person || null,
          assignedCleaningType: assignment?.cleaningType || null,
          ...roomUpdates
        });
      }
      return { savedLocally, syncedToSupabase };
    };
    const syncCleaningCard = (card, room, status) => {
      const categories = { pending: "urgente", cleaning: "en-curso", free: "completada", occupied: "programada" };
      if (!categories[status]) return;
      card.dataset.category = categories[status];
      const buttons = Array.from(card.querySelectorAll("button"));
      if (buttons.length === 0) return;
      const button = status === "pending"
        ? buttons.find(item => /Iniciar Limpieza|Adelantar/i.test(item.textContent)) || buttons[0]
        : buttons.find(item => /Marcar como Limpia/i.test(item.textContent)) || buttons[buttons.length - 1];
      buttons.filter(item => item !== button).forEach(item => item.remove());
      if (status === "pending") {
        button.textContent = "Iniciar Limpieza";
        button.onclick = () => window.startCleaning(card.id, room, card.innerText.trim().slice(0, 60));
      } else if (status === "cleaning") {
        button.textContent = "Marcar como Limpia";
        button.onclick = () => window.markCleaned(card.id, room);
      } else {
        button.remove();
      }
      const badge = card.querySelector(".cleaning-room-status");
      if (badge) badge.textContent = statusDetails[status]?.label || "No Registrado";
      if (status === "cleaning") {
        const assigned = assignmentFor(room);
        if (assigned?.staffId) {
          const nameLabel = Array.from(card.querySelectorAll("span")).find(item => item.textContent.trim() === "Asignado a ti");
          if (nameLabel) nameLabel.textContent = "Asignado a " + assigned.staffName;
          const initials = Array.from(card.querySelectorAll("div")).find(item => item.textContent.trim() === "Tú");
          if (initials) initials.textContent = assigned.staffName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
        }
      }
    };

    const statusDetails = {
      pending: { label: "Por limpiar", category: "urgente", icon: "priority_high" },
      cleaning: { label: "En curso", category: "en-curso", icon: "hourglass_top" },
      occupied: { label: "Ocupada", category: "programada", icon: "event" },
      free: { label: "Libre", category: "completada", icon: "task_alt" },
      finished: { label: "Finalizado", category: "completada", icon: "task_alt" },
      unknown: { label: "No Registrado", category: "sin-datos", icon: "help" }
    };
    list.replaceChildren();
    const savedRooms = readState().rooms;
    Object.entries(savedRooms)
      .sort(([roomA], [roomB]) => roomA.localeCompare(roomB, undefined, { numeric: true }))
      .forEach(([room, status]) => {
        const card = doc.createElement("article");
        card.className = "room-item bg-surface-card rounded-2xl p-space-md shadow-sm transition-all duration-300 relative overflow-hidden";
        card.id = "card-" + room;
        const statusInfo = statusDetails[status];
        card.dataset.category = statusInfo?.category || "sin-datos";
        card.innerHTML = `
          <div class="flex items-start justify-between mb-space-sm pt-1">
            <div class="flex items-center gap-space-sm">
              <div class="w-12 h-12 rounded-2xl bg-surface-container flex flex-col items-center justify-center">
                <span class="font-headline-sm text-headline-sm"></span>
              </div>
              <div>
                <span class="font-label-lg text-label-lg text-text-main block"></span>
                <span class="font-body-sm text-body-sm text-text-muted"></span>
              </div>
            </div>
            <span class="cleaning-room-status rounded-full px-3 py-1 bg-surface-container text-text-muted font-label-md text-label-md"></span>
          </div>
          <p class="cleaning-assignee text-sm text-text-muted"></p>
          <button type="button" class="cleaning-card-action w-full h-12 rounded-full bg-coral-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm"></button>
        `;
        card.querySelector(".font-headline-sm").textContent = room;
        card.querySelector(".font-label-lg").textContent = "Habitación " + room;
        card.querySelector(".font-body-sm").textContent = "No Registrado";
        card.querySelector(".cleaning-room-status").textContent = statusInfo?.label || "No Registrado";
        list.append(card);
      });
    const roomCards = Array.from(doc.querySelectorAll(".room-item[id^='card-']"));
    const roomDetails = new Map();
    roomCards.forEach(card => {
      const room = card.id.replace("card-", "");
      const savedStatus = readState().rooms[room];
      if (savedStatus) syncCleaningCard(card, room, savedStatus);
      roomDetails.set(room, {
        card,
        name: "Habitación " + room,
        description: "No Registrado"
      });
    });

    const originalStart = window.startCleaning;
    const originalFinish = window.markCleaned;
    if (typeof originalStart === "function" && !originalStart._integrated) {
      const wrapped = function (cardId, room, name) {
        const assigned = assignmentFor(room);
        if (!assigned?.staffId || !staff.some(person => person.id === assigned.staffId)) {
          showToast(doc, staff.length ? "Asigna un aseador antes de iniciar la limpieza." : "Registra personal antes de asignar una limpieza.");
          return;
        }
        const result = originalStart.apply(this, arguments);
        const person = staff.find(item => item.id === assigned.staffId);
        record(room, "cleaning", "Limpieza iniciada", undefined, person, assigned.cleaningType);
        const card = doc.getElementById(cardId);
        if (card) syncCleaningCard(card, room, "cleaning");
        return result;
      };
      wrapped._integrated = true;
      window.startCleaning = wrapped;
    }
    if (typeof originalFinish === "function" && !originalFinish._integrated) {
      const wrapped = async function (cardId, room) {
        const assigned = assignmentFor(room);
        const person = assigned && staff.find(item => item.id === assigned.staffId);
        const result = originalFinish.apply(this, arguments);
        record(room, "free", "Limpieza completada", null, person, assigned?.cleaningType);
        if (person) recordCleaningWork(room, person, assigned?.cleaningType);
        await saveAssignment(room, null);
        const card = doc.getElementById(cardId);
        if (card) syncCleaningCard(card, room, "free");
        return result;
      };
      wrapped._integrated = true;
      window.markCleaned = wrapped;
    }

    doc.getElementById("cleaning-workspace")?.remove();
    const workspace = doc.createElement("section");
    workspace.id = "cleaning-workspace";
    const selection = doc.createElement("div");
    selection.className = "cleaning-selection";
    const selectionHeading = doc.createElement("h2");
    selectionHeading.className = "cleaning-section-heading";
    selectionHeading.innerHTML = '<span class="cleaning-step-number">1</span>Selecciona una habitación';
    const options = doc.createElement("div");
    options.id = "cleaning-room-options";
    const panel = doc.createElement("section");
    panel.className = "cleaning-config-panel";
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-label", "Configuración de limpieza");
    const listParent = list.parentElement;
    listParent.insertBefore(workspace, list);
    selection.append(selectionHeading);
    if (filterBar) selection.append(filterBar);
    selection.append(options, list);
    workspace.append(selection, panel);
    list.hidden = true;

    const typeOptions = [
      ["standard", "Mensual", "Estándar", "calendar_month"],
      ["premium", "Semanal", "Premium", "event_repeat"],
      ["plus", "Premium Plus", "Atención especial", "workspace_premium"]
    ];
    const roomStatus = room => readState().rooms[room] || "unknown";
    const selectedCategory = room => statusDetails[roomStatus(room)]?.category || "sin-datos";
    const selectedStatus = room => statusDetails[roomStatus(room)] || statusDetails.unknown;
    const cleaningPlanLabels = {
      standard: "Limpieza mensual",
      premium: "Limpieza semanal programada",
      plus: "Premium Plus"
    };
    const cleaningPlanIcons = {
      standard: "calendar_month",
      premium: "event_repeat",
      plus: "workspace_premium"
    };
    filterContainer?.querySelectorAll("[data-cleaning-plan-filter], .cleaning-plan-filter-label").forEach(item => item.remove());
    const tileByRoom = new Map();
    const availableCleaningFilters = new Set(["all", "urgente", "en-curso", "programada"]);
    let activeFilter = availableCleaningFilters.has(doc.documentElement.dataset.hotelCleaningFilter)
      ? doc.documentElement.dataset.hotelCleaningFilter
      : "all";
    let selectedRoom = null;

    const refreshRoomTiles = () => {
      activeFilter = availableCleaningFilters.has(doc.documentElement.dataset.hotelCleaningFilter)
        ? doc.documentElement.dataset.hotelCleaningFilter
        : "all";
      const counts = { all: tileByRoom.size, urgente: 0, "en-curso": 0, programada: 0 };
      const currentState = readState();
      tileByRoom.forEach((tile, room) => {
        const status = selectedStatus(room);
        tile.dataset.status = roomStatus(room);
        tile.dataset.category = selectedCategory(room);
        if (Object.prototype.hasOwnProperty.call(counts, tile.dataset.category)) counts[tile.dataset.category]++;
        const planKey = currentState.servicePlans[room] ||
          currentState.assignedCleanings[room]?.cleaningType;
        const planLabel = cleaningPlanLabels[planKey] || "No Registrado";
        const statusLabel = tile.querySelector(".cleaning-room-status");
        const statusIcon = statusLabel?.querySelector(".material-symbols-outlined");
        if (statusLabel) {
          statusLabel.lastChild.textContent = planLabel;
          statusLabel.title = "Estado: " + status.label;
        }
        if (statusIcon) statusIcon.textContent = cleaningPlanIcons[planKey] || "help";
        tile.hidden = activeFilter !== "all" && tile.dataset.category !== activeFilter;
      });
      filterContainer?.querySelectorAll(".filter-tab").forEach(tab => {
        const active = (tab.dataset.filter || "all") === activeFilter;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", String(active));
        const count = tab.querySelector("span:last-child");
        if (!count) return;
        count.textContent = tileByRoom.size ? String(counts[tab.dataset.filter] ?? 0) : "No Registrado";
      });
    };

    roomDetails.forEach((details, room) => {
      const tile = doc.createElement("button");
      tile.type = "button";
      tile.className = "cleaning-room-option";
      tile.dataset.room = room;
      const number = doc.createElement("span");
      number.className = "cleaning-room-number";
      number.textContent = room;
      const copy = doc.createElement("span");
      copy.className = "cleaning-room-copy";
      const name = doc.createElement("span");
      name.className = "cleaning-room-name";
      name.textContent = details.name;
      const status = doc.createElement("span");
      status.className = "cleaning-room-status";
      const icon = doc.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.setAttribute("aria-hidden", "true");
      status.append(icon, doc.createTextNode(""));
      copy.append(name, status);
      tile.append(number, copy);
      tile.addEventListener("click", () => {
        selectedRoom = room;
        workspace.dataset.selectedRoom = room;
        renderConfiguration(room);
        if (doc.defaultView.matchMedia("(max-width: 959px)").matches) {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
      tileByRoom.set(room, tile);
      options.appendChild(tile);
    });

    const emptyState = () => {
      panel.replaceChildren();
      const heading = doc.createElement("h2");
      heading.className = "cleaning-section-heading";
      heading.innerHTML = '<span class="cleaning-step-number">2</span>Configura la limpieza';
      const prompt = doc.createElement("div");
      prompt.className = "cleaning-config-empty";
      prompt.innerHTML = roomDetails.size
        ? '<span class="cleaning-config-empty-icon material-symbols-outlined" aria-hidden="true">touch_app</span><strong>Elige una habitación</strong><p>Después podrás elegir el tipo de servicio y agregar detalles opcionales. El responsable se asigna por separado.</p>'
        : '<span class="cleaning-config-empty-icon material-symbols-outlined" aria-hidden="true">info</span><strong>No hay habitaciones registradas</strong><p>Cuando se registren habitaciones, aparecerán aquí.</p>';
      panel.append(heading, prompt);
    };

    function renderConfiguration(room) {
      const details = roomDetails.get(room);
      if (!details) return;
      tileByRoom.forEach((tile, id) => {
        const selected = id === room;
        tile.setAttribute("aria-pressed", String(selected));
      });
      const currentState = readState();
      const previous = currentState.assignedCleanings[room] || null;
      const validTypes = typeOptions.map(([type]) => type);
      const storedType = currentState.servicePlans[room] ||
        (validTypes.includes(previous?.cleaningType) ? previous.cleaningType : "");
      let selectedType = validTypes.includes(storedType) ? storedType : "";
      const initialDetails = currentState.cleaningDetails[room] || "";
      let selectedStaffId = previous?.staffId && staff.some(person => person.id === previous.staffId)
        ? previous.staffId : "";
      const roomState = currentState.rooms[room] || "unknown";
      const status = statusDetails[roomState] || { label: "No Registrado" };

      panel.replaceChildren();
      const heading = doc.createElement("h2");
      heading.className = "cleaning-section-heading";
      heading.innerHTML = '<span class="cleaning-step-number">2</span>Configura la limpieza';
      const detailHeader = doc.createElement("div");
      detailHeader.className = "cleaning-detail-header";
      const roomInfo = doc.createElement("div");
      roomInfo.className = "cleaning-detail-room";
      const roomIcon = doc.createElement("span");
      roomIcon.className = "cleaning-detail-icon material-symbols-outlined";
      roomIcon.setAttribute("aria-hidden", "true");
      roomIcon.textContent = "bed";
      const roomCopy = doc.createElement("div");
      const roomHeading = doc.createElement("h3");
      roomHeading.textContent = "Habitación " + room;
      const roomDescription = doc.createElement("p");
      roomDescription.textContent = details.name + " · " + details.description;
      roomCopy.append(roomHeading, roomDescription);
      roomInfo.append(roomIcon, roomCopy);
      const statusPill = doc.createElement("span");
      statusPill.className = "cleaning-status-pill";
      statusPill.textContent = status.label;
      detailHeader.append(roomInfo, statusPill);

      const typeLabel = doc.createElement("div");
      typeLabel.className = "cleaning-field-label";
      typeLabel.textContent = "Tipo de servicio";
      const typeGrid = doc.createElement("div");
      typeGrid.className = "cleaning-type-options";
      const detailsLabel = doc.createElement("label");
      detailsLabel.className = "cleaning-field-label";
      detailsLabel.textContent = "Detalles adicionales (opcional)";
      detailsLabel.htmlFor = "cleaning-details-input";
      const detailsInput = doc.createElement("textarea");
      detailsInput.id = "cleaning-details-input";
      detailsInput.className = "cleaning-details-input";
      detailsInput.maxLength = 500;
      detailsInput.setAttribute("aria-label", "Detalles adicionales de limpieza para la habitación " + room);
      detailsInput.placeholder = "Ej.: cambiar sábanas, reponer amenities o atender una solicitud especial";
      detailsInput.value = initialDetails;

      const assignmentSection = doc.createElement("section");
      assignmentSection.className = "cleaning-assignment-section";
      const assignmentHeading = doc.createElement("h3");
      assignmentHeading.className = "cleaning-section-heading";
      assignmentHeading.innerHTML = '<span class="cleaning-step-number">3</span>Responsable';
      const staffLabel = doc.createElement("label");
      staffLabel.className = "cleaning-field-label";
      staffLabel.textContent = "Persona asignada";
      staffLabel.htmlFor = "cleaning-staff-select";
      const staffSelect = doc.createElement("select");
      staffSelect.id = "cleaning-staff-select";
      staffSelect.className = "cleaning-staff-select";
      staffSelect.setAttribute("aria-label", "Responsable de la habitación " + room);
      const placeholder = doc.createElement("option");
      placeholder.value = "";
      placeholder.textContent = staff.length ? "Selecciona quién realizará la limpieza" : "No hay personal registrado";
      staffSelect.appendChild(placeholder);
      staff.forEach(person => {
        const option = doc.createElement("option");
        option.value = person.id;
        option.textContent = person.name;
        staffSelect.appendChild(option);
      });
      staffSelect.value = selectedStaffId;
      const saveStaffButton = doc.createElement("button");
      saveStaffButton.type = "button";
      saveStaffButton.className = "cleaning-save-button";
      saveStaffButton.textContent = "Guardar responsable";

      const assignmentActions = doc.createElement("div");
      assignmentActions.className = "cleaning-config-actions";
      assignmentActions.append(saveStaffButton);
      const assignmentHelp = doc.createElement("p");
      assignmentHelp.className = "cleaning-staff-help";
      assignmentSection.append(assignmentHeading, staffLabel, staffSelect, assignmentHelp, assignmentActions);

      const personSelected = () => staff.find(person => person.id === staffSelect.value) || null;
      const updateActions = () => {
        const configDirty = selectedType !== storedType || detailsInput.value !== initialDetails;
        const staffDirty = staffSelect.value !== selectedStaffId;
        saveStaffButton.disabled = !configDirty && !staffDirty;
        const hasSavedPlan = Boolean(currentState.servicePlans[room] &&
          cleaningPlanOptions[currentState.servicePlans[room]]);
        if (!staff.length) {
          if (!assignmentHelp.querySelector("button")) {
            assignmentHelp.replaceChildren(doc.createTextNode("Primero "));
            const staffLink = doc.createElement("button");
            staffLink.type = "button";
            staffLink.textContent = "registra al personal";
            staffLink.addEventListener("click", () => route("personal"));
            assignmentHelp.append(staffLink, doc.createTextNode(" para asignarlo a la limpieza."));
          }
        } else if (configDirty && staffDirty) {
          assignmentHelp.textContent = "Los cambios de limpieza y el responsable se guardarán juntos.";
        } else if (configDirty) {
          assignmentHelp.textContent = "Los cambios de limpieza se guardarán junto con el responsable.";
        } else if (staffDirty) {
          assignmentHelp.textContent = "Guarda para actualizar el responsable de la limpieza.";
        } else if (!hasSavedPlan) {
          assignmentHelp.textContent = "Selecciona y guarda un tipo de limpieza.";
        } else {
          assignmentHelp.textContent = "Tipo de limpieza y responsable guardados.";
        }
      };
      const updateTypeOptions = () => {
        typeGrid.querySelectorAll(".cleaning-type-option").forEach(option => {
          option.setAttribute("aria-pressed", String(option.dataset.type === selectedType));
        });
        updateActions();
      };

      typeOptions.forEach(([type, label, description, iconName]) => {
        const option = doc.createElement("button");
        option.type = "button";
        option.className = "cleaning-type-option";
        option.dataset.type = type;
        option.setAttribute("aria-pressed", String(type === selectedType));
        const icon = doc.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = iconName;
        const copy = doc.createElement("span");
        copy.className = "cleaning-type-copy";
        const title = doc.createElement("strong");
        title.textContent = label;
        const subtitle = doc.createElement("small");
        subtitle.textContent = description;
        copy.append(title, subtitle);
        option.append(icon, copy);
        option.addEventListener("click", () => {
          selectedType = type;
          updateTypeOptions();
        });
        typeGrid.appendChild(option);
      });
      detailsInput.addEventListener("input", updateActions);
      staffSelect.addEventListener("change", updateActions);
      saveStaffButton.addEventListener("click", async () => {
        const person = personSelected();
        const current = readState();
        const saved = current.assignedCleanings[room] || {};
        const previousPlan = current.servicePlans[room];
        const planChanged = Boolean(selectedType && previousPlan !== selectedType);
        const planEvent = planChanged ? recordCleaningPlan(room, selectedType) : null;
        const assignment = {
          ...readState().assignedCleanings[room],
          staffId: person?.id || null,
          staffName: person?.name || "",
          cleaningType: selectedType || current.servicePlans[room] || null
        };
        saveStaffButton.disabled = true;
        saveStaffButton.textContent = "Guardando...";
        let savedLocally = false;
        try {
          const result = await saveAssignment(room, assignment, {
            cleaningDetails: detailsInput.value.trim(),
            servicePlan: selectedType || null
          });
          savedLocally = result.savedLocally;
          refreshRoomTiles();
          if (!result.syncedToSupabase) {
            renderConfiguration(room);
            showToast(doc, savedLocally
              ? "La limpieza y el responsable se guardaron en este dispositivo. Supabase no está disponible."
              : "No se pudieron guardar los cambios en este dispositivo.");
            return;
          }
          if (planEvent) await window.HotelDB.addEvent(planEvent);
        } catch (error) {
          console.error("[HotelDB] No se pudieron sincronizar los cambios de limpieza.", error);
          refreshRoomTiles();
          renderConfiguration(room);
          showToast(doc, "Los cambios se guardaron localmente, pero no se sincronizaron con Supabase.");
          return;
        }
        if (person && saved.staffId !== person.id) {
          record(room, roomStatus(room), "Habitación asignada: " + cleaningWorkTypes[assignment.cleaningType].label,
            undefined, person, assignment.cleaningType);
        }
        renderConfiguration(room);
        if (!savedLocally) {
          showToast(doc, "No se pudieron guardar los cambios en este dispositivo.");
        } else if (!window.HotelDB) {
          showToast(doc, "La limpieza y el responsable se guardaron en este dispositivo. Supabase no está disponible.");
        } else {
          showToast(doc, "Limpieza y responsable guardados para la habitación " + room + ".");
        }
      });
      updateActions();
      panel.append(heading, detailHeader, typeLabel, typeGrid, detailsLabel, detailsInput, assignmentSection);
    }

    emptyState();
    refreshRoomTiles();
    if (previousSelectedRoom && tileByRoom.has(previousSelectedRoom)) {
      selectedRoom = previousSelectedRoom;
      workspace.dataset.selectedRoom = previousSelectedRoom;
      renderConfiguration(previousSelectedRoom);
    }
    doc.defaultView.__refreshCleaningRoomTiles = refreshRoomTiles;
    filterContainer?.querySelectorAll(".filter-tab").forEach(tab => {
      if (tab.dataset.cleaningFilterBound) return;
      tab.dataset.cleaningFilterBound = "true";
      tab.addEventListener("click", () => {
        activeFilter = tab.dataset.filter || "all";
        doc.documentElement.dataset.hotelCleaningFilter = activeFilter;
        doc.defaultView.__refreshCleaningRoomTiles?.();
      });
    });
    doc.querySelectorAll("[data-path]").forEach(link => {
      if (link.dataset.hotelPathBound) return;
      const screen = link.dataset.path;
      if (screens[screen]) {
        link.dataset.hotelPathBound = "true";
        link.addEventListener("click", event => {
          event.preventDefault();
          route(screen);
        });
      }
    });
  }

  function enhanceDashboard(doc) {
    const savedState = readState();
    renderDashboardPerformance(doc, savedState.stats || initialStats, savedState);
    renderDashboardActivity(doc, savedState.events);
    const dateLabel = doc.getElementById("dashboard-date");
    if (dateLabel) {
      const formattedDate = new Intl.DateTimeFormat("es", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(new Date());
      dateLabel.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }
    doc.getElementById("dashboardRoomsBtn")?.addEventListener("click", () => route("habitaciones"));
    doc.querySelectorAll("article").forEach(article => {
      const room = article.querySelector(".font-headline-sm, .font-headline-md")?.textContent.trim();
      if (!room || !savedState.rooms[room]) return;
      const status = savedState.rooms[room];
      const badge = Array.from(article.querySelectorAll("span")).find(item =>
        ["Libre", "Ocupada", "Por Limpiar", "En Limpieza"].includes(item.textContent.trim())
      );
      const config = statusLabel(status);
      if (badge && config) {
        badge.textContent = config[0];
        badge.classList.remove("bg-status-free-bg", "text-status-free-fg", "bg-status-occupied-bg", "text-status-occupied-fg", "bg-status-pending-bg", "text-status-pending-fg", "bg-status-cleaning-bg", "text-status-cleaning-fg");
        badge.classList.add(config[1], config[2]);
      }
      const guest = savedState.guests[room];
      if (guest) {
        const details = article.querySelector("p");
        if (details) details.textContent = "Huésped: " + guest;
      }
    });

    doc.querySelectorAll("article").forEach(article => {
      const roomNumber = article.querySelector(".font-headline-sm, .font-headline-md")?.textContent.trim();
      const cleaningButton = Array.from(article.querySelectorAll("button")).find(button => /Iniciar Limpieza/i.test(button.textContent));
      if (cleaningButton && roomNumber) {
        cleaningButton.addEventListener("click", () => {
          const current = readState();
          const assignment = current.assignedCleanings[roomNumber];
          const cleaner = current.staff.find(person => person.id === assignment?.staffId);
          if (!cleaner) {
            showToast(doc, "Asigna un aseador desde la sección Limpiezas antes de iniciar.");
            route("limpiezas");
            return;
          }
          record(roomNumber, "cleaning", "Limpieza iniciada", undefined, cleaner, assignment.cleaningType);
          const currentState = readState();
          renderDashboardPerformance(doc, currentState.stats, currentState);
          renderDashboardActivity(doc, currentState.events);
          const badge = Array.from(article.querySelectorAll("span")).find(item =>
            ["Por Limpiar", "En Limpieza", "Libre", "Ocupada"].includes(item.textContent.trim())
          );
          const config = statusLabel("cleaning");
          if (badge) {
            badge.textContent = config[0];
            badge.classList.remove("bg-status-free-bg", "text-status-free-fg", "bg-status-occupied-bg", "text-status-occupied-fg", "bg-status-pending-bg", "text-status-pending-fg");
            badge.classList.add(config[1], config[2]);
          }
          cleaningButton.textContent = "Limpieza en curso";
          cleaningButton.disabled = true;
          showToast(doc, "Limpieza iniciada en la habitación " + roomNumber + ".");
        });
      }

      const assignButton = Array.from(article.querySelectorAll("button")).find(button => /Asignar Huésped/i.test(button.textContent));
      if (!assignButton) return;
      if (savedState.rooms[roomNumber] === "occupied") {
        assignButton.textContent = "Huésped asignado";
        assignButton.disabled = true;
      }
      assignButton.addEventListener("click", event => {
        event.stopPropagation();
        const number = roomNumber;
        if (!number) return;
        requestText(doc, "Registrar check-in", "Nombre del huésped", guest => {
          record(number, "occupied", "Check-in registrado", guest, null, null, guest);
          const currentState = readState();
          renderDashboardPerformance(doc, currentState.stats, currentState);
          renderDashboardActivity(doc, currentState.events);
          const badge = Array.from(article.querySelectorAll("span")).find(item => item.textContent.trim() === "Libre");
          const config = statusLabel("occupied");
          if (badge) {
            badge.textContent = config[0];
            badge.classList.remove("bg-status-free-bg", "text-status-free-fg");
            badge.classList.add(config[1], config[2]);
          }
          assignButton.textContent = "Huésped asignado";
          assignButton.disabled = true;
          showToast(doc, "Check-in registrado para " + guest + ".");
        });
      });
    });

    doc.getElementById("dashboardActivityHistoryBtn")?.addEventListener("click", () => route("historial"));
    const modal = doc.getElementById("quickModal");
    const close = () => {
      if (!modal) return;
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };
    if (modal) {
      modal.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button || button.id === "closeModalBtn") return;
        const label = button.innerText.trim();
        if (/Check-In/i.test(label)) {
          close();
          route("habitaciones", "Selecciona una habitación libre para registrar el check-in.");
        } else if (/Check-Out/i.test(label)) {
          close();
          route("habitaciones", "Selecciona la habitación ocupada y registra su salida.");
        } else if (/Limpieza/i.test(label)) {
          close();
          route("limpiezas");
        } else if (/Mantenimiento/i.test(label)) {
          close();
          route("habitaciones", "Selecciona la habitación que requiere mantenimiento.");
        }
      });
    }

    const filters = Array.from(doc.querySelectorAll("section button")).filter(button =>
      /Prioritarias|Piso 1|Piso 2|Suites VIP/.test(button.textContent)
    );
    filters.forEach(button => button.addEventListener("click", () => {
      const filter = button.textContent.trim();
      const articles = Array.from(doc.querySelectorAll("article"));
      articles.forEach(article => {
        const text = article.innerText;
        const roomNumber = article.querySelector(".font-headline-sm, .font-headline-md")?.textContent.trim();
        const matches = filter.startsWith("Prioritarias") ? ["104", "105"].includes(roomNumber) :
          filter.startsWith("Piso 1") ? /Piso 1/.test(text) :
          filter.startsWith("Piso 2") ? /Piso 2/.test(text) :
          /VIP|Nupcial|Suite/i.test(text);
        article.style.display = matches ? "" : "none";
      });
      filters.forEach(item => item.classList.toggle("ring-2", item === button));
    }));
  }

  function enhanceHistory(doc) {
    const list = doc.getElementById("room-list");
    if (!list) return;
    let period = "Hoy";
    const state = readState();
    const storedEvents = Array.isArray(state.events) ? state.events : [];
    list.querySelectorAll(".room-item").forEach(item => item.remove());
    const eventIcon = {
      free: "task_alt",
      occupied: "login",
      pending: "priority_high",
      cleaning: "cleaning_services",
      finished: "task_alt"
    };

    storedEvents.forEach(event => {
      const card = doc.createElement("article");
      card.className = "room-item";
      card.dataset.room = event.room;
      const eventDate = new Date(event.time);
      const validDate = !Number.isNaN(eventDate.getTime());
      const dateKey = validDate
        ? [eventDate.getFullYear(), String(eventDate.getMonth() + 1).padStart(2, "0"), String(eventDate.getDate()).padStart(2, "0")].join("-")
        : "";
      card.dataset.date = validDate ? eventDate.toLocaleDateString("es-MX") : "No Registrado";
      card.dataset.time = validDate ? eventDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
      card.dataset.day = dateKey;
      card.dataset.action = event.action || "No Registrado";
      card.dataset.guest = event.guest || "";
      card.dataset.actor = event.actor || "No Registrado";
      card.dataset.status = event.status || "";
      card.dataset.cleaningType = event.cleaningType || "";

      // Icon wrapper
      const icon = doc.createElement("div");
      icon.className = "history-event-icon";
      icon.dataset.status = event.status || "";
      const iconSpan = doc.createElement("span");
      iconSpan.className = "material-symbols-outlined";
      iconSpan.textContent = eventIcon[event.status] || "history";
      icon.appendChild(iconSpan);

      // Copy column
      const copy = doc.createElement("div");
      copy.className = "history-event-copy";

      const heading = doc.createElement("div");
      heading.className = "history-event-title";
      const roomTag = doc.createElement("span");
      roomTag.className = "history-room-tag";
      roomTag.textContent = "Hab. " + (event.room || "No Registrado");
      const actionText = doc.createElement("span");
      actionText.textContent = card.dataset.action;
      heading.append(roomTag, actionText);

      const details = doc.createElement("div");
      details.className = "history-event-meta";
      const personIcon = doc.createElement("span");
      personIcon.className = "material-symbols-outlined";
      personIcon.textContent = "person";
      details.append(
        personIcon,
        doc.createTextNode(card.dataset.guest
          ? "Huésped: " + card.dataset.guest
          : card.dataset.actor || "No Registrado")
      );

      const status = doc.createElement("span");
      status.className = "history-event-badge";
      status.dataset.status = event.status || "";
      status.textContent = statusLabel(event.status)?.[0] || "No Registrado";

      copy.append(heading, details, status);

      // Time column
      const time = doc.createElement("div");
      time.className = "history-event-time";
      const timeLabel = doc.createElement("span");
      timeLabel.textContent = card.dataset.time || "No Registrado";
      const dateLabel = doc.createElement("small");
      dateLabel.textContent = card.dataset.date;
      time.append(timeLabel, dateLabel);

      card.append(icon, copy, time);
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Consultar evento de la habitación " + (event.room || "No Registrado"));
      card.addEventListener("click", () => showHistoryEventDetails(doc, card));
      card.addEventListener("keydown", keyEvent => {
        if (keyEvent.key !== "Enter" && keyEvent.key !== " ") return;
        keyEvent.preventDefault();
        showHistoryEventDetails(doc, card);
      });
      list.appendChild(card);
    });

    const today = new Date();
    const dayKey = date => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
    const todayKey = dayKey(today);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yesterdayKey = dayKey(yesterday);
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    // Update KPI summary cards
    function updateMetrics() {
      const todayEvents = storedEvents.filter(ev => {
        const d = new Date(ev.time);
        return !Number.isNaN(d.getTime()) && dayKey(d) === todayKey;
      });
      const totalCount = todayEvents.length;
      const cleanCount = todayEvents.filter(ev => ev.status === "free" || /limpieza/i.test(ev.action || "")).length;
      const roomSet = new Set(todayEvents.map(ev => ev.room));

      const totalEl = doc.getElementById("metric-history-total");
      if (totalEl) totalEl.textContent = String(totalCount);
      const cleanEl = doc.getElementById("metric-history-clean");
      if (cleanEl) cleanEl.textContent = String(cleanCount);
      const roomsEl = doc.getElementById("metric-history-rooms");
      if (roomsEl) roomsEl.textContent = String(roomSet.size);
    }
    updateMetrics();

    const filterSection = doc.querySelector(".filter-btn")?.closest("section");
    const filterContainer = filterSection?.querySelector(".filter-btn")?.parentElement;
    if (filterSection) filterSection.classList.add("history-toolbar");
    if (filterContainer) filterContainer.classList.add("history-period-filters");

    const counter = doc.querySelector(".history-count") || Array.from(list.closest("section")?.querySelectorAll(".rounded-full") || [])
      .find(element => /eventos/i.test(element.textContent));
    if (counter) counter.classList.add("history-count");

    // Search input setup
    doc.querySelectorAll(".history-search-wrap").forEach(el => el.remove());
    let searchWrap = doc.createElement("label");
    searchWrap.className = "history-search-wrap";
    const searchIcon = doc.createElement("span");
    searchIcon.className = "material-symbols-outlined";
    searchIcon.setAttribute("aria-hidden", "true");
    searchIcon.textContent = "search";
    const searchInput = doc.createElement("input");
    searchInput.type = "search";
    searchInput.className = "history-search";
    searchInput.placeholder = "Buscar habitación, acción o camarista...";
    searchInput.setAttribute("aria-label", "Buscar en el historial");
    const clearSearch = doc.createElement("button");
    clearSearch.type = "button";
    clearSearch.className = "history-search-clear";
    clearSearch.setAttribute("aria-label", "Limpiar búsqueda");
    clearSearch.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    clearSearch.hidden = true;
    searchWrap.append(searchIcon, searchInput, clearSearch);
    filterSection?.prepend(searchWrap);

    const empty = doc.getElementById("empty-state");

    function render() {
      let shown = 0;
      const query = (searchInput?.value || "").trim().toLocaleLowerCase("es");
      Array.from(list.querySelectorAll(".room-item")).forEach(item => {
        let matchesPeriod = true;
        if (period === "Hoy") {
          matchesPeriod = item.dataset.day === todayKey;
        } else if (period === "Ayer") {
          matchesPeriod = item.dataset.day === yesterdayKey;
        } else if (period === "Esta Semana") {
          matchesPeriod = item.dataset.day >= dayKey(monday) && item.dataset.day <= todayKey;
        } else if (period === "Todos") {
          matchesPeriod = true;
        }
        const searchText = [item.dataset.room, item.dataset.action, item.dataset.actor, item.dataset.status]
          .join(" ").toLocaleLowerCase("es");
        const matchesSearch = !query || searchText.includes(query);
        const matches = matchesPeriod && matchesSearch;
        item.style.display = matches ? "" : "none";
        if (matches) shown++;
      });
      if (empty) {
        empty.classList.toggle("hidden", shown > 0);
        empty.classList.toggle("flex", shown === 0);
      }
      if (counter) counter.textContent = shown + (shown === 1 ? " evento" : " eventos");
      if (clearSearch && searchInput) clearSearch.hidden = !searchInput.value;
    }

    const filterButtons = Array.from(doc.querySelectorAll(".filter-btn"));
    filterButtons.forEach(button => button.addEventListener("click", () => {
      const iconText = button.querySelector(".material-symbols-outlined")?.textContent || "";
      period = button.textContent.replace(iconText, "").trim();
      filterButtons.forEach(item => {
        item.classList.remove("active", "bg-coral-primary", "text-on-primary", "bg-[#123a4a]", "text-white");
        item.classList.add("bg-white", "text-[#526970]");
      });
      button.classList.add("active");
      button.classList.remove("bg-white", "text-[#526970]");
      render();
    }));

    if (searchInput) {
      searchInput.addEventListener("input", render);
    }
    if (clearSearch && searchInput) {
      clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.focus();
        render();
      });
    }

    const exportButton = doc.getElementById("export-btn");
    if (exportButton) {
      doc.getElementById("toast-export")?.remove();
      exportButton.addEventListener("click", () => {
        const rows = [["Habitación", "Evento", "Responsable", "Estado", "Tipo de limpieza", "Fecha", "Hora"]];
        Array.from(list.querySelectorAll(".room-item"))
          .filter(item => item.style.display !== "none")
          .forEach(item => rows.push([
            item.dataset.room || "",
            item.dataset.action || "",
            item.dataset.actor || "",
            statusLabel(item.dataset.status)?.[0] || item.dataset.status || "",
            cleaningWorkTypes[item.dataset.cleaningType]?.label || "",
            item.dataset.date || "",
            item.dataset.time || ""
          ]));
        const csv = "\uFEFF" + rows.map(row => row.map(value => '"' + value.replace(/"/g, '""') + '"').join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = doc.createElement("a");
        anchor.href = url;
        anchor.download = "historial-operativo-" + todayKey + ".csv";
        doc.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(doc, "Bitácora exportada a CSV.");
      });
    }
    render();
  }

  function showHistoryEventDetails(doc, card) {
    const overlay = doc.createElement("div");
    overlay.className = "history-detail-overlay";
    const dialog = doc.createElement("section");
    dialog.className = "history-detail-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "history-detail-heading");
    const heading = doc.createElement("div");
    heading.className = "history-detail-heading";
    const mark = doc.createElement("span");
    mark.className = "history-detail-mark material-symbols-outlined";
    mark.dataset.status = card.dataset.status || "";
    mark.setAttribute("aria-hidden", "true");
    const icons = { free: "task_alt", occupied: "login", pending: "priority_high", cleaning: "cleaning_services", finished: "task_alt" };
    mark.textContent = icons[card.dataset.status] || "history";
    const title = doc.createElement("div");
    title.className = "history-detail-title";
    const titleText = doc.createElement("h2");
    titleText.id = "history-detail-heading";
    titleText.textContent = "Habitación " + (card.dataset.room || "—");
    const action = doc.createElement("p");
    action.textContent = card.dataset.action || "Actividad registrada";
    title.append(titleText, action);
    const close = doc.createElement("button");
    close.type = "button";
    close.className = "history-detail-close";
    close.setAttribute("aria-label", "Cerrar detalle");
    close.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    heading.append(mark, title, close);

    const fields = doc.createElement("div");
    fields.className = "history-detail-grid";
    const addField = (labelText, valueText, wide) => {
      const field = doc.createElement("div");
      field.className = "history-detail-field" + (wide ? " history-detail-field-wide" : "");
      const label = doc.createElement("span");
      label.className = "history-detail-label";
      label.textContent = labelText;
      const value = doc.createElement("span");
      value.className = "history-detail-value";
      value.textContent = valueText || "No especificado";
      field.append(label, value);
      fields.appendChild(field);
    };
    addField("Estado", statusLabel(card.dataset.status)?.[0] || card.dataset.status || "Registrado");
    if (card.dataset.guest) addField("Huésped", card.dataset.guest);
    addField("Responsable", card.dataset.actor);
    addField("Tipo de limpieza", cleaningWorkTypes[card.dataset.cleaningType]?.label || "No Registrado");
    addField("Fecha del evento", card.dataset.date || "No Registrado");
    addField("Hora de registro", card.dataset.time || "No Registrado");
    dialog.append(heading, fields);
    overlay.appendChild(dialog);

    const previousFocus = doc.activeElement;
    const closeDialog = () => {
      overlay.remove();
      doc.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
    const onKeyDown = event => {
      if (event.key === "Escape") closeDialog();
    };
    close.addEventListener("click", closeDialog);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeDialog();
    });
    doc.addEventListener("keydown", onKeyDown);
    doc.body.appendChild(overlay);
    close.focus();
  }

  if (window.parent === window) {
    startShell();
    return;
  }

  try {
    const page = location.pathname.toLowerCase().split("/").pop();
    if (page === "habitaciones.html") enhanceRooms(document);
    else if (page === "limpiezas.html") enhanceCleaning(document);
    else if (page === "historial.html") enhanceHistory(document);
    else enhanceDashboard(document);
    window.addEventListener("storage", event => {
      if (event.key !== storageKey) return;
      if (page === "habitaciones.html" || page === "limpiezas.html") {
        window.location.reload();
      } else if (page === "inicio.html") {
        const state = readState();
        renderDashboardPerformance(document, state.stats, state);
        renderDashboardActivity(document, state.events);
      }
    });
  } catch (error) {
    console.error("No se pudieron activar todas las funciones de esta pantalla.", error);
  }
})();
