# PLAYBOOK — Ancient Tech Shorts

Reguli de producție pentru clipuri care prind: **triplu hook**, **emoție în fiecare secundă**, **interacțiune**, **buclă**.
Totul de mai jos e implementat în engine (compositor + build.py); aici e „de ce”-ul și cum scrii scripturi care îl folosesc.

## 1. Triple Hook v2 — „cold open” (0 – 3 s)

Regula de aur pentru doomscrolleri: **în primul cadru se vede deja payoff-ul în mișcare, cu textul-cârlig peste el**. Nimic nu se „construiește” în primele 3 secunde.

| Secunda | Ce se întâmplă | Cum se setează |
|---|---|---|
| **0.0** | impact audio + flash; modelul 3D complet, în starea de climax, în mișcare rapidă (blocul urcă pe rampă, șurubul se învârte cu apa, obeliscul se înclină); card mare de text vizibil din primul cadru (`IT'S INSIDE`, `UPHILL`, `455 TONS`) + tag roșu de context | `hook` în JSON; scena tratează `cue('assemble') < 0` ca stare „cold” (model complet, animație de climax) |
| **0.1** | vocea începe cu o propoziție de ≤ 9 cuvinte, fără pauze, care contrazice ceva: „The Great Pyramid has a ramp hidden inside it.” | primul `beat`, `cue: "cold"`, viteză 1.12 |
| **1.0** | tăietură dură de cameră (alt unghi) + `hit` | al doilea shot din `CamRig` cu `dur: 0.01`, `sfx: ["hit@1.0"]` |
| **1.9** | tăietură dură pe planul larg; modelul se „rebobinează” (draw-on rapid, 1,2 s) = începe explicația | `cue: "assemble"` pe al doilea beat, `sfx: ["hit@0.0"]` |
| **≤ 3.0** | a doua propoziție a vocii = promisiunea / open loop („and here's the trick”) | al doilea beat |

Reguli dure:
* **Lungime 28–36 s.** Retenția se măsoară procentual; un clip de 55 s cu 30 % = 17 s vizionate; același conținut în 32 s ține 60–70 %. Sub 40 s, fără excepție, până când canalul are retenție medie > 70 %.
* **O tăietură de cameră la fiecare 2–3 s** (`dur: 0.01` în `CamRig`), nu doar orbit lent. Fiecare tăietură are un `hit`.
* **Fără „…” în primele două beat-uri.** Pauzele vin după ce spectatorul a decis să rămână.
* **Cardul de hook nu face fade-in**: e pe ecran la cadrul 0 (alpha 1), se micșorează ușor (1.1 → 1) și iese pe tăietură.
* **Cover la 0,3 s** (`cover_t`): primul cadru pe care îl vede cineva în feed trebuie să aibă text + subiect luminos.

## 1b. Emoție, nu informație

Fiecare clip are un singur fir emoțional, ales înainte de script:
* **Neîncredere → „aha”** (șurubul: apa urcă singură; piramida: rampa e înăuntru)
* **Frică / miză** (obeliscul: o singură șansă, 3 ani de muncă se pot sparge)
* **Mister neînchis** (piramida: un gol de 30 m în care nu a intrat nimeni)
* **Satisfacție** (procesul care „se închide”: buzunarele de apă urcă, blocul ajunge sus)
Scriptul se termină pe emoția respectivă, nu pe o concluzie.

## 1c. Interacțiune care produce comentarii, nu „care episod vrei”

CTA-ul din clip pune o **întrebare cu miză personală sau o sarcină verificabilă**, cu două răspunsuri scurte:
* „Would you go in? A = yes, send me / B = no way” (identitate / curaj)
* „How many pockets did you count? A = 12 or fewer / B = more than 12” (sarcină → re-vizionare → comentariu)
* „Finish it today? A = raise it with cranes / B = leave it in the rock” (dezbatere)
Promisiunea pentru episodul următor merge în `cta.sub` și în comentariul fixat, condiționată („next, if this hits 1K likes: …”).

## 2. Structura de retenție (≈ 32 s)

```
0–2 s    COLD OPEN            payoff în mișcare + card text + prima propoziție (contradicția)
2–5 s    NUMIRE + PROMISIUNE  tăietură pe larg, draw-on rapid, „here's the trick”
5–9 s    NUMĂR-ȘOC            card numeric (1.6 KM / 0 PUMPS / 90°) + prompt roșu de sarcină (interacțiune 1)
9–20 s   MECANISM             2–3 beat-uri, o tăietură la fiecare beat, adnotări, readout-uri care numără
20–27 s  TWIST EMOȚIONAL      golul neexplorat / fisura / „nothing beats it” + al doilea card numeric
27–32 s  CTA cu miză          întrebare personală A/B (4,8 s), camera revine la cadrul din cold open → loop
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
