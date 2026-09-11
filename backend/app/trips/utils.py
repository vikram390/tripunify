import random

# No 0/O/1/I to avoid ambiguity when someone reads the code aloud or types it in.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_invite_code(length: int = 7) -> str:
    return "".join(random.choices(_ALPHABET, k=length))
