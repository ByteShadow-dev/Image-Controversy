from rembg import remove
from PIL import Image
import io

def remove_background(input_image_path, output_image_path):
    input_image = Image.open(input_image_path)
    input_bytes = io.BytesIO()
    input_image.save(input_bytes, format='PNG')
    input_bytes = input_bytes.getvalue()
    output_bytes = remove(input_bytes)
    output_image = Image.open(io.BytesIO(output_bytes))
    output_image.save(output_image_path)
