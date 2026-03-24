"""
Build RO Classic Database web page from extracted game data.
Cleans data and generates data.js + index.html
"""
import json
import re
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "web")

def clean_equip_location(loc):
    if not loc:
        return ""
    # Strip Thai weight text
    loc = re.sub(r'\s*น้ำหนัก\s*:?\s*\d*', '', loc)
    loc = re.sub(r'\s*ตำแหน่ง\s*:?\s*\d*', '', loc)
    loc = re.sub(r'\s*นำหนัก\s*:?\s*\d*', '', loc)
    loc = loc.strip().rstrip(',').strip()
    # Normalize
    loc_lower = loc.lower().replace('-', ' ').replace('/', ' ').replace(',', ' ')
    loc_lower = re.sub(r'\s+', ' ', loc_lower).strip()
    mapping = {
        'upper': 'Upper Headgear',
        'middle': 'Middle Headgear',
        'lower': 'Lower Headgear',
        'upper middle': 'Upper+Middle Headgear',
        'upper middle lower': 'All Headgear',
        'upper middle low': 'All Headgear',
        'upper middle lower': 'All Headgear',
        'middle lower': 'Middle+Lower Headgear',
        'middle low': 'Middle+Lower Headgear',
        'upper lower': 'Upper+Lower Headgear',
        'armor': 'Armor',
        'armour': 'Armor',
        'shield': 'Shield',
        'garment': 'Garment',
        'shoes': 'Shoes',
        'footwear': 'Shoes',
        'accessory': 'Accessory',
        'accessory(left)': 'Accessory',
        'accessory(right)': 'Accessory',
        'weapon': 'Weapon',
        'bottom': 'Lower Headgear',
        'low': 'Lower Headgear',
        'medium': 'Middle Headgear',
    }
    for k, v in mapping.items():
        if loc_lower == k:
            return v
    if '???' in loc:
        return 'Unknown'
    return loc.split('น')[0].strip() if 'น' in loc else loc

def clean_weapon_type(wtype):
    if not wtype:
        return ""
    mapping = {
        'sword': 'Sword', 'dagger': 'Dagger', 'axe': 'Axe',
        'mace': 'Mace', 'blunt': 'Mace', 'club': 'Mace', '7mace': 'Mace',
        'rod': 'Rod', 'staff': 'Staff', 'book': 'Book',
        'bow': 'Bow', 'katar': 'Katar', 'katra': 'Katar',
        'knuckle': 'Knuckle', 'claw': 'Knuckle',
        'spear': 'Spear', 'one-handed': 'One-Handed', 'one-hand': 'One-Handed',
        'one': 'One-Handed', 'onehand': 'One-Handed',
        'two-handed': 'Two-Handed', 'two': 'Two-Handed', 'twohand': 'Two-Handed',
        'twohadnd': 'Two-Handed',
        'instrument': 'Instrument', 'musical': 'Instrument',
        'whip': 'Whip', 'gun': 'Gun', 'pistol': 'Gun', 'revolver': 'Gun',
        'rifle': 'Rifle', 'rifler': 'Rifle', 'shotgun': 'Shotgun',
        'gatling': 'Gatling', 'grenade': 'Grenade',
        'huuma': 'Huuma Shuriken', 'fuuma': 'Huuma Shuriken',
        'shuriken': 'Shuriken', 'card': 'Card',
        'arrow': 'Arrow', 'bullet': 'Bullet', 'cannon': 'Cannonball',
        'cannonball': 'Cannonball', 'knife': 'Dagger',
        'magic': 'Rod',
    }
    wl = wtype.lower().strip()
    if wl in mapping:
        return mapping[wl]
    # Check partial match
    for k, v in mapping.items():
        if k in wl:
            return v
    return wtype

def classify_item(item):
    iid = item.get('id', 0)
    name = item.get('identifiedDisplayName', '')
    wtype = item.get('weaponType', '') or ''

    if wtype.lower() == 'card' or (4001 <= iid <= 4999 and 'Card' in name):
        return 'Card'
    if item.get('atk') and item['atk'] > 0 and wtype.lower() not in ['armor', 'shield', 'garment', 'shoes', 'headgear', 'helmet', 'accessory']:
        return 'Weapon'
    if item.get('defense') and item['defense'] > 0:
        return 'Armor'
    if item.get('equipLocation'):
        loc = clean_equip_location(item['equipLocation']).lower()
        if any(x in loc for x in ['headgear', 'upper', 'middle', 'lower']):
            return 'Headgear'
        if 'armor' in loc:
            return 'Armor'
        if 'shield' in loc:
            return 'Armor'
        if 'garment' in loc:
            return 'Armor'
        if 'shoes' in loc:
            return 'Armor'
        if 'accessory' in loc:
            return 'Accessory'
        if 'weapon' in loc:
            return 'Weapon'
        return 'Equipment'

    # Consumables
    if 501 <= iid <= 899:
        return 'Usable'
    # Collectible
    if 901 <= iid <= 1099:
        return 'Collectible'
    # Ores/Materials
    if any(x in name.lower() for x in ['oridecon', 'elunium', 'phracon', 'emveretarcon']):
        return 'Material'

    wl = wtype.lower()
    if wl in ['potion', 'taming', 'pet', 'item', 'special']:
        return 'Usable'
    if wl in ['armor', 'armour', 'helmet', 'helemt', 'helm', 'headgear', 'head-gear',
              'headgears', 'heargear', 'shield', 'garment', 'garmet', 'manteau',
              'robe', 'clothes', 'boots', 'shoe', 'shoes', 'footwear', 'foot',
              'outerwear', 'costume', 'shadow']:
        return 'Armor'
    if wl in ['accessory', 'accessories', 'accesory', 'accessary', 'accssory']:
        return 'Accessory'
    if wl in ['arrow', 'bullet', 'cannonball', 'cannon', 'throwing']:
        return 'Ammunition'

    return 'Etc'

