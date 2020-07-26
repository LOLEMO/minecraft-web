// Generated by CoffeeScript 2.5.1
  //Bundle.js
var AssetLoader, FPC, FirstPersonControls, InventoryBar, Terrain, TextureAtlasCreator, al, animate, camera, canvas, cursor, gameState, init, materials, parameters, render, renderer, scene, socket, stats, terrain,
  modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

import * as THREE from './module/build/three.module.js';

import {
  SkeletonUtils
} from './module/jsm/utils/SkeletonUtils.js';

import {
  FBXLoader
} from './module/jsm/loaders/FBXLoader.js';

import Stats from './module/jsm/libs/stats.module.js';

scene = null;

materials = null;

parameters = null;

canvas = null;

renderer = null;

camera = null;

gameState = null;

terrain = null;

cursor = null;

FPC = null;

socket = null;

stats = null;

Terrain = class Terrain {
  constructor(options) {
    this.cellSize = options.cellSize;
    this.cellsData = {};
    this.blocks = options.blocks;
    this.blocksMapping = options.blocksMapping;
    this.material = options.material;
    this.cells = {};
    this.models = {};
    this.camera = options.camera;
    this.scene = options.scene;
    this.toxelSize = 27;
    this.neighbours = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
  }

  computeVoxelOffset(voxelX, voxelY, voxelZ) {
    var x, y, z;
    x = modulo(voxelX, this.cellSize) | 0;
    y = modulo(voxelY, this.cellSize) | 0;
    z = modulo(voxelZ, this.cellSize) | 0;
    return [x, y, z];
  }

  computeCellForVoxel(voxelX, voxelY, voxelZ) {
    var cellX, cellY, cellZ;
    cellX = Math.floor(voxelX / this.cellSize);
    cellY = Math.floor(voxelY / this.cellSize);
    cellZ = Math.floor(voxelZ / this.cellSize);
    return [cellX, cellY, cellZ];
  }

  vec3(x, y, z) {
    if (typeof x === "string") {
      x = parseInt(x);
    }
    if (typeof y === "string") {
      y = parseInt(y);
    }
    if (typeof z === "string") {
      z = parseInt(z);
    }
    return `${x}:${y}:${z}`;
  }

  setVoxel(voxelX, voxelY, voxelZ, value) {
    var cell, cellId, l, len1, nei, neiCellId, prevVox, ref, voff;
    voff = this.computeVoxelOffset(voxelX, voxelY, voxelZ);
    cell = this.computeCellForVoxel(voxelX, voxelY, voxelZ);
    cellId = this.vec3(...cell);
    if (this.cellsData[cellId] === void 0) {
      this.cellsData[cellId] = {
        [this.vec3(...voff)]: value
      };
    } else {
      prevVox = this.cellsData[cellId][this.vec3(...voff)];
      if (prevVox !== value) {
        this.cellsData[cellId][this.vec3(...voff)] = value;
        this.cellsData[cellId].needsUpdate = true;
        ref = this.neighbours;
        for (l = 0, len1 = ref.length; l < len1; l++) {
          nei = ref[l];
          neiCellId = this.vec3(...this.computeCellForVoxel(voxelX + nei[0], voxelY + nei[1], voxelZ + nei[2]));
          try {
            this.cellsData[neiCellId].needsUpdate = true;
          } catch (error1) {}
        }
      }
    }
    this.cellsData[cellId].needsUpdate = true;
  }

  getVoxel(voxelX, voxelY, voxelZ) {
    var cell, cellId, voff, voxId, voxel;
    cell = this.computeCellForVoxel(voxelX, voxelY, voxelZ);
    cellId = this.vec3(...cell);
    voff = this.computeVoxelOffset(voxelX, voxelY, voxelZ);
    voxId = this.vec3(...voff);
    if (this.cellsData[cellId] !== void 0) {
      voxel = this.cellsData[cellId][voxId];
      if (voxel !== void 0) {
        return voxel;
      }
    }
    return 0;
  }

  updateCells() {
    var _this;
    _this = this;
    Object.keys(this.cellsData).forEach(function(id) {
      if (_this.cellsData[id].needsUpdate) {
        _this.updateCellMesh(...id.split(":"));
      }
    });
  }

  updateCellMesh(cellX, cellY, cellZ) {
    var cellId, geometry, mesh;
    console.warn(`Updating cell: ${cellX}:${cellY}:${cellZ}`);
    cellId = this.vec3(cellX, cellY, cellZ);
    if (this.cellsData[cellId].needsUpdate) {
      mesh = this.cells[cellId];
      geometry = this.generateCellGeometry(cellX, cellY, cellZ);
      if (mesh === void 0) {
        this.cells[cellId] = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.cells[cellId]);
      } else {
        this.cells[cellId].geometry = geometry;
      }
      this.cellsData[cellId].needsUpdate = false;
    }
  }

  generateCellGeometry(cellX, cellY, cellZ) {
    var _this, addFace, addGeo, cellGeometry, geo, i, j, k, l, n, normals, o, pos, positions, ref, ref1, ref2, uvs, voxel;
    positions = [];
    normals = [];
    uvs = [];
    _this = this;
    addFace = function(type, pos, voxel) {
      var faceVertex, l, len1, vertex;
      faceVertex = _this.genBlockFace(type, voxel);
      for (l = 0, len1 = faceVertex.length; l < len1; l++) {
        vertex = faceVertex[l];
        vertex.pos[0] += pos[0];
        vertex.pos[1] += pos[1];
        vertex.pos[2] += pos[2];
        positions.push(...vertex.pos);
        normals.push(...vertex.norm);
        uvs.push(...vertex.uv);
      }
    };
    addGeo = function(geo, pos) {
      var i, l, norm, posi, ref, uv;
      posi = geo.attributes.position.array;
      norm = geo.attributes.normal.array;
      uv = geo.attributes.uv.array;
      for (i = l = 0, ref = posi.length - 1; (0 <= ref ? l <= ref : l >= ref); i = 0 <= ref ? ++l : --l) {
        positions.push(posi[i] + pos[i % 3]);
      }
      normals.push(...norm);
      uvs.push(...uv);
    };
    for (i = l = 0, ref = this.cellSize - 1; (0 <= ref ? l <= ref : l >= ref); i = 0 <= ref ? ++l : --l) {
      for (j = n = 0, ref1 = this.cellSize - 1; (0 <= ref1 ? n <= ref1 : n >= ref1); j = 0 <= ref1 ? ++n : --n) {
        for (k = o = 0, ref2 = this.cellSize - 1; (0 <= ref2 ? o <= ref2 : o >= ref2); k = 0 <= ref2 ? ++o : --o) {
          pos = [cellX * this.cellSize + i, cellY * this.cellSize + j, cellZ * this.cellSize + k];
          voxel = this.getVoxel(...pos);
          if (voxel) {
            if (this.blocks[voxel].isBlock) {
              if (!this.blocks[this.getVoxel(pos[0] + 1, pos[1], pos[2])].isBlock) {
                addFace("nx", pos, voxel);
              }
              if (!this.blocks[this.getVoxel(pos[0] - 1, pos[1], pos[2])].isBlock) {
                addFace("px", pos, voxel);
              }
              if (!this.blocks[this.getVoxel(pos[0], pos[1] - 1, pos[2])].isBlock) {
                addFace("ny", pos, voxel);
              }
              if (!this.blocks[this.getVoxel(pos[0], pos[1] + 1, pos[2])].isBlock) {
                addFace("py", pos, voxel);
              }
              if (!this.blocks[this.getVoxel(pos[0], pos[1], pos[2] + 1)].isBlock) {
                addFace("pz", pos, voxel);
              }
              if (!this.blocks[this.getVoxel(pos[0], pos[1], pos[2] - 1)].isBlock) {
                addFace("nz", pos, voxel);
              }
            } else {
              geo = al.get(this.blocks[voxel].model).children[0].geometry.clone();
              if (this.blocks[voxel].model === "anvil") {
                geo.rotateX(-Math.PI / 2);
                geo.translate(0, 0.17, 0);
                geo.translate(0, -0.25, 0);
              }
              addGeo(geo, pos);
            }
          }
        }
      }
    }
    cellGeometry = new THREE.BufferGeometry();
    cellGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    cellGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    cellGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    return cellGeometry;
  }

  genBlockFace(type, voxel) {
    var blockName, error, q, toxX, toxY, uv, x1, x2, y1, y2;
    blockName = this.blocks[voxel]["faces"][type];
    try {
      toxX = this.blocksMapping[blockName]["x"] - 1;
      toxY = this.blocksMapping[blockName]["y"] - 1;
    } catch (error1) {
      error = error1;
      toxX = this.blocksMapping["debug"]["x"] - 1;
      toxY = 27 - this.blocksMapping["debug"]["y"];
    }
    q = 1 / this.toxelSize;
    x1 = q * toxX;
    y1 = 1 - q * toxY - q;
    x2 = x1 + q;
    y2 = y1 + q;
    uv = [[x1, y1], [x1, y2], [x2, y1], [x2, y2]];
    switch (type) {
      case "pz":
        return [
          {
            pos: [-0.5,
          -0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[0]
          },
          {
            pos: [0.5,
          -0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[1]
          },
          {
            pos: [0.5,
          -0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[2]
          },
          {
            pos: [0.5,
          0.5,
          0.5],
            norm: [0,
          0,
          1],
            uv: uv[3]
          }
        ];
      case "nx":
        return [
          {
            pos: [0.5,
          -0.5,
          0.5],
            norm: [1,
          0,
          0],
            uv: uv[0]
          },
          {
            pos: [0.5,
          -0.5,
          -0.5],
            norm: [1,
          0,
          0],
            uv: uv[2]
          },
          {
            pos: [0.5,
          0.5,
          0.5],
            norm: [1,
          0,
          0],
            uv: uv[1]
          },
          {
            pos: [0.5,
          0.5,
          0.5],
            norm: [1,
          0,
          0],
            uv: uv[1]
          },
          {
            pos: [0.5,
          -0.5,
          -0.5],
            norm: [1,
          0,
          0],
            uv: uv[2]
          },
          {
            pos: [0.5,
          0.5,
          -0.5],
            norm: [1,
          0,
          0],
            uv: uv[3]
          }
        ];
      case "nz":
        return [
          {
            pos: [0.5,
          -0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[0]
          },
          {
            pos: [-0.5,
          -0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[2]
          },
          {
            pos: [0.5,
          0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[1]
          },
          {
            pos: [0.5,
          0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          -0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          0.5,
          -0.5],
            norm: [0,
          0,
          -1],
            uv: uv[3]
          }
        ];
      case "px":
        return [
          {
            pos: [-0.5,
          -0.5,
          -0.5],
            norm: [-1,
          0,
          0],
            uv: uv[0]
          },
          {
            pos: [-0.5,
          -0.5,
          0.5],
            norm: [-1,
          0,
          0],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          0.5,
          -0.5],
            norm: [-1,
          0,
          0],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          0.5,
          -0.5],
            norm: [-1,
          0,
          0],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          -0.5,
          0.5],
            norm: [-1,
          0,
          0],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          0.5,
          0.5],
            norm: [-1,
          0,
          0],
            uv: uv[3]
          }
        ];
      case "py":
        return [
          {
            pos: [0.5,
          0.5,
          -0.5],
            norm: [0,
          1,
          0],
            uv: uv[0]
          },
          {
            pos: [-0.5,
          0.5,
          -0.5],
            norm: [0,
          1,
          0],
            uv: uv[2]
          },
          {
            pos: [0.5,
          0.5,
          0.5],
            norm: [0,
          1,
          0],
            uv: uv[1]
          },
          {
            pos: [0.5,
          0.5,
          0.5],
            norm: [0,
          1,
          0],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          0.5,
          -0.5],
            norm: [0,
          1,
          0],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          0.5,
          0.5],
            norm: [0,
          1,
          0],
            uv: uv[3]
          }
        ];
      case "ny":
        return [
          {
            pos: [0.5,
          -0.5,
          0.5],
            norm: [0,
          -1,
          0],
            uv: uv[0]
          },
          {
            pos: [-0.5,
          -0.5,
          0.5],
            norm: [0,
          -1,
          0],
            uv: uv[2]
          },
          {
            pos: [0.5,
          -0.5,
          -0.5],
            norm: [0,
          -1,
          0],
            uv: uv[1]
          },
          {
            pos: [0.5,
          -0.5,
          -0.5],
            norm: [0,
          -1,
          0],
            uv: uv[1]
          },
          {
            pos: [-0.5,
          -0.5,
          0.5],
            norm: [0,
          -1,
          0],
            uv: uv[2]
          },
          {
            pos: [-0.5,
          -0.5,
          -0.5],
            norm: [0,
          -1,
          0],
            uv: uv[3]
          }
        ];
    }
  }

  intersectsRay(start, end) {
    var dx, dy, dz, ix, iy, iz, len, lenSq, stepX, stepY, stepZ, steppedIndex, t, txDelta, txMax, tyDelta, tyMax, tzDelta, tzMax, voxel, xDist, yDist, zDist;
    start.x += 0.5;
    start.y += 0.5;
    start.z += 0.5;
    end.x += 0.5;
    end.y += 0.5;
    end.z += 0.5;
    dx = end.x - start.x;
    dy = end.y - start.y;
    dz = end.z - start.z;
    lenSq = dx * dx + dy * dy + dz * dz;
    len = Math.sqrt(lenSq);
    dx /= len;
    dy /= len;
    dz /= len;
    t = 0.0;
    ix = Math.floor(start.x);
    iy = Math.floor(start.y);
    iz = Math.floor(start.z);
    stepX = dx > 0 ? 1 : -1;
    stepY = dy > 0 ? 1 : -1;
    stepZ = dz > 0 ? 1 : -1;
    txDelta = Math.abs(1 / dx);
    tyDelta = Math.abs(1 / dy);
    tzDelta = Math.abs(1 / dz);
    xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix;
    yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy;
    zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz;
    txMax = txDelta < 2e308 ? txDelta * xDist : 2e308;
    tyMax = tyDelta < 2e308 ? tyDelta * yDist : 2e308;
    tzMax = tzDelta < 2e308 ? tzDelta * zDist : 2e308;
    steppedIndex = -1;
    while (t <= len) {
      voxel = this.getVoxel(ix, iy, iz);
      if (voxel) {
        return {
          position: [start.x + t * dx, start.y + t * dy, start.z + t * dz],
          normal: [steppedIndex === 0 ? -stepX : 0, steppedIndex === 1 ? -stepY : 0, steppedIndex === 2 ? -stepZ : 0],
          voxel
        };
      }
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }

  replaceWorld(voxels) {
    var _this;
    _this = this;
    return Object.keys(voxels).forEach(function(id) {
      if (voxels[id] !== _this.getVoxel(...id.split(":"))) {
        return _this.setVoxel(...id.split(":"), voxels[id]);
      }
    });
  }

  getRayBlock() {
    var end, intersection, posBreak, posPlace, start;
    start = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    end = new THREE.Vector3().set(0, 0, 1).unproject(this.camera);
    intersection = this.intersectsRay(start, end);
    if (intersection) {
      posPlace = intersection.position.map(function(v, ndx) {
        return v + intersection.normal[ndx] * 0.5;
      });
      posBreak = intersection.position.map(function(v, ndx) {
        return v + intersection.normal[ndx] * -0.5;
      });
      return {posPlace, posBreak};
    } else {
      return false;
    }
  }

};

