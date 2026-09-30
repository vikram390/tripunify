import random
import re

# No 0/O/1/I to avoid ambiguity when someone reads the code aloud or types it in.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_invite_code(length: int = 7) -> str:
    return "".join(random.choices(_ALPHABET, k=length))


def normalize_invite_code(value: str) -> str:
    """Accept a bare code or a pasted invite link (".../join/AK6ULRA") and return the code."""
    value = value.strip()
    match = re.search(r"/join/([^/?#\s]+)", value)
    if match:
        value = match.group(1)
    return value.upper()
