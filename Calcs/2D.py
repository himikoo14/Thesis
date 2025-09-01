import math
import matplotlib.pyplot as plt

class ResultantForceSolver:
    def __init__(self):
        self.vectors = []

    def add_vector_polar(self, magnitude, angle_deg):
        """Add a vector using magnitude and angle (deg, CCW from +x)."""
        angle_rad = math.radians(angle_deg)
        fx = magnitude * math.cos(angle_rad)
        fy = magnitude * math.sin(angle_rad)
        self.vectors.append((fx, fy, magnitude, angle_deg))

    def solve(self, show_steps=True):
        Fx_list = [v[0] for v in self.vectors]
        Fy_list = [v[1] for v in self.vectors]

        ΣFx = sum(Fx_list)
        ΣFy = sum(Fy_list)

        R = math.sqrt(ΣFx**2 + ΣFy**2)
        θ = math.degrees(math.atan2(ΣFy, ΣFx))

        if show_steps:
            print("Step 1: Resolve each vector into components (Fx, Fy):")
            for i, (fx, fy, mag, ang) in enumerate(self.vectors, 1):
                print(f"  Vector {i}: {mag:.2f} @ {ang:.1f}° → Fx={fx:.3f}, Fy={fy:.3f}")

            print("\nStep 2: Sum of components:")
            print(f"  ΣFx = {ΣFx:.3f}")
            print(f"  ΣFy = {ΣFy:.3f}")

            print("\nStep 3: Resultant magnitude:")
            print(f"  R = sqrt(ΣFx² + ΣFy²) = sqrt({ΣFx:.3f}² + {ΣFy:.3f}²) = {R:.3f}")

            print("\nStep 4: Resultant angle (counterclockwise from +x):")
            print(f"  θ = atan2(ΣFy, ΣFx) = atan2({ΣFy:.3f}, {ΣFx:.3f}) = {θ:.2f}°")

            print("\nFinal Result:")
            print(f"  Resultant Force = {R:.3f}")
            print(f"  Direction = {θ:.2f}° CCW from +x")

        return R, θ

    def plot_head_to_tail(self):
        """Draw head-to-tail vector diagram (resultant in red)."""
        fig, ax = plt.subplots()
        ax.set_aspect("equal")
        ax.axhline(0, color="black", lw=0.5)
        ax.axvline(0, color="black", lw=0.5)

        ΣFx = sum(v[0] for v in self.vectors)
        ΣFy = sum(v[1] for v in self.vectors)

        x, y = 0, 0
        for i, (fx, fy, mag, ang) in enumerate(self.vectors, 1):
            ax.arrow(x, y, fx, fy, head_width=0.2, length_includes_head=True)
            ax.text(x + fx/2, y + fy/2, f"F{i}={mag}N", fontsize=9, color="blue")
            x += fx
            y += fy

        ax.arrow(0, 0, ΣFx, ΣFy, color="red", head_width=0.3, length_includes_head=True, label="Resultant")
        ax.legend()
        plt.title("Head-to-Tail Vector Diagram")
        plt.grid(True)
        plt.show()

    def plot_free_body(self):
        """Draw Free Body Diagram (all forces from origin)."""
        fig, ax = plt.subplots()
        ax.set_aspect("equal")
        ax.axhline(0, color="black", lw=0.5)
        ax.axvline(0, color="black", lw=0.5)

        ΣFx = sum(v[0] for v in self.vectors)
        ΣFy = sum(v[1] for v in self.vectors)

        # Draw all forces from origin
        for i, (fx, fy, mag, ang) in enumerate(self.vectors, 1):
            ax.arrow(0, 0, fx, fy, head_width=0.2, length_includes_head=True)
            ax.text(fx * 1.05, fy * 1.05, f"F{i}={mag}N\n({ang}°)", fontsize=9, color="blue")

        # Draw resultant from origin
        ax.arrow(0, 0, ΣFx, ΣFy, color="red", head_width=0.3, length_includes_head=True, label="Resultant")
        ax.text(ΣFx*1.05, ΣFy*1.05, "Resultant", fontsize=10, color="red")

        ax.legend()
        plt.title("Free Body Diagram (FBD)")
        plt.grid(True)
        plt.show()


if __name__ == "__main__":
    solver = ResultantForceSolver()
    solver.add_vector_polar(4, 0)     # F1 = 4 N at 0°
    solver.add_vector_polar(5, 45)    # F2 = 5 N at 45°
    solver.add_vector_polar(8, 105)   # F3 = 8 N at 105°

    solver.solve(show_steps=True)
    solver.plot_free_body()      # Draw FBD
    solver.plot_head_to_tail()   # Draw head-to-tail
