"""
Generate world map data files from GRF extracted data.
Combines: mappostable.txt + navi_link + worldviewdata + mapnametable + spawn_data

Output:
  web/map_grid.js       - map positions on 1280x1024 grid
  web/map_connections.js - warp connections, dungeon groups, display names
"""
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Cities to highlight
CITIES = {
    'yuno', 'einbroch', 'lighthalzen', 'hugel', 'aldebaran',
    'geffen', 'prontera', 'izlude', 'morocc', 'alberta',
    'payon', 'comodo', 'rachel', 'veins', 'einbech', 'umbala',
    'amatsu', 'louyang', 'gonryun', 'ayothaya', 'nifflheim', 'xmas',
}

# Known dungeon groupings: display_name -> {entrance_map, floors: [map_names]}
# Entrance map is the field/city map where the dungeon entrance is located
DUNGEON_GROUPS = {
    "Prontera Culvert": {"entrance": "prontera", "floors": ["prt_sewb1", "prt_sewb2", "prt_sewb3", "prt_sewb4"]},
    "Pyramid": {"entrance": "moc_fild19", "floors": ["moc_pryd01", "moc_pryd02", "moc_pryd03", "moc_pryd04", "moc_pryd05", "moc_pryd06"]},
    "Sphinx": {"entrance": "moc_fild19", "floors": ["in_sphinx1", "in_sphinx2", "in_sphinx3", "in_sphinx4", "in_sphinx5"]},
    "Ant Hell": {"entrance": "moc_fild03", "floors": ["anthell01", "anthell02"]},
    "Payon Cave": {"entrance": "payon", "floors": ["pay_dun00", "pay_dun01", "pay_dun02", "pay_dun03", "pay_dun04"]},
    "Geffen Dungeon": {"entrance": "geffen", "floors": ["gef_dun00", "gef_dun01", "gef_dun02", "gef_dun03"]},
    "Orc Dungeon": {"entrance": "gef_fild10", "floors": ["orcsdun01", "orcsdun02"]},
    "Mjolnir Dead Pit": {"entrance": "mjolnir_07", "floors": ["mjo_dun01", "mjo_dun02", "mjo_dun03"]},
    "Clock Tower": {"entrance": "aldebaran", "floors": ["c_tower1", "c_tower2", "c_tower3", "c_tower4", "alde_dun01", "alde_dun02", "alde_dun03", "alde_dun04"]},
    "Glast Heim": {"entrance": "glast_01", "floors": ["gl_cas01", "gl_cas02", "gl_church", "gl_chyard", "gl_knt01", "gl_knt02", "gl_prison", "gl_prison1", "gl_sew01", "gl_sew02", "gl_sew03", "gl_sew04", "gl_step", "gl_dun01", "gl_dun02"]},
    "Undersea Tunnel": {"entrance": "izlude", "floors": ["iz_dun00", "iz_dun01", "iz_dun02", "iz_dun03", "iz_dun04"]},
    "Labyrinth Forest": {"entrance": "prt_fild02", "floors": ["prt_maze01", "prt_maze02", "prt_maze03"]},
    "Sunken Ship": {"entrance": "alb2trea", "floors": ["treasure01", "treasure02"]},
    "Nogg Road (Magma)": {"entrance": "yuno_fild03", "floors": ["mag_dun01", "mag_dun02"]},
    "Abyss Lake": {"entrance": "hu_fild05", "floors": ["abyss_01", "abyss_02", "abyss_03"]},
    "Thanatos Tower": {"entrance": "hu_fild01", "floors": ["tha_t01", "tha_t02", "tha_t03", "tha_t04", "tha_t05", "tha_t06", "tha_t07", "tha_t08", "tha_t09", "tha_t10", "tha_t11", "tha_t12"]},
    "Odin Temple": {"entrance": "odin_tem01", "floors": ["odin_tem01", "odin_tem02", "odin_tem03"]},
    "Amatsu Dungeon": {"entrance": "amatsu", "floors": ["ama_dun01", "ama_dun02", "ama_dun03"]},
    "Gonryun Dungeon": {"entrance": "gonryun", "floors": ["gon_dun01", "gon_dun02", "gon_dun03"]},
    "Louyang Dungeon": {"entrance": "louyang", "floors": ["lou_dun01", "lou_dun02", "lou_dun03"]},
    "Ayothaya Dungeon": {"entrance": "ayothaya", "floors": ["ayo_dun01", "ayo_dun02"]},
    "Turtle Island": {"entrance": "alberta", "floors": ["tur_dun01", "tur_dun02", "tur_dun03", "tur_dun04"]},
    "Cursed Monastery": {"entrance": "nameless_n", "floors": ["abbey01", "abbey02", "abbey03"]},
    "Toy Factory": {"entrance": "xmas", "floors": ["xmas_dun01", "xmas_dun02"]},
    "Umbala Dungeon": {"entrance": "umbala", "floors": ["um_dun01", "um_dun02"]},
    "Comodo Cave (West)": {"entrance": "comodo", "floors": ["beach_dun"]},
    "Comodo Cave (North)": {"entrance": "comodo", "floors": ["beach_dun2"]},
    "Comodo Cave (East)": {"entrance": "comodo", "floors": ["beach_dun3"]},
    "Mine Dungeon": {"entrance": "einbech", "floors": ["ein_dun01", "ein_dun02"]},
    "Juperos": {"entrance": "yuno_fild07", "floors": ["jupe_cave", "juperos_01", "juperos_02"]},
    "Somatology Lab": {"entrance": "lighthalzen", "floors": ["lhz_dun01", "lhz_dun02", "lhz_dun03"]},
    "Robot Factory": {"entrance": "lighthalzen", "floors": ["kh_dun01", "kh_dun02"]},
    "Thor Volcano": {"entrance": "ve_fild03", "floors": ["thor_v01", "thor_v02", "thor_v03"]},
    "Ice Cave": {"entrance": "ra_fild01", "floors": ["ice_dun01", "ice_dun02", "ice_dun03", "ice_dun04"]},
    "Rachel Sanctuary": {"entrance": "rachel", "floors": ["ra_san01", "ra_san02", "ra_san03", "ra_san04", "ra_san05"]},
    "Nidhoggur": {"entrance": "yuno_fild02", "floors": ["nyd_dun01", "nyd_dun02"]},
    "Gefenia": {"entrance": "geffen", "floors": ["gefenia01", "gefenia02", "gefenia03", "gefenia04"]},
    "Moscovia Dungeon": {"entrance": "moscovia", "floors": ["mosk_dun01", "mosk_dun02", "mosk_dun03"]},
}


