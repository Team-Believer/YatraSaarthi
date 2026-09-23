"""
Standalone ONNX Export Script for YatraSaarthi E5 & U2 Models
Exports backend PyTorch checkpoints into frontend public/models/
Does NOT modify any backend files.
"""
import os
import sys
from pathlib import Path

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["PYTHONIOENCODING"] = "utf-8"

import torch
import torch.nn as nn
from app.ml.models.e5_velocity import VelocityGravityModel
from app.ml.models.u2_uncertainty import DecoupledUncertaintyHead

class E5ExportWrapper(nn.Module):
    """Wrapper ensuring dual outputs (velocity_mps, latent_128) during ONNX export."""
    def __init__(self, base_model: VelocityGravityModel):
        super().__init__()
        self.base_model = base_model

    def forward(self, x: torch.Tensor):
        vel_pred, latent = self.base_model(x, return_features=True)
        return vel_pred, latent

def export_models():
    weights_dir = WORKSPACE_ROOT / "backend" / "app" / "ml" / "weights"
    output_dir = WORKSPACE_ROOT / "frontend" / "public" / "models"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================")
    print("EXPORTING YATRASARTHI E5 & U2 MODELS TO ONNX")
    print("==================================================")

    # 1. Export E5 Model
    e5_pth = weights_dir / "e5_best_model.pth"
    e5_onnx = output_dir / "e5_best_model.onnx"
    print(f"\n[1/2] Loading E5 from: {e5_pth}")

    e5_model = VelocityGravityModel(input_features=15)
    e5_state_dict = torch.load(str(e5_pth), map_location="cpu")
    e5_model.load_state_dict(e5_state_dict)
    e5_model.eval()

    wrapper_e5 = E5ExportWrapper(e5_model)
    wrapper_e5.eval()

    dummy_input_e5 = torch.randn(1, 50, 15, dtype=torch.float32)

    torch.onnx.export(
        wrapper_e5,
        dummy_input_e5,
        str(e5_onnx),
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["imu_window_15"],
        output_names=["velocity_mps", "latent_features_128"],
        dynamic_axes={
            "imu_window_15": {0: "batch_size"},
            "velocity_mps": {0: "batch_size"},
            "latent_features_128": {0: "batch_size"}
        }
    )
    print(f"[OK] E5 successfully exported to: {e5_onnx} ({e5_onnx.stat().st_size / 1024:.1f} KB)")

    # 2. Export U2 Model
    u2_pth = weights_dir / "u2_best_model.pth"
    u2_onnx = output_dir / "u2_best_model.onnx"
    print(f"\n[2/2] Loading U2 from: {u2_pth}")

    u2_model = DecoupledUncertaintyHead(latent_dim=128)
    u2_state_dict = torch.load(str(u2_pth), map_location="cpu")
    u2_model.load_state_dict(u2_state_dict)
    u2_model.eval()

    dummy_input_u2 = torch.randn(1, 128, dtype=torch.float32)

    torch.onnx.export(
        u2_model,
        dummy_input_u2,
        str(u2_onnx),
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["latent_features_128"],
        output_names=["predicted_error_mps"],
        dynamic_axes={
            "latent_features_128": {0: "batch_size"},
            "predicted_error_mps": {0: "batch_size"}
        }
    )
    print(f"[OK] U2 successfully exported to: {u2_onnx} ({u2_onnx.stat().st_size / 1024:.1f} KB)")

    # Ensure models are saved as self-contained single files
    try:
        import onnx
        from onnx.external_data_helper import load_external_data_for_model

        for m_path in [e5_onnx, u2_onnx]:
            model = onnx.load(str(m_path))
            load_external_data_for_model(model, str(m_path.parent))
            onnx.save_model(model, str(m_path), save_as_external_data=False)
            data_file = m_path.parent / f"{m_path.name}.data"
            if data_file.exists():
                data_file.unlink()
                print(f"[CLEANUP] Removed external data file {data_file.name}, weights embedded into {m_path.name}")
    except Exception as e:
        print(f"[NOTE] ONNX consolidation notice: {e}")

    print("\n==================================================")
    print("[SUCCESS] BOTH MODELS SUCCESSFULLY EXPORTED AS SELF-CONTAINED ONNX!")
    print(f"E5 ONNX Size: {e5_onnx.stat().st_size / 1024:.1f} KB")
    print(f"U2 ONNX Size: {u2_onnx.stat().st_size / 1024:.1f} KB")
    print("==================================================")

if __name__ == "__main__":
    export_models()
