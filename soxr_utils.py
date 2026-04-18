"""
Mock soxr module to prevent import errors.
This module redirects to resampy since soxr is not available.
"""

# Import resampy to provide the actual resampling functionality
try:
    import resampy
    _has_resampy = True
except ImportError:
    _has_resampy = False

__version__ = "0.0.0"


def resample(audio, in_rate, out_rate, quality=None, num_threads=None, filter_type=None, rolloff=None, precise=False):
    """Mock resample function that uses resampy internally"""
    if not _has_resampy:
        raise ImportError("Neither soxr nor resampy is available")
    # Use resampy to do the actual resampling
    return resampy.resample(audio, in_rate, out_rate)
