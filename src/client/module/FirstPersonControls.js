// Generated by CoffeeScript 2.5.1
var FirstPersonControls;

import * as THREE from './build/three.module.js';

FirstPersonControls = class FirstPersonControls {
  constructor(options) {
    this.kc = {
      87: "forward",
      65: "right",
      83: "back",
      68: "left",
      32: "jump",
      16: "sneak",
      82: "sprint"
    };
    this.keys = {};
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.socket = options.socket;
    this.gameState = "menu";
    this.listen();
    $(".com_i").blur();
    $(".com").hide();
  }

  updatePosition(e) {
    //Updatowanie kursora
    if (this.gameState === "gameLock") {
      this.camera.rotation.x -= THREE.MathUtils.degToRad(e.movementY / 10);
      this.camera.rotation.y -= THREE.MathUtils.degToRad(e.movementX / 10);
      if (THREE.MathUtils.radToDeg(this.camera.rotation.x) < -90) {
        this.camera.rotation.x = THREE.MathUtils.degToRad(-90);
      }
      if (THREE.MathUtils.radToDeg(this.camera.rotation.x) > 90) {
        this.camera.rotation.x = THREE.MathUtils.degToRad(90);
      }
      this.socket.emit("rotate", [this.camera.rotation.y, this.camera.rotation.x]);
    }
  }

  listen() {
    var _this, lockChangeAlert;
    _this = this;
    $(document).keydown(function(z) {
      //Kliknięcie
      _this.keys[z.keyCode] = true;
      //Klawisz Enter
      if (z.keyCode === 13 && _this.gameState === "chat") {
        _this.socket.emit("command", $(".com_i").val());
        $(".com_i").val("");
      }
      //Klawisz T lub /
      if ((z.keyCode === 84 || z.keyCode === 191) && _this.gameState === "gameLock") {
        if (z.keyCode === 191) {
          $(".com_i").val("/");
        }
        _this._Chat();
        z.preventDefault();
      }
      //Klawisz `
      if (z.keyCode === 192) {
        $(".com_i").blur();
        $(".com").hide();
        z.preventDefault();
        if ((_this.gameState === "menu") || (_this.gameState === "chat")) {
          _this._Game();
        } else {
          _this._Menu();
        }
      }
      if (z.keyCode === 27 && _this.gameState === "chat") {
        $(".com_i").blur();
        $(".com").hide();
        _this._Menu();
      }
      //Wysyłanie state'u do serwera
      if (_this.kc[z.keyCode] !== void 0 && _this.gameState === "gameLock") {
        _this.socket.emit("move", _this.kc[z.keyCode], true);
      }
    });
    $(document).keyup(function(z) {
      //Odkliknięcie
      delete _this.keys[z.keyCode];
      //Wysyłanie state'u do serwera
      if (_this.kc[z.keyCode] !== void 0) {
        _this.socket.emit("move", _this.kc[z.keyCode], false);
      }
    });
    $(".gameOn").click(function() {
      _this._Game();
    });
    lockChangeAlert = function() {
      if (document.pointerLockElement === _this.canvas || document.mozPointerLockElement === _this.canvas) {
        //Lock
        if (_this.gameState === "game") {
          $(".com_i").blur();
          $(".com").hide();
          _this.state("gameLock");
          $(".gameMenu").css("display", "none");
        }
      } else {
        //Unlock
        if ((_this.gameState === "menu") || (_this.gameState === "gameLock")) {
          $(".com_i").blur();
          $(".com").hide();
          _this._Menu();
        }
      }
    };
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    document.addEventListener("mousemove", function(e) {
      return _this.updatePosition(e);
    }, false);
    return this;
  }

  state(state) {
    this.gameState = state;
    if (this.gameState === "chat") {
      $(".chat").addClass("focus");
      $(".chat").removeClass("blur");
    } else {
      $(".chat").removeClass("focus");
      $(".chat").addClass("blur");
    }
    if (this.gameState !== "menu") {
      $(".winbl").removeClass("blur");
    }
    return console.log("Game state: " + state);
  }

  _Game() {
    this.state("game");
    return this.canvas.requestPointerLock();
  }

  _Menu() {
    this.state("menu");
    $(".winbl").addClass("blur");
    $(".gameMenu").css("display", "block");
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
    return document.exitPointerLock();
  }

  _Chat() {
    if (this.gameState === "gameLock") {
      this.state("chat");
      $(".gameMenu").css("display", "none");
      document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
      document.exitPointerLock();
      $(".com").show();
      return $(".com_i").focus();
    }
  }

};

export {
  FirstPersonControls
};
