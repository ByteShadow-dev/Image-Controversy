import asyncio
from pymongo import AsyncMongoClient
from app.core import config

_client = None
_loop = None

def get_client():
    global _client, _loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None
    if _client is None or _loop is not current_loop:
        _client = AsyncMongoClient(config.MONGO_URI)
        _loop = current_loop
    return _client

class AsyncCollectionProxy:
    def __init__(self, name: str):
        self._name = name

    def _get_col(self):
        return get_client()[config.DATABASE_NAME][self._name]

    def __getattr__(self, item):
        return getattr(self._get_col(), item)

    def __getitem__(self, item):
        return self._get_col()[item]

def get_database(name: str):
    return AsyncCollectionProxy(name)
