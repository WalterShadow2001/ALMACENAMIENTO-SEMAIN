-- =====================================================
-- SCRIPT SQL PARA TURSO (PostgreSQL-compatible)
-- Sistema de Requisiciones y Producción
-- =====================================================
-- 
-- NOTA: Este script es para referencia. Al usar Prisma con Turso,
-- las tablas se crean automáticamente con `prisma db push` o `prisma migrate dev`.
-- Turso usa libSQL (compatible con SQLite).
-- 
-- Para crear las tablas en Turso, simplemente:
-- 1. Configura DATABASE_URL en .env con tu URL de Turso
-- 2. Ejecuta: npx prisma db push
-- 3. Ejecuta: npx prisma db seed
--
-- Si prefieres crear las tablas manualmente, usa este script:
-- =====================================================

-- Users
CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USUARIO',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Sessions
CREATE TABLE IF NOT EXISTS Session (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suppliers
CREATE TABLE IF NOT EXISTS Supplier (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS InventoryItem (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    minStock INTEGER NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'PIEZA',
    location TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Product Suppliers (many-to-many)
CREATE TABLE IF NOT EXISTS ProductSupplier (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL REFERENCES InventoryItem(id) ON DELETE CASCADE,
    supplierId TEXT NOT NULL REFERENCES Supplier(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    leadDays INTEGER NOT NULL DEFAULT 7,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Requisitions
CREATE TABLE IF NOT EXISTS Requisition (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    priority TEXT NOT NULL DEFAULT 'MEDIA',
    createdById TEXT NOT NULL REFERENCES User(id),
    approvedById TEXT REFERENCES User(id),
    approvedAt TEXT,
    completedAt TEXT,
    supplierId TEXT REFERENCES Supplier(id),
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Requisition Items
CREATE TABLE IF NOT EXISTS RequisitionItem (
    id TEXT PRIMARY KEY,
    requisitionId TEXT NOT NULL REFERENCES Requisition(id) ON DELETE CASCADE,
    inventoryItemId TEXT NOT NULL REFERENCES InventoryItem(id),
    quantity INTEGER NOT NULL,
    notes TEXT
);

-- Material Types
CREATE TABLE IF NOT EXISTS MaterialType (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Material Stock (barras)
CREATE TABLE IF NOT EXISTS MaterialStock (
    id TEXT PRIMARY KEY,
    typeId TEXT NOT NULL REFERENCES MaterialType(id) ON DELETE CASCADE,
    shape TEXT NOT NULL,
    diameter REAL,
    width REAL,
    thickness REAL,
    lengthTotal REAL NOT NULL DEFAULT 0,
    lengthAvailable REAL NOT NULL DEFAULT 0,
    location TEXT,
    weightPerMeter REAL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Special Materials (Prolab, Resina, etc.)
CREATE TABLE IF NOT EXISTS SpecialMaterial (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    stockKg REAL NOT NULL DEFAULT 0,
    minStockKg REAL NOT NULL DEFAULT 5,
    unitCost REAL,
    supplier TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Tool Types
CREATE TABLE IF NOT EXISTS ToolType (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Consumable Tools
CREATE TABLE IF NOT EXISTS ConsumableTool (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    typeId TEXT NOT NULL REFERENCES ToolType(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    minStock INTEGER NOT NULL DEFAULT 3,
    averageLifeSpan INTEGER,
    unit TEXT NOT NULL DEFAULT 'PIEZA',
    location TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Projects (Mandriles/Fixturas)
CREATE TABLE IF NOT EXISTS Project (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    priority TEXT NOT NULL DEFAULT 'MEDIA',
    wastePercent REAL NOT NULL DEFAULT 1.5,
    startDate TEXT,
    dueDate TEXT,
    completedAt TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Project Components
CREATE TABLE IF NOT EXISTS ProjectComponent (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    materialTypeId TEXT REFERENCES MaterialType(id),
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Material Reservations
CREATE TABLE IF NOT EXISTS MaterialReservation (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
    materialStockId TEXT NOT NULL REFERENCES MaterialStock(id),
    lengthReserved REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVA',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL
);

-- Production Logs
CREATE TABLE IF NOT EXISTS ProductionLog (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES User(id),
    action TEXT NOT NULL,
    details TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tool Usage
CREATE TABLE IF NOT EXISTS ToolUsage (
    id TEXT PRIMARY KEY,
    toolId TEXT NOT NULL REFERENCES ConsumableTool(id),
    projectId TEXT REFERENCES Project(id),
    userId TEXT NOT NULL REFERENCES User(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== ÍNDICES ====================
CREATE INDEX IF NOT EXISTS idx_session_token ON Session(token);
CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON InventoryItem(category);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON InventoryItem(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON InventoryItem(active);
CREATE INDEX IF NOT EXISTS idx_requisition_status ON Requisition(status);
CREATE INDEX IF NOT EXISTS idx_requisition_createdById ON Requisition(createdById);
CREATE INDEX IF NOT EXISTS idx_material_stock_typeId ON MaterialStock(typeId);
CREATE INDEX IF NOT EXISTS idx_material_stock_shape ON MaterialStock(shape);
CREATE INDEX IF NOT EXISTS idx_project_type ON Project(type);
CREATE INDEX IF NOT EXISTS idx_project_status ON Project(status);
CREATE INDEX IF NOT EXISTS idx_project_component_projectId ON ProjectComponent(projectId);
CREATE INDEX IF NOT EXISTS idx_reservation_projectId ON MaterialReservation(projectId);
CREATE INDEX IF NOT EXISTS idx_reservation_materialStockId ON MaterialReservation(materialStockId);
CREATE INDEX IF NOT EXISTS idx_production_log_projectId ON ProductionLog(projectId);
CREATE INDEX IF NOT EXISTS idx_tool_usage_toolId ON ToolUsage(toolId);
CREATE INDEX IF NOT EXISTS idx_tool_usage_userId ON ToolUsage(userId);
