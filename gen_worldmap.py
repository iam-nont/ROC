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
    # Hugel area
    'hu_fild03': (812, 0, 870, 57),       # between hu_fild02 and hugel
    'hu_fild07': (928, 0, 985, 57),       # east of hugel
    # Einbroch area
    'ein_fild02': (576, 117, 635, 173),   # below ein_fild01
    'ein_fild10': (636, 292, 694, 351),   # right of ein_fild09
    # Veins area
    've_fild05': (107, 469, 163, 527),    # left of ve_fild06, below ve_fild03
    # Nifflheim area (right of veins)
    'nif_fild01': (224, 528, 282, 586),   # right of veins
    'nif_fild02': (283, 528, 341, 586),   # right of nif_fild01
    # Geffen area (left column)
    'gef_fild12': (460, 587, 517, 643),   # left of gef_fild13
    'gef_fild14': (460, 644, 517, 701),   # below gef_fild12
    # Xmas/Lutie (near Aldebaran)
    'xmas_fild01': (871, 352, 927, 410),  # right of mjolnir_12, near aldebaran
    # Morocc desert - north row (right of moc_fild07)
    'moc_fild06': (660, 785, 717, 844),   # east of moc_fild07
    'moc_fild05': (718, 785, 776, 844),
    'moc_fild04': (777, 785, 835, 844),   # far east
    # Morocc desert - middle row (east of morocc)
    'moc_fild10': (660, 845, 717, 893),   # directly east of morocc
    'moc_fild09': (718, 845, 776, 893),
    'moc_fild08': (777, 845, 835, 893),   # far east
    # Morocc desert - south row
    'moc_fild14': (718, 894, 776, 938),   # trimmed y2 to avoid moc_fild16
    'moc_fild15': (777, 894, 835, 950),
    # Payon area
    'pay_fild05': (949, 932, 1003, 989),  # left of pay_fild06
    'pay_fild11': (905, 869, 959, 931),   # left of pay_fild02
    # Comodo area
    'cmd_fild05': (297, 894, 356, 950),   # south of comodo
    # Island maps (accessible via NPC warps)
    'ama_fild01': (1130, 830, 1187, 888),
    'ayo_fild01': (1175, 590, 1232, 648),
    'ayo_fild02': (1175, 649, 1232, 707),
    'gon_fild01': (1010, 290, 1067, 348),
    'lou_fild01': (1080, 440, 1137, 498),
}