AssetLoader = class AssetLoader {
  constructor(options) {
    this.assets = {};
  }

  load(assets, callback) {
    var _this, assetsLoaded, assetsNumber, fbxl, textureLoader;
    _this = this;
    textureLoader = new THREE.TextureLoader();
    fbxl = new FBXLoader();
    assetsNumber = 0;
    assetsLoaded = 0;
    Object.keys(assets).forEach(function(p) {
      return assetsNumber++;
    });
    Object.keys(assets).forEach(function(p) {
      var dynamic, img, path, type;
      type = assets[p].type;
      path = assets[p].path;
      dynamic = assets[p].dynamic;
      if (dynamic) {
        path += "?" + THREE.MathUtils.generateUUID();
      }
      if (type === "texture") {
        textureLoader.load(path, function(texture) {
          _this.assets[p] = texture;
          assetsLoaded++;
          if (assetsLoaded === assetsNumber) {
            return callback();
          }
        });
      }
      if (type === "text") {
        $.get(path, function(data) {
          _this.assets[p] = data;
          assetsLoaded++;
          if (assetsLoaded === assetsNumber) {
            return callback();
          }
        });
      }
      if (type === "image") {
        img = new Image();
        img.onload = function() {
          _this.assets[p] = img;
          assetsLoaded++;
          if (assetsLoaded === assetsNumber) {
            return callback();
          }
        };
        img.src = path;
      }
      if (type === "fbx") {
        return fbxl.load(path, function(fbx) {
          _this.assets[p] = fbx;
          assetsLoaded++;
          if (assetsLoaded === assetsNumber) {
            return callback();
          }
        });
      }
    });
    return this;
  }

  get(assetName) {
    return this.assets[assetName];
  }

};

