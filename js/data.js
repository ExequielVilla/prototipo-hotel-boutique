/* ==========================================================================
   Prototipo funcional - Sistema de Gestión para un Hotel Boutique
   Datos: estructura (basada en el diagrama de clases de diseño), datos de
   ejemplo y persistencia en el navegador (localStorage).
   ========================================================================== */

const CLAVE_STORAGE = "hotelBoutique.prototipo.v1";

/* ---------------------------------------------------------------- fechas */
const Fecha = {
  hoy() {
    const d = new Date();
    return Fecha.iso(d);
  },
  iso(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${dd}`;
  },
  aDate(iso) {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
  },
  sumar(iso, dias) {
    const d = Fecha.aDate(iso);
    d.setDate(d.getDate() + dias);
    return Fecha.iso(d);
  },
  noches(desde, hasta) {
    return Math.round((Fecha.aDate(hasta) - Fecha.aDate(desde)) / 86400000);
  },
  texto(iso) {
    if (!iso) return "—";
    const [a, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${a}`;
  },
  textoLargo(iso) {
    const d = Fecha.aDate(iso);
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  },
  ahora() {
    const d = new Date();
    return `${Fecha.iso(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
  textoHora(dt) {
    if (!dt) return "—";
    return `${Fecha.texto(dt)} ${dt.slice(11, 16)}`;
  },
};

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const $$ = (n) => pesos.format(Math.round(n || 0));

/* ------------------------------------------------------- datos de ejemplo */
function datosDeEjemplo() {
  const T = Fecha.hoy();
  const d = (n) => Fecha.sumar(T, n);
  const dt = (n, hora) => `${d(n)}T${hora}`;

  const tiposHab = [
    { id: "TH1", nombre: "Doble", precio: 45000, capacidad: 2, camas: "1 matrimonial", servicios: ["Wi-Fi", "Aire acondicionado", "TV"] },
    { id: "TH2", nombre: "Triple", precio: 60000, capacidad: 3, camas: "1 matrimonial + 1 simple", servicios: ["Wi-Fi", "Aire acondicionado", "TV", "Frigobar"] },
    { id: "TH3", nombre: "Suite", precio: 85000, capacidad: 2, camas: "1 king", servicios: ["Wi-Fi", "Aire acondicionado", "TV", "Frigobar", "Jacuzzi", "Balcón"] },
  ];
  const tipoDe = { 1: "TH3", 2: "TH2", 3: "TH1", 4: "TH1", 5: "TH2", 6: "TH1", 7: "TH1", 8: "TH3", 9: "TH1", 10: "TH1" };
  const habitaciones = Object.keys(tipoDe).map((n) => ({
    id: "H" + n, numero: Number(n), tipoId: tipoDe[n], estado: "Disponible", bloqueo: null,
  }));
  const hab = (n) => habitaciones.find((h) => h.numero === n);
  hab(3).estado = "En limpieza";
  hab(9).estado = "En limpieza";
  hab(6).bloqueo = { desde: d(1), hasta: d(5), motivo: "Mantenimiento del aire acondicionado" };

  const huespedes = [
    { id: "G1", nombre: "Pérez, Juan", tipoDoc: "DNI", nroDoc: "30.123.456", email: "jperez@gmail.com", telefono: "11 4567-8910", preferencias: "Planta baja." },
    { id: "G2", nombre: "Gómez, Ana", tipoDoc: "DNI", nroDoc: "31.222.333", email: "agomez@hotmail.com", telefono: "387 455-1020", preferencias: "Cama matrimonial." },
    { id: "G3", nombre: "Ruiz, Carlos", tipoDoc: "DNI", nroDoc: "29.444.111", email: "cruiz@gmail.com", telefono: "351 488-2210", preferencias: "" },
    { id: "G4", nombre: "Sosa, Lucía", tipoDoc: "DNI", nroDoc: "33.765.432", email: "lucia.sosa@yahoo.com", telefono: "351 622-7788", preferencias: "Piso alto." },
    { id: "G5", nombre: "Díaz, Marta", tipoDoc: "DNI", nroDoc: "28.987.654", email: "mdiaz@gmail.com", telefono: "387 412-3344", preferencias: "" },
    { id: "G6", nombre: "López, Pedro", tipoDoc: "DNI", nroDoc: "27.555.888", email: "plopez@outlook.com", telefono: "11 5021-3344", preferencias: "Sin almohadas de pluma." },
    { id: "G7", nombre: "Torres, Laura", tipoDoc: "DNI", nroDoc: "32.555.666", email: "ltorres@gmail.com", telefono: "387 433-9090", preferencias: "" },
    { id: "G8", nombre: "Silva, Mariana", tipoDoc: "Pasaporte", nroDoc: "FX123456", email: "mariana.silva@gmail.com", telefono: "+55 11 98888-1234", preferencias: "Habla portugués." },
  ];

  const descuentos = [
    { id: "D1", nombre: "Fidelidad", porcentaje: 5 },
    { id: "D2", nombre: "Temporada baja", porcentaje: 10 },
    { id: "D3", nombre: "Estadía larga", porcentaje: 15 },
  ];

  const productos = [
    { id: "PR1", nombre: "Agua mineral 500 ml", marca: "Villavicencio", precio: 2500, stock: 24 },
    { id: "PR2", nombre: "Gaseosa lata 354 ml", marca: "Coca-Cola", precio: 3000, stock: 18 },
    { id: "PR3", nombre: "Alfajor de maicena", marca: "Havanna", precio: 3500, stock: 10 },
    { id: "PR4", nombre: "Vino torrontés 750 ml", marca: "El Esteco", precio: 14000, stock: 6 },
    { id: "PR5", nombre: "Dulce de cayote 450 g", marca: "Regional salteño", precio: 6500, stock: 8 },
    { id: "PR6", nombre: "Cerveza lata 473 ml", marca: "Salta", precio: 3800, stock: 3 },
  ];

  const cargos = [
    { id: "C1", nombre: "Late check-out", monto: 20000 },
    { id: "C2", nombre: "Toalla dañada", monto: 9000 },
    { id: "C3", nombre: "Lavandería", monto: 7000 },
    { id: "C4", nombre: "Limpieza extra", monto: 12000 },
  ];

  const pago = (id, fecha, medio, monto, codigo = "") => ({ id, fecha, medio, monto, codigo });

  /* reservas: estados Pendiente, Confirmada, En curso, Finalizada, Cancelada */
  const reservas = [
    // historial (para el descuento de fidelidad y el historial de estadías)
    { id: "R874", nro: 874, titularId: "G1", llegada: d(-250), salida: d(-248), cantHuespedes: 2, habitaciones: ["H4"], subtotal: 90000, descuentoId: "", descuentoMonto: 0, total: 90000, estado: "Finalizada", origen: "Booking", creada: dt(-270, "10:15"), pagos: [pago("PG1", dt(-270, "10:15"), "Tarjeta de crédito", 90000, "438211")] },
    { id: "R1012", nro: 1012, titularId: "G1", llegada: d(-140), salida: d(-137), cantHuespedes: 2, habitaciones: ["H3"], subtotal: 135000, descuentoId: "", descuentoMonto: 0, total: 135000, estado: "Finalizada", origen: "Teléfono", creada: dt(-150, "18:40"), pagos: [pago("PG2", dt(-140, "13:05"), "Transferencia", 135000, "000312874455")] },
    // en curso
    { id: "R1018", nro: 1018, titularId: "G5", llegada: d(-3), salida: d(0), cantHuespedes: 3, habitaciones: ["H2"], subtotal: 180000, descuentoId: "", descuentoMonto: 0, total: 180000, estado: "En curso", origen: "Expedia", creada: dt(-20, "09:00"), pagos: [pago("PG3", dt(-20, "09:00"), "Tarjeta de crédito", 180000, "551902")] },
    { id: "R1019", nro: 1019, titularId: "G4", llegada: d(-2), salida: d(3), cantHuespedes: 2, habitaciones: ["H8"], subtotal: 425000, descuentoId: "D3", descuentoMonto: 63750, total: 361250, estado: "En curso", origen: "Recepción", creada: dt(-10, "16:20"), pagos: [pago("PG4", dt(-2, "14:10"), "Transferencia", 361250, "000455120988")] },
    { id: "R1020", nro: 1020, titularId: "G6", llegada: d(-1), salida: d(2), cantHuespedes: 3, habitaciones: ["H5"], subtotal: 180000, descuentoId: "", descuentoMonto: 0, total: 180000, estado: "En curso", origen: "Booking", creada: dt(-15, "11:45"), pagos: [pago("PG5", dt(-1, "15:30"), "Tarjeta de débito", 180000, "662310")] },
    // llegan hoy
    { id: "R1021", nro: 1021, titularId: "G1", llegada: d(0), salida: d(3), cantHuespedes: 2, habitaciones: ["H4"], subtotal: 135000, descuentoId: "D1", descuentoMonto: 6750, total: 128250, estado: "Confirmada", origen: "Teléfono", creada: dt(-5, "12:00"), pagos: [pago("PG6", dt(-5, "12:00"), "Transferencia", 128250, "000498877120")] },
    { id: "R1024", nro: 1024, titularId: "G2", llegada: d(0), salida: d(2), cantHuespedes: 2, habitaciones: ["H10"], subtotal: 90000, descuentoId: "", descuentoMonto: 0, total: 90000, estado: "Pendiente", origen: "Teléfono", creada: dt(-3, "17:35"), pagos: [] },
    { id: "R1027", nro: 1027, titularId: "G3", llegada: d(0), salida: d(1), cantHuespedes: 1, habitaciones: ["H1"], subtotal: 85000, descuentoId: "", descuentoMonto: 0, total: 85000, estado: "Confirmada", origen: "Booking", creada: dt(-21, "15:20"), pagos: [pago("PG7", dt(-21, "15:20"), "Tarjeta de crédito", 85000, "987654")] },
    // futuras
    { id: "R1030", nro: 1030, titularId: "G7", llegada: d(5), salida: d(8), cantHuespedes: 2, habitaciones: ["H3"], subtotal: 135000, descuentoId: "", descuentoMonto: 0, total: 135000, estado: "Pendiente", origen: "Teléfono", creada: dt(-1, "10:05"), pagos: [] },
    { id: "R1031", nro: 1031, titularId: "G8", llegada: d(9), salida: d(13), cantHuespedes: 2, habitaciones: ["H8"], subtotal: 340000, descuentoId: "D2", descuentoMonto: 34000, total: 306000, estado: "Confirmada", origen: "Expedia", creada: dt(-2, "08:30"), pagos: [pago("PG8", dt(-2, "08:30"), "Tarjeta de crédito", 306000, "113377")] },
  ];

  const estadias = [
    { id: "E874", reservaId: "R874", checkIn: dt(-250, "14:20"), checkOut: dt(-248, "10:30"), acompanantes: [{ nombre: "Pérez, Laura", doc: "DNI 31.000.111" }], cargos: [], pagos: [], facturaId: "" },
    { id: "E1012", reservaId: "R1012", checkIn: dt(-140, "13:05"), checkOut: dt(-137, "10:10"), acompanantes: [{ nombre: "Pérez, Laura", doc: "DNI 31.000.111" }], cargos: [{ nombre: "Lavandería", monto: 7000, cantidad: 1 }], pagos: [pago("PG9", dt(-137, "10:10"), "Efectivo", 7000)], facturaId: "" },
    { id: "E1018", reservaId: "R1018", checkIn: dt(-3, "15:40"), checkOut: "", acompanantes: [{ nombre: "Díaz, Tomás", doc: "DNI 45.111.222" }, { nombre: "Díaz, Paula", doc: "DNI 47.333.444" }], cargos: [], pagos: [], facturaId: "" },
    { id: "E1019", reservaId: "R1019", checkIn: dt(-2, "14:10"), checkOut: "", acompanantes: [{ nombre: "Ríos, Martín", doc: "DNI 33.100.200" }], cargos: [], pagos: [], facturaId: "" },
    { id: "E1020", reservaId: "R1020", checkIn: dt(-1, "15:30"), checkOut: "", acompanantes: [{ nombre: "López, Inés", doc: "DNI 28.200.300" }, { nombre: "López, Bruno", doc: "DNI 49.010.020" }], cargos: [], pagos: [], facturaId: "" },
  ];
  ["H2", "H8", "H5"].forEach((id) => (habitaciones.find((h) => h.id === id).estado = "Ocupada"));

  const ventas = [
    { id: "V2049", nro: 2049, fecha: dt(-1, "18:02"), huespedId: "G5", items: [{ productoId: "PR2", nombre: "Gaseosa lata 354 ml", cantidad: 1, precio: 3000 }], total: 3000, pagos: [pago("PG10", dt(-1, "18:02"), "Efectivo", 3000)], facturaId: "F118" },
    { id: "V2050", nro: 2050, fecha: dt(-1, "21:10"), huespedId: "G6", items: [{ productoId: "PR3", nombre: "Alfajor de maicena", cantidad: 1, precio: 3500 }, { productoId: "PR1", nombre: "Agua mineral 500 ml", cantidad: 1, precio: 2500 }], total: 6000, pagos: [pago("PG11", dt(-1, "21:10"), "Tarjeta de débito", 6000, "770112")], facturaId: "F119" },
    { id: "V2051", nro: 2051, fecha: dt(0, "10:35"), huespedId: "G4", items: [{ productoId: "PR1", nombre: "Agua mineral 500 ml", cantidad: 2, precio: 2500 }, { productoId: "PR2", nombre: "Gaseosa lata 354 ml", cantidad: 1, precio: 3000 }], total: 8000, pagos: [pago("PG12", dt(0, "10:35"), "Efectivo", 8000)], facturaId: "F120" },
  ];

  const factura = (id, numero, fecha, huespedId, items, origen) => ({
    id, tipo: "B", puntoVenta: "0002", numero, fecha, huespedId, items,
    total: items.reduce((s, i) => s + i.subtotal, 0), cae: "7643" + String(numero).padStart(10, "0"), vtoCae: Fecha.sumar(fecha.slice(0, 10), 10), origen,
  });
  const facturas = [
    factura("F118", 118, dt(-1, "18:02"), "G5", [{ descripcion: "Gaseosa lata 354 ml", cantidad: 1, precioUnitario: 3000, subtotal: 3000 }], { tipo: "Venta", id: "V2049" }),
    factura("F119", 119, dt(-1, "21:10"), "G6", [{ descripcion: "Alfajor de maicena", cantidad: 1, precioUnitario: 3500, subtotal: 3500 }, { descripcion: "Agua mineral 500 ml", cantidad: 1, precioUnitario: 2500, subtotal: 2500 }], { tipo: "Venta", id: "V2050" }),
    factura("F120", 120, dt(0, "10:35"), "G4", [{ descripcion: "Agua mineral 500 ml", cantidad: 2, precioUnitario: 2500, subtotal: 5000 }, { descripcion: "Gaseosa lata 354 ml", cantidad: 1, precioUnitario: 3000, subtotal: 3000 }], { tipo: "Venta", id: "V2051" }),
  ];

  return {
    version: 1,
    generado: T,
    hotel: { nombre: "Hotel Boutique", razonSocial: "Hotel Boutique S.R.L.", cuit: "30-71234567-8", domicilio: "Caseros 1234, Salta Capital", telefono: "387 421-5566", email: "contacto@hotel.com" },
    usuarios: [
      { id: "U1", nombre: "Fernández, Carla", rol: "Administrador", email: "cfernandez@hotel.com" },
      { id: "U2", nombre: "Martínez, Sofía", rol: "Recepcionista", email: "smartinez@hotel.com" },
      { id: "U3", nombre: "Rojas, Diego", rol: "Recepcionista", email: "drojas@hotel.com" },
    ],
    tiposDoc: ["DNI", "Pasaporte", "Cédula"],
    mediosPago: ["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia"],
    tiposHab, habitaciones, huespedes, descuentos, productos, cargos, reservas, estadias, ventas, facturas,
    eventos: [
      { fecha: dt(-1, "10:05"), sistema: "OTA", mensaje: "Disponibilidad actualizada en Booking y Expedia (reserva N.º 1030)." },
      { fecha: dt(0, "10:35"), sistema: "ARCA", mensaje: "Factura B 0002-00000120 autorizada (CAE simulado)." },
      { fecha: dt(0, "10:35"), sistema: "Correo", mensaje: "Factura B 0002-00000120 enviada a lucia.sosa@yahoo.com." },
    ],
    seq: { reserva: 1032, venta: 2052, factura: 121, id: 100 },
    rol: "Recepcionista",
  };
}

/* ----------------------------------------------------------- persistencia */
const Store = {
  estado: null,
  cargar() {
    let guardado = null;
    try {
      const txt = localStorage.getItem(CLAVE_STORAGE);
      if (txt) guardado = JSON.parse(txt);
    } catch (e) { guardado = null; }
    // los datos de ejemplo dependen de la fecha: si cambió el día, se regeneran
    this.estado = guardado && guardado.version === 1 && guardado.generado === Fecha.hoy() ? guardado : datosDeEjemplo();
    this.guardar();
  },
  guardar() {
    try { localStorage.setItem(CLAVE_STORAGE, JSON.stringify(this.estado)); } catch (e) { /* sin persistencia */ }
  },
  reiniciar() {
    const rol = this.estado ? this.estado.rol : "Recepcionista";
    this.estado = datosDeEjemplo();
    this.estado.rol = rol;
    this.guardar();
  },
  nuevoId(prefijo) {
    this.estado.seq.id += 1;
    return prefijo + this.estado.seq.id;
  },
};

/* --------------------------------------------------------------- consultas */
const Q = {
  get e() { return Store.estado; },
  hab: (id) => Q.e.habitaciones.find((h) => h.id === id),
  tipo: (id) => Q.e.tiposHab.find((t) => t.id === id),
  huesped: (id) => Q.e.huespedes.find((g) => g.id === id),
  reserva: (id) => Q.e.reservas.find((r) => r.id === id),
  estadiaDe: (reservaId) => Q.e.estadias.find((s) => s.reservaId === reservaId),
  venta: (id) => Q.e.ventas.find((v) => v.id === id),
  factura: (id) => Q.e.facturas.find((f) => f.id === id),
  producto: (id) => Q.e.productos.find((p) => p.id === id),
  descuento: (id) => Q.e.descuentos.find((x) => x.id === id),
  pagado: (pagos) => pagos.reduce((s, p) => s + p.monto, 0),
  saldoReserva: (r) => Math.max(0, r.total - Q.pagado(r.pagos)),
  activa: (r) => ["Pendiente", "Confirmada", "En curso"].includes(r.estado),
  solapa: (a1, a2, b1, b2) => a1 < b2 && b1 < a2,
  habOcupadaEn(habId, desde, hasta, excluirReservaId) {
    const h = Q.hab(habId);
    if (h.bloqueo && Q.solapa(desde, hasta, h.bloqueo.desde, Fecha.sumar(h.bloqueo.hasta, 1))) return true;
    return Q.e.reservas.some((r) => r.id !== excluirReservaId && Q.activa(r) && r.habitaciones.includes(habId) && Q.solapa(desde, hasta, r.llegada, r.salida));
  },
  libresPorTipo(desde, hasta) {
    const res = {};
    Q.e.tiposHab.forEach((t) => (res[t.id] = []));
    Q.e.habitaciones.forEach((h) => { if (!Q.habOcupadaEn(h.id, desde, hasta)) res[h.tipoId].push(h); });
    // primero las que están listas (no en limpieza), luego por número
    Object.values(res).forEach((l) => l.sort((a, b) => (a.estado === "En limpieza") - (b.estado === "En limpieza") || a.numero - b.numero));
    return res;
  },
  esRecurrente: (huespedId) => Q.e.reservas.some((r) => r.titularId === huespedId && r.estado === "Finalizada"),
  habTexto: (r) => r.habitaciones.map((id) => { const h = Q.hab(id); return `Hab. ${h.numero} (${Q.tipo(h.tipoId).nombre})`; }).join(", "),
  reservaHoy: (habId) => {
    const T = Fecha.hoy();
    return Q.e.reservas.find((r) => Q.activa(r) && r.habitaciones.includes(habId) && r.llegada <= T && T < r.salida)
      || Q.e.reservas.find((r) => r.estado === "En curso" && r.habitaciones.includes(habId));
  },
  huespedAlojado(huespedId) {
    return Q.e.reservas.find((r) => r.estado === "En curso" && r.titularId === huespedId);
  },
};

function registrarEvento(sistema, mensaje) {
  Q.e.eventos.unshift({ fecha: Fecha.ahora(), sistema, mensaje });
}

function emitirFactura(huespedId, items, origen) {
  const e = Q.e;
  const numero = e.seq.factura++;
  const id = "F" + numero;
  const f = {
    id, tipo: "B", puntoVenta: "0002", numero, fecha: Fecha.ahora(), huespedId, items,
    total: items.reduce((s, i) => s + i.subtotal, 0),
    cae: "7643" + String(Math.floor(Math.random() * 1e10)).padStart(10, "0"),
    vtoCae: Fecha.sumar(Fecha.hoy(), 10), origen,
  };
  e.facturas.push(f);
  const comp = `Factura B ${f.puntoVenta}-${String(numero).padStart(8, "0")}`;
  registrarEvento("ARCA", `${comp} autorizada (CAE simulado ${f.cae}).`);
  const g = Q.huesped(huespedId);
  registrarEvento("Correo", `${comp} enviada a ${g ? g.email : "el huésped"}.`);
  return f;
}
