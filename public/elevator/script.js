/**
 * Elevator Parking Simulator — apartment building
 * Same passenger scenario, different parking strategies.
 */

const LOBBY = 1;
const STRATEGIES = ['stay', 'lobby', 'mid', 'spread', 'demand'];
const STRATEGY_LABELS = {
    stay: 'Stay',
    lobby: 'Lobby',
    mid: 'Mid',
    spread: 'Spread',
    demand: 'Demand',
};

let floors = 20;
let elevatorCount = 4;
let capacity = 8;
let arrivalRate = 0.15;
let peakMode = 'evening';
let parkingStrategy = 'stay';
let interfloorRate = 0.10;
let doorDwell = 2;
let targetPassengers = 80;
let tickDelay = 100;
let scenarioSeed = 42;

let tickCount = 0;
let elevators = [];
let waiting = [];
let completedWaits = [];
let completedRides = [];
let emptyTravel = 0;
let completedCount = 0;
let callHeat = {};
let isRunning = false;
let intervalId = null;
let nextPassengerId = 1;

/** Pre-generated arrivals: { tick, origin, dest }[] — shared across strategy runs */
let scenario = [];
let scenarioCursor = 0;
let scenarioKey = '';

let rng = null;

const buildingEl = document.getElementById('building');

class Passenger {
    constructor(origin, dest, arriveTick) {
        this.id = nextPassengerId++;
        this.origin = origin;
        this.dest = dest;
        this.dir = dest > origin ? 1 : -1;
        this.arriveTick = arriveTick;
        this.boardTick = null;
        this.state = 'WAITING';
    }
}

class Elevator {
    constructor(id, homeFloor) {
        this.id = id;
        this.floor = LOBBY;
        this.homeFloor = homeFloor;
        this.dir = 0;
        this.passengers = [];
        this.targets = new Set();
        this.assigned = [];
        this.doorTicks = 0;
        this.state = 'IDLE';
        this.parkingTarget = null;
    }

    load() {
        return this.passengers.length;
    }
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function rand() {
    return rng();
}

function randInt(a, b) {
    return a + Math.floor(rand() * (b - a + 1));
}

function randomUpper(avoid) {
    if (floors < 3) return avoid === 2 ? LOBBY : 2;
    let f = avoid;
    for (let i = 0; i < 24 && f === avoid; i++) {
        f = randInt(2, floors);
    }
    if (f === avoid) f = avoid === 2 ? Math.min(3, floors) : 2;
    return f;
}

function pickDest(origin) {
    if (origin === LOBBY) return randomUpper(LOBBY);
    if (rand() < interfloorRate) return randomUpper(origin);
    return LOBBY;
}

function pickOrigin() {
    if (peakMode === 'morning') {
        return rand() < 0.9 ? randInt(2, floors) : LOBBY;
    }
    if (peakMode === 'evening') {
        return rand() < 0.9 ? LOBBY : randInt(2, floors);
    }
    return rand() < 0.45 ? LOBBY : randInt(2, floors);
}

function trafficScenarioKey() {
    return [
        scenarioSeed,
        floors,
        peakMode,
        arrivalRate,
        interfloorRate,
        targetPassengers,
    ].join('|');
}

function ensureScenario(force) {
    const key = trafficScenarioKey();
    if (!force && scenario.length && key === scenarioKey) return;
    rng = mulberry32(scenarioSeed);
    scenario = [];
    let tick = 0;
    const maxTicks = Math.max(5000, Math.ceil(targetPassengers / Math.max(0.01, arrivalRate)) * 4);
    while (scenario.length < targetPassengers && tick < maxTicks) {
        tick++;
        if (rand() < arrivalRate) {
            const origin = pickOrigin();
            const dest = pickDest(origin);
            scenario.push({ tick, origin, dest });
        }
    }
    scenarioKey = key;
    updateScenarioLabel();
}

function releaseArrivals() {
    while (scenarioCursor < scenario.length && scenario[scenarioCursor].tick <= tickCount) {
        const e = scenario[scenarioCursor++];
        const p = new Passenger(e.origin, e.dest, e.tick);
        waiting.push(p);
        callHeat[e.origin] = (callHeat[e.origin] || 0) + 3;
    }
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
    const dist = Math.abs(elev.floor - passenger.origin);
    const loadPenalty = elev.load() * 2;
    const doorPenalty = elev.doorTicks > 0 ? 1 : 0;
    let dirPenalty = 0;
    if (elev.dir !== 0 && elev.passengers.length > 0) {
        const goingThatWay =
            (elev.dir === 1 && passenger.origin >= elev.floor) ||
            (elev.dir === -1 && passenger.origin <= elev.floor);
        if (!goingThatWay) dirPenalty = 8;
        else if (passenger.dir !== elev.dir) dirPenalty = 3;
    }
    if (elev.load() >= capacity) return Infinity;
    const busyPenalty = elev.state === 'PARKING' || elev.state === 'IDLE' ? 0 : 2;
    return dist + loadPenalty + doorPenalty + dirPenalty + busyPenalty;
}

function assignCalls() {
    const pool = unassignedWaiting();
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
    list.sort((a, b) => Math.abs(a - elev.floor) - Math.abs(b - elev.floor));
    return list[0];
}

function openDoors(elev) {
    elev.doorTicks = doorDwell;
    elev.state = 'DOORS';
    elev.targets.delete(elev.floor);

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

    const canBoard = [];
    elev.assigned = elev.assigned.filter(p => {
        if (p.origin === elev.floor && p.state === 'WAITING') {
            canBoard.push(p);
            return false;
        }
        return true;
    });

    for (const p of unassignedWaiting()) {
        if (p.origin !== elev.floor) continue;
        if (elev.passengers.length + canBoard.length >= capacity) break;
        let ok = true;
        if (elev.passengers.length > 0 && elev.dir !== 0 && p.dir !== elev.dir) {
            ok = false;
        }
        if (ok) canBoard.push(p);
    }

    for (const p of canBoard) {
        if (elev.passengers.length >= capacity) {
            elev.assigned.push(p);
            elev.targets.add(p.origin);
            continue;
        }
        waiting = waiting.filter(w => w.id !== p.id);
        p.state = 'RIDING';
        p.boardTick = tickCount;
        elev.passengers.push(p);
        elev.targets.add(p.dest);
    }

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
        if (elev.assigned.length || elev.targets.size) {
            elev.parkingTarget = null;
            elev.state = 'MOVING';
        } else if (elev.floor === elev.parkingTarget) {
            elev.state = 'IDLE';
            elev.dir = 0;
            elev.parkingTarget = null;
            return;
        } else {
            elev.floor += elev.parkingTarget > elev.floor ? 1 : -1;
            emptyTravel++;
            return;
        }
    }

