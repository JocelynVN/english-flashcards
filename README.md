# English Flashcards

Web app học **3.000 từ tiếng Anh phổ thông** (Oxford 3000) với **phiên âm IPA** (US/UK) và **phát âm** trực tiếp trên trình duyệt.

## Tính năng

- **3.000 từ** phổ biến nhất, sắp xếp A–Z
- **Phiên âm IPA** — chuyển đổi giọng Mỹ 🇺🇸 / Anh 🇬🇧
- **Phát âm** — Dictionary API + Text-to-Speech dự phòng
- **Hai chế độ**: lưới thẻ và học flashcard (lật thẻ)
- **Lọc CEFR** (A1 → C2), tìm kiếm theo từ hoặc nghĩa
- **Theo dõi tiến độ** — đánh dấu từ đã thuộc (lưu localStorage)

## Cài đặt & chạy

```bash
cd english-flashcards
npm install
npm run build:data   # tải & tạo public/data/words.json
npm run dev          # http://localhost:5173
```

Build production:

```bash
npm run build
# thư mục dist/ sẵn sàng deploy
```

## Deploy lên GitHub Pages

### Bước 1 — Tạo repo trên GitHub

1. Vào [github.com/new](https://github.com/new)
2. Tên repo: **`english-flashcards`** (nếu đổi tên, sửa `VITE_BASE` trong `.github/workflows/deploy.yml`)
3. **Không** tick "Add README" (repo local đã có sẵn)

### Bước 2 — Push code lên GitHub

```bash
cd english-flashcards
git add -A
git commit -m "Initial commit: English flashcards app"
git remote add origin https://github.com/<username>/english-flashcards.git
git push -u origin main
```

### Bước 3 — Bật GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → Source: chọn **GitHub Actions**
3. Push lên `main` (hoặc vào tab **Actions** → chạy workflow **Deploy GitHub Pages**)

Sau ~1–2 phút, site sẽ có tại:

```
https://<username>.github.io/english-flashcards/
```

### Lưu ý

- Workflow tự build mỗi khi push lên `main`
- Phát âm cần internet (Dictionary API)
- Nếu repo tên khác, sửa dòng `VITE_BASE: "/english-flashcards/"` trong `.github/workflows/deploy.yml`

## Phím tắt (chế độ học thẻ)

| Phím | Hành động |
|------|-----------|
| `Space` | Lật thẻ |
| `←` `→` | Thẻ trước / sau |

## Cấu trúc

```
english-flashcards/
├── index.html
├── src/
│   ├── main.js       # logic app
│   └── style.css
├── scripts/
│   └── build_words.py  # tạo dữ liệu từ Oxford 3000
└── public/data/
    └── words.json    # 3000 từ (sinh bởi script)
```

## Nguồn dữ liệu

- Từ vựng & IPA: [winterdl/oxford-5000-vocabulary-audio-definition](https://github.com/winterdl/oxford-5000-vocabulary-audio-definition) (Oxford 3000)
- Audio: [Free Dictionary API](https://dictionaryapi.dev/)

## Giấy phép

MIT — dữ liệu từ vựng tuân theo giấy phép của nguồn gốc.