def clean_description(desc):
    if not desc:
        return ""
    # Remove color codes like ^000088
    desc = re.sub(r'\^[0-9a-fA-F]{6}', '', desc)
    return desc.strip()

def build_data():
    base = os.path.dirname(__file__)

    # Load items
    with open(os.path.join(base, 'items_merged.json'), 'r', encoding='utf-8') as f:
        raw_items = json.load(f)

    # Load maps
    with open(os.path.join(base, 'maps_extracted.json'), 'r', encoding='utf-8') as f:
        raw_maps = json.load(f)

    # Clean items
    items = []
    for item in raw_items:
        cleaned = {
            'id': item.get('id', 0),
            'name': item.get('identifiedDisplayName', ''),
            'slots': item.get('slotCount', 0),
            'w': item.get('weight') or 0,
            'atk': item.get('atk') or 0,
            'matk': item.get('matk') or 0,
            'def': item.get('defense') or 0,
            'wtype': clean_weapon_type(item.get('weaponType', '')),
            'wlv': item.get('weaponLevel') or 0,
            'rlv': item.get('requiredLevel') or 0,
            'eloc': clean_equip_location(item.get('equipLocation', '')),
            'cat': classify_item(item),
            'desc': clean_description(item.get('description', '')),
        }
        # Skip items with no name
        if not cleaned['name']:
            continue
        items.append(cleaned)

    # Clean maps
    maps = []
    for m in raw_maps:
        cleaned = {
            'name': m.get('mapName', ''),
            'display': m.get('displayName', ''),
            'title': m.get('mainTitle', ''),
            'sub': m.get('subTitle', ''),
        }
        if cleaned['name']:
            # Classify map type
            mn = cleaned['name'].lower()
            if any(x in mn for x in ['dun', '_d0', 'cave', 'tower', 'pyramid', 'sphinx',
                                       'glast', 'abbey', 'alde_d', 'gef_d', 'prt_sew',
                                       'treasure', 'tur_d', 'iz_d', 'in_s', 'thana',
                                       'abyss', 'jupe', 'lhz_d', 'kh_d', 'ice_d',
                                       'mag_d', 'nif_d', 'orc', 'pay_d', 'mjo_d',
                                       'ama_d', 'gon_d', 'lou_d', 'mosk_d', 'nyd_',
                                       'ecl_t', 'lasa_d', 'bra_d', 'dew_d', 'dic_d',
                                       'mal_d', 'xmas_d', 'ra_s', 'beach_d', 'oz_d',
                                       'ein_d', 'ayo_d', 'um_d']):
                cleaned['type'] = 'Dungeon'
            elif any(x in mn for x in ['fild', 'field']):
                cleaned['type'] = 'Field'
            elif any(x in mn for x in ['gld', 'guild', 'schg', 'arug', 'teg_']):
                cleaned['type'] = 'Guild'
            elif any(x in mn for x in ['_in', 'in_', 'inside']):
                cleaned['type'] = 'Indoor'
            elif any(x in mn for x in ['@', 'instance']):
                cleaned['type'] = 'Instance'
            else:
                cleaned['type'] = 'Town/Other'
            maps.append(cleaned)

    # Get category counts
    cat_counts = {}
    for i in items:
        cat_counts[i['cat']] = cat_counts.get(i['cat'], 0) + 1

    print(f"Items: {len(items)}")
    print(f"Maps: {len(maps)}")
    print("Categories:", json.dumps(cat_counts, indent=2))

    return items, maps

def write_data_js(items, maps):
    os.makedirs(OUT_DIR, exist_ok=True)

    # Write as JS module
    with open(os.path.join(OUT_DIR, 'data.js'), 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from RO Classic game data\n')
        f.write(f'const ITEMS = {json.dumps(items, ensure_ascii=False, separators=(",",":"))};\n')
        f.write(f'const MAPS = {json.dumps(maps, ensure_ascii=False, separators=(",",":"))};\n')

    size_mb = os.path.getsize(os.path.join(OUT_DIR, 'data.js')) / 1024 / 1024
    print(f"data.js: {size_mb:.1f} MB")

if __name__ == '__main__':
    items, maps = build_data()
    write_data_js(items, maps)
    print("Done!")
