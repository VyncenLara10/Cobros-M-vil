export interface Departamento {
  nombre: string;
  municipios: string[];
}

export const DEPARTAMENTOS: Departamento[] = [
  {
    nombre: 'Guatemala',
    municipios: [
      'Guatemala', 'Santa Catarina Pinula', 'San José Pinula', 'San José del Golfo',
      'Palencia', 'Chinautla', 'San Pedro Ayampuc', 'Mixco', 'San Pedro Sacatepéquez',
      'San Juan Sacatepéquez', 'San Raymundo', 'Chuarrancho', 'Fraijanes', 'Amatitlán',
      'Villa Nueva', 'Villa Canales', 'San Miguel Petapa',
    ],
  },
  {
    nombre: 'Alta Verapaz',
    municipios: [
      'Cobán', 'Santa Cruz Verapaz', 'San Cristóbal Verapaz', 'Tactic', 'Tamahú',
      'Tucurú', 'Panzós', 'Senahú', 'San Pedro Carchá', 'San Juan Chamelco',
      'Lanquín', 'Santa María Cahabón', 'Chisec', 'Chahal', 'Fray Bartolomé de las Casas',
      'Santa Catalina La Tinta', 'Raxruhá',
    ],
  },
  {
    nombre: 'Baja Verapaz',
    municipios: [
      'Salamá', 'San Miguel Chicaj', 'Rabinal', 'Cubulco', 'Granados',
      'El Chol', 'San Jerónimo', 'Purulhá',
    ],
  },
  {
    nombre: 'Chimaltenango',
    municipios: [
      'Chimaltenango', 'San José Poaquil', 'San Martín Jilotepeque', 'Comalapa',
      'Santa Apolonia', 'Tecpán Guatemala', 'Patzún', 'Pochuta', 'Patzicía',
      'Santa Cruz Balanyá', 'Acatenango', 'Yepocapa', 'San Andrés Itzapa',
      'Parramos', 'Zaragoza', 'El Tejar',
    ],
  },
  {
    nombre: 'Chiquimula',
    municipios: [
      'Chiquimula', 'San José La Arada', 'San Juan Ermita', 'Jocotán', 'Camotán',
      'Olopa', 'Esquipulas', 'Concepción Las Minas', 'Quezaltepeque', 'San Jacinto',
      'Ipala',
    ],
  },
  {
    nombre: 'El Progreso',
    municipios: [
      'Guastatoya', 'Morazán', 'San Agustín Acasaguastlán', 'San Cristóbal Acasaguastlán',
      'El Jícaro', 'Sansare', 'Sanarate', 'San Antonio La Paz',
    ],
  },
  {
    nombre: 'Escuintla',
    municipios: [
      'Escuintla', 'Santa Lucía Cotzumalguapa', 'La Democracia', 'Siquinalá',
      'Masagua', 'Tiquisate', 'La Gomera', 'Guanagazapa', 'San José', 'Iztapa',
      'Palín', 'San Vicente Pacaya', 'Nueva Concepción', 'Sipacate',
    ],
  },
  {
    nombre: 'Huehuetenango',
    municipios: [
      'Huehuetenango', 'Chiantla', 'Malacatancito', 'Cuilco', 'Nentón',
      'San Pedro Necta', 'Jacaltenango', 'Soloma', 'Ixtahuacán', 'Santa Bárbara',
      'La Libertad', 'La Democracia', 'San Miguel Acatán', 'San Rafael La Independencia',
      'Todos Santos Cuchumatán', 'San Juan Atitán', 'Santa Eulalia', 'San Mateo Ixtatán',
      'Colotenango', 'San Sebastián Huehuetenango', 'Tectitán', 'Concepción Huista',
      'San Juan Ixcoy', 'San Antonio Huista', 'San Sebastián Coatán', 'Barillas',
      'Aguacatán', 'San Rafael Petzal', 'San Gaspar Ixchil', 'Santiago Chimaltenango',
      'Santa Ana Huista', 'Unión Cantinil', 'Petatán',
    ],
  },
  {
    nombre: 'Izabal',
    municipios: [
      'Puerto Barrios', 'Livingston', 'El Estor', 'Morales', 'Los Amates',
    ],
  },
  {
    nombre: 'Jalapa',
    municipios: [
      'Jalapa', 'San Pedro Pinula', 'San Luis Jilotepeque', 'San Manuel Chaparrón',
      'San Carlos Alzatate', 'Monjas', 'Mataquescuintla',
    ],
  },
  {
    nombre: 'Jutiapa',
    municipios: [
      'Jutiapa', 'El Progreso', 'Santa Catarina Mita', 'Agua Blanca', 'Asunción Mita',
      'Yupiltepeque', 'Atescatempa', 'Jerez', 'El Adelanto', 'Zapotitlán',
      'Comapa', 'Jalpatagua', 'Conguaco', 'Moyuta', 'Pasaco', 'San José Acatempa',
      'Quesada',
    ],
  },
  {
    nombre: 'Petén',
    municipios: [
      'Flores', 'San José', 'San Benito', 'San Andrés', 'La Libertad',
      'San Francisco', 'Santa Ana', 'Dolores', 'San Luis', 'Sayaxché',
      'Melchor de Mencos', 'Poptún', 'Las Cruces', 'El Chal', 'San Andrés (El Naranjo)',
    ],
  },
  {
    nombre: 'Quetzaltenango',
    municipios: [
      'Quetzaltenango', 'Salcajá', 'Olintepeque', 'San Carlos Sija', 'Sibilia',
      'Cabricán', 'Cajolá', 'San Miguel Sigüilá', 'Ostuncalco', 'San Mateo',
      'Concepción Chiquirichapa', 'San Martín Sacatepéquez', 'Almolonga', 'Cantel',
      'Huitán', 'Zunil', 'Colomba', 'San Francisco La Unión', 'El Palmar',
      'Coatepeque', 'Génova', 'Flores Costa Cuca', 'La Esperanza', 'Palestina de Los Altos',
    ],
  },
  {
    nombre: 'Quiché',
    municipios: [
      'Santa Cruz del Quiché', 'Chiché', 'Chinique', 'Zacualpa', 'Chajul',
      'Chichicastenango', 'Patzité', 'San Antonio Ilotenango', 'San Pedro Jocopilas',
      'Cunén', 'San Juan Cotzal', 'Joyabaj', 'Nebaj', 'San Andrés Sajcabajá',
      'Uspantán', 'Sacapulas', 'San Bartolomé Jocotenango', 'Canillá', 'Chicamán',
      'Ixcán', 'Pachalum',
    ],
  },
  {
    nombre: 'Retalhuleu',
    municipios: [
      'Retalhuleu', 'San Sebastián', 'Santa Cruz Muluá', 'San Martín Zapotitlán',
      'San Felipe', 'San Andrés Villa Seca', 'Champerico', 'Nuevo San Carlos',
      'El Asintal',
    ],
  },
  {
    nombre: 'Sacatepéquez',
    municipios: [
      'Antigua Guatemala', 'Jocotenango', 'Pastores', 'Sumpango', 'Santo Domingo Xenacoj',
      'Santiago Sacatepéquez', 'San Bartolomé Milpas Altas', 'San Lucas Sacatepéquez',
      'Santa Lucía Milpas Altas', 'Magdalena Milpas Altas', 'Santa María de Jesús',
      'Ciudad Vieja', 'San Miguel Dueñas', 'Alotenango', 'San Antonio Aguas Calientes',
      'Santa Catarina Barahona',
    ],
  },
  {
    nombre: 'San Marcos',
    municipios: [
      'San Marcos', 'San Pedro Sacatepéquez', 'San Antonio Sacatepéquez', 'Comitancillo',
      'San Miguel Ixtahuacán', 'Concepción Tutuapa', 'Tacaná', 'Sibinal', 'Tajumulco',
      'Tejutla', 'San Rafael Pie de la Cuesta', 'Nuevo Progreso', 'El Tumbador',
      'El Rodeo', 'Malacatán', 'Catarina', 'Ayutla (Tecún Umán)', 'Ocós', 'San Pablo',
      'El Quetzal', 'La Reforma', 'Pajapita', 'Ixchiguán', 'San José Ojetenam',
      'San Cristóbal Cucho', 'Sipacapa', 'Esquipulas Palo Gordo', 'Río Blanco',
      'San Lorenzo', 'La Blanca',
    ],
  },
  {
    nombre: 'Santa Rosa',
    municipios: [
      'Cuilapa', 'Barberena', 'Santa Rosa de Lima', 'Casillas', 'San Rafael Las Flores',
      'Oratorio', 'San Juan Tecuaco', 'Chiquimulilla', 'Taxisco', 'Santa María Ixhuatán',
      'Guazacapán', 'Santa Cruz Naranjo', 'Pueblo Nuevo Viñas', 'Nueva Santa Rosa',
    ],
  },
  {
    nombre: 'Sololá',
    municipios: [
      'Sololá', 'San José Chacayá', 'Santa María Visitación', 'Santa Lucía Utatlán',
      'Nahualá', 'Santa Catarina Ixtahuacán', 'Santa Clara La Laguna', 'Concepción',
      'San Andrés Semetabaj', 'Panajachel', 'Santa Catarina Palopó', 'San Antonio Palopó',
      'San Lucas Tolimán', 'Santa Cruz La Laguna', 'San Pablo La Laguna',
      'San Marcos La Laguna', 'San Juan La Laguna', 'San Pedro La Laguna',
      'Santiago Atitlán',
    ],
  },
  {
    nombre: 'Suchitepéquez',
    municipios: [
      'Mazatenango', 'Cuyotenango', 'San Francisco Zapotitlán', 'San Bernardino',
      'San José El Ídolo', 'Santo Domingo Suchitepéquez', 'San Lorenzo', 'Samayac',
      'San Pablo Jocopilas', 'San Antonio Suchitepéquez', 'San Miguel Panán',
      'San Gabriel', 'Chicacao', 'Patulul', 'Santa Bárbara', 'San Juan Bautista',
      'Santo Tomás La Unión', 'Zunilito', 'Pueblo Nuevo', 'Río Bravo', 'San José La Máquina',
    ],
  },
  {
    nombre: 'Totonicapán',
    municipios: [
      'Totonicapán', 'San Cristóbal Totonicapán', 'San Francisco El Alto',
      'San Andrés Xecul', 'Momostenango', 'Santa María Chiquimula', 'Santa Lucía La Reforma',
      'San Bartolo',
    ],
  },
  {
    nombre: 'Zacapa',
    municipios: [
      'Zacapa', 'Estanzuela', 'Río Hondo', 'Gualán', 'Teculután', 'Usumatlán',
      'Cabañas', 'San Diego', 'La Unión', 'Huité', 'San Jorge',
    ],
  },
];

