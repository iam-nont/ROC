# ROC - RO Classic Database TH

## Project Overview
เว็บฐานข้อมูล Ragnarok Online Classic TH (Moonlight/Baphomet Server by Gravity Game Tech)
ข้อมูลทั้งหมดต้องตรงกับ server จริงของไทย ไม่ใช่ generic rAthena

## Tech Stack
- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (ไม่มี framework)
- **Theme**: Dark mode, accent color `#2ecc71` (green)
- **Language**: Thai (`lang="th"`)
- **Data**: Static JS files generated จาก Python scripts
- **Hosting**: GitHub Pages (repo: `iam-nont/ROC`)
- **Data Source**: Game client GRF + rAthena DB + Divine Pride

## Project Structure
```
ROC/
├── CLAUDE.md                    # ไฟล์นี้ - conventions & workflow
├── .claude/
│   ├── settings.local.json      # permissions
│   └── agents/                  # agent specifications
│       ├── pm.md                # Project Manager
│       ├── ui-designer.md       # UI Designer
│       ├── frontend-dev.md      # Frontend Developer
│       ├── data-engineer.md     # Data Engineer
│       └── qa.md                # QA Engineer
├── web/
│   ├── index.html               # Main SPA (single page app)
│   ├── data.js                  # Items data (6.8MB)
│   ├── monster_data.js          # Monster stats + prices (730KB)
│   ├── spawn_data.js            # Map spawn data (167KB)
│   ├── map_grid.js              # World map grid (163 cells)
│   ├── map_connections.js       # Warp connections + dungeon groups
│   ├── roc_map.jpg              # World map background (1280x1024)
│   ├── guide_map_2025.png       # Mascot logo
│   └── minimaps/                # 281 minimap PNGs
├── *.py                         # Python scripts (data extraction/generation)
├── *.lua                        # Lua game data files
└── spawns/                      # Raw spawn data (fields/ + dungeons/)
```

## Key Files
- `web/index.html` — Main app ทุก feature อยู่ในไฟล์เดียว (tabs: Items, Cards, Monsters, World Map)
- `web/data.js` — `const ALL_ITEMS = [...]` ข้อมูล item ทั้งหมด
- `web/monster_data.js` — `const MONSTER_DATA = [...]` ข้อมูล monster + `const ITEM_PRICES = {...}` ราคา
- `web/spawn_data.js` — `const SPAWN_DATA = {...}` ข้อมูล spawn ตาม map

## Conventions

### HTML/CSS
- ทุก feature อยู่ใน `web/index.html` ไฟล์เดียว (SPA)
- CSS ใช้ custom properties (variables) กำหนด theme
- Layout ใช้ flexbox + CSS grid
- Responsive design ด้วย media queries
- Tab system: แต่ละ tab มี `data-tab` attribute

### JavaScript
- Vanilla JS เท่านั้น (ไม่มี framework/library)
- Data load ผ่าน `<script src="data.js">` ใน HTML
- Search/filter ทำ client-side
- Lazy rendering สำหรับ list ใหญ่ (virtual scroll)

### Python Scripts
- ใช้ `python` command (ไม่ใช่ `python3` — Windows)
- Script อยู่ที่ root directory
- Output ไปที่ `web/` directory
- Encoding: UTF-8

### Git / GitHub
- Repo: `iam-nont/ROC` (hobby project account)
- Push ต้อง switch account: `gh auth switch --user iam-nont` → push → switch back
- Branch: `master`
- GitHub Pages deploy อัตโนมัติผ่าน GitHub Actions

---

## Multi-Agent Team Workflow

### หลักการทำงาน
1. **PM เป็น single point of contact** — user สื่อสารผ่าน PM เท่านั้น
2. PM รับ task → วิเคราะห์ → แบ่งงานให้ agent → รวบรวมผล → รายงาน user
3. Agent ทำงานอิสระ แต่ต้อง coordinate กันถ้างานข้ามขอบเขต
4. **สื่อสารภาษาไทย** กับ user ทุกครั้ง

### Agent Team
| Agent | หน้าที่หลัก | ไฟล์ที่ดูแล |
|-------|------------|------------|
| **PM** | รับงาน, แบ่ง task, ติดตามผล, รายงาน | - |
| **UI Designer** | ออกแบบ UI/UX, สี, layout, responsive | `web/index.html` (CSS) |
| **Frontend Dev** | เขียน HTML/CSS/JS, feature implementation | `web/index.html` (HTML+JS) |
| **Data Engineer** | Python scripts, data extraction/generation | `*.py`, `web/*.js` (data) |
| **QA** | ทดสอบ, ตรวจข้อมูล, browser check | ทุกไฟล์ |

### Workflow Sequence
```
User → PM (สั่งงาน)
  PM → วิเคราะห์ + แบ่ง subtasks
  PM → Delegate ให้ agents (parallel ได้)
    Agents → ทำงาน + coordinate กัน
  PM → รวบรวมผล
PM → User (รายงาน + ส่งมอบ)
```

### กฎสำคัญ
- PM report ให้ user เท่านั้น — agent ไม่ report ตรง
- PM ตัดสินใจ technical decisions ได้เอง (ไม่ถาม user ทุกเรื่อง)
- ถ้ามีปัญหา: PM รายงาน problem + recommended solution → user ตัดสินใจ
- Status report สรุปสั้นๆ ไม่ต้อง detail มาก
- **Pragmatic over perfect** — ทำให้ใช้งานได้ ไม่ over-engineer

### Quality Checklist (ก่อนส่งมอบ)
- [ ] UI แสดงผลถูกต้องบน desktop + mobile
- [ ] ข้อมูลตรงกับ server ROC Classic TH
- [ ] Search/filter ทำงานปกติ
- [ ] ไม่มี JavaScript error ใน console
- [ ] Performance ไม่กระตุก (data ใหญ่ต้อง lazy load)
