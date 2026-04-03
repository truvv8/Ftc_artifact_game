import { useEffect, useMemo, useRef, useState } from "react";

const FIELD_SIZE = 360;
const TILE = 60;

const AUTO_SECONDS = 30;
const TRANSITION_SECONDS = 8;
const TELEOP_SECONDS = 120;
const MATCH_SECONDS = AUTO_SECONDS + TRANSITION_SECONDS + TELEOP_SECONDS;

const ROBOT_RADIUS = 3.6;
const ROBOT_SPEED = 27;
const SHOT_SPEED_MIN = 38;
const SHOT_SPEED_MAX = 118;
const SHOT_CHARGE_TIME = 1.15;
const BALL_RADIUS = 1.25;
const MAX_CONTROL = 3;
const MAX_SHOT_FX = 0.24;
const SHOOTER_COLLISION_GRACE = 0.12;

const OPPONENT = { blue: "red", red: "blue" };
const TEAM_META = {
  blue: { label: "Blue", fill: "#1d4ed8", stroke: "#60a5fa", goal: "blue" },
  red: { label: "Red", fill: "#b91c1c", stroke: "#f87171", goal: "red" },
};

const KEYMAP = {
  blue: {
    up: "KeyW",
    down: "KeyS",
    left: "KeyA",
    right: "KeyD",
    mode: "KeyQ",
    intake: "KeyF",
    shoot: ["KeyG"],
  },
  red: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    mode: "Enter",
    intake: "ShiftRight",
    shoot: ["Slash", "Numpad0"],
  },
};

const GATE_Y_MIN = pxToPct(TILE);
const GATE_Y_MAX = pxToPct(TILE * 3);

const ZONES = {
  blueGate: { xMin: 3.9, xMax: 8.4, yMin: GATE_Y_MIN, yMax: GATE_Y_MAX },
  redGate: { xMin: 91.6, xMax: 96.1, yMin: GATE_Y_MIN, yMax: GATE_Y_MAX },
  blueLoading: { xMin: 0.8, xMax: 16.0, yMin: 84.0, yMax: 100.0 },
  redLoading: { xMin: 84.0, xMax: 99.2, yMin: 84.0, yMax: 100.0 },
  blueBase: { xMin: 66.7, xMax: 79.2, yMin: 70.8, yMax: 83.3 },
  redBase: { xMin: 20.8, xMax: 33.3, yMin: 70.8, yMax: 83.3 },
  blueSecret: { xMin: 0.0, xMax: 17.0, yMin: 50.0, yMax: 84.0 },
  redSecret: { xMin: 83.0, xMax: 100.0, yMin: 50.0, yMax: 84.0 },
  blueResetLever: { xMin: 2.4, xMax: 8.9, yMin: 47.0, yMax: 53.3 },
  redResetLever: { xMin: 91.1, xMax: 97.6, yMin: 47.0, yMax: 53.3 },
};

const TOP_LAUNCH_TRI = [
  [0, 0],
  [100, 0],
  [50, 50],
];
const BOTTOM_LAUNCH_TRI = [
  [33.33, 100],
  [66.67, 100],
  [50, 83.33],
];
const BLUE_GOAL_TRI = [
  [0, 0],
  [16.67, 0],
  [0, 16.67],
];
const RED_GOAL_TRI = [
  [83.33, 0],
  [100, 0],
  [100, 16.67],
];

const MINOR_POINTS = 5;
const MAJOR_POINTS = 15;

function pxToPct(v) {
  return (v / FIELD_SIZE) * 100;
}

function pctToPx(v) {
  return (v / 100) * FIELD_SIZE;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.xMin &&
    point.x <= rect.xMax &&
    point.y >= rect.yMin &&
    point.y <= rect.yMax
  );
}

function isOnTeamSide(team, x) {
  return team === "blue" ? x < 50 : x >= 50;
}

