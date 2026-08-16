export const DISC_RX_SCALE = 0.30;
export const DISC_RY_SCALE = 1;

const unit = ({ x, y }) => {
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
};

export const DEPTH_VECTOR = Object.freeze(unit({ x: 0.98, y: 0.20 }));

export function createCamera({ width, height, scale }) {
  const longitudinalVector = {
    x: (width * 0.52 / 180) * scale,
    y: (-height * 0.06 / 180) * scale
  };

  return {
    origin: { x: width * 0.22, y: height * 0.52 },
    longitudinalVector,
    verticalVector: { x: 0, y: scale },
    axleVector: DEPTH_VECTOR,
    ellipseRotation: Math.atan2(longitudinalVector.y, longitudinalVector.x)
  };
}

export function projectPoint({ longitudinal, vertical, axle }, camera) {
  return {
    x: camera.origin.x
      + longitudinal * camera.longitudinalVector.x
      + vertical * camera.verticalVector.x
      + axle * camera.axleVector.x,
    y: camera.origin.y
      + longitudinal * camera.longitudinalVector.y
      + vertical * camera.verticalVector.y
      + axle * camera.axleVector.y
  };
}

export function createDrivetrainGeometry({ width, height, scale, cassette, chainrings }) {
  const camera = createCamera({ width, height, scale });
  const rearAnchor = projectPoint({ longitudinal: 0, vertical: 0, axle: 0 }, camera);
  const frontAnchor = projectPoint({ longitudinal: 180, vertical: 0, axle: 0 }, camera);
  const cassetteSpacing = 6.48 * scale;

  const sprockets = cassette.map((teeth, index) => {
    const depth = (5 - index) * cassetteSpacing;
    return {
      ...projectPoint({ longitudinal: 0, vertical: 0, axle: depth }, camera),
      r: (16 + (teeth - 11) * 2.3) * scale,
      teeth,
      index,
      depth
    };
  });

  const frontDepth = 16 * scale;
  const frontRings = [
    {
      ...projectPoint({ longitudinal: 180, vertical: 0, axle: -frontDepth }, camera),
      r: 34 * scale,
      teeth: chainrings[0],
      index: 0,
      depth: -frontDepth
    },
    {
      ...projectPoint({ longitudinal: 180, vertical: 0, axle: frontDepth }, camera),
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
      depthVector: camera.axleVector,
      camera,
      ellipseRotation: camera.ellipseRotation
    },
    camera,
    rearAnchor,
    frontAnchor,
    frame: {
      rearDropout: projectPoint({ longitudinal: 0, vertical: 0, axle: -30 * scale }, camera),
      bottomBracket: projectPoint({ longitudinal: 180, vertical: 0, axle: 0 }, camera),
      seatCluster: projectPoint({ longitudinal: 150, vertical: -80, axle: 0 }, camera)
    },
    sprockets,
    frontRings
  };
}

const toCircleSpace = (point, projection) => {
  const cos = Math.cos(projection.ellipseRotation);
  const sin = Math.sin(projection.ellipseRotation);
  return {
    x: (point.x * cos + point.y * sin) / projection.rxScale,
    y: (-point.x * sin + point.y * cos) / projection.ryScale
  };
};

const toScreenSpace = (point, projection) => {
  const localX = point.x * projection.rxScale;
  const localY = point.y * projection.ryScale;
  const cos = Math.cos(projection.ellipseRotation);
  const sin = Math.sin(projection.ellipseRotation);
  return {
    x: localX * cos - localY * sin,
    y: localX * sin + localY * cos
  };
};

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

const ellipseAngle = (point, center, projection) => {
  const local = toCircleSpace({
    x: point.x - center.x,
    y: point.y - center.y
  }, projection);
  return Math.atan2(local.y, local.x);
};

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
