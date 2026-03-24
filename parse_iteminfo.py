#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ragnarok Online Classic - itemInfo.lua Parser
Extracts structured item data from the decompiled Lua file.
Handles Thai CP874 encoded text and RO client color codes.
"""

import re
import json
import csv
import os

INPUT_FILE = "D:/Development/ROC/itemInfo.lua"
OUTPUT_DIR = "D:/Development/ROC"


def decode_lua_string(s):
    """Decode a Lua string with decimal escapes to a proper string.
    Lua uses DECIMAL escapes like \\185 (not octal).
    These represent CP874 (Thai) encoded bytes.
    Regular ASCII chars pass through directly.
    """
    result = bytearray()
    i = 0
    while i < len(s):
        if s[i] == '\\' and i + 1 < len(s) and s[i + 1].isdigit():
            # Lua decimal escape sequence (1-3 digits)
            j = i + 1
            while j < len(s) and j < i + 4 and s[j].isdigit():
                j += 1
            val = int(s[i + 1:j])  # Decimal, not octal!
            if val > 255:
                val = val & 0xFF
            result.append(val)
            i = j
        elif s[i] == '\\' and i + 1 < len(s):
            # Other escape sequences
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
    """Remove RO color codes like ^000088 and ^000000 from text."""
    return re.sub(r'\^[0-9a-fA-F]{6}', '', s)


def extract_weight(desc_lines):
    """Extract weight from description lines.
    Pattern: น้ำหนัก : ^777777XX^000000
    In raw: \\185\\233\\211\\203\\185\\209\\161 : ^777777XX^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        # Thai "น้ำหนัก" = weight
        match = re.search(r'น้ำหนัก\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
        # Also try English
        match = re.search(r'[Ww]eight\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
    return None


def extract_atk(desc_lines):
    """Extract ATK (attack power) from description lines.
    Pattern: พลังโจมตี : ^777777XX^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        # Thai "พลังโจมตี" = attack power
        match = re.search(r'พลังโจมตี\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
        match = re.search(r'[Aa]tk\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
    return None


def extract_defense(desc_lines):
    """Extract DEF from description lines.
    Pattern: พลังป้องกัน : ^777777XX^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'พลังป้องกัน\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
        match = re.search(r'[Dd]ef\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
    return None


def extract_weapon_type(desc_lines):
    """Extract weapon type from description.
    Pattern: ประเภท : ^777777TypeName^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'ประเภท\s*:\s*(\S+)', cleaned)
        if match:
            return match.group(1)
    return None


def extract_equip_classes(desc_lines):
    """Extract usable classes from description.
    Pattern: อาชีพ : ^777777ClassList^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'อาชีพ\s*:\s*(.+)', cleaned)
        if match:
            return match.group(1).strip()
        # English fallback
        match = re.search(r'[Cc]lass(?:es)?\s*:\s*(.+)', cleaned)
        if match:
            return match.group(1).strip()
    return None


def extract_weapon_level(desc_lines):
    """Extract weapon level.
    Pattern: Lv ของอาวุธ : ^777777X^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'Lv\s+ของอาวุธ\s*:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
    return None


def extract_required_level(desc_lines):
    """Extract required level.
    Pattern: Lv ที่ต้องการ : ^777777X^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'Lv\s+ที่ต้องการ\s*:\s*(\S+)', cleaned)
        if match:
            val = match.group(1)
            if val.isdigit():
                return int(val)
            return val
    return None


def extract_location(desc_lines):
    """Extract equipment location.
    Pattern: ตำแหน่ง : ^777777Location^000000
    """
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        match = re.search(r'ตำแหน่ง\s*:\s*(.+)', cleaned)
        if match:
            return match.group(1).strip()
    return None


def decode_description(desc_lines):
    """Decode all description lines and return as a single cleaned string."""
    decoded_lines = []
    for line in desc_lines:
        decoded = decode_lua_string(line)
        cleaned = strip_color_codes(decoded)
        if cleaned.strip() and cleaned.strip() != '_':
            decoded_lines.append(cleaned.strip())
    return ' | '.join(decoded_lines)


def parse_item_info(filepath):
    """Parse the decompiled itemInfo.lua file and extract all items."""
    with open(filepath, 'r', encoding='latin-1') as f:
        content = f.read()

    items = []

    # Pattern to match each item block: [XXXX] = { ... }
    # We need to handle nested tables (description arrays)
    # Use a state machine approach

    lines = content.split('\n')
    current_item = None
    current_field = None
    current_array = None
    brace_depth = 0
    in_tbl = False

    for line_num, line in enumerate(lines):
        stripped = line.strip()

        # Start of the main table
        if stripped == 'tbl = {':
            in_tbl = True
            brace_depth = 1
            continue

        if not in_tbl:
            continue

        # Start of a new item: [XXXX] = {
        item_match = re.match(r'\[(\d+)\]\s*=\s*\{', stripped)
        if item_match:
            if current_item:
                items.append(current_item)
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

        # End of item block
        if stripped == '},':
            if current_array is not None:
                current_array = None
                current_field = None
            else:
                # End of the item
                continue
        elif stripped == '}':
            if current_array is not None:
                current_array = None
                current_field = None
            else:
                # Possibly end of main table or item
                if current_item:
                    items.append(current_item)
                    current_item = None
                continue

        # String field: fieldName = "value",
        str_match = re.match(r'(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$', stripped)
        if str_match and current_array is None:
            field_name = str_match.group(1)
            field_value = str_match.group(2)
            if field_name in current_item:
                current_item[field_name] = field_value
            continue

        # Numeric field: fieldName = 123,
        num_match = re.match(r'(\w+)\s*=\s*(-?\d+)\s*,?\s*$', stripped)
        if num_match and current_array is None:
            field_name = num_match.group(1)
            field_value = int(num_match.group(2))
            if field_name in current_item:
                current_item[field_name] = field_value
            continue

        # Boolean field: fieldName = true/false,
        bool_match = re.match(r'(\w+)\s*=\s*(true|false)\s*,?\s*$', stripped)
        if bool_match and current_array is None:
            field_name = bool_match.group(1)
            field_value = bool_match.group(2) == 'true'
            if field_name in current_item:
                current_item[field_name] = field_value
            continue

        # Start of array field: fieldName = {
        arr_match = re.match(r'(\w+)\s*=\s*\{', stripped)
        if arr_match:
            current_field = arr_match.group(1)
            if current_field in current_item and isinstance(current_item[current_field], list):
                current_array = current_field
            continue

        # Array element: "string value",
        if current_array is not None:
            elem_match = re.match(r'"((?:[^"\\]|\\.)*)"', stripped)
            if elem_match:
                current_item[current_array].append(elem_match.group(1))
            continue

    # Don't forget the last item
    if current_item:
        items.append(current_item)

    return items


def process_items(items):
    """Process raw items into structured data with decoded fields."""
    processed = []
    for item in items:
        desc_lines = item.get('identifiedDescriptionName', [])

        p = {
            'id': item['id'],
            'identifiedDisplayName': item.get('identifiedDisplayName', ''),
            'unidentifiedDisplayName': item.get('unidentifiedDisplayName', ''),
            'resourceName': item.get('identifiedResourceName', ''),
            'slotCount': item.get('slotCount', 0),
            'ClassNum': item.get('ClassNum', 0),
            'costume': item.get('costume'),
            'weight': extract_weight(desc_lines),
            'atk': extract_atk(desc_lines),
            'defense': extract_defense(desc_lines),
            'weaponType': extract_weapon_type(desc_lines),
            'weaponLevel': extract_weapon_level(desc_lines),
            'requiredLevel': extract_required_level(desc_lines),
            'equipLocation': extract_location(desc_lines),
            'equipClasses': extract_equip_classes(desc_lines),
            'description': decode_description(desc_lines),
        }

        # Also decode the unidentified description
        undesc_lines = item.get('unidentifiedDescriptionName', [])
        p['unidentifiedDescription'] = decode_description(undesc_lines)

        processed.append(p)

    return processed


def save_json(data, filepath):
    """Save data as JSON."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(data)} items to {filepath}")


def save_csv(data, filepath):
    """Save data as CSV."""
    if not data:
        return

    fields = ['id', 'identifiedDisplayName', 'unidentifiedDisplayName',
              'slotCount', 'ClassNum', 'weight', 'atk', 'defense',
              'weaponType', 'weaponLevel', 'requiredLevel', 'equipLocation',
              'equipClasses', 'costume', 'description']

    with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
    print(f"Saved {len(data)} items to {filepath}")


def print_summary(items):
    """Print a summary of extracted data."""
    total = len(items)
    with_weight = sum(1 for i in items if i['weight'] is not None)
    with_atk = sum(1 for i in items if i['atk'] is not None)
    with_def = sum(1 for i in items if i['defense'] is not None)
    with_slots = sum(1 for i in items if i['slotCount'] > 0)
    with_classes = sum(1 for i in items if i['equipClasses'] is not None)
    costumes = sum(1 for i in items if i['costume'] is not None)

    print(f"\n{'='*60}")
    print(f"ITEM INFO EXTRACTION SUMMARY")
    print(f"{'='*60}")
    print(f"Total items extracted: {total}")
    print(f"Items with weight:     {with_weight}")
    print(f"Items with ATK:        {with_atk}")
    print(f"Items with DEF:        {with_def}")
    print(f"Items with slots:      {with_slots}")
    print(f"Items with classes:    {with_classes}")
    print(f"Costume items:         {costumes}")

    # ID ranges
    ids = [i['id'] for i in items]
    print(f"\nID range: {min(ids)} - {max(ids)}")

    # Sample items
    print(f"\n{'='*60}")
    print(f"SAMPLE ITEMS")
    print(f"{'='*60}")

    # Show a few consumables
    consumables = [i for i in items if i['id'] < 700 and i['weight'] is not None]
    if consumables:
        print("\n--- Consumables (sample) ---")
        for item in consumables[:5]:
            print(f"  [{item['id']}] {item['identifiedDisplayName']}: weight={item['weight']}")

    # Show a few weapons
    weapons = [i for i in items if i['atk'] is not None]
    if weapons:
        print("\n--- Weapons (sample) ---")
        for item in weapons[:8]:
            print(f"  [{item['id']}] {item['identifiedDisplayName']}: ATK={item['atk']}, "
                  f"weight={item['weight']}, type={item['weaponType']}, "
                  f"wLv={item['weaponLevel']}, reqLv={item['requiredLevel']}, "
                  f"slots={item['slotCount']}")

    # Show a few armor pieces
    armors = [i for i in items if i['defense'] is not None]
    if armors:
        print("\n--- Armor (sample) ---")
        for item in armors[:8]:
            print(f"  [{item['id']}] {item['identifiedDisplayName']}: DEF={item['defense']}, "
                  f"weight={item['weight']}, reqLv={item['requiredLevel']}, "
                  f"slots={item['slotCount']}, loc={item['equipLocation']}")

    # Show loot/misc items (high ID range)
    misc = [i for i in items if 900 <= i['id'] <= 999 and i['weight'] is not None]
    if misc:
        print("\n--- Loot/Misc Items (sample) ---")
        for item in misc[:8]:
            print(f"  [{item['id']}] {item['identifiedDisplayName']}: weight={item['weight']}")


def main():
    print("Parsing itemInfo.lua...")
    raw_items = parse_item_info(INPUT_FILE)
    print(f"Parsed {len(raw_items)} raw items")

    print("Processing items (decoding Thai, extracting fields)...")
    processed = process_items(raw_items)

    # Save outputs
    json_path = os.path.join(OUTPUT_DIR, "items_extracted.json")
    csv_path = os.path.join(OUTPUT_DIR, "items_extracted.csv")

    save_json(processed, json_path)
    save_csv(processed, csv_path)

    # Print summary
    print_summary(processed)

    return processed


if __name__ == '__main__':
    main()
