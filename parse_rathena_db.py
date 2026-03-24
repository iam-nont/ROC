#!/usr/bin/env python3
"""
Parse rAthena pre-renewal mob_db.yml and item_db YAML files.
Produces:
  - monsters.json   (array of monster objects with drops)
  - item_prices.json (item ID -> buy/sell price mapping)
  - web/monster_data.js (JS variable for HTML page)
"""

import json
import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── YAML-lite parser ───────────────────────────────────────────────────────
# The rAthena YAML files are simple enough that we can parse them without
# pulling in PyYAML (which may not be installed).

def parse_rathena_yaml(filepath):
    """Parse a rAthena YAML file and return a list of top-level entries.

    Each entry under 'Body:' starting with '  - Id:' is one record.
    We return a list of dicts.  Nested lists (Drops, MvpDrops) are handled.
    """
    entries = []
    current_entry = None
    current_list_key = None   # e.g. "Drops", "MvpDrops"
    current_list_item = None
    in_body = False
    in_comment_block = False

    with open(filepath, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.rstrip('\n').rstrip('\r')

            # Skip blank lines
            if not line.strip():
                continue

            # Skip pure comment lines (lines where first non-space is #)
            stripped = line.lstrip()
            if stripped.startswith('#'):
                continue

            # Detect Body: section
            if stripped == 'Body:':
                in_body = True
                continue

            # Detect Header/Footer sections (stop Body)
            if stripped in ('Header:', 'Footer:'):
                in_body = False
                # Save last entry
                if current_entry is not None:
                    if current_list_key and current_list_item:
                        current_entry.setdefault(current_list_key, []).append(current_list_item)
                    entries.append(current_entry)
                    current_entry = None
                continue

            if not in_body:
                continue

            # Determine indentation level
            indent = len(line) - len(line.lstrip())

            # New top-level entry: '  - Id: ...'
            m_top = re.match(r'^  - (\w+):\s*(.*)', line)
            if m_top and indent == 2:
                # Save previous entry
                if current_entry is not None:
                    if current_list_key and current_list_item:
                        current_entry.setdefault(current_list_key, []).append(current_list_item)
                    entries.append(current_entry)
                current_entry = {}
                current_list_key = None
                current_list_item = None
                key = m_top.group(1)
                val = m_top.group(2).strip()
                current_entry[key] = _convert_value(val)
                continue

            if current_entry is None:
                continue

            # Check for a sub-list item: '      - Item: ...'
            m_list_item = re.match(r'^      - (\w+):\s*(.*)', line)
            if m_list_item and indent == 6:
                # Save previous list item
                if current_list_key and current_list_item:
                    current_entry.setdefault(current_list_key, []).append(current_list_item)
                current_list_item = {}
                key = m_list_item.group(1)
                val = m_list_item.group(2).strip()
                current_list_item[key] = _convert_value(val)
                continue

            # Check for sub-list item property: '        Rate: 7000'
            m_list_prop = re.match(r'^        (\w+):\s*(.*)', line)
            if m_list_prop and indent == 8 and current_list_item is not None:
                key = m_list_prop.group(1)
                val = m_list_prop.group(2).strip()
                current_list_item[key] = _convert_value(val)
                continue

            # Check for a list-key header at indent 4: '    Drops:'
            m_list_key = re.match(r'^    (\w+):\s*$', line)
            if m_list_key and indent == 4:
                # Save previous list context
                if current_list_key and current_list_item:
                    current_entry.setdefault(current_list_key, []).append(current_list_item)
                    current_list_item = None
                current_list_key = m_list_key.group(1)
                continue

            # Normal property at indent 4: '    Name: Poring'
            m_prop = re.match(r'^    (\w+):\s*(.*)', line)
            if m_prop and indent == 4:
                key = m_prop.group(1)
                val = m_prop.group(2).strip()
                # If val is empty, this might be a map key (like Modes:, Jobs:)
                if val == '':
                    # Save previous list context
                    if current_list_key and current_list_item:
                        current_entry.setdefault(current_list_key, []).append(current_list_item)
                        current_list_item = None
                    current_list_key = key
                else:
                    current_entry[key] = _convert_value(val)
                continue

            # Sub-map property at indent 6 (for Modes, Jobs, etc): '      Detector: true'
            m_submap = re.match(r'^      (\w+):\s*(.*)', line)
            if m_submap and indent == 6 and current_list_key and current_list_item is None:
                key = m_submap.group(1)
                val = m_submap.group(2).strip()
                if current_list_key not in current_entry:
                    current_entry[current_list_key] = {}
                if isinstance(current_entry.get(current_list_key), dict):
                    current_entry[current_list_key][key] = _convert_value(val)
                continue

    # Save last entry
    if current_entry is not None:
        if current_list_key and current_list_item:
            current_entry.setdefault(current_list_key, []).append(current_list_item)
        entries.append(current_entry)

    return entries


def _convert_value(val):
    """Convert a YAML scalar string to Python type."""
    if val == '' or val is None:
        return None
    if val.lower() == 'true':
        return True
    if val.lower() == 'false':
        return False
    # Try integer
    try:
        return int(val)
    except ValueError:
        pass
    # Try float
    try:
        return float(val)
    except ValueError:
        pass
    return val


# ─── Build item lookup ──────────────────────────────────────────────────────

def build_item_lookup():
    """Parse all item_db files and build AegisName -> {id, name, buy, sell} mapping."""
    item_files = [
        os.path.join(BASE_DIR, 'item_db_usable.yml'),
        os.path.join(BASE_DIR, 'item_db_equip.yml'),
        os.path.join(BASE_DIR, 'item_db_etc.yml'),
    ]

    aegis_to_item = {}
    item_prices = {}

    for fpath in item_files:
        if not os.path.exists(fpath):
            print(f"  WARNING: {fpath} not found, skipping")
            continue
        print(f"  Parsing {os.path.basename(fpath)} ...")
        items = parse_rathena_yaml(fpath)
        print(f"    Found {len(items)} items")
        for item in items:
            item_id = item.get('Id')
            aegis = item.get('AegisName', '')
            name = item.get('Name', aegis)
            buy = item.get('Buy', 0)
            sell = item.get('Sell', 0)

            # rAthena: if Buy is 0, it becomes 2*Sell; if Sell is 0, it becomes Buy//2
            if buy == 0 and sell > 0:
                buy = sell * 2
            if sell == 0 and buy > 0:
                sell = buy // 2

            aegis_to_item[aegis] = {
                'id': item_id,
                'name': name,
                'buy': buy if buy else 0,
                'sell': sell if sell else 0,
            }

            item_prices[item_id] = {
                'name': name,
                'buy': buy if buy else 0,
                'sell': sell if sell else 0,
            }

    return aegis_to_item, item_prices


# ─── Element / Race / Size constants ────────────────────────────────────────

ELEMENT_NAMES = {
    'Neutral': 'Neutral',
    'Water': 'Water',
    'Earth': 'Earth',
    'Fire': 'Fire',
    'Wind': 'Wind',
    'Poison': 'Poison',
    'Holy': 'Holy',
    'Dark': 'Dark',
    'Shadow': 'Dark',
    'Ghost': 'Ghost',
    'Undead': 'Undead',
}

RACE_NAMES = {
    'Formless': 'Formless',
    'Undead': 'Undead',
    'Brute': 'Brute',
    'Plant': 'Plant',
    'Insect': 'Insect',
    'Fish': 'Fish',
    'Demon': 'Demon',
    'DemiHuman': 'Demi-Human',
    'Demihuman': 'Demi-Human',
    'Angel': 'Angel',
    'Dragon': 'Dragon',
}

SIZE_NAMES = {
    'Small': 'Small',
    'Medium': 'Medium',
    'Large': 'Large',
}


# ─── Parse monsters ─────────────────────────────────────────────────────────

def parse_monsters(aegis_to_item):
    """Parse mob_db.yml and return list of monster dicts."""
    mob_file = os.path.join(BASE_DIR, 'mob_db.yml')
    print(f"  Parsing {os.path.basename(mob_file)} ...")
    mobs_raw = parse_rathena_yaml(mob_file)
    print(f"    Found {len(mobs_raw)} monsters")

    monsters = []
    missing_items = set()

    for mob in mobs_raw:
        mob_id = mob.get('Id')
        if mob_id is None:
            continue

        name = mob.get('Name', mob.get('AegisName', ''))
        level = mob.get('Level', 1)
        hp = mob.get('Hp', 1)
        sp = mob.get('Sp', 1)
        base_exp = mob.get('BaseExp', 0)
        job_exp = mob.get('JobExp', 0)
        mvp_exp = mob.get('MvpExp', 0)
        atk_min = mob.get('Attack', 0)
        atk_max = mob.get('Attack2', 0)
        defense = mob.get('Defense', 0)
        mdef = mob.get('MagicDefense', 0)

        # Stats
        str_val = mob.get('Str', 1)
        agi_val = mob.get('Agi', 1)
        vit_val = mob.get('Vit', 1)
        int_val = mob.get('Int', 1)
        dex_val = mob.get('Dex', 1)
        luk_val = mob.get('Luk', 1)

        # Ranges
        atk_range = mob.get('AttackRange', 0)
        skill_range = mob.get('SkillRange', 0)
        chase_range = mob.get('ChaseRange', 0)

        # Size / Race / Element
        size = SIZE_NAMES.get(mob.get('Size', 'Small'), mob.get('Size', 'Small'))
        race = RACE_NAMES.get(mob.get('Race', 'Formless'), mob.get('Race', 'Formless'))
        element_raw = mob.get('Element', 'Neutral')
        element_name = ELEMENT_NAMES.get(element_raw, element_raw)
        element_level = mob.get('ElementLevel', 1)
        element = f"{element_name} {element_level}"

        # Speed
        walk_speed = mob.get('WalkSpeed', 200)
        atk_delay = mob.get('AttackDelay', 0)
        atk_motion = mob.get('AttackMotion', 0)
        dmg_motion = mob.get('DamageMotion', 0)

        # AI / Class
        ai = mob.get('Ai', '06')
        mob_class = mob.get('Class', 'Normal')

        # Drops
        drops = []
        raw_drops = mob.get('Drops', [])
        if isinstance(raw_drops, list):
            for drop in raw_drops:
                item_aegis = drop.get('Item', '')
                rate = drop.get('Rate', 0)
                steal_protected = drop.get('StealProtected', False)

                item_info = aegis_to_item.get(item_aegis)
                if item_info:
                    drops.append({
                        'itemId': item_info['id'],
                        'itemName': item_info['name'],
                        'rate': rate,
                        'stealProtected': steal_protected,
                    })
                else:
                    missing_items.add(item_aegis)
                    drops.append({
                        'itemId': 0,
                        'itemName': item_aegis,
                        'rate': rate,
                        'stealProtected': steal_protected,
                    })

        # MVP Drops
        mvp_drops = []
        raw_mvp_drops = mob.get('MvpDrops', [])
        if isinstance(raw_mvp_drops, list):
            for drop in raw_mvp_drops:
                item_aegis = drop.get('Item', '')
                rate = drop.get('Rate', 0)

                item_info = aegis_to_item.get(item_aegis)
                if item_info:
                    mvp_drops.append({
                        'itemId': item_info['id'],
                        'itemName': item_info['name'],
                        'rate': rate,
                    })
                else:
                    missing_items.add(item_aegis)
                    mvp_drops.append({
                        'itemId': 0,
                        'itemName': item_aegis,
                        'rate': rate,
                    })

        monster = {
            'id': mob_id,
            'aegisName': mob.get('AegisName', ''),
            'name': name,
            'level': level,
            'hp': hp,
            'sp': sp,
            'baseExp': base_exp,
            'jobExp': job_exp,
            'mvpExp': mvp_exp,
            'atk': [atk_min, atk_max],
            'def': defense,
            'mdef': mdef,
            'str': str_val,
            'agi': agi_val,
            'vit': vit_val,
            'int': int_val,
            'dex': dex_val,
            'luk': luk_val,
            'attackRange': atk_range,
            'skillRange': skill_range,
            'chaseRange': chase_range,
            'size': size,
            'race': race,
            'element': element,
            'walkSpeed': walk_speed,
            'attackDelay': atk_delay,
            'attackMotion': atk_motion,
            'damageMotion': dmg_motion,
            'ai': str(ai),
            'class': mob_class,
            'drops': drops,
        }

        if mvp_drops:
            monster['mvpDrops'] = mvp_drops

        monsters.append(monster)

    if missing_items:
        print(f"  WARNING: {len(missing_items)} drop item AegisNames not found in item DB")
        # Show first 20
        for item in sorted(missing_items)[:20]:
            print(f"    - {item}")
        if len(missing_items) > 20:
            print(f"    ... and {len(missing_items) - 20} more")

    return monsters


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("rAthena Pre-Renewal Database Parser")
    print("=" * 60)

    # 1. Build item lookup
    print("\n[1/3] Building item lookup from item_db files...")
    aegis_to_item, item_prices = build_item_lookup()
    print(f"  Total items: {len(aegis_to_item)}")

    # 2. Parse monsters
    print("\n[2/3] Parsing monster database...")
    monsters = parse_monsters(aegis_to_item)
    print(f"  Total monsters: {len(monsters)}")

    # 3. Save outputs
    print("\n[3/3] Saving output files...")

    # monsters.json
    monsters_path = os.path.join(BASE_DIR, 'monsters.json')
    with open(monsters_path, 'w', encoding='utf-8') as f:
        json.dump(monsters, f, ensure_ascii=False, indent=2)
    print(f"  Saved {monsters_path} ({len(monsters)} monsters)")

    # item_prices.json
    prices_path = os.path.join(BASE_DIR, 'item_prices.json')
    with open(prices_path, 'w', encoding='utf-8') as f:
        json.dump(item_prices, f, ensure_ascii=False, indent=2)
    print(f"  Saved {prices_path} ({len(item_prices)} items)")

    # web/monster_data.js
    web_dir = os.path.join(BASE_DIR, 'web')
    os.makedirs(web_dir, exist_ok=True)
    js_path = os.path.join(web_dir, 'monster_data.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated from rAthena pre-renewal mob_db.yml + item_db\n")
        f.write("// Source: https://github.com/rathena/rathena\n")
        f.write(f"// Total monsters: {len(monsters)}\n\n")
        f.write("const MONSTERS = ")
        json.dump(monsters, f, ensure_ascii=False)
        f.write(";\n\n")

        # Also include a quick item price lookup
        f.write("// Item prices: id -> {name, buy, sell}\n")
        f.write("const ITEM_PRICES = ")
        json.dump(item_prices, f, ensure_ascii=False)
        f.write(";\n")
    print(f"  Saved {js_path}")

    # Print a few sample monsters for verification
    print("\n" + "=" * 60)
    print("Sample monsters:")
    print("=" * 60)
    for m in monsters[:5]:
        print(f"\n  [{m['id']}] {m['name']} (Lv.{m['level']})")
        print(f"    HP: {m['hp']}, ATK: {m['atk']}, DEF: {m['def']}, MDEF: {m['mdef']}")
        print(f"    Base EXP: {m['baseExp']}, Job EXP: {m['jobExp']}")
        print(f"    {m['element']} / {m['race']} / {m['size']}")
        if m['drops']:
            print(f"    Drops ({len(m['drops'])}):")
            for d in m['drops'][:4]:
                pct = d['rate'] / 100
                print(f"      - {d['itemName']} (ID:{d['itemId']}) @ {d['rate']}/10000 ({pct:.2f}%)")
            if len(m['drops']) > 4:
                print(f"      ... and {len(m['drops']) - 4} more")

    print("\nDone!")


if __name__ == '__main__':
    main()
