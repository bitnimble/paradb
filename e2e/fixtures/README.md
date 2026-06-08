# E2E map fixtures

Two valid Paradiddle map zips with **distinct, known metadata** so the E2E
search/filter assertions are meaningful. The map title/artist/mapper/description
come from the `recordingMetadata` inside the `.rlrr`, not from any form field, so
controlled metadata has to live in the fixture itself.

| Fixture           | Title             | Artist          | Mapper (creator) | Description                   |
| ----------------- | ----------------- | --------------- | ---------------- | ----------------------------- |
| `E2E_Map_One.zip` | E2E Map One Alpha | Aurora Borealis | MapperAlpha      | First e2e map uniquealphadesc |
| `E2E_Map_Two.zip` | E2E Map Two Beta  | Crimson Tide    | MapperBeta       | Second e2e map uniquebetadesc |

The audio tracks and album art are reused from the unit-test fixtures under
`src/services/maps/tests/files/` (`silence.ogg`, `album.jpg`).

The canonical metadata used by the tests lives in `e2e/fixtures.ts`, keep the two
in sync if you regenerate the zips.

## Regenerating

These are committed binaries (same as the `Test_valid.zip` unit fixtures). To
rebuild them, run from the repo root:

```python
# python3 - <<'PY'
import json, os, zipfile
SRC = "src/services/maps/tests/files"
silence = open(f"{SRC}/silence.ogg", "rb").read()
album = open(f"{SRC}/album.jpg", "rb").read()

def build(name, folder, difficulty, title, artist, creator, description, complexity):
    rlrr = {
        "version": 0.6,
        "recordingMetadata": {"title": title, "description": description,
            "coverImagePath": "album.jpg", "artist": artist, "creator": creator,
            "length": 11.1814, "complexity": complexity},
        "audioFileData": {"songTracks": ["song.ogg"], "drumTracks": ["drums.ogg"],
            "calibrationOffset": 0.0},
        "instruments": [], "events": [], "bpmEvents": [{"bpm": 120.0, "time": 0.0}],
    }
    with zipfile.ZipFile(f"e2e/fixtures/{name}", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{folder}/", "")
        z.writestr(f"{folder}/{folder}_{difficulty}.rlrr", json.dumps(rlrr, indent=2))
        z.writestr(f"{folder}/album.jpg", album)
        z.writestr(f"{folder}/song.ogg", silence)
        z.writestr(f"{folder}/drums.ogg", silence)

build("E2E_Map_One.zip", "MapOne", "Easy", "E2E Map One Alpha", "Aurora Borealis",
      "MapperAlpha", "First e2e map uniquealphadesc", 3)
build("E2E_Map_Two.zip", "MapTwo", "Hard", "E2E Map Two Beta", "Crimson Tide",
      "MapperBeta", "Second e2e map uniquebetadesc", 4)
# PY
```
