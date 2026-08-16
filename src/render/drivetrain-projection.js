export const DISC_RX_SCALE = 0.30;
export const DISC_RY_SCALE = 1;

const rawDepth = { x: 6.4, y: 1 };
const depthLength = Math.hypot(rawDepth.x, rawDepth.y);

export const DEPTH_VECTOR = Object.freeze({
  x: rawDepth.x / depthLength,
  y: rawDepth.y / depthLength
});

const offsetDepth = (point, distance) => ({
  x: point.x + DEPTH_VECTOR.x * distance,
  y: point.y + DEPTH_VECTOR.y * distance
});

export function createDrivetrainGeometry({ width, height, scale, cassette, chainrings }) {
  const rearAnchor = { x: width * 0.24, y: height * 0.48 };
  const frontAnchor = { x: width * 0.74, y: height * 0.42 };
  const cassetteSpacing = 6.48 * scale;

  const sprockets = cassette.map((teeth, index) => {
    const depth = (5 - index) * cassetteSpacing;
    return {
      ...offsetDepth(rearAnchor, depth),
      r: (16 + (teeth - 11) * 2.3) * scale,
      teeth,
      index,
      depth
    };
  });

  const frontDepth = 6.5 * scale;
  const frontRings = [
    {
      ...offsetDepth(frontAnchor, -frontDepth),
      r: 34 * scale,
      teeth: chainrings[0],
      index: 0,
      depth: -frontDepth
    },
    {
      ...offsetDepth(frontAnchor, frontDepth),
      r: 48 * scale,
      teeth: chainrings[1],
      index: 1,
      depth: frontDepth
    }
  ];

  return {
    projection: {
      rxScale: DISC_RX_SCALE,
      ryScale: DISC_RY_SCALE,
      depthVector: DEPTH_VECTOR
    },
    rearAnchor,
    frontAnchor,
    frame: {
      rearDropout: offsetDepth(rearAnchor, -30 * scale),
      bottomBracket: frontAnchor,
      seatCluster: {
        x: frontAnchor.x - 35 * scale,
        y: frontAnchor.y - 80 * scale
      }
    },
    sprockets,
    frontRings
  };
}
