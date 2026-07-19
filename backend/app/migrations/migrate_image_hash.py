import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_database
from app.services.image_service import get_file_hash

async def run_migration():
    image_collection = get_database("images")
    cursor = image_collection.find({})
    updated_count = 0
    missing_files_count = 0

    print("Starting migration to backfill image_hash fields...")
    async for node in cursor:
        node_id = node.get("_id")
        image_path = node.get("image_path")
        current_hash = node.get("image_hash")

        if not current_hash and image_path:
            if os.path.exists(image_path):
                file_hash = get_file_hash(image_path)
                await image_collection.update_one(
                    {"_id": node_id},
                    {"$set": {"image_hash": file_hash}}
                )
                updated_count += 1
            else:
                missing_files_count += 1
                print(f"Warning: file not found on disk for node {node_id}: {image_path}")

    print(f"Migration completed successfully.")
    print(f"Updated {updated_count} nodes with hashes.")
    if missing_files_count > 0:
        print(f"Skipped {missing_files_count} nodes due to missing files on disk.")

if __name__ == "__main__":
    asyncio.run(run_migration())