# Field maps with spawn data but missing from mappostable.txt
# Positions estimated from adjacent maps on the grid
EXTRA_FIELD_MAPS = {
    # Morocc desert (grid: ~57x58 cells)
    # Row at y=785-844 (north), columns east of morocc
    'moc_fild04': (660, 785, 717, 844),
    'moc_fild05': (718, 785, 776, 844),
    'moc_fild06': (777, 785, 835, 844),
    # Row at y=845-893 (morocc row), east of morocc
    'moc_fild08': (660, 845, 717, 893),
    'moc_fild09': (718, 845, 776, 893),
    'moc_fild10': (777, 845, 835, 893),
    # Row at y=894-950 (south), east of moc_fild11
    'moc_fild14': (718, 894, 776, 950),
    'moc_fild15': (777, 894, 835, 950),
    # Payon area (grid: ~58x57 cells)
    'pay_fild05': (871, 804, 927, 861),   # west of pay_fild01
    'pay_fild11': (1054, 862, 1113, 919), # south of pay_fild10
    # Geffen area (grid: ~58x58 cells)
    'gef_fild12': (753, 528, 810, 586),   # east of prt_fild00
    'gef_fild14': (753, 587, 810, 643),   # east of prt_fild04
    # Einbroch area (grid: ~58x58 cells)
    'ein_fild02': (636, 58, 694, 116),    # east of ein_fild01
    'ein_fild10': (460, 235, 517, 291),   # west of einbroch
    # Hugel area (grid: ~57x57 cells)
    'hu_fild03': (695, 117, 752, 175),    # below hu_fild01
    'hu_fild07': (928, 0, 985, 57),       # east of hugel
    # Comodo area (grid: ~58x58 cells)
    'cmd_fild05': (297, 894, 356, 950),   # south of comodo
    # Nifflheim area (left side, near umbala at y=490-560)
    'nif_fild01': (145, 500, 202, 558),
    'nif_fild02': (203, 500, 260, 558),
    # Amatsu (bottom-right, near Alberta/Payon)
    'ama_fild01': (1130, 830, 1187, 888),
    # Ayothaya (right side, below middle)
    'ayo_fild01': (1175, 590, 1232, 648),
    'ayo_fild02': (1175, 649, 1232, 707),
    # Gonryun (right side, upper area)
    'gon_fild01': (1010, 290, 1067, 348),
    # Louyang (right side, near Moscovia)
    'lou_fild01': (1080, 440, 1137, 498),
    # Xmas/Lutie (upper area, near Aldebaran)
    'xmas_fild01': (380, 352, 437, 410),
}


