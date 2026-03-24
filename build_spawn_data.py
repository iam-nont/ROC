"""
Build spawn_data.js by combining:
1. ROC Classic TH official monster data (which monsters on which maps)
2. rAthena spawn counts (how many per map) as fallback
3. Divine Pride scraped data (if available)

Priority: Divine Pride > rAthena > ROC official (count=1 fallback)
"""
import json
import os
import re


def load_roc_official(filepath):
    """Load ROC official parsed monster data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_rathena_spawns(filepath):
    """Parse existing spawn_data.js (rAthena based) into dict."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the JSON object from "const MAP_SPAWNS = {...};"
    match = re.search(r'const MAP_SPAWNS\s*=\s*(\{.*\});', content, re.DOTALL)
    if not match:
        return {}
    return json.loads(match.group(1))


def load_dp_spawns(filepath):
    """Load Divine Pride scraped spawn data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Build index: monster_name_lower -> {map_name: {count, respawn}}
    dp_index = {}
    for mid, entry in data.items():
        if not entry or not entry.get('spawns'):
            continue
        name = entry.get('name', '').lower()
        if not name:
            continue
        dp_index[name] = {}
        for sp in entry['spawns']:
            dp_index[name][sp['map']] = {
                'count': sp['count'],
                'respawn': sp.get('respawn', ''),
            }
    return dp_index


def build_combined_spawns(roc_monsters, rathena_spawns, dp_spawns=None):
    """
    Build spawn data by:
    - Using ROC official monster->map assignments as ground truth
    - Priority: Divine Pride > rAthena > fallback(1)
    """
    # Index rAthena data: map -> {monster_name_lower: spawn_entry}
    ra_index = {}
    for map_name, monsters in rathena_spawns.items():
        ra_index[map_name] = {}
        for m in monsters:
            ra_index[map_name][m['n'].lower()] = m

    # Build new spawn data
    spawns_by_map = {}
    stats = {'dp': 0, 'ra': 0, 'fallback': 0}

    for mon in roc_monsters:
        name = mon['name']
        level = int(mon.get('LV', 0) or 0)
        hp = int(mon.get('HP', 0) or 0)
        race = mon.get('Race', '')
        element = mon.get('Property', '')
        maps = mon.get('maps', [])

        for map_name in maps:
            if map_name not in spawns_by_map:
                spawns_by_map[map_name] = []

            entry = {
                'n': name,
                'lv': level,
                'hp': hp,
                'race': race,
                'el': element,
            }

            # Priority 1: Divine Pride scraped data
            dp_entry = None
            if dp_spawns and name.lower() in dp_spawns:
                dp_entry = dp_spawns[name.lower()].get(map_name)

            # Priority 2: rAthena data
            ra_entry = None
            if map_name in ra_index:
                ra_entry = ra_index[map_name].get(name.lower())

            if dp_entry and dp_entry['count'] > 0:
                entry['c'] = dp_entry['count']
                r = dp_entry.get('respawn', '')
                if r and r != 'instant' and r != '0':
                    entry['r'] = r
                stats['dp'] += 1
            elif ra_entry:
                entry['c'] = ra_entry.get('c', 1)
                if ra_entry.get('r'):
                    entry['r'] = ra_entry['r']
                if ra_entry.get('b'):
                    entry['b'] = 1
                stats['ra'] += 1
            else:
                entry['c'] = 1
                stats['fallback'] += 1

            # Detect boss
            if hp >= 100000 or (ra_entry and ra_entry.get('b')):
                entry['b'] = 1

            spawns_by_map[map_name].append(entry)

    # Sort spawns within each map by level descending
    for map_name in spawns_by_map:
        spawns_by_map[map_name].sort(key=lambda x: -x['lv'])

    return spawns_by_map, stats


def main():
    base = os.path.dirname(os.path.abspath(__file__))

    # Load ROC official data
    roc_file = os.path.join(base, 'roc_monsters_parsed.json')
    if not os.path.exists(roc_file):
        print(f"ERROR: {roc_file} not found!")
        print("Run the ROC official scraper first.")
        return

    roc_monsters = load_roc_official(roc_file)
    print(f"ROC official: {len(roc_monsters)} monsters")

    # Load rAthena spawn data (backup for existing spawn_data.js)
    spawn_file = os.path.join(base, 'web', 'spawn_data.js')
    rathena_spawns = {}
    if os.path.exists(spawn_file):
        rathena_spawns = load_rathena_spawns(spawn_file)
        total_ra = sum(len(v) for v in rathena_spawns.values())
        print(f"rAthena spawns: {len(rathena_spawns)} maps, {total_ra} entries")

    # Load Divine Pride scraped data if available
    dp_spawns = None
    dp_file = os.path.join(base, 'dp_spawns_scraped.json')
    if os.path.exists(dp_file):
        dp_spawns = load_dp_spawns(dp_file)
        print(f"Divine Pride: {len(dp_spawns)} monsters with spawn data")

    # Build combined spawn data
    spawns, stats = build_combined_spawns(roc_monsters, rathena_spawns, dp_spawns)

    # Stats
    total_entries = sum(len(v) for v in spawns.values())

    print(f"\nResult:")
    print(f"  Maps: {len(spawns)}")
    print(f"  Total spawn entries: {total_entries}")
    print(f"  From Divine Pride: {stats['dp']}")
    print(f"  From rAthena: {stats['ra']}")
    print(f"  Fallback (count=1): {stats['fallback']}")

    # Write spawn_data.js
    out_path = os.path.join(base, 'web', 'spawn_data.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated: ROC Classic TH official monsters + rAthena spawn counts\n')
        f.write(f'// ROC monsters: {len(roc_monsters)} | Maps: {len(spawns)} | Entries: {total_entries}\n')
        f.write('const MAP_SPAWNS = ')
        f.write(json.dumps(spawns, separators=(',', ':'), ensure_ascii=False))
        f.write(';\n')

    print(f"  Output: {out_path}")

    # Also regenerate map_grid.js to update spawn flags
    print(f"\nRegenerating map_grid.js to update spawn flags...")
    os.system(f'python "{os.path.join(base, "gen_map_grid.py")}"')


if __name__ == '__main__':
    main()
