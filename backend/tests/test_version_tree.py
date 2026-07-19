import os
import shutil
import unittest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from bson import ObjectId
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.api.endpoints.images import get_image_editor
from app.services.image_editor import ImageEditorInterface, EditResult
from app.core.database import get_database

# Temporary directory for test files
TEST_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_uploads")

# Mock editor to avoid actual Groq classification and processing
class MockImageEditor(ImageEditorInterface):
    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        # Create a unique output path
        filename = f"edit_{ObjectId()}_{instruction.replace(' ', '_')}.png"
        output_path = os.path.join(TEST_UPLOAD_DIR, filename)
        os.makedirs(TEST_UPLOAD_DIR, exist_ok=True)
        # Write dummy binary content
        with open(output_path, "wb") as f:
            f.write(f"edited content for {instruction}".encode())
        return EditResult(
            output_image_path=output_path,
            explanation=f"Applied {instruction}",
            category="Background Removal" if "background" in instruction else "Tone & Colour"
        )

class TestVersionTree(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        os.makedirs(TEST_UPLOAD_DIR, exist_ok=True)
        # Override editor dependency
        app.dependency_overrides[get_image_editor] = lambda: MockImageEditor()
        cls.client = TestClient(app)
        cls.db = get_database("test_db") # Use clean database names for tests
        cls.images_col = get_database("images")
        cls.trees_col = get_database("trees")

    @classmethod
    def tearDownClass(cls):
        # Clean up dependency overrides
        app.dependency_overrides.clear()
        # Clean up files
        if os.path.exists(TEST_UPLOAD_DIR):
            shutil.rmtree(TEST_UPLOAD_DIR)

    async def asyncSetUp(self):
        # Set up a test tree in the DB
        self.tree_id = str(ObjectId())
        await self.trees_col.insert_one({
            "_id": ObjectId(self.tree_id),
            "title": "Test Tree Project",
            "root_node_id": None
        })

    async def asyncTearDown(self):
        # Clean up the database after each test
        await self.trees_col.delete_many({})
        await self.images_col.delete_many({})

    def test_root_creation(self):
        # 1. Create a dummy file to upload
        test_file_path = os.path.join(TEST_UPLOAD_DIR, "original.png")
        with open(test_file_path, "wb") as f:
            f.write(b"original image content")

        with open(test_file_path, "rb") as f:
            response = self.client.post(
                f"/api/images/{self.tree_id}/root",
                files={"file": ("original.png", f, "image/png")}
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("node_id", data)
        node_id = data["node_id"]

        # Verify it was inserted in database
        loop = asyncio.get_event_loop()
        node = loop.run_until_complete(self.images_col.find_one({"_id": ObjectId(node_id)}))
        self.assertIsNotNone(node)
        self.assertEqual(node["parent_id"], None)
        self.assertEqual(node["status"], "Completed")

        # Verify the tree updated root_node_id
        tree = loop.run_until_complete(self.trees_col.find_one({"_id": ObjectId(self.tree_id)}))
        self.assertEqual(tree["root_node_id"], node_id)

    async def test_single_and_multiple_edits(self):
        # Helper to upload root
        test_file_path = os.path.join(TEST_UPLOAD_DIR, "original.png")
        with open(test_file_path, "wb") as f:
            f.write(b"original image content")

        with open(test_file_path, "rb") as f:
            response = self.client.post(
                f"/api/images/{self.tree_id}/root",
                files={"file": ("original.png", f, "image/png")}
            )
        root_node_id = response.json()["node_id"]

        # Run first edit (single edit)
        response_edit1 = self.client.post(
            f"/api/images/{self.tree_id}/{root_node_id}/edit",
            json={"instruction": "remove background"}
        )
        self.assertEqual(response_edit1.status_code, 200)
        node_edit1 = response_edit1.json()
        node_edit1_id = node_edit1.get("id") or node_edit1.get("_id")
        self.assertEqual(node_edit1["parent_id"], root_node_id)
        self.assertEqual(node_edit1["status"], "Completed")

        # Run second edit (multiple edits - linear sequence)
        response_edit2 = self.client.post(
            f"/api/images/{self.tree_id}/{node_edit1_id}/edit",
            json={"instruction": "make it brighter"}
        )
        self.assertEqual(response_edit2.status_code, 200)
        node_edit2 = response_edit2.json()
        node_edit2_id = node_edit2.get("id") or node_edit2.get("_id")
        self.assertEqual(node_edit2["parent_id"], node_edit1_id)

    async def test_branching_from_old_version(self):
        # Helper to upload root
        test_file_path = os.path.join(TEST_UPLOAD_DIR, "original.png")
        with open(test_file_path, "wb") as f:
            f.write(b"original image content")

        with open(test_file_path, "rb") as f:
            response = self.client.post(
                f"/api/images/{self.tree_id}/root",
                files={"file": ("original.png", f, "image/png")}
            )
        root_node_id = response.json()["node_id"]

        # Create first edit branch
        response_branch1 = self.client.post(
            f"/api/images/{self.tree_id}/{root_node_id}/edit",
            json={"instruction": "remove background"}
        )
        node_branch1 = response_branch1.json()
        node_branch1_id = node_branch1.get("id") or node_branch1.get("_id")

        # Create second edit branching from the same root node instead of first branch
        response_branch2 = self.client.post(
            f"/api/images/{self.tree_id}/{root_node_id}/edit",
            json={"instruction": "make it black and white"}
        )
        node_branch2 = response_branch2.json()
        node_branch2_id = node_branch2.get("id") or node_branch2.get("_id")

        # Verify parent is root node for both branches
        self.assertEqual(node_branch1["parent_id"], root_node_id)
        self.assertEqual(node_branch2["parent_id"], root_node_id)
        self.assertNotEqual(node_branch1_id, node_branch2_id)

        # Verify retrieve tree returns both nodes
        response_tree = self.client.get(f"/api/tree/{self.tree_id}")
        self.assertEqual(response_tree.status_code, 200)
        tree_data = response_tree.json()
        nodes = tree_data["nodes"]
        self.assertEqual(len(nodes), 3)  # root + branch1 + branch2

    def test_authorization_behavior(self):
        # Confirming access works without headers (public access as per requirements)
        response = self.client.get(f"/api/tree/{self.tree_id}")
        self.assertEqual(response.status_code, 200)

    async def test_concurrent_edits(self):
        # Helper to upload root
        test_file_path = os.path.join(TEST_UPLOAD_DIR, "original.png")
        with open(test_file_path, "wb") as f:
            f.write(b"original image content")

        with open(test_file_path, "rb") as f:
            response = self.client.post(
                f"/api/images/{self.tree_id}/root",
                files={"file": ("original.png", f, "image/png")}
            )
        root_node_id = response.json()["node_id"]

        # Run concurrent edits using async execution helper
        async def make_edit_request(instruction):
            return self.client.post(
                f"/api/images/{self.tree_id}/{root_node_id}/edit",
                json={"instruction": instruction}
            )

        tasks = [
            make_edit_request("first concurrent edit"),
            make_edit_request("second concurrent edit"),
            make_edit_request("third concurrent edit"),
        ]

        results = await asyncio.gather(*tasks)

        for res in results:
            self.assertEqual(res.status_code, 200)
            node = res.json()
            self.assertEqual(node["parent_id"], root_node_id)

        # Check total nodes in DB is 4 (1 root + 3 concurrent edits)
        nodes = await self.images_col.find({"tree_id": ObjectId(self.tree_id)}).to_list(None)
        self.assertEqual(len(nodes), 4)

    @patch("app.api.endpoints.images.create_child_node")
    async def test_rollback_on_failure(self, mock_create):
        # Force database insertion to fail
        mock_create.side_effect = Exception("Mock DB Failure")

        # Setup root image
        test_file_path = os.path.join(TEST_UPLOAD_DIR, "original.png")
        with open(test_file_path, "wb") as f:
            f.write(b"original image content")

        with open(test_file_path, "rb") as f:
            response = self.client.post(
                f"/api/images/{self.tree_id}/root",
                files={"file": ("original.png", f, "image/png")}
            )
        root_node_id = response.json()["node_id"]

        # Get number of files in TEST_UPLOAD_DIR
        pre_edit_files = len(os.listdir(TEST_UPLOAD_DIR))

        # Make edit request that should fail at database persistence phase
        response_edit = self.client.post(
            f"/api/images/{self.tree_id}/{root_node_id}/edit",
            json={"instruction": "test failure rollback"}
        )
        self.assertEqual(response_edit.status_code, 500)
        self.assertIn("Database insert failed", response_edit.json()["detail"])

        # Verify no orphaned file remains on disk (file count is the same)
        post_edit_files = len(os.listdir(TEST_UPLOAD_DIR))
        self.assertEqual(post_edit_files, pre_edit_files)

if __name__ == "__main__":
    unittest.main()
