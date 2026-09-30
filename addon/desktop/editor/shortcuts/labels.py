"""Readable shortcut labels for editor tooltips."""
import re

from aqt.utils import is_mac, shortcut


def shortcut_label(keys):
    label = shortcut(keys)
    if not is_mac:
        return label
    symbols = {
        "command": "⌘",
        "cmd": "⌘",
        "shift": "⇧",
        "alt": "⌥",
        "option": "⌥",
        "control": "⌃",
        "meta": "⌃",
    }
    return re.sub(
        r"\b(Command|Cmd|Shift|Alt|Option|Control|Meta)\+",
        lambda match: symbols[match.group(1).lower()],
        label,
        flags=re.IGNORECASE,
    )
