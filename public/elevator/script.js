/**
 * Elevator Parking Simulator
 * Compare idle-car parking strategies under different traffic peaks.
 */

const LOBBY = 1;

let floors = 20;
let elevatorCount = 4;
let capacity = 8;
let arrivalRate = 0.15;
let peakMode = 'mixed';
let parkingStrategy = 'stay';
let targetPassengers = 80;
let tickDelay = 100;

let tickCount = 0;
let elevators = [];
let waiting = []; // passengers waiting in halls
let completedWaits = [];
let completedRides = [];
let emptyTravel = 0;
let completedCount = 0;
let callHeat = {}; // floor -> recent call weight
let isRunning = false;
let intervalId = null;
let nextPassengerId = 1;

const buildingEl = document.getElementById('building');

class Passenger {
    constructor(origin, dest) {
        this.id = nextPassengerId++;
        this.origin = origin;
        this.dest = dest;
        this.dir = dest > origin ? 1 : -1;
        this.arriveTick = tickCount;
        this.boardTick = null;
        this.state = 'WAITING'; // WAITING | RIDING | DONE
    }
}

class Elevator {
    constructor(id, homeFloor) {
        this.id = id;
        this.floor = LOBBY;
        this.homeFloor = homeFloor;
        this.dir = 0; // -1, 0, 1
        this.passengers = [];
        this.targets = new Set(); // floors to visit (car calls + assigned halls)
        this.assigned = []; // waiting passengers assigned to this car
        this.doorTicks = 0;
        this.state = 'IDLE'; // IDLE | MOVING | DOORS | PARKING
        this.parkingTarget = null;
    }

    load() {
        return this.passengers.length;
    }

