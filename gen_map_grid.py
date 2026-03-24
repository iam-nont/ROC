"""
Generate world map grid positions from mappostable.txt (extracted from GRF).
Each map has exact pixel bounding boxes (x1,y1,x2,y2) on the 1280x1024 worldmap.

Source: data.grf -> mappostable.txt
Format: groupIndex#mapname.rsw#x1#y1#x2#y2#
"""
import json
import os
import re

# Cities to highlight with special styling
CITIES = {
    'yuno', 'einbroch', 'lighthalzen', 'hugel', 'aldebaran',
    'geffen', 'prontera', 'izlude', 'morocc', 'alberta',
    'payon', 'comodo', 'rachel', 'veins', 'einbech', 'umbala',
}


def parse_mappostable(filepath):
    """Parse mappostable.txt and return dict of map_name -> (x1, y1, x2, y2)."""
    maps = {}
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            # Format: groupIndex#mapname.rsw#x1#y1#x2#y2#
            # Also skip the "12@" line (group count header)
            parts = line.split('#')
            if len(parts) < 6:
                continue
            try:
                map_rsw = parts[1]
                x1 = int(parts[2])
                y1 = int(parts[3])
                x2 = int(parts[4])
                y2 = int(parts[5])
            except (ValueError, IndexError):
                continue

            # Remove .rsw extension to get map name
            map_name = map_rsw.replace('.rsw', '')
            maps[map_name] = (x1, y1, x2, y2)
    return maps


def main():
    base = os.path.dirname(os.path.abspath(__file__))

    # Parse mappostable.txt
    mappos_file = os.path.join(base, 'temp_extract', 'mappostable.txt')
    if not os.path.exists(mappos_file):
        print(f"ERROR: {mappos_file} not found!")
        print("Extract mappostable.txt from data.grf first.")
        return

    map_positions = parse_mappostable(mappos_file)
    print(f"Parsed {len(map_positions)} maps from mappostable.txt")

    # Load spawn data to check which maps have spawns
    spawn_file = os.path.join(base, 'web', 'spawn_data.js')
    has_spawns = set()
    if os.path.exists(spawn_file):
        with open(spawn_file, 'r', encoding='utf-8') as f:
            content = f.read()
        matches = re.findall(r'"([^"]+)":\[', content)
        has_spawns = set(matches)

    # Build grid data with pixel bounding boxes
    grid_data = []
    for map_name, (x1, y1, x2, y2) in map_positions.items():
        entry = {
            'n': map_name,
            'x1': x1, 'y1': y1,
            'x2': x2, 'y2': y2,
        }
        if map_name in CITIES:
            entry['city'] = 1
        if map_name in has_spawns:
            entry['s'] = 1
        grid_data.append(entry)

    # Sort by y1 then x1 for consistent rendering order
    grid_data.sort(key=lambda x: (x['y1'], x['x1']))

    # Write JS file
    out_path = os.path.join(base, 'web', 'map_grid.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated world map grid positions from mappostable.txt\n')
        f.write('// Each map has pixel bounding box (x1,y1,x2,y2) on 1280x1024 worldmap\n')
        f.write(f'const MAP_GRID_DATA = {json.dumps(grid_data, separators=(",",":"))};\n')

    print(f"Generated {len(grid_data)} map cells")
    print(f"  With spawn data: {sum(1 for g in grid_data if g.get('s'))}")
    print(f"  Cities: {sum(1 for g in grid_data if g.get('city'))}")
    print(f"  Output: {out_path}")


if __name__ == '__main__':
    main()
