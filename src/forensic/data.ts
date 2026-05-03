export type ChainEvent =
  | { date: string; type: 'noticed' | 'notice' | 'response' | 'fail' | 'inspect'; lbl: string; c: string }
  | { type: 'gap'; lbl: string; c: string };

export type Evidence = {
  tp: string;
  id: string;
  bates: string;
  desc: string;
  c: string;
};

export type Defect = {
  id: string;
  bates: string;
  color: string;
  hex: number;
  typeLbl: string;
  sev: string;
  sevCls: 'si' | 'sm' | 'ss';
  room: string;
  code: string;
  threshold: string;
  found: string;
  area: string;
  pos: [number, number, number];
  gap: number;
  reported: string;
  status: string;
  lab: string;
  narr: string;
  contra: string | null;
  pun: string;
  punCls: 'pc' | 'ph' | 'pm';
  punTxt: string;
  dmg: string;
  chain: ChainEvent[];
  evidence: Evidence[];
};

export const DEFECTS: Defect[] = [
  {
    id: 'MOLD-001', bates: 'PLNT000234–241', color: '#22c55e', hex: 0x22c55e,
    typeLbl: 'Mold — Confirmed Aspergillus niger (laboratory)', sev: 'MATERIAL BREACH', sevCls: 'sm',
    room: 'Bathroom (NW) — ceiling + north wall', code: 'CA H&S §17920.3(a)(13)',
    threshold: '10,000 spores/m³', found: '48,000 spores/m³ — 4.8× threshold', area: '38 sq ft',
    pos: [-2.4, 2.82, -3.15], gap: 71, reported: '2024-01-03', status: 'UNREMEDIATED',
    lab: 'Aspergillus niger confirmed — 48,000 spores/m³. Actionable threshold: 10,000. Exceedance 4.8×. Area: 38 sq ft (ceiling) + 14" wall extension. Minor child sleeps in adjacent bedroom.',
    narr: 'Mold colony NE quadrant of bathroom ceiling, extending 14" down north wall. Confirmed Aspergillus niger. Certified-letter notice Jan 3, 2024. No remediation as of Mar 15 inspection — 71 days elapsed.',
    contra: '⚑ CONTRADICTION: Maintenance log (DFND000445) claims "mold remediation completed Feb 2, 2024." Mar 15 lab report confirms zero remediation. Inspector: no evidence of any work performed.',
    pun: 'HIGH', punCls: 'ph', punTxt: '3 notices + 71-day gap + false completion claim = willful/oppressive conduct (CC §3294).',
    dmg: '$380,000',
    chain: [
      { date: '2023-11-15', type: 'noticed', lbl: 'Tenant first observes mold growth', c: '#22c55e' },
      { date: '2024-01-03', type: 'notice', lbl: 'Certified letter sent to landlord', c: '#4b8df8' },
      { date: '2024-01-10', type: 'response', lbl: '"We\'ll look into it" — PM email', c: '#f59e0b' },
      { type: 'gap', lbl: 'NO ACTION — 71 DAYS ELAPSED', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'Expert: zero remediation confirmed', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'LAB', id: 'LAB-2024-0315-01', bates: 'PLNT000234–239', desc: 'Air quality lab — Aspergillus niger confirmed', c: '#22c55e' },
      { tp: 'PHO', id: 'PHO-2024-0315-47', bates: 'PLNT000240–241', desc: 'EXIF-verified RAW photography — ceiling colony', c: '#4b8df8' },
      { tp: 'LTR', id: 'LTR-2024-0103', bates: 'PLNT000189', desc: 'Certified letter — first written notice', c: '#f59e0b' },
      { tp: 'EML', id: 'EML-2024-0110', bates: 'DFND000312', desc: 'PM email response — "will look into it"', c: '#f59e0b' },
      { tp: 'LOG', id: 'LOG-DFND-445', bates: 'DFND000445', desc: '⚑ Maintenance log claiming Feb 2 completion — CONTRADICTED', c: '#dc4f35' },
    ],
  },
  {
    id: 'WATER-001', bates: 'PLNT000189–201', color: '#4b8df8', hex: 0x4b8df8,
    typeLbl: 'Water intrusion — active (failed roof membrane at parapet)', sev: 'MATERIAL BREACH', sevCls: 'sm',
    room: 'Bedroom (NE) — north wall, upper zone (above bed)', code: 'CA Civ. Code §1941.1(a)(4)',
    threshold: '19% WME', found: '42% WME — active seepage', area: '18 sq ft stain · wall cavity compromised',
    pos: [1.6, 1.88, -3.92], gap: 116, reported: '2023-11-20', status: 'ATTEMPTED — FAILED ×2',
    lab: 'Moisture meter: 42% WME at 3 points (threshold: 19%). Source: failed roof membrane at parapet junction directly above unit. Borescope (PLNT000199): nascent Cladosporium colony forming in stud cavity. BED IS DIRECTLY BELOW INTRUSION POINT.',
    narr: 'Active water seepage through north bedroom wall. Staining 6ft × 3ft. Two failed repair attempts (Dec 4, Jan 22). Borescope confirms mold forming in wall cavity. Occupants sleep directly below active leak.',
    contra: null,
    pun: 'MEDIUM', punCls: 'pm', punTxt: 'Two documented failed repair attempts establish constructive knowledge + failure to cure.',
    dmg: '$210,000',
    chain: [
      { date: '2023-10-08', type: 'noticed', lbl: 'Seepage first observed', c: '#22c55e' },
      { date: '2023-11-20', type: 'notice', lbl: 'Written notice to property manager', c: '#4b8df8' },
      { date: '2023-11-28', type: 'response', lbl: 'PM dispatches roofer — first attempt', c: '#f59e0b' },
      { date: '2023-12-04', type: 'fail', lbl: 'Repair attempt #1 — FAILED (leaked same night)', c: '#dc4f35' },
      { date: '2024-01-22', type: 'fail', lbl: 'Repair attempt #2 — FAILED (borescope confirms)', c: '#dc4f35' },
      { type: 'gap', lbl: 'NO FURTHER ACTION — 52 DAYS', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'Expert: active leak + cavity mold confirmed', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'RDR', id: 'RDR-2024-0315-01', bates: 'PLNT000189–193', desc: 'Moisture meter data — 12 readings, 3 locations', c: '#4b8df8' },
      { tp: 'BOR', id: 'BOR-2024-0315-01', bates: 'PLNT000194–199', desc: 'Borescope video — wall cavity mold growth', c: '#22c55e' },
      { tp: 'PHO', id: 'PHO-2024-0315-28', bates: 'PLNT000200–201', desc: 'EXIF-verified stain documentation (GPS-tagged)', c: '#4b8df8' },
      { tp: 'INV', id: 'INV-CNTR-2023-12', bates: 'DFND000388', desc: 'Roofing contractor invoice — failed repair Dec 4', c: '#f59e0b' },
    ],
  },
  {
    id: 'HVAC-001', bates: 'PLNT000302–309', color: '#f59e0b', hex: 0xf59e0b,
    typeLbl: 'HVAC failure — heating system non-functional (all habitable rooms)', sev: 'MATERIAL BREACH', sevCls: 'sm',
    room: 'All habitable rooms — living 58°F · bedroom 54°F · kitchen 61°F', code: 'CA Civ. Code §1941.1(a)(6)',
    threshold: '70°F at 3 ft AFF', found: '54–61°F across all rooms — 9–16°F below threshold', area: 'Est. 780 sq ft (all habitable)',
    pos: [-1.4, 2.88, 1.8], gap: 43, reported: '2023-12-03', status: 'UNREMEDIATED',
    lab: 'Temp at 3ft AFF: Living 58°F, Bedroom 54°F, Kitchen 61°F. Statutory min 70°F. Data logger (PLNT000307): 14 consecutive nights below 60°F Dec 2023. Subpoena: NO work order was ever issued by landlord.',
    narr: 'Central heating non-functional. All rooms 9–16°F below statutory minimum. PM claimed "looking into it" Dec 5 but issued no work order. Minor child (age 4) exposed to sustained sub-60°F conditions.',
    contra: '⚑ CONTRADICTION: PM email (DFND000312) states "heating system is fully operational." Data logger records 14 consecutive sub-60°F nights during the same period.',
    pun: 'HIGH', punCls: 'ph', punTxt: 'Non-repair after notice + affirmative false claim of functionality = willful/fraudulent conduct (CC §3294).',
    dmg: '$95,000 + habitability diminution ×3 mo.',
    chain: [
      { date: '2023-11-30', type: 'noticed', lbl: 'Tenant notices heating failure', c: '#22c55e' },
      { date: '2023-12-03', type: 'notice', lbl: 'Written notice to PM', c: '#4b8df8' },
      { date: '2023-12-05', type: 'response', lbl: 'PM: "looking into it" — no work order issued', c: '#f59e0b' },
      { type: 'gap', lbl: 'NO REPAIR — 43 DAYS ELAPSED', c: '#dc4f35' },
      { date: '2024-01-15', type: 'inspect', lbl: 'Expert inspection: all rooms below 70°F', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'LOG', id: 'LOG-TEMP-DEC23', bates: 'PLNT000302–307', desc: 'Temperature data logger — 14 nights below 60°F', c: '#f59e0b' },
      { tp: 'EML', id: 'EML-2023-1205', bates: 'DFND000312', desc: '⚑ PM email: "fully operational" — CONTRADICTED', c: '#dc4f35' },
      { tp: 'SUB', id: 'SUB-WORKORDERS', bates: 'DFND000401–408', desc: 'Subpoena return: no HVAC work order ever issued', c: '#8b5cf6' },
    ],
  },
  {
    id: 'CRACK-001', bates: 'PLNT000156–171', color: '#dc4f35', hex: 0xdc4f35,
    typeLbl: 'Structural — diagonal shear crack (south wall, window sill to floor)', sev: 'SIGNIFICANT', sevCls: 'ss',
    room: 'Living room (SW) — south wall · crack propagating +8" over 6 months', code: 'IBC §1604.3 / CA H&S §17920.3(a)(1)',
    threshold: '1.5 mm (IBC investigation)', found: '3.2 mm — 2.1× threshold · 45° diagonal trajectory', area: '62 in. length · growing 1.3 in/month',
    pos: [-0.45, 1.38, 3.92], gap: 182, reported: '2023-09-14', status: 'UNREMEDIATED',
    lab: 'Crack width 3.2 mm (IBC threshold 1.5 mm, exceedance 2.1×). Trajectory: 45° diagonal consistent with differential foundation settlement. Photogrammetric series: +8 inches growth over 6 months (EXIF-timestamped RAW, PLNT000160–165).',
    narr: 'Diagonal shear crack from window sill to floor. PM classified as "cosmetic" — expert confirms structural. Growing crack consistent with foundation settlement. 182 days unremediated.',
    contra: null,
    pun: 'MEDIUM', punCls: 'pm', punTxt: '182 days unremediated + PM misclassification as cosmetic + growing crack = constructive knowledge of structural risk.',
    dmg: '$185,000',
    chain: [
      { date: '2023-09-14', type: 'noticed', lbl: 'Tenant notices crack — notifies PM same day', c: '#22c55e' },
      { date: '2023-10-01', type: 'response', lbl: 'PM: "cosmetic only, normal settlement"', c: '#f59e0b' },
      { type: 'gap', lbl: 'NO INSPECTION OR REPAIR — 182 DAYS', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'Expert: structural — IBC threshold exceeded, growing', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'PHO', id: 'PHO-CRACK-SERIES', bates: 'PLNT000160–165', desc: 'Photogrammetric RAW series — 6-date propagation record', c: '#dc4f35' },
      { tp: 'STR', id: 'STR-RPT-2024-03', bates: 'PLNT000166–171', desc: 'Structural engineering expert report', c: '#dc4f35' },
      { tp: 'EML', id: 'EML-PM-2023-1001', bates: 'DFND000356', desc: 'PM email: "cosmetic — normal settlement" — disputed', c: '#f59e0b' },
    ],
  },
  {
    id: 'LEAD-001', bates: 'PLNT000089–104', color: '#e060a0', hex: 0xe060a0,
    typeLbl: 'Lead paint — hazardous, FRIABLE (kitchen east wall + hallway)', sev: 'IMMINENT HAZARD', sevCls: 'si',
    room: 'Kitchen (SE) + hallway — east wall · minor child age 4 occupies unit', code: '40 CFR Part 745 · CA H&S §17920.3(a)(9) · 42 U.S.C. §4852d',
    threshold: '1.0 mg/cm² (EPA)', found: '2.4 mg/cm² — 2.4× threshold · FRIABLE condition', area: '~140 sq ft kitchen east wall + hallway',
    pos: [4.18, 1.05, 2.15], gap: 226, reported: '2023-08-01', status: 'UNREMEDIATED',
    lab: 'XRF: 2.4 mg/cm² (EPA threshold 1.0 mg/cm², exceedance 2.4×). FRIABLE — active chip-off. 1962 construction — federal disclosure mandatory. Occupant: minor child age 4 (elevated blood-lead vulnerability, CDC). FEDERAL STATUTE VIOLATION confirmed.',
    narr: 'Lead paint at 2.4× EPA threshold throughout kitchen/hallway east wall. Friable, deteriorating. Minor child occupies unit. Building 1962. Landlord affirmatively denied knowledge. 226 days unremediated. Federal treble damages triggered.',
    contra: '⚑ CONTRADICTION: Landlord disclosure (DFND000089) states "No known lead hazard." Building records confirm 1962 construction — constructive knowledge legally implied. XRF confirms 2.4 mg/cm². Federal violation: 42 U.S.C. §4852d — mandatory treble damages.',
    pun: 'CRITICAL', punCls: 'pc', punTxt: 'Federal disclosure violation + minor in unit + affirmative denial + 226 days = CRITICAL. Treble damages mandatory under 42 U.S.C. §4852d.',
    dmg: '$1,977,500 (incl. federal treble)',
    chain: [
      { date: '2023-08-01', type: 'noticed', lbl: 'Tenant requests lead test — minor child in unit', c: '#22c55e' },
      { date: '2023-08-01', type: 'notice', lbl: 'Written notice + disclosure request to PM', c: '#4b8df8' },
      { date: '2023-08-15', type: 'response', lbl: 'PM written response: "no known lead hazard"', c: '#dc4f35' },
      { type: 'gap', lbl: 'NO ABATEMENT — 226 DAYS', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'XRF confirms 2.4 mg/cm² — FEDERAL VIOLATION', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'XRF', id: 'XRF-2024-0315-01', bates: 'PLNT000089–094', desc: 'XRF lead paint analysis — 2.4 mg/cm² confirmed', c: '#e060a0' },
      { tp: 'DIS', id: 'DIS-LL-2023-0815', bates: 'DFND000089', desc: '⚑ Landlord disclosure: "no known lead" — CONTRADICTED', c: '#dc4f35' },
      { tp: 'MED', id: 'MED-CHILD-BLL-01', bates: 'PLNT000095–099', desc: 'Minor child blood lead level test — elevated', c: '#e060a0' },
      { tp: 'BLD', id: 'BLD-RECORDS-1962', bates: 'PLNT000100–104', desc: 'Building records — 1962 construction, constructive knowledge', c: '#8b5cf6' },
      { tp: 'FED', id: 'FED-4852D', bates: 'PLNT000090', desc: 'Federal violation analysis — 42 U.S.C. §4852d treble damages', c: '#dc4f35' },
    ],
  },
  {
    id: 'ASBE-001', bates: 'PLNT000412–428', color: '#a78bfa', hex: 0xa78bfa,
    typeLbl: 'Asbestos — friable thermal pipe insulation (utility chase)', sev: 'IMMINENT HAZARD', sevCls: 'si',
    room: 'Utility chase (central) · disturbed during failed Dec 2023 repair', code: '40 CFR Part 61 Subpart M · Cal/OSHA §1529',
    threshold: '0.1 f/cc (PEL · 8-hr TWA)', found: '0.42 f/cc — 4.2× PEL · friable chrysotile', area: '11 linear ft of pipe wrap',
    pos: [0.6, 2.55, -0.2], gap: 89, reported: '2023-12-18', status: 'UNREMEDIATED · ACCESS RESTRICTED',
    lab: 'PLM analysis: 18% chrysotile asbestos in friable pipe-wrap insulation. Air sample post-disturbance: 0.42 f/cc (8× background). Disturbance event during HVAC repair attempt Dec 4, 2023 — performed without abatement protocols. Building age 1962 — pre-ban material consistent.',
    narr: 'Chrysotile asbestos disturbed by unlicensed contractor during failed HVAC repair. No NESHAP notification filed. Air monitoring confirms ongoing fiber release into return-air plenum serving all habitable rooms. Federal abatement required.',
    contra: '⚑ CONTRADICTION: Contractor invoice (DFND000388) describes work as "minor pipe insulation replacement" — no mention of suspect ACM. NESHAP 10-day pre-notification (40 CFR §61.145) was never filed. Strict-liability federal violation.',
    pun: 'CRITICAL', punCls: 'pc', punTxt: 'Strict-liability federal NESHAP violation + return-air contamination + minor in unit = CRITICAL exposure. EPA penalties up to $109,024/day per violation.',
    dmg: '$640,000',
    chain: [
      { date: '2023-12-04', type: 'fail', lbl: 'Disturbance event — HVAC contractor cuts pipe wrap', c: '#dc4f35' },
      { date: '2023-12-18', type: 'noticed', lbl: 'Tenant notices white fiber dust on HVAC vents', c: '#22c55e' },
      { date: '2023-12-19', type: 'notice', lbl: 'Written notice + lab request to PM', c: '#4b8df8' },
      { type: 'gap', lbl: 'NO ABATEMENT · NO NESHAP FILING — 89 DAYS', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'PLM + air monitoring confirms friable chrysotile', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'PLM', id: 'PLM-2024-0315-04', bates: 'PLNT000412–417', desc: 'Polarized light microscopy — 18% chrysotile confirmed', c: '#a78bfa' },
      { tp: 'AIR', id: 'AIR-2024-0315-02', bates: 'PLNT000418–422', desc: 'Air monitoring — 0.42 f/cc (4.2× PEL)', c: '#a78bfa' },
      { tp: 'INV', id: 'INV-CNTR-2023-12', bates: 'DFND000388', desc: '⚑ Contractor invoice — no ACM disclosure (NESHAP violation)', c: '#dc4f35' },
      { tp: 'FED', id: 'FED-NESHAP', bates: 'PLNT000423–428', desc: 'Federal NESHAP §61.145 non-notification analysis', c: '#dc4f35' },
    ],
  },
  {
    id: 'ELEC-001', bates: 'PLNT000501–518', color: '#fb7185', hex: 0xfb7185,
    typeLbl: 'Electrical — knob-and-tube splices in concealed kitchen ceiling', sev: 'SIGNIFICANT', sevCls: 'ss',
    room: 'Kitchen (SE) — concealed ceiling junction · adjacent to lead paint zone', code: 'NEC §394.12 · CA Elec. Code §110.14 · CFC §605.1',
    threshold: 'Splices forbidden in concealed locations (NEC §394.30)', found: '7 unlisted splices · scorch marks · 142°F at junction', area: '4 sq ft of ceiling cavity',
    pos: [3.5, 2.85, 1.2], gap: 54, reported: '2024-01-21', status: 'UNREMEDIATED · ACTIVE FIRE RISK',
    lab: 'Thermographic survey: junction box reads 142°F under 60% rated load. 7 unlisted splices (wire-nut + tape) in concealed location — prohibited by NEC §394.30(B). Scorch marks on adjacent joist. Estimated ignition probability under sustained load: elevated.',
    narr: 'Concealed knob-and-tube splices in kitchen ceiling cavity show active heat signature and char. Modern circuit loads (microwave + dishwasher) exceed safe capacity. Fire-marshal-grade hazard directly above lead-paint deteriorating zone.',
    contra: null,
    pun: 'MEDIUM', punCls: 'pm', punTxt: 'Active fire risk + scorch evidence + 54-day non-response = constructive knowledge of imminent ignition risk.',
    dmg: '$155,000',
    chain: [
      { date: '2024-01-19', type: 'noticed', lbl: 'Tenant reports flickering + burning odor', c: '#22c55e' },
      { date: '2024-01-21', type: 'notice', lbl: 'Written notice w/ photos to PM', c: '#4b8df8' },
      { date: '2024-01-25', type: 'response', lbl: 'PM: "scheduling electrician" — no follow-up', c: '#f59e0b' },
      { type: 'gap', lbl: 'NO ELECTRICIAN DISPATCHED — 54 DAYS', c: '#dc4f35' },
      { date: '2024-03-15', type: 'inspect', lbl: 'IR thermography confirms 142°F at concealed junction', c: '#8b5cf6' },
    ],
    evidence: [
      { tp: 'IRT', id: 'IRT-2024-0315-07', bates: 'PLNT000501–506', desc: 'IR thermography — 142°F at concealed junction', c: '#fb7185' },
      { tp: 'PHO', id: 'PHO-2024-0315-62', bates: 'PLNT000507–512', desc: 'Borescope photos — scorch marks + 7 unlisted splices', c: '#4b8df8' },
      { tp: 'EML', id: 'EML-2024-0125', bates: 'DFND000522', desc: 'PM email: "scheduling electrician" — no follow-up', c: '#f59e0b' },
      { tp: 'STR', id: 'STR-NEC-394', bates: 'PLNT000513–518', desc: 'NEC §394.30 / CA Elec. Code §110.14 violation memo', c: '#dc4f35' },
    ],
  },
];

export const TYPE_COLORS: Record<string, string> = {
  LAB: '#22c55e', PHO: '#4b8df8', LTR: '#f59e0b', EML: '#f59e0b',
  LOG: '#dc4f35', RDR: '#4b8df8', BOR: '#22c55e', INV: '#8b5cf6',
  STR: '#dc4f35', XRF: '#e060a0', DIS: '#dc4f35', MED: '#e060a0',
  BLD: '#8b5cf6', FED: '#dc4f35', SUB: '#8b5cf6',
  PLM: '#a78bfa', AIR: '#a78bfa', IRT: '#fb7185',
};