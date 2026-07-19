import os
from huggingface_hub import InferenceClient

client = InferenceClient(
    provider="fal-ai",
    api_key=os.environ["HF_TOKEN"],
)


def apply_style_transfer(input_image_path: str, output_image_path: str, operation: str) -> None:
    image = client.image_to_image(
    input_image_path,
    prompt=operation,
    model="black-forest-labs/FLUX.2-klein-4B",
    )
    image.save(output_image_path)