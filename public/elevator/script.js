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
/** Passengers who finished their trip, grouped visually by alight floor */
let alighted = [];
let completedWaits = [];
let emptyTravel = 0;
/** Elevator-ticks spent in IDLE or PARKING (saturation inverse) */
let idleCarTicks = 0;
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

function getStopFloors(elev) {
    const stops = new Set();
    for (const p of elev.passengers) stops.add(p.dest);
    for (const p of elev.assigned) stops.add(p.origin);
    return stops;
}

function hasStopsAbove(elev) {
    for (const f of getStopFloors(elev)) {
        if (f > elev.floor) return true;
    }
    return false;
}

function hasStopsBelow(elev) {
    for (const f of getStopFloors(elev)) {
        if (f < elev.floor) return true;
    }
    return false;
}

function hasWork(elev) {
    return elev.passengers.length > 0 || elev.assigned.length > 0;
}

/** SCAN-style direction: finish all stops above before reversing down. */
function chooseDirection(elev) {
    const above = hasStopsAbove(elev);
    const below = hasStopsBelow(elev);
    if (!above && !below) return 0;
    if (elev.dir === 1 && above) return 1;
    if (elev.dir === -1 && below) return -1;
    if (above && !below) return 1;
    if (below && !above) return -1;
    // Both sides: prefer continuing, else go toward more stops
    if (elev.dir === 1 || elev.dir === -1) return elev.dir;
    const stops = getStopFloors(elev);
    let up = 0;
    let down = 0;
    for (const f of stops) {
        if (f > elev.floor) up++;
        else if (f < elev.floor) down++;
    }
    return up >= down ? 1 : -1;
}

/**
 * Collective/SCAN boarding: same-direction hall calls only, except at the
 * turnaround floor (no further stops ahead) where opposite calls may board
 * before reversing — e.g. empty car climbs to 7 for down calls, then 7→6→4→3→1.
 */
function canBoardPassenger(elev, passenger) {
    if (passenger.origin !== elev.floor) return false;
    if (passenger.state !== 'WAITING') return false;
    if (elev.dir === 0) return true;
    if (elev.dir === 1) {
        if (passenger.dir === 1) return true;
        return !hasStopsAbove(elev);
    }
    if (elev.dir === -1) {
        if (passenger.dir === -1) return true;
        return !hasStopsBelow(elev);
    }
    return false;
}

function shouldStopAtFloor(elev) {
    const f = elev.floor;
    if (elev.passengers.some(p => p.dest === f)) return true;
    if (elev.assigned.some(p => p.origin === f && canBoardPassenger(elev, p))) return true;
    return false;
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
            if (best.state === 'PARKING') {
                best.parkingTarget = null;
                best.state = 'MOVING';
            }
            if (best.state === 'IDLE') best.state = 'MOVING';
        }
    }
}

function clearAssignment(passengerId) {
    for (const e of elevators) {
        e.assigned = e.assigned.filter(p => p.id !== passengerId);
    }
}

function openDoors(elev) {
    elev.doorTicks = doorDwell;
    elev.state = 'DOORS';

    const staying = [];
    for (const p of elev.passengers) {
        if (p.dest === elev.floor) {
            p.state = 'DONE';
            completedCount++;
            completedWaits.push(p.boardTick - p.arriveTick);
            alighted.push({
                id: p.id,
                origin: p.origin,
                dest: p.dest,
                floor: elev.floor,
                alightTick: tickCount,
            });
        } else {
            staying.push(p);
        }
    }
    elev.passengers = staying;

    // Any same-direction waiter at this floor boards if there is room —
    // even if they were assigned to another car (real hall behavior).
    const canBoard = [];
    const seen = new Set();
    const here = waiting.filter(p => p.origin === elev.floor && p.state === 'WAITING');
    here.sort((a, b) => a.arriveTick - b.arriveTick);
    for (const p of here) {
        if (seen.has(p.id)) continue;
        if (!canBoardPassenger(elev, p)) continue;
        if (elev.passengers.length + canBoard.length >= capacity) break;
        canBoard.push(p);
        seen.add(p.id);
    }

    for (const p of canBoard) {
        clearAssignment(p.id);
        waiting = waiting.filter(w => w.id !== p.id);
        p.state = 'RIDING';
        p.boardTick = tickCount;
        elev.passengers.push(p);
    }

    // Drop stale self-assignments left at this floor (opposite direction / full)
    elev.assigned = elev.assigned.filter(p => !(p.origin === elev.floor && p.state === 'WAITING'));

    elev.dir = chooseDirection(elev);
}

