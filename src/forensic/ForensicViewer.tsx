import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFECTS, TYPE_COLORS, type Defect } from './data';
import { useForensicScene, type LayerKey, type ViewMode } from './useForensicScene';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import forensicSeal from '@/assets/forensic-seal.png';
import confidentialStamp from '@/assets/evidence-stamp.png';

const TOTAL_DAMAGES = DEFECTS.reduce((acc, d) => acc + Number(d.dmg.replace(/[^0-9.]/g, '')) || 0, 0);
const HAZARD_COUNT = DEFECTS.filter((d) => d.sevCls === 'si').length;

const MODES: { id: ViewMode; label: string; sub: string }[] = [
  { id: '3d', label: '3D Orbit', sub: 'Perspective survey' },
  { id: 'plan', label: 'Plan View', sub: 'Orthographic top-down' },
  { id: 'section', label: 'Section Cut', sub: 'Live X-axis clip' },
  { id: 'thermal', label: 'Thermal IR', sub: 'False-color overlay' },
];

const LAYERS: { id: LayerKey; label: string }[] = [
  { id: 'walls', label: 'Walls' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'defects', label: 'Defects' },
  { id: 'zones', label: 'Damage Zones' },
];

const TABS = [
  { id: 'reg', label: 'Registry' },
  { id: 'det', label: 'Detail' },
  { id: 'ev', label: 'Evidence' },
  { id: 'ana', label: 'Analytics' },
  { id: 'dam', label: 'Damages' },
] as const;

type TabId = typeof TABS[number]['id'];

