"""Tests for IP extraction utility."""

from unittest.mock import MagicMock

import pytest

from app.utils.ip import get_client_ip


class TestGetClientIP:
    """Tests for get_client_ip function."""

    def test_cf_connecting_ip_used_when_present(self):
        """CF-Connecting-IP should be used when present (Cloudflare)."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: {
            "CF-Connecting-IP": "1.2.3.4",
        }.get(key)
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        assert get_client_ip(request) == "1.2.3.4"

    def test_client_host_used_when_no_cf_header(self):
        """request.client.host used when CF header not present."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: None
        request.client = MagicMock()
        request.client.host = "192.168.1.100"

        assert get_client_ip(request) == "192.168.1.100"

    def test_returns_none_when_no_client(self):
        """Returns None when no client info available."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: None
        request.client = None

        assert get_client_ip(request) is None

    def test_strips_whitespace(self):
        """CF-Connecting-IP should be stripped of whitespace."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: {
            "CF-Connecting-IP": "  1.2.3.4  ",
        }.get(key)

        assert get_client_ip(request) == "1.2.3.4"

    def test_ignores_x_forwarded_for(self):
        """X-Forwarded-For should be ignored (spoofable)."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: {
            "X-Forwarded-For": "9.10.11.12, 1.1.1.1",
        }.get(key)
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        # Should use client.host, NOT X-Forwarded-For
        assert get_client_ip(request) == "127.0.0.1"

    def test_ignores_x_real_ip(self):
        """X-Real-IP should be ignored (spoofable without trusted proxy)."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: {
            "X-Real-IP": "5.6.7.8",
        }.get(key)
        request.client = MagicMock()
        request.client.host = "127.0.0.1"

        # Should use client.host, NOT X-Real-IP
        assert get_client_ip(request) == "127.0.0.1"

    def test_cf_header_takes_priority_over_client_host(self):
        """CF-Connecting-IP should take priority over client.host."""
        request = MagicMock()
        request.headers = MagicMock()
        request.headers.get = lambda key: {
            "CF-Connecting-IP": "real-user-ip",
            "X-Forwarded-For": "ignored",
            "X-Real-IP": "also-ignored",
        }.get(key)
        request.client = MagicMock()
        request.client.host = "cloudflare-edge-ip"

        assert get_client_ip(request) == "real-user-ip"
