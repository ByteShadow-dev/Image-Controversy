from pymongo import AsyncMongoClient
from app.core import config

client = AsyncMongoClient(config.MONGO_URI)
database = client[config.DATABASE_NAME]

def get_database(name: str):
    return database[name]