FirstPersonControls = class FirstPersonControls {
  constructor(options) {
    this.kc = {
      "w": 87,
      "s": 83,
      "a": 65,
      "d": 68,
      "space": 32,
      "shift": 16
    };
    this.keys = {};
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.micromove = options.micromove;
  }

  ac(qx, qy, qa, qf) {
    var m_x, m_y, r_x, r_y;
    m_x = -Math.sin(qa) * qf;
    m_y = -Math.cos(qa) * qf;
    r_x = qx - m_x;
    r_y = qy - m_y;
    return {
      x: r_x,
      y: r_y
    };
  }

  camMicroMove() {
    if (this.keys[this.kc["w"]]) {
      this.camera.position.x = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y + THREE.MathUtils.degToRad(180), this.micromove).x;
      this.camera.position.z = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y + THREE.MathUtils.degToRad(180), this.micromove).y;
    }
    if (this.keys[this.kc["s"]]) {
      this.camera.position.x = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y, this.micromove).x;
      this.camera.position.z = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y, this.micromove).y;
    }
    if (this.keys[this.kc["a"]]) {
      this.camera.position.x = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y - THREE.MathUtils.degToRad(90), this.micromove).x;
      this.camera.position.z = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y - THREE.MathUtils.degToRad(90), this.micromove).y;
    }
    if (this.keys[this.kc["d"]]) {
      this.camera.position.x = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y + THREE.MathUtils.degToRad(90), this.micromove).x;
      this.camera.position.z = this.ac(this.camera.position.x, this.camera.position.z, this.camera.rotation.y + THREE.MathUtils.degToRad(90), this.micromove).y;
    }
    if (this.keys[this.kc["space"]]) {
      this.camera.position.y += this.micromove;
    }
    if (this.keys[this.kc["shift"]]) {
      return this.camera.position.y -= this.micromove;
    }
  }

  lockPointer() {
    this.canvas.requestPointerLock();
  }

  updatePosition(e) {
    FPC.camera.rotation.x -= THREE.MathUtils.degToRad(e.movementY / 10);
    FPC.camera.rotation.y -= THREE.MathUtils.degToRad(e.movementX / 10);
    if (THREE.MathUtils.radToDeg(FPC.camera.rotation.x < -90)) {
      FPC.camera.rotation.x = THREE.MathUtils.degToRad(-90);
    }
    if (THREE.MathUtils.radToDeg(FPC.camera.rotation.x > 90)) {
      FPC.camera.rotation.x = THREE.MathUtils.degToRad(90);
    }
  }

  lockChangeAlert() {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
      document.addEventListener("mousemove", FPC.updatePosition, false);
      $(".gameMenu").css("display", "none");
      gameState = "game";
    } else {
      document.removeEventListener("mousemove", FPC.updatePosition, false);
      $(".gameMenu").css("display", "block");
      gameState = "menu";
    }
  }

  listen() {
    var _this;
    _this = this;
    $(document).keydown(function(z) {
      _this.keys[z.keyCode] = true;
    });
    $(document).keyup(function(z) {
      delete _this.keys[z.keyCode];
    });
    $(".gameOn").click(function() {
      _this.lockPointer();
    });
    document.addEventListener('pointerlockchange', _this.lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', _this.lockChangeAlert, false);
    return this;
  }

};

