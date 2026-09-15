"""
YatraSaarthi IDR Engine - Invariant Extended Kalman Filter (InEKF)

15-state error-state EKF for navigation:
State: [δp(3), δv(3), δθ(3), δba(3), δbg(3)]

Prediction: IMU-driven state propagation with process noise Q.
Measurement Update: GNSS position/velocity with innovation gating.
Joseph-form covariance update for numerical stability.

No fake filter outputs. All estimates are derived from actual sensor data.
"""
import numpy as np
from typing import Optional, Tuple
from app.idr.state import IMUMeasurement, GNSSMeasurement
from app.idr.mechanization import (
    INSMechanization, quaternion_to_dcm, euler_to_quaternion,
    quaternion_to_euler, GRAVITY
)


class InvariantEKF:
    """
    Invariant Extended Kalman Filter for INS/GNSS fusion.
    
    Error state vector (15 dimensions):
    [0:3]   - Position error (NED, meters)
    [3:6]   - Velocity error (NED, m/s)
    [6:9]   - Attitude error (small-angle, radians)
    [9:12]  - Accelerometer bias error (m/s^2)
    [12:15] - Gyroscope bias error (rad/s)
    """
    
    def __init__(self):
        self.n_states = 15
        self.mechanization = INSMechanization()
        
        # Error state covariance (15x15)
        self.P = np.eye(self.n_states)
        self.P[0:3, 0:3] *= 100.0     # Position uncertainty (m^2)
        self.P[3:6, 3:6] *= 10.0      # Velocity uncertainty (m/s)^2
        self.P[6:9, 6:9] *= 0.1       # Attitude uncertainty (rad^2)
        self.P[9:12, 9:12] *= 0.01    # Accel bias uncertainty
        self.P[12:15, 12:15] *= 0.001 # Gyro bias uncertainty
        
        # Process noise spectral densities
        self.accel_noise = 0.5    # m/s^2/√Hz  (MEMS grade)
        self.gyro_noise = 0.01   # rad/s/√Hz  (MEMS grade)
        self.accel_bias_rw = 0.001  # m/s^2/s  (random walk)
        self.gyro_bias_rw = 0.0001  # rad/s/s  (random walk)
        
        # GNSS measurement noise
        self.gnss_pos_noise = 5.0   # meters (updated from reported accuracy)
        self.gnss_vel_noise = 0.5   # m/s
        
        # Biases (estimated)
        self.accel_bias = np.zeros(3)
        self.gyro_bias = np.zeros(3)
        
        # Innovation gating threshold (chi-square with 3 DoF, 99.7%)
        self.innovation_gate = 11.345
        
        self.initialized = False
        self.last_imu_time: Optional[float] = None
        
    def initialize_from_gnss(self, gnss: GNSSMeasurement, heading_rad: float = 0.0):
        """Initialize the filter from the first valid GNSS fix."""
        alt = gnss.altitude if gnss.altitude is not None else 0.0
        self.mechanization.initialize(
            gnss.latitude, gnss.longitude, alt,
            heading_rad=heading_rad
        )
        
        if gnss.speed is not None and gnss.speed > 0.5:
            heading_for_vel = heading_rad
            if gnss.heading is not None:
                heading_for_vel = np.radians(gnss.heading)
            self.mechanization.velocity[0] = gnss.speed * np.cos(heading_for_vel)
            self.mechanization.velocity[1] = gnss.speed * np.sin(heading_for_vel)
        
        # Set initial covariance based on reported GNSS accuracy
        acc = max(gnss.accuracy, 1.0)
        self.P[0:3, 0:3] = np.eye(3) * acc**2
        self.P[3:6, 3:6] = np.eye(3) * 2.0**2
        self.P[6:9, 6:9] = np.eye(3) * (np.radians(10))**2
        self.P[9:12, 9:12] = np.eye(3) * 0.05**2
        self.P[12:15, 12:15] = np.eye(3) * 0.005**2
        
        self.initialized = True
        self.last_imu_time = None
    
    def predict(self, imu: IMUMeasurement, Q_scale: float = 1.0) -> dict:
        """
        IMU-driven prediction step.
        
        Propagates the navigation state using actual IMU measurements
        and updates the error-state covariance with process noise.
        
        Q_scale: adaptive scaling from CovarianceAdapter (1.0 = nominal).
        """
        if not self.initialized:
            return self.mechanization._current_state()
        
        if self.last_imu_time is None:
            self.last_imu_time = imu.timestamp
            return self.mechanization._current_state()
        
        dt = imu.timestamp - self.last_imu_time
        if dt <= 0 or dt > 2.0:
            self.last_imu_time = imu.timestamp
            return self.mechanization._current_state()
        
        self.last_imu_time = imu.timestamp
        
        # Propagate INS mechanization with bias-corrected measurements
        result = self.mechanization.propagate(imu, dt, self.accel_bias, self.gyro_bias)
        
        # Build state transition matrix F (15x15)
        C_bn = quaternion_to_dcm(self.mechanization.quaternion)
        accel_body_corrected = imu.accel - self.accel_bias
        f_nav = C_bn @ accel_body_corrected
        
        F = np.zeros((15, 15))
        # δṗ = δv
        F[0:3, 3:6] = np.eye(3)
        # δv̇ = -C_bn [f×] δθ - C_bn δba
        f_skew = self._skew_symmetric(f_nav)
        F[3:6, 6:9] = -f_skew
        F[3:6, 9:12] = -C_bn
        # δθ̇ = -C_bn δbg
        F[6:9, 12:15] = -C_bn
        
        # State transition matrix (first-order approximation)
        Phi = np.eye(15) + F * dt
        
        # Process noise
        G = np.zeros((15, 12))
        G[3:6, 0:3] = -C_bn            # Accel noise → velocity
        G[6:9, 3:6] = -C_bn            # Gyro noise → attitude
        G[9:12, 6:9] = np.eye(3)       # Accel bias random walk
        G[12:15, 9:12] = np.eye(3)     # Gyro bias random walk
        
        Qc = np.zeros((12, 12))
        Qc[0:3, 0:3] = np.eye(3) * self.accel_noise**2 * Q_scale
        Qc[3:6, 3:6] = np.eye(3) * self.gyro_noise**2 * Q_scale
        Qc[6:9, 6:9] = np.eye(3) * self.accel_bias_rw**2
        Qc[9:12, 9:12] = np.eye(3) * self.gyro_bias_rw**2
        
        Q = G @ Qc @ G.T * dt
        
        # Covariance propagation
        self.P = Phi @ self.P @ Phi.T + Q
        # Enforce symmetry
        self.P = (self.P + self.P.T) / 2.0
        
        return result
    
    def update_gnss(self, gnss: GNSSMeasurement) -> Tuple[bool, float]:
        """
        GNSS measurement update with innovation gating.
        
        Returns (accepted: bool, innovation_norm: float).
        If the innovation exceeds the gate, the measurement is rejected
        to prevent position jumps (important for GNSS reacquisition).
        """
        if not self.initialized:
            return False, 0.0
        
        # Measurement model: position observation (3D)
        H = np.zeros((3, 15))
        H[0:3, 0:3] = np.eye(3)  # Observe position directly
        
        # Measurement noise R from reported GNSS accuracy
        acc = max(gnss.accuracy, 1.0)
        R = np.eye(3) * acc**2
        
        # Innovation: measured position - predicted position
        mech_state = self.mechanization._current_state()
        # Convert both to local NED displacement for innovation calculation
        # Simplified: use lat/lon difference in meters
        dlat_m = (gnss.latitude - mech_state["latitude"]) * 111319.5
        dlon_m = (gnss.longitude - mech_state["longitude"]) * 111319.5 * np.cos(np.radians(gnss.latitude))
        dalt_m = 0.0
        if gnss.altitude is not None:
            dalt_m = gnss.altitude - mech_state["altitude"]
        
        z = np.array([dlat_m, dlon_m, dalt_m])
        
        # Innovation covariance
        S = H @ self.P @ H.T + R
        
        # Innovation gating (Mahalanobis distance)
        try:
            S_inv = np.linalg.inv(S)
        except np.linalg.LinAlgError:
            return False, float(np.linalg.norm(z))
        
        gamma = z.T @ S_inv @ z
        innovation_norm = float(np.sqrt(gamma))
        
        if gamma > self.innovation_gate:
            # Reject measurement - likely multipath or position jump
            return False, innovation_norm
        
        # Kalman gain
        K = self.P @ H.T @ S_inv
        
        # Error state correction
        dx = K @ z
        
        # Apply corrections
        self._apply_error_state(dx)
        
        # Joseph-form covariance update (numerically stable)
        I_KH = np.eye(self.n_states) - K @ H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T
        self.P = (self.P + self.P.T) / 2.0
        
        return True, innovation_norm
    
    def update_velocity(self, v_meas: np.ndarray, R_vel: np.ndarray) -> bool:
        """
        Velocity measurement update (from GNSS speed or estimator).
        """
        if not self.initialized:
            return False
        
        H = np.zeros((3, 15))
        H[0:3, 3:6] = np.eye(3)
        
        v_pred = self.mechanization.velocity
        z = v_meas - v_pred
        
        S = H @ self.P @ H.T + R_vel
        try:
            S_inv = np.linalg.inv(S)
        except np.linalg.LinAlgError:
            return False
        
        K = self.P @ H.T @ S_inv
        dx = K @ z
        self._apply_error_state(dx)
        
        I_KH = np.eye(self.n_states) - K @ H
        self.P = I_KH @ self.P @ I_KH.T + K @ R_vel @ K.T
        self.P = (self.P + self.P.T) / 2.0
        
        return True
    
    def update_nhc(self, R_lateral: float, R_vertical: float) -> bool:
        """
        Non-Holonomic Constraint update.
        
        For a ground vehicle:
        - Lateral velocity ≈ 0 in vehicle frame
        - Vertical velocity ≈ 0 in vehicle frame
        
        R_lateral and R_vertical are adaptive noise values 
        (relaxed for motorcycles during lean).
        """
        if not self.initialized:
            return False
        
        C_bn = quaternion_to_dcm(self.mechanization.quaternion)
        # Transform velocity to body frame
        v_body = C_bn.T @ self.mechanization.velocity
        
        # NHC observation: lateral and vertical body velocity should be ~0
        z_nhc = np.array([v_body[1], v_body[2]])  # [lateral, vertical]
        
        # Observation matrix for NHC (2x15)
        H_nhc = np.zeros((2, 15))
        H_nhc[0:2, 3:6] = (C_bn.T)[1:3, :]  # Rows 1,2 of C_nb
        
        R_nhc = np.diag([R_lateral, R_vertical])
        
        S = H_nhc @ self.P @ H_nhc.T + R_nhc
        try:
            S_inv = np.linalg.inv(S)
        except np.linalg.LinAlgError:
            return False
        
        K = self.P @ H_nhc.T @ S_inv
        dx = K @ z_nhc
        self._apply_error_state(dx)
        
        I_KH = np.eye(self.n_states) - K @ H_nhc
        self.P = I_KH @ self.P @ I_KH.T + K @ R_nhc @ K.T
        self.P = (self.P + self.P.T) / 2.0
        
        return True
    
    def update_heading(self, heading_rad: float, R_heading: float) -> bool:
        """Heading measurement update from HeadingEngine."""
        if not self.initialized:
            return False
        
        _, _, yaw_pred = quaternion_to_euler(self.mechanization.quaternion)
        
        # Wrap heading difference to [-pi, pi]
        dh = heading_rad - yaw_pred
        while dh > np.pi:
            dh -= 2 * np.pi
        while dh < -np.pi:
            dh += 2 * np.pi
        
        z = np.array([dh])
        
        H = np.zeros((1, 15))
        H[0, 8] = 1.0  # Yaw component of attitude error
        
        R = np.array([[R_heading]])
        
        S = H @ self.P @ H.T + R
        K = self.P @ H.T / S[0, 0]
        
        dx = (K @ z).flatten()
        self._apply_error_state(dx)
        
        I_KH = np.eye(self.n_states) - K @ H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T
        self.P = (self.P + self.P.T) / 2.0
        
        return True
    
    def update_zupt(self, R_zupt: float = 0.01) -> bool:
        """
        Zero Velocity Update.
        Applied when vehicle is detected stationary from actual sensor evidence.
        """
        if not self.initialized:
            return False
        
        v_meas = np.zeros(3)
        R_vel = np.eye(3) * R_zupt
        return self.update_velocity(v_meas, R_vel)
    
    def _apply_error_state(self, dx: np.ndarray):
        """Apply error state correction to mechanization and biases."""
        # Position correction
        lat = np.degrees(self.mechanization.position_lla[0])
        lon = np.degrees(self.mechanization.position_lla[1])
        alt = self.mechanization.position_lla[2]
        
        # Convert position error from meters to degrees
        dlat_deg = dx[0] / 111319.5
        cos_lat = np.cos(np.radians(lat))
        if abs(cos_lat) < 1e-10:
            cos_lat = 1e-10
        dlon_deg = dx[1] / (111319.5 * cos_lat)
        
        self.mechanization.set_position(lat + dlat_deg, lon + dlon_deg, alt + dx[2])
        
        # Velocity correction
        self.mechanization.velocity += dx[3:6]
        
        # Attitude correction (small-angle rotation)
        dphi = dx[6:9]
        dphi_mag = np.linalg.norm(dphi)
        if dphi_mag > 1e-10:
            half = dphi_mag / 2.0
            axis = dphi / dphi_mag
            dq = np.array([np.cos(half), 
                           axis[0] * np.sin(half),
                           axis[1] * np.sin(half),
                           axis[2] * np.sin(half)])
        else:
            dq = np.array([1.0, dphi[0]/2, dphi[1]/2, dphi[2]/2])
        
        from app.idr.mechanization import quaternion_multiply
        new_q = quaternion_multiply(dq, self.mechanization.quaternion)
        self.mechanization.set_attitude(new_q)
        
        # Bias corrections
        self.accel_bias += dx[9:12]
        self.gyro_bias += dx[12:15]
    
    def get_state(self) -> dict:
        """Get current complete filter state."""
        mech = self.mechanization._current_state()
        return {
            **mech,
            "accel_bias": self.accel_bias.copy(),
            "gyro_bias": self.gyro_bias.copy(),
            "covariance": self.P.copy(),
            "initialized": self.initialized
        }
    
    @staticmethod
    def _skew_symmetric(v: np.ndarray) -> np.ndarray:
        """Create skew-symmetric matrix from 3-vector."""
        return np.array([
            [0, -v[2], v[1]],
            [v[2], 0, -v[0]],
            [-v[1], v[0], 0]
        ])
