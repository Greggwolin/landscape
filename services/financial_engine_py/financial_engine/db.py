"""
Database Connection Utilities

PostgreSQL/Neon database connection management.
"""

import psycopg2
from psycopg2 import pool
from typing import Optional, Any, Dict, List
from contextlib import contextmanager
from loguru import logger

from financial_engine.config import get_settings


# Global connection pool
_connection_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def get_connection_pool() -> psycopg2.pool.SimpleConnectionPool:
    """
    Get or create database connection pool.

    Returns:
        PostgreSQL connection pool

    Example:
        >>> pool = get_connection_pool()
        >>> conn = pool.getconn()
        >>> # ... use connection ...
        >>> pool.putconn(conn)
    """
    global _connection_pool

    if _connection_pool is None:
        settings = get_settings()
        logger.info("Creating database connection pool")
        _connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.database_url,
        )

    return _connection_pool


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.

    Yields:
        psycopg2 connection from pool

    Example:
        >>> with get_db_connection() as conn:
        ...     with conn.cursor() as cur:
        ...         cur.execute("SELECT 1")
        ...         result = cur.fetchone()
    """
    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        pool.putconn(conn)


def execute_query(conn, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """
    Execute SQL query and return results as list of dicts.

    Args:
        conn: Database connection (from get_db_connection())
        query: SQL query string
        params: Optional query parameters

    Returns:
        List of rows as dictionaries

    Example:
        >>> with get_db_connection() as conn:
        ...     results = execute_query(
        ...         conn,
        ...         "SELECT * FROM tbl_project WHERE project_id = %s",
        ...         (7,)
        ...     )
        ...     print(results[0]['project_name'])
    """
    with conn.cursor() as cur:
        cur.execute(query, params)

        # Get column names from cursor description
        if cur.description:
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        else:
            return []


def execute_single(conn, query: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    """
    Execute query expecting single row result.

    Args:
        conn: Database connection (from get_db_connection())
        query: SQL query string
        params: Optional query parameters

    Returns:
        Single row as dictionary, or None if no results

    Example:
        >>> with get_db_connection() as conn:
        ...     project = execute_single(
        ...         conn,
        ...         "SELECT * FROM tbl_project WHERE project_id = %s",
        ...         (7,)
        ...     )
    """
    results = execute_query(conn, query, params)
    return results[0] if results else None


def close_connection_pool() -> None:
    """Close all connections in the pool (cleanup)"""
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")
