import assert from 'node:assert/strict';
import { Drivetrain } from './src/drivetrain.js';
import { DrivetrainRenderer } from './src/render/cassette.js';
import { createChainPathGeometry, createDrivetrainGeometry } from './src/render/drivetrain-projection.js';

const calls = {};
const renderer = Object.create(DrivetrainRenderer.prototype);
renderer.canvas = { getBoundingClientRect: () => ({ width: 1280, height: 190 }) };
renderer.ctx = { clearRect() {} };
renderer.chainOffset = 0;
renderer.crankAngle = 0;
renderer.cassetteAngle = 0;
renderer.pulleyAngle = 0;
renderer.drawPerspectiveFrame = (...args) => { calls.frame = args; };
renderer.draw3DCassette = (...args) => { calls.cassette = args; };
renderer.draw3DChainrings = (...args) => { calls.chainrings = args; };
renderer.draw3DChain = (...args) => { calls.chain = args; };
renderer.draw3DDerailleur = (...args) => { calls.derailleur = args; };
renderer.drawPerspectiveHUD = (...args) => { calls.hud = args; };

const drivetrain = new Drivetrain('compact', '11-30');
renderer.render(drivetrain.getState(), 90, 32, 1 / 60);

const projection = calls.cassette[3];
assert.strictEqual(calls.chainrings[3], projection);
assert.strictEqual(calls.chain[4], projection);
assert.strictEqual(calls.derailleur[2], projection);
assert.equal(projection.rxScale, 0.70);
assert.ok(
  projection.ellipseRotation < -0.015
    && projection.ellipseRotation > -0.08
);
assert.equal(calls.cassette[0].length, 11);
assert.equal(calls.chainrings[0].length, 2);
assert.ok(calls.chain[0].rearTop && calls.chain[0].frontTop);
assert.equal(calls.hud.length, 8);

const geometry = createDrivetrainGeometry({
  width: 1280,
  height: 190,
  scale: 1,
  cassette: drivetrain.cassette,
  chainrings: drivetrain.chainrings
});
const cassetteRotations = [];
const recordingContext = {
  save() {},
  restore() {},
  beginPath() {},
  closePath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  fill() {},
  ellipse() {},
  translate() {},
  rotate(angle) { cassetteRotations.push(angle); },
  fillText() {},
  createLinearGradient() { return { addColorStop() {} }; }
};
const cassetteRenderer = Object.create(DrivetrainRenderer.prototype);
cassetteRenderer.ctx = recordingContext;
assert.doesNotThrow(() => cassetteRenderer.draw3DCassette(
  geometry.sprockets,
  4,
  0,
  geometry.projection,
  1
));
assert.ok(cassetteRotations.every((angle) => angle === geometry.projection.ellipseRotation));
assert.ok(
  geometry.projection.ellipseRotation < -0.015
    && geometry.projection.ellipseRotation > -0.08
);
const chainPath = createChainPathGeometry({
  sprocket: geometry.sprockets[4],
  frontRing: geometry.frontRings[1],
  projection: geometry.projection,
  scale: 1
});
const ellipseRotations = [];
const chainRenderer = Object.create(DrivetrainRenderer.prototype);
chainRenderer.chainOffset = 0;
chainRenderer.ctx = {
  save() {},
  restore() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  setLineDash() {},
  ellipse(...args) { ellipseRotations.push(args[4]); }
};
chainRenderer.draw3DChain(
  chainPath,
  geometry.sprockets[4],
  geometry.frontRings[1],
  { level: 'optimal' },
  geometry.projection,
  1
);
assert.deepEqual(ellipseRotations, [
  geometry.projection.ellipseRotation,
  geometry.projection.ellipseRotation
]);
console.log('✓ Drivetrain renderer consumes one projection');
