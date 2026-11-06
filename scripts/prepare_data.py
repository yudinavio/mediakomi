#!/usr/bin/env python3
"""Одноразовый скрипт подготовки данных для игры «Медиакоми».

Читает CSV с объявлениями Авито, скачивает до 3 фото на лот,
сжимает их в WebP и генерирует data.js с пулом лотов.

Запуск:
    python3 -I scripts/prepare_data.py
"""
import csv
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

CSV_PATH = Path("/Users/alinayudina/Downloads/creative_hse_2026 - квартиры коми.csv")
ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "img"
MAX_PHOTOS = 3
MAX_WIDTH = 800
WEBP_QUALITY = 75
USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"


def parse_price(raw: str) -> int | None:
    digits = re.sub(r"[^\d]", "", raw or "")
    return int(digits) if digits else None


def download_photo(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        img = Image.open(__import__("io").BytesIO(data))
        img = img.convert("RGB")
        if img.width > MAX_WIDTH:
            img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
        img.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)
        return True
    except Exception as e:  # noqa: BLE001 — сеть/битые картинки не должны валить сборку
        print(f"    ! skip {url[:80]}: {e}")
        return False


def main() -> None:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    lots = []
    skipped = 0

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = (row.get("ссылка") or "").strip()
            price = parse_price(row.get("цена") or "")
            photos = [v.strip() for k, v in row.items() if k and k.startswith("фото") and v and v.strip()]
            if not url or not price or not photos:
                skipped += 1
                continue

            m = re.search(r"_(\d{6,})\?", url)
            lot_id = m.group(1) if m else f"lot{len(lots) + 1}"

            saved = []
            for i, photo_url in enumerate(photos[:MAX_PHOTOS], start=1):
                dest = IMG_DIR / f"{lot_id}_{i}.webp"
                if download_photo(photo_url, dest):
                    saved.append(f"assets/img/{dest.name}")

            if not saved:
                skipped += 1
                continue

            lots.append({
                "id": lot_id,
                "url": url,
                "price": price,
                "desc": (row.get("описание") or "").strip(),
                "street": (row.get("цлица") or row.get("улица") or "").strip(),
                "photos": saved,
            })
            print(f"  + {lot_id}: {price} ₽, {len(saved)} фото — {lots[-1]['desc']}")

    out = ROOT / "data.js"
    out.write_text("const LOTS = " + json.dumps(lots, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"\nИтого: {len(lots)} лотов, пропущено {skipped}. data.js: {out}")


if __name__ == "__main__":
    sys.exit(main())
