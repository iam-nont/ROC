#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ragnarok Online Classic - Merged itemInfo Parser
Combines data from itemInfo.lua (CP874) and iteminfo_new.lua (UTF-8)
into a single comprehensive dataset.
"""

import re
import json
import csv
import os

BASE_DIR = "D:/Development/ROC"


def decode_lua_string_cp874(s):
    """Decode Lua string with decimal escapes as CP874 (Thai) bytes."""
    result = bytearray()
    i = 0
    while i < len(s):
        if s[i] == '\\' and i + 1 < len(s) and s[i + 1].isdigit():
            j = i + 1
            while j < len(s) and j < i + 4 and s[j].isdigit():
                j += 1
            val = int(s[i + 1:j])
            result.append(val & 0xFF)
            i = j
        elif s[i] == '\\' and i + 1 < len(s):
            esc = s[i + 1]
            escape_map = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'"}
            result.append(ord(escape_map.get(esc, esc)))
            i += 2
        else:
            result.append(ord(s[i]))
            i += 1
    try:
        return result.decode('cp874', errors='replace')
    except Exception:
        return result.decode('latin-1', errors='replace')


def decode_lua_string_utf8(s):
    """Decode Lua string with decimal escapes as UTF-8 bytes."""
    result = bytearray()
    i = 0
    while i < len(s):
        if s[i] == '\\' and i + 1 < len(s) and s[i + 1].isdigit():
            j = i + 1
            while j < len(s) and j < i + 4 and s[j].isdigit():
                j += 1
            val = int(s[i + 1:j])
            result.append(val & 0xFF)
            i = j
        elif s[i] == '\\' and i + 1 < len(s):
            esc = s[i + 1]
            escape_map = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'"}
            result.append(ord(escape_map.get(esc, esc)))
            i += 2
        else:
            result.append(ord(s[i]))
            i += 1
    try:
        return result.decode('utf-8', errors='replace')
    except Exception:
        return result.decode('latin-1', errors='replace')


def strip_color_codes(s):
    return re.sub(r'\^[0-9a-fA-F]{6}', '', s)


def extract_field_from_desc(desc_lines, decode_func, thai_pattern, english_pattern=None, as_int=True):
    """Generic field extraction from description lines."""
    for line in desc_lines:
        decoded = decode_func(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(thai_pattern, cleaned)
        if match:
            val = match.group(1).strip()
            if as_int:
                try:
                    return int(val)
                except ValueError:
                    return val
            return val
        if english_pattern:
            match = re.search(english_pattern, cleaned)
            if match:
                val = match.group(1).strip()
                if as_int:
                    try:
                        return int(val)
                    except ValueError:
                        return val
                return val
    return None


def extract_all_fields(desc_lines, decode_func):
    """Extract all known fields from description lines."""
    fields = {}

    fields['weight'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'น้ำหนัก\s*:\s*(\d+)',
        r'[Ww]eight\s*:\s*(\d+)'
    )

    fields['atk'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'พลังโจมตี\s*:\s*(\d+)',
        r'[Aa]tk\s*:\s*(\d+)'
    )

    fields['matk'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'MATK\s*:\s*(\d+)',
        r'[Mm]atk\s*:\s*(\d+)'
    )

    fields['defense'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'พลังป้องกัน\s*:\s*(\d+)',
        r'[Dd]ef\s*:\s*(\d+)'
    )

    fields['weaponType'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'ประเภท\s*:\s*(\S+)',
        as_int=False
    )

    fields['weaponLevel'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'Lv\s+ของอาวุธ\s*:\s*(\d+)'
    )

    fields['requiredLevel'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'Lv\s+ที่ต้องการ\s*:\s*(\S+)'
    )

    fields['equipLocation'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'ตำแหน่ง\s*:\s*(.+)',
        as_int=False
    )

    fields['equipClasses'] = extract_field_from_desc(
        desc_lines, decode_func,
        r'อาชีพ\s*:\s*(.+)',
        r'[Cc]lass(?:es)?\s*:\s*(.+)',
        as_int=False
    )

    # Full decoded description
    decoded_lines = []
    for line in desc_lines:
        decoded = decode_func(line)
        cleaned = strip_color_codes(decoded)
        if cleaned.strip() and cleaned.strip() != '_':
            decoded_lines.append(cleaned.strip())
    fields['description'] = ' | '.join(decoded_lines)

    return fields


def parse_lua_items(filepath, decode_func):
    """Parse a decompiled itemInfo Lua file."""
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    items = {}
    lines = content.split('\n')
    current_item = None
    current_field = None
    current_array = None
    in_tbl = False

    for line in lines:
        stripped = line.strip()

        if stripped == 'tbl = {':
            in_tbl = True
            continue

        if not in_tbl:
            continue

        item_match = re.match(r'\[(\d+)\]\s*=\s*\{', stripped)
        if item_match:
            if current_item:
                items[current_item['id']] = current_item
            current_item = {
                'id': int(item_match.group(1)),
                'unidentifiedDisplayName': '',
                'unidentifiedResourceName': '',
                'unidentifiedDescriptionName': [],
                'identifiedDisplayName': '',
                'identifiedResourceName': '',
                'identifiedDescriptionName': [],
                'slotCount': 0,
                'ClassNum': 0,
                'costume': None,
            }
            current_field = None
            current_array = None
            continue

        if current_item is None:
            continue

        if stripped in ('},', '}'):
            if current_array is not None:
                current_array = None
                current_field = None
            elif stripped == '}':
                if current_item:
                    items[current_item['id']] = current_item
                    current_item = None
            continue

        str_match = re.match(r'(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$', stripped)
        if str_match and current_array is None:
            field_name = str_match.group(1)
            if field_name in current_item:
                current_item[field_name] = str_match.group(2)
            continue

        num_match = re.match(r'(\w+)\s*=\s*(-?\d+)\s*,?\s*$', stripped)
        if num_match and current_array is None:
            field_name = num_match.group(1)
            if field_name in current_item:
                current_item[field_name] = int(num_match.group(2))
            continue

        bool_match = re.match(r'(\w+)\s*=\s*(true|false)\s*,?\s*$', stripped)
        if bool_match and current_array is None:
            field_name = bool_match.group(1)
            if field_name in current_item:
                current_item[field_name] = bool_match.group(2) == 'true'
            continue

        arr_match = re.match(r'(\w+)\s*=\s*\{', stripped)
        if arr_match:
            current_field = arr_match.group(1)
            if current_field in current_item and isinstance(current_item[current_field], list):
                current_array = current_field
            continue

        if current_array is not None:
            elem_match = re.match(r'"((?:[^"\\]|\\.)*)"', stripped)
            if elem_match:
                current_item[current_array].append(elem_match.group(1))

    if current_item:
        items[current_item['id']] = current_item

    return items


def process_and_merge():
    """Parse both item files, merge, and extract structured data."""

    print("Parsing itemInfo.lua (CP874 encoding)...")
    old_items = parse_lua_items(os.path.join(BASE_DIR, "itemInfo.lua"), decode_lua_string_cp874)
    print(f"  Found {len(old_items)} items")

    print("Parsing iteminfo_new.lua (UTF-8 encoding)...")
    new_items = parse_lua_items(os.path.join(BASE_DIR, "iteminfo_new.lua"), decode_lua_string_utf8)
    print(f"  Found {len(new_items)} items")

    # Merge: new items override old ones (they're more up-to-date)
    merged = {}
    for item_id, item in old_items.items():
        merged[item_id] = (item, decode_lua_string_cp874)
    for item_id, item in new_items.items():
        merged[item_id] = (item, decode_lua_string_utf8)

    print(f"  Merged total: {len(merged)} unique items")

    # Process all items
    processed = []
    for item_id in sorted(merged.keys()):
        item, decode_func = merged[item_id]
        desc_lines = item.get('identifiedDescriptionName', [])
        fields = extract_all_fields(desc_lines, decode_func)

        p = {
            'id': item['id'],
            'identifiedDisplayName': item.get('identifiedDisplayName', ''),
            'unidentifiedDisplayName': item.get('unidentifiedDisplayName', ''),
            'resourceName': item.get('identifiedResourceName', ''),
            'slotCount': item.get('slotCount', 0),
            'ClassNum': item.get('ClassNum', 0),
            'costume': item.get('costume'),
        }
        p.update(fields)

        # Decode unidentified description too
        undesc_lines = item.get('unidentifiedDescriptionName', [])
        undesc_decoded = []
        for line in undesc_lines:
            decoded = decode_func(line)
            cleaned = strip_color_codes(decoded)
            if cleaned.strip() and cleaned.strip() != '_':
                undesc_decoded.append(cleaned.strip())
        p['unidentifiedDescription'] = ' | '.join(undesc_decoded)

        processed.append(p)

    return processed


def categorize_items(items):
    """Categorize items by ID range (standard RO ranges)."""
    categories = {
        'Consumables': (500, 699),
        'Herbs/Cooking': (700, 999),
        'Loot/Misc': (900, 999),
        'One-Handed Swords': (1100, 1199),
        'Two-Handed Swords': (1150, 1199),
        'Daggers': (1200, 1299),
        'Axes': (1300, 1399),
        'Spears': (1400, 1499),
        'Maces': (1500, 1599),
        'Staves/Rods': (1600, 1699),
        'Bows': (1700, 1799),
        'Knuckles': (1800, 1899),
        'Instruments': (1900, 1999),
        'Whips': (1950, 1999),
        'Books': (1550, 1599),
        'Katars': (1250, 1299),
        'Shields': (2100, 2199),
        'Headgear': (2200, 2499),
        'Armor': (2300, 2399),
        'Garments': (2500, 2599),
        'Footgear': (2400, 2499),
        'Accessories': (2600, 2899),
        'Cards': (4000, 4999),
        'Ammunition': (1750, 1799),
    }

    categorized = {}
    for cat, (low, high) in categories.items():
        cat_items = [i for i in items if low <= i['id'] <= high]
        if cat_items:
            categorized[cat] = cat_items

    return categorized


def main():
    print("=" * 60)
    print("RAGNAROK ONLINE CLASSIC - MERGED ITEM DATA EXTRACTION")
    print("=" * 60)

    items = process_and_merge()

    # Save full merged data
    json_path = os.path.join(BASE_DIR, "items_merged.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(items)} items to items_merged.json")

    csv_path = os.path.join(BASE_DIR, "items_merged.csv")
    fields = ['id', 'identifiedDisplayName', 'unidentifiedDisplayName',
              'slotCount', 'ClassNum', 'weight', 'atk', 'matk', 'defense',
              'weaponType', 'weaponLevel', 'requiredLevel', 'equipLocation',
              'equipClasses', 'costume', 'description']
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(items)
    print(f"Saved {len(items)} items to items_merged.csv")

    # Summary statistics
    print(f"\n{'='*60}")
    print("EXTRACTION STATISTICS")
    print(f"{'='*60}")

    total = len(items)
    with_weight = sum(1 for i in items if i['weight'] is not None)
    with_atk = sum(1 for i in items if i['atk'] is not None)
    with_def = sum(1 for i in items if i['defense'] is not None)
    with_slots = sum(1 for i in items if i['slotCount'] and i['slotCount'] > 0)
    with_classes = sum(1 for i in items if i['equipClasses'] is not None)
    weapons = [i for i in items if i['atk'] is not None]
    armors = [i for i in items if i['defense'] is not None]

    print(f"Total items:        {total}")
    print(f"With weight:        {with_weight}")
    print(f"With ATK (weapons): {with_atk}")
    print(f"With DEF (armor):   {with_def}")
    print(f"With card slots:    {with_slots}")
    print(f"With class reqs:    {with_classes}")

    # Top weapons by ATK
    print(f"\n{'='*60}")
    print("TOP 15 WEAPONS BY ATK")
    print(f"{'='*60}")
    weapons_sorted = sorted(weapons, key=lambda x: x['atk'] or 0, reverse=True)
    for w in weapons_sorted[:15]:
        print(f"  [{w['id']:>6}] {w['identifiedDisplayName']:<40} ATK={w['atk']:>4}  "
              f"wLv={w.get('weaponLevel','?')}  type={w.get('weaponType','?')}  "
              f"reqLv={w.get('requiredLevel','?')}  slots={w['slotCount']}")

    # Top armor by DEF
    print(f"\n{'='*60}")
    print("TOP 15 ARMOR BY DEF")
    print(f"{'='*60}")
    armors_sorted = sorted(armors, key=lambda x: x['defense'] or 0, reverse=True)
    for a in armors_sorted[:15]:
        print(f"  [{a['id']:>6}] {a['identifiedDisplayName']:<40} DEF={a['defense']:>4}  "
              f"reqLv={a.get('requiredLevel','?')}  loc={a.get('equipLocation','?')}  "
              f"slots={a['slotCount']}")

    # Items in classic loot range (sellable drops)
    print(f"\n{'='*60}")
    print("SAMPLE LOOT ITEMS (IDs 900-999) - Monster Drops")
    print(f"{'='*60}")
    loot = [i for i in items if 900 <= i['id'] <= 999]
    for item in loot[:20]:
        print(f"  [{item['id']:>4}] {item['identifiedDisplayName']:<30} weight={item.get('weight','?')}")

    # Cards (ID range 4000-4999)
    print(f"\n{'='*60}")
    print("SAMPLE CARDS (IDs 4001-4050)")
    print(f"{'='*60}")
    cards = [i for i in items if 4001 <= i['id'] <= 4050]
    for card in cards[:15]:
        desc = card.get('description', '')
        if len(desc) > 80:
            desc = desc[:80] + "..."
        print(f"  [{card['id']:>5}] {card['identifiedDisplayName']:<30} {desc}")

    print(f"\n{'='*60}")
    print("ALL OUTPUT FILES")
    print(f"{'='*60}")
    for f in sorted(os.listdir(BASE_DIR)):
        if f.endswith(('.json', '.csv')):
            size = os.path.getsize(os.path.join(BASE_DIR, f))
            print(f"  {f}: {size:,} bytes")


if __name__ == '__main__':
    main()