def parse_mappostable(filepath):
    """Parse mappostable.txt -> dict of map_name -> (x1,y1,x2,y2)."""
    maps = {}
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            parts = line.split('#')
            if len(parts) < 6:
                continue
            try:
                map_name = parts[1].replace('.rsw', '')
                x1, y1, x2, y2 = int(parts[2]), int(parts[3]), int(parts[4]), int(parts[5])
                maps[map_name] = (x1, y1, x2, y2)
            except (ValueError, IndexError):
                continue
    return maps


def parse_mapnametable(filepath):
    """Parse mapnametable.txt -> dict of map_name -> english_name."""
    names = {}
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            parts = line.split('#')
            if len(parts) >= 2:
                map_name = parts[0].replace('.rsw', '')
                eng_name = parts[1].strip()
                if eng_name:
                    names[map_name] = eng_name
    return names


def parse_navi_link(filepath):
    """Parse decompiled navi_link lua -> list of warp connections."""
    connections = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse entries: {"from_map", id, ?, ?, "label", "", src_x, src_y, "to_map", dst_x, dst_y}
    pattern = re.compile(
        r'\{\s*"(\w+)",\s*\d+,\s*\d+,\s*\d+,\s*"([^"]*)",\s*"[^"]*",\s*(\d+),\s*(\d+),\s*"(\w+)",\s*(\d+),\s*(\d+)\s*\}',
        re.DOTALL
    )

    for m in pattern.finditer(content):
        from_map = m.group(1)
        label = m.group(2)
        src_x, src_y = int(m.group(3)), int(m.group(4))
        to_map = m.group(5)
        dst_x, dst_y = int(m.group(6)), int(m.group(7))

        # Skip self-warps (internal map teleports)
        if from_map == to_map:
            continue

        connections.append({
            'from': from_map,
            'to': to_map,
            'label': label,
            'sx': src_x, 'sy': src_y,
            'dx': dst_x, 'dy': dst_y,
        })

    return connections


def detect_direction(from_pos, to_pos):
    """Detect warp direction based on grid positions."""
    if not from_pos or not to_pos:
        return 'portal'

    fx = (from_pos[0] + from_pos[2]) / 2
    fy = (from_pos[1] + from_pos[3]) / 2
    tx = (to_pos[0] + to_pos[2]) / 2
    ty = (to_pos[1] + to_pos[3]) / 2

    dx = tx - fx
    dy = ty - fy

    if abs(dx) > abs(dy):
        return 'E' if dx > 0 else 'W'
    else:
        return 'S' if dy > 0 else 'N'


def load_spawn_maps():
    """Get set of maps that have spawn data."""
    spawn_file = os.path.join(BASE_DIR, 'web', 'spawn_data.js')
    maps = set()
    if os.path.exists(spawn_file):
        with open(spawn_file, 'r', encoding='utf-8') as f:
            content = f.read()
        maps = set(re.findall(r'"([^"]+)":\[', content))
    return maps


