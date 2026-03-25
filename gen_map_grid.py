"""
Generate world map grid positions from mappostable.txt (extracted from GRF).
Each map has exact pixel bounding boxes (x1,y1,x2,y2) on the 1280x1024 worldmap.

Source: data.grf -> mappostable.txt + manual additions for missing field maps
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
    'amatsu', 'louyang', 'gonryun', 'ayothaya', 'nifflheim', 'xmas',
}

# Field maps missing from mappostable.txt but present on the world map
# Positions estimated from grid patterns of surrounding maps
EXTRA_FIELD_MAPS = {
    # Morocc / Sograt Desert (gaps in desert grid)
    'moc_fild04': (660, 785, 717, 844),
    'moc_fild05': (718, 785, 776, 844),
    'moc_fild06': (777, 785, 835, 844),
    'moc_fild08': (660, 845, 717, 893),
    'moc_fild09': (718, 845, 776, 893),
    'moc_fild10': (777, 845, 835, 893),
    'moc_fild14': (718, 894, 776, 938),
    'moc_fild15': (777, 894, 835, 938),
    # Hugel area
    'hu_fild03': (812, 0, 870, 57),
    'hu_fild07': (695, 58, 752, 116),
    # Geffen area
    'gef_fild12': (518, 644, 575, 701),
    'gef_fild14': (460, 644, 517, 701),
    # Payon area
    'pay_fild05': (871, 761, 927, 803),
    'pay_fild11': (936, 862, 994, 931),
    # Comodo area
    'cmd_fild05': (484, 835, 543, 893),
    # Einbroch area
    'ein_fild02': (636, 58, 694, 116),
    'ein_fild10': (460, 352, 517, 410),
    # Nifflheim area
    'nif_fild01': (94, 761, 157, 834),
    'nif_fild02': (158, 761, 223, 834),
    # Xmas / Lutie
    'xmas_fild01': (1165, 117, 1220, 173),
    # Island maps (Amatsu, Ayothaya, Gonryun, Louyang) - positioned at map edges
    'ama_fild01': (1114, 862, 1163, 913),
    'ayo_fild01': (1164, 862, 1220, 913),
    'ayo_fild02': (1164, 914, 1220, 964),
    'gon_fild01': (1114, 914, 1163, 964),
    'lou_fild01': (1221, 862, 1275, 913),
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

    # Add missing field maps not in GRF mappostable.txt
    added = 0
    for map_name, coords in EXTRA_FIELD_MAPS.items():
        if map_name not in map_positions:
            map_positions[map_name] = coords
            added += 1
    if added:
        print(f"Added {added} extra field maps (manual positions)")

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
