
export interface ClienteDB {
  id: string;           // ID interno del sistema
  dpi: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  // Dirección base registrada
  direccion: string;
  colonia: string;
  municipio: string;
  zona: string;
  coordenadas?: { lat: number; lng: number };
  // Datos financieros (visibles solo para cobro/legal)
  deudaTotal?: number;
  cuentaOrigen?: string;
  diasMora?: number;
  // Datos legales (visibles solo para legal)
  expediente?: string;
}

export const CLIENTES_MOCK: ClienteDB[] = [
  {
    id: 'CLI-001',
    dpi: '1234567890101',
    nombre: 'Carlos',
    apellido: 'Méndez',
    telefono: '5501-1234',
    email: 'carlos.mendez@email.com',
    direccion: '3a Calle 4-20',
    colonia: 'Col. La Paz',
    municipio: 'Guatemala',
    zona: 'Zona 3',
    coordenadas: { lat: 14.6349, lng: -90.5069 },
    deudaTotal: 12000,
    cuentaOrigen: 'Crédito personal #4421',
    diasMora: 45,
    expediente: 'EXP-2024-441',
  },
  {
    id: 'CLI-002',
    dpi: '2345678901202',
    nombre: 'Ana',
    apellido: 'Torres',
    telefono: '5502-5678',
    direccion: '5a Av. 12-55',
    colonia: 'San Cristóbal',
    municipio: 'Mixco',
    zona: 'Zona 8',
    coordenadas: { lat: 14.6295, lng: -90.5781 },
    deudaTotal: 8500,
    cuentaOrigen: 'Tarjeta de crédito #7823',
    diasMora: 30,
    expediente: 'EXP-2024-228',
  },
  {
    id: 'CLI-003',
    dpi: '3456789012303',
    nombre: 'Roberto',
    apellido: 'Chávez',
    telefono: '5503-9012',
    email: 'rchavez@empresa.com',
    direccion: '14 Calle 3-12',
    colonia: 'Zona Viva',
    municipio: 'Guatemala',
    zona: 'Zona 10',
    coordenadas: { lat: 14.5994, lng: -90.5089 },
    deudaTotal: 45000,
    cuentaOrigen: 'Préstamo empresarial #1102',
    diasMora: 90,
    expediente: 'EXP-2024-089',
  },
  {
    id: 'CLI-004',
    dpi: '4567890123404',
    nombre: 'Diego',
    apellido: 'Salazar',
    telefono: '5506-1122',
    direccion: '2a Calle 5-18',
    colonia: 'Col. Centro',
    municipio: 'Guatemala',
    zona: 'Zona 5',
    coordenadas: { lat: 14.6418, lng: -90.5132 },
    deudaTotal: 6500,
    cuentaOrigen: 'Crédito consumo #3310',
    diasMora: 20,
  },
  {
    id: 'CLI-005',
    dpi: '5678901234505',
    nombre: 'Importadora',
    apellido: 'Muñoz S.A.',
    telefono: '5507-3344',
    email: 'legal@munoz.com.gt',
    direccion: '10a Av. 22-45',
    colonia: 'Colonia El Maestro',
    municipio: 'Guatemala',
    zona: 'Zona 12',
    coordenadas: { lat: 14.5712, lng: -90.5398 },
    deudaTotal: 120000,
    cuentaOrigen: 'Línea de crédito empresarial #0091',
    diasMora: 120,
    expediente: 'EXP-2024-012',
  },
];

// Función de búsqueda simulada
export function buscarCliente(query: string): ClienteDB[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return CLIENTES_MOCK.filter(
    (c) =>
      c.dpi.includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q)
  );
}