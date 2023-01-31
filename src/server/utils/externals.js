import {
  registerSharedExternal,
  loadSharedExternal,
  getExternal,
} from 'holocron/server';

global.loadSharedExternal = loadSharedExternal;

global.registerSharedExternal = registerSharedExternal;

global.getExternal = getExternal;

loadSharedExternal('is-even', 'http://localhost:5001/is-even.node.js');
loadSharedExternal('semver', 'http://localhost:5001/semver.node.js');
