# PLAYBOOK — Ancient Tech Shorts

Reguli de producție pentru clipuri care prind: **triplu hook**, **emoție în fiecare secundă**, **interacțiune**, **buclă**.
Totul de mai jos e implementat în engine (compositor + build.py); aici e „de ce”-ul și cum scrii scripturi care îl folosesc.

## 1. Triple Hook (0 – 3 s)

Trei cârlige simultane, pe trei canale diferite, în prima secundă:

| Canal | Ce face | Unde se setează |
|---|---|---|
| **Vizual** | impact + flash + punch-in pe cadru, modelul 3D deja „se construiește” (fără intro, fără logo) | automat: event `impact` la t=0.02, draw-on al scenei |
| **Text** | card uriaș cu un număr/claim imposibil (`6 TONS`) + sub-claim (`lifted by two men walking`) + tag roșu de context (`ROME · 100 AD`) | `hook` în JSON |
| **Audio/Voce** | prima propoziție e contradicția: *„Two men… walking… lifted six tons”*; vocea pornește la 0,45 s, după impact | primul `beat` |

Reguli: numărul din card ≠ textul vocii (două informații, nu una repetată). Cardul dispare la 2,4–2,6 s, exact când subiectul 3D e complet.

## 2. Structura de retenție (≈ 55 s)

```
0–3 s    HOOK triplu + draw-on 3D
3–9 s    NUMIRE + PROMISIUNE  „This is the X… and it hides a trick”  → scan line, readout-uri pornesc
9–12 s   OPEN LOOP            „most people never see”  + prompt roșu „CAN YOU SPOT IT?” (interacțiune 1)
12–24 s  MECANISM pas 1       camera intră în detaliu, adnotări, numărătoare (1/5 → 5/5), card numeric
24–36 s  MECANISM pas 2       al doilea „secret”, al doilea card numeric, climax (cue `lift` / `reveal`: riser → boom)
36–46 s  PAYOFF + CONTRAST    „120× stronger”, comparație (ramp vs crane)
46–51 s  TWIST EMOȚIONAL      „and then it was lost for 1,000 years” → scena pâlpâie, roșu, readout LOST
51–57 s  CTA interactiv       card A/B + voce „Comment A or B” + follow
```
Fiecare beat are **un singur gând**. Vocea la viteză 1,04 (ritm de short, dar inteligibil).

## 3. Emoție în fiecare secundă (micro-evenimente)

Engine-ul garantează că la **fiecare 0,5–1,5 s** se întâmplă ceva vizibil sau auzibil:
* subtitrări cinetice, cuvânt cu cuvânt, cu pop + cuvintele-cheie în auriu cu glow (`keys`);
* HUD viu: readout-uri care numără (`LOAD 0 → 6,000 KG`), clipesc (`blink`), scan line la fiecare reveal;
* cameră în mișcare permanentă (orbit/drift) + punch-in pe `impact`/`hit`;
* audio: heartbeat (BPM 84–90) care crește spre climax, tick de ceas, whoosh la schimbarea de cadru, riser → boom la reveal,
  chime la CTA; bed-ul se duce automat sub voce (ducking).
* carduri numerice cu numărătoare (`count_from → count_to`) la fiecare 10–12 s — numerele mari sunt cel mai puternic „pattern interrupt”.

Când scrii un beat, întreabă-te: *ce se schimbă pe ecran cât se rostește?* Dacă nimic → adaugă `cue`, `sfx`, `number` sau `prompt`.

## 4. Interacțiune (3 puncte obligatorii)

1. **Challenge în primele 10 s**: `prompt` roșu („PAUSE — COUNT THE GEARS”, „CAN YOU SPOT THE TRICK?”) → pauze = watch time + comentarii.
2. **CTA A/B** la final: întrebare cu două opțiuni concrete (ambele = episoade pe care chiar le faci). Vocea spune literal „Comment A or B”.
3. **Comentariu fixat** (din `metadata.pinned_comment`) cu A/B explicat + emoji; răspunde la primele 20 de comentarii în prima oră
   cu întrebări („B? de ce nu A?”) — algoritmul ia în calcul și reply-urile.