function stepElevator(elev) {
    if (elev.doorTicks > 0) {
        elev.doorTicks--;
        if (elev.doorTicks === 0) {
            if (hasWork(elev)) {
                elev.state = 'MOVING';
                elev.parkingTarget = null;
                elev.dir = chooseDirection(elev);
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
                elev.dir = chooseDirection(elev);
            }
        }
        return;
    }

    if (elev.state === 'PARKING') {
        if (elev.parkingTarget == null) {
            elev.state = 'IDLE';
            elev.dir = 0;
            return;
        }
        if (hasWork(elev)) {
            elev.parkingTarget = null;
            elev.state = 'MOVING';
            elev.dir = chooseDirection(elev);
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
        if (hasWork(elev)) {
            elev.state = 'MOVING';
            elev.parkingTarget = null;
            elev.dir = chooseDirection(elev);
        } else {
            const park = parkingFloorFor(elev);
            if (park !== elev.floor && parkingStrategy !== 'stay') {
                elev.parkingTarget = park;
                elev.state = 'PARKING';
                elev.dir = park > elev.floor ? 1 : -1;
            }
        }
        return;
    }

    // MOVING — one floor per tick, stop only at floors in the service set
    if (shouldStopAtFloor(elev)) {
        openDoors(elev);
        return;
    }

    const dir = chooseDirection(elev);
    if (dir === 0) {
        elev.state = 'IDLE';
        elev.dir = 0;
        return;
    }

    elev.dir = dir;
    elev.floor += dir;
    if (elev.passengers.length === 0) emptyTravel++;

    if (shouldStopAtFloor(elev)) {
        openDoors(elev);
    }
}

function simTick() {
    tickCount++;
    releaseArrivals();
    decayHeat();
    assignCalls();
    for (const elev of elevators) stepElevator(elev);
    for (const elev of elevators) {
        if (elev.state === 'IDLE' || elev.state === 'PARKING') idleCarTicks++;
    }
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
    emptyTravel = 0;
    idleCarTicks = 0;
    completedCount = 0;
    callHeat = {};
    nextPassengerId = 1;
    scenarioCursor = 0;
    alighted = [];
    buildElevators();
}

function initBuildingDOM() {
    buildingEl.style.setProperty('--shaft-count', elevatorCount);
    buildingEl.innerHTML = '';

    const alightedH = document.createElement('div');
    alightedH.className = 'alighted-header';
    alightedH.textContent = 'Out';
    buildingEl.appendChild(alightedH);

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
        const alightedCell = document.createElement('div');
        alightedCell.className = 'alighted-cell';
        alightedCell.dataset.floor = f;
        buildingEl.appendChild(alightedCell);

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

function floorLabel(f) {
    return f === LOBBY ? 'L1' : String(f);
}

function paxTip(p) {
    return `#${p.id}  ·  ${floorLabel(p.origin)} → ${floorLabel(p.dest)}`;
}

function alightedTip(p) {
    return `#${p.id}  ·  ${floorLabel(p.origin)} → ${floorLabel(p.dest)}\nArrived @ ${floorLabel(p.floor)} · t=${p.alightTick}`;
}

function elevPanelTip(elev) {
    const lines = [
        `E${elev.id + 1}  ·  ${elev.state} @ ${floorLabel(elev.floor)}`,
    ];
    if (elev.dir === 1) lines[0] += ' ↑';
    else if (elev.dir === -1) lines[0] += ' ↓';
    if (elev.load() >= capacity) lines[0] += '  ·  FULL';

    const pressed = [...getStopFloors(elev)].sort((a, b) => a - b);
    if (pressed.length) {
        lines.push(`Panel: ${pressed.map(floorLabel).join(', ')}`);
    } else {
        lines.push('Panel: —');
    }

    if (elev.passengers.length) {
        lines.push('Riders:');
        for (const p of elev.passengers) {
            lines.push(`  #${p.id}  ${floorLabel(p.origin)} → ${floorLabel(p.dest)}`);
        }
    } else {
        lines.push('Riders: empty');
    }

    if (elev.assigned.length) {
        lines.push('Pickup:');
        for (const p of elev.assigned) {
            lines.push(`  #${p.id} waiting @ ${floorLabel(p.origin)} → ${floorLabel(p.dest)}`);
        }
    }

    return lines.join('\n');
}

function showTip(text, x, y) {
    const tip = document.getElementById('hover-tip');
    if (!tip) return;
    tip.textContent = text;
    tip.hidden = false;
    const pad = 12;
    const rect = tip.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
}

function hideTip() {
    const tip = document.getElementById('hover-tip');
    if (tip) tip.hidden = true;
}

function bindTip(el, textFn, opts = {}) {
    const apply = (e) => {
        if (opts.stop) e.stopPropagation();
        const text = textFn();
        el.title = text;
        showTip(text, e.clientX, e.clientY);
    };
    el.addEventListener('mouseenter', apply);
    el.addEventListener('mousemove', apply);
    el.addEventListener('mouseleave', (e) => {
        if (opts.stop) e.stopPropagation();
        hideTip();
    });
}

function render() {
    buildingEl.querySelectorAll('.elevator-car').forEach(el => el.remove());
    buildingEl.querySelectorAll('.shaft-cell').forEach(el => el.classList.remove('has-car'));
    buildingEl.querySelectorAll('.hall-cell').forEach(el => { el.innerHTML = ''; });
    buildingEl.querySelectorAll('.alighted-cell').forEach(el => { el.innerHTML = ''; });

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
        if (elev.load() >= capacity) car.classList.add('full');

        const riders = document.createElement('div');
        riders.className = 'car-riders';
        const showRiders = elev.passengers.slice(0, 8);
        for (const p of showRiders) {
            const dot = document.createElement('span');
            dot.className = 'pax riding';
            bindTip(dot, () => paxTip(p), { stop: true });
            riders.appendChild(dot);
        }
        if (elev.passengers.length > 8) {
            const more = document.createElement('span');
            more.className = 'car-more';
            more.textContent = `+${elev.passengers.length - 8}`;
            riders.appendChild(more);
        }
        if (!elev.passengers.length) {
            const count = document.createElement('span');
            count.className = 'car-count';
            count.textContent = '0';
            riders.appendChild(count);
        }

        car.appendChild(riders);
        bindTip(car, () => elevPanelTip(elev));
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
            bindTip(dot, () => paxTip(p));
            hall.appendChild(dot);
        }
        if (list.length > 12) {
            const more = document.createElement('span');
            more.className = 'hall-more';
            more.textContent = `+${list.length - 12}`;
            hall.appendChild(more);
        }
    }

    const alightedByFloor = {};
    for (const p of alighted) {
        if (!alightedByFloor[p.floor]) alightedByFloor[p.floor] = [];
        alightedByFloor[p.floor].push(p);
    }
    for (const [floor, list] of Object.entries(alightedByFloor)) {
        const cell = buildingEl.querySelector(`.alighted-cell[data-floor="${floor}"]`);
        if (!cell) continue;
        const show = list.slice(0, 12);
        for (const p of show) {
            const dot = document.createElement('div');
            dot.className = 'pax alighted';
            bindTip(dot, () => alightedTip(p));
            cell.appendChild(dot);
        }
        if (list.length > 12) {
            const more = document.createElement('span');
            more.className = 'alighted-more';
            more.textContent = `+${list.length - 12}`;
            cell.appendChild(more);
        }
    }
}

