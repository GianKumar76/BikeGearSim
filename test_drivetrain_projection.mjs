import assert from 'node:assert/strict';
import {
  createCamera,
  createChainPathGeometry,
  createDrivetrainGeometry,
  projectPoint
} from './src/render/drivetrain-projection.js';

const EPSILON = 1e-9;
const camera = createCamera({ width: 1280, height: 190, scale: 1 });
const cameraOrigin = projectPoint({ longitudinal: 0, vertical: 0, axle: 0 }, camera);
const projectedFront = projectPoint({ longitudinal: 180, vertical: 0, axle: 0 }, camera);
const projectedNearRing = projectPoint({ longitudinal: 180, vertical: 0, axle: -11 }, camera);
const projectedFarRing = projectPoint({ longitudinal: 180, vertical: 0, axle: 11 }, camera);

assert.deepEqual(cameraOrigin, camera.origin);
assert.ok(projectedFront.x > cameraOrigin.x);
assert.ok(projectedFront.y < cameraOrigin.y);
assert.ok(Math.abs(Math.hypot(camera.axleVector.x, camera.axleVector.y) - 1) < EPSILON);
assert.ok(Math.abs(Math.hypot(
  projectedFarRing.x - projectedNearRing.x,
  projectedFarRing.y - projectedNearRing.y
) - 22) < EPSILON);
assert.ok(camera.ellipseRotation < 0);

const geometry = createDrivetrainGeometry({
  width: 1280,
  height: 190,
  scale: 1,
  cassette: [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30],
  chainrings: [34, 50]
});

assert.equal(geometry.projection.rxScale, 0.30);
assert.equal(geometry.projection.ryScale, 1);
assert.strictEqual(geometry.camera, geometry.projection.camera);
assert.equal(geometry.projection.ellipseRotation, camera.ellipseRotation);

const depth = geometry.projection.depthVector;
assert.ok(Math.abs(Math.hypot(depth.x, depth.y) - 1) < EPSILON);
assert.ok(depth.x > 0 && depth.y > 0);

const assertFollowsDepth = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  assert.ok(Math.abs(dx * depth.y - dy * depth.x) < EPSILON);
};

for (let i = 1; i < geometry.sprockets.length; i += 1) {
  assertFollowsDepth(geometry.sprockets[i - 1], geometry.sprockets[i]);
  assert.notDeepEqual(
    [geometry.sprockets[i - 1].x, geometry.sprockets[i - 1].y],
    [geometry.sprockets[i].x, geometry.sprockets[i].y]
  );
}

assertFollowsDepth(geometry.frontRings[0], geometry.frontRings[1]);
assert.ok(Math.hypot(
  geometry.frontRings[1].x - geometry.frontRings[0].x,
  geometry.frontRings[1].y - geometry.frontRings[0].y
) >= 30);
assert.ok(geometry.sprockets[0].r < geometry.sprockets.at(-1).r);
assert.ok(geometry.frontRings[0].r < geometry.frontRings[1].r);
console.log('✓ Unified drivetrain projection geometry');

const activeRear = geometry.sprockets[4];
const activeFront = geometry.frontRings[1];
const chain = createChainPathGeometry({
  sprocket: activeRear,
  frontRing: activeFront,
  projection: geometry.projection,
  scale: 1
});

const toEllipseSpace = (point, center, projection) => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(projection.ellipseRotation);
  const sin = Math.sin(projection.ellipseRotation);
  return {
    x: (dx * cos + dy * sin) / projection.rxScale,
    y: (-dx * sin + dy * cos) / projection.ryScale
  };
};

const normalizedPoint = (point, center, radius, projection) => {
  const local = toEllipseSpace(point, center, projection);
  return { x: local.x / radius, y: local.y / radius };
};

for (const [point, center] of [
  [chain.rearTop, activeRear],
  [chain.rearBottom, activeRear],
  [chain.frontTop, activeFront],
  [chain.frontBottom, activeFront]
]) {
  const unit = normalizedPoint(point, center, center.r, geometry.projection);
  assert.ok(Math.abs(Math.hypot(unit.x, unit.y) - 1) < EPSILON);
}

const topRearUnit = normalizedPoint(chain.rearTop, activeRear, activeRear.r, geometry.projection);
const topLine = toEllipseSpace(chain.frontTop, chain.rearTop, geometry.projection);

assert.ok(Math.abs(topRearUnit.x * topLine.x + topRearUnit.y * topLine.y) < EPSILON);
assert.ok(chain.rearTop.y < activeRear.y);
assert.ok(chain.frontTop.y < activeFront.y);
assert.ok(chain.frontBottom.y > activeFront.y);
console.log('✓ Projected chain tangents');
