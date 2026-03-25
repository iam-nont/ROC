"""
Scrape monster spawn data from RateMyServer (Pre-Renewal).
Output: rms_spawns.json — {map_name: [{id, name, count, respawn?, boss?}]}

Usage: python scrape_rms.py
"""
import json
import os
import re
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# RMS area IDs (Pre-Renewal)
RMS_AREAS = {
    2001: "Comodo Field",
    2002: "Mt.Mjolnir",
    2003: "Prontera Field",
    2004: "Hugel Field",
    2005: "Geffen Field",
    2006: "Morroc Field",
    2007: "Payon Forest",
    2008: "Yuno Field",
    2009: "Lighthalzen Field",
    2010: "Einbroch Field",
    2011: "Ayothaya Field",
    2012: "Niflheim Field",
    2013: "Umbala Forest",
    2014: "Gonryun Field",
    2016: "Amatsu Field",
    2017: "Lutie Field",
    2018: "Louyang Field",
    2019: "Rachel Field",
    2020: "Veins Field",
    2021: "Moscovia Field",
    1001: "Abyss Lake",
    1002: "Amatsu Dungeon",
    1003: "Ant Hell",
    1004: "Ayothaya Shrine",
    1005: "Bio Laboratory",
    1006: "Byalan Island",
    1007: "Clock Tower",
    1008: "Einbroch Mine",
    1009: "Juperos",
    1010: "Geffenia",
    1011: "Glast Heim",
    1012: "Louyang Dungeon",
    1013: "Thanatos Tower",
    1014: "Umbala Dungeon",
    1015: "Gonryun Dungeon",
    1016: "Geffen Dungeon",
    1017: "Magma Dungeon",
    1018: "Sphinx",
    1019: "Pyramid",
    1020: "Coal Mine",
    1021: "Orc Dungeon",
    1022: "Payon Cave",
    1023: "Labyrinth Forest",
    1024: "Prontera Culvert",
    1025: "Sunken Ship",
    1026: "Turtle Island",
    1027: "Toy Factory",
    1028: "Beach Dungeon",
    1030: "Odin Temple",
    1031: "Kiel Robot Factory",
    1032: "Ice Cave",
    1033: "Rachel Sanctuary",
    1034: "Thors Volcano",
    1035: "Nameless Abbey",
    1036: "Moscovia Dungeon",
    1080: "Amicitia Dungeon",
    1081: "Niflheim Dungeon",
    1082: "Rudus Dungeon",
}

RMS_URL = "https://ratemyserver.net/index.php?page=areainfo&area={}"


def fetch_page(area_id):
    """Fetch RMS area page HTML."""
    url = RMS_URL.format(area_id)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except urllib.error.URLError as e:
        print(f"  ERROR: {e}")
        return None


def parse_spawns(html):
    """Parse spawn data from RMS HTML.

    Map headers: <b>Map: MAP_NAME</b>
    Monster entries inside <div class='area_mob_li'>:
      - mob_id from: mob_id=XXXX
      - name: text before <b>(</b>
      - count + respawn: inside <b>(</b>...<b>)</b>
      - MVP: <b>[</b>MVP<b>]</b>
    """
    spawns = {}

    # Split by map headers
    map_sections = re.split(r"<b>Map:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*</b>", html)
    # map_sections[0] = before first map, then alternating: [name, content, name, content, ...]

    for i in range(1, len(map_sections) - 1, 2):
        map_name = map_sections[i].lower()
        section = map_sections[i + 1]

        monsters = []

        # Find all monster entries
        entries = re.findall(r"<div class='area_mob_li'>(.*?)</div>", section, re.DOTALL)

        for entry in entries:
            # Extract mob_id
            id_match = re.search(r'mob_id=(\d+)', entry)
            if not id_match:
                continue
            mob_id = int(id_match.group(1))

            # Check MVP
            is_boss = bool(re.search(r'\[.*?MVP.*?\]', entry))

            # Extract content between <b>(</b> and <b>)</b>
            count_match = re.search(r'<b>\(</b>(.*?)<b>\)</b>', entry, re.DOTALL)
            if not count_match:
                # Try without <b> tags (some entries use plain parens)
                count_match = re.search(r'\((\d+[^)]*)\)', entry)
                if not count_match:
                    continue

            count_str = re.sub(r'<[^>]+>', '', count_match.group(1)).strip()

            # Extract monster name (strip HTML tags)
            # Name is between hideddrivetip_image()"> and the (<b>) count section
            clean = re.sub(r'<[^>]+>', '', entry)
            name_match = re.search(r'hideddrivetip_image\(\)"\s*>(.*?)(?:\[MVP\]|\()', entry, re.DOTALL)
            if name_match:
                mob_name = re.sub(r'<[^>]+>', '', name_match.group(1)).strip()
            else:
                mob_name = f"Monster_{mob_id}"

            # Parse count and respawn from count_str
            # Patterns:
            #   "70"           -> count=70, no respawn
            #   "4 / 14 min"   -> count=4, respawn=14
            #   "1 / 180~190 min" -> count=1, respawn=180
            #   "10 / 3-5 min" -> count=10, respawn=3
            count = 0
            respawn = 0

            resp_match = re.match(r'(\d+)\s*/\s*(\d+)(?:\s*[-~]\s*\d+)?\s*(min|sec|hr)', count_str)
            if resp_match:
                count = int(resp_match.group(1))
                resp_val = int(resp_match.group(2))
                resp_unit = resp_match.group(3)
                if resp_unit == 'hr':
                    respawn = resp_val * 60
                elif resp_unit == 'sec':
                    respawn = max(1, resp_val // 60)
                else:
                    respawn = resp_val
            else:
                # Just a count
                num_match = re.match(r'(\d+)', count_str)
                if num_match:
                    count = int(num_match.group(1))

            if count > 0:
                mon = {
                    'id': mob_id,
                    'name': mob_name,
                    'count': count,
                }
                if respawn > 0:
                    mon['respawn'] = respawn
                if is_boss:
                    mon['boss'] = True
                monsters.append(mon)

        if monsters:
            spawns[map_name] = monsters

    return spawns


def main():
    output_file = os.path.join(BASE_DIR, 'rms_spawns.json')

    all_spawns = {}

    total = len(RMS_AREAS)
    for idx, (area_id, area_name) in enumerate(RMS_AREAS.items(), 1):
        print(f"[{idx}/{total}] Area {area_id}: {area_name}...", end=' ', flush=True)

        html = fetch_page(area_id)
        if not html:
            continue

        spawns = parse_spawns(html)
        for map_name, monsters in spawns.items():
            all_spawns[map_name] = monsters

        map_count = len(spawns)
        mon_count = sum(len(v) for v in spawns.values())
        print(f"{map_count} maps, {mon_count} spawns")

        # Save progress
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_spawns, f, ensure_ascii=False, indent=2)

        time.sleep(1.0)

    # Summary
    print(f"\n{'='*50}")
    print(f"Total maps: {len(all_spawns)}")
    print(f"Total spawn entries: {sum(len(v) for v in all_spawns.values())}")
    print(f"Output: {output_file}")


if __name__ == '__main__':
    main()
