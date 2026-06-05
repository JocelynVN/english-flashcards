#!/usr/bin/env python3
"""Dịch definition sang tiếng Việt, lưu cache để build_words.py tái sử dụng."""

from __future__ import annotations

import json
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS_FILE = ROOT / "public" / "data" / "words.json"
CACHE_FILE = Path(__file__).resolve().parent / "vi_cache.json"
WORKERS = 8
_lock = threading.Lock()


def load_cache() -> dict[str, str]:
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def translate_mymemory(text: str) -> str:
    params = urllib.parse.urlencode({"q": text, "langpair": "en|vi"})
    url = f"https://api.mymemory.translated.net/get?{params}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    translated = data.get("responseData", {}).get("translatedText", "")
    if not translated or translated.upper() == text.upper():
        raise ValueError("empty translation")
    return translated


def translate_google(text: str) -> str:
    from deep_translator import GoogleTranslator

    return GoogleTranslator(source="en", target="vi").translate(text[:4500])


def translate(text: str) -> str:
    try:
        return translate_google(text)
    except Exception:
        return translate_mymemory(text)


def translate_entry(entry: dict) -> tuple[str, str]:
    definition = entry.get("definition", "").strip()
    if not definition:
        return str(entry["id"]), ""
    return str(entry["id"]), translate(definition)


def main() -> None:
    if not WORDS_FILE.exists():
        raise SystemExit("Chạy build_words.py trước để tạo words.json")

    words: list[dict] = json.loads(WORDS_FILE.read_text(encoding="utf-8"))
    cache = load_cache()
    pending = [e for e in words if str(e["id"]) not in cache or not cache.get(str(e["id"]))]
    done_before = len(words) - len(pending)
    print(f"Đã có {done_before} bản dịch, còn {len(pending)} mục...", flush=True)

    completed = done_before
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(translate_entry, e): e for e in pending}
        for future in as_completed(futures):
            entry = futures[future]
            try:
                key, vi = future.result()
            except Exception as exc:
                print(f"Lỗi {entry['word']}: {exc}", file=sys.stderr, flush=True)
                key, vi = str(entry["id"]), entry.get("definition", "")

            with _lock:
                cache[key] = vi
                save_cache(cache)
                completed += 1
                if completed % 25 == 0 or completed == len(words):
                    print(f"[{completed}/{len(words)}] {entry['word']}", flush=True)

    for entry in words:
        entry["definition_vi"] = cache.get(str(entry["id"]), "")

    WORDS_FILE.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Xong — {len(words)} từ có nghĩa tiếng Việt.", flush=True)


if __name__ == "__main__":
    main()
