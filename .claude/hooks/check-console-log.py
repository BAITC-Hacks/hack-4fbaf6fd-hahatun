#!/usr/bin/env python3
"""Stop-hook: console.log в изменённых ts/tsx-файлах -> блок с подсказкой."""
import json, subprocess, sys

try:
    changed = subprocess.run(
        ["git", "diff", "--name-only", "HEAD"],
        capture_output=True, text=True, timeout=10,
    ).stdout.split()
    hits = []
    for f in changed:
        if f.endswith((".ts", ".tsx")) and "test" not in f and "spec" not in f:
            out = subprocess.run(["grep", "-n", "console\\.log", f],
                                 capture_output=True, text=True).stdout.strip()
            if out:
                hits.append(f"{f}: {out.splitlines()[0]}")
    if hits:
        print(json.dumps({"decision": "block",
                          "reason": "console.log в изменённых файлах:\n" + "\n".join(hits[:5])
                                    + "\nУбери или обоснуй."}))
except Exception:
    pass
sys.exit(0)
