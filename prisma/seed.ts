import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== USERS ====================
  const adminPass = await bcrypt.hash('admin123', 12);
  const supPass = await bcrypt.hash('supervisor123', 12);
  const userPass = await bcrypt.hash('usuario123', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: adminPass, name: 'Administrador', role: 'ADMIN' },
  });

  const supervisor = await prisma.user.upsert({
    where: { username: 'supervisor' },
    update: {},
    create: { username: 'supervisor', password: supPass, name: 'Supervisor', role: 'SUPERVISOR' },
  });

  const user = await prisma.user.upsert({
    where: { username: 'usuario' },
    update: {},
    create: { username: 'usuario', password: userPass, name: 'Usuario Operativo', role: 'USUARIO' },
  });

  console.log('✅ Users created:', { admin: admin.username, supervisor: supervisor.username, user: user.username });

  // ==================== SUPPLIERS ====================
  const supplier1 = await prisma.supplier.create({
    data: { name: ' Aceros de México S.A.', contact: 'Carlos López', phone: '555-1001', email: 'ventas@acerosmex.com', address: 'Av. Industrial 125, CDMX' },
  });
  const supplier2 = await prisma.supplier.create({
    data: { name: 'Aluminios del Norte', contact: 'María García', phone: '555-1002', email: 'info@aluminorte.com', address: 'Blvd. Norte 340, Monterrey' },
  });
  const supplier3 = await prisma.supplier.create({
    data: { name: 'Herramientas Pro', contact: 'Roberto Sánchez', phone: '555-1003', email: 'contacto@herpro.com', address: 'Calle Fábrica 89, Querétaro' },
  });

  console.log('✅ Suppliers created:', supplier1.name, supplier2.name, supplier3.name);

  // ==================== INVENTORY ====================
  const items = [
    { name: 'Taladro de columna', description: 'Taladro de columna industrial 3/4 HP', sku: 'HERR-001', category: 'HERRAMIENTAS', quantity: 3, minStock: 1, unit: 'PIEZA', location: 'Área A-1' },
    { name: 'Torno CNC', description: 'Torno CNC de 3 ejes', sku: 'HERR-002', category: 'HERRAMIENTAS', quantity: 2, minStock: 1, unit: 'PIEZA', location: 'Área A-2' },
    { name: 'Fresadora vertical', description: 'Fresadora vertical Bridgeport', sku: 'HERR-003', category: 'HERRAMIENTAS', quantity: 1, minStock: 1, unit: 'PIEZA', location: 'Área A-3' },
    { name: 'Acero 4140 (barra 1")', description: 'Barra de acero 4140 de 1 pulgada', sku: 'MAT-001', category: 'MATERIAS_PRIMAS', quantity: 50, minStock: 20, unit: 'PIEZA', location: 'Almacén B-1' },
    { name: 'Aluminio 6061 (barra 3/4")', description: 'Barra de aluminio 6061 de 3/4 pulgada', sku: 'MAT-002', category: 'MATERIAS_PRIMAS', quantity: 30, minStock: 15, unit: 'PIEZA', location: 'Almacén B-2' },
    { name: 'Aceite de corte', description: 'Aceite soluble para corte de metales', sku: 'CON-001', category: 'CONSUMIBLES', quantity: 15, minStock: 5, unit: 'LITRO', location: 'Almacén C-1' },
    { name: 'Desengrasante industrial', description: 'Desengrasante para limpieza de piezas', sku: 'CON-002', category: 'CONSUMIBLES', quantity: 8, minStock: 3, unit: 'GALON', location: 'Almacén C-2' },
    { name: 'Diseño Mandril M-200', description: 'Plano de diseño para mandril M-200', sku: 'DIS-001', category: 'DISENOS', quantity: 1, minStock: 1, unit: 'ARCHIVO', location: 'Sistema' },
  ];

  const inventoryItems = [];
  for (const item of items) {
    const created = await prisma.inventoryItem.create({ data: item });
    inventoryItems.push(created);
  }

  // Link suppliers to products
  await prisma.productSupplier.create({ data: { productId: inventoryItems[3].id, supplierId: supplier1.id, price: 45.50, leadDays: 5 } });
  await prisma.productSupplier.create({ data: { productId: inventoryItems[4].id, supplierId: supplier2.id, price: 38.00, leadDays: 7 } });
  await prisma.productSupplier.create({ data: { productId: inventoryItems[5].id, supplierId: supplier3.id, price: 12.75, leadDays: 3 } });

  console.log('✅ Inventory items created:', inventoryItems.length);

  // ==================== MATERIAL TYPES ====================
  const matTypes = [
    { name: 'Acero 4140', description: 'Acero aleado al cromo-molibdeno' },
    { name: 'Acero 1045', description: 'Acero al carbono medio' },
    { name: 'Aluminio 6061', description: 'Aluminio aleado, tratamiento T6' },
    { name: 'Aluminio 7075', description: 'Aluminio de alta resistencia' },
    { name: 'Acero Inoxidable 304', description: 'Acero inoxidable austenítico' },
    { name: 'Acero Inoxidable 316', description: 'Acero inoxidable grado marino' },
    { name: 'Bronce C93200', description: 'Bronce para bujes y cojinetes' },
    { name: 'Brass C36000', description: 'Latón de maquinado libre' },
  ];

  for (const mt of matTypes) {
    await prisma.materialType.create({ data: mt });
  }

  console.log('✅ Material types created:', matTypes.length);

  // ==================== MATERIAL STOCK ====================
  const materialTypeList = await prisma.materialType.findMany();
  const stockItems = [
    { typeId: materialTypeList[0].id, shape: 'REDONDA', diameter: 25.4, width: null, thickness: null, lengthTotal: 6000, lengthAvailable: 6000, location: 'Rack R-1', weightPerMeter: 3.95 },
    { typeId: materialTypeList[0].id, shape: 'REDONDA', diameter: 50.8, width: null, thickness: null, lengthTotal: 4000, lengthAvailable: 4000, location: 'Rack R-1', weightPerMeter: 15.8 },
    { typeId: materialTypeList[0].id, shape: 'REDONDA', diameter: 76.2, width: null, thickness: null, lengthTotal: 3000, lengthAvailable: 2800, location: 'Rack R-2', weightPerMeter: 35.6 },
    { typeId: materialTypeList[2].id, shape: 'REDONDA', diameter: 19.05, width: null, thickness: null, lengthTotal: 5000, lengthAvailable: 5000, location: 'Rack R-3', weightPerMeter: 0.75 },
    { typeId: materialTypeList[2].id, shape: 'REDONDA', diameter: 38.1, width: null, thickness: null, lengthTotal: 3500, lengthAvailable: 3500, location: 'Rack R-3', weightPerMeter: 2.97 },
    { typeId: materialTypeList[4].id, shape: 'REDONDA', diameter: 25.4, width: null, thickness: null, lengthTotal: 3000, lengthAvailable: 2500, location: 'Rack R-4', weightPerMeter: 4.1 },
    { typeId: materialTypeList[4].id, shape: 'LAMINA', diameter: null, width: 1220, thickness: 3, lengthTotal: 10000, lengthAvailable: 10000, location: 'Rack L-1', weightPerMeter: 24.0 },
    { typeId: materialTypeList[1].id, shape: 'REDONDA', diameter: 50.8, width: null, thickness: null, lengthTotal: 4000, lengthAvailable: 3800, location: 'Rack R-5', weightPerMeter: 15.8 },
    { typeId: materialTypeList[2].id, shape: 'CUADRADA', diameter: null, width: 25.4, thickness: null, lengthTotal: 4000, lengthAvailable: 4000, location: 'Rack S-1', weightPerMeter: 1.73 },
    { typeId: materialTypeList[4].id, shape: 'TUBULAR', diameter: 50.8, width: null, thickness: 2, lengthTotal: 6000, lengthAvailable: 6000, location: 'Rack T-1', weightPerMeter: 2.41 },
  ];

  for (const s of stockItems) {
    await prisma.materialStock.create({ data: s });
  }

  console.log('✅ Material stock created:', stockItems.length);

  // ==================== SPECIAL MATERIALS ====================
  await prisma.specialMaterial.create({ data: { name: 'Prolab', description: 'Resina de alta precisión para prototipos', stockKg: 25, minStockKg: 5, unitCost: 850, supplier: '3D Systems México' } });
  await prisma.specialMaterial.create({ data: { name: 'Resina PETG', description: 'Resina para impresión 3D funcional', stockKg: 15, minStockKg: 3, unitCost: 420, supplier: 'Filamentos MX' } });
  await prisma.specialMaterial.create({ data: { name: 'Epoxy Industrial', description: 'Resina epóxica de dos componentes', stockKg: 10, minStockKg: 2, unitCost: 650, supplier: 'Química Industrial' } });

  console.log('✅ Special materials created: 3');

  // ==================== TOOL TYPES ====================
  const toolTypes = [
    { name: 'Insertos de Corte', description: 'Insertos CNMG, DNMG, TNMG, etc.' },
    { name: 'Brocas', description: 'Brocas de metal de varios diámetros' },
    { name: 'Fresas', description: 'Fresas de canal, plano, punta de bola' },
    { name: 'Cortadores', description: 'Cortadores de ranura, cortadores de cara' },
    { name: 'Machuelos', description: 'Machuelos para roscado interior' },
    { name: 'Escariadores', description: 'Escariadores para acabado de agujeros' },
  ];

  const createdToolTypes = [];
  for (const tt of toolTypes) {
    const ct = await prisma.toolType.create({ data: tt });
    createdToolTypes.push(ct);
  }

  console.log('✅ Tool types created:', toolTypes.length);

  // ==================== CONSUMABLE TOOLS ====================
  const tools = [
    { name: 'Inserto CNMG 120404', typeId: createdToolTypes[0].id, description: 'Inserto de corte para torneado', quantity: 20, minStock: 5, averageLifeSpan: 30, unit: 'PIEZA', location: 'Gaveta T-1' },
    { name: 'Inserto DNMG 150604', typeId: createdToolTypes[0].id, description: 'Inserto de corte para torneado negativo', quantity: 15, minStock: 5, averageLifeSpan: 25, unit: 'PIEZA', location: 'Gaveta T-1' },
    { name: 'Broca 6mm HSS', typeId: createdToolTypes[1].id, description: 'Broca de acero rápido 6mm', quantity: 10, minStock: 3, averageLifeSpan: 50, unit: 'PIEZA', location: 'Gaveta T-2' },
    { name: 'Broca 10mm HSS', typeId: createdToolTypes[1].id, description: 'Broca de acero rápido 10mm', quantity: 8, minStock: 3, averageLifeSpan: 40, unit: 'PIEZA', location: 'Gaveta T-2' },
    { name: 'Fresa de canal 6mm', typeId: createdToolTypes[2].id, description: 'Fresa de dos labios 6mm', quantity: 6, minStock: 2, averageLifeSpan: 20, unit: 'PIEZA', location: 'Gaveta T-3' },
    { name: 'Fresa de punta bola 8mm', typeId: createdToolTypes[2].id, description: 'Fresa de punta bola carburo 8mm', quantity: 4, minStock: 2, averageLifeSpan: 15, unit: 'PIEZA', location: 'Gaveta T-3' },
    { name: 'Cortador de ranura 3mm', typeId: createdToolTypes[3].id, description: 'Cortador de ranura 3mm de ancho', quantity: 5, minStock: 2, averageLifeSpan: 25, unit: 'PIEZA', location: 'Gaveta T-4' },
    { name: 'Machuelo M8', typeId: createdToolTypes[4].id, description: 'Machuelo M8x1.25 HSS-E', quantity: 3, minStock: 2, averageLifeSpan: 100, unit: 'PIEZA', location: 'Gaveta T-5' },
  ];

  for (const t of tools) {
    await prisma.consumableTool.create({ data: t });
  }

  console.log('✅ Consumable tools created:', tools.length);

  // ==================== SAMPLE PROJECTS ====================
  const project1 = await prisma.project.create({
    data: {
      name: 'Mandril M-200 Rev.2',
      description: 'Rediseño de mandril para equipo de extracción M-200, revisión 2',
      type: 'MANDRIL',
      status: 'EN_PRODUCCION',
      priority: 'ALTA',
      wastePercent: 2.5,
      startDate: new Date('2026-03-15'),
      dueDate: new Date('2026-04-15'),
      components: {
        create: [
          { name: 'Cuerpo principal', description: 'Cuerpo cilíndrico del mandril', quantity: 1, materialTypeId: materialTypeList[0].id, status: 'EN_PRODUCCION' },
          { name: 'Mordazas (set)', description: 'Set de 3 mordazas intercambiables', quantity: 3, materialTypeId: materialTypeList[4].id, status: 'EN_CORTE' },
          { name: 'Eje central', description: 'Eje de acero 4140 tratado', quantity: 1, materialTypeId: materialTypeList[0].id, status: 'EN_PRODUCCION' },
          { name: 'Anillo de retención', description: 'Anillo de seguridad', quantity: 2, materialTypeId: materialTypeList[6].id, status: 'PENDIENTE' },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Fixtura de Inspección FI-100',
      description: 'Fixtura para inspección dimensional de piezas torneadas',
      type: 'FIXTURA',
      status: 'EN_DISENO',
      priority: 'MEDIA',
      wastePercent: 1.5,
      startDate: new Date('2026-03-20'),
      dueDate: new Date('2026-05-01'),
      components: {
        create: [
          { name: 'Base', description: 'Base de aluminio anodizado', quantity: 1, materialTypeId: materialTypeList[2].id, status: 'EN_DISENO' },
          { name: 'Platillos de soporte', description: 'Platillos ajustables', quantity: 4, materialTypeId: materialTypeList[2].id, status: 'EN_DISENO' },
        ],
      },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Mandril M-150 Standard',
      description: 'Mandril estándar para línea de producción M-150',
      type: 'MANDRIL',
      status: 'COMPLETADO',
      priority: 'ALTA',
      wastePercent: 2.0,
      startDate: new Date('2026-02-01'),
      dueDate: new Date('2026-03-10'),
      completedAt: new Date('2026-03-08'),
      components: {
        create: [
          { name: 'Cuerpo principal', description: 'Cuerpo del mandril M-150', quantity: 1, status: 'COMPLETADO' },
          { name: 'Mordazas', description: 'Set de mordazas', quantity: 4, status: 'COMPLETADO' },
        ],
      },
    },
  });

  const project4 = await prisma.project.create({
    data: {
      name: 'Fixtura de Soldadura FS-050',
      description: 'Fixtura para soldadura automatizada de tubos',
      type: 'FIXTURA',
      status: 'PAUSADO',
      priority: 'BAJA',
      wastePercent: 1.5,
      dueDate: new Date('2026-06-01'),
    },
  });

  const project5 = await prisma.project.create({
    data: {
      name: 'Mandril M-300 Pesado',
      description: 'Mandril de alta capacidad para equipo pesado',
      type: 'MANDRIL',
      status: 'MATERIALES_APARTADOS',
      priority: 'URGENTE',
      wastePercent: 3.5,
      startDate: new Date('2026-03-25'),
      dueDate: new Date('2026-04-20'),
      components: {
        create: [
          { name: 'Cuerpo reforzado', description: 'Cuerpo de acero 4140 diámetro grande', quantity: 1, materialTypeId: materialTypeList[0].id, status: 'PENDIENTE' },
          { name: 'Plato de montaje', description: 'Plato de acero inoxidable', quantity: 1, materialTypeId: materialTypeList[4].id, status: 'PENDIENTE' },
        ],
      },
    },
  });

  console.log('✅ Projects created: 5');

  // ==================== SAMPLE REQUISITIONS ====================
  await prisma.requisition.create({
    data: {
      title: 'Requisición de Acero 4140 para M-300',
      description: 'Se requiere acero 4140 para el mandril M-300 Pesado',
      status: 'APROBADA',
      priority: 'URGENTE',
      createdById: user.id,
      approvedById: supervisor.id,
      approvedAt: new Date(),
      supplierId: supplier1.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[3].id, quantity: 25, notes: 'Para mandril M-300' },
        ],
      },
    },
  });

  await prisma.requisition.create({
    data: {
      title: 'Requisición de Aceite de Corte',
      description: 'Reabastecimiento mensual de aceite de corte',
      status: 'PENDIENTE',
      priority: 'MEDIA',
      createdById: user.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[5].id, quantity: 10, notes: 'Reabastecimiento mensual' },
        ],
      },
    },
  });

  await prisma.requisition.create({
    data: {
      title: 'Insertos de corte CNMG',
      description: 'Pedido de emergencia de insertos para proyecto M-200',
      status: 'EN_CURSO',
      priority: 'ALTA',
      createdById: supervisor.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-03-28'),
      supplierId: supplier3.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[7].id, quantity: 10, notes: 'Pedido urgente' },
        ],
      },
    },
  });

  await prisma.requisition.create({
    data: {
      title: 'Fresas de canal 6mm',
      description: 'Reposición de fresas de canal agotadas',
      status: 'COMPLETADA',
      priority: 'MEDIA',
      createdById: user.id,
      approvedById: supervisor.id,
      approvedAt: new Date('2026-03-20'),
      completedAt: new Date('2026-03-25'),
      supplierId: supplier3.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[7].id, quantity: 8, notes: 'Reposición estándar' },
        ],
      },
    },
  });

  console.log('✅ Requisitions created: 4');

  // ==================== PRODUCTION LOGS ====================
  await prisma.productionLog.createMany({
    data: [
      { projectId: project1.id, userId: admin.id, action: 'STATUS_CHANGE', details: 'Estado cambiado a EN_PRODUCCION' },
      { projectId: project3.id, userId: admin.id, action: 'STATUS_CHANGE', details: 'Proyecto completado exitosamente' },
      { projectId: project4.id, userId: supervisor.id, action: 'STATUS_CHANGE', details: 'Proyecto pausado por falta de materiales' },
      { projectId: project5.id, userId: supervisor.id, action: 'STATUS_CHANGE', details: 'Materiales apartados del inventario' },
    ],
  });

  console.log('✅ Production logs created: 4');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Default users:');
  console.log('   Admin:     admin / admin123');
  console.log('   Supervisor: supervisor / supervisor123');
  console.log('   User:      usuario / usuario123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
