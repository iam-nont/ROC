"""
Fetch monster spawn data from Divine Pride API for ROC Classic TH.
Usage: python fetch_divine_pride.py <API_KEY> [--server SERVER]

Servers to try: thROC, GGH, thROG, iROC (default: try auto-detect)
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

API_BASE = "https://www.divine-pride.net/api/database"

def fetch_monster(monster_id, api_key, server=None):
    """Fetch a single monster from Divine Pride API."""
    url = f"{API_BASE}/Monster/{monster_id}?apiKey={api_key}"
    if server:
        url += f"&server={server}"

    req = urllib.request.Request(url)
    req.add_header('Accept-Language', 'en')
    req.add_header('User-Agent', 'ROC-Database-Tool/1.0')

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except urllib.error.URLError as e:
        print(f"  Network error for ID {monster_id}: {e}")
        return None


def test_server_codes(api_key):
    """Test different server codes with Poring (1002) to find the right one."""
    servers = [None, 'thROC', 'GGH', 'thROG', 'iROC']
    print("Testing server codes with Poring (ID 1002)...")
    print("=" * 60)

    for server in servers:
        label = server or "(default/no server)"
        try:
            data = fetch_monster(1002, api_key, server)
            if data:
                spawns = data.get('spawn', [])
                drops = data.get('drops', [])
                name = data.get('name', '?')
                hp = data.get('stats', {}).get('health', '?')
                print(f"\n[{label}] {name} - HP: {hp}")
                print(f"  Spawns: {len(spawns)} maps")
                for s in spawns[:5]:
                    print(f"    {s.get('mapname','?')} x{s.get('amount','?')} ({s.get('respawnTime','?')}ms)")
                print(f"  Drops: {len(drops)} items")
            else:
                print(f"\n[{label}] Not found (404)")
        except Exception as e:
            print(f"\n[{label}] Error: {e}")
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print("Choose the server code that matches ROC Classic TH data.")
    print("Then run: python fetch_divine_pride.py <KEY> --server <SERVER>")


def fetch_all_monsters(api_key, server):
    """Fetch all monsters and build spawn data."""
    base = os.path.dirname(os.path.abspath(__file__))

    # Get monster IDs from monster_data.js
    monster_file = os.path.join(base, 'web', 'monster_data.js')
    with open(monster_file, 'r', encoding='utf-8') as f:
        content = f.read()
    monster_ids = [int(x) for x in re.findall(r'"id":\s*(\d+)', content)]
    print(f"Found {len(monster_ids)} monster IDs to fetch")

    # Check for existing progress
    progress_file = os.path.join(base, 'dp_monsters_raw.json')
    fetched = {}
    if os.path.exists(progress_file):
        with open(progress_file, 'r', encoding='utf-8') as f:
            fetched = json.load(f)
        print(f"Resuming from {len(fetched)} already fetched")

    # Fetch monsters
    total = len(monster_ids)
    for i, mid in enumerate(monster_ids):
        if str(mid) in fetched:
            continue

        try:
            data = fetch_monster(mid, api_key, server)
            if data:
                fetched[str(mid)] = data
                spawns = len(data.get('spawn', []))
                print(f"  [{i+1}/{total}] ID {mid}: {data.get('name','?')} - {spawns} spawns")
            else:
                fetched[str(mid)] = None
                print(f"  [{i+1}/{total}] ID {mid}: not found")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  Rate limited! Waiting 10s...")
                time.sleep(10)
                # Retry
                try:
                    data = fetch_monster(mid, api_key, server)
                    if data:
                        fetched[str(mid)] = data
                except:
                    pass
            else:
                print(f"  [{i+1}/{total}] ID {mid}: HTTP {e.code}")
                fetched[str(mid)] = None

        # Save progress every 50 monsters
        if len(fetched) % 50 == 0:
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump(fetched, f)
            print(f"  -- Saved progress: {len(fetched)} monsters --")

        time.sleep(0.3)  # Rate limiting

    # Save final
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(fetched, f, indent=2)
    print(f"\nFetched {len(fetched)} monsters -> {progress_file}")

    # Build spawn data
    build_spawn_data(fetched, base)


def build_spawn_data(monsters, base):
    """Convert Divine Pride monster data to spawn_data.js format."""
    spawns_by_map = {}

    for mid, data in monsters.items():
        if not data:
            continue
        name = data.get('name', '')
        stats = data.get('stats', {})
        level = stats.get('level', 0)
        hp = stats.get('health', 0)
        race = data.get('stats', {}).get('race', 0)
        element = stats.get('element', 0)
        scale = stats.get('scale', 0)

        # Race mapping
        race_names = {
            0: 'Formless', 1: 'Undead', 2: 'Brute', 3: 'Plant',
            4: 'Insect', 5: 'Fish', 6: 'Demon', 7: 'Demi-Human',
            8: 'Angel', 9: 'Dragon',
        }
        race_name = race_names.get(race, str(race))

        # Element mapping
        ele_names = {
            0: 'Neutral', 1: 'Water', 2: 'Earth', 3: 'Fire',
            4: 'Wind', 5: 'Poison', 6: 'Holy', 7: 'Dark',
            8: 'Ghost', 9: 'Undead',
        }
        ele_id = element % 10 if element else 0
        ele_lv = element // 20 + 1 if element else 0
        ele_name = f"{ele_names.get(ele_id, str(ele_id))} {ele_lv}" if element else 'Neutral 1'

        # Check if boss (MVP)
        mode = stats.get('attackedMT', 0)
        is_boss = bool(data.get('mvpdrops'))

        for spawn in data.get('spawn', []):
            map_name = spawn.get('mapname', '')
            amount = spawn.get('amount', 0)
            respawn_ms = spawn.get('respawnTime', 0)

            if not map_name or amount <= 0:
                continue

            if map_name not in spawns_by_map:
                spawns_by_map[map_name] = []

            entry = {
                'n': name,
                'c': amount,
                'lv': level,
                'race': race_name,
                'el': ele_name,
                'hp': hp,
            }
            if respawn_ms and respawn_ms > 0:
                # Convert ms to minutes for display
                r_min = round(respawn_ms / 60000, 1)
                if r_min >= 1:
                    entry['r'] = str(r_min)
                else:
                    # Show in seconds
                    entry['r'] = str(round(respawn_ms / 1000, 1))
            if is_boss:
                entry['b'] = 1

            spawns_by_map[map_name].append(entry)

    # Sort spawns within each map by level desc
    for map_name in spawns_by_map:
        spawns_by_map[map_name].sort(key=lambda x: -x['lv'])

    # Write spawn_data.js
    out_path = os.path.join(base, 'web', 'spawn_data.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from Divine Pride API (ROC Classic TH)\n')
        f.write(f'// Total maps with spawns: {len(spawns_by_map)}\n')
        f.write('const MAP_SPAWNS = ')
        f.write(json.dumps(spawns_by_map, separators=(',', ':'), ensure_ascii=False))
        f.write(';\n')

    total_spawns = sum(len(v) for v in spawns_by_map.values())
    print(f"\nGenerated spawn_data.js:")
    print(f"  Maps: {len(spawns_by_map)}")
    print(f"  Total spawn entries: {total_spawns}")
    print(f"  Output: {out_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Test server codes:  python fetch_divine_pride.py <API_KEY>")
        print("  Fetch all data:     python fetch_divine_pride.py <API_KEY> --server <SERVER>")
        print("")
        print("Server codes to try: thROC, GGH, thROG, iROC")
        sys.exit(1)

    api_key = sys.argv[1]

    if '--server' in sys.argv:
        idx = sys.argv.index('--server')
        server = sys.argv[idx + 1]
        print(f"Fetching all monsters with server={server}...")
        fetch_all_monsters(api_key, server)
    else:
        test_server_codes(api_key)


if __name__ == '__main__':
    main()
