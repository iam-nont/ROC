"""
Scrape monster spawn data from Divine Pride website (no API key needed).
Fetches HTML pages and parses div.mapinfo elements for spawn data.

Usage: python scrape_divine_pride.py [--resume]
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error


def parse_spawn_from_html(html):
    """Extract spawn data from Divine Pride monster HTML page.
    Parses div.mapinfo blocks within the default spawn section."""

    # Find the spawn tab
    spawn_tab = re.search(r'<div[^>]*id="spawn"[^>]*>(.*)', html, re.DOTALL)
    if not spawn_tab:
        return []

    spawn_html = spawn_tab.group(1)

    # Try to get the default section specifically
    # The default section is inside alternatespawn_default div
    default_match = re.search(
        r'id="alternatespawn_default"[^>]*>(.*?)(?=<div[^>]*class="alternatespawn"|$)',
        spawn_html, re.DOTALL
    )
    if default_match:
        section = default_match.group(1)
    else:
        # Fallback: use everything in spawn tab
        section = spawn_html

    # Parse all mapinfo blocks
    mapinfos = re.findall(
        r'<div class="mapinfo">.*?'
        r'<div class="mapsubtitle">\s*<a[^>]*>([^<]+)</a>.*?'
        r'<div class="mapamount">\s*(\d+)x\s*</div>.*?'
        r'<div class="maprespawn">\s*([^<]+?)\s*</div>',
        section, re.DOTALL
    )

    spawns = []
    for map_name, count, respawn in mapinfos:
        map_name = map_name.strip()
        # Skip special instance maps
        if '@' in map_name:
            continue
        spawns.append({
            'map': map_name,
            'count': int(count),
            'respawn': respawn.strip(),
        })

    return spawns


def fetch_page(url, retries=3):
    """Fetch a URL with retries and rate limit handling."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            req.add_header('Accept', 'text/html,application/xhtml+xml')
            req.add_header('Accept-Language', 'en-US,en;q=0.9')

            with urllib.request.urlopen(req, timeout=20) as resp:
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

    # Get monster IDs from monster_data.js
    with open(os.path.join(base, 'web', 'monster_data.js'), 'r', encoding='utf-8') as f:
        content = f.read()

    # Build name->id mapping
    name_pattern = re.findall(r'"id":\s*(\d+).*?"name":\s*"([^"]+)"', content)
    name_to_id = {name.lower(): int(mid) for mid, name in name_pattern}
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
    print(f"\nScraping {len(remaining)} monsters from Divine Pride...")
    print(f"(Total target: {len(target_ids)}, already done: {len(scraped)})")
    print("=" * 60)

    for i, mid in enumerate(remaining):
        url = f"https://www.divine-pride.net/database/monster/{mid}"
        html = fetch_page(url)

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
