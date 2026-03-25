"""
Build monster_data.js by merging:
1. ROC Classic TH official data (authoritative: stats, drops, maps)
2. rAthena pre-renewal data (supplementary: ID, aegisName, detailed stats)

ROC official = https://roc.gnjoy.in.th/monster/details/
"""
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── Manual name mapping: ROC name -> rAthena name (lowercase) ───────────────
# For 44 ROC monsters whose names don't directly match rAthena
ROC_TO_RA_NAME = {
    # Matched via div_id (aegisName)
    "acidus blue": "acidus",          # ACIDUS_ -> id 1716
    "acidus yellow": "acidus",        # ACIDUS -> id 1713  (disambiguated by div_id below)
    "antique firelock": "firelock soldier",  # ANTIQUE_FIRELOCK -> id 1403
    "archangeling": "arc angeling",   # ARCHANGELING -> id 1388
    "arclouse": "arclouze",           # ARCLOUSE -> id 1194
    "desert wolf baby": "baby desert wolf",  # DESERT_WOLF_B -> id 1107
    "egnigem cenia (mvp)": "egnigem cenia",  # B_YGNIZEM -> id 1658
    "evil cloud hermit": "taoist hermit",    # EVIL_CLOUD_HERMIT -> id 1412
    "ferus green": "ferus",           # FERUS_ -> id 1717
    "ferus red": "ferus",             # FERUS -> id 1714  (disambiguated by div_id below)
    "garm": "hatii",                  # GARM -> id 1252
    "garm baby": "baby hatii",        # GARM_BABY -> id 1515
    "golden bug": "golden thief bug", # GOLDEN_BUG -> id 1086
    "live peach tree": "enchanted peach tree",  # LIVE_PEACH_TREE -> id 1410
    "miyabi ningyo": "miyabi doll",   # MIYABI_NINGYO -> id 1404
    "mutant dragon": "mutant dragonoid",  # MUTANT_DRAGON -> id 1262
    "neraid": "nereid",               # NERAID -> id 1255
    "pecopeco": "peco peco",          # PECOPECO -> id 1019
    "pecopeco egg": "peco peco egg",  # PECOPECO_EGG -> id 1047
    "plasma blue": "plasma",          # PLASMA_B -> id 1697
    "plasma green": "plasma",         # PLASMA_G -> id 1695
    "plasma purple": "plasma",        # PLASMA_P -> id 1696
    "plasma red": "plasma",           # PLASMA_R -> id 1694
    "plasma yellow": "plasma",        # PLASMA_Y -> id 1693
    "rice cake boy": "dumpling child",  # RICE_CAKE_BOY -> id 1409
    "snake": "boa",                   # SNAKE -> id 1025
    "wicked nymph": "evil nymph",     # WICKED_NYMPH -> id 1416
    "wild ginseng": "hermit plant",   # WILD_GINSENG -> id 1413
    "worm tail": "wormtail",          # WORM_TAIL -> id 1024

    # Matched via fuzzy / manual (Lighthalzen biolab monsters)
    "alchemist armeyer": "armeyer dinze",     # L_ARMAIA -> id 1660
    "assassin eremes": "eremes guile",        # L_EREMES -> id 1635
    "bard kavach": "kavach icarus",           # L_KAVAC -> id 1662
    "blacksmith howard": "howard alt-eisen",  # L_HARWORD -> id 1636
    "crusader egnigem": None,                 # L_YGNIZEM -> no good match (use sprite_id)
    "dancer josephina": None,                 # L_DANCER -> not in rAthena
    "hunter cecil": "cecil damon",            # L_SHECIL -> id 1723
    "knight seyren": "seyren windsor",        # L_SEYREN -> id 1634
    "monk errende": "errende ebecee",         # L_EREND -> id 1661
    "priest margaretha": "margaretha sorin",  # L_MAGALETA -> id 1637
    "rogue wickebine": "wickebine tres",      # L_WHIKEBAIN -> id 1659
    "sage laurell": "laurell weinder",        # L_RAWREL -> id 1663
    "wizard kathryne": "kathryne keyron",     # L_KATRINN -> id 1896
    "king of the alley": None,                # B_SUPERNOVICE -> not in rAthena
    "the last one": None,                     # B_NOVICE -> not in rAthena
}