Bonus: titlul episodului următor = opțiunea câștigătoare → spectatorii revin să vadă „dacă a câștigat a lor”.

## 5. Buclă (replay)

Ultimul cadru: orbit lent pe modelul complet, fără text în afara cardului CTA; primul cadru: același model desenându-se.
Trecerea sfârșit → început pare continuă, iar CTA-ul rămâne vizibil 6 s (timp de comentat).

## 6. Vizual (brand)

Auriu `#ffc24a` pe piatră `#1a1510`, grilă blueprint, colțuri de vizor, etichete `FIG. I — … — SCALE 1:40` în mono.
Un singur accent **roșu** (`#ff4d2e`) pentru pericol/pierdere/prompt și un **cyan** (`#5ad7ff`) pentru descoperiri/apă/lumină.
Nu introduce alte culori. Textul mare: Cinzel Black (titluri, numere), Inter Black (captions), JetBrains Mono (HUD).

## 7. Checklist înainte de publicare

- [ ] hook card lizibil în primele 0,3 s; impactul se aude; vocea începe la 0,45 s
- [ ] niciun beat fără schimbare vizibilă (cue / number / prompt / annotation)
- [ ] cardul CTA ≥ 5 s, opțiunile A/B sunt episoade reale din backlog
- [ ] zona de siguranță: nimic esențial în ultimii 300 px de jos (UI YouTube) sau în 150 px din dreapta
- [ ] loudness -14 LUFS (automat), vocea clară peste bed
- [ ] titlu ≤ 60 caractere cu numărul-cârlig; 3 hashtaguri în titlu/descriere: `#shorts #ancienttech` + nișă

## 8. Backlog de episoade (cu hook-ul gata)

| # | Subiect | Hook card | Secretul |
|---|---|---|---|
| 6 | Seismoscoful lui Zhang Heng (132 AD) | `650 KM` — detected an earthquake nobody felt | pendul inerțial → 8 dragoni, bila cade spre epicentru |
| 7 | Coloana lui Traian — blocul de 53 t la 34 m | `53 TONS` — lifted 34 m without a motor | turn de ridicare cu capstane multiple |
| 8 | Focul grecesc — sifonul bizantin | `BANNED` — a flamethrower that burned on water | pompă cu piston + ulei încălzit sub presiune |
| 9 | Apeductul din Lyon — sifonul inversat | `120 M` — water that climbs a valley | presiune hidrostatică, 9 țevi de plumb paralele |
| 10 | Ușile automate ale lui Heron | `FIRE` opened these temple doors by itself | aer încălzit → apă → contragreutate |
| 11 | Baalbek — Piatra femeii însărcinate (1,000 t) | `1,000 TONS` — moved 800 m | role de lemn + capstane, calcul de forță |
| 12 | Stonehenge — transportul pietrelor albastre 230 km | `230 KM` — by hand | sănii pe grinzi lubrifiate, teste moderne |
| 13 | Pantheon — cupola de beton nearmat | `2,000 YRS` — the dome that should have collapsed | beton roman cu agregat ușor în trepte |
| 14 | Odometrul lui Vitruviu | `1 MILE` — counted by dropping a pebble | tren de angrenaje 400:1 |
| 15 | Qanat-urile persane | `3,000 KM` — of tunnels dug by hand | gravitație, puțuri de aerisire, pantă 1:1000 |
| 16 | Catapulta cu torsiune (ballista) | `400 M` — a bolt through a shield | arcuri de tendon răsucit, kg de energie |
| 17 | Turnul vânturilor din Atena — ceas cu apă | `24 H` — the first clock tower | clepsidră cu flotor + angrenaj |
| 18 | Marele Zid — mortar cu orez | `RICE` — the glue that holds the Great Wall | amilopectină + var → cristalizare |
| 19 | Pompa lui Ctesibius (pompieri romani) | `60 M` — a Roman fire hose | doi pistoane + cameră de aer |
| 20 | Barca solară a lui Keops | `4,500 YRS` — a ship buried in pieces, still floats | cedru cusut cu frânghie |

Fiecare se face în 2 fișiere: `episodes/NN-nume.json` + `engine/web/scenes/nume.js` (vezi README).
