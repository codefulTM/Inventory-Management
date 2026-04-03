#!/usr/bin/env python3
import urllib.request, json, sys, os
url = "https://api.github.com/repos/nguyenthaitan/Inventory-Management/pulls?state=all&head=nguyenthaitan:develop/full-system-implementation&per_page=1"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Checker"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
        with open("pr_check_result.txt", "w") as f:
            if data and len(data) > 0:
                pr = data[0]
                f.write(f"FOUND\n{pr['number']}\n{pr['html_url']}\n{pr['state']}")
            else:
                f.write("NOTFOUND")
except Exception as e:
    with open("pr_check_result.txt", "w") as f:
        f.write(f"ERROR\n{str(e)}")
