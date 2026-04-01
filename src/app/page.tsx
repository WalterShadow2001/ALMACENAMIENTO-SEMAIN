'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard, Package, Building2, ClipboardList, Cog, Wrench, Cylinder,
  FlaskConical, Hammer, Settings, Users, LogOut, Menu, X, Sun, Moon, Monitor,
  Plus, Search, Edit, Trash2, Eye, Check, XCircle, AlertTriangle, ChevronRight,
  RotateCcw, PlayCircle, PauseCircle, StopCircle, ArrowRight, Loader2,
  FolderOpen, Filter, Activity, TrendingUp, Clock, User as UserIcon
} from 'lucide-react';

// ==================== TYPES ====================
interface User { id: string; username: string; name: string; role: string; active?: boolean; }
interface InventoryItem { id: string; name: string; description?: string; sku: string; category: string; quantity: number; minStock: number; unit: string; location?: string; active: boolean; suppliers?: ProductSupplier[]; }
interface ProductSupplier { id: string; productId: string; supplierId: string; price: number; leadDays: number; supplier?: Supplier; }
interface Supplier { id: string; name: string; contact?: string; phone?: string; email?: string; address?: string; active: boolean; }
interface Requisition { id: string; title: string; description?: string; status: string; priority: string; createdById: string; approvedById?: string; approvedAt?: string; completedAt?: string; supplierId?: string; trackingNumber?: string; hasInvoice?: boolean; invoiceNumber?: string; items?: RequisitionItem[]; createdBy?: User; approvedBy?: User; supplier?: Supplier; createdAt: string; }
interface RequisitionItem { id: string; inventoryItemId: string; quantity: number; notes?: string; inventoryItem?: InventoryItem; }
interface MaterialType { id: string; name: string; description?: string; active: boolean; }
interface MaterialStock { id: string; typeId: string; shape: string; diameter?: number; width?: number; thickness?: number; lengthTotal: number; lengthAvailable: number; location?: string; weightPerMeter?: number; active: boolean; type?: MaterialType; reservations?: MaterialReservation[]; }
interface SpecialMaterial { id: string; name: string; description?: string; stockKg: number; minStockKg: number; unitCost?: number; supplier?: string; active: boolean; }
interface ToolType { id: string; name: string; description?: string; active: boolean; }
interface ConsumableTool { id: string; name: string; typeId: string; description?: string; quantity: number; minStock: number; averageLifeSpan?: number; unit: string; location?: string; active: boolean; type?: ToolType; }
interface Project { id: string; name: string; description?: string; type: string; status: string; priority: string; wastePercent: number; startDate?: string; dueDate?: string; completedAt?: string; notes?: string; components?: ProjectComponent[]; reservations?: MaterialReservation[]; logs?: ProductionLog[]; }
interface ProjectComponent { id: string; projectId: string; name: string; description?: string; quantity: number; materialTypeId?: string; status: string; materialType?: MaterialType; }
interface MaterialReservation { id: string; projectId: string; materialStockId: string; lengthReserved: number; status: string; materialStock?: MaterialStock; }
interface ProductionLog { id: string; action: string; details?: string; createdAt: string; user?: User; }
// ==================== CONSTANTS ====================
type View = 'dashboard' | 'inventory' | 'suppliers' | 'requisitions' | 'mandriles' | 'fixturas' | 'materials' | 'special-materials' | 'tools' | 'config' | 'users';

const CATEGORIES = ['HERRAMIENTAS', 'MATERIAS_PRIMAS', 'CONSUMIBLES', 'DISENOS', 'OTROS'];
const SHAPES = ['REDONDA', 'CUADRADA', 'LAMINA', 'TUBULAR'];
const PROJECT_STATUSES = ['PENDIENTE', 'EN_DISENO', 'MATERIALES_APARTADOS', 'EN_CORTE', 'EN_PRODUCCION', 'PAUSADO', 'COMPLETADO'];
const REQUISITION_STATUSES = ['PENDIENTE', 'APROBADA', 'EN_CURSO', 'COMPLETADA', 'DENEGADA'];
const PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
const ROLES = ['ADMIN', 'SUPERVISOR', 'USUARIO'];

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  EN_DISENO: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
  MATERIALES_APARTADOS: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/20',
  EN_CORTE: 'bg-purple-500/15 text-purple-500 border-purple-500/20',
  EN_PRODUCCION: 'bg-orange-500/15 text-orange-500 border-orange-500/20',
  PAUSADO: 'bg-red-500/15 text-red-500 border-red-500/20',
  COMPLETADO: 'bg-green-500/15 text-green-500 border-green-500/20',
  APROBADA: 'bg-green-500/15 text-green-500 border-green-500/20',
  EN_CURSO: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
  DENEGADA: 'bg-red-500/15 text-red-500 border-red-500/20',
};

const PRIORITY_COLORS: Record<string, string> = {
  BAJA: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
  MEDIA: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
  ALTA: 'bg-orange-500/15 text-orange-500 border-orange-500/20',
  URGENTE: 'bg-red-500/15 text-red-500 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_DISENO: 'En Diseño', MATERIALES_APARTADOS: 'Materiales Apartados',
  EN_CORTE: 'En Corte', EN_PRODUCCION: 'En Producción', PAUSADO: 'Pausado', COMPLETADO: 'Completado',
  APROBADA: 'Aprobada', EN_CURSO: 'En Curso', DENEGADA: 'Denegada',
};

// ==================== HELPERS ====================
const fetchApi = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options });
    if (res.status === 401) { toast.error('Sesión expirada'); return null; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la petición');
    return data;
  } catch (error: any) { toast.error(error.message); return null; }
};

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const asArray = (data: any): any[] => Array.isArray(data) ? data : [];
const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={STATUS_COLORS[status] || 'bg-gray-500/15 text-gray-500'}>{STATUS_LABELS[status] || status}</Badge>
);
const PriorityBadge = ({ priority }: { priority: string }) => (
  <Badge variant="outline" className={PRIORITY_COLORS[priority] || ''}>{priority}</Badge>
);