InventoryBar = class InventoryBar {
  constructor(options) {
    this.boxSize = options.boxSize;
    this.div = options.div;
    this.padding = options.padding;
    this.boxes = options.boxes;
    this.activeBox = options.activeBox;
    this.setup();
  }

  setup() {
    var i, l, ref, result;
    result = "";
    for (i = l = 0, ref = this.boxes; (0 <= ref ? l <= ref : l >= ref); i = 0 <= ref ? ++l : --l) {
      result += `<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' width=${this.boxSize} height=${this.boxSize} class='inv_box_${i}' style='border:1px solid black' alt=''>`;
    }
    document.querySelector(this.div).style = `position:fixed;bottom:3px;left:50%;width:${(this.boxSize + 2) * this.boxes}px;margin-left:-${this.boxSize * this.boxes / 2}px;height:${this.boxSize}px;`;
    document.querySelector(this.div).innerHTML = result;
  }

  setBox(number, imageSrc) {
    if (imageSrc === null) {
      imageSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
    document.querySelector(`.inv_box_${number - 1}`).src = imageSrc;
  }

  setFocus(number, state) {
    if (state) {
      document.querySelector(`.inv_box_${number - 1}`).style.background = "rgba(0,0,0,0.7)";
      document.querySelector(`.inv_box_${number - 1}`).style.border = "1px solid black";
    } else {
      document.querySelector(`.inv_box_${number - 1}`).style.background = "rgba(54,54,54,0.5)";
      document.querySelector(`.inv_box_${number - 1}`).style.border = "1px solid #363636";
    }
  }

  setFocusOnly(number) {
    var i, l, ref;
    for (i = l = 1, ref = this.boxes; (1 <= ref ? l <= ref : l >= ref); i = 1 <= ref ? ++l : --l) {
      this.setFocus(i, i === number);
    }
    this.activeBox = number;
    return this;
  }

  moveBoxMinus() {
    if (this.activeBox + 1 > this.boxes) {
      this.setFocusOnly(1);
    } else {
      this.setFocusOnly(this.activeBox + 1);
    }
  }

  moveBoxPlus() {
    if (this.activeBox - 1 === 0) {
      return this.setFocusOnly(this.boxes);
    } else {
      return this.setFocusOnly(this.activeBox - 1);
    }
  }

  directBoxChange(event) {
    var code;
    code = event.keyCode;
    if (code >= 49 && code < 49 + this.boxes) {
      return this.setFocusOnly(code - 48);
    }
  }

  setBoxes(images) {
    var i, l, ref;
    for (i = l = 0, ref = images.length - 1; (0 <= ref ? l <= ref : l >= ref); i = 0 <= ref ? ++l : --l) {
      this.setBox(i + 1, images[i]);
    }
    return this;
  }

  listen() {
    var _this;
    _this = this;
    $(window).on('wheel', function(event) {
      if (event.originalEvent.deltaY < 0) {
        return _this.moveBoxPlus();
      } else {
        return _this.moveBoxMinus();
      }
    });
    $(document).keydown(function(z) {
      return _this.directBoxChange(z);
    });
    return this;
  }

};

TextureAtlasCreator = class TextureAtlasCreator {
  constructor(options) {
    this.textureX = options.textureX;
    this.textureMapping = options.textureMapping;
    this.size = 36;
    this.willSize = 27;
  }

  gen(tick) {
    var canvasx, ctx, i, lol, multi, texmap, toxelX, toxelY, xd;
    multi = {};
    for (i in this.textureMapping) {
      if (i.includes("@")) {
        xd = this.decodeName(i);
        if (multi[xd.pref] === void 0) {
          multi[xd.pref] = xd;
        } else {
          multi[xd.pref].x = Math.max(multi[xd.pref].x, xd.x);
          multi[xd.pref].y = Math.max(multi[xd.pref].y, xd.y);
        }
      }
    }
    canvasx = document.createElement('canvas');
    ctx = canvasx.getContext("2d");
    canvasx.width = this.willSize * 16;
    canvasx.height = this.willSize * 16;
    toxelX = 1;
    toxelY = 1;
    for (i in this.textureMapping) {
      if (i.includes("@")) {
        xd = this.decodeName(i);
        if (multi[xd.pref].loaded === void 0) {
          multi[xd.pref].loaded = true;
          lol = this.getToxelForTick(tick, multi[xd.pref].x + 1, multi[xd.pref].y + 1);
          texmap = this.textureMapping[`${xd.pref}@${lol.col}@${lol.row}`];
          ctx.drawImage(this.textureX, (texmap.x - 1) * 16, (texmap.y - 1) * 16, 16, 16, (toxelX - 1) * 16, (toxelY - 1) * 16, 16, 16);
          toxelX++;
          if (toxelX > this.willSize) {
            toxelX = 1;
            toxelY++;
          }
        }
      } else {
        ctx.drawImage(this.textureX, (this.textureMapping[i].x - 1) * 16, (this.textureMapping[i].y - 1) * 16, 16, 16, (toxelX - 1) * 16, (toxelY - 1) * 16, 16, 16);
        toxelX++;
        if (toxelX > this.willSize) {
          toxelX = 1;
          toxelY++;
        }
      }
    }
    return canvasx;
  }

  decodeName(i) {
    var j, l, m, m2, n, pref, ref, ref1, sub, x, y;
    m = null;
    for (j = l = 0, ref = i.length - 1; (0 <= ref ? l <= ref : l >= ref); j = 0 <= ref ? ++l : --l) {
      if (i[j] === "@") {
        m = j;
        break;
      }
    }
    pref = i.substr(0, m);
    sub = i.substr(m, i.length);
    m2 = null;
    for (j = n = 0, ref1 = sub.length - 1; (0 <= ref1 ? n <= ref1 : n >= ref1); j = 0 <= ref1 ? ++n : --n) {
      if (sub[j] === "@") {
        m2 = j;
      }
    }
    x = parseInt(sub.substr(1, m2 - 1));
    y = parseInt(sub.substr(m2 + 1, sub.length));
    return {pref, x, y};
  }

  getToxelForTick(tick, w, h) {
    var col, row;
    tick = tick % (w * h) + 1;
    //option1
    col = (tick - 1) % w;
    row = Math.ceil(tick / w) - 1;
    //option2
    col = Math.ceil(tick / h) - 1;
    row = (tick - 1) % h;
    return {row, col};
  }

};

init = function() {
  var ambientLight, atlasCreator, clouds, color, directionalLight, geometry, ghast, ghast2, i, inv_bar, l, mat, n, o, particles, playerObject, playersx, r, ref, ref1, savedTextures, size, sprite, sprite1, sprite2, sprite3, sprite4, sprite5, t, tekstura, texturex, texturex1, texturex2, tickq, vertices, worker, worldMaterial, x, y, z;
  //Terrain worker
  worker = new Worker("workers/terrain.js");
  worker.postMessage('hi');
  canvas = document.querySelector('#c');
  renderer = new THREE.WebGLRenderer({
    canvas,
    PixelRatio: window.devicePixelRatio
  });
  scene = new THREE.Scene();
  scene.background = new THREE.Color("lightblue");
  camera = new THREE.PerspectiveCamera(75, 2, 0.1, 64 * 5);
  camera.rotation.order = "YXZ";
  camera.position.set(26, 26, 26);
  //Lights
  ambientLight = new THREE.AmbientLight(0xcccccc);
  scene.add(ambientLight);
  directionalLight = new THREE.DirectionalLight(0x333333, 2);
  directionalLight.position.set(1, 1, 0.5).normalize();
  scene.add(directionalLight);
  gameState = "menu";
  //Snowflakes
  geometry = new THREE.BufferGeometry();
  vertices = [];
  materials = [];
  sprite1 = al.get("snowflake1");
  sprite2 = al.get("snowflake2");
  sprite3 = al.get("snowflake3");
  sprite4 = al.get("snowflake4");
  sprite5 = al.get("snowflake5");
  for (i = l = 0; l <= 1000; i = ++l) {
    x = Math.random() * 2000 - 1000;
    y = Math.random() * 2000 - 1000;
    z = Math.random() * 2000 - 1000;
    vertices.push(x, y, z);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  parameters = [[[1.0, 0.2, 0.5], sprite2, 20], [[0.95, 0.1, 0.5], sprite3, 15], [[0.90, 0.05, 0.5], sprite1, 10], [[0.85, 0, 0.5], sprite5, 8], [[0.80, 0, 0.5], sprite4, 5]];
  for (i = n = 0, ref = parameters.length - 1; (0 <= ref ? n <= ref : n >= ref); i = 0 <= ref ? ++n : --n) {
    color = parameters[i][0];
    sprite = parameters[i][1];
    size = parameters[i][2];
    materials[i] = new THREE.PointsMaterial({
      size: size,
      map: sprite,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });
    materials[i].color.setHSL(color[0], color[1], color[2]);
    particles = new THREE.Points(geometry, materials[i]);
    particles.rotation.x = Math.random() * 6;
    particles.rotation.y = Math.random() * 6;
    particles.rotation.z = Math.random() * 6;
    scene.add(particles);
  }
  for (i = o = 0, ref1 = materials.length - 1; (0 <= ref1 ? o <= ref1 : o >= ref1); i = 0 <= ref1 ? ++o : --o) {
    materials[i].map = parameters[i][1];
    materials[i].needsUpdate = true;
  }
  //Clouds
  clouds = al.get("clouds");
  clouds.scale.x = 0.1;
  clouds.scale.y = 0.1;
  clouds.scale.z = 0.1;
  clouds.position.y = 100;
  scene.add(clouds);
  //Ghast1
  ghast = al.get("ghastF");
  texturex1 = al.get("ghast");
  texturex1.magFilter = THREE.NearestFilter;
  ghast.children[1].material.map = texturex1;
  ghast.children[0].children[0].scale.set(0.01, 0.01, 0.01);
  ghast.children[1].material.color = new THREE.Color(0xffffff);
  mat = ghast.children[1].material.clone();
  scene.add(ghast);
  //Ghast2
  ghast2 = SkeletonUtils.clone(ghast);
  texturex2 = al.get("ghastS");
  texturex2.magFilter = THREE.NearestFilter;
  ghast2.children[1].material = mat;
  ghast2.children[1].material.map = texturex2;
  ghast2.position.set(3, 0, 0);
  scene.add(ghast2);
  //Player
  playerObject = al.get("player");
  texturex = al.get("steve");
  texturex.magFilter = THREE.NearestFilter;
  playerObject.children[1].scale.set(1, 1, 1);
  playerObject.children[1].position.set(25, 25, 25);
  playerObject.children[0].material.map = texturex;
  playerObject.children[0].material.color = new THREE.Color(0xffffff);
  playerObject.children[1].scale.set(0.5, 0.5, 0.5);
  //Animated Material
  worldMaterial = new THREE.MeshStandardMaterial({
    side: 0,
    map: null
  });
  atlasCreator = new TextureAtlasCreator({
    textureX: al.get("textureAtlasX"),
    textureMapping: al.get("textureMappingX")
  });
  savedTextures = [];
  for (i = r = 0; r <= 9; i = ++r) {
    t = atlasCreator.gen(i).toDataURL();
    tekstura = new THREE.TextureLoader().load(t);
    tekstura.magFilter = THREE.NearestFilter;
    savedTextures.push(tekstura);
  }
  tickq = 0;
  setInterval(function() {
    var tekst;
    tickq++;
    tekst = savedTextures[tickq % 9];
    worldMaterial.map = tekst;
    worldMaterial.map.needsUpdate = true;
  }, 100);
  //setup terrain
  terrain = new Terrain({
    cellSize: 16,
    blocks: al.get("blocks"),
    blocksMapping: al.get("textureMappingJson"),
    material: worldMaterial,
    scene,
    camera
  });
  //Socket.io setup
  socket = io.connect("http://localhost:35565");
  socket.on("connect", function() {
    console.log("Połączono z serverem!");
  });
  socket.on("blockUpdate", function(block) {
    terrain.setVoxel(...block);
  });
  //Socket.io players
  playersx = {};
  socket.on("playerUpdate", function(players) {
    var sockets;
    sockets = {};
    Object.keys(players).forEach(function(p) {
      sockets[p] = true;
      if (playersx[p] === void 0 && p !== socket.id) {
        playersx[p] = SkeletonUtils.clone(playerObject);
        scene.add(playersx[p]);
      }
      try {
        playersx[p].children[1].position.set(players[p].x, players[p].y - 0.5, players[p].z);
        playersx[p].children[1].children[0].children[0].children[0].children[2].rotation.x = players[p].xyaw;
        playersx[p].children[1].children[0].rotation.z = players[p].zyaw;
      } catch (error1) {}
    });
    Object.keys(playersx).forEach(function(p) {
      if (sockets[p] === void 0) {
        scene.remove(playersx[p]);
        delete playersx[p];
      }
    });
  });
  //Socket.io first world load
  socket.on("firstLoad", function(v) {
    console.log("Otrzymano pakiet świata!");
    terrain.replaceWorld(v);
    $(".initLoading").css("display", "none");
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
  });
  //Inventory Bar
  inv_bar = new InventoryBar({
    boxSize: 60,
    boxes: 9,
    padding: 4,
    div: ".inventoryBar",
    activeBox: 1
  }).setBoxes(["assets/images/grass_block.png", "assets/images/stone.png", "assets/images/oak_planks.png", "assets/images/smoker.gif", "assets/images/anvil.png", "assets/images/brick.png", "assets/images/furnace.png", "assets/images/bookshelf.png", "assets/images/tnt.png"]).setFocusOnly(1).listen();
  //First Person Controls
  FPC = new FirstPersonControls({
    canvas: document.querySelector("#c"),
    camera,
    micromove: 0.3
  }).listen();
  //Raycast cursor
  cursor = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 0.5
  }));
  scene.add(cursor);
  //jquery events
  $(document).mousedown(function(e) {
    var pos, rayBlock, voxelId;
    if (gameState === "game") {
      rayBlock = terrain.getRayBlock();
      if (rayBlock) {
        if (e.which === 1) {
          voxelId = 0;
          pos = rayBlock.posBreak;
        } else {
          voxelId = inv_bar.activeBox;
          pos = rayBlock.posPlace;
        }
        socket.emit("blockUpdate", [...pos, voxelId]);
      }
    }
  });
  animate();
};

