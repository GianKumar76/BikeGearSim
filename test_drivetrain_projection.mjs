import assert from 'node:assert/strict';
import {
  createChainPathGeometry,
  createDrivetrainGeometry
} from './src/render/drivetrain-projection.js';

const EPSILON = 1e-9;
const geometry = createDrivetrainGeometry({
  width: 1280,
  height: 190,
  scale: 1,
  cassette: [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30],
  chainrings: [34, 50]
});

assert.equal(geometry.projection.rxScale, 0.30);
assert.equal(geometry.projection.ryScale, 1);

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

const normalizedPoint = (point, center, radius, projection) => ({
  x: (point.x - center.x) / (radius * projection.rxScale),
  y: (point.y - center.y) / (radius * projection.ryScale)
});

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
const topLine = {
  x: (chain.frontTop.x - chain.rearTop.x) / geometry.projection.rxScale,
  y: (chain.frontTop.y - chain.rearTop.y) / geometry.projection.ryScale
};

assert.ok(Math.abs(topRearUnit.x * topLine.x + topRearUnit.y * topLine.y) < EPSILON);
assert.ok(chain.rearTop.y < activeRear.y);
assert.ok(chain.frontTop.y < activeFront.y);
assert.ok(chain.frontBottom.y > activeFront.y);
console.log('✓ Projected chain tangents');
