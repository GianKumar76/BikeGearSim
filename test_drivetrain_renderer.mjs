import assert from 'node:assert/strict';
import { Drivetrain } from './src/drivetrain.js';
import { DrivetrainRenderer } from './src/render/cassette.js';

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
assert.equal(projection.rxScale, 0.30);
assert.equal(calls.cassette[0].length, 11);
assert.equal(calls.chainrings[0].length, 2);
assert.ok(calls.chain[0].rearTop && calls.chain[0].frontTop);
assert.equal(calls.hud.length, 8);
console.log('✓ Drivetrain renderer consumes one projection');
