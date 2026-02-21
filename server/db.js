import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'fleetflow.db');

const SQL = await initSqlJs();
const dbBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
const rawDb = new SQL.Database(dbBuffer);

function save() {
    fs.writeFileSync(dbPath, Buffer.from(rawDb.export()));
}

rawDb.run('PRAGMA foreign_keys = ON');

function prepare(sql) {
    return {
        get(...params) {
            const stmt = rawDb.prepare(sql);
            stmt.bind(params);
            const row = stmt.step() ? stmt.getAsObject() : undefined;
            stmt.free();
            return row;
        },
        all(...params) {
            const stmt = rawDb.prepare(sql);
            stmt.bind(params);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
            return rows;
        },
        run(...params) {
            const stmt = rawDb.prepare(sql);
            stmt.bind(params);
            stmt.step();
            stmt.free();
            const lastInsertRowid = rawDb.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0;
            const changes = rawDb.getRowsModified();
            save();
            return { lastInsertRowid, changes };
        }
    };
}

function exec(sql) {
    rawDb.exec(sql);
    save();
}

function transaction(fn) {
    rawDb.run('BEGIN');
    try {
        const result = fn();
        rawDb.run('COMMIT');
        save();
        return result;
    } catch (e) {
        rawDb.run('ROLLBACK');
        throw e;
    }
}

const db = {
    exec,
    prepare,
    transaction
};

// ── Schema ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('manager','dispatcher','safety_officer','analyst'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    model           TEXT NOT NULL,
    plate           TEXT UNIQUE NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('Truck','Van','Bike')),
    maxCapacity     REAL NOT NULL,
    odometer        REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','On Trip','In Shop','Retired')),
    region          TEXT NOT NULL DEFAULT 'Central',
    acquisitionCost REAL NOT NULL DEFAULT 0,
    createdAt       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    licenseNumber   TEXT UNIQUE NOT NULL,
    licenseCategory TEXT NOT NULL,
    licenseExpiry   TEXT NOT NULL,
    safetyScore     REAL NOT NULL DEFAULT 100,
    status          TEXT NOT NULL DEFAULT 'Off Duty' CHECK(status IN ('On Duty','Off Duty','Suspended')),
    tripsCompleted  INTEGER NOT NULL DEFAULT 0,
    tripsCancelled  INTEGER NOT NULL DEFAULT 0,
    createdAt       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleId      INTEGER NOT NULL REFERENCES vehicles(id),
    driverId       INTEGER NOT NULL REFERENCES drivers(id),
    origin         TEXT NOT NULL,
    destination    TEXT NOT NULL,
    cargoWeight    REAL NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Dispatched','Completed','Cancelled')),
    createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
    dispatchedAt   TEXT,
    completedAt    TEXT,
    odometerStart  REAL,
    odometerEnd    REAL
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleId    INTEGER NOT NULL REFERENCES vehicles(id),
    serviceType  TEXT NOT NULL,
    cost         REAL NOT NULL DEFAULT 0,
    notes        TEXT,
    status       TEXT NOT NULL DEFAULT 'In Progress' CHECK(status IN ('In Progress','Completed')),
    createdAt    TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt  TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleId  INTEGER NOT NULL REFERENCES vehicles(id),
    tripId     INTEGER REFERENCES trips(id),
    type       TEXT NOT NULL DEFAULT 'Fuel' CHECK(type IN ('Fuel','Toll','Other')),
    liters     REAL,
    cost       REAL NOT NULL,
    date       TEXT NOT NULL DEFAULT (date('now'))
  );
