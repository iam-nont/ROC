"""
Scrape monster spawn data from Divine Pride website for thROC (ROC Classic TH).
Sets server to thROC via session API before scraping.

Usage: python scrape_divine_pride.py [--resume]
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import http.cookiejar


def create_opener():
    """Create URL opener with cookie jar and set server to thROC."""
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [
        ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
        ('Accept', 'text/html,application/xhtml+xml'),
        ('Accept-Language', 'en-US,en;q=0.9'),
    ]

    # Set server to thROC (ROC Classic TH)
    set_url = 'https://www.divine-pride.net/Api/Regions/SetServer/thROC'
    req = urllib.request.Request(set_url, data=b'', method='POST')
    try:
        opener.open(req, timeout=15)
        print("Server set to thROC (ROC Classic TH)")
    except Exception as e:
        print(f"Warning: Failed to set server: {e}")

    return opener, cj


def parse_spawn_from_html(html):
    """Extract spawn data from Divine Pride monster HTML page.
    Parses div.mapinfo blocks within the default spawn section.
    Aggregates multiple entries for the same map by summing counts."""

    # Find the spawn tab
    spawn_tab = re.search(r'<div[^>]*id="spawn"[^>]*>(.*)', html, re.DOTALL)
    if not spawn_tab:
        return []

    spawn_html = spawn_tab.group(1)

    # Try to get the default section specifically
    default_match = re.search(
        r'id="alternatespawn_default"[^>]*>(.*?)(?=<div[^>]*class="alternatespawn"|$)',
        spawn_html, re.DOTALL
    )
    if default_match:
        section = default_match.group(1)
    else:
        section = spawn_html

    # Parse all mapinfo blocks
    mapinfos = re.findall(
        r'<div class="mapinfo">.*?'
        r'<div class="mapsubtitle">\s*<a[^>]*>([^<]+)</a>.*?'
        r'<div class="mapamount">\s*(\d+)x\s*</div>.*?'
        r'<div class="maprespawn">\s*([^<]+?)\s*</div>',
        section, re.DOTALL
    )

    # Aggregate by map name (sum counts, keep shortest respawn)
    map_data = {}
    for map_name, count, respawn in mapinfos:
        map_name = map_name.strip()
        if '@' in map_name:
            continue
        count = int(count)
        respawn = respawn.strip()
        if map_name in map_data:
            map_data[map_name]['count'] += count
        else:
            map_data[map_name] = {
                'map': map_name,
                'count': count,
                'respawn': respawn,
            }

    return list(map_data.values())


def fetch_page(opener, url, retries=3):
    """Fetch a URL with retries and rate limit handling."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url)
            resp = opener.open(req, timeout=20)
            return resp.read().decode('utf-8', errors='ignore')
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 15 * (attempt + 1)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            elif e.code == 404:
                return None
            else:
                print(f"    HTTP {e.code}, retry {attempt+1}/{retries}")
                time.sleep(3)
        except Exception as e:
            print(f"    Error: {e}, retry {attempt+1}/{retries}")
            time.sleep(3)
    return None


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    resume = '--resume' in sys.argv

    # Create opener with thROC server session
    opener, cj = create_opener()

    # Get monster IDs from monster_data.js
    with open(os.path.join(base, 'web', 'monster_data.js'), 'r', encoding='utf-8') as f:
        content = f.read()

    # Build name->id mapping (use LOWEST/primary ID for each name)
    name_pattern = re.findall(r'"id":\s*(\d+).*?"name":\s*"([^"]+)"', content)
    name_to_id = {}
    for mid, name in name_pattern:
        key = name.lower()
        mid_int = int(mid)
        if key not in name_to_id or mid_int < name_to_id[key]:
            name_to_id[key] = mid_int
    id_to_name = {int(mid): name for mid, name in name_pattern}

    # Get ROC official monster names for filtering
    roc_file = os.path.join(base, 'roc_monsters_parsed.json')
    roc_names = set()
    if os.path.exists(roc_file):
        with open(roc_file, 'r', encoding='utf-8') as f:
            roc_data = json.load(f)
        roc_names = {m['name'].lower() for m in roc_data}
        print(f"ROC official: {len(roc_names)} monster names")

    # Match ROC names to IDs
    target_ids = []
    matched_names = []
    for name in roc_names:
        if name in name_to_id:
            target_ids.append(name_to_id[name])
            matched_names.append(name)

    print(f"Matched {len(target_ids)} IDs to ROC official names")
    unmatched = roc_names - set(matched_names)
    if unmatched:
        print(f"Unmatched ROC names: {len(unmatched)}")
        for n in sorted(unmatched)[:10]:
            print(f"  - {n}")

    target_ids.sort()

    # Load existing progress
    progress_file = os.path.join(base, 'dp_spawns_scraped.json')
    scraped = {}
    if resume and os.path.exists(progress_file):
        with open(progress_file, 'r', encoding='utf-8') as f:
            scraped = json.load(f)
        print(f"Resuming from {len(scraped)} already scraped")

    # Scrape Divine Pride
    remaining = [mid for mid in target_ids if str(mid) not in scraped]
    print(f"\nScraping {len(remaining)} monsters from Divine Pride (thROC)...")
    print(f"(Total target: {len(target_ids)}, already done: {len(scraped)})")
    print("=" * 60)

    session_refresh = 0
    for i, mid in enumerate(remaining):
        # Refresh session every 100 monsters to keep thROC active
        session_refresh += 1
        if session_refresh >= 100:
            set_url = 'https://www.divine-pride.net/Api/Regions/SetServer/thROC'
            try:
                req = urllib.request.Request(set_url, data=b'', method='POST')
                opener.open(req, timeout=15)
                print("  -- Refreshed thROC session --")
            except:
                pass
            session_refresh = 0

        url = f"https://www.divine-pride.net/database/monster/{mid}"
        html = fetch_page(opener, url)

        name = id_to_name.get(mid, f'ID_{mid}')

        if html is None:
            scraped[str(mid)] = {'name': name, 'spawns': [], 'error': 'not_found'}
            print(f"  [{len(scraped)}/{len(target_ids)}] {name} (ID {mid}): not found")
        else:
            spawns = parse_spawn_from_html(html)
            scraped[str(mid)] = {
                'name': name,
                'spawns': spawns,
            }
            print(f"  [{len(scraped)}/{len(target_ids)}] {name} (ID {mid}): {len(spawns)} spawns")

        # Save progress every 25 monsters
        if len(scraped) % 25 == 0:
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump(scraped, f)
            print(f"  -- Saved progress: {len(scraped)}/{len(target_ids)} --")

        # Rate limiting
        time.sleep(0.8)

    # Save final
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(scraped, f, indent=2)

    # Stats
    total_spawns = sum(len(v.get('spawns', [])) for v in scraped.values())
    with_data = sum(1 for v in scraped.values() if v.get('spawns'))
    print(f"\n{'=' * 60}")
    print(f"Scraped: {len(scraped)} monsters")
    print(f"  With spawn data: {with_data}")
    print(f"  Total spawn entries: {total_spawns}")
    print(f"  Saved to: {progress_file}")
    print(f"\nTo rebuild spawn_data.js with this data:")
    print(f"  python build_spawn_data.py")


if __name__ == '__main__':
    main()
