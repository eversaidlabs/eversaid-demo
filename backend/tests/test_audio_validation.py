"""Tests for audio duration validation."""

import io
import struct

import pytest

from app.utils.audio import (
    AudioValidationError,
    get_audio_duration,
    validate_audio_duration,
    validate_audio_file_size,
)


# =============================================================================
# Fixtures for audio test data
# =============================================================================


def create_wav_bytes(duration_seconds: float, sample_rate: int = 8000) -> bytes:
    """Generate valid WAV file bytes with specified duration."""
    num_samples = int(sample_rate * duration_seconds)

    # WAV header (44 bytes)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + num_samples * 2,  # ChunkSize
        b"WAVE",
        b"fmt ",
        16,  # Subchunk1Size (PCM)
        1,  # AudioFormat (1 = PCM)
        1,  # NumChannels
        sample_rate,
        sample_rate * 2,  # ByteRate
        2,  # BlockAlign
        16,  # BitsPerSample
        b"data",
        num_samples * 2,  # Subchunk2Size
    )

    # Silence samples (16-bit)
    samples = b"\x00\x00" * num_samples

    return header + samples


@pytest.fixture
def short_wav_bytes():
    """10 second WAV file (under typical limit)."""
    return create_wav_bytes(10.0)


@pytest.fixture
def long_wav_bytes():
    """4 minute WAV file (for duration limit tests)."""
    return create_wav_bytes(240.0)


@pytest.fixture
def exact_limit_wav_bytes():
    """Exactly 3 minute WAV file (for duration limit tests)."""
    return create_wav_bytes(180.0)


@pytest.fixture
def just_over_limit_wav_bytes():
    """3 minutes + 1 second WAV file (for duration limit tests)."""
    return create_wav_bytes(181.0)


# =============================================================================
# Unit Tests: get_audio_duration
# =============================================================================


class TestGetAudioDuration:
    """Tests for duration extraction."""

    def test_extracts_duration_from_valid_wav(self, short_wav_bytes):
        """Valid WAV files should return correct duration."""
        duration = get_audio_duration(short_wav_bytes, "test.wav")
        assert duration is not None
        assert 9.5 < duration < 10.5  # Allow small variance

    def test_returns_none_for_unknown_format(self):
        """Unknown file formats should return None, not raise."""
        content = b"not audio data at all"
        result = get_audio_duration(content, "test.xyz")
        assert result is None

    def test_returns_none_for_empty_file(self):
        """Empty files with unknown extension should return None."""
        # Use unknown extension to avoid mutagen trying to parse as specific format
        result = get_audio_duration(b"", "test.unknown")
        assert result is None

    def test_returns_none_for_corrupt_wav_header(self):
        """Corrupt files should return None (allow Core API to validate)."""
        # WAV-like header but invalid data
        content = b"RIFF" + b"\x00" * 100
        result = get_audio_duration(content, "test.wav")
        assert result is None


# =============================================================================
# Unit Tests: validate_audio_duration
# =============================================================================


class TestValidateAudioDuration:
    """Tests for duration validation."""

    def test_passes_when_under_limit(self, short_wav_bytes):
        """Audio under limit should pass without raising."""
        # 10 second audio, 180 second limit - should not raise
        validate_audio_duration(short_wav_bytes, "test.wav", 180)

    def test_passes_at_exact_limit(self, exact_limit_wav_bytes):
        """Audio exactly at limit should pass."""
        # 180 second audio, 180 second limit - should pass
        validate_audio_duration(exact_limit_wav_bytes, "test.wav", 180)

    def test_raises_when_over_limit(self, long_wav_bytes):
        """Audio over limit should raise AudioValidationError."""
        # 240 second audio, 180 second limit
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_duration(long_wav_bytes, "test.wav", 180)

        assert exc_info.value.error_type == "duration_exceeded"
        assert "exceeds maximum" in exc_info.value.message
        assert "4.0 min" in exc_info.value.message
        assert "3 min" in exc_info.value.message

    def test_raises_just_over_limit(self, just_over_limit_wav_bytes):
        """Audio just over limit should raise."""
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_duration(just_over_limit_wav_bytes, "test.wav", 180)
        assert exc_info.value.error_type == "duration_exceeded"

    def test_allows_unknown_duration(self):
        """Files where duration cannot be determined should be allowed."""
        content = b"unknown format data"
        # Should not raise
        validate_audio_duration(content, "test.xyz", 180)

    def test_configurable_limit(self, short_wav_bytes):
        """Limit should be configurable."""
        # 10 second audio with 5 second limit should fail
        with pytest.raises(AudioValidationError):
            validate_audio_duration(short_wav_bytes, "test.wav", 5)


