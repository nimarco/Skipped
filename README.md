# Skipped

You overslept and skipped CSE 2004. The quiz code is up on the projector, and the syllabus says sharing access codes is academic dishonesty, so your friends won't just text it to you. They'll send hints instead. Guess today's code on your laptop before class ends at 2:20.

Every hint makes your friends wait to reply, so the room jumps forward in time and the late penalty grows. One word a day, the same for everyone.

**Play:** https://nimarco.github.io/Skipped/

## How it's built

Plain HTML, CSS and JavaScript modules. No framework, no build step, no API keys.

| API | What it does in the room |
|---|---|
| Wikipedia REST API | The projector slide photo and the "fill in the blank" sentence |
| Wikidata | Related things (what it's made of, used for, has) |
| Datamuse | Words that rhyme with it |
| iNaturalist | A friend's photo of a real plant or animal seen near St. Louis |
| Wikimedia Commons + Free Dictionary | The whispered voice memo (a real pronunciation recording) |
| Open-Meteo | St. Louis weather on the window: rain, snow, clouds |
| Web Audio | Every sound, synthesized; the muffled voice memo |
| Canvas | The blurry, keystoned projector photo with heads in the way |
| Web Storage | Your progress, streaks, the wall calendar and your record |
| Clipboard | Sharing your result |
| Notifications, Vibration | Texts that arrive while you're in another tab; the phone buzz |

The daily word list (`data/words.js`) was built once from Wikipedia's Vital Articles.

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000.