# For monsters with same rAthena name but different div_id, use div_id to disambiguate
# key = div_id.lower(), value = rAthena id
DIV_ID_TO_RA_ID = {
    "acidus_": 1716,   # Acidus Blue
    "acidus": 1713,    # Acidus Yellow
    "ferus_": 1717,    # Ferus Green
    "ferus": 1714,     # Ferus Red
    "plasma_b": 1697,
    "plasma_g": 1695,
    "plasma_p": 1696,
    "plasma_r": 1694,
    "plasma_y": 1693,
}


# Manual item name mapping: ROC name (normalized, lowercase) -> item DB name (lowercase)
ITEM_NAME_MAP = {
    # Possessive/apostrophe issues
    "animal's skin": "animal skin",
    "bear's foot": "bear's footskin",
    "black bear's skin": "black bear skin",
    "dragon's skin": "dragon skin",
    "gaoat's skin": "goat's skin",
    "poison toad's skin": "poison toad skin",
    "scorpion's tail": "scorpion tail",
    "scropion's nipper": "scorpion nipper",
    # Word order / naming differences
    "blossom of maneater": "maneater blossom",
    "root of maneater": "maneater root",
    "branch of dead tree": "dead branch",
    "wing of butterfly": "butterfly wing",
    "wing of fly": "fly wing",
    "dragon fly wing": "wing of dragonfly",
    "leaf of yggdrasil": "yggdrasil leaf",
    "seed of yggdrasil": "yggdrasil seed",
    "fruit of mastela": "mastela fruit",
    "leaflet of aloe": "aloe leaflet",
    "leaflet of hinal": "hinal leaflet",
    "key of clock tower": "clock tower key",
    "key of underground": "underground key",
    "fang of hatii": "fang of garm",
    "talon of griffin": "talon of griffon",
    "needle of alarm": "needle of alarm",
    "blade of pinwheel": "pinwheel",
    "contracts in shadow": "contract in shadow",
    "bookclip in memory": "memory bookmark",
    "starsand of witch": "witch starsand",
    "sword of grave keeper": "grave keeper's sword",
    "fragment of agony": "fragment of agony",
    "fragment of despair": "fragment of despair",
    "fragment of hatred": "fragment of hatred",
    "fragment of misery": "fragment of misery",
    "peco peco feather": "peco peco feather",
    # Name variations
    "blade lost in darkness": "blade of darkness",
    "bloodied shackle ball": "bloody shackle ball",
    "bone wand": "evil bone wand",
    "condensed white potion": "white slim potion",
    "condensed yellow potion": "yellow slim potion",
    "burn tree": "trunk",
    "cold magma": "cold magma",
    "cloud piece": "cloud crumb",
    "goggle": "goggles",
    "magestic goat": "majestic goat",
    "wizardy staff": "wizardry staff",
    "plate armor": "full plate",
    "safety helmet": "safety headgear",
    "cotton shirt": "cotton shirts",
    "crossbow": "crossbow [2]",
    "cutlas": "cutlus",
    "lemon": "lemon",
    "potato": "potato",
    "pumpkin": "pumpkin",
    "shrimp": "shrimp",
    "fresh fish": "fresh fish",
    "rice cake boy": "dumpling child card",
    # Typos in ROC data
    "adventurere's suit": "adventurer's suit",
    "alchol": "alcohol",
    "jack o  pumpkin": "jack o' pumpkin",
    "old japaness clothes": "old japan clothes",
    "spawns": "",  # HTML artifact
    "ellow herb": "yellow herb",
    "law": "",  # HTML artifact
    # Scroll naming
    "cold scroll 1-5": "cold bolt scroll 1-5",
    "cold scroll 2 5": "cold bolt scroll 2-5",
    "fire scroll 2-5": "fire bolt scroll 2-5",
    "fire scroll lv 3": "fire bolt scroll lv 3",
    "earth scroll level 1-5": "earth spike scroll",
    "wind scroll 1 5": "wind bolt scroll 1-5",
    "ghost scroll 1 3": "ghost bolt scroll 1-3",
    "ghost scroll lv 5": "ghost bolt scroll lv 5",
    "holy scroll 1 5": "holy bolt scroll 1-5",
    "heal scroll level 5": "heal scroll",
    "lightening bolt scroll level 5": "lightning bolt scroll level 5",
    "tree of archer 1": "tree of archer 1",
    "tree of archer 2": "tree of archer 2",
    "tree of archer 3": "tree of archer 3",
    # Equipment
    "katar of cold icicle": "katar of frozen icicle",
    "ice falchon": "ice falchion",
    "ring pommel sabe": "ring pommel sabre",
    "rust suriken": "rusty shuriken",
    "limpid celestial robe": "celestial robe",
    "morpheus's hood": "morpheus's hood",
    "satanic chain": "satanic chain",
    "shinobi's sash": "shinobi's sash",
    # Bijou items (may not exist in our DB)
    "blue bijou": "blue bijou",
    "red bijou": "red bijou",
    "green bijou": "green bijou",
    "yellow bijou": "yellow bijou",
    # Misc
    "elunium stone": "elunium",
    "oridecon stone": "oridecon",
    "yggdrasilberry": "yggdrasil berry",
    "valhalla's flower": "valkyrie flower",
    "popped rice": "popped rice",
    "nice sweet potato": "sweet potato",
    "steamed desert scorpions": "desert scorpions",
    "professional cooking kit": "professional cooking kit",
    "professional kit": "professional dye kit",
    "royal cooking kit": "royal cooking kit",
    "hard peach": "hard peach",
    "straw basket": "straw basket",
    "spoon stub": "spoon stub",
    "snow flowers": "snow flowers",
    "humma calm mind": "huuma calm mind",
    "huuma bird wing": "huuma bird wing",
    "hell fire": "hellfire",
    "dragon train": "dragon train",
    "fire dragon scale": "fire dragon scale",
    "three-headed dragon's head": "three-headed dragon's head",
    "gentleman's staff": "gentleman's staff",
    "golden ornament": "gold ornament",
    "great wing": "falcon wing",
    "smooth paper": "fine-grained paper",
    "hot hair": "hot hair",
    "mould powder": "mould powder",
    "mystery iron bit": "mystery iron bit",
    "stone piece": "stone fragment",
    "sway apron": "sway apron",
    "taegeuk plate": "taegeuk plate",
    "tassel": "tassel",
    "wooden block": "wooden block",
    "spiky heel": "spiky heel",
    "spinx helm": "sphinx helm",
    "crap shell": "crab shell",
    "colorful shell": "rainbow shell",
    "scales shell": "scale shell",
    "fright paper blade": "fright paper blade",
    "prohibition red candle": "prohibition red candle",
    "rune of darkness": "rune of darkness",
    "raccoon doll": "raccoon doll",
    "skeletal armor piece": "skeletal armor piece",
    "short leg": "short leg",
    "skul ring": "skull ring",
    "goggle": "goggles",
    "sweet gents": "sweet gents",
    "lyte": "lyte",
    "krierg": "krieger",
    "red chile": "red chili",
    "lizard scruff": "lizard scruff",
    "leopard talon": "leopard claw",
    "memorize book": "memorize book",
    "immotal stew": "immortal stew",
    "immortal stew": "immortal stew",
    "poison powder": "poison powder",
    "bamboo cut": "bamboo",
    "fig leaf": "fig leaf",
    "pierrot nose": "pierrot nose",
    "broken armor piece": "broken armor piece",
    "broken wine vessel": "broken wine vessel",
    "burning horse shoe": "burning horseshoe",
    "soft silk cloth": "soft silk",
    "shining scales": "shining scale",
    "snowy horn": "snowy horn",
    "tengu's nose": "tengu nose",
    "bass guitar": "guitar",
    "cardinal jewel": "cardinal jewel",
    "witched starsand": "witch starsand",
    "old hilt": "old hilt",
    "executioner's mitten": "executioner's glove",
    # Card naming (ROC monster name -> rAthena monster name Card)
    "antique firelock card": "firelock soldier card",
    "archangeling card": "arch angeling card",
    "christmas cookie card": "cookie card",
    "desert wolf babe card": "baby desert wolf card",
    "deleter card": "sky deleter card",
    "elder wilow card": "elder willow card",
    "yellow novus card)": "yellow novus card",
    "evil cloud hermit card": "taoist hermit card",
    "false angel card": "false angel card",
    "flying deleter card": "earth deleter card",
    "general egnigem cenia card": "boss egnigem card",
    "giant whisper card": "giant whisper card",
    "golden bug card": "golden thief bug card",
    "grove card": "groves card",
    "hatii babe card": "baby hatii card",
    "incant samurai card": "incantation samurai card",
    "jing guai card": "jing guai card",
    "live peach tree card": "enchanted peach tree card",
    "mao guai card": "mao guai card",
    "mi gao card": "mi gao card",
    "miyabi ningyo card": "miyabi doll card",
    "neraid card": "nereid card",
    "orc load card": "orc lord card",
    "pirate skeleton card": "pirate skeleton card",
    "poison toad card": "poison toad card",
    "savage babe card": "savage babe card",
    "seal card": "seal card",
    "shellfish card": "shellfish card",
    "side winder card": "sidewinder card",
    "skeleton prisoner card": "skeleton prisoner card",
    "skeleton worker card": "skeleton worker card",
    "thief bug egg card": "thief bug egg card",
    "thief bug female card": "thief bug female card",
    "thief bug male card": "thief bug card",
    "tower keeper card": "tower keeper card",
    "violy card": "violy card",
    "wanderer card": "wanderer card",
    "wicked nymph card": "evil nymph card",
    "worm tail card": "wormtail card",
    "yellow novus card)": "yellow novus card",
    "zealotus card": "zealotus card",
    "zhu po long card": "zhu po long card",
    "citrine": "citrine",
    "chakram": "chakram",
}


