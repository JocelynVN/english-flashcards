#!/usr/bin/env python3
"""Sinh nghĩa tiếng Việt ngắn (1–4 từ) cho từng mục từ vựng."""

from __future__ import annotations

import json
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS_FILE = ROOT / "public" / "data" / "words.json"
CACHE_FILE = Path(__file__).resolve().parent / "quick_vi_cache.json"
WORKERS = 10
_lock = threading.Lock()

POS_VI = {
    "noun": "danh từ",
    "verb": "động từ",
    "adjective": "tính từ",
    "adverb": "trạng từ",
    "preposition": "giới từ",
    "conjunction": "liên từ",
    "pronoun": "đại từ",
    "determiner": "mạo từ",
    "indefinite article": "mạo từ không xác định",
    "definite article": "mạo từ xác định",
    "exclamation": "thán từ",
    "number": "số",
    "modal verb": "động từ khiếm khuyết",
    "auxiliary verb": "trợ động từ",
    "infinitive marker": "to",
}


def load_cache() -> dict[str, str]:
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def clean_quick(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s*\([^)]*\)\s*$", "", text)
    text = re.sub(r"\s*,\s*[^,]+$", "", text)
    text = text.strip(" .")
    if len(text) > 48:
        text = text.split(",")[0].split(";")[0].strip()
    return text.lower()


def translate_quick(word: str, pos: str) -> str:
    from deep_translator import GoogleTranslator

    tr = GoogleTranslator(source="en", target="vi")
    pos_key = (pos or "").lower()
    pos_vi = POS_VI.get(pos_key, "")

    attempts = []
    if pos_vi:
        attempts.append(f"{word}, {pos_vi}")
    attempts.append(word)

    for query in attempts:
        raw = clean_quick(tr.translate(query))
        if raw and raw.lower() != word.lower():
            return raw

    return raw if attempts else word


def translate_entry(entry: dict) -> tuple[str, str]:
    return str(entry["id"]), translate_quick(entry["word"], entry.get("pos", ""))


def main() -> None:
    if not WORDS_FILE.exists():
        raise SystemExit("Chạy build_words.py trước.")

    words: list[dict] = json.loads(WORDS_FILE.read_text(encoding="utf-8"))
    cache = load_cache()
    pending = [e for e in words if str(e["id"]) not in cache or not cache.get(str(e["id"]))]
    done_before = len(words) - len(pending)
    print(f"Đã có {done_before} dịch nhanh, còn {len(pending)} mục...", flush=True)

    completed = done_before
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(translate_entry, e): e for e in pending}
        for future in as_completed(futures):
            entry = futures[future]
            try:
                key, vi = future.result()
            except Exception as exc:
                print(f"Lỗi {entry['word']}: {exc}", file=sys.stderr, flush=True)
                key, vi = str(entry["id"]), entry["word"]

            with _lock:
                cache[key] = vi
                save_cache(cache)
                completed += 1
                if completed % 50 == 0 or completed == len(words):
                    print(f"[{completed}/{len(words)}] {entry['word']} → {vi}", flush=True)

    for entry in words:
        entry["meaning_vi"] = cache.get(str(entry["id"]), "")

    WORDS_FILE.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Xong — {len(words)} từ có dịch nhanh.", flush=True)


if __name__ == "__main__":
    main()
