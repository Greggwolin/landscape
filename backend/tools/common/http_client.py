"""Shared HTTP client with rate limiting and retry logic for web scraping tools."""

from __future__ import annotations

import time
from typing import Optional

import httpx


class HttpClient:
    """HTTP client with configurable delay, retries, and redirect behavior.

    Args:
        user_agent: User-Agent header string.
        request_delay_seconds: Minimum delay between requests (default 1.5s).
        timeout: Request timeout in seconds (default 10.0).
        retries: Number of retry attempts on failure (default 2).
        follow_redirects: Whether to follow HTTP redirects (default True).
    """

    def __init__(
        self,
        user_agent: str,
        request_delay_seconds: float = 1.5,
        timeout: float = 10.0,
        retries: int = 2,
        follow_redirects: bool = True,
    ) -> None:
        self.request_delay_seconds = max(request_delay_seconds, 0.0)
        self.retries = max(retries, 0)
        self._last_request_ts: float = 0.0
        self.request_count: int = 0
        self.client = httpx.Client(
            headers={"User-Agent": user_agent},
            timeout=timeout,
            follow_redirects=follow_redirects,
        )

    def _respect_delay(self) -> None:
        """Enforce minimum delay between requests."""
        if self.request_delay_seconds <= 0:
            return
        now = time.time()
        elapsed = now - self._last_request_ts
        if elapsed < self.request_delay_seconds:
            time.sleep(self.request_delay_seconds - elapsed)

    def get(self, url: str) -> Optional[httpx.Response]:
        """Make a GET request with retry logic.

        Args:
            url: The URL to fetch.

        Returns:
            The response object, or None if all retries failed.

        Raises:
            httpx.TimeoutException: If all retries exhausted due to timeout.
            httpx.TransportError: If all retries exhausted due to transport error.
        """
        self._respect_delay()
        last_error: Optional[Exception] = None
        for _ in range(self.retries + 1):
            try:
                resp = self.client.get(url)
                self._last_request_ts = time.time()
                self.request_count += 1
                return resp
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                time.sleep(0.5)
        if last_error:
            raise last_error
        return None

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self.client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()