render = function() {
  var color, h, height, i, l, n, object, pos, rayBlock, ref, ref1, time, width;
  time = Date.now() * 0.00005;
  for (i = l = 0, ref = scene.children.length - 1; (0 <= ref ? l <= ref : l >= ref); i = 0 <= ref ? ++l : --l) {
    object = scene.children[i];
    if (object instanceof THREE.Points) {
      object.rotation.y = time * (i < 4 ? i + 1 : -(i + 1));
    }
  }
  for (i = n = 0, ref1 = materials.length - 1; (0 <= ref1 ? n <= ref1 : n >= ref1); i = 0 <= ref1 ? ++n : --n) {
    color = parameters[i][0];
    h = (360 * (color[0] + time) % 360) / 360;
    materials[i].color.setHSL(h, color[1], color[2]);
  }
  //Resize canvas
  width = window.innerWidth;
  height = window.innerHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  if (gameState === "game") {
    socket.emit("playerUpdate", {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      xyaw: -camera.rotation.x,
      zyaw: camera.rotation.y + Math.PI
    });
    FPC.camMicroMove();
  }
  renderer.render(scene, camera);
  terrain.updateCells();
  //update cursor
  rayBlock = terrain.getRayBlock();
  if (rayBlock) {
    pos = rayBlock.posBreak;
    pos[0] = Math.floor(pos[0]);
    pos[1] = Math.floor(pos[1]);
    pos[2] = Math.floor(pos[2]);
    cursor.position.set(...pos);
    cursor.visible = true;
  } else {
    cursor.visible = false;
  }
};

animate = function() {
  try {
    stats.begin();
  } catch (error1) {}
  render();
  try {
    stats.end();
  } catch (error1) {}
  requestAnimationFrame(animate);
};

al = new AssetLoader();

$.get(`assets/assetLoader.json?${THREE.MathUtils.generateUUID()}`, function(assets) {
  al.load(assets, function() {
    console.log("AssetLoader: done loading!");
    init();
  }, al);
});