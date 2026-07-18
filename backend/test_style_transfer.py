import asyncio
from dotenv import load_dotenv
load_dotenv()

from app.services.style_transfer import apply_style_transfer

async def main():
    input_path = "test_images/sample.jpg"
    output_path = "test_images/sample_watercolor_output.jpg"
    style = "watercolor"

    print(f"Applying style '{style}' to {input_path} ...")
    await apply_style_transfer(input_path, output_path, style)
    print(f"Done. Output saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())