`);

// ── Seed data (only if tables are empty) ────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?,?,?,?)');
    insertUser.run('manager@fleetflow.com', 'admin123', 'Ravi Kumar', 'manager');
    insertUser.run('dispatch@fleetflow.com', 'admin123', 'Priya Sharma', 'dispatcher');
    insertUser.run('safety@fleetflow.com', 'admin123', 'Amit Patel', 'safety_officer');
    insertUser.run('analyst@fleetflow.com', 'admin123', 'Neha Gupta', 'analyst');

    const insertVehicle = db.prepare(`INSERT INTO vehicles (name, model, plate, type, maxCapacity, odometer, status, region, acquisitionCost) VALUES (?,?,?,?,?,?,?,?,?)`);
    insertVehicle.run('Truck-01', 'Tata Ace', 'MH-12-AB-1234', 'Truck', 2000, 45200, 'Available', 'North', 1200000);
    insertVehicle.run('Truck-02', 'Ashok Leyland', 'MH-12-CD-5678', 'Truck', 5000, 78500, 'On Trip', 'South', 2500000);
    insertVehicle.run('Van-05', 'Maruti Eeco', 'MH-14-EF-9012', 'Van', 500, 32100, 'Available', 'Central', 450000);
    insertVehicle.run('Van-06', 'Mahindra Supro', 'MH-14-GH-3456', 'Van', 750, 28900, 'In Shop', 'East', 550000);
    insertVehicle.run('Bike-10', 'Bajaj Pulsar', 'MH-12-IJ-7890', 'Bike', 20, 15600, 'Available', 'West', 95000);
    insertVehicle.run('Bike-11', 'Honda CB Shine', 'MH-14-KL-1122', 'Bike', 15, 9800, 'Retired', 'Central', 85000);

    const insertDriver = db.prepare(`INSERT INTO drivers (name, licenseNumber, licenseCategory, licenseExpiry, safetyScore, status, tripsCompleted, tripsCancelled) VALUES (?,?,?,?,?,?,?,?)`);
    insertDriver.run('Alex Johnson', 'DL-2024-001', 'Truck,Van', '2027-06-15', 92, 'Off Duty', 45, 2);
    insertDriver.run('Rahul Verma', 'DL-2024-002', 'Van,Bike', '2025-01-10', 88, 'On Duty', 38, 1);
    insertDriver.run('Sam Wilson', 'DL-2024-003', 'Truck,Van,Bike', '2027-12-01', 95, 'Off Duty', 62, 0);
    insertDriver.run('Deepa Nair', 'DL-2024-004', 'Van,Bike', '2024-03-20', 78, 'Suspended', 25, 5);
    insertDriver.run('Karan Singh', 'DL-2024-005', 'Truck', '2027-09-30', 90, 'Off Duty', 51, 3);

    const insertTrip = db.prepare(`INSERT INTO trips (vehicleId, driverId, origin, destination, cargoWeight, status, createdAt, dispatchedAt, completedAt, odometerStart, odometerEnd) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    insertTrip.run(2, 2, 'Mumbai Warehouse', 'Pune Hub', 4500, 'Dispatched', '2026-02-20 08:00:00', '2026-02-20 09:00:00', null, 78500, null);
    insertTrip.run(1, 1, 'Delhi Depot', 'Jaipur Center', 1800, 'Completed', '2026-02-18 06:00:00', '2026-02-18 07:00:00', '2026-02-18 18:00:00', 44800, 45200);
    insertTrip.run(3, 3, 'Nagpur Depot', 'Hyderabad Depot', 400, 'Completed', '2026-02-15 05:00:00', '2026-02-15 06:00:00', '2026-02-16 14:00:00', 31500, 32100);
    insertTrip.run(5, 2, 'Local Pickup', 'Customer Drop', 15, 'Completed', '2026-02-19 10:00:00', '2026-02-19 10:30:00', '2026-02-19 11:00:00', 15400, 15600);

    const insertMaint = db.prepare(`INSERT INTO maintenance (vehicleId, serviceType, cost, notes, status, createdAt, completedAt) VALUES (?,?,?,?,?,?,?)`);
    insertMaint.run(4, 'Oil Change', 3500, 'Routine 10k km service', 'In Progress', '2026-02-20 10:00:00', null);
    insertMaint.run(1, 'Brake Pad Replacement', 8500, 'Front and rear pads replaced', 'Completed', '2026-02-10 08:00:00', '2026-02-11 16:00:00');
    insertMaint.run(2, 'Tire Rotation', 4200, 'All 6 tires rotated', 'Completed', '2026-02-05 09:00:00', '2026-02-05 14:00:00');

    const insertExpense = db.prepare(`INSERT INTO expenses (vehicleId, tripId, type, liters, cost, date) VALUES (?,?,?,?,?,?)`);
    insertExpense.run(1, 2, 'Fuel', 45, 4725, '2026-02-18');
    insertExpense.run(2, 1, 'Fuel', 120, 12600, '2026-02-20');
    insertExpense.run(3, 3, 'Fuel', 38, 3990, '2026-02-15');
    insertExpense.run(5, 4, 'Fuel', 5, 525, '2026-02-19');
    insertExpense.run(1, 2, 'Toll', null, 850, '2026-02-18');
    insertExpense.run(2, 1, 'Toll', null, 1200, '2026-02-20');
}

export default db;
