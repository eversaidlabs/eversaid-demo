"""API key generation and verification utilities.

Key format: sta-{40_char_random} (total 44 chars)
- Prefix: "sta-" (Smart Transcribe API - detectable by secret scanners)
- Random: 40 chars base62 alphanumeric (case-sensitive)
- Example: sta-a7F3kL9mN2pQ8rT5vW1xY4zB6cD0eG2hJ5kM8n

Security:
- bcrypt hash (cost factor 12) for storage
- Prefix stored for user identification (first 11 chars: e.g., "sta-abc1234")
- Full key shown ONLY on creation
"""

import secrets
import string
from datetime import datetime, timezone

import bcrypt

# Key configuration
KEY_PREFIX = "sta-"
KEY_RANDOM_LENGTH = 40
KEY_TOTAL_LENGTH = len(KEY_PREFIX) + KEY_RANDOM_LENGTH  # 44 chars
KEY_PREFIX_DISPLAY_LENGTH = 11  # "sta-abc1234" for display

# bcrypt cost factor (higher = more secure but slower)
BCRYPT_COST_FACTOR = 12

# Character set for random part (base62: a-z, A-Z, 0-9)
ALPHABET = string.ascii_letters + string.digits


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        Tuple of (full_key, key_hash, key_prefix):
        - full_key: The complete API key to return to user (ONLY on creation)
        - key_hash: bcrypt hash to store in database
        - key_prefix: First 11 chars for display/identification
    """
    # Generate random part
    random_part = "".join(secrets.choice(ALPHABET) for _ in range(KEY_RANDOM_LENGTH))

    # Build full key
    full_key = f"{KEY_PREFIX}{random_part}"

    # Hash with bcrypt
    key_hash = hash_api_key(full_key)

    # Extract prefix for display
    key_prefix = full_key[:KEY_PREFIX_DISPLAY_LENGTH]

    return full_key, key_hash, key_prefix


def hash_api_key(api_key: str) -> str:
    """Hash an API key using bcrypt with cost factor 12.

    Args:
        api_key: The full API key to hash.

    Returns:
        bcrypt hash as a string.
    """
    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    hashed = bcrypt.hashpw(api_key.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_api_key(api_key: str, key_hash: str) -> bool:
    """Verify an API key against its bcrypt hash.

    Args:
        api_key: The full API key to verify.
        key_hash: bcrypt hash to verify against.

    Returns:
        True if key matches, False otherwise.
    """
    try:
        return bcrypt.checkpw(api_key.encode("utf-8"), key_hash.encode("utf-8"))
    except Exception:
        # Handle malformed hashes gracefully
        return False


def is_key_expired(expires_at: datetime | None) -> bool:
    """Check if an API key has expired.

    Args:
        expires_at: Expiration datetime (timezone-aware) or None for no expiration.

    Returns:
        True if expired, False if not expired or no expiration set.
    """
    if expires_at is None:
        return False
    return datetime.now(timezone.utc) > expires_at


def extract_key_prefix(api_key: str) -> str | None:
    """Extract the prefix from an API key for lookup.

    Args:
        api_key: The full API key.

    Returns:
        The key prefix (first 11 chars) or None if invalid format.
    """
    if not api_key or len(api_key) != KEY_TOTAL_LENGTH:
        return None
    if not api_key.startswith(KEY_PREFIX):
        return None
    return api_key[:KEY_PREFIX_DISPLAY_LENGTH]


def validate_key_format(api_key: str) -> bool:
    """Validate API key format without checking validity.

    Args:
        api_key: The API key to validate.

    Returns:
        True if format is valid, False otherwise.
    """
    if not api_key or len(api_key) != KEY_TOTAL_LENGTH:
        return False
    if not api_key.startswith(KEY_PREFIX):
        return False
    # Check random part is alphanumeric
    random_part = api_key[len(KEY_PREFIX) :]
    return all(c in ALPHABET for c in random_part)