function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** IdleFrac = idle/parking car-ticks / (ticks × elevators) */
function computeIdleFrac(idleTicks, ticks, elevCount) {
    const denom = ticks * elevCount;
    return denom > 0 ? idleTicks / denom : 0;
}

/** Regime hint from IdleFrac — diagnostic, not a ranking objective */
function regimeFromIdleFrac(frac) {
    if (frac >= 0.25) return 'parking-sensitive';
    if (frac < 0.10) return 'saturated';
    return 'mixed';
}

function formatIdleFracPct(frac) {
    return `${Math.round(frac * 100)}%`;
}

function snapshotMetrics() {
    const idleFrac = computeIdleFrac(idleCarTicks, tickCount, elevatorCount);
    return {
        avgWait: avg(completedWaits),
        maxWait: completedWaits.length ? Math.max(...completedWaits) : 0,
        emptyTravel,
        idleCarTicks,
        idleFrac,
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
    const idleEl = document.getElementById('stat-idle-frac');
    if (idleEl) idleEl.textContent = formatIdleFracPct(m.idleFrac);
    const regimeEl = document.getElementById('stat-regime');
    if (regimeEl) {
        const regime = regimeFromIdleFrac(m.idleFrac);
        regimeEl.textContent = regime;
        regimeEl.dataset.regime = regime;
    }
    const ticksEl = document.getElementById('stat-ticks');
    if (ticksEl) ticksEl.textContent = String(m.ticks);
    document.getElementById('progress-fill').style.width =
        `${Math.min(100, (m.completed / targetPassengers) * 100)}%`;
}

function updatePlayLabel() {
    const btn = document.getElementById('btn-play');
    if (!btn) return;
    const canResume = !isRunning && tickCount > 0 && completedCount < targetPassengers;
    btn.textContent = canResume ? 'Resume' : 'Start';
    updateTransportButtons();
}

function updateTransportButtons() {
    const rewind = document.getElementById('btn-rewind');
    const step = document.getElementById('btn-step');
    if (rewind) rewind.disabled = isRunning || tickCount <= 0;
    if (step) {
        step.disabled = isRunning || completedCount >= targetPassengers;
    }
}

/**
 * Deterministic rebuild: reset runtime and replay simTick up to targetTick.
 * Used for rewind without storing full snapshots.
 */
function rebuildToTick(targetTick) {
    const capped = Math.max(0, targetTick | 0);
    stopSim();
    resetRuntimeState();
    while (tickCount < capped) {
        simTick();
        if (completedCount >= targetPassengers) break;
    }
    render();
    updateDashboard();
    updatePlayLabel();
}

function rewindTicks(n = 1) {
    if (tickCount <= 0) return;
    if (isRunning) stopSim();
    rebuildToTick(tickCount - Math.max(1, n | 0));
}

function stepForward() {
    if (isRunning) return;
    if (completedCount >= targetPassengers) return;
    ensureScenario(false);
    simTick();
    render();
    updateDashboard();
    updatePlayLabel();
}

function updateScenarioLabel() {
    const el = document.getElementById('scenario-label');
    if (!el) return;
    el.textContent = `Scenario seed ${scenarioSeed} · ${scenario.length} trips`;
}

function dirLabel(dir) {
    if (dir === 1) return '↑';
    if (dir === -1) return '↓';
    return '·';
}

function formatDebugSnapshot() {
    const m = snapshotMetrics();
    const tpsEl = document.getElementById('sim-speed');
    const tps = tpsEl ? Number(tpsEl.value) : Math.round(1000 / Math.max(1, tickDelay));
    const lines = [
        'Elevator Parking — debug snapshot',
        `time: ${new Date().toISOString()}`,
        '',
        '## Settings',
        `seed: ${scenarioSeed}`,
        `strategy: ${parkingStrategy} (${STRATEGY_LABELS[parkingStrategy] || parkingStrategy})`,
        `traffic: ${peakMode}`,
        `interfloor: ${Math.round(interfloorRate * 100)}%`,
        `doorDwell: ${doorDwell}`,
        `floors: ${floors}`,
        `elevators: ${elevatorCount}`,
        `capacity: ${capacity}`,
        `arrivalRate: ${Math.round(arrivalRate * 100)}%`,
        `target: ${targetPassengers}`,
        `speed: ${tps} TPS`,
        `running: ${isRunning}`,
        '',
        '## Metrics',
        `tick: ${m.ticks}`,
        `avgWait: ${m.avgWait ? m.avgWait.toFixed(2) : '0'}`,
        `maxWait: ${m.maxWait}`,
        `emptyTravel: ${m.emptyTravel}`,
        `idleFrac: ${formatIdleFracPct(m.idleFrac)} (${regimeFromIdleFrac(m.idleFrac)})`,
        `completed: ${m.completed} / ${targetPassengers}`,
        `waiting: ${waiting.filter(p => p.state === 'WAITING').length}`,
        `scenarioTrips: ${scenario.length} (cursor ${scenarioCursor})`,
        '',
        '## Elevators',
    ];

    for (const elev of elevators) {
        const full = elev.load() >= capacity ? ' FULL' : '';
        lines.push(
            `E${elev.id + 1}: ${elev.state} @ ${floorLabel(elev.floor)} ${dirLabel(elev.dir)} ` +
            `load ${elev.load()}/${capacity}${full}` +
            (elev.parkingTarget != null ? ` park→${floorLabel(elev.parkingTarget)}` : '') +
            (elev.doorTicks > 0 ? ` doors=${elev.doorTicks}` : '')
        );
        if (elev.passengers.length) {
            lines.push('  riders: ' + elev.passengers.map(
                p => `#${p.id} ${floorLabel(p.origin)}→${floorLabel(p.dest)}`
            ).join(', '));
        }
        if (elev.assigned.length) {
            lines.push('  pickup: ' + elev.assigned.map(
                p => `#${p.id} @${floorLabel(p.origin)}→${floorLabel(p.dest)}`
            ).join(', '));
        }
        const stops = [...getStopFloors(elev)].sort((a, b) => a - b);
        if (stops.length) {
            lines.push('  stops: ' + stops.map(floorLabel).join(', '));
        }
    }

    lines.push('', '## Hall waiting');
    const byFloor = {};
    for (const p of waiting) {
        if (p.state !== 'WAITING') continue;
        if (!byFloor[p.origin]) byFloor[p.origin] = [];
        byFloor[p.origin].push(p);
    }
    const floorsWait = Object.keys(byFloor).map(Number).sort((a, b) => b - a);
    if (!floorsWait.length) {
        lines.push('(none)');
    } else {
        for (const f of floorsWait) {
            const list = byFloor[f];
            lines.push(
                `${floorLabel(f)} (${list.length}): ` +
                list.map(p => `#${p.id}→${floorLabel(p.dest)} arr=${p.arriveTick}`).join(', ')
            );
        }
    }

    lines.push('', '## Alighted (recent, max 20)');
    const recent = alighted.slice(-20);
    if (!recent.length) {
        lines.push('(none)');
    } else {
        for (const p of recent) {
            lines.push(
                `#${p.id} ${floorLabel(p.origin)}→${floorLabel(p.dest)} ` +
                `out@${floorLabel(p.floor)} t=${p.alightTick}`
            );
        }
        if (alighted.length > 20) {
            lines.push(`… ${alighted.length - 20} earlier`);
        }
    }

    const upcoming = scenario.slice(scenarioCursor, scenarioCursor + 8);
    lines.push('', '## Upcoming arrivals (next 8)');
    if (!upcoming.length) {
        lines.push('(none)');
    } else {
        for (const e of upcoming) {
            lines.push(`t=${e.tick} ${floorLabel(e.origin)}→${floorLabel(e.dest)}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

async function copyDebugSnapshot() {
    const text = formatDebugSnapshot();
    const btn = document.getElementById('btn-copy-debug');
    const label = btn ? btn.textContent : 'Copy debug';
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (btn) {
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = label; }, 1200);
        }
    } catch (err) {
        console.error(err);
        if (btn) {
            btn.textContent = 'Copy failed';
            setTimeout(() => { btn.textContent = label; }, 1500);
        }
    }
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
    updatePlayLabel();
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
    updatePlayLabel();
}

function stopSim() {
    isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    updatePlayLabel();
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

function formatCompareSettings() {
    return [
        `seed ${scenarioSeed}`,
        peakMode,
        `interfloor ${Math.round(interfloorRate * 100)}%`,
        `dwell ${doorDwell}`,
        `${floors}F`,
        `${elevatorCount} cars`,
        `cap ${capacity}`,
        `arrival ${Math.round(arrivalRate * 100)}%`,
        `target ${targetPassengers}`,
        `${scenario.length} trips`,
    ].join(' · ');
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
    const meanIdle = mean(results.map(r => r.idleFrac));
    const compareRegime = regimeFromIdleFrac(meanIdle);

    const tbody = document.querySelector('#compare-table tbody');
    tbody.innerHTML = '';
    for (const r of results) {
        const tr = document.createElement('tr');
        if (r.avgWait === bestWait) tr.classList.add('best-wait');
        if (r.completed < targetPassengers) tr.classList.add('incomplete');
        tr.innerHTML = `
            <td>${STRATEGY_LABELS[r.strategy]}</td>
            <td class="num">${r.avgWait.toFixed(1)}</td>
            <td class="num">${r.maxWait}</td>
            <td class="num ${r.emptyTravel === bestEmpty ? 'best-empty' : ''}">${r.emptyTravel}</td>
            <td class="num">${formatIdleFracPct(r.idleFrac)}</td>
            <td class="num">${r.ticks}</td>
            <td class="num">${r.completed}</td>
        `;
        tbody.appendChild(tr);
    }
    const regimeLine = document.getElementById('compare-regime');
    if (regimeLine) {
        regimeLine.textContent = `Idle ${formatIdleFracPct(meanIdle)} · ${compareRegime}`;
        regimeLine.dataset.regime = compareRegime;
        regimeLine.hidden = false;
    }
    const settingsEl = document.getElementById('compare-settings');
    if (settingsEl) {
        settingsEl.textContent = formatCompareSettings();
        settingsEl.classList.add('compare-settings');
    }
    const panel = document.getElementById('compare-panel');
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let batchRows = [];
let batchRunning = false;
let lastBatchSummary = null;
let batchRankMetric = 'avgWait';

const RANK_METRICS = {
    avgWait: {
        label: 'avg wait',
        rowKey: 'avgWait',
        meanKey: 'meanWait',
        stdKey: 'stdWait',
        colIndex: 2,
    },
    maxWait: {
        label: 'max wait',
        rowKey: 'maxWait',
        meanKey: 'meanMaxWait',
        stdKey: 'stdMaxWait',
        colIndex: 4,
    },
    emptyTravel: {
        label: 'empty travel',
        rowKey: 'emptyTravel',
        meanKey: 'meanEmpty',
        stdKey: 'stdEmpty',
        colIndex: 5,
    },
    ticks: {
        label: 'ticks',
        rowKey: 'ticks',
        meanKey: 'meanTicks',
        stdKey: 'stdTicks',
        colIndex: 7,
    },
};

function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (arr.length - 1);
    return Math.sqrt(v);
}

function batchSettingsLine(n, baseSeed) {
    return [
        `N=${n}`,
        `seeds ${baseSeed}…${baseSeed + n - 1}`,
        peakMode,
        `interfloor ${Math.round(interfloorRate * 100)}%`,
        `dwell ${doorDwell}`,
        `${floors}F`,
        `${elevatorCount} cars`,
        `cap ${capacity}`,
        `arrival ${Math.round(arrivalRate * 100)}%`,
        `target ${targetPassengers}`,
    ].join(' · ');
}

function renderBatchSettings(n, baseSeed, regimeHint) {
    const el = document.getElementById('batch-settings');
    if (!el) return;
    const chips = [
        `N=${n}`,
        `${baseSeed}–${baseSeed + n - 1}`,
        peakMode,
        `interfloor ${Math.round(interfloorRate * 100)}%`,
        `dwell ${doorDwell}`,
        `${floors}F`,
        `${elevatorCount} cars`,
        `cap ${capacity}`,
        `arrival ${Math.round(arrivalRate * 100)}%`,
        `target ${targetPassengers}`,
    ];
    if (regimeHint) chips.push(regimeHint);
    el.innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join('');
}

function setBatchProgress(done, total, label) {
    const wrap = document.getElementById('batch-progress-wrap');
    const fill = document.getElementById('batch-progress-fill');
    const text = document.getElementById('batch-progress');
    if (wrap) wrap.hidden = false;
    if (fill) fill.style.width = `${total ? Math.min(100, (done / total) * 100) : 0}%`;
    if (text) text.textContent = label;
}

function summarizeBatch(rows, metric = batchRankMetric) {
    const cfg = RANK_METRICS[metric] || RANK_METRICS.avgWait;
    const byStrategy = {};
    for (const s of STRATEGIES) {
        byStrategy[s] = {
            strategy: s,
            waits: [],
            maxWaits: [],
            empties: [],
            idleFracs: [],
            ticks: [],
            wins: 0,
            incomplete: 0,
            n: 0,
        };
    }

    const bySeed = {};
    for (const r of rows) {
        if (!bySeed[r.seed]) bySeed[r.seed] = [];
        bySeed[r.seed].push(r);
        const bucket = byStrategy[r.strategy];
        if (!bucket) continue;
        bucket.n++;
        bucket.waits.push(r.avgWait);
        bucket.maxWaits.push(r.maxWait);
        bucket.empties.push(r.emptyTravel);
        bucket.idleFracs.push(r.idleFrac);
        bucket.ticks.push(r.ticks);
        if (r.completed < r.target) bucket.incomplete++;
    }

    for (const seedRows of Object.values(bySeed)) {
        let best = Infinity;
        for (const r of seedRows) {
            const v = r[cfg.rowKey];
            if (v < best) best = v;
        }
        for (const r of seedRows) {
            if (r[cfg.rowKey] === best) byStrategy[r.strategy].wins++;
        }
    }

    const seedCount = Object.keys(bySeed).length || 1;
    const overallIdle = mean(rows.map(r => r.idleFrac));
    return STRATEGIES.map(s => {
        const b = byStrategy[s];
        return {
            strategy: s,
            meanWait: mean(b.waits),
            stdWait: stdev(b.waits),
            meanMaxWait: mean(b.maxWaits),
            stdMaxWait: stdev(b.maxWaits),
            meanEmpty: mean(b.empties),
            stdEmpty: stdev(b.empties),
            meanIdleFrac: mean(b.idleFracs),
            stdIdleFrac: stdev(b.idleFracs),
            meanTicks: mean(b.ticks),
            stdTicks: stdev(b.ticks),
            winRate: (b.wins / seedCount) * 100,
            incomplete: b.incomplete,
            n: b.n,
            metric,
            overallIdleFrac: overallIdle,
            overallRegime: regimeFromIdleFrac(overallIdle),
        };
    });
}

function formatBatchCsv(rows) {
    const header = [
        'seed', 'strategy', 'peak', 'interfloor', 'dwell', 'floors', 'elevators',
        'capacity', 'arrival', 'target', 'trips', 'avgWait', 'maxWait',
        'emptyTravel', 'idleFrac', 'ticks', 'completed',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
        lines.push([
            r.seed, r.strategy, r.peak, r.interfloor, r.dwell, r.floors, r.elevators,
            r.capacity, r.arrival, r.target, r.trips,
            r.avgWait.toFixed(4), r.maxWait, r.emptyTravel,
            r.idleFrac.toFixed(4), r.ticks, r.completed,
        ].join(','));
    }
    return lines.join('\n') + '\n';
}

function formatBatchSummaryText(summary, n, baseSeed) {
    const cfg = RANK_METRICS[batchRankMetric] || RANK_METRICS.avgWait;
    const overallIdle = summary[0] ? summary[0].overallIdleFrac : 0;
    const overallRegime = summary[0] ? summary[0].overallRegime : 'mixed';
    const lines = [
        'Elevator Parking — batch summary',
        batchSettingsLine(n, baseSeed),
        `Idle ${formatIdleFracPct(overallIdle)} · ${overallRegime}`,
        `objective: minimize ${cfg.label}`,
        '',
        `Ranked by mean ${cfg.label}:`,
    ];
    const ranked = [...summary].sort((a, b) => a[cfg.meanKey] - b[cfg.meanKey]);
    ranked.forEach((s, i) => {
        lines.push(
            `${i + 1}. ${STRATEGY_LABELS[s.strategy]}  ` +
            `avgWait ${s.meanWait.toFixed(2)}±${s.stdWait.toFixed(2)}  ` +
            `maxWait ${s.meanMaxWait.toFixed(2)}  ` +
            `empty ${s.meanEmpty.toFixed(1)}  ` +
            `idle ${formatIdleFracPct(s.meanIdleFrac)}  ` +
            `ticks ${s.meanTicks.toFixed(1)}  ` +
            `win ${s.winRate.toFixed(0)}%  ` +
            `incomplete ${s.incomplete}`
        );
    });
    lines.push('');
    return lines.join('\n');
}

function downloadCsv(rows) {
    const blob = new Blob([formatBatchCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elevator-batch-${scenarioSeed}-n${rows.length / STRATEGIES.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function renderBatchSummary(summary) {
    const tbody = document.querySelector('#batch-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const cfg = RANK_METRICS[batchRankMetric] || RANK_METRICS.avgWait;
    const ranked = [...summary].sort((a, b) => a[cfg.meanKey] - b[cfg.meanKey]);

    const theadCells = document.querySelectorAll('#batch-table thead th');
    theadCells.forEach((th, idx) => {
        th.classList.toggle('is-objective', idx === cfg.colIndex);
    });

    if (summary[0]) {
        const n = summary[0].n;
        const baseSeed = batchRows.length ? batchRows[0].seed : scenarioSeed;
        const seedCount = batchRows.length / STRATEGIES.length;
        const regimeHint = `Idle ${formatIdleFracPct(summary[0].overallIdleFrac)} · ${summary[0].overallRegime}`;
        renderBatchSettings(seedCount || n, baseSeed, regimeHint);
    }

    ranked.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.classList.add(`rank-${i + 1}`);
        if (s.incomplete > 0) tr.classList.add('incomplete');
        const win = Math.max(0, Math.min(100, s.winRate));
        const cells = [
            `<td class="col-rank">${i + 1}</td>`,
            `<td><span class="strategy-name">${STRATEGY_LABELS[s.strategy]}</span></td>`,
            `<td class="num${batchRankMetric === 'avgWait' ? ' is-objective' : ''}">${s.meanWait.toFixed(2)}</td>`,
            `<td class="num">${s.stdWait.toFixed(2)}</td>`,
            `<td class="num${batchRankMetric === 'maxWait' ? ' is-objective' : ''}">${s.meanMaxWait.toFixed(1)}</td>`,
            `<td class="num${batchRankMetric === 'emptyTravel' ? ' is-objective' : ''}">${s.meanEmpty.toFixed(1)}</td>`,
            `<td class="num">${formatIdleFracPct(s.meanIdleFrac)}</td>`,
            `<td class="num${batchRankMetric === 'ticks' ? ' is-objective' : ''}">${s.meanTicks.toFixed(1)}</td>`,
            `<td class="col-win">
                <div class="win-cell">
                    <div class="win-bar" aria-hidden="true"><span style="width:${win}%"></span></div>
                    <span class="win-pct">${s.winRate.toFixed(0)}%</span>
                </div>
            </td>`,
            `<td class="num">${s.incomplete}</td>`,
        ];
        tr.innerHTML = cells.join('');
        tbody.appendChild(tr);
    });
}

function applyBatchRankMetric(metric) {
    if (!RANK_METRICS[metric]) return;
    batchRankMetric = metric;
    document.querySelectorAll('.rank-metric-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.metric === metric);
    });
    if (!batchRows.length) return;
    lastBatchSummary = summarizeBatch(batchRows, batchRankMetric);
    renderBatchSummary(lastBatchSummary);
}

function setBatchBusy(busy) {
    batchRunning = busy;
    const btn = document.getElementById('btn-batch');
    if (btn) btn.disabled = busy;
    const nInput = document.getElementById('batch-n');
    if (nInput) nInput.disabled = busy;
    document.getElementById('btn-compare').disabled = busy;
}

function yieldToUi() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function runBatchCompare() {
    if (batchRunning) return;
    stopSim();
    readControls();

    const nInput = document.getElementById('batch-n');
    let n = nInput ? Number(nInput.value) : 100;
    if (!Number.isFinite(n)) n = 100;
    n = clamp(Math.floor(n), 1, 200);

    const baseSeed = scenarioSeed;
    const savedStrategy = parkingStrategy;
    const panel = document.getElementById('batch-panel');
    const progress = document.getElementById('batch-progress');
    const csvBtn = document.getElementById('btn-batch-csv');
    const copyBtn = document.getElementById('btn-batch-copy');

    batchRows = [];
    lastBatchSummary = null;
    if (csvBtn) csvBtn.disabled = true;
    if (copyBtn) copyBtn.disabled = true;
    renderBatchSettings(n, baseSeed);
    setBatchProgress(0, n, `Running seed 0 / ${n}…`);
    if (panel) {
        panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const tbody = document.querySelector('#batch-table tbody');
    if (tbody) tbody.innerHTML = '';

    setBatchBusy(true);

    try {
        for (let i = 0; i < n; i++) {
            scenarioSeed = baseSeed + i;
            const seedInput = document.getElementById('seed-input');
            if (seedInput) seedInput.value = String(scenarioSeed);
            scenarioKey = '';
            ensureScenario(true);

            const meta = {
                seed: scenarioSeed,
                peak: peakMode,
                interfloor: Math.round(interfloorRate * 100),
                dwell: doorDwell,
                floors,
                elevators: elevatorCount,
                capacity,
                arrival: Math.round(arrivalRate * 100),
                target: targetPassengers,
                trips: scenario.length,
            };

            for (const strategy of STRATEGIES) {
                const m = runHeadless(strategy);
                batchRows.push({
                    ...meta,
                    strategy: m.strategy,
                    avgWait: m.avgWait,
                    maxWait: m.maxWait,
                    emptyTravel: m.emptyTravel,
                    idleFrac: m.idleFrac,
                    ticks: m.ticks,
                    completed: m.completed,
                });
            }

            setBatchProgress(i + 1, n, `Running seed ${i + 1} / ${n}…`);
            if (i % 2 === 1 || i === n - 1) await yieldToUi();
        }

        lastBatchSummary = summarizeBatch(batchRows, batchRankMetric);
        renderBatchSummary(lastBatchSummary);
        setBatchProgress(n, n, `Done · ${n} seeds · ${batchRows.length} rows`);
        if (csvBtn) csvBtn.disabled = false;
        if (copyBtn) copyBtn.disabled = false;
    } finally {
        document.getElementById('strategy-select').value = savedStrategy;
        parkingStrategy = savedStrategy;
        scenarioSeed = baseSeed;
        const seedInput = document.getElementById('seed-input');
        if (seedInput) seedInput.value = String(baseSeed);
        scenarioKey = '';
        ensureScenario(true);
        resetRuntimeState();
        initBuildingDOM();
        render();
        updateDashboard();
        updatePlayLabel();
        setBatchBusy(false);
    }
}

async function copyBatchSummary() {
    if (!lastBatchSummary || !batchRows.length) return;
    const n = batchRows.length / STRATEGIES.length;
    const baseSeed = batchRows[0].seed;
    const text = formatBatchSummaryText(lastBatchSummary, n, baseSeed);
    const btn = document.getElementById('btn-batch-copy');
    const label = btn ? btn.textContent : 'Copy summary';
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (btn) {
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = label; }, 1200);
        }
    } catch (err) {
        console.error(err);
        if (btn) {
            btn.textContent = 'Copy failed';
            setTimeout(() => { btn.textContent = label; }, 1500);
        }
    }
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

(function bindRewindHold() {
    const btn = document.getElementById('btn-rewind');
    if (!btn) return;
    let holdTimer = null;
    let holdInterval = null;
    let holding = false;
    let shiftHeld = false;

    function stepSize() {
        return shiftHeld ? 10 : 1;
    }

    function stopHold() {
        holding = false;
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        if (holdInterval) {
            clearInterval(holdInterval);
            holdInterval = null;
        }
    }

    function doRewind() {
        if (btn.disabled || tickCount <= 0) {
            stopHold();
            return;
        }
        rewindTicks(stepSize());
        if (tickCount <= 0) stopHold();
    }

    btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        shiftHeld = e.shiftKey;
        holding = true;
        doRewind();
        holdTimer = setTimeout(() => {
            if (!holding) return;
            holdInterval = setInterval(doRewind, 70);
        }, 280);
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    });

    btn.addEventListener('pointerup', stopHold);
    btn.addEventListener('pointercancel', stopHold);
    btn.addEventListener('pointerleave', stopHold);
    btn.addEventListener('lostpointercapture', stopHold);
    window.addEventListener('blur', stopHold);
    window.addEventListener('keydown', (e) => { if (e.key === 'Shift') shiftHeld = true; });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') shiftHeld = false; });
})();

document.getElementById('btn-step').addEventListener('click', stepForward);
document.getElementById('btn-reset').addEventListener('click', () => resetSimulation({ newScenario: false }));
document.getElementById('btn-copy-debug').addEventListener('click', () => { copyDebugSnapshot(); });
document.getElementById('btn-new-scenario').addEventListener('click', () => {
    const next = (Math.floor(Math.random() * 90000) + 10000);
    document.getElementById('seed-input').value = String(next);
    scenarioSeed = next;
    resetSimulation({ newScenario: true });
});
document.getElementById('btn-compare').addEventListener('click', compareStrategies);
document.getElementById('btn-compare-close').addEventListener('click', () => {
    document.getElementById('compare-panel').hidden = true;
});
document.getElementById('btn-batch').addEventListener('click', () => { runBatchCompare(); });
document.getElementById('btn-batch-close').addEventListener('click', () => {
    document.getElementById('batch-panel').hidden = true;
});
document.getElementById('btn-batch-csv').addEventListener('click', () => {
    if (batchRows.length) downloadCsv(batchRows);
});
document.getElementById('btn-batch-copy').addEventListener('click', () => { copyBatchSummary(); });
document.querySelectorAll('.rank-metric-btn').forEach(btn => {
    btn.addEventListener('click', () => applyBatchRankMetric(btn.dataset.metric));
});

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
    const controls = document.getElementById('sim-controls');
    const open = controls.classList.toggle('open');
    document.getElementById('mobile-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
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
