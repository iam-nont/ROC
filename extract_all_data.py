#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ragnarok Online Classic - Complete Data Extractor
Parses all decompiled .lua files and extracts structured game data.
"""

import re
import json
import csv
import os

BASE_DIR = "D:/Development/ROC"


def decode_lua_string(s):
    """Decode a Lua string with decimal escapes to Unicode.
    Lua uses DECIMAL escapes like \\185 for CP874 Thai bytes.
    """
    result = bytearray()
    i = 0
    while i < len(s):
        if s[i] == '\\' and i + 1 < len(s) and s[i + 1].isdigit():
            j = i + 1
            while j < len(s) and j < i + 4 and s[j].isdigit():
                j += 1
            val = int(s[i + 1:j])
            if val > 255:
                val = val & 0xFF
            result.append(val)
            i = j
        elif s[i] == '\\' and i + 1 < len(s):
            esc = s[i + 1]
            if esc == 'n':
                result.append(ord('\n'))
            elif esc == 't':
                result.append(ord('\t'))
            elif esc == 'r':
                result.append(ord('\r'))
            elif esc == '\\':
                result.append(ord('\\'))
            elif esc == '"':
                result.append(ord('"'))
            elif esc == "'":
                result.append(ord("'"))
            else:
                result.append(ord(s[i]))
                result.append(ord(esc))
            i += 2
        else:
            result.append(ord(s[i]))
            i += 1
    try:
        return result.decode('cp874', errors='replace')
    except Exception:
        return result.decode('latin-1', errors='replace')


def strip_color_codes(s):
    """Remove RO color codes like ^000088 and ^000000."""
    return re.sub(r'\^[0-9a-fA-F]{6}', '', s)


# =============================================================================
# MAP INFO PARSER
# =============================================================================

def parse_map_info():
    """Parse mapInfo.lua to extract map data."""
    filepath = os.path.join(BASE_DIR, "mapInfo.lua")
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    maps = []
    # Match: ["mapname.rsw"] = { ... }
    pattern = re.compile(
        r'\["([^"]+)"\]\s*=\s*\{(.*?)\n\s*\}',
        re.DOTALL
    )

    for match in pattern.finditer(content):
        map_file = match.group(1)
        block = match.group(2)

        map_data = {
            'mapFile': map_file,
            'mapName': map_file.replace('.rsw', ''),
        }

        # Extract displayName
        dn = re.search(r'displayName\s*=\s*"((?:[^"\\]|\\.)*)"', block)
        if dn:
            map_data['displayName'] = decode_lua_string(dn.group(1))

        # Extract notifyEnter
        ne = re.search(r'notifyEnter\s*=\s*(true|false)', block)
        if ne:
            map_data['notifyEnter'] = ne.group(1) == 'true'

        # Extract backgroundBmp
        bg = re.search(r'backgroundBmp\s*=\s*"([^"]*)"', block)
        if bg:
            map_data['backgroundBmp'] = bg.group(1)

        # Extract mainTitle from signName
        mt = re.search(r'mainTitle\s*=\s*"((?:[^"\\]|\\.)*)"', block)
        if mt:
            map_data['mainTitle'] = decode_lua_string(mt.group(1))

        # Extract subTitle from signName
        st = re.search(r'subTitle\s*=\s*"((?:[^"\\]|\\.)*)"', block)
        if st:
            map_data['subTitle'] = decode_lua_string(st.group(1))

        maps.append(map_data)

    return maps


# =============================================================================
# MONSTER SIZE EFFECT PARSER
# =============================================================================

def parse_monster_size_effect():
    """Parse monster_size_effect.lua for monster visual data."""
    filepath = os.path.join(BASE_DIR, "monster_size_effect.lua")
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    # First, build effect name->value mapping
    effects = {}
    for match in re.finditer(r'EFFECT\.(\w+)\s*=\s*(-?\d+)', content):
        effects[match.group(1)] = int(match.group(2))

    # Parse monster entries
    monsters = []
    pattern = re.compile(
        r'\[(\d+)\]\s*=\s*\{[^}]*MonsterSize\s*=\s*([\d.]+)[^}]*MonsterEff\s*=\s*EFFECT\.(\w+)',
        re.DOTALL
    )

    for match in pattern.finditer(content):
        mob_id = int(match.group(1))
        size = float(match.group(2))
        eff_name = match.group(3)
        eff_value = effects.get(eff_name, -1)

        monsters.append({
            'mobId': mob_id,
            'monsterSize': size,
            'effectName': eff_name,
            'effectId': eff_value,
        })

    return monsters, effects


# =============================================================================
# ACHIEVEMENT LIST PARSER
# =============================================================================

def parse_achievements():
    """Parse achievement_list.lua for achievement data."""
    filepath = os.path.join(BASE_DIR, "achievement_list.lua")
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    achievements = []
    lines = content.split('\n')

    current = None
    in_content = False
    in_resource = False
    in_reward = False

    for line in lines:
        stripped = line.strip()

        # New achievement entry
        m = re.match(r'\[(\d+)\]\s*=\s*\{', stripped)
        if m:
            if current:
                achievements.append(current)
            current = {
                'id': int(m.group(1)),
                'UI_Type': 0,
                'group': '',
                'major': 0,
                'minor': 0,
                'title': '',
                'summary': '',
                'details': '',
                'rewardItem': None,
                'score': 0,
            }
            in_content = False
            in_resource = False
            in_reward = False
            continue

        if current is None:
            continue

        # Simple fields
        m = re.match(r'UI_Type\s*=\s*(\d+)', stripped)
        if m:
            current['UI_Type'] = int(m.group(1))

        m = re.match(r'group\s*=\s*"([^"]*)"', stripped)
        if m:
            current['group'] = m.group(1)

        m = re.match(r'major\s*=\s*(\d+)', stripped)
        if m:
            current['major'] = int(m.group(1))

        m = re.match(r'minor\s*=\s*(\d+)', stripped)
        if m:
            current['minor'] = int(m.group(1))

        m = re.match(r'title\s*=\s*"((?:[^"\\]|\\.)*)"', stripped)
        if m:
            current['title'] = decode_lua_string(m.group(1))

        m = re.match(r'score\s*=\s*(\d+)', stripped)
        if m:
            current['score'] = int(m.group(1))

        # Content block
        if stripped == 'content = {':
            in_content = True
            continue
        if in_content:
            m = re.match(r'summary\s*=\s*"((?:[^"\\]|\\.)*)"', stripped)
            if m:
                current['summary'] = decode_lua_string(m.group(1))
            m = re.match(r'details\s*=\s*"((?:[^"\\]|\\.)*)"', stripped)
            if m:
                current['details'] = decode_lua_string(m.group(1))
            if stripped.startswith('}'):
                in_content = False

        # Reward block
        if 'reward' in stripped and '{' in stripped:
            in_reward = True
        if in_reward:
            m = re.search(r'item\s*=\s*(\d+)', stripped)
            if m:
                current['rewardItem'] = int(m.group(1))
            if stripped.startswith('}'):
                in_reward = False

    if current:
        achievements.append(current)

    return achievements


# =============================================================================
# TOWN/NPC INFO PARSER
# =============================================================================

def parse_town_info():
    """Parse Towninfo.lua for NPC locations."""
    filepath = os.path.join(BASE_DIR, "Towninfo.lua")
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    towns = {}
    lines = content.split('\n')

    current_town = None
    current_npc = None

    for line in lines:
        stripped = line.strip()

        # Town name: prontera = {
        m = re.match(r'(\w+)\s*=\s*\{', stripped)
        if m and stripped != 'mapNPCInfoTable = {':
            if current_town and current_town not in towns:
                towns[current_town] = []
            name = m.group(1)
            if name not in ('name', 'X', 'Y', 'TYPE'):
                current_town = name
                if current_town not in towns:
                    towns[current_town] = []
                continue

        # NPC entry start (anonymous table in array)
        if stripped == '{' and current_town:
            current_npc = {}
            continue

        if current_npc is not None:
            m = re.match(r'name\s*=\s*"((?:[^"\\]|\\.)*)"', stripped)
            if m:
                current_npc['name'] = decode_lua_string(m.group(1))

            m = re.match(r'X\s*=\s*(\d+)', stripped)
            if m:
                current_npc['x'] = int(m.group(1))

            m = re.match(r'Y\s*=\s*(\d+)', stripped)
            if m:
                current_npc['y'] = int(m.group(1))

            m = re.match(r'TYPE\s*=\s*(\d+)', stripped)
            if m:
                current_npc['type'] = int(m.group(1))

            if stripped == '},':
                if current_town and current_npc:
                    towns[current_town].append(current_npc)
                current_npc = None

    return towns


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 60)
    print("RAGNAROK ONLINE CLASSIC - COMPLETE DATA EXTRACTION")
    print("=" * 60)

    # --- Map Info ---
    print("\n[1/4] Parsing mapInfo.lua...")
    maps = parse_map_info()
    map_path = os.path.join(BASE_DIR, "maps_extracted.json")
    with open(map_path, 'w', encoding='utf-8') as f:
        json.dump(maps, f, ensure_ascii=False, indent=2)
    print(f"  Extracted {len(maps)} maps -> maps_extracted.json")

    # Also save CSV
    map_csv = os.path.join(BASE_DIR, "maps_extracted.csv")
    with open(map_csv, 'w', encoding='utf-8-sig', newline='') as f:
        fields = ['mapName', 'displayName', 'mainTitle', 'subTitle', 'backgroundBmp']
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(maps)
    print(f"  -> maps_extracted.csv")

    # Print sample
    print("\n  Sample maps:")
    for m in maps[:5]:
        print(f"    {m['mapName']}: {m.get('displayName', 'N/A')} ({m.get('subTitle', '')})")

    # --- Monster Size Effect ---
    print("\n[2/4] Parsing monster_size_effect.lua...")
    monsters, effects = parse_monster_size_effect()
    monster_path = os.path.join(BASE_DIR, "monster_sizes_extracted.json")
    with open(monster_path, 'w', encoding='utf-8') as f:
        json.dump(monsters, f, ensure_ascii=False, indent=2)
    print(f"  Extracted {len(monsters)} monster size entries -> monster_sizes_extracted.json")
    print(f"  Extracted {len(effects)} effect definitions")

    # Save effects
    effects_path = os.path.join(BASE_DIR, "effects_extracted.json")
    with open(effects_path, 'w', encoding='utf-8') as f:
        json.dump(effects, f, ensure_ascii=False, indent=2)
    print(f"  -> effects_extracted.json")

    # --- Achievement List ---
    print("\n[3/4] Parsing achievement_list.lua...")
    achievements = parse_achievements()
    ach_path = os.path.join(BASE_DIR, "achievements_extracted.json")
    with open(ach_path, 'w', encoding='utf-8') as f:
        json.dump(achievements, f, ensure_ascii=False, indent=2)
    print(f"  Extracted {len(achievements)} achievements -> achievements_extracted.json")

    ach_csv = os.path.join(BASE_DIR, "achievements_extracted.csv")
    with open(ach_csv, 'w', encoding='utf-8-sig', newline='') as f:
        fields = ['id', 'group', 'title', 'summary', 'details', 'rewardItem', 'score']
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(achievements)
    print(f"  -> achievements_extracted.csv")

    # Print sample
    print("\n  Sample achievements:")
    for a in achievements[:5]:
        print(f"    [{a['id']}] {a['group']}: {a['title']} (score: {a['score']})")

    # --- Town/NPC Info ---
    print("\n[4/4] Parsing Towninfo.lua...")
    towns = parse_town_info()
    town_path = os.path.join(BASE_DIR, "towns_extracted.json")
    with open(town_path, 'w', encoding='utf-8') as f:
        json.dump(towns, f, ensure_ascii=False, indent=2)
    total_npcs = sum(len(v) for v in towns.values())
    print(f"  Extracted {len(towns)} towns with {total_npcs} NPC entries -> towns_extracted.json")

    # Print summary
    print("\n  Towns:")
    for town, npcs in sorted(towns.items()):
        npc_types = {}
        for npc in npcs:
            name = npc.get('name', 'Unknown')
            npc_types[name] = npc_types.get(name, 0) + 1
        type_str = ', '.join(f"{n}({c})" for n, c in sorted(npc_types.items()))
        print(f"    {town}: {len(npcs)} NPCs - {type_str}")

    # --- Final Summary ---
    print("\n" + "=" * 60)
    print("EXTRACTION COMPLETE")
    print("=" * 60)
    print(f"\nOutput files saved to: {BASE_DIR}")
    print("\nDecompiled Lua files:")
    for f in sorted(os.listdir(BASE_DIR)):
        if f.endswith('.lua'):
            size = os.path.getsize(os.path.join(BASE_DIR, f))
            print(f"  {f}: {size:,} bytes")

    print("\nExtracted data files:")
    for f in sorted(os.listdir(BASE_DIR)):
        if f.endswith('.json') or f.endswith('.csv'):
            size = os.path.getsize(os.path.join(BASE_DIR, f))
            print(f"  {f}: {size:,} bytes")


if __name__ == '__main__':
    main()