    if (elev.state === 'IDLE') {
        const park = parkingFloorFor(elev);
        if (park !== elev.floor && parkingStrategy !== 'stay') {
            elev.parkingTarget = park;
            elev.state = 'PARKING';
            elev.dir = park > elev.floor ? 1 : -1;
        }
        return;
    }

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

    const stopNow =
        elev.passengers.some(p => p.dest === elev.floor) ||
        elev.assigned.some(p => p.origin === elev.floor);
    if (stopNow) openDoors(elev);
}

function simTick() {
    tickCount++;
    releaseArrivals();
    decayHeat();
    assignCalls();
    for (const elev of elevators) stepElevator(elev);
    waiting = waiting.filter(p => p.state === 'WAITING');
}

function gameLoop() {
    simTick();
    render();
    updateDashboard();
    if (completedCount >= targetPassengers) stopSim();
}

function buildElevators() {
    elevators = [];
    for (let i = 0; i < elevatorCount; i++) {
        elevators.push(new Elevator(i, homeFloorFor(i)));
    }
}

function resetRuntimeState() {
    tickCount = 0;
    waiting = [];
    completedWaits = [];
    completedRides = [];
    emptyTravel = 0;
    completedCount = 0;
    callHeat = {};
    nextPassengerId = 1;
    scenarioCursor = 0;
    buildElevators();
}

function initBuildingDOM() {
    buildingEl.style.setProperty('--shaft-count', elevatorCount);
    buildingEl.innerHTML = '';

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
    }

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

function snapshotMetrics() {
    return {
        avgWait: avg(completedWaits),
        maxWait: completedWaits.length ? Math.max(...completedWaits) : 0,
        emptyTravel,
        ticks: tickCount,
        completed: completedCount,
    };
}

function updateDashboard() {
    const m = snapshotMetrics();
    document.getElementById('stat-avg-wait').textContent = m.avgWait ? m.avgWait.toFixed(1) : '0';
    document.getElementById('stat-max-wait').textContent = String(m.maxWait);
    document.getElementById('stat-completed').textContent = `${m.completed} / ${targetPassengers}`;
    document.getElementById('stat-empty').textContent = String(m.emptyTravel);
    document.getElementById('progress-fill').style.width =
        `${Math.min(100, (m.completed / targetPassengers) * 100)}%`;
}

function updateScenarioLabel() {
    const el = document.getElementById('scenario-label');
    if (!el) return;
    el.textContent = `Scenario seed ${scenarioSeed} · ${scenario.length} trips`;
}

function readControls() {
    floors = Number(document.getElementById('floors-range').value);
    elevatorCount = Number(document.getElementById('elevators-range').value);
    capacity = Number(document.getElementById('capacity-range').value);
    arrivalRate = Number(document.getElementById('arrival-range').value) / 100;
    interfloorRate = Number(document.getElementById('interfloor-range').value) / 100;
    doorDwell = Number(document.getElementById('dwell-range').value);
    targetPassengers = Number(document.getElementById('target-range').value);
    parkingStrategy = document.getElementById('strategy-select').value;
    peakMode = document.getElementById('peak-select').value;
    const seedInput = document.getElementById('seed-input');
    scenarioSeed = Number(seedInput.value) || 1;
    const tps = Number(document.getElementById('sim-speed').value);
    tickDelay = 1000 / tps;
}