function severityChip(d: Defect) {
  const map: Record<Defect['sevCls'], { bg: string; ring: string; text: string }> = {
    si: { bg: 'bg-sev-critical/12', ring: 'ring-sev-critical/30', text: 'text-sev-critical' },
    sm: { bg: 'bg-sev-high/12', ring: 'ring-sev-high/30', text: 'text-sev-high' },
    ss: { bg: 'bg-sev-medium/10', ring: 'ring-sev-medium/30', text: 'text-sev-medium' },
  };
  const c = map[d.sevCls];
  return (
    <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold tracking-[0.08em] font-mono-ui ring-1 ${c.bg} ${c.ring} ${c.text}`}>
      {d.sev}
    </span>
  );
}

function punColor(p: Defect['punCls']) {
  if (p === 'pc') return 'text-sev-critical bg-sev-critical/8 ring-sev-critical/30';
  if (p === 'ph') return 'text-sev-high bg-sev-high/8 ring-sev-high/30';
  return 'text-sev-medium bg-sev-medium/8 ring-sev-medium/30';
}

export default function ForensicViewer() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>('LEAD-001');
  const [tab, setTab] = useState<TabId>('det');
  const [mode, setMode] = useState<ViewMode>('3d');
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ walls: true, furniture: true, defects: true, zones: true });
  const [sectionX, setSectionX] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const apiRef = useForensicScene(canvasRef, labelRef, selected, (id) => {
    setSelected(id);
    setTab('det');
  }, setHover);

  // Sync selection to scene
  useEffect(() => {
    if (selected) apiRef.current?.select(selected);
  }, [selected, apiRef]);

  useEffect(() => { apiRef.current?.setMode(mode); }, [mode, apiRef]);
  useEffect(() => { apiRef.current?.setSection(sectionX); }, [sectionX, apiRef]);
  useEffect(() => {
    (Object.keys(layers) as LayerKey[]).forEach((k) => apiRef.current?.toggleLayer(k, layers[k]));
  }, [layers, apiRef]);

  const sel = useMemo(() => DEFECTS.find((d) => d.id === selected) ?? null, [selected]);

  // ── Live sensor stream (mold spores · temp · moisture · IR junction temp) ──
  const [stream, setStream] = useState<{ t: number; spores: number; temp: number; wme: number; junc: number }[]>(() => {
    const arr: { t: number; spores: number; temp: number; wme: number; junc: number }[] = [];
    for (let i = 0; i < 48; i++) arr.push({ t: i, spores: 47000 + Math.sin(i / 4) * 2200, temp: 55 + Math.sin(i / 6) * 2.2, wme: 41 + Math.sin(i / 5) * 1.4, junc: 138 + Math.sin(i / 3) * 5 });
    return arr;
  });
  useEffect(() => {
    const t = setInterval(() => {
      setStream((s) => {
        const last = s[s.length - 1];
        const i = last.t + 1;
        const next = {
          t: i,
          spores: Math.max(35000, Math.min(60000, last.spores + (Math.random() - 0.5) * 1800)),
          temp: Math.max(50, Math.min(62, last.temp + (Math.random() - 0.5) * 0.6)),
          wme: Math.max(36, Math.min(46, last.wme + (Math.random() - 0.5) * 0.4)),
          junc: Math.max(125, Math.min(155, last.junc + (Math.random() - 0.5) * 1.6)),
        };
        return [...s.slice(-47), next];
      });
    }, 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* ── HEADER ── */}
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-0/90 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.45)]">
            <span className="font-display text-[13px] font-bold">FA</span>
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-sev-ok shadow-[0_0_6px_hsl(var(--sev-ok))]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground/70">Superior Court of California · Case No. 24-CV-087432</span>
            <span className="text-[11px] text-foreground/80">Rodriguez v. Park Avenue Properties LLC <span className="text-muted-foreground">·</span> Expert: <span className="text-foreground">Dr. A. Reyes AIA, FAIA, CFC</span></span>
          </div>
        </div>

        <div className="text-center">
          <div className="font-display text-[22px] font-bold leading-none gold-text tracking-[0.06em]">EXHIBIT FA-3D-002 v2</div>
          <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-muted-foreground/70">Forensic Architecture · Intelligence Survey · Unit 4B · 1240 Park Ave</div>
        </div>

        <div className="text-right text-[8px] leading-[1.7] tracking-[0.06em] text-muted-foreground/70">
          <div>Survey <span className="text-foreground/70">2024-03-15</span> · Bates <span className="text-foreground/70">PLNT000050–312</span></div>
          <div className="font-mono-ui">SHA-256 <span className="text-foreground/70">7f3a8b2c…0f5a</span> <span className="text-sev-ok">✓ VERIFIED</span></div>
          <div>FAIS v3.0 · Human-reviewed · <span className="text-primary">CONFIDENTIAL</span></div>
        </div>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-0/70 px-5 py-2 backdrop-blur">
        <span className="font-mono-ui text-[8px] uppercase tracking-[0.2em] text-muted-foreground/60">View</span>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface-1 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.sub}
              className={`px-2.5 py-1 rounded-[5px] text-[10px] font-mono-ui font-medium tracking-[0.08em] uppercase transition ${
                mode === m.id
                  ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-surface-2'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mx-3 h-5 w-px bg-border" />

        <span className="font-mono-ui text-[8px] uppercase tracking-[0.2em] text-muted-foreground/60">Layers</span>
        <div className="flex items-center gap-1">
          {LAYERS.map((l) => {
            const on = layers[l.id];
            return (
              <button
                key={l.id}
                onClick={() => setLayers((s) => ({ ...s, [l.id]: !s[l.id] }))}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono-ui tracking-[0.08em] uppercase border transition ${
                  on
                    ? 'border-accent/30 bg-accent/8 text-accent'
                    : 'border-border bg-transparent text-muted-foreground/60 hover:bg-surface-2 hover:text-foreground'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-accent shadow-[0_0_6px_hsl(var(--accent))]' : 'bg-muted-foreground/30'}`} />
                {l.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[8px] font-mono-ui text-muted-foreground/60 tracking-[0.1em]">
          <span className="text-sev-ok flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-ok pulse-dot" />
            LIVE
          </span>
          <span>{now.toISOString().replace('T', ' · ').slice(0, 19)} UTC</span>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="flex min-h-0 flex-1">
        {/* Viewport */}
        <section className="relative flex-1 min-w-0 overflow-hidden grid-bg vignette scanlines">
          <div ref={canvasRef} className="absolute inset-0" />
          <div ref={labelRef} className="pointer-events-none absolute inset-0 overflow-hidden z-[3]" />

          {/* Watermark seal */}
          <img
            src={forensicSeal}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[55%] opacity-[0.05] mix-blend-screen z-[2] select-none"
            loading="lazy"
          />

          {/* Top-left HUD */}
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1.5">
            <div className="font-mono-ui text-[8px] uppercase tracking-[0.22em] text-primary/70">// {mode === 'plan' ? 'ORTHOGRAPHIC' : mode.toUpperCase()} VIEWPORT</div>
            <div className="font-display text-[15px] tracking-tight text-foreground/90">Unit 4B <span className="text-muted-foreground/60">/ Floor 4</span></div>
            <div className="font-mono-ui text-[9px] tracking-[0.1em] text-muted-foreground/60">{DEFECTS.length} active defects · {HAZARD_COUNT} imminent hazards · ${(TOTAL_DAMAGES / 1_000_000).toFixed(2)}M claimed</div>
          </div>

          {/* Hover tooltip */}
          {hover && hover !== selected && (() => {
            const h = DEFECTS.find((d) => d.id === hover);
            if (!h) return null;
            return (
              <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-md panel px-3 py-2 max-w-[260px]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: h.color, boxShadow: `0 0 8px ${h.color}` }} />
                  <span className="font-mono-ui text-[10px] font-bold" style={{ color: h.color }}>{h.id}</span>
                  {severityChip(h)}
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground/80 leading-snug">{h.typeLbl}</div>
              </div>
            );
          })()}

          {/* Section slider */}
          {mode === 'section' && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 panel rounded-md px-4 py-2.5 flex items-center gap-3">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Section · X-Plane</span>
              <input
                type="range" min={-4.8} max={4.8} step={0.05} value={sectionX}
                onChange={(e) => setSectionX(parseFloat(e.target.value))}
                className="w-48 accent-primary"
              />
              <span className="font-mono-ui text-[10px] text-primary min-w-[68px] text-right">X = {(sectionX * 3).toFixed(1)} ft</span>
            </div>
          )}

          {/* Thermal legend */}
          {mode === 'thermal' && (
            <div className="absolute right-4 top-20 z-10 panel rounded-md p-3 text-center">
              <div className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-primary mb-2">Thermal IR</div>
              <div className="flex items-start gap-2">
                <div className="h-[110px] w-3 rounded-sm" style={{ background: 'linear-gradient(to bottom, #ff1100, #ff6600, #ffcc00, #00ccff, #0022ff)' }} />
                <div className="flex h-[110px] flex-col justify-between text-[8px] font-mono-ui text-muted-foreground/80 text-left">
                  <span>85°F</span>
                  <span>75°F</span>
                  <span className="text-primary">68°F ← min</span>
                  <span>58°F</span>
                  <span>50°F</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom-right cluster: compass + scale */}
          <div className="absolute right-4 bottom-4 z-10 flex flex-col items-end gap-2">
            <div className="panel rounded-md px-3 py-2 text-center">
              <svg width="22" height="28" viewBox="0 0 24 30">
                <polygon points="12,2 17,20 12,16 7,20" fill="hsl(var(--primary))" opacity=".95" />
                <polygon points="12,28 17,20 12,16 7,20" fill="hsl(var(--surface-3))" />
              </svg>
              <div className="mt-0.5 font-mono-ui text-[8px] tracking-[0.2em] text-muted-foreground">N</div>
            </div>
            <div className="panel rounded-md px-3 py-2 font-mono-ui text-[8px] text-muted-foreground tracking-[0.1em]">
              <div>SCALE 1:120 · 1 unit = 3 ft</div>
              <div className="mt-1 h-1 w-24 border border-border" style={{ background: 'repeating-linear-gradient(90deg, hsl(var(--primary)) 0 50%, hsl(var(--surface-2)) 50% 100%)' }} />
              <div className="mt-0.5 flex w-24 justify-between text-[7px] text-muted-foreground/70"><span>0</span><span>15 ft</span><span>30 ft</span></div>
            </div>
          </div>

          {/* Hints */}
          <div className="absolute left-4 bottom-4 z-10 font-mono-ui text-[8px] tracking-[0.1em] text-muted-foreground/55">
            DRAG · orbit · SCROLL · zoom · CLICK · inspect defect
          </div>

          {/* Live sensor strip */}
          <LiveSensorStrip stream={stream} />

          {/* Reset view */}
          <button
            onClick={() => apiRef.current?.resetView()}
            className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 panel rounded-md px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary hover:border-primary/40 transition"
          >
            ⟲ Reset View
          </button>
        </section>

        {/* Sidebar */}
        <aside className="relative flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-border bg-surface-0">
          <img
            src={confidentialStamp}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-6 top-2 w-[200px] rotate-[8deg] opacity-[0.10] z-0 select-none"
            loading="lazy"
          />
          <div className="relative z-10 flex flex-1 min-h-0 flex-col">
          {/* Case meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border px-4 py-3">
            {[
              ['Property / Unit', '1240 Park Ave · Unit 4B · Floor 4', false],
              ['Tenancy', 'Aug 2021 — present · 32 mo', false],
              ['Occupants', 'Rodriguez · 4 · incl. minor age 4', false],
              ['Total damages', '$' + TOTAL_DAMAGES.toLocaleString(), true],
              ['Defects', `${DEFECTS.length} · ${HAZARD_COUNT} imminent hazards`, true],
              ['Max notice gap', '226 days (LEAD-001)', true],
            ].map(([l, v, gold]) => (
              <div key={l as string} className="flex flex-col gap-0.5">
                <span className="font-mono-ui text-[7px] uppercase tracking-[0.18em] text-muted-foreground/70">{l as string}</span>
                <span className={`text-[10px] leading-snug ${gold ? 'text-primary font-semibold' : 'text-foreground/85'}`}>{v as string}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex-1 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.16em] transition ${
                  tab === t.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground'
                }`}
              >
                {t.label}
                {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-px bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
              </button>
            ))}
          </div>

          {/* Panels */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {tab === 'reg' && <RegistryPanel selected={selected} onSelect={setSelected} />}
            {tab === 'det' && (sel ? <DetailPanel d={sel} /> : <Empty>Select a defect from the Registry, or click any marker in the 3D view.</Empty>)}
            {tab === 'ev' && (sel ? <EvidencePanel d={sel} /> : <Empty>Select a defect to view its linked evidence with Bates references.</Empty>)}
            {tab === 'ana' && <AnalyticsPanel />}
            {tab === 'dam' && <DamagesPanel />}
          </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-surface-0/95 px-5 py-1.5 font-mono-ui text-[8px] tracking-[0.1em] text-muted-foreground/60 uppercase">
        <span>Confidential · Attorney-Client Privileged · Work Product</span>
        <span>Forensic Architecture Intelligence System v3.0 · Page 1 of 1</span>
      </footer>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center font-mono-ui text-[10px] leading-[2] text-muted-foreground/55">
      ←&nbsp;{children}
    </div>
  );
}

function RegistryPanel({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div>
      {DEFECTS.map((d) => {
        const on = d.id === selected;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`group relative w-full text-left border-b border-border/60 px-4 py-3 transition ${
              on ? 'bg-surface-1' : 'hover:bg-surface-1/60'
            }`}
          >
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: d.color, boxShadow: on ? `0 0 12px ${d.color}` : 'none' }} />
            <div className="flex items-baseline justify-between">
              <span className="font-mono-ui text-[11px] font-bold tracking-[0.06em]" style={{ color: d.color }}>{d.id}</span>
              {severityChip(d)}
            </div>
            <div className="mt-1 text-[10px] leading-snug text-foreground/75">{d.typeLbl}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono-ui text-[8px] tracking-[0.06em] text-muted-foreground/70">
              <span>{d.room.split('—')[0].trim()}</span>
              <span>⏱ {d.gap}d unremediated</span>
              <span className="text-foreground/70">{d.dmg.split(' ')[0]}</span>
            </div>
            {d.contra && (
              <div className="mt-1.5 flex items-center gap-1 font-mono-ui text-[8px] font-semibold text-sev-critical">
                ⚡ Contradiction detected
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="font-mono-ui text-[8px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">{label}</div>
      <div className="text-[10px] leading-relaxed text-foreground/80">{children}</div>
    </div>
  );
}

function DetailPanel({ d }: { d: Defect }) {
  return (
    <div>
      <div className="border-b border-border/60 px-4 py-3 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${d.color}, transparent)` }} />
        <div className="flex items-center justify-between">
          <span className="font-display text-[14px] font-bold tracking-[0.04em]" style={{ color: d.color }}>{d.id}</span>
          {severityChip(d)}
        </div>
        <div className="mt-1 text-[10px] text-foreground/85">{d.typeLbl}</div>
        <div className="mt-0.5 text-[9px] text-muted-foreground/75">{d.room}</div>
      </div>

      <DetailSection label="Code Citation / Threshold">
        <div className="font-mono-ui text-[10px] text-foreground/85">{d.code}</div>
        <div className="mt-1 grid grid-cols-2 gap-2 font-mono-ui text-[9px]">
          <div className="rounded bg-surface-1 px-2 py-1">
            <div className="text-muted-foreground/60 text-[7px] uppercase tracking-wider">Threshold</div>
            <div className="text-foreground/80">{d.threshold}</div>
          </div>
          <div className="rounded bg-sev-critical/8 ring-1 ring-sev-critical/20 px-2 py-1">
            <div className="text-sev-critical/80 text-[7px] uppercase tracking-wider">Found</div>
            <div className="text-sev-critical">{d.found}</div>
          </div>
        </div>
        <div className="mt-1 font-mono-ui text-[9px] text-muted-foreground/70">Area · {d.area}</div>
      </DetailSection>

      <DetailSection label="Status / Notice Gap">
        <span className="text-primary font-semibold">{d.status}</span>
        <span className="text-muted-foreground/70"> · {d.gap} days since first notice ({d.reported})</span>
      </DetailSection>

      <DetailSection label="Lab / Inspection Findings">{d.lab}</DetailSection>

      <DetailSection label="Expert Narrative">
        {d.narr}
        {d.contra && (
          <div className="mt-2 rounded ring-1 ring-sev-critical/30 bg-sev-critical/8 px-2.5 py-2 text-[10px] text-sev-critical leading-relaxed">
            {d.contra}
          </div>
        )}
        <div className={`mt-2 rounded ring-1 px-2.5 py-2 text-[10px] font-semibold leading-snug ${punColor(d.punCls)}`}>
          PUNITIVE EXPOSURE · {d.pun} — <span className="font-normal opacity-90">{d.punTxt}</span>
        </div>
      </DetailSection>

      <NoticeChain chain={d.chain} />

      <DetailSection label="Estimated Damages">
        <div className="font-display text-[18px] font-bold gold-text">{d.dmg}</div>
        <div className="font-mono-ui text-[8px] text-muted-foreground/70 mt-1">Bates: {d.bates}</div>
      </DetailSection>
    </div>
  );
}

function NoticeChain({ chain }: { chain: Defect['chain'] }) {
  return (
    <div className="px-4 py-3 border-b border-border/60">
      <div className="font-mono-ui text-[8px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">Notice & Response Chain</div>
      <div className="relative pl-4">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
        {chain.map((e, i) => (
          <div key={i} className="relative pb-3 last:pb-0">
            <div className="absolute -left-3 top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ background: e.c, boxShadow: `0 0 8px ${e.c}` }} />
            {e.type === 'gap' ? (
              <span className="inline-block rounded ring-1 ring-sev-critical/30 bg-sev-critical/10 px-2 py-0.5 font-mono-ui text-[9px] font-bold tracking-[0.06em] text-sev-critical">
                {e.lbl}
              </span>
            ) : (
              <>
                <div className="font-mono-ui text-[9px] font-semibold text-foreground/85">{e.date}</div>
                <div className="text-[10px] text-muted-foreground/85">{e.lbl}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidencePanel({ d }: { d: Defect }) {
  return (
    <div>
      <div className="px-4 py-2.5 border-b border-border/60 font-mono-ui text-[8px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Linked Evidence — <span className="text-foreground/80">{d.id}</span> · <span className="text-primary">{d.evidence.length} items</span>
      </div>
      {d.evidence.map((e) => {
        const c = TYPE_COLORS[e.tp] ?? '#3a5060';
        return (
          <div key={e.id} className="flex gap-3 px-4 py-3 border-b border-border/40 hover:bg-surface-1/60 transition">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md font-mono-ui text-[10px] font-bold tracking-tight"
              style={{ background: `${c}1a`, color: c, boxShadow: `inset 0 0 0 1px ${c}40` }}
            >
              {e.tp}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono-ui text-[10px] font-bold" style={{ color: c }}>{e.id}</div>
              <div className="text-[10px] text-muted-foreground/85 leading-snug">{e.desc}</div>
              <div className="mt-0.5 font-mono-ui text-[8px] tracking-[0.04em] text-muted-foreground/55">Bates · {e.bates}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DamagesPanel() {
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <td className="px-4 py-2 font-mono-ui text-[7px] uppercase tracking-[0.16em] text-muted-foreground/70">Defect</td>
            <td className="px-4 py-2 font-mono-ui text-[7px] uppercase tracking-[0.16em] text-muted-foreground/70">Classification / Code</td>
            <td className="px-4 py-2 text-right font-mono-ui text-[7px] uppercase tracking-[0.16em] text-muted-foreground/70">Damages</td>
          </tr>
        </thead>
        <tbody>
          {DEFECTS.map((d) => (
            <tr key={d.id} className="border-b border-border/50 hover:bg-surface-1/50">
              <td className="px-4 py-2.5 align-top font-mono-ui text-[10px]" style={{ color: d.color }}>{d.id}</td>
              <td className="px-4 py-2.5 align-top text-[10px] text-foreground/80">
                {d.typeLbl.split('—')[0].trim()}
                <div className="font-mono-ui text-[8px] text-muted-foreground/65 mt-0.5">{d.code.split(' /')[0]}</div>
              </td>
              <td className="px-4 py-2.5 text-right align-top font-mono-ui text-[10px] font-bold text-foreground/85">{d.dmg.split(' ')[0]}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="px-4 pt-4 pb-3 border-t border-primary/40 font-display text-[12px] font-bold text-primary">Total Claimed Damages</td>
            <td className="px-4 pt-4 pb-3 text-right border-t border-primary/40 font-display text-[16px] font-bold gold-text">$2,847,500</td>
          </tr>
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-border/60 font-mono-ui text-[9px] leading-[1.7] text-muted-foreground/70 space-y-1">
        <div><span className="text-sev-critical">●</span> LEAD-001 includes mandatory treble damages under 42 U.S.C. §4852d ($659,167 × 3 = $1,977,500).</div>
        <div><span className="text-sev-medium">●</span> HVAC-001 habitability diminution: 3 mo × $4,800 × 75% = $10,800.</div>
        <div><span className="text-muted-foreground/50">●</span> Punitive damages not included — exposure is substantial given conduct pattern.</div>
        <div><span className="text-primary">●</span> Attorney's fees mandatory under CC §1942.4 for MOLD-001 and HVAC-001.</div>
      </div>
    </div>
  );
}