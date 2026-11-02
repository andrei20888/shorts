# Short #03: DISCIPLINE

**Fișiere** (2:30, 30fps, sunet -14 LUFS):
- `discipline_9x16.mp4` (1080×1920) — TikTok / Reels / YouTube Shorts
- `discipline_16x9.mp4` (1920×1080) — YouTube
- `hook_A|B|C_9x16.mp4` + `hook_A|B|C_16x9.mp4` — primele 6 s cu fiecare variantă de hook (A/B test)
- `thumbnail.jpg` (16:9) + `thumbnail_9x16.jpg` (cover vertical)

Copiile din repo sunt versiuni web (~90 MB, sub limita GitHub). Masterele H.264 CRF 18 se generează local:
`cd discipline && bash scripts/render-final.sh && node scripts/finish.mjs` → `discipline/out/release/`.

> ⚠️ **Sunet placeholder.** Muzica și SFX-urile sunt sintetizate temporar și **nu există încă voice-over** (`vo.mp3` e gol).
> Pune fișierele reale în `discipline/public/audio/` (aceleași nume — vezi `SFX_CUES.md`, `VOICEOVER.md`) și rulează din nou cele două comenzi de mai sus.

## Titlu (alege unul)
1. `He Woke Up at 5AM for 365 Days. This Is What Happened.`
2. `Day 1 vs Day 365 of Waking Up at 5AM`
3. `Nobody Was Coming to Save Him. #discipline`

## Descriere
```
Day 1: snooze. scroll. repeat.
Day 365: the bed is empty at 5:00.

Motivation gets you started. Discipline keeps you going.

What would you show up for, 365 days in a row? 👇

#discipline #motivation #5amclub #selfimprovement #animation #shorts
```

## Primul comentariu (pin)
```
Comment the DAY you're on 👇
Day 1 counts too. Nobody starts at 365.
```

## A/B pe hook
Postează aceeași poveste cu hook-uri diferite (TikTok / conturi diferite / zile diferite) și compară **retenția la 3 s** și **% vizionat**:

| Variantă | Hook vizual | Text pe ecran |
|---|---|---|
| A | split DAY 1 / DAY 365 → divizorul se sparge → slam zoom pe 5:00 | He woke up at 5AM / for 365 days. |
| B | close-up extrem: ochii se deschid, sprâncenele „trântesc” | Day 1 of becoming someone else. |
| C | camera cade din vârful scării până în pat | Every staircase starts in bed. |

## De ce e construit așa (ce ține retenția)
| Moment | Ce se întâmplă | Rol |
|---|---|---|
| 0:00 | alarmă din primul cadru, split DAY 1 / DAY 365, text cuvânt cu cuvânt | pattern interrupt + curiosity gap (vezi finalul înainte de început) |
| 0:01.5 | divizorul se sparge pe bass hit, zoom brusc pe ceasul de la 5:00 | impact sincronizat sunet + imagine |
| 0:02.5 | liniște totală + o bătaie de inimă, flash „This is what happened.” | contrast, te trage în poveste |
| 0:25 | sprâncenele trec din tristețe în hotărâre | turning point emoțional (fără cuvinte) |
| 0:39 | alarma sună — el stă deja în capul oaselor | momentul „am decis” |
| 0:47 | montaj pe beat (80 BPM), contorul DAY 30 → 180, alarma de 3 ori tot mai rapid | progres vizibil, rimă vizuală |
| 1:17 | ploaie, se oprește, scara nu se termină | îndoiala — partea cea mai relatabilă |
| 1:39 | bentița roșie (roșul alarmei) | callback, energia revine |
| 2:05 | același dormitor la 5:00 — patul e gol | payoff-ul hook-ului A |
| 2:12 | DAY 365 pe vârf, silueta în fața soarelui | climax |
| 2:30 | ultima bătaie de inimă | buclă către începutul video-ului (rewatch) |
