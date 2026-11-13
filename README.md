# Backing Track Studio

Type a chord chart, pick a style, and a band plays it on a loop. Built for music class.

## Features

- **Easy mode:** type a chart like `| C | G | Am | F |`.
- **Professional mode:** a bar grid with a time signature (4/4, 3/4, 2/4, 5/4, 6/8, 12/8, 7/8), chords on any beat or off-beat, and forms: Phrase (4 bars), Sentence (antecedent + consequent) and Song (two sentences).
- **Custom voicings:** `[C / E G C]` means left hand C, right hand E G C.
- **14 styles** with recorded piano, electric piano, bass and drums.
- **Soloists:** generated improvisation in the manner of Charlie Parker, Chick Corea and Oscar Peterson.
- **Mixer** with mute and solo, a speed trainer, transpose, and WAV export.

## Files

- `public/index.html` is the whole app.
- `public/class-tracks.json` is the class library. Add a track here and it shows up in the **Class library** tab for everyone.
- `public/samples/` holds the recorded instruments (see `CREDITS.md` there).

## Deploying

The site is hosted on Cloudflare and connected to this repository. Every push to `main` publishes automatically.

## Ask Piano Study Suite (AI coach)

`src/worker.js` serves the app and a `/api/teacher` endpoint that calls the Claude API with the
Piano Study Suite persona in `src/persona.txt`. To switch it on, add a secret named
`ANTHROPIC_API_KEY` to the Worker in Cloudflare (Workers & Pages → backing-track-studio →
Settings → Variables and Secrets). Optional: `TEACHER_MODEL` to change the model (default
`claude-sonnet-5-5`).
