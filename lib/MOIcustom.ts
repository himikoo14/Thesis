/**
 * MOIcustom.ts
 * Transfers centroidal MOI to a user-defined custom axis
 * using the Parallel Axis Theorem.
 *
 * Formula:
 *   Ix_custom = Ix_centroid + A * dy²
 *   Iy_custom = Iy_centroid + A * dx²
 *
 * where:
 *   dx = axisX - centroidX   (horizontal distance from centroid to custom axis)
 *   dy = axisY - centroidY   (vertical distance from centroid to custom axis)
 *
 * Note: The sign of dx/dy does not affect the result since they are squared,
 * but the convention is kept consistent: custom axis minus centroid.
 */

type CentroidalMOI = {
  Ix: number;
  Iy: number;
};

type CustomMOIResult = {
  Ix: number;
  Iy: number;
  dx: number;
  dy: number;
};

/**
 * Computes the moment of inertia about a custom (user-defined) axis
 * by applying the Parallel Axis Theorem from the centroidal axis.
 *
 * @param centroidalMOI - { Ix, Iy } about the centroidal axis
 * @param totalArea     - total composite area (signed, hollow already subtracted)
 * @param centroidX     - x-coordinate of composite centroid
 * @param centroidY     - y-coordinate of composite centroid
 * @param axisX         - x-coordinate of the custom reference axis
 * @param axisY         - y-coordinate of the custom reference axis
 * @returns             - { Ix, Iy, dx, dy } about the custom axis
 */
export function computeCustomAxis(
  centroidalMOI: CentroidalMOI,
  totalArea: number,
  centroidX: number,
  centroidY: number,
  axisX: number,
  axisY: number
): CustomMOIResult {
  // Distance from centroid to custom axis
  // Sign doesn't matter (squared), but convention: axis - centroid
  const dx = axisX - centroidX;
  const dy = axisY - centroidY;

  // Parallel Axis Theorem:
  // Ix_custom = Ix_centroid + A * dy²  (dy is the vertical offset → affects Ix)
  // Iy_custom = Iy_centroid + A * dx²  (dx is the horizontal offset → affects Iy)
  const Ix = centroidalMOI.Ix + totalArea * dy * dy;
  const Iy = centroidalMOI.Iy + totalArea * dx * dx;

  return { Ix, Iy, dx, dy };
}