# =============================================================================
# Integration Tests: /api/transcribe endpoint
# =============================================================================


class TestTranscribeEndpointDurationValidation:
    """Integration tests for /api/transcribe duration validation."""

    def test_rejects_long_audio_with_422(self, client, test_settings, long_wav_bytes):
        """Audio exceeding duration limit should return 422."""
        # Set a low limit for testing
        test_settings.MAX_AUDIO_DURATION_SECONDS = 60  # 1 minute

        files = {"file": ("test.wav", io.BytesIO(long_wav_bytes), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 422
        assert "exceeds maximum" in response.json()["detail"]

    def test_does_not_consume_rate_limit_on_validation_failure(
        self, client, test_settings, long_wav_bytes, test_engine
    ):
        """Failed validation should not increment rate limit counter."""
        from sqlalchemy.orm import sessionmaker

        from app.models import RateLimitEntry

        test_settings.MAX_AUDIO_DURATION_SECONDS = 60

        files = {"file": ("test.wav", io.BytesIO(long_wav_bytes), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 422

        # Check no rate limit entry was committed
        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()
        entries = db.query(RateLimitEntry).filter_by(action="transcribe").all()
        db.close()

        assert len(entries) == 0

    def test_accepts_audio_under_limit(self, client, test_settings, short_wav_bytes):
        """Audio under duration limit should proceed to Core API."""
        import respx
        from httpx import Response

        test_settings.MAX_AUDIO_DURATION_SECONDS = 180

        # Mock Core API success
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "original_filename": "test.wav",
                    "saved_filename": "saved-test.wav",
                    "duration_seconds": 10.0,
                    "entry_type": "journal",
                    "uploaded_at": "2025-01-01T00:00:00Z",
                    "transcription_id": "trans-123",
                    "transcription_status": "processing",
                    "transcription_language": "sl",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "pending",
                    "cleanup_model": "llama3",
                    "message": "Upload successful",
                },
            )
        )

        files = {"file": ("test.wav", io.BytesIO(short_wav_bytes), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 202
        assert response.json()["entry_id"] == "entry-123"

    def test_accepts_unknown_format(self, client, test_settings):
        """Files with unknown format should be allowed through."""
        import respx
        from httpx import Response

        test_settings.MAX_AUDIO_DURATION_SECONDS = 180

        # Mock Core API success
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-456",
                    "original_filename": "test.xyz",
                    "saved_filename": "saved-test.xyz",
                    "duration_seconds": 0,
                    "entry_type": "journal",
                    "uploaded_at": "2025-01-01T00:00:00Z",
                    "transcription_id": "trans-456",
                    "transcription_status": "processing",
                    "transcription_language": "sl",
                    "cleanup_id": "cleanup-456",
                    "cleanup_status": "pending",
                    "cleanup_model": "llama3",
                    "message": "Upload successful",
                },
            )
        )

        # Unknown format - should be allowed through
        files = {"file": ("test.xyz", io.BytesIO(b"unknown format"), "audio/unknown")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 202


class TestAudioValidationErrorMessage:
    """Tests for error message formatting."""

    def test_error_message_format(self, long_wav_bytes):
        """Error message should be user-friendly."""
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_duration(long_wav_bytes, "test.wav", 180)

        message = exc_info.value.message
        # Should mention actual and max duration in minutes
        assert "min" in message
        assert "exceeds" in message

    def test_error_includes_type(self, long_wav_bytes):
        """Error should include error_type for programmatic handling."""
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_duration(long_wav_bytes, "test.wav", 180)

        assert exc_info.value.error_type == "duration_exceeded"


# =============================================================================
# Unit Tests: validate_audio_file_size
# =============================================================================


class TestValidateAudioFileSize:
    """Tests for file size validation."""

    def test_passes_when_under_limit(self):
        """File under limit should pass without raising."""
        # 1 MB file, 50 MB limit
        content = b"x" * (1 * 1024 * 1024)
        validate_audio_file_size(content, "test.wav", 50)

    def test_passes_at_exact_limit(self):
        """File exactly at limit should pass."""
        # 10 MB file, 10 MB limit
        content = b"x" * (10 * 1024 * 1024)
        validate_audio_file_size(content, "test.wav", 10)

    def test_raises_when_over_limit(self):
        """File over limit should raise AudioValidationError."""
        # 15 MB file, 10 MB limit
        content = b"x" * (15 * 1024 * 1024)
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_file_size(content, "test.wav", 10)

        assert exc_info.value.error_type == "file_size_exceeded"
        assert "exceeds maximum" in exc_info.value.message
        assert "15.0 MB" in exc_info.value.message
        assert "10 MB" in exc_info.value.message

    def test_raises_just_over_limit(self):
        """File just over limit should raise."""
        # 10 MB + 1 byte, 10 MB limit
        content = b"x" * (10 * 1024 * 1024 + 1)
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_file_size(content, "test.wav", 10)
        assert exc_info.value.error_type == "file_size_exceeded"

    def test_configurable_limit(self):
        """Limit should be configurable."""
        # 5 MB file with 2 MB limit should fail
        content = b"x" * (5 * 1024 * 1024)
        with pytest.raises(AudioValidationError):
            validate_audio_file_size(content, "test.wav", 2)


# =============================================================================
# Integration Tests: /api/transcribe endpoint file size validation
# =============================================================================


class TestTranscribeEndpointFileSizeValidation:
    """Integration tests for /api/transcribe file size validation."""

    def test_rejects_large_file_with_422(self, client, test_settings):
        """File exceeding size limit should return 422."""
        # Set a low limit for testing (1 MB)
        test_settings.MAX_AUDIO_FILE_SIZE_MB = 1

        # Create a 2 MB file
        large_content = b"x" * (2 * 1024 * 1024)
        files = {"file": ("test.wav", io.BytesIO(large_content), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 422
        assert "exceeds maximum" in response.json()["detail"]
        assert "MB" in response.json()["detail"]

    def test_does_not_consume_rate_limit_on_file_size_failure(
        self, client, test_settings, test_engine
    ):
        """Failed file size validation should not increment rate limit counter."""
        from sqlalchemy.orm import sessionmaker

        from app.models import RateLimitEntry

        test_settings.MAX_AUDIO_FILE_SIZE_MB = 1

        large_content = b"x" * (2 * 1024 * 1024)
        files = {"file": ("test.wav", io.BytesIO(large_content), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 422

        # Check no rate limit entry was committed
        TestingSessionLocal = sessionmaker(bind=test_engine)
        db = TestingSessionLocal()
        entries = db.query(RateLimitEntry).filter_by(action="transcribe").all()
        db.close()

        assert len(entries) == 0

    def test_accepts_file_under_limit(self, client, test_settings, short_wav_bytes):
        """File under size limit should proceed to duration validation."""
        import respx
        from httpx import Response

        test_settings.MAX_AUDIO_FILE_SIZE_MB = 50
        test_settings.MAX_AUDIO_DURATION_SECONDS = 1200

        # Mock Core API success
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-789",
                    "original_filename": "test.wav",
                    "saved_filename": "saved-test.wav",
                    "duration_seconds": 10.0,
                    "entry_type": "journal",
                    "uploaded_at": "2025-01-01T00:00:00Z",
                    "transcription_id": "trans-789",
                    "transcription_status": "processing",
                    "transcription_language": "sl",
                    "cleanup_id": "cleanup-789",
                    "cleanup_status": "pending",
                    "cleanup_model": "llama3",
                    "message": "Upload successful",
                },
            )
        )

        files = {"file": ("test.wav", io.BytesIO(short_wav_bytes), "audio/wav")}
        response = client.post("/api/transcribe", files=files)

        assert response.status_code == 202


class TestFileSizeErrorMessage:
    """Tests for file size error message formatting."""

    def test_error_message_format(self):
        """Error message should be user-friendly."""
        content = b"x" * (15 * 1024 * 1024)
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_file_size(content, "test.wav", 10)

        message = exc_info.value.message
        # Should mention actual and max size in MB
        assert "MB" in message
        assert "exceeds" in message

    def test_error_includes_type(self):
        """Error should include error_type for programmatic handling."""
        content = b"x" * (15 * 1024 * 1024)
        with pytest.raises(AudioValidationError) as exc_info:
            validate_audio_file_size(content, "test.wav", 10)

        assert exc_info.value.error_type == "file_size_exceeded"