# Edge-walk connections missing from navi_link
# Format: (from_map, to_map, src_x, src_y, map_max)
# These are walking exits between adjacent maps not captured in navi_link
EXTRA_WARPS = [
    # Morocc east exit → moc_fild10
    ('morocc', 'moc_fild10', 299, 160, 300),
    # Morocc desert grid connections
    ('moc_fild07', 'moc_fild06', 380, 200, 390),
    ('moc_fild06', 'moc_fild07', 20, 200, 390),
    ('moc_fild06', 'moc_fild05', 380, 200, 390),
    ('moc_fild05', 'moc_fild06', 20, 200, 390),
    ('moc_fild05', 'moc_fild04', 380, 200, 390),
    ('moc_fild04', 'moc_fild05', 20, 200, 390),
    ('moc_fild10', 'morocc', 20, 200, 390),
    ('moc_fild10', 'moc_fild09', 380, 200, 390),
    ('moc_fild09', 'moc_fild10', 20, 200, 390),
    ('moc_fild09', 'moc_fild08', 380, 200, 390),
    ('moc_fild08', 'moc_fild09', 20, 200, 390),
    # Vertical connections
    ('moc_fild06', 'moc_fild10', 200, 20, 390),
    ('moc_fild10', 'moc_fild06', 200, 380, 390),
    ('moc_fild05', 'moc_fild09', 200, 20, 390),
    ('moc_fild09', 'moc_fild05', 200, 380, 390),
    ('moc_fild04', 'moc_fild08', 200, 20, 390),
    ('moc_fild08', 'moc_fild04', 200, 380, 390),
]


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

    # Add edge-walk connections from EXTRA_WARPS
    for fm, tm, sx, sy, map_max in EXTRA_WARPS:
        warps.append({
            'from': fm, 'to': tm,
            'label': 'edge',
            'sx': sx, 'sy': sy,
            'dx': 0, 'dy': 0,
        })
    print(f"After EXTRA_WARPS: {len(warps)} total connections")

    # Auto-detect adjacent maps on the grid and add edge-walk connections
    # This catches all field maps that are side-by-side but not in navi_link
    existing_pairs = set()
    for w in warps:
        existing_pairs.add((w['from'], w['to']))
        existing_pairs.add((w['to'], w['from']))

    map_names_list = list(map_positions.keys())
    auto_added = 0
    for i in range(len(map_names_list)):
        for j in range(i + 1, len(map_names_list)):
            a, b = map_names_list[i], map_names_list[j]
            if (a, b) in existing_pairs:
                continue
            pos_a = map_positions[a]
            pos_b = map_positions[b]
            # Check adjacency: tiles touching or within small gap
            ax1, ay1, ax2, ay2 = pos_a
            bx1, by1, bx2, by2 = pos_b
            gap = 15
            # Horizontal adjacency (side by side, y ranges overlap)
            h_adj = (abs(ax2 - bx1) <= gap or abs(bx2 - ax1) <= gap) and \
                    ay1 < by2 and ay2 > by1
            # Vertical adjacency (top-bottom, x ranges overlap)
            v_adj = (abs(ay2 - by1) <= gap or abs(by2 - ay1) <= gap) and \
                    ax1 < bx2 and ax2 > bx1
            if h_adj or v_adj:
                warps.append({
                    'from': a, 'to': b,
                    'label': 'edge',
                    'sx': 0, 'sy': 0,
                    'dx': 0, 'dy': 0,
                })
                existing_pairs.add((a, b))
                existing_pairs.add((b, a))
                auto_added += 1
    print(f"Auto-detected adjacent connections: {auto_added} (total: {len(warps)})")

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

    # ========== Warp points (red dots on minimap tiles) ==========
    # Only include warps between ADJACENT grid maps (edge-walk exits)
    def are_adjacent(pos_a, pos_b, gap=25):
        """Check if two grid tiles are adjacent (touching or within gap px)."""
        ax1, ay1, ax2, ay2 = pos_a
        bx1, by1, bx2, by2 = pos_b
        # Check horizontal adjacency (tiles side by side, y overlapping)
        h_adj = (abs(ax2 - bx1) <= gap or abs(bx2 - ax1) <= gap) and \
                ay1 < by2 + gap and ay2 > by1 - gap
        # Check vertical adjacency (tiles top-bottom, x overlapping)
        v_adj = (abs(ay2 - by1) <= gap or abs(by2 - ay1) <= gap) and \
                ax1 < bx2 + gap and ax2 > bx1 - gap
        return h_adj or v_adj

    warp_points = {}
    raw_pts = {}
    for w in warps:
        fm, tm = w['from'], w['to']
        if fm not in grid_maps or tm not in grid_maps:
            continue
        # Only adjacent maps (edge-walk connections)
        if fm not in map_positions or tm not in map_positions:
            continue
        if not are_adjacent(map_positions[fm], map_positions[tm]):
            continue
        if fm not in raw_pts:
            raw_pts[fm] = []
        raw_pts[fm].append((w['sx'], w['sy'], tm))

    for map_name, pts in raw_pts.items():
        max_x = max(p[0] for p in pts) + 10
        max_y = max(p[1] for p in pts) + 10
        unique_pts = []
        for sx, sy, to_map in pts:
            found = False
            for up in unique_pts:
                if abs(up['sx'] - sx) < 15 and abs(up['sy'] - sy) < 15:
                    found = True
                    break
            if not found:
                nx = round(sx / max_x, 3)
                ny = round(1 - sy / max_y, 3)
                unique_pts.append({'sx': sx, 'sy': sy, 'x': nx, 'y': ny, 'to': to_map})
        warp_points[map_name] = [{'x': p['x'], 'y': p['y'], 'to': p['to']} for p in unique_pts]

    print(f"Warp points: {len(warp_points)} maps, {sum(len(v) for v in warp_points.values())} total points")

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

        f.write(f'const MAP_WARP_POINTS = {json.dumps(warp_points, separators=(",",":"), ensure_ascii=False)};\n')

    conn_size = os.path.getsize(out_conn)
    print(f"map_connections.js: {conn_size:,} bytes")
    print(f"  Connections: {len(connections)} maps")
    print(f"  Dungeons: {len(active_dungeons)} groups")
    print(f"  Names: {len(filtered_names)} maps")


if __name__ == '__main__':
    main()
