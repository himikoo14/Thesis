/**
 * MOIcustom.ts
 * Transfers each shape's centroidal MOI to a user-defined custom axis
 * using the Parallel Axis Theorem, applied per shape.
 *
 * Formula (per shape i):
 *   Ix_i_custom = Ix_i_centroid + A_i * dy_i²
 *   Iy_i_custom = Iy_i_centroid + A_i * dx_i²
 *
 * where:
 *   dx_i = axisX - shape_i.centroidX  (horizontal distance: custom axis → shape centroid)
 *   dy_i = axisY - shape_i.centroidY  (vertical distance:   custom axis → shape centroid)
 *
 * The composite MOI about the custom axis is the sum over all shapes:
 *   Ix_custom = Σ (Ix_i_centroid + A_i * dy_i²)
 *   Iy_custom = Σ (Iy_i_centroid + A_i * dx_i²)
 *
 * Note: Hollow shapes must be passed with a negative area so their
 * contribution is correctly subtracted from the composite total.
 */

type ShapeMOIInput = {
  /** Centroidal MOI of this shape about its own centroidal x-axis */
  Ix: number;
  /** Centroidal MOI of this shape about its own centroidal y-axis */
  Iy: number;
  /** Signed area (negative for hollow/cutout shapes) */
  area: number;
  /** x-coordinate of this shape's centroid */
  centroidX: number;
  /** y-coordinate of this shape's centroid */
  centroidY: number;
};

type ShapeTransferDetail = {
  dx: number;
  dy: number;
  Ix: number;
  Iy: number;
};

type CustomMOIResult = {
  /** Composite MOI about the custom axis (x-direction) */
  Ix: number;
  /** Composite MOI about the custom axis (y-direction) */
  Iy: number;
  /** Per-shape transfer details, in the same order as the input array */
  shapes: ShapeTransferDetail[];
};

/**
 * Computes the composite moment of inertia about a user-defined custom axis
 * by applying the Parallel Axis Theorem independently to each shape.
 *
 * @param shapes  - Array of individual shapes with their centroidal MOI,
 *                  signed area, and centroid coordinates.
 * @param axisX   - x-coordinate of the custom reference axis
 * @param axisY   - y-coordinate of the custom reference axis
 * @returns       - Composite { Ix, Iy } about the custom axis, plus per-shape details
 */
export function computeCustomAxis(
  shapes: ShapeMOIInput[],
  axisX: number,
  axisY: number
): CustomMOIResult {
  let totalIx = 0;
  let totalIy = 0;

  const shapeDetails: ShapeTransferDetail[] = shapes.map((shape) => {
    const dx = axisX - shape.centroidX;
    const dy = axisY - shape.centroidY;

    // Parallel Axis Theorem:
    // Centroidal Ix/Iy are always positive.
    // shape.area is negative for hollow/cutout shapes,
    // which naturally subtracts their contribution.
const sign = shape.area < 0 ? -1 : 1;
const Ix = sign * shape.Ix + sign * Math.abs(shape.area) * dy * dy;
const Iy = sign * shape.Iy + sign * Math.abs(shape.area) * dx * dx;

    totalIx += Ix;
    totalIy += Iy;

    return { dx, dy, Ix, Iy };
  });

  return {
    Ix: totalIx,
    Iy: totalIy,
    shapes: shapeDetails,
  };
}