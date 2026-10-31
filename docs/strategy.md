# Strategia Time Lapse Earth — Shorts care prind

## 1. Formula „triple hook" (primele 3 secunde)

Fiecare Short lovește simultan pe trei canale în secunda 0:

| Canal | Ce facem | În pipeline |
|---|---|---|
| **Vizual** | Imaginea e deja „în mișcare": zoom-punch pe primul frame, contor de ani uriaș, coastă/lac/pădure care pare că urmează să se schimbe | `fx: ["punch"]` pe primul beat, HUD cu an mare |
| **Text** | O propoziție-șoc cu *curiosity gap* („In 1990 this was just sand") afișată mare, cuvânt cu cuvânt | `style: "hook"`, caption la y=720 |
| **Audio** | Voce care intră în primele 0,2 s + impact/whoosh + puls (heartbeat) pe beat | voce Kokoro + `sfx_whoosh` + kick la fiecare beat |

Al doilea hook (secunda ~3) e o **promisiune + instrucțiune**: „Watch the sea grow a palm tree".
Verbul la imperativ („Watch", „Keep your eyes on…", „Follow the river") îi spune spectatorului
*unde să se uite* — asta crește retenția pentru că ochiul are un job.

## 2. Harta retenției (ce se întâmplă în fiecare secundă)

```
0–3 s   HOOK 1 + HOOK 2     șoc + promisiune, contorul stă pe anul de start
3–8 s   SETUP               „Keep your eyes on the coast" — direcționăm atenția
8–24 s  TIME-LAPSE          contorul aleargă; la fiecare 2–3 s un micro-payoff (o replică
                            nouă = o schimbare vizibilă nouă); zoom lent continuu;
                            pattern interrupt (punch / scan-line) la fiecare 5–7 s
24–27 s CLIMAX              „And when the sun goes down…" → flash + shake + noaptea cade:
                            orașul se aprinde cyan/alb. Acesta e momentul de „wow" și
                            de share.
27–31 s STAT                cifra mare („34 years. From orbit.") + zoom în detaliu
31–35 s EMOȚIE              replica „quiet", font mai mic, muzica se deschide (acord major):
                            „Every light is a life that wasn't here in 1990"
35–41 s CTA + INTERACȚIUNE  întrebare la care se răspunde în 2 secunde + handle + follow
41 s    REWIND LOOP         0,8 s de derulare înapoi cu glitch până la primul frame →
                            video-ul se închide seamless → rewatch (semnal puternic pt algoritm)
```

Reguli: nicio secundă fără schimbare pe ecran (contorul, zoomul, norii, captions-ul care
se schimbă la 3 cuvinte). Muzica are un *riser* de 3 s înainte de climax și un impact pe reveal.

## 3. Emoție în fiecare secundă

Arcul emoțional al fiecărui episod: **uimire → tensiune → șoc → melancolie/speranță → apartenență**.

- Uimire: scara („visible from space", „17 million").
- Tensiune: ritmul crește (plucks mai tari, contorul accelerează), replici scurte.
- Șoc: climaxul vizual (noaptea, bazinul dispărut, scheletul pădurii).
- Melancolie/speranță: beat-ul `quiet` — o propoziție umană, la persoana a doua
  („Your phone was probably built down there").
- Apartenență: CTA care îl pune pe spectator în poveste („Pause on the year you were born").

## 4. Mecanici de interacțiune (fiecare episod are minimum două)

| Mecanică | Exemplu | De ce funcționează |
|---|---|---|
| **Pause-bait** | „Pause on the year you were born" | pauza = watch-time + rewatch |
| **Comment keyword** | „Type FOREST if this should stop" | comentarii ușoare, în masă |
| **Vot A/B** | „Tokyo or Mumbai next? Vote" | dezbatere în comentarii; următorul episod devine „ales de voi" |
| **Yes/No** | „Would you move here? Yes or no" | răspuns în 1 secundă |
| **Localizare** | „Comment where you're watching from" | comunitate, comentarii lungi |
| **Cliffhanger de serie** | „Next: a city that sank 10 metres. Follow." | follow pentru episodul următor |

Comentariul fixat (din `.meta.md`) repetă întrebarea și promite că răspunsul câștigător devine
episod. Răspunde la primele 20 de comentarii în prima oră.

## 5. Zone sigure și format

1080×1920, 30 fps, H.264 high, −14 LUFS. Tot textul stă între y=230 și y=1490 și la stânga de
x=900 (butoanele like/comment/share). Contorul de ani sus-centru, hook-urile sub el, captions
în treimea de jos a zonei sigure, CTA la y≈1050.

## 6. Upload checklist

1. Titlu din `.meta.md` (≤100 caractere, începe cu hook-ul, termină cu `#shorts`).
2. Descriere din `.meta.md` (prima linie = hook, apoi context + „Stylized satellite reconstruction").
3. Hashtag-uri: 3–5 în descriere (`#Shorts` obligatoriu).
4. Comentariu fixat imediat după publicare.
5. Thumbnail: `output/<id>.thumb.jpg` (frame-ul de la climax) — opțional, Shorts folosește frame-ul.
6. Publicare: 1 Short/zi, aceeași oră (test: 17:00 și 21:00 ora publicului țintă US/EU; păstrează ce dă cel mai bun „viewed vs swiped away").
7. Primele 3 episoade recomandate în ordine: Dubai (cel mai „wow"), Aral (emoțional), Rondônia (controversat → comentarii).

## 7. Backlog de episoade (deja compatibile cu motorul)

Coastal/oraș: Lagos, Jakarta (+ scufundare), Singapore (reclamare de teren), Doha, Riyadh, Cairo New Capital, Mexico City, Chongqing, Mumbai, Tokyo Bay, Hong Kong Lantau (aeroport pe mare), Palm Jebel Ali.
Lacuri/apă: Lake Chad, Dead Sea, Lake Urmia, Lake Poopó, Great Salt Lake, Lake Mead (solo), Three Gorges.
Păduri/teren: Borneo (ulei de palmier), Mato Grosso, cercurile verzi din Arabia Saudită (apar și dispar), Great Green Wall, Dubai–Al Ain.
Format special: „Guess the city" (reveal-ul numelui la final), „Your birth year" (serie), „2050" (proiecții).