    isEmpty() {
        return this.passengers.length === 0 && this.assigned.length === 0 && this.targets.size === 0;
    }
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

function pickDest(origin) {
    let dest = origin;
    const lunchFloor = Math.max(2, Math.round(floors / 2));

    for (let tries = 0; tries < 20 && dest === origin; tries++) {
        if (peakMode === 'up') {
            // mostly lobby -> upper
            if (origin === LOBBY || Math.random() < 0.85) {
                dest = origin === LOBBY ? randInt(2, floors) : LOBBY;
            } else {
                dest = randInt(1, floors);
            }
            if (origin !== LOBBY && Math.random() < 0.7) dest = LOBBY;
            if (origin === LOBBY) dest = randInt(2, floors);
        } else if (peakMode === 'down') {
            if (origin !== LOBBY && Math.random() < 0.85) {
                dest = LOBBY;
            } else if (origin === LOBBY) {
                dest = randInt(2, floors);
            } else {
                dest = randInt(1, floors);
            }
        } else if (peakMode === 'lunch') {
            const r = Math.random();
            if (r < 0.4) {
                dest = origin === lunchFloor ? (Math.random() < 0.5 ? LOBBY : randInt(2, floors)) : lunchFloor;
            } else if (r < 0.7) {
                dest = origin === LOBBY ? lunchFloor : LOBBY;
            } else {
                dest = randInt(1, floors);
            }
        } else {
            dest = randInt(1, floors);
        }
    }
    if (dest === origin) {
        dest = origin === floors ? origin - 1 : origin + 1;
    }
    return dest;
}

function spawnPassenger() {
    let origin;
    if (peakMode === 'up') {
        origin = Math.random() < 0.8 ? LOBBY : randInt(2, floors);
    } else if (peakMode === 'down') {
        origin = Math.random() < 0.8 ? randInt(2, floors) : LOBBY;
    } else if (peakMode === 'lunch') {
        const lunchFloor = Math.max(2, Math.round(floors / 2));
        const r = Math.random();
        origin = r < 0.35 ? LOBBY : r < 0.7 ? lunchFloor : randInt(1, floors);
    } else {
        origin = randInt(1, floors);
    }
    const dest = pickDest(origin);
    const p = new Passenger(origin, dest);
    waiting.push(p);
    callHeat[origin] = (callHeat[origin] || 0) + 3;
}

function decayHeat() {
    for (const f of Object.keys(callHeat)) {
        callHeat[f] = Math.max(0, callHeat[f] * 0.97 - 0.02);
        if (callHeat[f] < 0.05) delete callHeat[f];
    }
}

function homeFloorFor(index) {
    if (elevatorCount === 1) return Math.round(floors / 2);
    const span = floors - 1;
    return clamp(1 + Math.round((index / (elevatorCount - 1)) * span), 1, floors);
}

function parkingFloorFor(elev) {
    switch (parkingStrategy) {
        case 'lobby':
            return LOBBY;
        case 'mid':
            return Math.max(1, Math.round(floors / 2));
        case 'spread':
            return elev.homeFloor;
        case 'demand': {
            let best = elev.homeFloor;
            let bestScore = -1;
            for (let f = 1; f <= floors; f++) {
                const heat = callHeat[f] || 0;
                // prefer hot floors that aren't already covered by another idle/parking car nearby
                let coverage = 0;
                for (const other of elevators) {
                    if (other.id === elev.id) continue;
                    if (other.state === 'IDLE' || other.state === 'PARKING') {
                        const t = other.state === 'PARKING' ? other.parkingTarget : other.floor;
                        coverage += 1 / (1 + Math.abs(t - f));
                    }
                }
                const score = heat * 2 - coverage + (1 / (1 + Math.abs(f - elev.floor))) * 0.1;
                if (score > bestScore) {
                    bestScore = score;
                    best = f;
                }
            }
            // if no heat yet, fall back to spread
            if (bestScore <= 0) return elev.homeFloor;
            return best;
        }
        case 'stay':
        default:
            return elev.floor;
    }
}

function unassignedWaiting() {
    const assignedIds = new Set();
    for (const e of elevators) {
        for (const p of e.assigned) assignedIds.add(p.id);
    }
    return waiting.filter(p => p.state === 'WAITING' && !assignedIds.has(p.id));
}

function costToServe(elev, passenger) {
    // Approximate: distance + capacity/load + direction mismatch
    const dist = Math.abs(elev.floor - passenger.origin);
    const loadPenalty = elev.load() * 2;
    const doorPenalty = elev.doorTicks > 0 ? 1 : 0;
    let dirPenalty = 0;
    if (elev.dir !== 0 && elev.passengers.length > 0) {
        // prefer continuing same direction if passenger aligns
        const goingThatWay =
            (elev.dir === 1 && passenger.origin >= elev.floor) ||
            (elev.dir === -1 && passenger.origin <= elev.floor);
        if (!goingThatWay) dirPenalty = 8;
        else if (passenger.dir !== elev.dir) dirPenalty = 3;
    }
    if (elev.load() >= capacity) return Infinity;
    // parking cars are freer
    const busyPenalty = elev.state === 'PARKING' || elev.state === 'IDLE' ? 0 : 2;
    return dist + loadPenalty + doorPenalty + dirPenalty + busyPenalty;
}

function assignCalls() {
    const pool = unassignedWaiting();
    // nearest-car with capacity, one assignment pass per tick (stable)
    pool.sort((a, b) => a.arriveTick - b.arriveTick);

    for (const p of pool) {
        let best = null;
        let bestCost = Infinity;
        for (const e of elevators) {
            const futureLoad = e.passengers.length + e.assigned.length;
            if (futureLoad >= capacity) continue;
            const c = costToServe(e, p);
            if (c < bestCost) {
                bestCost = c;
                best = e;
            }
        }
        if (best) {
            best.assigned.push(p);
            best.targets.add(p.origin);
            if (best.state === 'PARKING') {
                best.parkingTarget = null;
                best.state = 'MOVING';
            }
            if (best.state === 'IDLE') best.state = 'MOVING';
        }
    }
}

function nextTarget(elev) {
    if (elev.targets.size === 0) return null;
    const list = [...elev.targets];

    // continue in direction when possible
    if (elev.dir === 1) {
        const ahead = list.filter(f => f >= elev.floor).sort((a, b) => a - b);
        if (ahead.length) return ahead[0];
        return list.sort((a, b) => b - a)[0];
    }
    if (elev.dir === -1) {
        const ahead = list.filter(f => f <= elev.floor).sort((a, b) => b - a);
        if (ahead.length) return ahead[0];
        return list.sort((a, b) => a - b)[0];
    }
    // pick nearest
    list.sort((a, b) => Math.abs(a - elev.floor) - Math.abs(b - elev.floor));
    return list[0];
}

function openDoors(elev) {
    elev.doorTicks = 2; // dwell
    elev.state = 'DOORS';
    elev.targets.delete(elev.floor);

    // alight
    const staying = [];
    for (const p of elev.passengers) {
        if (p.dest === elev.floor) {
            p.state = 'DONE';
            completedCount++;
            completedRides.push(tickCount - p.boardTick);
            completedWaits.push(p.boardTick - p.arriveTick);
        } else {
            staying.push(p);
        }
    }
    elev.passengers = staying;

    // board assigned (and opportunistic same-dir waiters if space)
    const canBoard = [];
    elev.assigned = elev.assigned.filter(p => {
        if (p.origin === elev.floor && p.state === 'WAITING') {
            canBoard.push(p);
            return false;
        }
        return true;
    });

    // also pick up unassigned at this floor if space and direction ok
    for (const p of unassignedWaiting()) {
        if (p.origin !== elev.floor) continue;
        if (elev.passengers.length + canBoard.length >= capacity) break;
        let ok = true;
        if (elev.passengers.length > 0 && elev.dir !== 0 && p.dir !== elev.dir) {
            // allow if car has no committed opposite direction yet
            ok = false;
        }
        if (ok) {
            canBoard.push(p);
            // remove from others' assigned if any — shouldn't be
        }
    }

    for (const p of canBoard) {
        if (elev.passengers.length >= capacity) {
            // put back as waiting assignment
            elev.assigned.push(p);
            elev.targets.add(p.origin);
            continue;
        }
        // remove from global waiting
        waiting = waiting.filter(w => w.id !== p.id);
        p.state = 'RIDING';
        p.boardTick = tickCount;
        elev.passengers.push(p);
        elev.targets.add(p.dest);
    }

    // update direction hint from remaining passengers
    if (elev.passengers.length) {
        const up = elev.passengers.filter(p => p.dest > elev.floor).length;
        const down = elev.passengers.filter(p => p.dest < elev.floor).length;
        elev.dir = up >= down ? 1 : -1;
    }
}

function stepElevator(elev) {
    if (elev.doorTicks > 0) {
        elev.doorTicks--;
        if (elev.doorTicks === 0) {
            if (elev.targets.size > 0 || elev.assigned.length > 0) {
                elev.state = 'MOVING';
            } else if (elev.passengers.length === 0) {
                // go park
                const park = parkingFloorFor(elev);
                if (park !== elev.floor && parkingStrategy !== 'stay') {
                    elev.parkingTarget = park;
                    elev.state = 'PARKING';
                    elev.dir = park > elev.floor ? 1 : -1;
                } else {
                    elev.state = 'IDLE';
                    elev.dir = 0;
                    elev.parkingTarget = null;
                }
            } else {
                elev.state = 'MOVING';
            }
        }
        return;
    }

    // stop if we should serve this floor
    const shouldStop =
        elev.passengers.some(p => p.dest === elev.floor) ||
        elev.assigned.some(p => p.origin === elev.floor) ||
        (elev.targets.has(elev.floor) && (
            elev.passengers.some(p => p.dest === elev.floor) ||
            waiting.some(p => p.origin === elev.floor && p.state === 'WAITING')
        ));

    if (shouldStop && elev.state !== 'PARKING') {
        openDoors(elev);
        return;
    }

    if (elev.state === 'PARKING') {
        if (elev.parkingTarget == null) {
            elev.state = 'IDLE';
            elev.dir = 0;
            return;
        }
        // if a call got assigned, abandon parking
        if (elev.assigned.length || elev.targets.size) {
            elev.parkingTarget = null;
            elev.state = 'MOVING';
        } else if (elev.floor === elev.parkingTarget) {
            elev.state = 'IDLE';
            elev.dir = 0;
            elev.parkingTarget = null;
            return;
        } else {
            const next = elev.floor + (elev.parkingTarget > elev.floor ? 1 : -1);
            elev.floor = next;
            emptyTravel++;
            return;
        }
    }

    if (elev.state === 'IDLE') {
        // maybe start parking if strategy wants a different floor
        const park = parkingFloorFor(elev);
        if (park !== elev.floor && parkingStrategy !== 'stay') {
            elev.parkingTarget = park;
            elev.state = 'PARKING';
            elev.dir = park > elev.floor ? 1 : -1;
        }
        return;
    }

    // MOVING
    const target = nextTarget(elev);
    if (target == null) {
        if (elev.passengers.length === 0) {
            elev.state = 'IDLE';
            elev.dir = 0;
        }
        return;
    }

    if (target === elev.floor) {
        openDoors(elev);
        return;
    }

    elev.dir = target > elev.floor ? 1 : -1;
    elev.floor += elev.dir;
    if (elev.passengers.length === 0) emptyTravel++;

    // after move, check stop
    const stopNow =
        elev.passengers.some(p => p.dest === elev.floor) ||
        elev.assigned.some(p => p.origin === elev.floor);
    if (stopNow) {
        openDoors(elev);
    }
}

function gameLoop() {
    tickCount++;

    if (Math.random() < arrivalRate) {
        spawnPassenger();
    }

    decayHeat();
    assignCalls();

    for (const elev of elevators) {
        stepElevator(elev);
    }

    // keep waiting list clean of boarded
    waiting = waiting.filter(p => p.state === 'WAITING');

    render();
    updateDashboard();

    if (completedCount >= targetPassengers) {
        stopSim();
    }
}

function buildElevators() {
    elevators = [];
    for (let i = 0; i < elevatorCount; i++) {
        elevators.push(new Elevator(i, homeFloorFor(i)));
    }
}

function initBuildingDOM() {
    buildingEl.style.setProperty('--shaft-count', elevatorCount);
    buildingEl.innerHTML = '';

    // headers
    const corner = document.createElement('div');
    corner.className = 'corner-header';
    corner.textContent = 'Fl';
    buildingEl.appendChild(corner);

    for (let i = 0; i < elevatorCount; i++) {
        const h = document.createElement('div');
        h.className = 'shaft-header';
        h.textContent = `E${i + 1}`;
        buildingEl.appendChild(h);
    }

    const hallH = document.createElement('div');
    hallH.className = 'hall-header';
    hallH.textContent = 'Hall';
    buildingEl.appendChild(hallH);

    // floors top -> bottom (highest first)
    for (let f = floors; f >= 1; f--) {
        const label = document.createElement('div');
        label.className = 'floor-label' + (f === LOBBY ? ' lobby' : '');
        label.textContent = f === LOBBY ? 'L1' : String(f);
        label.dataset.floor = f;
        buildingEl.appendChild(label);

        for (let i = 0; i < elevatorCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'shaft-cell';
            cell.dataset.floor = f;
            cell.dataset.shaft = i;
            buildingEl.appendChild(cell);
        }

        const hall = document.createElement('div');
        hall.className = 'hall-cell';
        hall.dataset.floor = f;
        buildingEl.appendChild(hall);
    }
}

function render() {
    // clear cars and hall pax
    buildingEl.querySelectorAll('.elevator-car').forEach(el => el.remove());
    buildingEl.querySelectorAll('.shaft-cell').forEach(el => el.classList.remove('has-car'));
    buildingEl.querySelectorAll('.hall-cell').forEach(el => { el.innerHTML = ''; });

    for (const elev of elevators) {
        const cell = buildingEl.querySelector(`.shaft-cell[data-floor="${elev.floor}"][data-shaft="${elev.id}"]`);
        if (!cell) continue;
        cell.classList.add('has-car');
        const car = document.createElement('div');
        let cls = 'idle';
        if (elev.state === 'PARKING') cls = 'parking';
        else if (elev.state === 'DOORS') cls = 'doors';
        else if (elev.state === 'MOVING' || elev.passengers.length > 0) cls = 'serving';
        car.className = `elevator-car ${cls}`;
        car.textContent = String(elev.load());
        car.title = `E${elev.id + 1} ${elev.state} @${elev.floor}`;
        cell.appendChild(car);

        // show riding as dots in car? capacity number is enough; also mark in hall? no
    }

    // waiting passengers by floor
    const byFloor = {};
    for (const p of waiting) {
        if (!byFloor[p.origin]) byFloor[p.origin] = [];
        byFloor[p.origin].push(p);
    }
    for (const [floor, list] of Object.entries(byFloor)) {
        const hall = buildingEl.querySelector(`.hall-cell[data-floor="${floor}"]`);
        if (!hall) continue;
        const show = list.slice(0, 12);
        for (const p of show) {
            const dot = document.createElement('div');
            dot.className = 'pax waiting';
            dot.title = `${p.origin}→${p.dest}`;
            hall.appendChild(dot);
        }
        if (list.length > 12) {
            const more = document.createElement('span');
            more.style.cssText = 'font-size:0.65rem;color:var(--muted);font-family:var(--mono)';
            more.textContent = `+${list.length - 12}`;
            hall.appendChild(more);
        }
    }
}

function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function updateDashboard() {
    const aw = avg(completedWaits);
    const mw = completedWaits.length ? Math.max(...completedWaits) : 0;
    document.getElementById('stat-avg-wait').textContent = aw ? aw.toFixed(1) : '0';
    document.getElementById('stat-max-wait').textContent = String(mw);
    document.getElementById('stat-completed').textContent = `${completedCount} / ${targetPassengers}`;
    document.getElementById('stat-empty').textContent = String(emptyTravel);
    const pct = Math.min(100, (completedCount / targetPassengers) * 100);
    document.getElementById('progress-fill').style.width = `${pct}%`;
}

function readControls() {
    floors = Number(document.getElementById('floors-range').value);
    elevatorCount = Number(document.getElementById('elevators-range').value);
    capacity = Number(document.getElementById('capacity-range').value);
    arrivalRate = Number(document.getElementById('arrival-range').value) / 100;
    targetPassengers = Number(document.getElementById('target-range').value);
    parkingStrategy = document.getElementById('strategy-select').value;
    peakMode = document.getElementById('peak-select').value;
    const tps = Number(document.getElementById('sim-speed').value);
    tickDelay = 1000 / tps;
}

function resetSimulation() {
    stopSim();
    readControls();
    tickCount = 0;
    waiting = [];
    completedWaits = [];
    completedRides = [];
    emptyTravel = 0;
    completedCount = 0;
    callHeat = {};
    nextPassengerId = 1;
    buildElevators();
    initBuildingDOM();
    render();
    updateDashboard();
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
}

function startSim() {
    if (isRunning) return;
    readControls();
    isRunning = true;
    intervalId = setInterval(gameLoop, tickDelay);
    document.getElementById('btn-play').disabled = true;
    document.getElementById('btn-pause').disabled = false;
}

function stopSim() {
    isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
}

// Control bindings
function bindRange(id, valId, fmt) {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    const sync = () => { val.textContent = fmt(el.value); };
    el.addEventListener('input', sync);
    sync();
}

bindRange('floors-range', 'floors-val', v => v);
bindRange('elevators-range', 'elevators-val', v => v);
bindRange('capacity-range', 'capacity-val', v => v);
bindRange('arrival-range', 'arrival-val', v => `${v}%`);
bindRange('target-range', 'target-val', v => v);
bindRange('sim-speed', 'sim-speed-val', v => `${v} TPS`);

document.getElementById('btn-play').addEventListener('click', () => {
    // if structural params changed while idle, rebuild
    const needRebuild =
        floors !== Number(document.getElementById('floors-range').value) ||
        elevatorCount !== Number(document.getElementById('elevators-range').value);
    if (needRebuild && completedCount === 0 && tickCount === 0) {
        resetSimulation();
    }
    parkingStrategy = document.getElementById('strategy-select').value;
    peakMode = document.getElementById('peak-select').value;
    arrivalRate = Number(document.getElementById('arrival-range').value) / 100;
    capacity = Number(document.getElementById('capacity-range').value);
    targetPassengers = Number(document.getElementById('target-range').value);
    const tps = Number(document.getElementById('sim-speed').value);
    tickDelay = 1000 / tps;
    startSim();
});

document.getElementById('btn-pause').addEventListener('click', stopSim);
document.getElementById('btn-reset').addEventListener('click', resetSimulation);

document.getElementById('strategy-select').addEventListener('change', () => {
    parkingStrategy = document.getElementById('strategy-select').value;
});

document.getElementById('peak-select').addEventListener('change', () => {
    peakMode = document.getElementById('peak-select').value;
});

document.getElementById('sim-speed').addEventListener('input', () => {
    const tps = Number(document.getElementById('sim-speed').value);
    tickDelay = 1000 / tps;
    if (isRunning) {
        clearInterval(intervalId);
        intervalId = setInterval(gameLoop, tickDelay);
    }
});

// Rebuild layout when floors/elevators change (only when not mid-run, or force reset)
['floors-range', 'elevators-range'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        if (!isRunning) resetSimulation();
    });
});

document.getElementById('mobile-toggle').addEventListener('click', () => {
    document.getElementById('sim-controls').classList.toggle('open');
});

resetSimulation();
