# Time Lapse Earth — Shorts factory

Pipeline complet, 100 % offline și reproductibil, pentru canalul **@TimeLapseEarth**
(„Witness our planet change in seconds").

Dintr-un fișier JSON de episod iese un Short 1080×1920 gata de upload:
vizual satelitar procedural (orașe care cresc, lacuri care seacă, defrișări),
contor de ani + HUD, captions karaoke în zona sigură YouTube, voce AI,
coloană sonoră originală sincronizată pe beat-uri, loudness −14 LUFS,
thumbnail și metadata (titlu, descriere, hashtag-uri, comentariu fixat).

```
brand/          identitate: logo, banner, ghid de brand (make_brand.py le regenerează)
engine/         motorul: satview.py (randare satelit), overlay.py (HUD/captions),
                audio.py (voce + muzică + SFX), compose.py (asamblare MP4)
episodes/       scenariile (JSON) — fiecare = un Short
output/         MP4-urile randate + .thumb.jpg + .meta.md (titlu/descriere/pinned)
docs/           strategia de conținut (triple hook, retenție, interacțiune)
```

## Rulare

```bash
pip install -r requirements.txt
python3 scripts/fetch_models.py        # descarcă vocea Kokoro (~330 MB, o singură dată)
python3 -m engine.compose episodes/dubai.json --out output   # un episod (~8 min pe 4 core)
./render_all.sh                        # toate episoadele
python3 brand/make_brand.py            # regenerează logo + banner
```

Opțiuni utile: `--preview 8` randează doar primele 8 secunde (verificare rapidă),
`--workers N` numărul de procese, `--crf 18` calitate mai mare.

## Cum scrii un episod nou

Copiază un JSON din `episodes/` și schimbă:

- `years`, `coords`, `scene` (tipul de scenă: `coastal`, `lake`, `inland` + `fishbone`, paletă, orașe);
- `beats`: lista de replici. Fiecare beat are `vo` (textul rostit), opțional `caption`
  (textul afișat, dacă diferă), `style` (`hook`, `beat`, `stat`, `quiet`, `cta`, `interact`),
  `year` (anul la care ajunge contorul la finalul beat-ului), `night` (0–1), `cam`
  (zoom/poziție), `fx` (`punch`, `flash`, `shake`, `scan`, `glitch`), `climax: true` pe reveal.
- `meta`: titlu, descriere, hashtag-uri, comentariu fixat (ajung în `output/<id>.meta.md`).

Durata rezultă din voce (fiecare beat durează cât replica + `pad`). Ținta: 30–42 s.

## Ce e procedural și ce e real

Vizualul este o **reconstrucție satelitară stilizată** generată procedural (zgomot fractal,
câmpuri de creștere urbană, bloom pentru lumini). Nu sunt fotografii satelitare reale; faptele
din script (ani, cifre) sunt reale și verificate la scriere. Descrierile fiecărui episod
menționează asta („Stylized satellite reconstruction"). Dacă vrei imagini reale, pipeline-ul
acceptă frame-uri PNG în loc de `Scene.render` (vezi `_world()` în `engine/compose.py`):
exporți un timelapse din Google Earth Engine / NASA Worldview și îl pui ca fundal.

## Identitate vizuală

`brand/out/logo_800.png` (avatar YouTube), `brand/out/banner_2560x1440.jpg` (channel art;
tot textul este în zona sigură 1546×423), `brand/out/banner_preview_devices.png` arată cum
se decupează pe TV / desktop / mobil. Detalii în `brand/BRAND.md`.
