# 三關謎城 · The Three Gates

An original three-act browser puzzle with a real-time 3D birthday-kitchen finale.

**三關解謎 · 答對才過關** — three gates, three kinds of puzzles, and a door that only opens on the right answer.

- **Live commercial site:** https://s20250051-cpu.github.io/ting123/
- **Play the game:** https://s20250051-cpu.github.io/ting123/play.html
- **Repository:** https://github.com/s20250051-cpu/ting123
- **Creator:** **2B 劉清婷** · Class 2B
- **Languages:** Traditional Chinese (繁體中文) and English

---

## 專案簡介 / About the project

《三關謎城》是一場約 5–10 分鐘的瀏覽器解謎體驗。玩家要依序通過三道門：

1. **數學題 · 齒輪鐘樓** — 從齒輪算式推算出三個符號，解開停擺的鐘塔。
2. **密室逃脫 · 無聲書房** — 調查書架、畫作、掛鐘與抽屜，按紙條順序拼出四位數密碼。
3. **生日謎題 · 缺席的日期** — 從乘積與加總找出唯一日期，再走進 Three.js 即時 3D 廚房，攪拌、烘焙、裝飾生日蛋糕。

所有謎題每次重新生成：數學數值、密室線索與順序、生日日期與蛋糕食譜都不一樣。遊戲支援提示、計時、音效開關、最佳紀錄、手機版面和 WebGL 備援操作。

The Three Gates is a five-to-ten-minute browser puzzle in three acts: a clockwork mathematics chamber, a locked study escape room, and a birthday riddle that leads into a real-time Three.js kitchen. Puzzles regenerate on every run. Hints, timer, sound toggle, best record, responsive layout and a WebGL fallback are included.

## 商業網站 / Commercial site

The root page is a bilingual product site introducing the experience: the three chapters, the 3D kitchen, features, use cases, creator story and FAQ. The game itself lives on `play.html` so the marketing site can use a full editorial layout without changing the game's mechanics or asset paths.

- Marketing site: `index.html` + `site.css` + `site.js`
- Game: `play.html` + `styles.css` + `app.js` + `kitchen.js` + `play-lang.js`
- Shared visual assets: `assets/`
- Three.js r149 is vendored locally at `vendor/three.min.js`; there are no external runtime dependencies.

### 語言 / Language

Choose **中** or **EN** on the site, or use `?lang=zh-Hant` / `?lang=en`. The preference is stored in `localStorage` and passed into the game. The game landing page has its own language switch; once a run begins, the language is fixed for that run.

## 本機執行 / Run locally

No build step is required. From this directory:

```bash
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/> for the commercial site or <http://127.0.0.1:4173/play.html> for the game.

## 功能 / Features

- Three complete puzzle levels with randomized content on every run
- Three.js r149 3D kitchen with mixing, baking, strawberries and candles
- Clickable 3D objects plus accessible button controls
- Two-stage hints per level; wrong answers never open a gate
- Timer, mistake/hint counters and a personal best stored locally
- Synthesized Web Audio sound, with a mute control
- Traditional Chinese and English copy across the site and game
- Responsive layout for desktop, tablet and phone
- Keyboard paths, visible focus, screen-reader labels and `prefers-reduced-motion` support
- WebGL fallback that keeps the cooking steps playable
- SEO metadata, Open Graph cover, JSON-LD, `robots.txt` and `sitemap.xml`

## 技術 / Built with

- Vanilla HTML, CSS and JavaScript (no framework, no build step)
- Hand-drawn SVG scenes and CSS animation
- Three.js r149, vendored as a UMD global
- Web Audio API synthesis
- `localStorage` for language, sound and best record
- GitHub Pages branch deployment from `main`

## 作者 / Author

**2B 劉清婷**  
Creator · Designer · Developer

Class 2B · 2026

## 授權 / License

Original project work by **2B 劉清婷**. Please contact the author before commercial redistribution.
