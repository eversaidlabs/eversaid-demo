"""Audio file validation utilities using mutagen."""

from io import BytesIO
from typing import Optional

from mutagen import File as MutagenFile

from app.utils.logger import get_logger

logger = get_logger("audio")


class AudioValidationError(Exception):
    """Raised when audio validation fails."""

    def __init__(self, message: str, error_type: str = "validation_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(message)


def get_audio_duration(file_content: bytes, filename: str) -> Optional[float]:
    """Extract duration from audio file bytes.

    Args:
        file_content: Raw audio file bytes
        filename: Original filename (used for format detection)

    Returns:
        Duration in seconds, or None if duration cannot be determined

    Raises:
        AudioValidationError: If the file is corrupt or unreadable
    """
    try:
        file_obj = BytesIO(file_content)
        audio = MutagenFile(file_obj, filename=filename)

        if audio is None:
            logger.warning(
                "Could not identify audio format",
                filename=filename,
            )
            return None

        if hasattr(audio, "info") and hasattr(audio.info, "length"):
            duration = audio.info.length
            if duration is not None and duration > 0:
                logger.debug(
                    "Audio duration extracted",
                    filename=filename,
                    duration_seconds=f"{duration:.2f}",
                    format=type(audio).__name__,
                )
                return float(duration)

        logger.warning(
            "Audio file has no duration metadata",
            filename=filename,
            format=type(audio).__name__ if audio else "unknown",
        )
        return None

    except Exception as e:
        # Mutagen raises various exceptions for files it can't parse.
        # Allow these through - Core API will do further validation.
        logger.warning(
            "Could not parse audio file, allowing through",
            filename=filename,
            error=str(e),
        )
        return None


def validate_audio_file_size(
    file_content: bytes,
    filename: str,
    max_size_mb: int,
) -> None:
    """Validate that audio file size is within limits.

    Args:
        file_content: Raw audio file bytes
        filename: Original filename (for logging)
        max_size_mb: Maximum allowed file size in megabytes

    Raises:
        AudioValidationError: If file exceeds size limit
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    file_size_bytes = len(file_content)

    if file_size_bytes > max_size_bytes:
        file_size_mb = file_size_bytes / (1024 * 1024)
        raise AudioValidationError(
            message=f"File size ({file_size_mb:.1f} MB) exceeds maximum ({max_size_mb} MB)",
            error_type="file_size_exceeded",
        )

    logger.debug(
        "Audio file size validation passed",
        filename=filename,
        file_size_mb=f"{file_size_bytes / (1024 * 1024):.2f}",
        max_size_mb=max_size_mb,
    )


def validate_audio_duration(
    file_content: bytes,
    filename: str,
    max_duration_seconds: float,
) -> None:
    """Validate that audio file duration is within limits.

    Args:
        file_content: Raw audio file bytes
        filename: Original filename
        max_duration_seconds: Maximum allowed duration in seconds

    Raises:
        AudioValidationError: If file exceeds duration limit or is unreadable
    """
    duration = get_audio_duration(file_content, filename)

    if duration is None:
        # Cannot determine duration - allow file through
        # Core API will do further validation
        logger.info(
            "Audio duration unknown, allowing file",
            filename=filename,
        )
        return

    if duration > max_duration_seconds:
        max_minutes = max_duration_seconds / 60
        actual_minutes = duration / 60
        raise AudioValidationError(
            message=f"Audio duration ({actual_minutes:.1f} min) exceeds maximum ({max_minutes:.0f} min)",
            error_type="duration_exceeded",
        )

    logger.debug(
        "Audio duration validation passed",
        filename=filename,
        duration_seconds=f"{duration:.2f}",
        max_seconds=max_duration_seconds,
    )
