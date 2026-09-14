import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def process_image(upload, max_side, quality=82):
    """
    Validate an uploaded image and return it downscaled to fit `max_side`
    pixels and re-encoded as WebP under a random name.

    Re-encoding also strips EXIF (including GPS) and anything smuggled in
    after the image data, and keeps stored files small.
    """
    if upload.size > settings.IMAGE_UPLOAD_MAX_BYTES:
        limit_mb = settings.IMAGE_UPLOAD_MAX_BYTES // (1024 * 1024)
        raise serializers.ValidationError(f"Image must be {limit_mb} MB or smaller.")

    try:
        image = Image.open(upload)
        image_format = image.format
        # Guard against decompression bombs before decoding the pixels.
        if image.width * image.height > 40_000_000:
            raise serializers.ValidationError("Image dimensions are too large.")
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise serializers.ValidationError("Upload a valid JPEG, PNG, or WebP image.")

    if image_format not in ALLOWED_FORMATS:
        raise serializers.ValidationError("Upload a valid JPEG, PNG, or WebP image.")

    # Apply the camera's rotation before EXIF is dropped.
    image = ImageOps.exif_transpose(image)
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    if image.mode not in ("RGB", "RGBA"):
        has_alpha = image.mode in ("LA", "PA") or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")

    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=6)
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.webp")


def delete_replaced_file(field_file, new_name):
    """
    Delete the file a FieldFile pointed at before it was replaced or cleared.
    Django never removes replaced files itself; deleting only after the
    transaction commits keeps the old file if the save rolls back.
    """
    old_name = field_file.name
    if old_name and old_name != new_name:
        storage = field_file.storage
        transaction.on_commit(lambda: storage.delete(old_name))