/**
 * Zonas urbanas por municipio. SOLO se listan los municipios que realmente
 * manejan división por zonas. Si un municipio no está aquí, no tiene zonas y
 * el selector simplemente no pide zona.
 */
export const ZONAS_POR_MUNICIPIO: Record<string, string[]> = {
  // Ciudad de Guatemala (no existe zona 20)
  Guatemala: [
    'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7',
    'Zona 8', 'Zona 9', 'Zona 10', 'Zona 11', 'Zona 12', 'Zona 13', 'Zona 14',
    'Zona 15', 'Zona 16', 'Zona 17', 'Zona 18', 'Zona 19', 'Zona 21', 'Zona 24', 'Zona 25',
  ],
  Mixco: [
    'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7',
    'Zona 8', 'Zona 9', 'Zona 10', 'Zona 11',
  ],
  'Villa Nueva': [
    'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7',
    'Zona 8', 'Zona 9', 'Zona 10', 'Zona 11', 'Zona 12',
  ],
  'Villa Canales': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6'],
  'San Miguel Petapa': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7', 'Zona 8'],
  Amatitlán: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Chinautla: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6'],
  'Santa Catarina Pinula': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6'],
  // Quetzaltenango cabecera
  Quetzaltenango: [
    'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7',
    'Zona 8', 'Zona 9', 'Zona 10', 'Zona 11',
  ],
  // Otras cabeceras con zonas
  Escuintla: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Cobán: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7', 'Zona 8', 'Zona 9', 'Zona 10', 'Zona 11', 'Zona 12'],
  'Puerto Barrios': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6'],
  Chimaltenango: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Mazatenango: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Jalapa: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Jutiapa: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Zacapa: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Chiquimula: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Retalhuleu: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Totonicapán: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Sololá: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  Huehuetenango: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6', 'Zona 7', 'Zona 8', 'Zona 9', 'Zona 10'],
  'San Marcos': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  'Santa Cruz del Quiché': ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'],
  Salamá: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
  'Antigua Guatemala': ['Zona 1', 'Zona 2', 'Zona 3'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve la lista de municipios de un departamento (o [] si no existe). */
export function municipiosDe(departamento: string): string[] {
  return DEPARTAMENTOS.find((d) => d.nombre === departamento)?.municipios ?? [];
}

/** Devuelve las zonas de un municipio (o [] si el municipio no maneja zonas). */
export function zonasDe(municipio: string): string[] {
  return ZONAS_POR_MUNICIPIO[municipio] ?? [];
}

/** true si el municipio maneja división por zonas. */
export function municipioTieneZonas(municipio: string): boolean {
  return (ZONAS_POR_MUNICIPIO[municipio]?.length ?? 0) > 0;
}

// ─── Lista plana (compatibilidad con código anterior) ─────────────────────────

export const MUNICIPIOS_GUATEMALA: string[] = DEPARTAMENTOS.flatMap((d) => d.municipios);

// ─── Bancos del sistema ───────────────────────────────────────────────────────

export interface BancoGuatemala {
  nombre: string;
  tiposCuenta: string[];
}

export const BANCOS_GUATEMALA: BancoGuatemala[] = [
  { nombre: 'Banco Industrial', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banrural', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco G&T Continental', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'BAC Credomatic', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco de los Trabajadores (Bantrab)', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco Promerica', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Vivibanco', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco Inmobiliario', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco Azteca Guatemala', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco de Antigua', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Banco Ficohsa Guatemala', tiposCuenta: ['Monetaria', 'Ahorro'] },
  { nombre: 'Otro', tiposCuenta: ['Monetaria', 'Ahorro'] },
];