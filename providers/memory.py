from __future__ import annotations
import json
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Optional
from .base import MemoryProvider, CustomerProfile, MemoryDoc


class SQLiteVecMemory(MemoryProvider):
    def __init__(self, db_path: str = "memory.db"):
        self.db_path = db_path
        self._conn = None
        self._init_db()

    def _get_conn(self):
        if self._conn is not None:
            return self._conn
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        return self._conn

    def _init_db(self):
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS customers (
                phone TEXT PRIMARY KEY,
                name TEXT DEFAULT '',
                total_calls INTEGER DEFAULT 0,
                last_call TEXT,
                preferences TEXT DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                transcript TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversations(phone);
        """)
        conn.commit()

    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        if not phone:
            return None
        conn = self._get_conn()
        row = conn.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
        if row is None:
            return None
        return CustomerProfile(
            phone=row["phone"], name=row["name"], total_calls=row["total_calls"],
            last_call=row["last_call"], preferences=json.loads(row["preferences"]),
        )

    async def store_conversation(self, phone: str, transcript: str, summary: str) -> str:
        conv_id = str(uuid.uuid4())
        conn = self._get_conn()
        conn.execute("INSERT OR IGNORE INTO customers (phone, name) VALUES (?, ?)", (phone, phone))
        conn.execute("UPDATE customers SET total_calls = total_calls + 1, last_call = CURRENT_TIMESTAMP WHERE phone = ?", (phone,))
        conn.execute("INSERT INTO conversations (id, phone, transcript, summary) VALUES (?, ?, ?, ?)", (conv_id, phone, transcript, summary))
        conn.commit()
        return conv_id

    async def search(self, query: str, limit: int = 5) -> list[MemoryDoc]:
        conn = self._get_conn()
        rows = conn.execute("SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [MemoryDoc(id=r["id"], phone=r["phone"], summary=r["summary"], transcript=r["transcript"], created_at=r["created_at"]) for r in rows]


class JsonMemory(MemoryProvider):
    def __init__(self, path: str = "memory.json"):
        self.path = path
        self._data = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.path):
            with open(self.path) as f:
                return json.load(f)
        return {"customers": {}, "conversations": []}

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self._data, f, indent=2, default=str)

    async def lookup(self, phone: str) -> Optional[CustomerProfile]:
        c = self._data["customers"].get(phone)
        if not c:
            return None
        return CustomerProfile(**c)

    async def store_conversation(self, phone: str, transcript: str, summary: str) -> str:
        conv_id = str(uuid.uuid4())
        if phone not in self._data["customers"]:
            self._data["customers"][phone] = {"phone": phone, "name": phone, "total_calls": 0, "last_call": None, "preferences": {}}
        c = self._data["customers"][phone]
        c["total_calls"] += 1
        c["last_call"] = datetime.utcnow().isoformat()
        self._data["conversations"].append({"id": conv_id, "phone": phone, "transcript": transcript, "summary": summary, "created_at": datetime.utcnow().isoformat()})
        self._save()
        return conv_id

    async def search(self, query: str, limit: int = 5) -> list[MemoryDoc]:
        results = self._data["conversations"][-limit:]
        results.reverse()
        return [MemoryDoc(**r) for r in results]
