# Tech Breakdown — formula Shorts

## Triplu hook (primele 3 secunde)
| # | Tip | Ce face | Exemplu (01-microchip) |
|---|-----|---------|------------------------|
| 1 | **Vizual** | Mișcare violentă din primul cadru (explozie, slam, flash + screen shake + impact sonor). Nimic static. | Telefonul explodează în straturi la 0.1 s |
| 2 | **Text** | Un număr/afirmație șocantă pe ecran, animată (contor care urcă). Funcționează și cu sunetul oprit. | `20,000,000,000 — SWITCHES IN YOUR PHONE` |
| 3 | **Verbal** | O frază care deschide o buclă de curiozitate („cum e posibil?”). | „Nearly 20 billion tiny switches are flipping inside your phone. Right now.” + „Zero moving parts. So how do they switch?” |

## Emoție în fiecare secundă
- **Re-hook la ~5–6 s**: întrebare, contradicție („zero moving parts?”), zoom ×1,000,000, cifră nouă.
- Fiecare tăietură are sunet: whoosh la mișcări de cameră, pop la etichete, riser → impact la revelații.
- Subtitrări cuvânt-cu-cuvânt (cuvântul activ în teal) — 80 % se uită fără sunet.
- Camera nu stă niciodată pe loc (drift lent, zoom, orbit mic).

## Interacțiune (algoritmul iubește comentariile)
- O întrebare la mijloc cu răspuns *după* (ținem omul până la revelație): „Guess. How many times per second? Comment your number.” → muzica se oprește, ceas care ticăie, pill „COMMENT YOUR GUESS 👇”.
- Comentariu fixat care continuă discuția + tease pentru următorul clip.
- Alternative: „YES or NO in the comments”, „Colder or hotter?”, „Which one surprised you?”.

## Loop perfect (replay-uri = watch time peste 100 %)
- Ultimul cadru = primul cadru (telefonul se reasamblează exact în poziția de start).
- Ultima frază curge în prima: „…every message you've ever sent. **It's all just…**” → „**Nearly 20 billion tiny switches…**”.
- Fără „like & subscribe” vorbit la final (rupe loop-ul); doar un tag discret „FOLLOW FOR MORE BREAKDOWNS”.

## Structură (~40–48 s)
1. Hook triplu (0–5 s) → 2. Contradicție / re-hook → 3. Zoom în mecanism → 4. Piesele (callouts tehnice) →
5. Mecanismul OFF/ON (momentul „aha”) → 6. Întrebare pentru comentarii → 7. Revelație cu impact → 8. Scale-out → 9. Loop.

## Următoarele clipuri (scripturile sunt gata de scris cu skill-ul `tech-short`)
- **02 — Rocket nozzle**: „Saturn V burned ~13 tons of propellant every second — and the trick that made it fly sounds backwards.” (gazul accelerează când țeava se lărgește, peste Mach 1; răcire regenerativă; 9,000+ km/h). Întrebare: „Did you know this? YES or NO 👇”.
- **03 — Fridge**: „Your fridge doesn't make cold. Nothing can.” (ciclul compresor → condensator → ventil de expansiune → evaporator). Întrebare: „Fridge door open all day — kitchen gets colder or hotter?” → hotter.
- **04 — Data center**: „When you hit send, your message crosses an ocean in 0.1 s.” (servere, fibră optică, cabluri submarine).
- **05 — Hard drive vs SSD**, **06 — Microwave magnetron**, **07 — Jet engine**, **08 — Touchscreen**.

## Publicare
- Titlu: cifra + emoție + #shorts (sub 60 caractere vizibile). Descrierea și comentariul fixat sunt în `script.json` → `meta`.
- Postează constant la aceeași oră; primele 60 min răspunde la toate comentariile (crește distribuția).
