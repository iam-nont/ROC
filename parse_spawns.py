"""
Parse rAthena spawn files to create map -> monsters lookup.
Output: web/spawn_data.js
"""
import os
import re
import json
import glob

BASE = os.path.dirname(__file__)
SPAWN_DIRS = [
    os.path.join(BASE, 'spawns', 'dungeons'),
    os.path.join(BASE, 'spawns', 'fields'),
]

def parse_spawn_line(line):
    """Parse a spawn line like: map_name,x,y,xs,ys\tmonster\tName\tID,count,delay1,delay2"""
    line = line.strip()
    if not line or line.startswith('//'):
        return None
    # Must contain 'monster' or 'boss_monster'
    if '\tmonster\t' not in line and '\tboss_monster\t' not in line:
        return None

    parts = line.split('\t')
    if len(parts) < 4:
        return None

    # Parse map location
    loc_part = parts[0].strip()
    map_name = loc_part.split(',')[0].strip()

    # Parse monster type (boss or normal)
    is_boss = 'boss_monster' in parts[1]

    # Monster name
    mob_name = parts[2].strip()

    # Parse ID, count, delays
    id_part = parts[3].strip()
    id_tokens = id_part.split(',')
    try:
        mob_id = int(id_tokens[0])
        count = int(id_tokens[1]) if len(id_tokens) > 1 else 1
        delay1 = int(id_tokens[2]) if len(id_tokens) > 2 else 0  # respawn delay ms
        delay2 = int(id_tokens[3]) if len(id_tokens) > 3 else 0  # random variance ms
    except (ValueError, IndexError):
        return None

    return {
        'map': map_name,
        'name': mob_name,
        'id': mob_id,
        'count': count,
        'delay': delay1,  # ms
        'delay2': delay2,
        'boss': is_boss,
    }

def ms_to_min(ms):
    """Convert milliseconds to minutes string"""
    if ms <= 0:
        return ""
    mins = ms / 60000
    if mins == int(mins):
        return str(int(mins))
    return f"{mins:.1f}"

def main():
    # Load monster data for levels/stats
    monsters_file = os.path.join(BASE, 'monsters.json')
    mob_lookup = {}
    if os.path.exists(monsters_file):
        with open(monsters_file, 'r', encoding='utf-8') as f:
            monsters = json.load(f)
            for m in monsters:
                mob_lookup[m['id']] = m

    # Parse all spawn files
    map_spawns = {}  # map_name -> list of spawn entries

    for spawn_dir in SPAWN_DIRS:
        for fpath in glob.glob(os.path.join(spawn_dir, '*.txt')):
            with open(fpath, 'r', encoding='utf-8') as f:
                for line in f:
                    result = parse_spawn_line(line)
                    if result:
                        map_name = result['map']
                        if map_name not in map_spawns:
                            map_spawns[map_name] = []
                        map_spawns[map_name].append(result)

    # Aggregate: combine same monster on same map
    map_data = {}
    for map_name, spawns in map_spawns.items():
        mob_agg = {}  # mob_id -> aggregated info
        for s in spawns:
            mid = s['id']
            if mid not in mob_agg:
                mob_info = mob_lookup.get(mid, {})
                mob_agg[mid] = {
                    'id': mid,
                    'name': s['name'],
                    'count': 0,
                    'delay': s['delay'],
                    'delay2': s['delay2'],
                    'boss': s['boss'],
                    'lv': mob_info.get('level', 0),
                    'race': mob_info.get('race', ''),
                    'element': mob_info.get('element', ''),
                    'hp': mob_info.get('hp', 0),
                }
            mob_agg[mid]['count'] += s['count']
            # Keep the longest delay (some spawns have different delays)
            if s['delay'] > 0 and (mob_agg[mid]['delay'] == 0 or s['delay'] < mob_agg[mid]['delay']):
                mob_agg[mid]['delay'] = s['delay']
                mob_agg[mid]['delay2'] = s['delay2']

        # Build compact monster list sorted by level desc
        monsters_list = []
        for mid, info in sorted(mob_agg.items(), key=lambda x: x[1]['lv'], reverse=True):
            entry = {
                'n': info['name'],
                'c': info['count'],
                'lv': info['lv'],
            }
            # Add respawn time if any
            if info['delay'] > 0:
                d1 = ms_to_min(info['delay'])
                d2 = ms_to_min(info['delay2'])
                if d2 and d1 != d2:
                    entry['r'] = f"{d2}~{d1}"
                elif d1:
                    entry['r'] = d1
            if info['boss']:
                entry['b'] = 1
            if info['race']:
                entry['race'] = info['race']
            if info['element']:
                entry['el'] = info['element']
            if info['hp']:
                entry['hp'] = info['hp']
            monsters_list.append(entry)

        if monsters_list:
            map_data[map_name] = monsters_list

    # Load map display names
    maps_file = os.path.join(BASE, 'maps_extracted.json')
    map_names = {}
    if os.path.exists(maps_file):
        with open(maps_file, 'r', encoding='utf-8') as f:
            maps = json.load(f)
            for m in maps:
                mn = m.get('mapName', '')
                dn = m.get('displayName', '') or m.get('mainTitle', '')
                if mn and dn:
                    map_names[mn] = dn

    # Write JS file
    out_dir = os.path.join(BASE, 'web')
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, 'spawn_data.js'), 'w', encoding='utf-8') as f:
        f.write('// Auto-generated map spawn data\n')
        f.write(f'const MAP_SPAWNS = {json.dumps(map_data, ensure_ascii=False, separators=(",",":"))};\n')

    size_kb = os.path.getsize(os.path.join(out_dir, 'spawn_data.js')) / 1024
    print(f"Maps with spawns: {len(map_data)}")
    print(f"spawn_data.js: {size_kb:.1f} KB")

    # Print sample
    sample = list(map_data.items())[:3]
    for mn, mobs in sample:
        print(f"\n{mn} ({map_names.get(mn, '?')}):")
        for m in mobs[:5]:
            r = f" / {m['r']} min" if 'r' in m else ""
            print(f"  {m['n']} Lv{m['lv']} x{m['c']}{r}")

if __name__ == '__main__':
    main()
