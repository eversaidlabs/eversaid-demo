"""JWT token utilities for authentication."""

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from jose import JWTError, jwt

from app.config import get_settings


class TokenType(str, Enum):
    """Token type enumeration."""

    ACCESS = "access"
    REFRESH = "refresh"


@dataclass
class TokenData:
    """Decoded token data."""

    user_id: str
    tenant_id: str
    email: str
    token_type: TokenType
    role: Optional[str] = None
    exp: Optional[datetime] = None


class TokenError(Exception):
    """Base exception for token errors."""

    pass


class TokenExpiredError(TokenError):
    """Token has expired."""

    pass


class InvalidTokenError(TokenError):
    """Token is invalid."""

    pass


def create_access_token(
    user_id: str,
    tenant_id: str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token.

    Args:
        user_id: User identifier.
        tenant_id: Tenant identifier.
        email: User email.
        role: User role (platform_admin, tenant_admin, tenant_user).
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT access token.
    """
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "email": email,
        "role": role,
        "type": TokenType.ACCESS.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),  # Unique token ID for revocation tracking
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: str,
    tenant_id: str,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT refresh token.

    Args:
        user_id: User identifier.
        tenant_id: Tenant identifier.
        email: User email.
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT refresh token.
    """
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "email": email,
        "type": TokenType.REFRESH.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),  # Unique token ID for revocation tracking
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, expected_type: TokenType) -> TokenData:
    """Verify and decode a JWT token.

    Args:
        token: JWT token to verify.
        expected_type: Expected token type (access or refresh).

    Returns:
        Decoded token data.

    Raises:
        TokenExpiredError: If token has expired.
        InvalidTokenError: If token is invalid or wrong type.
    """
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as e:
        if "expired" in str(e).lower():
            raise TokenExpiredError("Token has expired")
        raise InvalidTokenError(f"Invalid token: {e}")

    token_type = payload.get("type")
    if token_type != expected_type.value:
        raise InvalidTokenError(f"Expected {expected_type.value} token, got {token_type}")

    return TokenData(
        user_id=payload.get("sub"),
        tenant_id=payload.get("tenant_id"),
        email=payload.get("email"),
        token_type=TokenType(token_type),
        role=payload.get("role"),
        exp=datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc) if payload.get("exp") else None,
    )


def hash_token(token: str) -> str:
    """Hash a token using SHA-256 for secure storage.

    Used to store refresh tokens in the database without exposing the actual token.

    Args:
        token: Token to hash.

    Returns:
        SHA-256 hex digest of the token.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