def normalize_item_name(name):
    """Normalize ROC item name for matching against items_merged.json."""
    n = name.strip()
    # Remove HTML artifacts
    if n.startswith('/') or n.startswith('<'):
        return ''
    # Fix smart quotes
    n = n.replace('\u2019', "'").replace('\u2018', "'")
    n = n.replace('\u201c', '"').replace('\u201d', '"')
    # Fix "X s Y" -> "X's Y" (ROC encoding issue)
    n = re.sub(r"(\w) s ", r"\1's ", n)
    # Fix underscore in card names
    n = n.replace('_', ' ')
    # Strip slot notation [0], [1], etc.
    n = re.sub(r'\s*\[\d+\]\s*$', '', n).strip()
    # Remove trailing )
    n = n.rstrip(')')
    return n


def parse_atk(atk_str):
    """Parse ATK string like '1180 – 2000' or '395-480' into [min, max]."""
    if not atk_str:
        return [0, 0]
    # Normalize separators (en-dash, em-dash, hyphen, tilde)
    s = atk_str.replace('\u2013', '-').replace('\u2014', '-').replace('~', '-')
    parts = [p.strip() for p in s.split('-') if p.strip()]
    if len(parts) == 2:
        try:
            return [int(parts[0]), int(parts[1])]
        except ValueError:
            pass
    if len(parts) == 1:
        try:
            v = int(parts[0])
            return [v, v]
        except ValueError:
            pass
    return [0, 0]