// ==================== MAIN COMPONENT ====================
export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark' as const, label: 'Oscuro', icon: <Moon className="w-4 h-4" /> },
    { value: 'system' as const, label: 'Sistema', icon: <Monitor className="w-4 h-4" /> },
  ];

  // Login form
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [materialStock, setMaterialStock] = useState<MaterialStock[]>([]);
  const [specialMaterials, setSpecialMaterials] = useState<SpecialMaterial[]>([]);
  const [toolTypes, setToolTypes] = useState<ToolType[]>([]);
  const [tools, setTools] = useState<ConsumableTool[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterShape, setFilterShape] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Forms
  const [formData, setFormData] = useState<Record<string, any>>({});

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR' || isAdmin;
  const canEdit = isSupervisor;

  // Check session on mount
  useEffect(() => {
    (async () => {
      const data = await fetchApi('/api/auth/me');
      if (data?.user) setUser(data.user);
      setLoading(false);
    })();
  }, []);

  // Load data based on view
  const loadViewData = useCallback(async (v: View) => {
    setDataLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      dashboard: async () => { const d = await fetchApi('/api/dashboard'); if (d) setStats(d); },
      inventory: async () => { const d = await fetchApi('/api/inventory'); if (d) setInventory(Array.isArray(d) ? d : d.items || []); },
      suppliers: async () => { const d = await fetchApi('/api/suppliers'); if (d) setSuppliers(Array.isArray(d) ? d : d.suppliers || []); },
      requisitions: async () => { const d = await fetchApi('/api/requisitions'); if (d) setRequisitions(Array.isArray(d) ? d : []); },
      mandriles: async () => { const d = await fetchApi('/api/projects?type=MANDRIL'); if (d) setProjects(Array.isArray(d) ? d : d.data || d.projects || []); },
      fixturas: async () => { const d = await fetchApi('/api/projects?type=FIXTURA'); if (d) setProjects(Array.isArray(d) ? d : d.data || d.projects || []); },
      materials: async () => {
        const [mt, ms] = await Promise.all([fetchApi('/api/materials'), fetchApi('/api/material-stock')]);
        if (mt) setMaterialTypes(Array.isArray(mt) ? mt : mt.data || []);
        if (ms) setMaterialStock(Array.isArray(ms) ? ms : ms.data || []);
      },
      'special-materials': async () => { const d = await fetchApi('/api/special-materials'); if (d) setSpecialMaterials(Array.isArray(d) ? d : d.data || []); },
      tools: async () => {
        const [tt, t] = await Promise.all([fetchApi('/api/tool-types'), fetchApi('/api/tools')]);
        if (tt) setToolTypes(Array.isArray(tt) ? tt : tt.data || []);
        if (t) setTools(Array.isArray(t) ? t : t.data || []);
      },
      config: async () => {
        const [mt, sm, tt] = await Promise.all([fetchApi('/api/materials'), fetchApi('/api/special-materials'), fetchApi('/api/tool-types')]);
        if (mt) setMaterialTypes(Array.isArray(mt) ? mt : mt.data || []);
        if (sm) setSpecialMaterials(Array.isArray(sm) ? sm : sm.data || []);
        if (tt) setToolTypes(Array.isArray(tt) ? tt : tt.data || []);
      },
      users: async () => { if (isAdmin) { const d = await fetchApi('/api/users'); if (d) setUsers(Array.isArray(d) ? d : d.data || []); } },
    };
    await (loaders[v] || (() => Promise.resolve()))();
    setDataLoading(false);
  }, [isAdmin]);

  const prevViewRef = useRef<View | null>(null);

  // Load data when view changes
  useEffect(() => {
    if (!user) return;
    if (prevViewRef.current === view) return;
    prevViewRef.current = view;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data loading and filter reset on view change
    loadViewData(view);
    setSearchTerm('');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setFilterShape('ALL');
    setFilterType('ALL');
  }, [view, user, loadViewData]);

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const data = await fetchApi('/api/auth/login', { method: 'POST', body: JSON.stringify(loginForm) });
    if (data?.user) { setUser(data.user); toast.success(`Bienvenido, ${data.user.name}`); }
    setLoginLoading(false);
  };

  const handleLogout = async () => { await fetchApi('/api/auth/logout', { method: 'POST' }); setUser(null); setView('dashboard'); };

  // Generic CRUD
  const openCreate = (defaults: Record<string, any> = {}) => { setEditingItem(null); setFormData(defaults); setModalOpen(true); };
  const openEdit = (item: any, extra: Record<string, any> = {}) => { setEditingItem(item); setFormData({ ...item, ...extra }); setModalOpen(true); };
  const openDetail = (item: any) => { setDetailItem(item); setDetailOpen(true); };
  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = async (endpoint: string, method: string = 'POST') => {
    const url = editingItem?.id ? `/api/${endpoint}/${editingItem.id}` : `/api/${endpoint}`;
    const data = await fetchApi(url, { method: editingItem?.id ? 'PUT' : method, body: JSON.stringify(formData) });
    if (data) { setModalOpen(false); loadViewData(view); toast.success(editingItem ? 'Actualizado correctamente' : 'Creado correctamente'); }
    return data;
  };

  const handleDelete = async (endpoint: string, id: string, label: string = 'elemento') => {
    if (!confirm(`¿Eliminar este ${label}?`)) return;
    const data = await fetchApi(`/api/${endpoint}/${id}`, { method: 'DELETE' });
    if (data) { loadViewData(view); toast.success('Eliminado correctamente'); }
  };

  const handleAction = async (endpoint: string, body: Record<string, any> = {}, msg: string = 'Acción completada') => {
    const data = await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) });
    if (data) { loadViewData(view); toast.success(msg); if (detailItem) { setDetailItem({ ...detailItem, ...body }); } }
  };

  // ==================== LOGIN PAGE ====================
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Sistema de Requisiciones</CardTitle>
            <CardDescription>y Producción</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" placeholder="Ingresa tu usuario" value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="Ingresa tu contraseña" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar Sesión
              </Button>
            </form>
            <div className="mt-6 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <p className="font-medium mb-1">Credenciales de prueba:</p>
              <p>Admin: admin / admin123</p>
              <p>Supervisor: supervisor / supervisor123</p>
              <p>Usuario: usuario / usuario123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // ==================== NAV ITEMS ====================
  const navItems: { view: View; label: string; icon: React.ReactNode; admin?: boolean }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { view: 'inventory', label: 'Inventario', icon: <Package className="w-5 h-5" /> },
    { view: 'suppliers', label: 'Proveedores', icon: <Building2 className="w-5 h-5" /> },
    { view: 'requisitions', label: 'Requisiciones', icon: <ClipboardList className="w-5 h-5" /> },
    { view: 'mandriles', label: 'Mandriles', icon: <Cog className="w-5 h-5" /> },
    { view: 'fixturas', label: 'Fixturas', icon: <Wrench className="w-5 h-5" /> },
    { view: 'materials', label: 'Materiales', icon: <Cylinder className="w-5 h-5" /> },
    { view: 'special-materials', label: 'Mat. Especiales', icon: <FlaskConical className="w-5 h-5" /> },
    { view: 'tools', label: 'Herramientas', icon: <Hammer className="w-5 h-5" /> },
    { view: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, admin: true },
    { view: 'users', label: 'Usuarios', icon: <Users className="w-5 h-5" />, admin: true },
  ];

  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard', inventory: 'Inventario', suppliers: 'Proveedores', requisitions: 'Requisiciones',
    mandriles: 'Mandriles', fixturas: 'Fixturas', materials: 'Materiales', 'special-materials': 'Materiales Especiales',
    tools: 'Herramientas', config: 'Configuración', users: 'Usuarios',
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">ReqProd</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></Button>
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-3">
            {navItems.filter(n => !n.admin || isAdmin).map(item => (
              <button key={item.view} onClick={() => { setView(item.view); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === item.view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t border-border space-y-3">
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tema</span>
              <Button variant="ghost" size="sm" onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="h-8 gap-1.5 px-2 text-xs">
                {theme === 'light' && <><Sun className="w-3.5 h-3.5" /> Claro</>}
                {theme === 'dark' && <><Moon className="w-3.5 h-3.5" /> Oscuro</>}
                {theme === 'system' && <><Monitor className="w-3.5 h-3.5" /> Sistema</>}
              </Button>
            </div>
            {themeMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-1 z-50">
                {themeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); setThemeMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${theme === opt.value ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><UserIcon className="w-4 h-4 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center gap-4 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <h1 className="text-lg font-semibold">{viewTitles[view]}</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Badge variant="outline" className="hidden sm:flex">{user?.role}</Badge>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardView stats={stats} setView={setView} />}
              {view === 'inventory' && <InventoryView inventory={inventory} search={searchTerm} setSearch={setSearchTerm} filter={filterCategory} setFilter={setFilterCategory} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} openDetail={openDetail} handleDelete={handleDelete} />}
              {view === 'suppliers' && <SuppliersView suppliers={suppliers} search={searchTerm} setSearch={setSearchTerm} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} handleDelete={handleDelete} />}
              {view === 'requisitions' && <RequisitionsView requisitions={requisitions} search={searchTerm} setSearch={setSearchTerm} filter={filterStatus} setFilter={setFilterStatus} canEdit={canEdit} isAdmin={isAdmin} user={user} openCreate={openCreate} openDetail={openDetail} handleAction={handleAction} handleDelete={handleDelete} inventory={inventory} suppliers={suppliers} loadViewData={loadViewData} />}
              {(view === 'mandriles' || view === 'fixturas') && <ProjectsView projects={projects} projectType={view === 'mandriles' ? 'MANDRIL' : 'FIXTURA'} search={searchTerm} setSearch={setSearchTerm} filter={filterStatus} setFilter={setFilterStatus} canEdit={canEdit} isAdmin={isAdmin} openCreate={openCreate} openEdit={openEdit} openDetail={openDetail} handleAction={handleAction} handleDelete={handleDelete} materialTypes={materialTypes} materialStock={materialStock} loadViewData={loadViewData} />}
              {view === 'materials' && <MaterialsView materialTypes={materialTypes} materialStock={materialStock} search={searchTerm} setSearch={setSearchTerm} filterType={filterType} setFilterType={setFilterType} filterShape={filterShape} setFilterShape={setFilterShape} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} handleDelete={handleDelete} />}
              {view === 'special-materials' && <SpecialMaterialsView items={specialMaterials} search={searchTerm} setSearch={setSearchTerm} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} handleDelete={handleDelete} />}
              {view === 'tools' && <ToolsView tools={tools} toolTypes={toolTypes} search={searchTerm} setSearch={setSearchTerm} filterType={filterType} setFilterType={setFilterType} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} handleDelete={handleDelete} handleAction={handleAction} projects={projects} />}
              {view === 'config' && <ConfigView materialTypes={materialTypes} specialMaterials={specialMaterials} toolTypes={toolTypes} canEdit={canEdit} openCreate={openCreate} openEdit={openEdit} handleDelete={handleDelete} />}
              {view === 'users' && isAdmin && <UsersView users={users} openCreate={openCreate} openEdit={openEdit} handleAction={handleAction} currentUserId={user.id} />}
            </>
          )}
        </div>
      </main>

      {/* GENERIC MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Crear'} {viewTitles[view]}</DialogTitle>
            <DialogDescription>Complete los campos del formulario</DialogDescription>
          </DialogHeader>
          <ModalBody view={view} formData={formData} updateField={updateField} editingItem={editingItem} inventory={inventory} suppliers={suppliers} materialTypes={materialTypes} toolTypes={toolTypes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (view === 'requisitions' && !editingItem) {
                handleReqCreate(formData, inventory, suppliers);
              } else if (view === 'mandriles' || view === 'fixturas') {
                handleProjectCreate(formData, view === 'mandriles' ? 'MANDRIL' : 'FIXTURA');
              } else {
                handleSave(getApiEndpoint(view));
              }
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle</DialogTitle>
          </DialogHeader>
          <DetailBody item={detailItem} view={view} handleAction={handleAction} canEdit={canEdit} isAdmin={isAdmin} user={user} materialStock={materialStock} loadViewData={loadViewData} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== MODAL FORM BODIES ====================
function getApiEndpoint(view: string): string {
  const map: Record<string, string> = { inventory: 'inventory', suppliers: 'suppliers', materials: 'materials', 'special-materials': 'special-materials', tools: 'tools', config: '', users: 'users' };
  return map[view] || view;
}

function FormField({ label, field, formData, updateField, type = 'text', required = true, placeholder = '' }: { label: string; field: string; formData: Record<string, any>; updateField: (f: string, v: any) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field}>{label} {required && <span className="text-red-500">*</span>}</Label>
      {type === 'textarea' ? (
        <Textarea id={field} placeholder={placeholder} value={formData[field] || ''} onChange={e => updateField(field, e.target.value)} required={required} rows={3} />
      ) : type === 'number' ? (
        <Input id={field} type="number" step="any" placeholder={placeholder} value={formData[field] ?? ''} onChange={e => updateField(field, e.target.value ? parseFloat(e.target.value) : '')} required={required} />
      ) : (
        <Input id={field} type={type} placeholder={placeholder} value={formData[field] || ''} onChange={e => updateField(field, e.target.value)} required={required} />
      )}
    </div>
  );
}

function FormSelect({ label, field, formData, updateField, options, required = true }: { label: string; field: string; formData: Record<string, any>; updateField: (f: string, v: any) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
      <Select value={formData[field] || ''} onValueChange={v => updateField(field, v)}>
        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function ModalBody({ view, formData, updateField, editingItem, inventory, suppliers, materialTypes, toolTypes }: { view: string; formData: Record<string, any>; updateField: (f: string, v: any) => void; editingItem: any; inventory: InventoryItem[]; suppliers: Supplier[]; materialTypes: MaterialType[]; toolTypes: ToolType[] }) {
  if (view === 'inventory') return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormField label="Descripción" field="description" formData={formData} updateField={updateField} type="textarea" required={false} />
      <FormField label="SKU" field="sku" formData={formData} updateField={updateField} />
      <FormSelect label="Categoría" field="category" formData={formData} updateField={updateField} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cantidad" field="quantity" formData={formData} updateField={updateField} type="number" />
        <FormField label="Stock Mínimo" field="minStock" formData={formData} updateField={updateField} type="number" />
      </div>
      <FormSelect label="Unidad" field="unit" formData={formData} updateField={updateField} options={[{ value: 'PIEZA', label: 'Pieza' }, { value: 'LITRO', label: 'Litro' }, { value: 'GALON', label: 'Galón' }, { value: 'KILOGRAMO', label: 'Kilogramo' }, { value: 'METRO', label: 'Metro' }, { value: 'CAJA', label: 'Caja' }, { value: 'ARCHIVO', label: 'Archivo' }]} />
      <FormField label="Ubicación" field="location" formData={formData} updateField={updateField} required={false} />
    </div>
  );

  if (view === 'suppliers') return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormField label="Contacto" field="contact" formData={formData} updateField={updateField} required={false} />
      <FormField label="Teléfono" field="phone" formData={formData} updateField={updateField} required={false} />
      <FormField label="Email" field="email" formData={formData} updateField={updateField} type="email" required={false} />
      <FormField label="Dirección" field="address" formData={formData} updateField={updateField} required={false} />
      <FormField label="Notas" field="notes" formData={formData} updateField={updateField} type="textarea" required={false} />
    </div>
  );

  if (view === 'special-materials') return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormField label="Descripción" field="description" formData={formData} updateField={updateField} type="textarea" required={false} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Stock (kg)" field="stockKg" formData={formData} updateField={updateField} type="number" />
        <FormField label="Stock Mín. (kg)" field="minStockKg" formData={formData} updateField={updateField} type="number" />
      </div>
      <FormField label="Costo por Kg" field="unitCost" formData={formData} updateField={updateField} type="number" required={false} />
      <FormField label="Proveedor" field="supplier" formData={formData} updateField={updateField} required={false} />
    </div>
  );

  if (view === 'tools') return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormSelect label="Tipo de Herramienta" field="typeId" formData={formData} updateField={updateField} options={toolTypes.map(t => ({ value: t.id, label: t.name }))} />
      <FormField label="Descripción" field="description" formData={formData} updateField={updateField} type="textarea" required={false} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cantidad" field="quantity" formData={formData} updateField={updateField} type="number" />
        <FormField label="Stock Mínimo" field="minStock" formData={formData} updateField={updateField} type="number" />
      </div>
      <FormField label="Vida Útil (horas)" field="averageLifeSpan" formData={formData} updateField={updateField} type="number" required={false} />
      <FormSelect label="Unidad" field="unit" formData={formData} updateField={updateField} options={[{ value: 'PIEZA', label: 'Pieza' }]} />
      <FormField label="Ubicación" field="location" formData={formData} updateField={updateField} required={false} />
    </div>
  );

  if (view === 'users') return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormField label="Usuario" field="username" formData={formData} updateField={updateField} />
      <FormField label={editingItem ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'} field="password" formData={formData} updateField={updateField} type="password" required={!editingItem} />
      <FormSelect label="Rol" field="role" formData={formData} updateField={updateField} options={ROLES.map(r => ({ value: r, label: r }))} />
    </div>
  );

  if (view === 'mandriles' || view === 'fixturas') return (
    <div className="grid gap-4">
      <FormField label="Nombre del Proyecto" field="name" formData={formData} updateField={updateField} />
      <FormField label="Descripción" field="description" formData={formData} updateField={updateField} type="textarea" required={false} />
      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Prioridad" field="priority" formData={formData} updateField={updateField} options={PRIORITIES.map(p => ({ value: p, label: p }))} />
        <FormField label="% Merma" field="wastePercent" formData={formData} updateField={updateField} type="number" />
      </div>
      <FormField label="Fecha Límite" field="dueDate" formData={formData} updateField={updateField} type="date" required={false} />
      <FormField label="Notas" field="notes" formData={formData} updateField={updateField} type="textarea" required={false} />
    </div>
  );

  // Config / Materials generic
  return (
    <div className="grid gap-4">
      <FormField label="Nombre" field="name" formData={formData} updateField={updateField} />
      <FormField label="Descripción" field="description" formData={formData} updateField={updateField} type="textarea" required={false} />
    </div>
  );
}

function handleReqCreate(formData: Record<string, any>, inventory: InventoryItem[], suppliers: Supplier[]) {
  const items = (formData._items || []).filter((i: any) => i.inventoryItemId && i.quantity > 0);
  if (items.length === 0) { toast.error('Agregue al menos un item'); return; }
  const body = { title: formData.title, description: formData.description, priority: formData.priority, supplierId: formData.supplierId || null, items };
  void fetchApi('/api/requisitions', { method: 'POST', body: JSON.stringify(body) }).then(data => {
    if (data) { toast.success('Requisición creada'); window.location.reload(); }
  });
}

function handleProjectCreate(formData: Record<string, any>, type: string) {
  const body = { name: formData.name, description: formData.description, type, priority: formData.priority, wastePercent: formData.wastePercent, dueDate: formData.dueDate || null, notes: formData.notes || null };
  void fetchApi('/api/projects', { method: 'POST', body: JSON.stringify(body) }).then(data => {
    if (data) { toast.success('Proyecto creado'); window.location.reload(); }
  });
}

// ==================== DETAIL BODY ====================
function DetailBody({ item, view, handleAction, canEdit, isAdmin, user, materialStock, loadViewData }: { item: any; view: string; handleAction: any; canEdit: boolean; isAdmin: boolean; user: User; materialStock: MaterialStock[]; loadViewData: (v: View) => Promise<void>; }) {
  if (!item) return <p className="text-muted-foreground">Sin datos</p>;

  if (view === 'requisitions') {
    const req = item as Requisition;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm text-muted-foreground">Título</span><p className="font-medium">{req.title}</p></div>
          <div><span className="text-sm text-muted-foreground">Estado</span><div className="mt-1"><StatusBadge status={req.status} /></div></div>
          <div><span className="text-sm text-muted-foreground">Prioridad</span><div className="mt-1"><PriorityBadge priority={req.priority} /></div></div>
          <div><span className="text-sm text-muted-foreground">Creador</span><p className="font-medium">{req.createdBy?.name || req.createdById}</p></div>
          <div><span className="text-sm text-muted-foreground">Fecha</span><p className="font-medium">{formatDateTime(req.createdAt)}</p></div>
          {req.approvedBy && <div><span className="text-sm text-muted-foreground">Aprobado por</span><p className="font-medium">{req.approvedBy.name}</p></div>}
          {req.approvedAt && <div><span className="text-sm text-muted-foreground">Fecha de aprobación</span><p className="font-medium">{formatDateTime(req.approvedAt)}</p></div>}
          {req.completedAt && <div><span className="text-sm text-muted-foreground">Fecha de completado</span><p className="font-medium">{formatDateTime(req.completedAt)}</p></div>}
          {req.supplier && <div><span className="text-sm text-muted-foreground">Proveedor</span><p className="font-medium">{req.supplier.name}</p></div>}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm text-muted-foreground">Número de Guía</span><p className="font-medium">{req.trackingNumber ? <span className="text-green-500">{req.trackingNumber}</span> : <span className="text-muted-foreground italic">Sin guía</span>}</p></div>
          <div><span className="text-sm text-muted-foreground">Factura</span><p className="font-medium">{req.hasInvoice ? <Badge className="bg-green-500/15 text-green-500 border-green-500/20">Sí{req.invoiceNumber ? ` - ${req.invoiceNumber}` : ''}</Badge> : <span className="text-muted-foreground italic">Sin factura</span>}</p></div>
        </div>
        {req.notes && <div><span className="text-sm text-muted-foreground">Notas</span><p className="mt-1 whitespace-pre-wrap">{req.notes}</p></div>}
        {req.description && <div><span className="text-sm text-muted-foreground">Descripción</span><p className="mt-1">{req.description}</p></div>}
        {req.items && req.items.length > 0 && (
          <div>
            <span className="text-sm font-medium">Items ({req.items.length})</span>
            <Table className="mt-2">
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>{req.items.map(i => (<TableRow key={i.id}><TableCell className="font-medium">{i.inventoryItem?.name || i.inventoryItemId}</TableCell><TableCell className="text-muted-foreground text-sm">{i.inventoryItem?.sku}</TableCell><TableCell className="text-right">{i.quantity}</TableCell><TableCell className="text-sm text-muted-foreground">{i.notes || '-'}</TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        )}
        {canEdit && req.status === 'PENDIENTE' && (
          <div className="flex gap-2 pt-4 border-t flex-wrap">
            <Button size="sm" onClick={() => handleAction(`/api/requisitions/${req.id}/approve`, {}, 'Requisición aprobada')}><Check className="w-4 h-4 mr-1" />Aprobar</Button>
            <Button size="sm" variant="destructive" onClick={() => { const r = prompt('Motivo de denegación (opcional):'); if (r !== null) handleAction(`/api/requisitions/${req.id}/deny`, { reason: r }, 'Requisición denegada'); }}><XCircle className="w-4 h-4 mr-1" />Denegar</Button>
          </div>
        )}
        {canEdit && req.status === 'APROBADA' && <Button className="mt-4" size="sm" onClick={() => handleAction(`/api/requisitions/${req.id}/start`, {}, 'Requisición en curso')}><PlayCircle className="w-4 h-4 mr-1" />Iniciar</Button>}
        {canEdit && req.status === 'EN_CURSO' && <Button className="mt-4" size="sm" onClick={() => handleAction(`/api/requisitions/${req.id}/complete`, {}, 'Requisición completada')}><Check className="w-4 h-4 mr-1" />Completar</Button>}
      </div>
    );
  }

  if (view === 'mandriles' || view === 'fixturas') {
    const proj = item as Project;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm text-muted-foreground">Nombre</span><p className="font-medium">{proj.name}</p></div>
          <div><span className="text-sm text-muted-foreground">Tipo</span><p className="font-medium">{proj.type}</p></div>
          <div><span className="text-sm text-muted-foreground">Estado</span><div className="mt-1"><StatusBadge status={proj.status} /></div></div>
          <div><span className="text-sm text-muted-foreground">Prioridad</span><div className="mt-1"><PriorityBadge priority={proj.priority} /></div></div>
          <div><span className="text-sm text-muted-foreground">% Merma</span><p className="font-medium">{proj.wastePercent}%</p></div>
          <div><span className="text-sm text-muted-foreground">Fecha Límite</span><p className="font-medium">{formatDate(proj.dueDate || '')}</p></div>
        </div>
        {proj.description && <div><span className="text-sm text-muted-foreground">Descripción</span><p className="mt-1">{proj.description}</p></div>}
        {proj.notes && <div><span className="text-sm text-muted-foreground">Notas</span><p className="mt-1">{proj.notes}</p></div>}

        {proj.components && proj.components.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Componentes ({proj.components.length})</h4>
            <div className="space-y-2">
              {proj.components.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Cant: {c.quantity} {c.materialType?.name ? `• ${c.materialType.name}` : ''}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {canEdit && proj.status !== 'COMPLETADO' && proj.status !== 'DENEGADA' && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Cambiar Estado</p>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.filter(s => s !== proj.status).map(s => (
                <Button key={s} size="sm" variant="outline" onClick={() => handleAction(`/api/projects/${proj.id}/status`, { status: s }, `Estado cambiado a ${STATUS_LABELS[s]}`)}>{STATUS_LABELS[s]}</Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Generic detail
  return (
    <div className="space-y-3">
      {Object.entries(item).filter(([k]) => !['id', 'createdAt', 'updatedAt', 'active'].includes(k)).map(([key, val]) => (
        <div key={key} className="grid grid-cols-3 gap-2">
          <span className="text-sm text-muted-foreground capitalize">{key}</span>
          <span className="col-span-2 text-sm font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}</span>
        </div>
      ))}
    </div>
  );
}

// ==================== VIEW COMPONENTS ====================

function SearchBar({ value, onChange, placeholder = 'Buscar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-9" />
    </div>
  );
}

function LowStockBadge({ qty, min }: { qty: number; min: number }) {
  if (qty <= 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (qty <= min) return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Stock bajo ({qty}/{min})</Badge>;
  if (qty <= min * 1.5) return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20">{qty}/{min}</Badge>;
  return <span className="text-sm">{qty}/{min}</span>;
}

// DASHBOARD
function DashboardView({ stats, setView }: { stats: any; setView: (v: View) => void }) {
  if (!stats) return <div className="text-center text-muted-foreground py-12">Cargando estadísticas...</div>;
  const s = stats;
  const totalProj = s.projects?.byStatus ? Object.values(s.projects.byStatus).reduce((a: number, b: any) => a + (b as number), 0) : 0;
  const completedProj = s.projects?.byStatus?.COMPLETADO || 0;
  const pausedProj = s.projects?.byStatus?.PAUSADO || 0;
  const cards = [
    { title: 'Inventario', value: s.inventory?.total || 0, sub: `${(s.inventory?.lowStockItems || []).length} con stock bajo`, color: 'text-orange-500', icon: <Package className="w-5 h-5" />, view: 'inventory' as View },
    { title: 'Requisiciones Pendientes', value: s.requisitions?.byStatus?.PENDIENTE || 0, sub: `${s.requisitions?.byStatus?.EN_CURSO || 0} en curso`, color: 'text-blue-500', icon: <ClipboardList className="w-5 h-5" />, view: 'requisitions' as View },
    { title: 'Proyectos Activos', value: totalProj - completedProj - pausedProj, sub: `${completedProj} completados`, color: 'text-green-500', icon: <Cog className="w-5 h-5" />, view: 'mandriles' as View },
    { title: 'Materiales en Stock', value: s.materials?.totalMaterialStock || 0, sub: `${s.materials?.totalSpecialMaterials || 0} especiales`, color: 'text-cyan-500', icon: <Cylinder className="w-5 h-5" />, view: 'materials' as View },
    { title: 'Herramientas', value: s.tools?.totalConsumableTools || 0, sub: `${(s.tools?.lowStockTools || []).length} con stock bajo`, color: 'text-purple-500', icon: <Hammer className="w-5 h-5" />, view: 'tools' as View },
    { title: 'Usuarios Activos', value: s.users?.active || 0, sub: `de ${s.users?.total || 0} total`, color: 'text-primary', icon: <Users className="w-5 h-5" />, view: 'users' as View },
  ];
  const recentReqs = asArray(s.requisitions?.recent);
  const recentProjs = asArray(s.projects?.recent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setView(c.view)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.title}</p>
                  <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">{c.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Requisiciones Recientes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentReqs.slice(0, 5).map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setView('requisitions')}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Proyectos Recientes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentProjs.slice(0, 5).map(p => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setView(p.type === 'MANDRIL' ? 'mandriles' : 'fixturas')}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// INVENTORY
function InventoryView({ inventory, search, setSearch, filter, setFilter, canEdit, openCreate, openEdit, openDetail, handleDelete }: any) {
  const inv = asArray(inventory);
  const filtered = inv.filter((i: InventoryItem) => i.active && i.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'ALL' || i.category === filter));
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, SKU..." /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        {canEdit && <Button onClick={() => openCreate({ category: 'HERRAMIENTAS', unit: 'PIEZA', quantity: 0, minStock: 5 })}><Plus className="w-4 h-4 mr-2" />Nuevo Producto</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Nombre</TableHead><TableHead className="hidden md:table-cell">Categoría</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="hidden lg:table-cell">Ubicación</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No se encontraron productos</TableCell></TableRow> : filtered.map((i: InventoryItem) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                    <TableCell><div><p className="font-medium">{i.name}</p>{i.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{i.description}</p>}</div></TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{i.category}</Badge></TableCell>
                    <TableCell className="text-right"><LowStockBadge qty={i.quantity} min={i.minStock} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{i.location || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(i)}><Eye className="w-4 h-4" /></Button>
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Edit className="w-4 h-4" /></Button>}
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('inventory', i.id, 'producto')}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// SUPPLIERS
function SuppliersView({ suppliers, search, setSearch, canEdit, openCreate, openEdit, handleDelete }: any) {
  const sup = asArray(suppliers);
  const filtered = sup.filter((s: Supplier) => s.active && s.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} /></div>
        {canEdit && <Button onClick={() => openCreate({})}><Plus className="w-4 h-4 mr-2" />Nuevo Proveedor</Button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s: Supplier) => (
          <Card key={s.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2"><CardTitle className="text-base">{s.name}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {s.contact && <p className="text-muted-foreground">Contacto: {s.contact}</p>}
              {s.phone && <p className="text-muted-foreground">Tel: {s.phone}</p>}
              {s.email && <p className="text-muted-foreground">Email: {s.email}</p>}
              <div className="flex gap-2 pt-2">
                {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Edit className="w-3 h-3 mr-1" />Editar</Button>}
                {canEdit && <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete('suppliers', s.id, 'proveedor')}><Trash2 className="w-3 h-3 mr-1" />Eliminar</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// REQUISITIONS
function RequisitionsView({ requisitions, search, setSearch, filter, setFilter, canEdit, isAdmin, user, openCreate, openDetail, handleAction, handleDelete, inventory, suppliers, loadViewData }: any) {
  const reqs = asArray(requisitions);
  const filtered = reqs.filter((r: Requisition) => r.title.toLowerCase().includes(search.toLowerCase()) && (filter === 'ALL' || r.status === filter));

  // Separate active (not completed/denied) from completed
  const activeReqs = filtered.filter((r: Requisition) => !['COMPLETADA', 'DENEGADA'].includes(r.status));
  const completedReqs = filtered.filter((r: Requisition) => r.status === 'COMPLETADA');
  const deniedReqs = filtered.filter((r: Requisition) => r.status === 'DENEGADA');

  const [editModal, setEditModal] = useState<Requisition | null>(null);
  const [editTracking, setEditTracking] = useState('');
  const [editHasInvoice, setEditHasInvoice] = useState(false);
  const [editInvoice, setEditInvoice] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openEditTracking = (r: Requisition) => {
    setEditModal(r);
    setEditTracking(r.trackingNumber || '');
    setEditHasInvoice(r.hasInvoice || false);
    setEditInvoice(r.invoiceNumber || '');
    setEditNotes(r.notes || '');
  };

  const saveTracking = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const data = await fetchApi(`/api/requisitions/${editModal.id}`, { method: 'PUT', body: JSON.stringify({ trackingNumber: editTracking, hasInvoice: editHasInvoice, invoiceNumber: editInvoice, notes: editNotes }) });
    if (data) { setEditModal(null); toast.success('Requisición actualizada'); loadViewData('requisitions'); }
    setEditSaving(false);
  };

  const renderReqTable = (items: Requisition[], showStatusActions: boolean) => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead className="hidden md:table-cell">Creador</TableHead><TableHead className="hidden md:table-cell">Guía</TableHead><TableHead className="hidden md:table-cell">Factura</TableHead><TableHead className="hidden lg:table-cell">Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No se encontraron requisiciones</TableCell></TableRow> : items.map((r: Requisition) => (
                <TableRow key={r.id} className={r.status === 'COMPLETADA' ? 'opacity-70' : ''}>
                  <TableCell><div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.items?.length || 0} items</p></div></TableCell>
                  <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.createdBy?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.trackingNumber ? <span className="text-green-500 font-medium">{r.trackingNumber}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.hasInvoice ? <Badge className="bg-green-500/15 text-green-500 border-green-500/20">Sí{r.invoiceNumber ? ` (${r.invoiceNumber})` : ''}</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(r)} title="Ver detalle"><Eye className="w-4 h-4" /></Button>
                      {showStatusActions && canEdit && r.status === 'PENDIENTE' && <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleAction(`/api/requisitions/${r.id}/approve`, {}, 'Aprobada')} title="Aprobar"><Check className="w-4 h-4" /></Button>}
                      {showStatusActions && canEdit && r.status === 'APROBADA' && <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleAction(`/api/requisitions/${r.id}/start`, {}, 'Iniciada')} title="Iniciar"><PlayCircle className="w-4 h-4" /></Button>}
                      {showStatusActions && canEdit && r.status === 'EN_CURSO' && <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleAction(`/api/requisitions/${r.id}/complete`, {}, 'Completada')} title="Completar"><Check className="w-4 h-4" /></Button>}
                      {showStatusActions && canEdit && r.status === 'PENDIENTE' && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { const reason = prompt('Motivo de denegación (opcional):'); if (reason !== null) handleAction(`/api/requisitions/${r.id}/deny`, { reason }, 'Denegada'); }} title="Denegar"><XCircle className="w-4 h-4" /></Button>}
                      {canEdit && !['COMPLETADA', 'DENEGADA'].includes(r.status) && <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => openEditTracking(r)} title="Editar guía/factura"><Edit className="w-4 h-4" /></Button>}
                      {!showStatusActions && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('requisitions', r.id, 'requisición')} title="Eliminar"><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Buscar requisición..." /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{REQUISITION_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent></Select>
      </div>

      <RequisitionCreateForm inventory={inventory} suppliers={suppliers} loadViewData={loadViewData} />

      {/* Active Requisitions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" /> Requisiciones Activas
          <Badge variant="outline" className="ml-1">{activeReqs.length}</Badge>
        </h3>
        {renderReqTable(activeReqs, true)}
      </div>

      {/* Completed Requisitions */}
      {completedReqs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" /> Completadas
            <Badge variant="outline" className="ml-1 bg-green-500/10">{completedReqs.length}</Badge>
          </h3>
          {renderReqTable(completedReqs, false)}
        </div>
      )}

      {/* Denied Requisitions */}
      {deniedReqs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" /> Denegadas
            <Badge variant="outline" className="ml-1 bg-red-500/10">{deniedReqs.length}</Badge>
          </h3>
          {renderReqTable(deniedReqs, false)}
        </div>
      )}

      {/* Edit Tracking / Invoice Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Guía y Factura</DialogTitle><DialogDescription>{editModal?.title}</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <FormField label="Número de Guía" field="tracking" formData={{ tracking: editTracking }} updateField={(_, v) => setEditTracking(v)} placeholder="Ej: 1234567890" required={false} />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Switch checked={editHasInvoice} onCheckedChange={setEditHasInvoice} />
              <Label>¿Tiene factura?</Label>
            </div>
            {editHasInvoice && <FormField label="Número de Factura" field="invoice" formData={{ invoice: editInvoice }} updateField={(_, v) => setEditInvoice(v)} placeholder="Ej: FAC-2024-001" required={false} />}
            <div className="space-y-1.5"><Label>Notas</Label><Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Notas adicionales..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button onClick={saveTracking} disabled={editSaving}>{editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequisitionCreateForm({ inventory, suppliers, loadViewData }: any) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ inventoryItemId: '', quantity: 1, notes: '' }]);
  const [loading, setLoading] = useState(false);

  const addItem = () => setItems([...items, { inventoryItemId: '', quantity: 1, notes: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => { const n = [...items]; n[idx] = { ...n[idx], [field]: value }; setItems(n); };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Ingrese un título'); return; }
    const validItems = items.filter(i => i.inventoryItemId && i.quantity > 0);
    if (validItems.length === 0) { toast.error('Agregue al menos un item'); return; }
    setLoading(true);
    const data = await fetchApi('/api/requisitions', { method: 'POST', body: JSON.stringify({ title, description: desc, priority, supplierId: supplierId || null, items: validItems }) });
    if (data) { setOpen(false); setTitle(''); setDesc(''); setPriority('MEDIA'); setSupplierId(''); setItems([{ inventoryItemId: '', quantity: 1, notes: '' }]); toast.success('Requisición creada'); loadViewData('requisitions'); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Nueva Requisición</Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Requisición</DialogTitle><DialogDescription>Complete los campos para crear una nueva requisición</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <FormField label="Título" field="title" formData={{ title }} updateField={(_, v) => setTitle(v)} placeholder="Título de la requisición" />
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Descripción (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Sin proveedor</SelectItem>{suppliers.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Items ({items.filter(i => i.inventoryItemId).length})</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
                <div className="col-span-6">
                  <Label className="text-xs">Producto</Label>
                  <Select value={item.inventoryItemId} onValueChange={v => updateItem(idx, 'inventoryItemId', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{inventory.filter(i => i.active).map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku}) - Stock: {i.quantity}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Cantidad</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Input value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} className="h-9" placeholder="Opc." />
                </div>
                <div className="col-span-1"><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4" /></Button></div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crear Requisición</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// PROJECTS
function ProjectsView({ projects, projectType, search, setSearch, filter, setFilter, canEdit, isAdmin, openCreate, openEdit, openDetail, handleAction, handleDelete, materialTypes, materialStock, loadViewData }: any) {
  const projs = asArray(projects);
  const filtered = projs.filter((p: Project) => p.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'ALL' || p.status === filter));
  const typeLabel = projectType === 'MANDRIL' ? 'Mandril' : 'Fixtura';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder={`Buscar ${typeLabel.toLowerCase()}...`} /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent></Select>
        {canEdit && <Button onClick={() => openCreate({ priority: 'MEDIA', wastePercent: 2.0 })}><Plus className="w-4 h-4 mr-2" />Nuevo {typeLabel}</Button>}
      </div>

      {/* Create Project Form */}
      {canEdit && <ProjectCreateForm projectType={projectType} loadViewData={loadViewData} materialTypes={materialTypes} />}

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? <div className="col-span-full text-center text-muted-foreground py-12">No se encontraron proyectos</div> : filtered.map((p: Project) => (
          <Card key={p.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openDetail(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription className="mt-1">{p.description?.substring(0, 80)}{p.description && p.description.length > 80 ? '...' : ''}</CardDescription>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <PriorityBadge priority={p.priority} />
                <span className="text-muted-foreground">Merma: {p.wastePercent}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{p.components?.length || 0} componentes</span>
                {p.dueDate && <span className="text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{formatDate(p.dueDate)}</span>}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={e => { e.stopPropagation(); openDetail(p); }}><Eye className="w-3 h-3 mr-1" />Detalle</Button>
                {canEdit && <Button size="sm" variant="outline" className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete('projects', p.id, 'proyecto'); }}><Trash2 className="w-3 h-3" /></Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProjectCreateForm({ projectType, loadViewData, materialTypes }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priority: 'MEDIA', wastePercent: 2.0, dueDate: '', notes: '' });
  const [components, setComponents] = useState([{ name: '', description: '', quantity: 1, materialTypeId: '' }]);

  const addComp = () => setComponents([...components, { name: '', description: '', quantity: 1, materialTypeId: '' }]);
  const removeComp = (i: number) => setComponents(components.filter((_, idx) => idx !== i));
  const updateComp = (i: number, f: string, v: any) => { const n = [...components]; n[i] = { ...n[i], [f]: v }; setComponents(n); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Ingrese un nombre'); return; }
    setLoading(true);
    const validComps = components.filter(c => c.name.trim());
    const data = await fetchApi('/api/projects', { method: 'POST', body: JSON.stringify({ ...form, type: projectType, dueDate: form.dueDate || null, components: validComps }) });
    if (data) { setOpen(false); setForm({ name: '', description: '', priority: 'MEDIA', wastePercent: 2.0, dueDate: '', notes: '' }); setComponents([{ name: '', description: '', quantity: 1, materialTypeId: '' }]); toast.success('Proyecto creado'); loadViewData(projectType === 'MANDRIL' ? 'mandriles' : 'fixturas'); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Nuevo {projectType === 'MANDRIL' ? 'Mandril' : 'Fixtura'}</Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo {projectType === 'MANDRIL' ? 'Mandril' : 'Fixtura'}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <FormField label="Nombre" field="name" formData={form} updateField={(_, v) => setForm({ ...form, name: v })} placeholder="Nombre del proyecto" />
          <FormField label="Descripción" field="description" formData={form} updateField={(_, v) => setForm({ ...form, description: v })} type="textarea" required={false} />
          <div className="grid grid-cols-3 gap-4">
            <FormSelect label="Prioridad" field="priority" formData={form} updateField={(_, v) => setForm({ ...form, priority: v })} options={PRIORITIES.map(p => ({ value: p, label: p }))} />
            <FormField label="% Merma" field="wastePercent" formData={form} updateField={(_, v) => setForm({ ...form, wastePercent: v })} type="number" />
            <FormField label="Fecha Límite" field="dueDate" formData={form} updateField={(_, v) => setForm({ ...form, dueDate: v })} type="date" required={false} />
          </div>
          <FormField label="Notas" field="notes" formData={form} updateField={(_, v) => setForm({ ...form, notes: v })} type="textarea" required={false} />
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label className="font-medium">Componentes</Label><Button size="sm" variant="outline" onClick={addComp}><Plus className="w-3 h-3 mr-1" />Agregar</Button></div>
            {components.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
                <div className="col-span-4"><Label className="text-xs">Nombre</Label><Input value={c.name} onChange={e => updateComp(idx, 'name', e.target.value)} className="h-9" /></div>
                <div className="col-span-3"><Label className="text-xs">Material</Label><Select value={c.materialTypeId} onValueChange={v => updateComp(idx, 'materialTypeId', v)}><SelectTrigger className="h-9"><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent>{materialTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label className="text-xs">Cant.</Label><Input type="number" min={1} value={c.quantity} onChange={e => updateComp(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-9" /></div>
                <div className="col-span-2"><Label className="text-xs">Notas</Label><Input value={c.description} onChange={e => updateComp(idx, 'description', e.target.value)} className="h-9" /></div>
                <div className="col-span-1"><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeComp(idx)}><Trash2 className="w-4 h-4" /></Button></div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crear</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// MATERIALS
function MaterialsView({ materialTypes, materialStock, search, setSearch, filterType, setFilterType, filterShape, setFilterShape, canEdit, openCreate, openEdit, handleDelete }: any) {
  const mtypes = asArray(materialTypes);
  const mstock = asArray(materialStock);
  const filteredStock = mstock.filter((s: MaterialStock) => s.active && s.type?.name.toLowerCase().includes(search.toLowerCase()) && (filterType === 'ALL' || s.typeId === filterType) && (filterShape === 'ALL' || s.shape === filterShape));

  return (
    <div className="space-y-6">
      {/* Material Types */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Tipos de Material</h3>
          {canEdit && <Button size="sm" onClick={() => openCreate({})}><Plus className="w-3 h-3 mr-1" />Nuevo Tipo</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {mtypes.filter(t => t.active).map(t => (
            <Badge key={t.id} variant="outline" className="text-sm py-1.5 px-3 cursor-pointer hover:bg-muted">
              {t.name} {canEdit && <><button className="ml-2 text-blue-500" onClick={() => openEdit(t)}>✏️</button><button className="ml-1 text-destructive" onClick={() => handleDelete('materials', t.id, 'tipo de material')}>🗑️</button></>}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Material Stock */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Buscar material..." /></div>
          <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{mtypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
          <Select value={filterShape} onValueChange={setFilterShape}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Forma" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas</SelectItem>{SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          {canEdit && <Button onClick={() => openCreate({})}><Plus className="w-4 h-4 mr-2" />Nueva Barra</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Forma</TableHead><TableHead className="hidden md:table-cell">Dimensiones</TableHead><TableHead className="text-right">Total (mm)</TableHead><TableHead className="text-right">Disponible (mm)</TableHead><TableHead className="hidden lg:table-cell">Ubicación</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredStock.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin materiales</TableCell></TableRow> : filteredStock.map((s: MaterialStock) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.type?.name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{s.shape}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.shape === 'REDONDA' && `⌀${s.diameter}mm`}
                        {s.shape === 'CUADRADA' && `${s.width}×${s.width}mm`}
                        {s.shape === 'LAMINA' && `${s.width}×${s.thickness}mm`}
                        {s.shape === 'TUBULAR' && `⌀${s.diameter}×${s.thickness}mm`}
                      </TableCell>
                      <TableCell className="text-right">{s.lengthTotal.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={s.lengthAvailable < s.lengthTotal * 0.2 ? 'text-destructive font-medium' : ''}>{s.lengthAvailable.toLocaleString()}</span>
                          <Progress value={(s.lengthAvailable / s.lengthTotal) * 100} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{s.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>}
                        {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('material-stock', s.id, 'material')}><Trash2 className="w-4 h-4" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// SPECIAL MATERIALS
function SpecialMaterialsView({ items, search, setSearch, canEdit, openCreate, openEdit, handleDelete }: any) {
  const sm = asArray(items);
  const filtered = sm.filter((i: SpecialMaterial) => i.active && i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} /></div>
        {canEdit && <Button onClick={() => openCreate({ stockKg: 0, minStockKg: 5 })}><Plus className="w-4 h-4 mr-2" />Nuevo Material</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="hidden md:table-cell">Descripción</TableHead><TableHead className="text-right">Stock (kg)</TableHead><TableHead className="hidden md:table-cell text-right">Mín. (kg)</TableHead><TableHead className="hidden lg:table-cell text-right">Costo/Kg</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((i: SpecialMaterial) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{i.description || '-'}</TableCell>
                  <TableCell className="text-right"><LowStockBadge qty={i.stockKg} min={i.minStockKg} /></TableCell>
                  <TableCell className="hidden md:table-cell text-right text-muted-foreground">{i.minStockKg}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right">{i.unitCost ? `$${i.unitCost.toFixed(2)}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Edit className="w-4 h-4" /></Button>}
                    {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('special-materials', i.id, 'material especial')}><Trash2 className="w-4 h-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// TOOLS
function ToolsView({ tools, toolTypes, search, setSearch, filterType, setFilterType, canEdit, openCreate, openEdit, handleDelete, handleAction, projects }: any) {
  const [useModal, setUseModal] = useState<ConsumableTool | null>(null);
  const [useQty, setUseQty] = useState(1);
  const [useNotes, setUseNotes] = useState('');
  const [useProject, setUseProject] = useState('');
  const ttools = asArray(tools);
  const ttypes = asArray(toolTypes);

  const filtered = ttools.filter((t: ConsumableTool) => t.active && t.name.toLowerCase().includes(search.toLowerCase()) && (filterType === 'ALL' || t.typeId === filterType));

  const registerUse = async () => {
    if (!useModal) return;
    await handleAction(`/api/tools/${useModal.id}/use`, { quantity: useQty, projectId: useProject || null, notes: useNotes }, `Uso registrado: ${useQty}x ${useModal.name}`);
    setUseModal(null); setUseQty(1); setUseNotes(''); setUseProject('');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Herramientas</TabsTrigger>
          <TabsTrigger value="types">Tipos</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1"><SearchBar value={search} onChange={setSearch} /></div>
            <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem>{ttypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            {canEdit && <Button onClick={() => openCreate({ unit: 'PIEZA', quantity: 0, minStock: 3 })}><Plus className="w-4 h-4 mr-2" />Nueva Herramienta</Button>}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="hidden md:table-cell">Tipo</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="hidden lg:table-cell">Vida Útil</TableHead><TableHead className="hidden lg:table-cell">Ubicación</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((t: ConsumableTool) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline">{t.type?.name || '-'}</Badge></TableCell>
                      <TableCell className="text-right"><LowStockBadge qty={t.quantity} min={t.minStock} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{t.averageLifeSpan ? `${t.averageLifeSpan} hrs` : '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{t.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUseModal(t); setUseQty(1); }} title="Registrar uso"><Hammer className="w-4 h-4" /></Button>
                          {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button>}
                          {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('tools', t.id, 'herramienta')}><Trash2 className="w-4 h-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end">
            {canEdit && <Button onClick={() => openCreate({})}><Plus className="w-4 h-4 mr-2" />Nuevo Tipo</Button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ttypes.filter(t => t.active).map(t => (
              <Card key={t.id}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="font-medium">{t.name}</p><p className="text-sm text-muted-foreground">{t.description || '-'}</p></div>{canEdit && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('tool-types', t.id, 'tipo de herramienta')}><Trash2 className="w-4 h-4" /></Button></>}</div></CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Use Modal */}
      <Dialog open={!!useModal} onOpenChange={() => setUseModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Uso</DialogTitle><DialogDescription>{useModal?.name}</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <FormField label="Cantidad usada" field="qty" formData={{ qty: useQty }} updateField={(_, v) => setUseQty(v)} type="number" />
            <div className="space-y-1.5">
              <Label>Proyecto (opcional)</Label>
              <Select value={useProject} onValueChange={setUseProject}><SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger><SelectContent><SelectItem value="none">Sin proyecto</SelectItem>{asArray(projects).filter((p: Project) => p.status !== 'COMPLETADO').map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <FormField label="Notas" field="notes" formData={{ notes: useNotes }} updateField={(_, v) => setUseNotes(v)} required={false} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUseModal(null)}>Cancelar</Button><Button onClick={registerUse}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// CONFIG
function ConfigView({ materialTypes, specialMaterials, toolTypes, canEdit, openCreate, openEdit, handleDelete }: any) {
  const cmt = asArray(materialTypes);
  const csm = asArray(specialMaterials);
  const ctt = asArray(toolTypes);
  return (
    <div className="space-y-8">
      {/* Material Types */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tipos de Material</h3>
          {canEdit && <Button size="sm" onClick={() => openCreate({})}><Plus className="w-3 h-3 mr-1" />Agregar</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {cmt.map(t => (
                  <TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell className="text-muted-foreground">{t.description || '-'}</TableCell><TableCell className="text-right">{canEdit && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('materials', t.id, 'tipo de material')}><Trash2 className="w-4 h-4" /></Button></>}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Special Materials */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Materiales Especiales</h3>
          {canEdit && <Button size="sm" onClick={() => openCreate({ stockKg: 0, minStockKg: 5 })}><Plus className="w-3 h-3 mr-1" />Agregar</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Stock (kg)</TableHead><TableHead className="text-right">Mín. (kg)</TableHead><TableHead className="text-right">Costo/Kg</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {csm.map(m => (
                  <TableRow key={m.id}><TableCell className="font-medium">{m.name}</TableCell><TableCell className="text-right">{m.stockKg}</TableCell><TableCell className="text-right text-muted-foreground">{m.minStockKg}</TableCell><TableCell className="text-right">{m.unitCost ? `$${m.unitCost.toFixed(2)}` : '-'}</TableCell><TableCell className="text-right">{canEdit && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('special-materials', m.id, 'material especial')}><Trash2 className="w-4 h-4" /></Button></>}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Tool Types */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tipos de Herramientas</h3>
          {canEdit && <Button size="sm" onClick={() => openCreate({})}><Plus className="w-3 h-3 mr-1" />Agregar</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {ctt.map(t => (
                  <TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell className="text-muted-foreground">{t.description || '-'}</TableCell><TableCell className="text-right">{canEdit && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete('tool-types', t.id, 'tipo de herramienta')}><Trash2 className="w-4 h-4" /></Button></>}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// USERS
function UsersView({ users, openCreate, openEdit, handleAction, currentUserId }: any) {
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const ulist = asArray(users);

  const toggleActive = async (u: User) => {
    if (u.id === currentUserId) { toast.error('No puedes desactivar tu propia cuenta'); return; }
    setToggleLoading(u.id);
    await handleAction(`/api/users/${u.id}`, { ...u, active: !u.active }, `Usuario ${u.active ? 'desactivado' : 'activado'}`);
    setToggleLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openCreate({ role: 'USUARIO' })}><Plus className="w-4 h-4 mr-2" />Nuevo Usuario</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Nombre</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {ulist.map((u: User) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-medium">{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell><Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'SUPERVISOR' ? 'secondary' : 'outline'}>{u.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={u.active ?? true} onCheckedChange={() => toggleActive(u)} disabled={u.id === currentUserId || !!toggleLoading} />
                      <span className="text-sm">{u.active ? 'Activo' : 'Inactivo'}</span>
                      {toggleLoading === u.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Edit className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
