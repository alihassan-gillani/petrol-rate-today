"""Build prices.json from OGRA's daily "Price Publications" PDFs.

Usage:  python update_prices.py [cache_dir]

Reads https://www.ogra.org.pk/price-publications, downloads the English PDF for each
date (only ones not already in cache_dir), pulls the total Petrol and Diesel price, and
writes prices.json and prices.js next to this file. A date whose PDF cannot be read is skipped and
listed under "errors"; existing good data is never replaced by a failed read.
Kerosene is published only in scanned weekly notifications, so it is kept by hand in
kerosene_manual.json.
"""
import json, re, sys, time, urllib.request
from datetime import datetime
from pathlib import Path

import pypdf

HERE = Path(__file__).parent
LIST_URL = "https://www.ogra.org.pk/price-publications"
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "pdf_cache"
OUT = HERE / "prices.json"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def listing():
    html = get(LIST_URL).decode("utf-8", "ignore")
    rows = re.findall(
        r"Effective Dated ([A-Za-z]+ \d{1,2}, \d{4}).*?href=\"(https://www\.ogra\.org\.pk/download/(\d+)\?lang=en)\"",
        html, re.S)
    return [(datetime.strptime(d, "%B %d, %Y").strftime("%Y-%m-%d"), url, fid) for d, url, fid in rows]


def total(text, label):
    i = text.find(label)
    if i < 0:
        return None
    m = re.search(r"RS/LTR\s+[A-Z]\s*(?:=\s*\{[^}]*\})?\s+(\d+\.\d+)", text[i:])
    return float(m.group(1)) if m else None


def read_pdf(path):
    text = "\n".join(p.extract_text() or "" for p in pypdf.PdfReader(path).pages)
    return total(text, "Total Petrol Price"), total(text, "Total Diesel Price")


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    old = json.loads(OUT.read_text("utf-8")) if OUT.exists() else {"days": []}
    days = {d["date"]: d for d in old["days"]}
    errors = []
    try:
        entries = listing()
    except Exception as e:  # e.g. OGRA refusing this network; say so plainly in the log
        sys.exit(f"Could not read {LIST_URL}: {e!r}")
    if not entries:
        sys.exit(f"No entries found on {LIST_URL} (page layout changed or blocked)")
    for date, url, fid in entries:
        if date < "2026-07-01" or date in days:
            continue
        pdf = CACHE / f"{fid}.pdf"
        try:
            if not pdf.exists():
                pdf.write_bytes(get(url))
                time.sleep(0.5)
            petrol, diesel = read_pdf(pdf)
        except Exception as e:  # keep going; report at the end
            errors.append(f"{date}: {e}")
            continue
        if petrol is None or diesel is None:
            errors.append(f"{date}: could not find totals in {fid}")
            continue
        days[date] = {"date": date, "petrol": petrol, "diesel": diesel, "source": url}
    manual = HERE / "kerosene_manual.json"
    kerosene = json.loads(manual.read_text("utf-8")) if manual.exists() else []
    out = {"updated": datetime.now().strftime("%Y-%m-%d"),
           "days": sorted(days.values(), key=lambda d: d["date"], reverse=True),
           "kerosene": kerosene, "errors": errors}
    OUT.write_text(json.dumps(out, indent=1), "utf-8")
    (HERE / "prices.js").write_text("window.PRICES = " + json.dumps(out) + ";\n", "utf-8")  # works when index.html is opened from disk
    print(f"{len(days)} days, {len(errors)} errors")
    for e in errors:
        print(" ", e)
    if errors and not days:
        sys.exit(1)


main()