def main():
    # Parse all data sources
    mappos_file = os.path.join(BASE_DIR, 'temp_extract', 'mappostable.txt')
    if not os.path.exists(mappos_file):
        print(f"ERROR: {mappos_file} not found!")
        return

    map_positions = parse_mappostable(mappos_file)
    print(f"Map positions from mappostable: {len(map_positions)} maps")

    # Add extra field maps not in mappostable
    added = 0
    for name, pos in EXTRA_FIELD_MAPS.items():
        if name not in map_positions:
            map_positions[name] = pos
            added += 1
    print(f"Extra field maps added: {added} (total: {len(map_positions)})")

    # Map display names
    name_file = os.path.join(BASE_DIR, 'temp_extract', 'mapnametable.txt')
    display_names = parse_mapnametable(name_file) if os.path.exists(name_file) else {}
    print(f"Display names: {len(display_names)} maps")

    # Warp connections
    navi_file = os.path.join(BASE_DIR, 'temp_extract', 'navi_link_th_dec.lua')
    warps = []
    if os.path.exists(navi_file):
        warps = parse_navi_link(navi_file)
        print(f"Warp connections: {len(warps)} (excluding self-warps)")
    else:
        print("WARNING: navi_link not found, skipping warp data")

    # Spawn data
    spawn_maps = load_spawn_maps()
    print(f"Spawn maps: {len(spawn_maps)}")

    # Check available minimap images
    minimap_dir = os.path.join(BASE_DIR, 'web', 'minimaps')
    available_minimaps = set()
    if os.path.exists(minimap_dir):
        available_minimaps = {os.path.splitext(f)[0] for f in os.listdir(minimap_dir) if f.endswith('.png')}
    print(f"Available minimaps: {len(available_minimaps)}")

    # ========== Build map_grid.js ==========
    grid_data = []
    for map_name, (x1, y1, x2, y2) in map_positions.items():
        entry = {
            'n': map_name,
            'x1': x1, 'y1': y1,
            'x2': x2, 'y2': y2,
        }
        if map_name in CITIES:
            entry['city'] = 1
        if map_name in spawn_maps:
            entry['s'] = 1
        if map_name in available_minimaps:
            entry['img'] = 1
        grid_data.append(entry)

    grid_data.sort(key=lambda x: (x['y1'], x['x1']))

    out_grid = os.path.join(BASE_DIR, 'web', 'map_grid.js')
    with open(out_grid, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated world map grid positions from mappostable.txt\n')
        f.write(f'// {len(grid_data)} maps, {sum(1 for g in grid_data if g.get("img"))} with minimaps\n')
        f.write(f'const MAP_GRID_DATA = {json.dumps(grid_data, separators=(",",":"))};\n')

    print(f"\nmap_grid.js: {len(grid_data)} cells, {sum(1 for g in grid_data if g.get('img'))} with images")

    # ========== Build connections ==========
    # Build warp adjacency: only connections between maps that are on the grid
    grid_maps = {g['n'] for g in grid_data}
    all_known_maps = grid_maps | spawn_maps

    # Build connection map: from_map -> [{to, dir}]
    connections = {}
    seen_pairs = set()

    for w in warps:
        fm, tm = w['from'], w['to']
        # Only include connections where at least one map is on the grid
        if fm not in all_known_maps and tm not in all_known_maps:
            continue

        # Deduplicate bidirectional connections
        pair = tuple(sorted([fm, tm]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        direction = detect_direction(
            map_positions.get(fm),
            map_positions.get(tm)
        )

        if fm not in connections:
            connections[fm] = []
        connections[fm].append({'to': tm, 'dir': direction})

        # Add reverse
        rev_dir = {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E', 'portal': 'portal'}
        if tm not in connections:
            connections[tm] = []
        connections[tm].append({'to': fm, 'dir': rev_dir.get(direction, 'portal')})

    print(f"Connections: {len(connections)} maps with warps, {len(seen_pairs)} unique pairs")

    # ========== Dungeon groups with spawn data ==========
    # Filter to only include dungeon groups that have spawn data
    active_dungeons = {}
    for name, dg in DUNGEON_GROUPS.items():
        floors_with_spawns = [f for f in dg['floors'] if f in spawn_maps]
        if floors_with_spawns:
            active_dungeons[name] = {
                'entrance': dg['entrance'],
                'floors': floors_with_spawns,
            }

    print(f"Active dungeon groups: {len(active_dungeons)} (with spawn data)")

    # ========== Filter display names ==========
    # Only include names for maps we actually use
    filtered_names = {k: v for k, v in display_names.items() if k in all_known_maps}

    # ========== Write map_connections.js ==========
    out_conn = os.path.join(BASE_DIR, 'web', 'map_connections.js')
    with open(out_conn, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated map connections, dungeon groups, and display names\n')

        f.write(f'const MAP_CONNECTIONS = {json.dumps(connections, separators=(",",":"), ensure_ascii=False)};\n')

        f.write(f'const DUNGEON_GROUPS = {json.dumps(active_dungeons, separators=(",",":"), ensure_ascii=False)};\n')

        f.write(f'const MAP_DISPLAY_NAMES = {json.dumps(filtered_names, separators=(",",":"), ensure_ascii=False)};\n')

    conn_size = os.path.getsize(out_conn)
    print(f"map_connections.js: {conn_size:,} bytes")
    print(f"  Connections: {len(connections)} maps")
    print(f"  Dungeons: {len(active_dungeons)} groups")
    print(f"  Names: {len(filtered_names)} maps")


if __name__ == '__main__':
    main()
