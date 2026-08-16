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

const toCircleSpace = (point, projection) => ({
  x: point.x / projection.rxScale,
  y: point.y / projection.ryScale
});

const toScreenSpace = (point, projection) => ({
  x: point.x * projection.rxScale,
  y: point.y * projection.ryScale
});

function externalTangentPair(first, second, projection) {
  const a = toCircleSpace(first, projection);
  const b = toCircleSpace(second, projection);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const ux = dx / distance;
  const uy = dy / distance;
  const radiusDelta = first.r - second.r;
  const along = radiusDelta / distance;
  const across = Math.sqrt(1 - along * along);

  return [-1, 1].map((sign) => {
    const nx = ux * along + (-uy) * across * sign;
    const ny = uy * along + ux * across * sign;

    return {
      first: toScreenSpace({
        x: a.x + nx * first.r,
        y: a.y + ny * first.r
      }, projection),
      second: toScreenSpace({
        x: b.x + nx * second.r,
        y: b.y + ny * second.r
      }, projection)
    };
  });
}

const ellipseAngle = (point, center, projection) => Math.atan2(
  (point.y - center.y) / projection.ryScale,
  (point.x - center.x) / projection.rxScale
);

export function createChainPathGeometry({ sprocket, frontRing, projection, scale }) {
  const tangents = externalTangentPair(sprocket, frontRing, projection);
  const top = tangents.reduce((best, candidate) =>
    candidate.first.y < best.first.y ? candidate : best
  );
  const bottom = tangents.reduce((best, candidate) =>
    candidate.first.y > best.first.y ? candidate : best
  );

  return {
    rearTop: top.first,
    frontTop: top.second,
    rearBottom: bottom.first,
    frontBottom: bottom.second,
    rearTopAngle: ellipseAngle(top.first, sprocket, projection),
    frontTopAngle: ellipseAngle(top.second, frontRing, projection),
    rearBottomAngle: ellipseAngle(bottom.first, sprocket, projection),
    frontBottomAngle: ellipseAngle(bottom.second, frontRing, projection),
    guidePulley: {
      x: sprocket.x - 3 * scale,
      y: bottom.first.y + 13 * scale
    },
    tensionPulley: {
      x: sprocket.x + 6 * scale,
      y: bottom.first.y + 34 * scale
    }
  };
}