def parse_rate(rate_str):
    """Convert ROC rate string like '1.5%' to integer (rAthena format: pct * 100)."""
    if not rate_str:
        return 0
    s = rate_str.strip().rstrip('%').strip()
    try:
        pct = float(s)
        return max(1, round(pct * 100))  # 1.5% -> 150, 0.01% -> 1
    except ValueError:
        return 0


def safe_int(val, default=0):
    """Convert string to int safely."""
    if val is None:
        return default
    try:
        return int(str(val).replace(',', '').strip())
    except (ValueError, TypeError):
        return default


def main():
    # ─── Load data sources ───────────────────────────────────────────────
    roc_file = os.path.join(BASE_DIR, 'roc_monsters_parsed.json')
    with open(roc_file, 'r', encoding='utf-8') as f:
        roc_monsters = json.load(f)
    print(f"ROC official: {len(roc_monsters)} monsters")

    ra_file = os.path.join(BASE_DIR, 'monsters.json')
    with open(ra_file, 'r', encoding='utf-8') as f:
        ra_monsters = json.load(f)
    print(f"rAthena: {len(ra_monsters)} monsters")

    items_file = os.path.join(BASE_DIR, 'items_merged.json')
    with open(items_file, 'r', encoding='utf-8') as f:
        items_data = json.load(f)
    print(f"Items: {len(items_data)} items")

    # ─── Build indexes ───────────────────────────────────────────────────
    # rAthena by name (lowercase) - prefer lowest ID (original monster, not clones)
    ra_by_name = {}
    for m in sorted(ra_monsters, key=lambda x: x['id']):
        name_key = m['name'].lower()
        if name_key not in ra_by_name:
            ra_by_name[name_key] = m

    # rAthena by id
    ra_by_id = {m['id']: m for m in ra_monsters}

    # Item name -> id (multiple strategies)
    item_by_exact = {}  # exact name match
    item_by_noslot = {}  # name without slot notation
    for it in items_data:
        name = it.get('identifiedDisplayName', '')
        if name:
            item_by_exact[name.lower()] = it['id']
            clean = re.sub(r'\s*\[\d+\]\s*$', '', name).strip()
            if clean.lower() not in item_by_noslot:
                item_by_noslot[clean.lower()] = it['id']

    # ─── Load existing item prices ───────────────────────────────────────
    prices_file = os.path.join(BASE_DIR, 'web', 'monster_data.js')
    item_prices = {}
    if os.path.exists(prices_file):
        with open(prices_file, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'const ITEM_PRICES\s*=\s*(\{.*?\});', content, re.DOTALL)
        if match:
            try:
                item_prices = json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
    print(f"Item prices: {len(item_prices)} entries")

    # ─── Match & merge ───────────────────────────────────────────────────
    merged = []
    stats = {'direct': 0, 'mapped': 0, 'div_id': 0, 'no_match': 0}
    unmatched_items = set()
    matched_items = 0
    total_drops = 0

    for roc in roc_monsters:
        name = roc['name']
        name_lower = name.lower()
        div_id = roc.get('div_id', '')

        # Find rAthena match
        ra = None

        # Strategy 1: Direct name match
        if name_lower in ra_by_name:
            ra = ra_by_name[name_lower]
            stats['direct'] += 1
        # Strategy 2: Manual name mapping
        elif name_lower in ROC_TO_RA_NAME:
            mapped_name = ROC_TO_RA_NAME[name_lower]
            if mapped_name and mapped_name.lower() in ra_by_name:
                ra = ra_by_name[mapped_name.lower()]
                # Disambiguate by div_id if needed
                if div_id.lower() in DIV_ID_TO_RA_ID:
                    ra = ra_by_id.get(DIV_ID_TO_RA_ID[div_id.lower()], ra)
                    stats['div_id'] += 1
                else:
                    stats['mapped'] += 1
            else:
                stats['no_match'] += 1
        else:
            stats['no_match'] += 1

        # Determine monster ID
        if ra:
            mon_id = ra['id']
            aegis = ra.get('aegisName', div_id)
        else:
            # Use sprite_id from ROC if available, otherwise generate from div_id hash
            mon_id = roc.get('sprite_id') or (90000 + len(merged))
            aegis = div_id

        # Determine class (Boss/Normal)
        hp = safe_int(roc.get('HP'))
        mon_class = 'Normal'
        if ra and ra.get('class') == 'Boss':
            mon_class = 'Boss'
        elif '(MVP)' in name:
            mon_class = 'Boss'
        elif hp >= 100000:
            mon_class = 'Boss'

        # Build drops with item ID matching
        drops = []
        for d in roc.get('drops', []):
            raw_name = d.get('item', '')
            norm_name = normalize_item_name(raw_name)
            if not norm_name:
                continue

            total_drops += 1
            item_id = 0

            # Try multiple matching strategies
            nl = norm_name.lower()
            if raw_name.lower() in item_by_exact:
                item_id = item_by_exact[raw_name.lower()]
            elif nl in item_by_exact:
                item_id = item_by_exact[nl]
            elif nl in item_by_noslot:
                item_id = item_by_noslot[nl]
            elif nl in ITEM_NAME_MAP:
                mapped = ITEM_NAME_MAP[nl]
                if mapped and mapped.lower() in item_by_exact:
                    item_id = item_by_exact[mapped.lower()]
                elif mapped and mapped.lower() in item_by_noslot:
                    item_id = item_by_noslot[mapped.lower()]
                elif not mapped:
                    continue  # Skip HTML artifacts
                else:
                    unmatched_items.add(f"{norm_name} -> {mapped}")
            else:
                # Try removing apostrophe as last resort
                no_apos = nl.replace("'s ", " ").replace("'s ", " ")
                if no_apos in item_by_exact:
                    item_id = item_by_exact[no_apos]
                elif no_apos in item_by_noslot:
                    item_id = item_by_noslot[no_apos]
                else:
                    unmatched_items.add(norm_name)

            if item_id:
                matched_items += 1

            drops.append({
                'itemId': item_id,
                'itemName': norm_name if norm_name != raw_name else raw_name,
                'rate': parse_rate(d.get('rate', '0%')),
                'stealProtected': False,
            })

        # Build merged monster record
        entry = {
            'id': mon_id,
            'aegisName': aegis,
            'name': name,
            'level': safe_int(roc.get('LV')),
            'hp': hp,
            'sp': ra.get('sp', 0) if ra else 0,
            'baseExp': safe_int(roc.get('Exp')),
            'jobExp': safe_int(roc.get('Job Exp')),
            'mvpExp': ra.get('mvpExp', 0) if ra else 0,
            'atk': parse_atk(roc.get('ATK', '')),
            'def': safe_int(roc.get('DEF')),
            'mdef': safe_int(roc.get('MDEF')),
            'flee': safe_int(roc.get('Flee')),
            'hit': safe_int(roc.get('Hit')),
            'str': ra.get('str', 0) if ra else 0,
            'agi': ra.get('agi', 0) if ra else 0,
            'vit': ra.get('vit', 0) if ra else 0,
            'int': ra.get('int', 0) if ra else 0,
            'dex': ra.get('dex', 0) if ra else 0,
            'luk': ra.get('luk', 0) if ra else 0,
            'attackRange': ra.get('attackRange', 0) if ra else 0,
            'skillRange': ra.get('skillRange', 0) if ra else 0,
            'chaseRange': ra.get('chaseRange', 0) if ra else 0,
            'size': roc.get('Size', ''),
            'race': roc.get('Race', ''),
            'element': roc.get('Property', ''),
            'walkSpeed': ra.get('walkSpeed', 0) if ra else 0,
            'attackDelay': ra.get('attackDelay', 0) if ra else 0,
            'attackMotion': ra.get('attackMotion', 0) if ra else 0,
            'damageMotion': ra.get('damageMotion', 0) if ra else 0,
            'ai': ra.get('ai', '') if ra else '',
            'class': mon_class,
            'drops': drops,
        }

        # Add ROC sprite URL for fallback
        if roc.get('sprite_url'):
            entry['spriteUrl'] = roc['sprite_url']

        # Add MVP drops from rAthena if available
        if ra and ra.get('mvpDrops'):
            entry['mvpDrops'] = ra['mvpDrops']

        merged.append(entry)

    # Sort by ID
    merged.sort(key=lambda x: x['id'])

    # ─── Report ──────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"MERGE REPORT")
    print(f"{'='*60}")
    print(f"Total ROC monsters: {len(roc_monsters)}")
    print(f"  Direct name match:  {stats['direct']}")
    print(f"  Manual mapping:     {stats['mapped']}")
    print(f"  Div ID disambig:    {stats['div_id']}")
    print(f"  No rAthena match:   {stats['no_match']}")
    print(f"")
    print(f"Drop items: {total_drops} total")
    print(f"  Matched to item ID: {matched_items}")
    print(f"  Unmatched (id=0):   {total_drops - matched_items}")
    print(f"  Unique unmatched:   {len(unmatched_items)}")

    if unmatched_items:
        print(f"\nUnmatched item names (first 30):")
        for n in sorted(unmatched_items)[:30]:
            print(f"  - {n}")
        if len(unmatched_items) > 30:
            print(f"  ... and {len(unmatched_items) - 30} more")

    # Show unmatched monsters
    no_match_monsters = [m['name'] for m in merged if m['id'] >= 90000]
    if no_match_monsters:
        print(f"\nMonsters without rAthena ID (using sprite_id):")
        for n in no_match_monsters:
            print(f"  - {n}")

    # ─── Write output ────────────────────────────────────────────────────
    out_path = os.path.join(BASE_DIR, 'web', 'monster_data.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated: ROC Classic TH official + rAthena supplementary\n')
        f.write(f'// ROC monsters: {len(merged)} | Generated by build_monster_data.py\n')
        f.write('const MONSTERS = ')
        f.write(json.dumps(merged, separators=(',', ':'), ensure_ascii=False))
        f.write(';\n\n')
        f.write('const ITEM_PRICES = ')
        f.write(json.dumps(item_prices, separators=(',', ':'), ensure_ascii=False))
        f.write(';\n')

    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nOutput: {out_path} ({size_kb:.0f} KB)")
    print(f"Monsters: {len(merged)}")


if __name__ == '__main__':
    main()
