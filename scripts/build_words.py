#!/usr/bin/env python3
"""Tải và chuẩn hóa danh sách Oxford 3000 thành words.json."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/winterdl/"
    "oxford-5000-vocabulary-audio-definition/master/data/oxford_3000.json"
)
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "data" / "words.json"
MAX_WORDS = 3000


def fetch_source() -> dict:
    print(f"Đang tải dữ liệu từ {SOURCE_URL}...")
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize(raw: dict) -> list[dict]:
    """Lấy tối đa 3000 mục Oxford (giữ các nghĩa/loại từ khác nhau)."""
    entries: list[dict] = []

    for item in raw.values():
        word = (item.get("word") or "").strip().lower()
        if not word:
            continue

        entries.append(
            {
                "id": len(entries),
                "word": word,
                "pos": item.get("type") or "",
                "cefr": (item.get("cefr") or "").upper(),
                "ipa_us": item.get("phon_n_am") or "",
                "ipa_uk": item.get("phon_br") or "",
                "definition": item.get("definition") or "",
                "definition_vi": "",
                "example": item.get("example") or "",
            }
        )

        if len(entries) >= MAX_WORDS:
            break

    return entries


def apply_vi_cache(entries: list[dict]) -> list[dict]:
    cache_path = Path(__file__).resolve().parent / "vi_cache.json"
    if not cache_path.exists():
        return entries
    cache = json.loads(cache_path.read_text(encoding="utf-8"))
    for entry in entries:
        entry["definition_vi"] = cache.get(str(entry["id"]), "")
    return entries


def main() -> None:
    raw = fetch_source()
    words = apply_vi_cache(normalize(raw))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã ghi {len(words)} từ vào {OUTPUT}")


if __name__ == "__main__":
    main()
