/**
 * MOIcustom.ts
 * Transfers centroidal MOI to a user-defined custom axis
 * using the Parallel Axis Theorem.
 *
 * Formula:
 *   Ix = Ix_centroid + A * dy²
 *   Iy = Iy_centroid + A * dx²
 *
 * where:
 *   dx = centroidX - axisX
 *   dy = centroidY - axisY
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
  const dx = centroidX - axisX;
  const dy = centroidY - axisY;

  const Ix = centroidalMOI.Ix + totalArea * dy * dy;
  const Iy = centroidalMOI.Iy + totalArea * dx * dx;

  return { Ix, Iy, dx, dy };
}