function resetZoneForTeam(team) {
  return team === "blue" ? ZONES.blueResetLever : ZONES.redResetLever;
}

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function pointInTriangle(point, tri) {
  const [a, b, c] = tri;
  const d1 = sign(point.x, point.y, a[0], a[1], b[0], b[1]);
  const d2 = sign(point.x, point.y, b[0], b[1], c[0], c[1]);
  const d3 = sign(point.x, point.y, c[0], c[1], a[0], a[1]);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function isInLaunchZone(point) {
  // Check all 4 corners of the robot — if ANY corner touches the launch zone, it counts
  const r = ROBOT_RADIUS;
  const corners = [
    { x: point.x - r, y: point.y - r },
    { x: point.x + r, y: point.y - r },
    { x: point.x - r, y: point.y + r },
    { x: point.x + r, y: point.y + r },
    point, // also check center
  ];

  for (const c of corners) {
    if (pointInTriangle(c, TOP_LAUNCH_TRI) || pointInTriangle(c, BOTTOM_LAUNCH_TRI)) {
      return true;
    }

    const onLeftDepotLine =
      c.y >= 18.2 && c.y <= 19.8 && c.x >= 0.5 && c.x <= 18.9;
    const onRightDepotLine =
      c.y >= 18.2 && c.y <= 19.8 && c.x >= 81.1 && c.x <= 99.5;

    if (onLeftDepotLine || onRightDepotLine) {
      return true;
    }
  }

  return false;
}

function goalForPoint(point) {
  if (pointInTriangle(point, BLUE_GOAL_TRI)) {
    return "blue";
  }
  if (pointInTriangle(point, RED_GOAL_TRI)) {
    return "red";
  }
  return null;
}

function getPhase(elapsed) {
  if (elapsed < AUTO_SECONDS) {
    return "AUTO";
  }
  if (elapsed < AUTO_SECONDS + TRANSITION_SECONDS) {
    return "TRANSITION";
  }
  if (elapsed < MATCH_SECONDS) {
    return "TELEOP";
  }
  return "ENDED";
}

function formatClock(secondsLeft) {
  const safe = Math.max(0, secondsLeft);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function colorHex(code) {
  return code === "G" ? "#22c55e" : "#a855f7";
}

function makeRobot(team) {
  if (team === "blue") {
    return {
      team,
      x: 16,
      y: 87,
      vx: 0,
      vy: 0,
      faceX: 0,
      faceY: -1,
      cargo: [],
      shootMode: false,
      shotFx: 0,
      charging: false,
      chargeStart: 0,
      chargePower: 0,
      intake: false,
      nextShotAt: 0,
      nextIntakeAt: 0,
      disabled: false,
    };
  }
  return {
    team,
    x: 84,
    y: 87,
    vx: 0,
    vy: 0,
    faceX: 0,
    faceY: -1,
    cargo: [],
    shootMode: false,
    shotFx: 0,
    charging: false,
    chargeStart: 0,
    chargePower: 0,
    intake: false,
    nextShotAt: 0,
    nextIntakeAt: 0,
    disabled: false,
  };
}

function makeFoulStats() {
  return { minor: 0, major: 0, yellow: 0, red: 0, g408Violations: 0 };
}

function buildInitialBalls() {
  const balls = [];
  let id = 1;

  const spikes = [
    [TILE * 1, TILE * 2.5, "G", "P", "P"],
    [TILE * 5, TILE * 2.5, "P", "P", "G"],
    [TILE * 1, TILE * 3.5, "P", "G", "P"],
    [TILE * 5, TILE * 3.5, "P", "G", "P"],
    [TILE * 1, TILE * 4.5, "P", "P", "G"],
    [TILE * 5, TILE * 4.5, "G", "P", "P"],
  ];

  spikes.forEach(([cx, cy, c0, c1, c2]) => {
    const colors = [c0, c1, c2];
    colors.forEach((color, i) => {
      balls.push({
        id: `b${id++}`,
        color,
        x: pxToPct(cx - 12 + i * 12),
        y: pxToPct(cy),
      });
    });
  });

  const loadingRows = [
    [12, FIELD_SIZE - 35],
    [FIELD_SIZE - 26, FIELD_SIZE - 35],
  ];

  loadingRows.forEach(([sx, sy]) => {
    ["P", "G", "P"].forEach((color, i) => {
      balls.push({
        id: `b${id++}`,
        color,
        x: pxToPct(sx + i * 9),
        y: pxToPct(sy),
      });
    });
  });

  return balls;
}

function createGameState() {
  return {
    elapsed: 0,
    score: { blue: 0, red: 0 },
    fouls: { blue: makeFoulStats(), red: makeFoulStats() },
    robots: { blue: makeRobot("blue"), red: makeRobot("red") },
    balls: buildInitialBalls(),
    shots: [],
    events: [],
    nextId: 1,
  };
}

function resetArtifactsForSide(game, team, reason = "side lever reset") {
  const sideDefaults = buildInitialBalls().filter((ball) => isOnTeamSide(team, ball.x));
  game.balls = game.balls.filter((ball) => !isOnTeamSide(team, ball.x));
  sideDefaults.forEach((ball) => {
    game.balls.push({
      id: `b${game.nextId++}`,
      color: ball.color,
      x: ball.x,
      y: ball.y,
    });
  });

  game.shots = game.shots.filter((shot) => !isOnTeamSide(team, shot.x));

  const robot = game.robots[team];
  robot.cargo = [];
  robot.charging = false;
  robot.chargePower = 0;

  addEvent(game, team, `${reason}: ${TEAM_META[team].label} side artifacts reset`);
}

function createRuntimeState() {
  return {
    cooldowns: {
      blue: {},
      red: {},
    },
    modeLatch: {
      blue: false,
      red: false,
    },
    shootHeld: {
      blue: false,
      red: false,
    },
    pinTimers: {
      blue: { elapsed: 0, nextAt: 3 },
      red: { elapsed: 0, nextAt: 3 },
    },
  };
}

function cloneGame(prev) {
  return {
    elapsed: prev.elapsed,
    score: { ...prev.score },
    fouls: {
      blue: { ...prev.fouls.blue },
      red: { ...prev.fouls.red },
    },
    robots: {
      blue: { ...prev.robots.blue, cargo: [...prev.robots.blue.cargo] },
      red: { ...prev.robots.red, cargo: [...prev.robots.red.cargo] },
    },
    balls: prev.balls.map((b) => ({ ...b })),
    shots: prev.shots.map((s) => ({ ...s })),
    events: [...prev.events],
    nextId: prev.nextId,
  };
}

function addEvent(game, team, text) {
  const tag = team ? TEAM_META[team].label : "SYS";
  const line = `[${formatClock(Math.max(0, MATCH_SECONDS - game.elapsed))}] ${tag}: ${text}`;
  game.events = [{ id: `e${game.nextId++}`, text: line }, ...game.events].slice(0, 12);
}

function issueCard(game, team, cardType, ruleLabel) {
  if (!cardType) {
    return;
  }

  if (cardType === "yellow") {
    if (game.fouls[team].yellow >= 1) {
      game.fouls[team].red += 1;
      game.robots[team].disabled = true;
      addEvent(game, team, `${ruleLabel}: second yellow -> RED CARD, robot disabled`);
      return;
    }
    game.fouls[team].yellow += 1;
    addEvent(game, team, `${ruleLabel}: YELLOW CARD`);
    return;
  }

  game.fouls[team].red += 1;
  game.robots[team].disabled = true;
  addEvent(game, team, `${ruleLabel}: RED CARD, robot disabled`);
}

function awardFoul(game, team, severity, ruleLabel, message, count = 1, cardType = null) {
  if (severity === "minor") {
    game.fouls[team].minor += count;
    game.score[OPPONENT[team]] += MINOR_POINTS * count;
  } else {
    game.fouls[team].major += count;
    game.score[OPPONENT[team]] += MAJOR_POINTS * count;
  }

  const short = severity === "minor" ? "MINOR" : "MAJOR";
  const points = severity === "minor" ? MINOR_POINTS : MAJOR_POINTS;
  addEvent(
    game,
    team,
    `${ruleLabel}: ${short} x${count}, +${points * count} to ${TEAM_META[OPPONENT[team]].label} (${message})`,
  );

  issueCard(game, team, cardType, ruleLabel);
}

function canCall(runtime, team, key, now, cooldown) {
  const nextAllowed = runtime.cooldowns[team][key] ?? 0;
  if (now < nextAllowed) {
    return false;
  }
  runtime.cooldowns[team][key] = now + cooldown;
  return true;
}

function getIntent(keys, map) {
  const x = (keys[map.right] ? 1 : 0) - (keys[map.left] ? 1 : 0);
  const y = (keys[map.down] ? 1 : 0) - (keys[map.up] ? 1 : 0);
  const mag = Math.hypot(x, y);
  return {
    moveX: mag > 0 ? x / mag : 0,
    moveY: mag > 0 ? y / mag : 0,
    moveInput: mag > 0,
    modeToggle: Boolean(keys[map.mode]),
    intake: Boolean(keys[map.intake]),
    shoot: map.shoot.some((code) => keys[code]),
  };
}

function robotNearWall(robot) {
  return (
    robot.x <= ROBOT_RADIUS + 0.8 ||
    robot.x >= 100 - ROBOT_RADIUS - 0.8 ||
    robot.y <= ROBOT_RADIUS + 0.8 ||
    robot.y >= 100 - ROBOT_RADIUS - 0.8
  );
}

function inOpponentGateZone(team, point) {
  return team === "blue" ? pointInRect(point, ZONES.redGate) : pointInRect(point, ZONES.blueGate);
}

function inOpponentLoadingZone(team, point) {
  return team === "blue"
    ? pointInRect(point, ZONES.redLoading)
    : pointInRect(point, ZONES.blueLoading);
}

function inOpponentSecret(team, point) {
  return team === "blue" ? pointInRect(point, ZONES.redSecret) : pointInRect(point, ZONES.blueSecret);
}

function inOpponentBase(team, point) {
  return team === "blue" ? pointInRect(point, ZONES.redBase) : pointInRect(point, ZONES.blueBase);
}

function launchChargedShot(game, team, robot, phase, chargePower) {
  const color = robot.cargo.shift();
  const legalLaunch = isInLaunchZone(robot);
  if (!legalLaunch) {
    awardFoul(game, team, "minor", "G416", "launch outside launch zone");
  }

  const easedPower = chargePower * chargePower * 0.55 + chargePower * 0.45;
  const speed = SHOT_SPEED_MIN + (SHOT_SPEED_MAX - SHOT_SPEED_MIN) * easedPower;
  const muzzleDistance = ROBOT_RADIUS + BALL_RADIUS + 2.4;
  const shot = {
    id: `s${game.nextId++}`,
    x: clamp(robot.x + robot.faceX * muzzleDistance, BALL_RADIUS, 100 - BALL_RADIUS),
    y: clamp(robot.y + robot.faceY * muzzleDistance, BALL_RADIUS, 100 - BALL_RADIUS),
    vx: robot.faceX * speed,
    vy: robot.faceY * speed,
    color,
    shooter: team,
    illegalLaunch: !legalLaunch,
    launchedAfterEnd: phase === "ENDED",
    age: 0,
    power: chargePower,
    drag: 0.973 + chargePower * 0.013,
  };
  game.shots.push(shot);
  robot.shotFx = MAX_SHOT_FX;
  robot.nextShotAt = game.elapsed + 0.28;
  addEvent(game, team, `launch ${color} artifact (${Math.round(35 + chargePower * 65)}% power)`);
}

function applyRobotInput(game, runtime, team, intent, phase, dt) {
  const robot = game.robots[team];

  if (intent.modeToggle && !runtime.modeLatch[team]) {
    robot.shootMode = !robot.shootMode;
    addEvent(
      game,
      team,
      robot.shootMode
        ? "shoot mode ON (aim with movement keys)"
        : "shoot mode OFF (drive mode)",
    );
  }
  runtime.modeLatch[team] = intent.modeToggle;

  const driveMoving = !robot.shootMode && intent.moveInput;
  robot.intake = !robot.shootMode && intent.intake;
  const wasShootHeld = runtime.shootHeld[team];

  const hasPoweredAction = driveMoving || robot.intake || intent.shoot || robot.charging;
  if (phase === "TRANSITION" && hasPoweredAction && canCall(runtime, team, "g403", game.elapsed, 0.9)) {
    awardFoul(game, team, "major", "G403", "powered movement in AUTO-TELEOP transition");
  }

  if (phase === "ENDED" && hasPoweredAction && canCall(runtime, team, "g404_minor", game.elapsed, 1.0)) {
    awardFoul(game, team, "minor", "G404", "powered movement after TELEOP");
  }

  if (!robot.disabled && driveMoving) {
    robot.vx = intent.moveX * ROBOT_SPEED;
    robot.vy = intent.moveY * ROBOT_SPEED;
  } else {
    robot.vx = 0;
    robot.vy = 0;
  }

  robot.x = clamp(robot.x + robot.vx * dt, ROBOT_RADIUS, 100 - ROBOT_RADIUS);
  robot.y = clamp(robot.y + robot.vy * dt, ROBOT_RADIUS, 100 - ROBOT_RADIUS);

  if (intent.moveInput) {
    robot.faceX = intent.moveX;
    robot.faceY = intent.moveY;
  }

  if (
    robot.intake &&
    !robot.disabled &&
    pointInRect(robot, resetZoneForTeam(team)) &&
    canCall(runtime, team, "lever_reset", game.elapsed, 2.5)
  ) {
    resetArtifactsForSide(game, team, "lever pulled");
  }

  if (robot.disabled && robot.charging) {
    robot.charging = false;
    robot.chargePower = 0;
  }

  if (
    intent.shoot &&
    !wasShootHeld &&
    robot.cargo.length > 0 &&
    game.elapsed >= robot.nextShotAt &&
    !robot.disabled
  ) {
    robot.charging = true;
    robot.chargeStart = game.elapsed;
    robot.chargePower = 0;
  }
  if (
    intent.shoot &&
    !wasShootHeld &&
    robot.cargo.length === 0 &&
    canCall(runtime, team, "no_ammo", game.elapsed, 0.8)
  ) {
    addEvent(game, team, "no artifact loaded");
  }

  if (intent.shoot && robot.charging) {
    robot.chargePower = clamp((game.elapsed - robot.chargeStart) / SHOT_CHARGE_TIME, 0, 1);
  }

  if (!intent.shoot && wasShootHeld && robot.charging) {
    const power = clamp(robot.chargePower, 0, 1);
    launchChargedShot(game, team, robot, phase, power);
    robot.charging = false;
    robot.chargePower = 0;
  }
  runtime.shootHeld[team] = intent.shoot;

  if (
    inOpponentGateZone(team, robot) &&
    canCall(runtime, team, "g417", game.elapsed, 1.2)
  ) {
    awardFoul(game, team, "major", "G417", "contact with opponent gate");
  }

  if (
    phase === "ENDED" &&
    (pointInRect(robot, ZONES.blueGate) || pointInRect(robot, ZONES.redGate)) &&
    canCall(runtime, team, "g404_gate", game.elapsed, 1.0)
  ) {
    awardFoul(game, team, "major", "G404", "gate contact after TELEOP");
  }
}

function applyIntake(game, runtime, team) {
  const robot = game.robots[team];
  if (!robot.intake || robot.disabled || game.elapsed < robot.nextIntakeAt) {
    return;
  }

  let nearestIndex = -1;
  let bestDistance = Infinity;
  game.balls.forEach((ball, index) => {
    const d = distance(robot, ball);
    if (d < 6.3 && d < bestDistance) {
      bestDistance = d;
      nearestIndex = index;
    }
  });

  if (nearestIndex === -1) {
    return;
  }

  if (robot.cargo.length >= MAX_CONTROL) {
    if (canCall(runtime, team, "g408", game.elapsed, 0.7)) {
      awardFoul(game, team, "minor", "G408", "control above 3 artifacts");
      game.fouls[team].g408Violations += 1;
      if (game.fouls[team].g408Violations >= 3 && game.fouls[team].yellow === 0) {
        issueCard(game, team, "yellow", "G408");
      }
    }
    robot.nextIntakeAt = game.elapsed + 0.2;
    return;
  }

  const [picked] = game.balls.splice(nearestIndex, 1);
  robot.cargo.push(picked.color);
  robot.nextIntakeAt = game.elapsed + 0.2;
  addEvent(game, team, `intake ${picked.color} artifact (load ${robot.cargo.length}/3)`);
}

function settleShotAsBall(game, shot) {
  game.balls.push({
    id: `b${game.nextId++}`,
    color: shot.color,
    x: clamp(shot.x, BALL_RADIUS, 100 - BALL_RADIUS),
    y: clamp(shot.y, BALL_RADIUS, 100 - BALL_RADIUS),
  });
}

function resolveShotGoal(game, shot, phase) {
  const goal = goalForPoint(shot);
  if (!goal) {
    return false;
  }

  if (phase === "ENDED" || shot.launchedAfterEnd) {
    awardFoul(game, shot.shooter, "major", "G404", "artifact entered goal after TELEOP");
    return true;
  }

  if (goal !== TEAM_META[shot.shooter].goal) {
    awardFoul(game, shot.shooter, "major", "G419", "artifact entered opponent goal");
  } else {
    game.score[shot.shooter] += 3;
    addEvent(game, shot.shooter, `+3 scored in ${goal} goal`);
  }

  if (shot.illegalLaunch) {
    awardFoul(game, shot.shooter, "major", "G416", "illegal launch scored in goal");
  }

  return true;
}

function updateShots(game, phase, dt) {
  const blueRobot = game.robots.blue;
  const redRobot = game.robots.red;
  const remaining = [];

  game.shots.forEach((shot) => {
    shot.age += dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    const drag = shot.drag ?? 0.985;
    shot.vx *= Math.pow(drag, dt * 60);
    shot.vy *= Math.pow(drag, dt * 60);

    if (shot.x <= BALL_RADIUS || shot.x >= 100 - BALL_RADIUS) {
      shot.vx *= -0.6;
      shot.x = clamp(shot.x, BALL_RADIUS, 100 - BALL_RADIUS);
    }
    if (shot.y <= BALL_RADIUS || shot.y >= 100 - BALL_RADIUS) {
      shot.vy *= -0.6;
      shot.y = clamp(shot.y, BALL_RADIUS, 100 - BALL_RADIUS);
    }

    if (resolveShotGoal(game, shot, phase)) {
      return;
    }

    const blueProtected = shot.shooter === "blue" && shot.age < SHOOTER_COLLISION_GRACE;
    const redProtected = shot.shooter === "red" && shot.age < SHOOTER_COLLISION_GRACE;
    const hitBlue =
      !blueProtected && distance(shot, blueRobot) < ROBOT_RADIUS + BALL_RADIUS + 0.3;
    const hitRed =
      !redProtected && distance(shot, redRobot) < ROBOT_RADIUS + BALL_RADIUS + 0.3;
    if (hitBlue || hitRed) {
      settleShotAsBall(game, shot);
      return;
    }

    const speed = Math.hypot(shot.vx, shot.vy);
    if (speed < 5 || shot.age > 3.5) {
      settleShotAsBall(game, shot);
      return;
    }

    remaining.push(shot);
  });

  game.shots = remaining;
}

function resolveContactFouls(game, runtime, intents, dt) {
  const blue = game.robots.blue;
  const red = game.robots.red;
  const centerDistance = distance(blue, red);
  const minDistance = ROBOT_RADIUS * 2;

  const pinBlue = runtime.pinTimers.blue;
  const pinRed = runtime.pinTimers.red;

  if (centerDistance >= minDistance) {
    pinBlue.elapsed = 0;
    pinBlue.nextAt = 3;
    pinRed.elapsed = 0;
    pinRed.nextAt = 3;
    return;
  }

  const overlap = minDistance - centerDistance + 0.001;
  const dx = centerDistance > 0.0001 ? (blue.x - red.x) / centerDistance : 1;
  const dy = centerDistance > 0.0001 ? (blue.y - red.y) / centerDistance : 0;

  blue.x = clamp(blue.x + dx * (overlap / 2), ROBOT_RADIUS, 100 - ROBOT_RADIUS);
  blue.y = clamp(blue.y + dy * (overlap / 2), ROBOT_RADIUS, 100 - ROBOT_RADIUS);
  red.x = clamp(red.x - dx * (overlap / 2), ROBOT_RADIUS, 100 - ROBOT_RADIUS);
  red.y = clamp(red.y - dy * (overlap / 2), ROBOT_RADIUS, 100 - ROBOT_RADIUS);

  const phase = getPhase(game.elapsed);

  if (phase === "AUTO") {
    if (red.x < 50 && canCall(runtime, "red", "g402", game.elapsed, 1.2)) {
      awardFoul(game, "red", "major", "G402", "AUTO contact on opponent side");
    }
    if (blue.x > 50 && canCall(runtime, "blue", "g402", game.elapsed, 1.2)) {
      awardFoul(game, "blue", "major", "G402", "AUTO contact on opponent side");
    }
  }

  const blueSpeed = Math.hypot(blue.vx, blue.vy);
  const redSpeed = Math.hypot(red.vx, red.vy);
  const relative = Math.hypot(blue.vx - red.vx, blue.vy - red.vy);

  if (relative > 35) {
    const aggressor = blueSpeed >= redSpeed ? "blue" : "red";
    if (canCall(runtime, aggressor, "g421", game.elapsed, 2.2)) {
      const severe = relative > 42;
      awardFoul(
        game,
        aggressor,
        "major",
        "G421",
        severe ? "high-speed tip/entangle style hit" : "deliberate tipping contact",
        1,
        severe ? "red" : "yellow",
      );
    }
  } else if (relative > 28) {
    const aggressor = blueSpeed >= redSpeed ? "blue" : "red";
    if (canCall(runtime, aggressor, "g420", game.elapsed, 2.0)) {
      awardFoul(game, aggressor, "major", "G420", "aggressive functional-impairment contact", 1, "yellow");
    }
  }

  const remaining = Math.max(0, MATCH_SECONDS - game.elapsed);

  if (
    (inOpponentGateZone("blue", blue) || inOpponentGateZone("blue", red)) &&
    canCall(runtime, "blue", "g424", game.elapsed, 1.0)
  ) {
    awardFoul(game, "blue", "minor", "G424", "contact in opponent gate zone");
  }
  if (
    (inOpponentGateZone("red", red) || inOpponentGateZone("red", blue)) &&
    canCall(runtime, "red", "g424", game.elapsed, 1.0)
  ) {
    awardFoul(game, "red", "minor", "G424", "contact in opponent gate zone");
  }

  if (
    (inOpponentSecret("blue", blue) || inOpponentSecret("blue", red)) &&
    canCall(runtime, "blue", "g425", game.elapsed, 1.0)
  ) {
    awardFoul(game, "blue", "minor", "G425", "contact in opponent secret tunnel");
  }
  if (
    (inOpponentSecret("red", red) || inOpponentSecret("red", blue)) &&
    canCall(runtime, "red", "g425", game.elapsed, 1.0)
  ) {
    awardFoul(game, "red", "minor", "G425", "contact in opponent secret tunnel");
  }

  if (
    (inOpponentLoadingZone("blue", blue) || inOpponentLoadingZone("blue", red)) &&
    canCall(runtime, "blue", "g426", game.elapsed, 1.0)
  ) {
    awardFoul(game, "blue", "minor", "G426", "contact in opponent loading zone");
  }
  if (
    (inOpponentLoadingZone("red", red) || inOpponentLoadingZone("red", blue)) &&
    canCall(runtime, "red", "g426", game.elapsed, 1.0)
  ) {
    awardFoul(game, "red", "minor", "G426", "contact in opponent loading zone");
  }

  if (remaining <= 20) {
    if (
      (inOpponentBase("blue", blue) || inOpponentBase("blue", red)) &&
      canCall(runtime, "blue", "g427", game.elapsed, 1.2)
    ) {
      awardFoul(game, "blue", "major", "G427", "endgame contact in opponent base zone");
    }
    if (
      (inOpponentBase("red", red) || inOpponentBase("red", blue)) &&
      canCall(runtime, "red", "g427", game.elapsed, 1.2)
    ) {
      awardFoul(game, "red", "major", "G427", "endgame contact in opponent base zone");
    }
  }

  const blueNearWall = robotNearWall(blue);
  const redNearWall = robotNearWall(red);
  const blueTrying = !blue.shootMode && intents.blue.moveInput;
  const redTrying = !red.shootMode && intents.red.moveInput;

  if (redNearWall && !blueNearWall && redTrying) {
    pinBlue.elapsed += dt;
    while (pinBlue.elapsed >= pinBlue.nextAt) {
      awardFoul(game, "blue", "minor", "G422", "pinning beyond 3-second count");
      pinBlue.nextAt += 3;
    }
  } else {
    pinBlue.elapsed = 0;
    pinBlue.nextAt = 3;
  }

  if (blueNearWall && !redNearWall && blueTrying) {
    pinRed.elapsed += dt;
    while (pinRed.elapsed >= pinRed.nextAt) {
      awardFoul(game, "red", "minor", "G422", "pinning beyond 3-second count");
      pinRed.nextAt += 3;
    }
  } else {
    pinRed.elapsed = 0;
    pinRed.nextAt = 3;
  }
}

function decayRobotEffects(game, dt) {
  game.robots.blue.shotFx = Math.max(0, game.robots.blue.shotFx - dt);
  game.robots.red.shotFx = Math.max(0, game.robots.red.shotFx - dt);
}

function stepGame(prev, runtime, keys, dt) {
  const next = cloneGame(prev);
  next.elapsed += dt;
  const phase = getPhase(next.elapsed);

  const intents = {
    blue: getIntent(keys, KEYMAP.blue),
    red: getIntent(keys, KEYMAP.red),
  };

  applyRobotInput(next, runtime, "blue", intents.blue, phase, dt);
  applyRobotInput(next, runtime, "red", intents.red, phase, dt);
  decayRobotEffects(next, dt);

  resolveContactFouls(next, runtime, intents, dt);
  applyIntake(next, runtime, "blue");
  applyIntake(next, runtime, "red");
  updateShots(next, phase, dt);

  return next;
}

function DecodeField({ game }) {
  const blue = game.robots.blue;
  const red = game.robots.red;
  const px = (v) => pctToPx(v);

  return (
    <svg
      viewBox="-6 -20 372 440"
      style={{
        width: "100%",
        maxWidth: 520,
        display: "block",
        margin: "0 auto",
        borderRadius: 10,
        background: "#05060b",
      }}
    >
      <rect x={-5} y={-5} width={FIELD_SIZE + 10} height={FIELD_SIZE + 10} rx={3} fill="#0e0e11" />
      <rect x={0} y={0} width={FIELD_SIZE} height={FIELD_SIZE} fill="#6d7078" />

      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i + 1) * TILE}
          y1={0}
          x2={(i + 1) * TILE}
          y2={FIELD_SIZE}
          stroke="#d4880e"
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={(i + 1) * TILE}
          x2={FIELD_SIZE}
          y2={(i + 1) * TILE}
          stroke="#d4880e"
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}

      <rect x={0} y={0} width={FIELD_SIZE} height={FIELD_SIZE} fill="none" stroke="#d4880e" strokeWidth={3} />
      <line x1={0} y1={0} x2={0} y2={FIELD_SIZE} stroke="#1e40af" strokeWidth={5} />
      <line x1={FIELD_SIZE} y1={0} x2={FIELD_SIZE} y2={FIELD_SIZE} stroke="#991b1b" strokeWidth={5} />

      <polygon
        points={`0,0 ${FIELD_SIZE},0 ${FIELD_SIZE / 2},${TILE * 3}`}
        fill="#e0e0e008"
        stroke="#e0e0e0"
        strokeWidth={2.5}
        opacity={0.75}
      />
      <polygon
        points={`${TILE * 2},${FIELD_SIZE} ${TILE * 4},${FIELD_SIZE} ${FIELD_SIZE / 2},${FIELD_SIZE - TILE}`}
        fill="#e0e0e010"
        stroke="#e0e0e0"
        strokeWidth={2.5}
        opacity={0.75}
      />

      <line x1={2} y1={TILE + 8} x2={TILE + 8} y2={TILE + 8} stroke="#ccc" strokeWidth={1.6} opacity={0.4} />
      <line
        x1={FIELD_SIZE - TILE - 8}
        y1={TILE + 8}
        x2={FIELD_SIZE - 2}
        y2={TILE + 8}
        stroke="#ccc"
        strokeWidth={1.6}
        opacity={0.4}
      />

      <polygon points={`0,0 ${TILE},0 0,${TILE}`} fill="#1a3a78" />
      <polygon points={`2,2 ${TILE - 4},2 2,${TILE - 4}`} fill="#152d65" opacity={0.9} />
      <polygon points={`${FIELD_SIZE - TILE},0 ${FIELD_SIZE},0 ${FIELD_SIZE},${TILE}`} fill="#781a1a" />
      <polygon
        points={`${FIELD_SIZE - TILE + 4},2 ${FIELD_SIZE - 2},2 ${FIELD_SIZE - 2},${TILE - 4}`}
        fill="#651515"
        opacity={0.9}
      />

      <line x1={TILE / 3} y1={TILE} x2={TILE / 3} y2={TILE * 3} stroke="#333" strokeWidth={1.5} />
      <line x1={FIELD_SIZE - TILE / 3} y1={TILE} x2={FIELD_SIZE - TILE / 3} y2={TILE * 3} stroke="#333" strokeWidth={1.5} />
      <line x1={TILE / 3} y1={TILE * 3} x2={TILE / 3} y2={TILE * 5} stroke="#ee4444" strokeWidth={1.8} opacity={0.7} />
      <line
        x1={FIELD_SIZE - TILE / 3}
        y1={TILE * 3}
        x2={FIELD_SIZE - TILE / 3}
        y2={TILE * 5}
        stroke="#4488ff"
        strokeWidth={1.8}
        opacity={0.7}
      />

      <rect x={75} y={255} width={45} height={45} rx={1} fill="none" stroke="#cc3333" strokeWidth={2} opacity={0.6} />
      <rect x={240} y={255} width={45} height={45} rx={1} fill="none" stroke="#4488ff" strokeWidth={2} opacity={0.7} />

      <rect x={3} y={FIELD_SIZE - TILE + 3} width={TILE - 6} height={TILE - 6} rx={1} fill="none" stroke="#2540aa" strokeWidth={1.2} opacity={0.35} />
      <rect
        x={FIELD_SIZE - TILE + 3}
        y={FIELD_SIZE - TILE + 3}
        width={TILE - 6}
        height={TILE - 6}
        rx={1}
        fill="none"
        stroke="#aa2525"
        strokeWidth={1.2}
        opacity={0.35}
      />

      {[
        [TILE * 1, TILE * 2.5],
        [TILE * 5, TILE * 2.5],
        [TILE * 1, TILE * 3.5],
        [TILE * 5, TILE * 3.5],
        [TILE * 1, TILE * 4.5],
        [TILE * 5, TILE * 4.5],
      ].map(([x, y], i) => (
        <line key={`s${i}`} x1={x - 14} y1={y} x2={x + 14} y2={y} stroke="#ffffff20" strokeWidth={1} />
      ))}

      <polygon
        points={`${FIELD_SIZE / 2 - 10},-3 ${FIELD_SIZE / 2 + 10},-3 ${FIELD_SIZE / 2 + 4},-18 ${FIELD_SIZE / 2 - 4},-18`}
        fill="#3a3a40"
        stroke="#555"
        strokeWidth={0.8}
      />

      <text
        x={FIELD_SIZE / 2}
        y={FIELD_SIZE + 14}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={11}
        fontWeight={600}
        fontFamily="monospace"
      >
        Audience
      </text>

      <g fontFamily="monospace" fontSize={6} fontWeight={800} fill="#fff">
        <rect x={8} y={6} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8} />
        <text x={16} y={16} textAnchor="middle">
          20
        </text>
        <rect x={FIELD_SIZE - 24} y={6} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8} />
        <text x={FIELD_SIZE - 16} y={16} textAnchor="middle">
          24
        </text>
        <rect x={FIELD_SIZE / 2 - 8} y={-20} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8} />
        <text x={FIELD_SIZE / 2} y={-10} textAnchor="middle">
          21
        </text>
      </g>

      {[
        { team: "blue", zone: ZONES.blueResetLever, label: "BLUE RESET", color: "#60a5fa" },
        { team: "red", zone: ZONES.redResetLever, label: "RED RESET", color: "#f87171" },
      ].map((lever) => {
        const cx = (lever.zone.xMin + lever.zone.xMax) / 2;
        const cy = (lever.zone.yMin + lever.zone.yMax) / 2;
        return (
          <g key={lever.team}>
            <rect
              x={px(lever.zone.xMin)}
              y={px(lever.zone.yMin)}
              width={px(lever.zone.xMax - lever.zone.xMin)}
              height={px(lever.zone.yMax - lever.zone.yMin)}
              rx={4}
              fill="#f59e0b20"
              stroke={lever.color}
              strokeDasharray="4 3"
              strokeWidth={1.2}
              opacity={0.9}
            />
            <rect
              x={px(cx - 0.85)}
              y={px(cy - 0.2)}
              width={px(1.7)}
              height={px(2.1)}
              rx={2}
              fill="#334155"
              stroke="#cbd5e1"
              strokeWidth={0.8}
            />
            <line
              x1={px(cx)}
              y1={px(cy + 0.1)}
              x2={px(cx)}
              y2={px(cy - 2.0)}
              stroke="#fbbf24"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <circle cx={px(cx)} cy={px(cy - 2.15)} r={2.5} fill="#f59e0b" stroke="#fde68a" strokeWidth={1} />
            <text x={px(cx)} y={px(cy - 3.3)} textAnchor="middle" fill={lever.color} fontSize={5.5} fontFamily="monospace" fontWeight={800}>
              {lever.label}
            </text>
          </g>
        );
      })}

      {game.balls.map((ball) => (
        <circle
          key={ball.id}
          cx={px(ball.x)}
          cy={px(ball.y)}
          r={BALL_RADIUS * 3.6}
          fill={colorHex(ball.color)}
          stroke="#e2e8f0"
          strokeWidth={0.4}
        />
      ))}

      {game.shots.map((shot) => {
        const x = px(shot.x);
        const y = px(shot.y);
        const power = shot.power ?? 0;
        const speed = Math.hypot(shot.vx, shot.vy);
        const nx = speed > 0.001 ? shot.vx / speed : 0;
        const ny = speed > 0.001 ? shot.vy / speed : -1;
        const trailLength = 10 + power * 24;
        const tx = x - nx * trailLength;
        const ty = y - ny * trailLength;
        return (
          <g key={shot.id}>
            <line
              x1={tx}
              y1={ty}
              x2={x}
              y2={y}
              stroke="#fef08a"
              strokeWidth={1.8 + power * 2.2}
              strokeLinecap="round"
              opacity={0.78 + power * 0.2}
            />
            <circle
              cx={x}
              cy={y}
              r={BALL_RADIUS * (3.9 + power * 1.6)}
              fill={colorHex(shot.color)}
              stroke="#ffffff"
              strokeWidth={1.3}
              opacity={0.98}
            />
            <circle cx={x} cy={y} r={BALL_RADIUS * 2.1} fill="#ffffff99" />
          </g>
        );
      })}

      {[blue, red].map((robot) => {
        const meta = TEAM_META[robot.team];
        const x = px(robot.x);
        const y = px(robot.y);
        const fx = x + robot.faceX * 16;
        const fy = y + robot.faceY * 16;

        return (
          <g key={robot.team}>
            <rect
              x={x - 13}
              y={y - 13}
              width={26}
              height={26}
              rx={4}
              fill={robot.disabled ? "#444" : meta.fill}
              stroke={meta.stroke}
              strokeWidth={2}
              opacity={robot.disabled ? 0.5 : 1}
            />
            <line x1={x} y1={y} x2={fx} y2={fy} stroke="#f59e0b" strokeWidth={2.4} />
            <circle cx={fx} cy={fy} r={2} fill="#f59e0b" />
            {robot.shotFx > 0 && (
              <circle
                cx={fx}
                cy={fy}
                r={8 + (1 - robot.shotFx / MAX_SHOT_FX) * 8}
                fill="#fbbf2444"
                stroke="#fde68a"
                strokeWidth={1.4}
                opacity={robot.shotFx / MAX_SHOT_FX}
              />
            )}
            <text x={x} y={y - 17} textAnchor="middle" fill={meta.stroke} fontSize={7} fontFamily="monospace" fontWeight={700}>
              {meta.label.toUpperCase()}
            </text>
            {robot.shootMode && (
              <text x={x} y={y - 24} textAnchor="middle" fill="#fbbf24" fontSize={6.5} fontFamily="monospace" fontWeight={800}>
                AIM
              </text>
            )}
            <text x={x} y={y + 4} textAnchor="middle" fill="#fef3c7" fontSize={11} fontFamily="monospace" fontWeight={700}>
              {robot.cargo.length}
            </text>
            {robot.intake && (
              <circle
                cx={x}
                cy={y}
                r={18}
                fill="none"
                stroke={meta.stroke}
                strokeDasharray="3 2"
                strokeWidth={1}
                opacity={0.8}
              />
            )}
            {robot.shootMode && (
              <circle
                cx={x}
                cy={y}
                r={20}
                fill="none"
                stroke="#fbbf24"
                strokeDasharray="2 3"
                strokeWidth={1.1}
                opacity={0.9}
              />
            )}
            {robot.charging && (
              <>
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(2, 150 * robot.chargePower)} 200`}
                  transform={`rotate(-90 ${x} ${y})`}
                />
                <text x={x} y={y + 26} textAnchor="middle" fill="#fbbf24" fontSize={7} fontFamily="monospace" fontWeight={800}>
                  {`${Math.round(robot.chargePower * 100)}%`}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 110,
        padding: "10px 12px",
        borderRadius: 6,
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: accent || "var(--text)", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function TeamFoulCard({ team, score, fouls }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        padding: "10px 12px",
        borderRadius: 6,
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ color: TEAM_META[team].stroke, fontSize: 13, fontWeight: 700 }}>{TEAM_META[team].label}</span>
        <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--font-mono)" }}>{score}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
        <span>M:{fouls.minor}</span>
        <span>MJ:{fouls.major}</span>
        <span>Y:{fouls.yellow}</span>
        <span>R:{fouls.red}</span>
      </div>
    </div>
  );
}

export default function TwoPlayerMode() {
  const [game, setGame] = useState(() => createGameState());
  const [running, setRunning] = useState(false);

  const runtimeRef = useRef(createRuntimeState());
  const keysRef = useRef({});
  const rafRef = useRef(0);
  const prevTimeRef = useRef(0);

  useEffect(() => {
    const handled = new Set([
      ...Object.values(KEYMAP.blue).flat(),
      ...Object.values(KEYMAP.red).flat(),
    ]);

    const onDown = (event) => {
      if (handled.has(event.code)) {
        event.preventDefault();
        keysRef.current[event.code] = true;
      }
    };

    const onUp = (event) => {
      if (handled.has(event.code)) {
        event.preventDefault();
        keysRef.current[event.code] = false;
      }
    };

    window.addEventListener("keydown", onDown, { passive: false });
    window.addEventListener("keyup", onUp, { passive: false });
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      prevTimeRef.current = 0;
      return;
    }

    const frame = (now) => {
      if (!prevTimeRef.current) {
        prevTimeRef.current = now;
      }
      const dt = clamp((now - prevTimeRef.current) / 1000, 0, 0.05);
      prevTimeRef.current = now;
      setGame((prev) => stepGame(prev, runtimeRef.current, keysRef.current, dt));
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = 0;
    };
  }, [running]);

  const phase = getPhase(game.elapsed);
  const remaining = Math.max(0, MATCH_SECONDS - game.elapsed);
  const clock = formatClock(remaining);

  const totals = useMemo(() => {
    const penaltiesToBlue = game.fouls.red.minor * MINOR_POINTS + game.fouls.red.major * MAJOR_POINTS;
    const penaltiesToRed = game.fouls.blue.minor * MINOR_POINTS + game.fouls.blue.major * MAJOR_POINTS;
    return { penaltiesToBlue, penaltiesToRed };
  }, [game.fouls.blue.major, game.fouls.blue.minor, game.fouls.red.major, game.fouls.red.minor]);

  const reset = () => {
    runtimeRef.current = createRuntimeState();
    keysRef.current = {};
    setRunning(false);
    setGame(createGameState());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font)",
        padding: 14,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="Phase" value={phase} accent={phase === "ENDED" ? "var(--rose)" : "var(--accent-2)"} />
          <StatCard label="Match Clock" value={clock} accent="var(--amber)" />
          <StatCard label="Artifacts Left" value={game.balls.length + game.shots.length} accent="var(--teal)" />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setRunning((v) => !v)}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: running ? "1px solid var(--border)" : "1px solid var(--accent)",
                background: running ? "var(--panel)" : "var(--accent)",
                color: "#fff",
                fontFamily: "var(--font)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-raised)",
                color: "var(--text-2)",
                fontFamily: "var(--font)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Reset Match
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 560px) minmax(300px, 1fr)", gap: 14 }}>
          <DecodeField game={game} />

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <TeamFoulCard team="blue" score={game.score.blue} fouls={game.fouls.blue} />
              <TeamFoulCard team="red" score={game.score.red} fouls={game.fouls.red} />
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg-raised)",
                padding: "10px 12px",
                display: "grid",
                gap: 5,
                fontSize: 12,
                color: "var(--text-2)",
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--sky)", fontSize: 12 }}>Controls</div>
              <div>Blue: Q toggle AIM mode, WASD move/aim, F intake, hold G to charge then release to shoot</div>
              <div>Red: Enter toggle AIM mode, Arrows move/aim, Right Shift intake, hold / or Numpad 0 to charge then release</div>
              <div>Side reset: each team has its own lever near black line end; hold intake on your lever to reset only your side.</div>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>
                Implemented foul logic: G402, G403, G404, G408, G416, G417, G419, G420, G421, G422, G424, G425, G426, G427.
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg-raised)",
                padding: "10px 12px",
                fontSize: 12,
                color: "var(--text-2)",
                display: "grid",
                gap: 4,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: 12 }}>Penalty impact (manual Table 10-4)</div>
              <div>Blue gained from Red penalties: +{totals.penaltiesToBlue}</div>
              <div>Red gained from Blue penalties: +{totals.penaltiesToRed}</div>
              <div>Minor foul = +5 to opponent, Major foul = +15 to opponent.</div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg-raised)",
                padding: "10px 12px",
                minHeight: 160,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--accent-2)", fontSize: 12, marginBottom: 8 }}>Event feed</div>
              {game.events.length === 0 ? (
                <div style={{ color: "var(--dim)", fontSize: 12 }}>No events yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {game.events.map((event) => (
                    <div key={event.id} style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>
                      {event.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
