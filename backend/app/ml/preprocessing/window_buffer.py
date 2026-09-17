"""
YatraSaarthi ML - IMU Window Buffer
Buffers incoming real-time smartphone IMU packets, handles timestamp jitter,
and resamples to the uniform 10 Hz grid (50 samples = 5.0 seconds) required by E5.
"""
import time
from typing import List, Optional, Tuple
import numpy as np


class IMUWindowBuffer:
    """
    Sliding window buffer for raw IMU samples.
    Resamples incoming samples to 10 Hz grid (dt = 0.1s) and extracts
    50-sample windows for E5 inference.
    """
    def __init__(self, window_size: int = 50, target_freq_hz: float = 10.0, max_history: int = 300):
        self.window_size = window_size
        self.target_freq_hz = target_freq_hz
        self.target_dt = 1.0 / target_freq_hz  # 0.1s
        self.max_history = max_history

        # Buffer: list of [timestamp, ax, ay, az, gx, gy, gz]
        self._buffer: List[List[float]] = []
        self._last_inference_time: float = 0.0

    def add_sample(
        self, timestamp: float,
        accel_x: float, accel_y: float, accel_z: float,
        gyro_x: float, gyro_y: float, gyro_z: float
    ):
        """
        Append a single real IMU measurement.
        Discards invalid/NaN values or duplicates.
        """
        vals = [timestamp, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
        if any(np.isnan(v) or np.isinf(v) for v in vals):
            return

        # Deduplicate identical timestamps
        if self._buffer and abs(timestamp - self._buffer[-1][0]) < 1e-4:
            return

        # Maintain chronological order
        if self._buffer and timestamp < self._buffer[-1][0]:
            # Jitter or slightly out of order: insert in place
            idx = len(self._buffer) - 1
            while idx >= 0 and self._buffer[idx][0] > timestamp:
                idx -= 1
            self._buffer.insert(idx + 1, vals)
        else:
            self._buffer.append(vals)

        # Cap memory
        if len(self._buffer) > self.max_history:
            self._buffer = self._buffer[-self.max_history:]

    def clear(self):
        """Reset the buffer."""
        self._buffer.clear()
        self._last_inference_time = 0.0

    @property
    def raw_sample_count(self) -> int:
        return len(self._buffer)

    @property
    def duration_seconds(self) -> float:
        if len(self._buffer) < 2:
            return 0.0
        return max(0.0, self._buffer[-1][0] - self._buffer[0][0])

    @property
    def fill_percentage(self) -> float:
        """Percentage of the required 5.0 second window accumulated (0.0 to 100.0)."""
        dur = self.duration_seconds
        req_dur = (self.window_size - 1) * self.target_dt  # 4.9s
        return min(100.0, max(0.0, (dur / req_dur) * 100.0))

    @property
    def is_ready(self) -> bool:
        """True when at least 5.0 seconds of IMU history have accumulated or window_size samples present."""
        req_dur = (self.window_size - 1) * self.target_dt - 1e-3
        return (self.duration_seconds >= req_dur) or len(self._buffer) >= self.window_size

    def get_resampled_window(self) -> Optional[np.ndarray]:
        """
        Extract and resample the most recent 5.0 seconds of IMU measurements
        to the exact 10 Hz grid (50 samples).
        
        Returns:
            np.ndarray of shape [50, 6] with columns [ax, ay, az, gx, gy, gz],
            or None if insufficient data.
        """
        if not self.is_ready or len(self._buffer) < 5:
            return None

        arr = np.array(self._buffer, dtype=np.float64)
        times = arr[:, 0]
        imu_data = arr[:, 1:7]  # 6 sensor channels

        t_end = times[-1]
        t_start = t_end - ((self.window_size - 1) * self.target_dt)

        if t_start < times[0] - 1e-3:
            return None
        
        t_start = max(t_start, times[0])

        # Uniform 10 Hz target grid
        target_times = np.linspace(t_start, t_end, self.window_size)

        # Resample each channel via 1D linear interpolation
        resampled = np.zeros((self.window_size, 6), dtype=np.float32)
        for i in range(6):
            resampled[:, i] = np.interp(target_times, times, imu_data[:, i])

        return resampled