function resetSimulation(opts = {}) {
    stopSim();
    readControls();
    ensureScenario(Boolean(opts.newScenario));
    resetRuntimeState();
    initBuildingDOM();
    render();
    updateDashboard();
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
}

function startSim() {
    if (isRunning) return;
    readControls();
    ensureScenario(false);
    // If starting fresh after finish, replay same scenario
    if (completedCount >= targetPassengers || tickCount === 0) {
        resetRuntimeState();
        if (!buildingEl.children.length) initBuildingDOM();
        render();
        updateDashboard();
    }
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

/** Run one strategy against the current scenario with no animation. */
function runHeadless(strategy) {
    parkingStrategy = strategy;
    resetRuntimeState();
    const guard = Math.max(20000, scenario[scenario.length - 1]?.tick * 20 || 20000);
    while (completedCount < targetPassengers && tickCount < guard) {
        simTick();
    }
    return { strategy, ...snapshotMetrics() };
}

function compareStrategies() {
    stopSim();
    readControls();
    ensureScenario(false);

    const savedStrategy = parkingStrategy;
    const results = STRATEGIES.map(runHeadless);

    // Restore selected strategy and visual reset for replay
    document.getElementById('strategy-select').value = savedStrategy;
    parkingStrategy = savedStrategy;
    resetRuntimeState();
    initBuildingDOM();
    render();
    updateDashboard();

    const bestWait = Math.min(...results.map(r => r.avgWait || Infinity));
    const bestEmpty = Math.min(...results.map(r => r.emptyTravel));

    const tbody = document.querySelector('#compare-table tbody');
    tbody.innerHTML = '';
    for (const r of results) {
        const tr = document.createElement('tr');
        if (r.avgWait === bestWait) tr.classList.add('best-wait');
        tr.innerHTML = `
            <td>${STRATEGY_LABELS[r.strategy]}</td>
            <td class="num">${r.avgWait.toFixed(1)}</td>
            <td class="num">${r.maxWait}</td>
            <td class="num ${r.emptyTravel === bestEmpty ? 'best-empty' : ''}">${r.emptyTravel}</td>
            <td class="num">${r.ticks}</td>
            <td class="num">${r.completed}</td>
        `;
        tbody.appendChild(tr);
    }
    document.getElementById('compare-panel').hidden = false;
}

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
bindRange('interfloor-range', 'interfloor-val', v => `${v}%`);
bindRange('dwell-range', 'dwell-val', v => v);
bindRange('target-range', 'target-val', v => v);
bindRange('sim-speed', 'sim-speed-val', v => `${v} TPS`);

document.getElementById('btn-play').addEventListener('click', () => {
    const needRebuild =
        floors !== Number(document.getElementById('floors-range').value) ||
        elevatorCount !== Number(document.getElementById('elevators-range').value);
    readControls();
    if (needRebuild) {
        ensureScenario(false);
        resetRuntimeState();
        initBuildingDOM();
        render();
        updateDashboard();
    }
    startSim();
});

document.getElementById('btn-pause').addEventListener('click', stopSim);
document.getElementById('btn-reset').addEventListener('click', () => resetSimulation({ newScenario: false }));
document.getElementById('btn-new-scenario').addEventListener('click', () => {
    const next = (Math.floor(Math.random() * 90000) + 10000);
    document.getElementById('seed-input').value = String(next);
    scenarioSeed = next;
    resetSimulation({ newScenario: true });
});
document.getElementById('btn-compare').addEventListener('click', compareStrategies);

document.getElementById('strategy-select').addEventListener('change', () => {
    parkingStrategy = document.getElementById('strategy-select').value;
});

document.getElementById('peak-select').addEventListener('change', () => {
    peakMode = document.getElementById('peak-select').value;
});

document.getElementById('seed-input').addEventListener('change', () => {
    scenarioSeed = Number(document.getElementById('seed-input').value) || 1;
    resetSimulation({ newScenario: true });
});

document.getElementById('sim-speed').addEventListener('input', () => {
    const tps = Number(document.getElementById('sim-speed').value);
    tickDelay = 1000 / tps;
    if (isRunning) {
        clearInterval(intervalId);
        intervalId = setInterval(gameLoop, tickDelay);
    }
});

// Traffic inputs invalidate scenario on next ensure
['floors-range', 'elevators-range', 'arrival-range', 'interfloor-range', 'target-range', 'peak-select'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        if (!isRunning) {
            readControls();
            // elevators-only change shouldn't rebuild passenger OD — but floors/arrival/peak/interfloor/target should
            const trafficChanged = id !== 'elevators-range';
            if (trafficChanged) scenarioKey = '';
            resetSimulation({ newScenario: trafficChanged });
        }
    });
});

document.getElementById('mobile-toggle').addEventListener('click', () => {
    document.getElementById('sim-controls').classList.toggle('open');
});

try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === '1' || window.self !== window.top) {
        document.documentElement.classList.add('embed');
    }
} catch (_) {
    document.documentElement.classList.add('embed');
}

resetSimulation({ newScenario: true });
