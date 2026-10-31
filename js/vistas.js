/* ==========================================================================
   Pantallas del prototipo. Implementadas: inicio, reservas, check-in,
   check-out y ventas (circuitos principales). El resto se muestra, pero sus
   acciones avisan que no están incluidas en el prototipo.
   ========================================================================== */

const V = {};
const vista = () => $("#vista");
const ir = (ruta) => { location.hash = ruta; };
const T = () => Fecha.hoy();

/* el título y el código de pantalla van en la barra superior; en el cuerpo
   quedan la descripción y los botones de la pantalla */
function encabezado(titulo, sub, cod, acciones = "") {
  $("#titulo-pagina").innerHTML = `${titulo}${cod ? codigoP(cod[0]) : ""}`;
  if (!sub && !acciones) return "";
  return `<div class="encabezado"><div class="sub">${sub}</div>
    <div class="d-flex gap-2 flex-wrap justify-content-end">${acciones}</div></div>`;
}
/* pestañas de un módulo; a la derecha, el botón de alta de la pestaña activa */
function pestanias(base, lista, actual, boton = "") {
  if (lista.length < 2) return boton ? `<div class="d-flex justify-content-end mb-3">${boton}</div>` : "";
  return `<div class="pestanias"><nav>${lista.map((p) => `<a href="#${base}?tab=${p.id}" class="${p.id === actual ? "activa" : ""}">${p.icono}${p.texto}</a>`).join("")}</nav>
    <div class="acciones">${boton}</div></div>`;
}
const volver = (ruta, texto = "Volver") => `<a href="#${ruta}" class="btn btn-light"><i class="bi bi-arrow-left me-1"></i>${texto}</a>`;
/* "Sosa, Lucía — Hab. 8": huésped con la habitación en la que se alojaba al momento de la venta */
const huespedVentaTxt = (v) => {
  const dia = v.fecha.slice(0, 10);
  const r = Q.e.reservas.find((x) => x.titularId === v.huespedId && ["En curso", "Finalizada"].includes(x.estado) && x.llegada <= dia && dia <= x.salida);
  return huespedTxt(v.huespedId) + (r ? ` — ${r.habitaciones.map((id) => `Hab. ${Q.hab(id).numero}`).join(", ")}` : "");
};
const huespedTxt = (id) => { const g = Q.huesped(id); return g ? esc(g.nombre) : "—"; };
const fechaHora = (dt) => dt ? `${Fecha.texto(dt.slice(0, 10))}<div class="small text-suave">${dt.slice(11, 16)} h</div>` : '<span class="text-suave">—</span>';
/* búsqueda: ignora mayúsculas, tildes, puntos y espacios (30.123.456 = 30123456) */
const normalizar = (x) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function coincide(texto, ...campos) {
  const t = normalizar(texto).trim();
  if (!t) return true;
  const esta = (q) => {
    const compacto = q.replace(/[^a-z0-9]/g, "");
    return campos.some((c) => { const n = normalizar(c); return n.includes(q) || (compacto && n.replace(/[^a-z0-9]/g, "").includes(compacto)); });
  };
  // todo el texto junto, o cada palabra por separado ("mariana silva" encuentra "Silva, Mariana")
  return esta(t) || t.split(/[\s,]+/).filter(Boolean).every(esta);
}
const coincideReserva = (r, texto) => { const g = Q.huesped(r.titularId); return coincide(texto, r.nro, g.nombre, g.nroDoc); };
const buscador = (texto) => `<div class="buscador"><i class="bi bi-search"></i><input type="search" class="form-control" id="buscar" placeholder="${texto}" autocomplete="off"></div>`;
/* paginación de una lista: los elementos de la página pedida y la barra de páginas */
const POR_PAGINA = 10;
function paginar(lista, pagina) {
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const p = Math.min(Math.max(1, pagina), paginas);
  const desde = (p - 1) * POR_PAGINA;
  const items = lista.slice(desde, desde + POR_PAGINA);
  const boton = (n, txt, deshab, activa, etiqueta = "") => `<li class="page-item ${deshab ? "disabled" : ""} ${activa ? "active" : ""}">
    <button class="page-link" data-pag="${n}" ${deshab ? "disabled" : ""} ${etiqueta ? `aria-label="${etiqueta}"` : ""} ${activa ? 'aria-current="page"' : ""}>${txt}</button></li>`;
  const barra = lista.length ? `<div class="paginacion"><span class="small text-suave">Mostrando ${desde + 1}–${desde + items.length} de ${lista.length}</span>
    <nav aria-label="Páginas"><ul class="pagination pagination-sm mb-0">
      ${boton(p - 1, '<i class="bi bi-chevron-left"></i>', p === 1, false, "Página anterior")}
      ${Array.from({ length: paginas }, (_, i) => boton(i + 1, i + 1, false, i + 1 === p)).join("")}
      ${boton(p + 1, '<i class="bi bi-chevron-right"></i>', p === paginas, false, "Página siguiente")}
    </ul></nav></div>` : "";
  return { items, barra, pagina: p };
}
/* usuario que está usando el sistema y nombre de un usuario registrado */
const usuarioActualId = () => (Q.e.usuarios.find((u) => u.nombre === USUARIO_DEMO[App.rol()]) || Q.e.usuarios[0]).id;
const usuarioTxt = (id) => { const u = Q.e.usuarios.find((x) => x.id === id); return u ? esc(u.nombre) : "—"; };
const nochesTxt = (r) => { const n = Fecha.noches(r.llegada, r.salida); return `${n} noche${n === 1 ? "" : "s"}`; };

/* el resumen de la reserva acompaña al bajar sólo si entra completo en la pantalla;
   si no, queda en su lugar para que los botones no queden ocultos */
function ajustarResumenFijo() {
  const c = $(".resumen-fijo");
  if (c) c.classList.toggle("fijo", c.offsetHeight <= window.innerHeight - 92);
}
window.addEventListener("resize", ajustarResumenFijo);

/* datos del titular, cada uno con su rótulo; las preferencias se muestran siempre */
const datosTitular = (g) => `<dl class="datos datos-grilla mb-0">
  <div><dt>Documento</dt><dd>${esc(g.tipoDoc)} ${esc(g.nroDoc)}</dd></div>
  <div><dt>Teléfono</dt><dd>${esc(g.telefono) || "—"}</dd></div>
  <div><dt>Email</dt><dd>${esc(g.email) || "—"}</dd></div>
  <div><dt>Preferencias</dt><dd>${esc(g.preferencias) || "—"}</dd></div></dl>`;
/* "enviada a x@y.com", o que no se envió si el huésped no tiene email (es opcional) */
const enviadoA = (g, fem = true) => g.email ? `${fem ? "enviada" : "enviado"} a ${esc(g.email)}`
  : `no ${fem ? "enviada" : "enviado"}: el huésped no tiene email`;
const contactoTxt = (g) => `<span class="text-suave">Email:</span> ${esc(g.email) || "—"} · <span class="text-suave">Teléfono:</span> ${esc(g.telefono) || "—"}`;

/* botón para quitar un elemento de una lista */
const tachito = (atributo) => `<button class="btn btn-sm btn-link text-danger p-0" ${atributo} title="Quitar"><i class="bi bi-trash"></i></button>`;
/* botones al pie de un formulario: la acción principal y Cancelar, a la derecha */
const pie = (botones, vuelta) => `<div class="d-flex flex-wrap align-items-center gap-2 justify-content-end">
  <span class="small text-suave me-auto" id="motivo"></span>${botones}<a href="#${vuelta}" class="btn btn-light">Cancelar</a></div>`;

/* datos de la reserva con el mismo formato en el detalle, el check-in y el check-out:
   fechas en casilleros, habitaciones y huéspedes, y el titular con sus datos */
function tarjetasReserva(r) {
  const es = Q.estadiaDe(r.id);
  const g = Q.huesped(r.titularId);
  const caja = (rotulo, valor) => `<div><span>${rotulo}</span><b>${valor}</b></div>`;
  return `<div class="card mb-3"><div class="card-header"><i class="bi bi-calendar-range me-2"></i>Estadía</div><div class="card-body">
      <div class="resumen-fechas cuatro">
        ${caja("Llegada esperada", Fecha.texto(r.llegada))}
        ${caja("Salida esperada", Fecha.texto(r.salida))}
        ${caja("Check-in", es ? Fecha.textoHora(es.checkIn) : "—")}
        ${caja("Check-out", es && es.checkOut ? Fecha.textoHora(es.checkOut) : "—")}
      </div>
      <dl class="datos datos-grilla tres mb-0 mt-3">
        <div><dt>Habitaciones</dt><dd>${Q.habTexto(r)}</dd></div>
        <div><dt>Noches</dt><dd>${Fecha.noches(r.llegada, r.salida)}</dd></div>
        <div><dt>Huéspedes</dt><dd>${r.cantHuespedes}</dd></div>
        ${es ? `<div class="ancho"><dt>Acompañantes</dt><dd>${es.acompanantes.length ? es.acompanantes.map((a) => `${esc(a.nombre)} (${esc(a.doc)})`).join(", ") : "—"}</dd></div>` : ""}
        ${es && es.cargos.length ? `<div class="ancho"><dt>Cargos adicionales</dt><dd>${es.cargos.map((c) => `${esc(c.nombre)} × ${c.cantidad}: ${$$(c.monto * c.cantidad)}`).join(" · ")}</dd></div>` : ""}
      </dl>
    </div></div>
    <div class="card mb-3"><div class="card-header"><i class="bi bi-person me-2"></i>Titular</div><div class="card-body">
      <div class="fw-semibold mb-2">${esc(g.nombre)}</div>
      ${datosTitular(g)}
    </div></div>`;
}
/* línea del resumen de importes */
const lineaImporte = (rotulo, valor, { id = "", clase = "" } = {}) => `<div class="resumen-linea ${clase}"><span>${rotulo}</span><span ${id ? `id="${id}"` : ""}>${valor}</span></div>`;

/* ===================================================================== P0 */
async function registrarLimpieza(habId, despues) {
  const h = Q.hab(habId);
  const ok = await confirmar("Registrar limpieza", `¿Confirmás que la limpieza de la <b>Hab. ${h.numero}</b> fue realizada? Pasará a estado <b>disponible</b>.`, { boton: "Confirmar limpieza" });
  if (!ok) return;
  h.estado = "Disponible";
  Store.guardar();
  toast(`Limpieza de la Hab. ${h.numero} registrada.`);
  despues();
}

V.inicio = () => {
  const hoy = T();
  const e = Q.e;
  const llegadas = e.reservas.filter((r) => ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida);
  const salidas = e.reservas.filter((r) => r.estado === "En curso" && r.salida <= hoy);
  const ocupadas = e.habitaciones.filter((h) => h.estado === "Ocupada").length;
  const kpi = (icono, color, valor, etiqueta) => `<div class="col-12 col-md-4"><div class="card kpi h-100"><div class="card-body d-flex align-items-center gap-3">
    <div class="icono" style="background:${color}1a;color:${color}"><i class="bi bi-${icono}"></i></div>
    <div><div class="valor">${valor}</div><div class="etiqueta">${etiqueta}</div></div></div></div></div>`;

  // qué mostrar en cada habitación y a qué funcionalidad lleva al hacer clic
  const acciones = {};
  const tiles = e.habitaciones.map((h) => {
    const t = Q.tipo(h.tipoId);
    const bloqHoy = h.bloqueo && h.bloqueo.desde <= hoy && hoy <= h.bloqueo.hasta;
    const r = Q.reservaHoy(h.id);
    let estado = h.estado, nota = "", accion = "", fn = null;
    if (bloqHoy) {
      estado = "Bloqueada";
      nota = `<i class="bi bi-lock me-1"></i>Bloqueada hasta ${Fecha.texto(h.bloqueo.hasta)}<div class="text-suave">${esc(h.bloqueo.motivo || "")}</div>`;
      // una habitación bloqueada no tiene acciones del día: el bloqueo se gestiona en Habitaciones
    } else if (r && r.estado === "En curso") {
      const sale = r.salida <= hoy;
      nota = `<i class="bi bi-person me-1"></i>${esc(Q.huesped(r.titularId).nombre)}<div class="${sale ? "text-danger fw-semibold" : "text-suave"}">${sale ? "Salida esperada hoy" : `Salida esperada ${Fecha.texto(r.salida)}`}</div>`;
      accion = "Hacer check-out"; fn = () => ir(`/checkout/${r.id}?volver=/inicio`);
    } else if (r && r.llegada <= hoy) {
      nota = `<i class="bi bi-person me-1"></i>${esc(Q.huesped(r.titularId).nombre)}<div class="text-primary fw-semibold">Llegada esperada hoy</div>`;
      accion = "Hacer check-in"; fn = () => ir(`/checkin/${r.id}?volver=/inicio`);
    } else if (h.estado === "En limpieza") {
      nota = `${icono("limpieza")}Pendiente de limpieza`;
      accion = "Registrar limpieza"; fn = () => registrarLimpieza(h.id, V.inicio);
    } else {
      const prox = e.reservas.filter((x) => Q.activa(x) && x.habitaciones.includes(h.id) && x.llegada > hoy).sort((a, b) => (a.llegada > b.llegada ? 1 : -1))[0];
      nota = `<i class="bi bi-check2-circle me-1"></i>Lista para ocupar${prox ? `<div class="text-suave">Próxima llegada esperada ${Fecha.texto(prox.llegada)}</div>` : ""}`;
      accion = "Nueva reserva"; fn = () => ir("/reservas/nueva?volver=/inicio");
    }
    acciones[h.id] = fn;
    return `<div class="hab ${estado.replace(/ /g, "-")} ${fn ? "" : "sin-accion"}" ${fn ? `data-hab="${h.id}" role="button" tabindex="0"` : ""}>
      <div class="cuerpo">
        <div class="d-flex justify-content-between align-items-start"><span class="num">Hab. ${h.numero}</span>${estadoBadge(estado)}</div>
        <div class="tipo">${t.nombre}</div>
        <div class="detalle camas">${icono("cama")}<span>${t.camas}</span></div>
        <div class="detalle"><i class="bi bi-people"></i><span>Hasta ${t.capacidad} huéspedes</span></div>
        <div class="nota">${nota}</div>
      </div>
      <div class="accion">${fn ? `<span>${accion}</span><i class="bi bi-arrow-right"></i>` : '<span class="text-suave fw-normal">Sin acciones</span>'}</div></div>`;
  }).join("");

  vista().innerHTML = encabezado("Inicio", "", ["P0"]) + `
    <div class="row g-3 mb-3">
      ${kpi("door-closed", "#d64545", `${ocupadas}/${e.habitaciones.length}`, "Habitaciones ocupadas")}
      ${kpi("box-arrow-in-right", "#1b4fb5", llegadas.length, "Check-ins pendientes hoy")}
      ${kpi("box-arrow-right", "#a35b00", salidas.length, "Check-outs pendientes hoy")}
    </div>
    <div class="d-flex justify-content-end mb-3"><a href="#/reservas/nueva?volver=/inicio" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva reserva</a></div>
    <div class="card"><div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center"><span><i class="bi bi-grid-3x3-gap me-2"></i>Estado de las habitaciones hoy</span>
      <div class="leyenda fw-normal"><span class="l-disp">Disponible</span><span class="l-ocup">Ocupada</span><span class="l-limp">En limpieza</span><span class="l-bloq">Bloqueada</span></div></div>
      <div class="card-body"><div class="habs">${tiles}</div></div></div>`;
  $all("[data-hab]").forEach((el) => {
    el.onclick = () => acciones[el.dataset.hab]();
    el.onkeydown = (ev) => { if (ev.key === "Enter") acciones[el.dataset.hab](); };
  });
};

/* ==================================================================== P13 */
V.reservas = () => {
  const filtros = ["Todas", "Pendiente", "Confirmada", "En curso", "Finalizada", "Cancelada"];
  let filtro = sessionStorage.getItem("filtroReservas") || "Todas";
  let pagina = Number(sessionStorage.getItem("paginaReservas")) || 1;
  let texto = "";
  vista().innerHTML = encabezado("Reservas", "", ["P13", "Inicio reservas"],
    `<a href="#/reservas/nueva" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva reserva</a>`) + `
    <div class="card"><div class="card-body d-flex flex-wrap gap-2 align-items-center border-bottom">
      <div style="flex: 0 1 340px">${buscador("Buscar")}</div>
      <div class="filtros" id="filtros">${filtros.map((f) => `<button class="chip" data-f="${f}">${f}</button>`).join("")}</div>
    </div><div class="table-responsive"><table class="table table-hover tabla-reservas"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th class="text-center">Llegada esperada</th><th class="text-center">Salida esperada</th><th class="text-center">Check-in</th><th class="text-center">Check-out</th>
      <th class="text-center">Estado</th><th class="text-end">Total</th><th class="text-end">Saldo</th><th></th></tr></thead><tbody id="filas"></tbody></table></div>
    <div id="paginacion"></div></div>`;
  const pintar = () => {
    $all("#filtros button").forEach((b) => b.classList.toggle("active", b.dataset.f === filtro));
    const lista = Q.e.reservas.filter((r) => (filtro === "Todas" || r.estado === filtro) && coincideReserva(r, texto)).sort((a, b) => (b.llegada > a.llegada ? 1 : -1));
    const pg = paginar(lista, pagina);
    pagina = pg.pagina;
    sessionStorage.setItem("paginaReservas", pagina);
    $("#paginacion").innerHTML = pg.barra;
    $all("#paginacion [data-pag]").forEach((b) => (b.onclick = () => { pagina = Number(b.dataset.pag); pintar(); }));
    $("#filas").innerHTML = lista.length ? pg.items.map((r) => {
      const s = Q.saldoReserva(r);
      const es = Q.estadiaDe(r.id);
      return `<tr class="click" data-id="${r.id}"><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${Fecha.texto(r.llegada)}</td><td>${Fecha.texto(r.salida)}</td>
        <td>${fechaHora(es && es.checkIn)}</td><td>${fechaHora(es && es.checkOut)}</td><td>${estadoBadge(r.estado)}</td><td class="text-end">${$$(r.total)}</td>
        <td class="text-end ${s > 0 && Q.activa(r) ? "saldo-pend fw-semibold" : "text-suave"}">${Q.activa(r) ? $$(s) : "—"}</td>
        <td class="text-end text-nowrap">${r.estado === "Pendiente" && s > 0 ? `<button class="btn btn-sm btn-pagar btn-icono" data-pagar="${r.id}" title="Registrar pago" aria-label="Registrar pago"><i class="bi bi-cash-coin"></i></button>` : ""}
          ${r.estado === "Pendiente" ? `<button class="btn btn-sm btn-editar btn-icono" data-mod="${r.id}" title="Modificar"><i class="bi bi-pencil"></i></button>` : ""}
          ${["Pendiente", "Confirmada"].includes(r.estado) ? `<button class="btn btn-sm btn-eliminar btn-icono" data-cancel="${r.id}" title="Cancelar reserva" aria-label="Cancelar reserva"><i class="bi bi-calendar-x"></i></button>` : ""}</td></tr>`;
    }).join("") : `<tr><td colspan="11"><div class="vacio"><i class="bi bi-inbox"></i>No hay reservas que coincidan.</div></td></tr>`;
    $all("#filas tr.click").forEach((tr) => (tr.onclick = (ev) => { if (!ev.target.closest("button")) ir(`/reservas/${tr.dataset.id}`); }));
    $all("[data-pagar]").forEach((b) => (b.onclick = () => registrarPagoReserva(b.dataset.pagar, pintar)));
    $all("[data-mod]").forEach((b) => (b.onclick = () => ir(`/reservas/${b.dataset.mod}/modificar`)));
    $all("[data-cancel]").forEach((b) => (b.onclick = () => cancelarReserva(b.dataset.cancel, pintar)));
  };
  // al cambiar el filtro o la búsqueda se vuelve a la primera página
  $all("#filtros button").forEach((b) => (b.onclick = () => { filtro = b.dataset.f; pagina = 1; sessionStorage.setItem("filtroReservas", filtro); pintar(); }));
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pagina = 1; pintar(); };
  pintar();
};

/* pago de una reserva pendiente antes del check-in: abre el panel de pago (P3)
   con el saldo; si el saldo queda en cero la reserva pasa a confirmada */
function registrarPagoReserva(id, despues) {
  const r = Q.reserva(id);
  const saldo = Q.saldoReserva(r);
  const pagos = [];
  const { el, m } = abrirModal({
    titulo: `Registrar pago · reserva N.º ${r.nro}`,
    tamano: "modal-lg",
    cuerpo: `<div class="d-flex flex-wrap gap-3 small mb-3">
        <span><span class="text-suave">Titular:</span> ${huespedTxt(r.titularId)}</span>
        <span><span class="text-suave">Total de la reserva:</span> ${$$(r.total)}</span>
        <span><span class="text-suave">Saldo:</span> <b class="saldo-pend">${$$(saldo)}</b></span></div>
      <div id="pago-reserva"></div>
      <div class="small text-suave mt-2">Si se paga el saldo completo, la reserva queda confirmada; si no, sigue pendiente y el resto se abona en el check-in.</div>`,
    pie: `<button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="btn-pagar" disabled>Registrar pago</button>`,
  });
  new PanelPago($("#pago-reserva", el), { total: saldo, pagos, alCambiar: () => ($("#btn-pagar", el).disabled = !pagos.length) });
  $("#btn-pagar", el).onclick = () => {
    r.pagos.push(...limpiarPagos(pagos));
    const resta = Q.saldoReserva(r);
    const g = Q.huesped(r.titularId);
    if (resta === 0) {
      r.estado = "Confirmada";
      registrarEvento("Correo", `Confirmación de la reserva N.º ${r.nro} ${enviadoA(g)}.`);
      toast(`Pago registrado. La reserva N.º ${r.nro} quedó <b>confirmada</b>. Confirmación ${enviadoA(g)}.`);
    } else {
      toast(`Pago registrado. La reserva N.º ${r.nro} sigue pendiente, con un saldo de <b>${$$(resta)}</b>.`);
    }
    Store.guardar();
    App.actualizarEventos();
    m.hide();
    despues();
  };
}

async function cancelarReserva(id, despues) {
  const r = Q.reserva(id);
  const pagado = Q.pagado(r.pagos);
  const ok = await confirmar(`Cancelar reserva N.º ${r.nro}`,
    `Se cancelará la reserva de <b>${huespedTxt(r.titularId)}</b> del ${Fecha.texto(r.llegada)} al ${Fecha.texto(r.salida)} (${Q.habTexto(r)}).
     Se liberará la disponibilidad en las OTAs y se notificará al huésped por correo.
     ${pagado > 0 ? `<br><br><i class="bi bi-info-circle me-1"></i>La reserva tiene pagos por <b>${$$(pagado)}</b>, que se reintegran según la política de cancelación.` : ""}`,
    { boton: "Confirmar cancelación", clase: "btn-danger" });
  if (!ok) return;
  r.estado = "Cancelada";
  registrarEvento("OTA", `Disponibilidad liberada en Booking y Expedia (reserva N.º ${r.nro} cancelada: ${Q.habTexto(r)}).`);
  registrarEvento("Correo", `Aviso de cancelación de la reserva N.º ${r.nro} enviado a ${Q.huesped(r.titularId).email}.`);
  Store.guardar();
  App.actualizarEventos();
  toast(`Reserva N.º ${r.nro} cancelada. Se liberó la disponibilidad en Booking y Expedia y se avisó al huésped por correo.`, "warning");
  despues();
}

/* ====================================================== P1, P2 y P15
   La modificación de una reserva pendiente (P15) usa la misma pantalla que
   la nueva reserva, con el titular fijo y 'Guardar cambios' en lugar de
   'Continuar'. */
V.reservaModificar = (id, params) => {
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  if (r.estado !== "Pendiente") {
    vista().innerHTML = encabezado("Modificar reserva", "", ["P15", "Modificar reserva"], volver(`/reservas/${r.id}`)) +
      `<div class="alert alert-info">Solo se pueden modificar las reservas pendientes de pago. La reserva N.º ${r.nro} está <b>${r.estado.toLowerCase()}</b>.</div>`;
    return;
  }
  V.reservaNueva(params, r);
};

V.reservaNueva = (params, rMod) => {
  const walkin = params.get("walkin") === "1";
  const vuelta = params.get("volver") || (walkin ? "/checkin" : "/reservas");
  const habsPorTipo = (r) => r.habitaciones.reduce((s, id) => { const t = Q.hab(id).tipoId; s[t] = (s[t] || 0) + 1; return s; }, {});
  // fidelidadAuto: el descuento de fidelidad lo propuso el sistema (se quita si se cambia el titular)
  const w = rMod
    ? { paso: 1, llegada: rMod.llegada, salida: rMod.salida, cant: rMod.cantHuespedes, buscado: true, sel: habsPorTipo(rMod), titularId: rMod.titularId, descuentoId: rMod.descuentoId || "", fidelidadAuto: false, pagos: [], walkin }
    : { paso: 1, llegada: T(), salida: Fecha.sumar(T(), 1), cant: 2, buscado: false, sel: {}, titularId: "", descuentoId: "", fidelidadAuto: false, pagos: [], walkin };
  // al modificar, las habitaciones de la propia reserva cuentan como libres
  const libresAhora = () => Q.libresPorTipo(w.llegada, w.salida, rMod && rMod.id);
  const minLlegada = rMod && rMod.llegada < T() ? rMod.llegada : T();

  const noches = () => Fecha.noches(w.llegada, w.salida);
  const importeTipo = (tid) => Q.tipo(tid).precio * (w.sel[tid] || 0) * noches();
  const subtotal = () => Object.keys(w.sel).reduce((s, tid) => s + importeTipo(tid), 0);
  const descMonto = () => { const d = Q.descuento(w.descuentoId); return d ? Math.round(subtotal() * d.porcentaje / 100) : 0; };
  const total = () => subtotal() - descMonto();
  const capacidad = () => Object.entries(w.sel).reduce((s, [tid, n]) => s + Q.tipo(tid).capacidad * n, 0);
  const metaTxt = () => { const n = noches(); return `${n} noche${n === 1 ? "" : "s"} · ${w.cant} huésped${w.cant === 1 ? "" : "es"}`; };
  const descTxt = () => { const d = Q.descuento(w.descuentoId); return `Descuento${d ? ` (${esc(d.nombre)} ${d.porcentaje} %)` : ""}`; };
  // habitaciones elegidas por tipo; en el paso 2 se agregan los números asignados
  const habsElegidas = (asignadas) => Object.keys(w.sel).length
    ? Object.entries(w.sel).map(([tid, n]) => `<div class="resumen-linea"><span>${n} × ${Q.tipo(tid).nombre}${asignadas
        ? `<small class="d-block text-suave">${asignadas.filter((id) => Q.hab(id).tipoId === tid).map((id) => `Hab. ${Q.hab(id).numero}`).join(", ")}</small>` : ""}</span>
        <span>${$$(importeTipo(tid))}</span></div>`).join("")
    : `<div class="text-suave small py-1">Todavía no elegiste habitaciones.</div>`;
  /* tarjeta de resumen a la derecha, como en los sistemas de reservas: fechas,
     habitaciones, importes, total y los botones de la pantalla */
  const tarjetaResumen = (asignadas, botones) => `<div class="card resumen-reserva resumen-fijo">
    <div class="card-header"><i class="bi bi-receipt me-2"></i>Resumen de la reserva</div><div class="card-body">
      <div class="resumen-fechas">
        <div><span>Llegada esperada</span><b>${Fecha.texto(w.llegada)}</b></div>
        <div><span>Salida esperada</span><b>${Fecha.texto(w.salida)}</b></div>
      </div>
      <div class="resumen-meta" id="r-meta">${metaTxt()}</div>
      <div class="resumen-seccion"><div class="resumen-titulo">Habitaciones</div><div id="r-habs">${habsElegidas(asignadas)}</div></div>
      <div class="resumen-seccion">
        <div class="resumen-linea"><span>Subtotal</span><span id="r-sub">${$$(subtotal())}</span></div>
        <div class="resumen-linea"><span id="r-desc-txt">${descTxt()}</span><span id="r-desc" class="${descMonto() ? "text-success" : ""}">− ${$$(descMonto())}</span></div>
        ${rMod && rMod.pagos.length ? `<div class="resumen-linea text-suave"><span>Ya abonado</span><span>${$$(Q.pagado(rMod.pagos))}</span></div>` : ""}
      </div>
      <div class="resumen-final"><span>Total</span><span id="r-total">${$$(total())}</span></div>
      <div class="pt-3">${botones}</div>
    </div></div>`;

  const pasos = () => `<div class="pasos">
    <div class="paso ${w.paso === 1 ? "activo" : "hecho"}"><span class="n">${w.paso > 1 ? '<i class="bi bi-check"></i>' : 1}</span>Datos de la reserva</div><div class="sep"></div>
    <div class="paso ${w.paso === 2 ? "activo" : ""}"><span class="n">2</span>Confirmación y pago</div></div>`;

  const paso1 = () => {
    const libres = w.buscado ? libresAhora() : null;
    const n = noches();
    const titulares = [...Q.e.huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre));
    vista().innerHTML = encabezado(walkin ? "Check-in sin reserva" : rMod ? `Modificar reserva N.º ${rMod.nro}` : "Nueva reserva",
      "", rMod ? ["P15", "Modificar reserva"] : ["P1", "Nueva reserva"]) + (rMod ? "" : pasos()) + `
    <div class="row g-3"><div class="col-lg-8">
    <div class="card mb-3"><div class="card-header"><i class="bi bi-calendar-range me-2"></i>Fechas y huéspedes</div><div class="card-body">
      <div class="row g-2 align-items-end">
        <div class="col-sm-4 col-lg-3"><label class="form-label obligatorio">Llegada esperada</label><input type="date" class="form-control" id="llegada" value="${w.llegada}" min="${minLlegada}" ${walkin ? "disabled" : ""}></div>
        <div class="col-sm-4 col-lg-3"><label class="form-label obligatorio">Salida esperada</label><input type="date" class="form-control" id="salida" value="${w.salida}" min="${Fecha.sumar(w.llegada, 1)}"></div>
        <div class="col-sm-2 col-lg-2"><label class="form-label obligatorio">Huéspedes</label><input type="number" class="form-control" id="cant" min="1" max="12" value="${w.cant}"></div>
        <div class="col-sm-2 col-lg-2"><button class="btn btn-outline-primary w-100" id="buscar"><i class="bi bi-search"></i> Buscar</button></div>
      </div>
      <div class="small text-suave mt-2">${n > 0 ? `${n} noche${n === 1 ? "" : "s"}` : ""}</div>
    </div></div>

    <div class="card mb-3"><div class="card-header"><i class="bi bi-door-open me-2"></i>Tipos de habitación disponibles</div>
      ${!w.buscado ? `<div class="vacio"><i class="bi bi-search"></i>Indicá las fechas y presioná <b>Buscar</b> para ver la disponibilidad.</div>` : `
      <div class="card-body"><div class="table-responsive marco-tabla"><table class="table mb-0 tabla-tipos"><thead><tr><th>Tipo</th><th class="text-center">Capacidad</th><th class="text-end">Precio por noche</th><th class="text-center">Disponibles</th><th class="text-center">Cantidad</th><th class="text-end">Importe</th></tr></thead><tbody>
      ${Q.e.tiposHab.map((t) => {
        const disp = libres[t.id].length;
        const cant = w.sel[t.id] || 0;
        if (!disp) return `<tr class="sin-disp"><td><b>${t.nombre}</b><div class="small">${t.camas}</div></td><td>${t.capacidad}</td><td>${$$(t.precio)}</td>
          <td colspan="3" class="text-center"><i class="bi bi-slash-circle me-1"></i>Sin disponibilidad para esas fechas</td></tr>`;
        return `<tr class="${cant ? "elegida" : ""}" data-fila="${t.id}"><td><b>${t.nombre}</b><div class="small text-suave">${t.camas}</div></td><td>${t.capacidad}</td><td>${$$(t.precio)}</td>
          <td><span class="fw-semibold text-success">${disp}</span></td>
          <td><input type="number" class="form-control form-control-sm mx-auto text-center" style="width:72px" min="0" max="${disp}" value="${cant}" data-cant="${t.id}"></td>
          <td class="text-end fw-semibold" data-importe="${t.id}">${cant ? $$(importeTipo(t.id)) : "—"}</td></tr>`;
      }).join("")}</tbody></table></div></div>`}
    </div>

    <div class="card"><div class="card-header"><i class="bi bi-person me-2"></i>Titular y descuento</div><div class="card-body">
        <label class="form-label obligatorio">Titular de la reserva</label>
        ${rMod ? `<div class="fw-semibold">${esc(Q.huesped(w.titularId).nombre)} <span class="fw-normal text-suave">· ${esc(Q.huesped(w.titularId).tipoDoc)} ${esc(Q.huesped(w.titularId).nroDoc)}</span></div>`
          : `<div class="d-flex gap-2"><select class="form-select" id="titular"><option value="">Seleccioná un huésped…</option>
          ${titulares.map((g) => `<option value="${g.id}" ${g.id === w.titularId ? "selected" : ""}>${esc(g.nombre)} — ${esc(g.tipoDoc)} ${esc(g.nroDoc)}</option>`).join("")}</select>
          <button class="btn btn-outline-primary text-nowrap" id="nuevo-huesped"><i class="bi bi-person-plus me-1"></i>Nuevo huésped</button></div>`}
        <div id="nota-titular" class="small mt-2"></div>
        <label class="form-label mt-3">Descuento</label>
        <select class="form-select" id="descuento" style="max-width:340px"><option value="">Sin descuento</option>
          ${Q.e.descuentos.map((d) => `<option value="${d.id}" ${d.id === w.descuentoId ? "selected" : ""}>${esc(d.nombre)} (${d.porcentaje} %)</option>`).join("")}</select>
    </div></div>
    </div>
    <!-- el resumen queda a la derecha y acompaña al bajar la página -->
    <div class="col-lg-4">${tarjetaResumen(null, `
      <div class="small mb-2" id="motivo"></div>
      <button class="btn btn-primary btn-lg w-100" id="continuar">${rMod ? '<i class="bi bi-check2 me-1"></i>Guardar cambios' : 'Continuar <i class="bi bi-arrow-right ms-1"></i>'}</button>
      <a href="#${vuelta}" class="btn btn-light w-100 mt-2">Cancelar</a>`)}</div>
    </div>`;

    ajustarResumenFijo();
    const nota = $("#nota-titular");
    if (w.titularId) {
      const g = Q.huesped(w.titularId);
      nota.innerHTML = `${contactoTxt(g)}<br><span class="text-suave">Preferencias:</span> ${esc(g.preferencias) || "—"}
        ${Q.esRecurrente(g.id) ? `<br><span class="text-success"><i class="bi bi-award me-1"></i>Huésped recurrente: se aplica el descuento de fidelidad (5 %).</span>` : ""}`;
    }
    const error = (txt) => ($("#motivo").innerHTML = `<span class="text-danger">${txt}</span>`);
    // importes y totales se actualizan sin volver a dibujar la pantalla
    const refrescar = () => {
      $all("[data-fila]").forEach((tr) => {
        const tid = tr.dataset.fila;
        tr.classList.toggle("elegida", !!w.sel[tid]);
        $(`[data-importe="${tid}"]`).textContent = w.sel[tid] ? $$(importeTipo(tid)) : "—";
      });
      $("#r-sub").textContent = $$(subtotal());
      $("#r-desc-txt").innerHTML = descTxt();
      $("#r-desc").textContent = `− ${$$(descMonto())}`;
      $("#r-desc").classList.toggle("text-success", descMonto() > 0);
      $("#r-habs").innerHTML = habsElegidas(null);
      ajustarResumenFijo();
      $("#r-total").textContent = $$(total());
      $("#motivo").textContent = "";
    };
    const cambiarFechas = () => {
      w.llegada = $("#llegada").value; w.salida = $("#salida").value; w.cant = Number($("#cant").value) || 1;
      if (w.buscado || Object.keys(w.sel).length) { w.buscado = false; w.sel = {}; }
      paso1();
    };
    $("#llegada").onchange = () => { if ($("#salida").value <= $("#llegada").value) $("#salida").value = Fecha.sumar($("#llegada").value, 1); cambiarFechas(); };
    $("#salida").onchange = cambiarFechas;
    $("#cant").onchange = () => { w.cant = Number($("#cant").value) || 1; };
    $("#buscar").onclick = () => {
      w.llegada = $("#llegada").value; w.salida = $("#salida").value; w.cant = Number($("#cant").value) || 1;
      if (!w.llegada || !w.salida || w.salida <= w.llegada) { toast("Intervalo de fecha inválido: la salida esperada debe ser posterior a la llegada esperada.", "danger"); return; }
      if (w.llegada < minLlegada) { toast("Intervalo de fecha inválido: la llegada esperada no puede ser anterior a hoy.", "danger"); return; }
      w.buscado = true; w.sel = {}; paso1();
      registrarEvento("OTA", `Consulta de disponibilidad del ${Fecha.texto(w.llegada)} al ${Fecha.texto(w.salida)} sincronizada con Booking y Expedia.`);
      App.actualizarEventos();
    };
    $all("[data-cant]").forEach((inp) => (inp.oninput = () => {
      const tid = inp.dataset.cant, max = Number(inp.max);
      let n = inp.value === "" ? 0 : Math.floor(Number(inp.value));
      if (!(n >= 0)) { n = 0; inp.value = 0; }
      if (n > max) { toast("Cantidad inválida, supera la cantidad de habitaciones disponibles.", "danger"); n = max; inp.value = max; }
      if (n) w.sel[tid] = n; else delete w.sel[tid];
      refrescar();
    }));
    if ($("#titular")) $("#titular").onchange = (ev) => {
      w.titularId = ev.target.value;
      if (w.fidelidadAuto) { w.descuentoId = ""; w.fidelidadAuto = false; }
      if (w.titularId && Q.esRecurrente(w.titularId) && !w.descuentoId) { w.descuentoId = "D1"; w.fidelidadAuto = true; }
      paso1();
    };
    if ($("#nuevo-huesped")) $("#nuevo-huesped").onclick = async () => { const g = await modalNuevoHuesped(); if (g) $("#titular").onchange({ target: { value: g.id } }); };
    $("#descuento").onchange = (ev) => { w.descuentoId = ev.target.value; w.fidelidadAuto = false; refrescar(); };
    $("#continuar").onclick = () => {
      if (!Object.keys(w.sel).length) return error("Indicá la cantidad de al menos un tipo de habitación.");
      if (capacidad() < w.cant) return error(`La capacidad de las habitaciones (${capacidad()}) no alcanza para ${w.cant} huéspedes.`);
      if (!w.titularId) return error("Seleccioná el titular de la reserva.");
      if (rMod) return guardarCambios(error);
      w.paso = 2; paso2();
    };
  };

  // al modificar, se conservan las habitaciones que ya tenía la reserva siempre que se pueda
  const asignar = () => {
    const libres = libresAhora();
    const propias = rMod ? rMod.habitaciones : [];
    return Object.entries(w.sel).flatMap(([tid, n]) => [...libres[tid]].sort((a, b) => propias.includes(b.id) - propias.includes(a.id)).slice(0, n).map((h) => h.id));
  };

  const guardarCambios = (error) => {
    const asignadas = asignar();
    if (asignadas.length !== Object.values(w.sel).reduce((a, b) => a + b, 0)) {
      toast("Las habitaciones elegidas ya no están disponibles. Volvé a buscar disponibilidad.", "danger"); return;
    }
    const pagado = Q.pagado(rMod.pagos);
    if (total() < pagado) return error(`El total no puede ser menor a lo ya abonado (${$$(pagado)}).`);
    Object.assign(rMod, {
      llegada: w.llegada, salida: w.salida, cantHuespedes: w.cant, habitaciones: asignadas,
      subtotal: subtotal(), descuentoId: w.descuentoId, descuentoMonto: descMonto(), total: total(),
    });
    registrarEvento("OTA", `Disponibilidad actualizada en Booking y Expedia (reserva N.º ${rMod.nro} modificada: ${Q.habTexto(rMod)}).`);
    Store.guardar();
    App.actualizarEventos();
    toast(`Reserva N.º ${rMod.nro} actualizada. Se actualizó la disponibilidad en Booking y Expedia.`);
    ir(vuelta);
  };

  const paso2 = () => {
    const habs = asignar();
    const g = Q.huesped(w.titularId);
    vista().innerHTML = encabezado(walkin ? "Check-in sin reserva" : "Nueva reserva", "", ["P2", "Confirmar reserva"]) + pasos() + `
    <div class="row g-3"><div class="col-lg-8">
      <div class="card mb-3"><div class="card-header"><i class="bi bi-person me-2"></i>Titular de la reserva</div><div class="card-body">
        <div class="fw-semibold mb-2">${esc(g.nombre)}</div>
        ${datosTitular(g)}
        ${walkin ? "" : `<div class="small text-suave border-top pt-2 mt-1"><i class="bi bi-envelope me-1"></i>${g.email ? `El detalle de la reserva se enviará a <b>${esc(g.email)}</b>.` : "El titular no tiene email: el detalle de la reserva no se enviará."}</div>`}
      </div></div>
      <div id="panel-pago"></div>
    </div>
    <div class="col-lg-4">${tarjetaResumen(habs, `
      <div class="small text-suave mb-2" id="motivo"></div>
      <button class="btn btn-primary btn-lg w-100" id="confirmar">Confirmar reserva</button>
      ${walkin ? `<div class="small text-suave text-center mt-2">En el check-in sin reserva el pago se realiza en el momento.</div>`
        : `<button class="btn btn-outline-primary w-100 mt-2" id="sin-pago">Registrar reserva pendiente<small class="d-block" style="font-size:11px">se abona en el check-in</small></button>`}
      <button class="btn btn-light w-100 mt-2" id="volver"><i class="bi bi-arrow-left me-1"></i>Volver</button>`)}</div>
    </div>`;
    const actualizarBotones = () => {
      const saldo = Math.max(0, total() - Q.pagado(w.pagos));
      $("#confirmar").disabled = saldo > 0;
      $("#motivo").textContent = saldo > 0 ? "Confirmar se habilita cuando el saldo es cero." : "";
      const sp = $("#sin-pago");
      if (sp) sp.disabled = saldo === 0;
    };
    new PanelPago($("#panel-pago"), { total: total(), pagos: w.pagos, alCambiar: actualizarBotones });
    actualizarBotones();
    ajustarResumenFijo();
    $("#volver").onclick = () => { w.paso = 1; paso1(); };
    const registrar = (estado) => {
      const asignadas = asignar();
      if (asignadas.length !== Object.values(w.sel).reduce((a, b) => a + b, 0)) {
        toast("Las habitaciones elegidas ya no están disponibles. Volvé a buscar disponibilidad.", "danger"); return;
      }
      const nro = Q.e.seq.reserva++;
      const r = {
        id: "R" + nro, nro, titularId: w.titularId, llegada: w.llegada, salida: w.salida, cantHuespedes: w.cant, habitaciones: asignadas,
        subtotal: subtotal(), descuentoId: w.descuentoId, descuentoMonto: descMonto(), total: total(), estado,
        creada: Fecha.ahora(), usuarioId: usuarioActualId(), pagos: limpiarPagos(w.pagos),
      };
      Q.e.reservas.push(r);
      registrarEvento("OTA", `Disponibilidad actualizada en Booking y Expedia (reserva N.º ${nro}: ${Q.habTexto(r)}).`);
      registrarEvento("Correo", estado === "Confirmada"
        ? `Confirmación de la reserva N.º ${nro} ${enviadoA(g)}.`
        : `Detalle de la reserva N.º ${nro} (pendiente de pago) ${enviadoA(g, false)}.`);
      Store.guardar();
      App.actualizarEventos();
      toast(`Reserva N.º ${nro} registrada como <b>${estado.toLowerCase()}</b>. Se actualizó la disponibilidad en Booking y Expedia. Detalle ${enviadoA(g, false)}.`);
      ir(`${walkin ? "/checkin" : "/reservas"}/${r.id}?volver=${vuelta}`);
    };
    $("#confirmar").onclick = () => registrar("Confirmada");
    if ($("#sin-pago")) $("#sin-pago").onclick = () => registrar("Pendiente");
  };

  paso1();
};

/* ==================================================================== P14 */
V.reservaDetalle = (id, params) => {
  const vuelta = (params && params.get("volver")) || "/reservas";
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  const es = Q.estadiaDe(r.id);
  const hoy = T();
  const d = Q.descuento(r.descuentoId);
  const saldo = Q.saldoReserva(r);
  const puedeCheckin = ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida;
  const acciones = [
    volver(vuelta),
    r.estado === "Pendiente" ? `<button class="btn btn-editar" id="modificar"><i class="bi bi-pencil me-1"></i>Modificar</button>` : "",
    ["Pendiente", "Confirmada"].includes(r.estado) ? `<button class="btn btn-eliminar" id="cancelar"><i class="bi bi-calendar-x me-1"></i>Cancelar reserva</button>` : "",
    r.estado === "Pendiente" && saldo > 0 ? `<button class="btn ${puedeCheckin ? "btn-pagar" : "btn-primary"}" id="pagar"><i class="bi bi-cash-coin me-1"></i>Registrar pago</button>` : "",
    puedeCheckin ? `<a class="btn btn-primary" href="#/checkin/${r.id}?volver=/reservas/${r.id}"><i class="bi bi-box-arrow-in-right me-1"></i>Hacer check-in</a>` : "",
    r.estado === "En curso" ? `<a class="btn btn-primary" href="#/checkout/${r.id}?volver=/reservas/${r.id}"><i class="bi bi-box-arrow-right me-1"></i>Hacer check-out</a>` : "",
  ].join("");
  const pagosTodos = [...r.pagos, ...(es ? es.pagos : [])];
  vista().innerHTML = encabezado(`Reserva N.º ${r.nro} ${estadoBadge(r.estado)}`, "", ["P14", "Detalle de reserva"], acciones) + `
    <div class="row g-3"><div class="col-lg-8">
      ${tarjetasReserva(r)}
      <div class="card"><div class="card-header"><i class="bi bi-cash-coin me-2"></i>Pagos</div>
        ${pagosTodos.length ? `<div class="table-responsive"><table class="table mb-0"><thead><tr><th class="text-center">Fecha</th><th>Medio de pago</th><th>Código de transacción</th><th class="text-end">Monto</th></tr></thead>
          <tbody>${pagosTodos.map((p) => `<tr><td>${Fecha.texto(p.fecha)}</td><td>${esc(p.medio)}</td><td class="text-suave">${detallePago(p) || "—"}</td><td>${$$(p.monto)}</td></tr>`).join("")}</tbody></table></div>`
          : `<div class="card-body text-suave small">Sin pagos registrados.${r.estado === "Pendiente" ? " Se abona en el check-in." : ""}</div>`}
      </div>
    </div>
    <div class="col-lg-4"><div class="card resumen-reserva"><div class="card-header"><i class="bi bi-receipt me-2"></i>Importes</div><div class="card-body">
      ${lineaImporte("Subtotal", $$(r.subtotal))}
      <div class="resumen-linea"><span>Descuento${d ? ` (${esc(d.nombre)} ${d.porcentaje} %)` : ""}</span><span class="${r.descuentoMonto ? "text-success" : ""}">− ${$$(r.descuentoMonto)}</span></div>
      <div class="resumen-final"><span>Total</span><span>${$$(r.total)}</span></div>
      <div class="resumen-seccion">
        ${lineaImporte("Pagado", $$(Q.pagado(r.pagos)))}
        <div class="resumen-linea fw-semibold"><span>Saldo</span><span class="${saldo > 0 && Q.activa(r) ? "saldo-pend" : ""}">${$$(saldo)}</span></div>
      </div>
      ${es && es.facturaId ? `<button class="btn btn-outline-primary w-100 mt-3" id="ver-factura"><i class="bi bi-receipt me-1"></i>Ver factura</button>` : ""}
      <div class="small text-suave border-top mt-3 pt-3">Registrada el ${Fecha.textoHora(r.creada)} por ${usuarioTxt(r.usuarioId)}</div>
    </div></div></div>
    </div>`;
  if ($("#modificar")) $("#modificar").onclick = () => ir(`/reservas/${r.id}/modificar?volver=/reservas/${r.id}`);
  if ($("#cancelar")) $("#cancelar").onclick = () => cancelarReserva(r.id, () => V.reservaDetalle(id, params));
  if ($("#pagar")) $("#pagar").onclick = () => registrarPagoReserva(r.id, () => V.reservaDetalle(id, params));
  if ($("#ver-factura")) $("#ver-factura").onclick = () => verFactura(es.facturaId);
};

/* ===================================================================== P4 */
V.checkin = () => {
  const hoy = T();
  let texto = "";
  vista().innerHTML = encabezado("Check-in", "", ["P4", "Inicio check-in"],
    `<a href="#/reservas/nueva?walkin=1" class="btn btn-outline-primary"><i class="bi bi-person-walking me-1"></i>Check-in sin reserva</a>`) + `
    <div class="card"><div class="card-body border-bottom">${buscador("Buscar")}</div>
      <div class="table-responsive"><table class="table table-hover tabla-reservas"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th class="text-center">Llegada esperada</th><th class="text-center">Salida esperada</th>
      <th class="text-center">Huéspedes</th><th class="text-center">Estado</th><th class="text-end">Saldo</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const lista = Q.e.reservas.filter((r) => ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida).filter((r) => coincideReserva(r, texto));
    $("#filas").innerHTML = lista.length ? lista.map((r) => {
      const s = Q.saldoReserva(r);
      return `<tr><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${Fecha.texto(r.llegada)}</td><td>${Fecha.texto(r.salida)}</td>
        <td class="text-center">${r.cantHuespedes}</td><td>${estadoBadge(r.estado)}</td><td class="text-end ${s > 0 ? "saldo-pend fw-semibold" : "saldo-ok"}">${$$(s)}</td>
        <td class="text-end"><a class="btn btn-sm btn-primary" href="#/checkin/${r.id}">Check-in</a></td></tr>`;
    }).join("") : `<tr><td colspan="9"><div class="vacio"><i class="bi bi-calendar-check"></i>No hay check-ins pendientes${texto ? " que coincidan con la búsqueda" : " para hoy"}.</div></td></tr>`;
  };
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

/* ===================================================================== P5 */
V.checkinReserva = (id, params) => {
  const vuelta = (params && params.get("volver")) || "/checkin";
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  if (!["Pendiente", "Confirmada"].includes(r.estado)) {
    vista().innerHTML = encabezado("Check-in", "", ["P5", "Check-in de reserva"], volver(vuelta)) +
      `<div class="alert alert-info">La reserva N.º ${r.nro} está <b>${r.estado.toLowerCase()}</b>: no corresponde hacer el check-in.</div>`;
    return;
  }
  const g = Q.huesped(r.titularId);
  const pagos = [];
  const acomp = [];
  let elegido = "";
  const saldoInicial = Q.saldoReserva(r);
  const render = () => {
    const sucias = r.habitaciones.map(Q.hab).filter((h) => h.estado === "En limpieza");
    const faltan = r.cantHuespedes - 1 - acomp.length;
    // huéspedes registrados que todavía no están en la lista (ni el titular)
    const disponibles = [...Q.e.huespedes].filter((h) => h.id !== g.id && !acomp.some((a) => a.huespedId === h.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    vista().innerHTML = encabezado(`Check-in · reserva N.º ${r.nro} ${estadoBadge(r.estado)}`, "", ["P5", "Check-in de reserva"]) + `
    <div class="row g-3"><div class="col-lg-8">
      ${sucias.length ? `<div class="alert alert-warning d-flex align-items-center gap-2"><i class="bi bi-exclamation-triangle"></i><div class="flex-fill">
        ${sucias.map((h) => `Hab. ${h.numero}`).join(", ")} todavía figura <b>en limpieza</b>.</div>
        <button class="btn btn-sm btn-warning" id="limpia">Registrar limpieza</button></div>` : ""}
      ${tarjetasReserva(r)}
      ${saldoInicial > 0 ? `<div class="alert alert-warning py-2"><i class="bi bi-hourglass-split me-1"></i><b>Reserva pendiente de pago:</b> se debe registrar el pago antes de confirmar el check-in.</div>
        <div id="panel-pago" class="mb-3"></div>` : ""}
      <div class="card"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-people me-2"></i>Huéspedes que ingresan</span>
        <button class="btn btn-sm btn-outline-primary" id="a-nuevo"><i class="bi bi-person-plus me-1"></i>Nuevo huésped</button></div><div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
          <div class="flex-grow-1" style="min-width: 220px"><label class="form-label obligatorio">Acompañante</label><select class="form-select" id="a-huesped"><option value="">Seleccioná un huésped…</option>
            ${disponibles.map((h) => `<option value="${h.id}" ${h.id === elegido ? "selected" : ""}>${esc(h.nombre)} — ${esc(h.tipoDoc)} ${esc(h.nroDoc)}</option>`).join("")}</select></div>
          <button class="btn btn-outline-primary" id="a-agregar"><i class="bi bi-plus-lg me-1"></i>Agregar huésped</button>
        </div>
        <table class="table table-sm mb-2"><thead><tr><th>Apellido y nombre</th><th>Documento</th><th></th></tr></thead><tbody>
          <tr><td>${esc(g.nombre)} <span class="text-suave">(titular)</span></td><td>${esc(g.tipoDoc)} ${esc(g.nroDoc)}</td><td></td></tr>
          ${acomp.map((a, i) => `<tr><td>${esc(a.nombre)}</td><td>${esc(a.doc)}</td><td class="text-end">${tachito(`data-q="${i}"`)}</td></tr>`).join("")}
        </tbody></table>
        ${faltan > 0 ? `<div class="small text-suave">Faltan ${faltan} acompañante(s) según la reserva.</div>`
          : faltan === 0 ? `<div class="small text-success"><i class="bi bi-check2 me-1"></i>Se registraron todos los huéspedes de la reserva.</div>`
          : `<div class="small text-suave">Ingresan ${acomp.length + 1} huéspedes; la reserva indicaba ${r.cantHuespedes}.</div>`}
      </div></div>
    </div>
    <div class="col-lg-4"><div class="card resumen-reserva resumen-fijo"><div class="card-header"><i class="bi bi-receipt me-2"></i>Importes</div><div class="card-body">
      ${lineaImporte("Total de la reserva", $$(r.total))}
      ${lineaImporte("Pagado", $$(Q.pagado(r.pagos)), { id: "r-pagado" })}
      <div class="resumen-final"><span>Saldo</span><span id="r-saldo">${$$(saldoInicial)}</span></div>
      <div class="pt-3">
        <div class="small text-suave mb-2" id="motivo"></div>
        <button class="btn btn-primary btn-lg w-100" id="confirmar"><i class="bi bi-box-arrow-in-right me-1"></i>Confirmar check-in</button>
        <a href="#${vuelta}" class="btn btn-light w-100 mt-2">Cancelar</a>
      </div>
    </div></div></div>
    </div>`;
    const actualizar = () => {
      const saldo = Math.max(0, saldoInicial - Q.pagado(pagos));
      $("#r-pagado").textContent = $$(Q.pagado(r.pagos) + Q.pagado(pagos));
      $("#r-saldo").textContent = $$(saldo);
      const motivo = sucias.length ? "Primero registrá la limpieza de la habitación." : saldo > 0 ? "Se habilita cuando el saldo es cero." : "";
      $("#confirmar").disabled = !!motivo;
      $("#motivo").textContent = motivo;
    };
    if (saldoInicial > 0) new PanelPago($("#panel-pago"), { total: saldoInicial, pagos, alCambiar: actualizar });
    actualizar();
    ajustarResumenFijo();
    if ($("#limpia")) $("#limpia").onclick = () => { sucias.forEach((h) => (h.estado = "Disponible")); Store.guardar(); toast("Limpieza registrada."); render(); };
    $all("[data-q]").forEach((b) => (b.onclick = () => { acomp.splice(Number(b.dataset.q), 1); render(); }));
    if ($("#a-huesped")) $("#a-huesped").onchange = (ev) => (elegido = ev.target.value);
    if ($("#a-nuevo")) $("#a-nuevo").onclick = async () => { const h = await modalNuevoHuesped(); if (h) { elegido = h.id; render(); } };
    if ($("#a-agregar")) $("#a-agregar").onclick = () => {
      const sel = $("#a-huesped");
      limpiarErrores(vista());
      if (!sel.value) return marcarError(sel, "Seleccioná un huésped o registrá uno nuevo.");
      const h = Q.huesped(sel.value);
      acomp.push({ huespedId: h.id, nombre: h.nombre, doc: `${h.tipoDoc} ${h.nroDoc}` });
      elegido = "";
      render();
    };
    $("#confirmar").onclick = () => {
      r.pagos.push(...limpiarPagos(pagos));
      r.estado = "En curso";
      Q.e.estadias.push({ id: "E" + r.nro, reservaId: r.id, checkIn: Fecha.ahora(), checkOut: "", acompanantes: [...acomp], cargos: [], pagos: [], facturaId: "" });
      r.habitaciones.forEach((hid) => (Q.hab(hid).estado = "Ocupada"));
      Store.guardar();
      toast(`Check-in registrado. ${esc(g.nombre)} ingresó a ${Q.habTexto(r)}.`);
      ir(vuelta);
    };
  };
  render();
};

/* ===================================================================== P6 */
V.checkout = () => {
  const hoy = T();
  let texto = "";
  vista().innerHTML = encabezado("Check-out", "", ["P6", "Inicio check-out"]) + `
    <div class="card"><div class="card-body border-bottom">${buscador("Buscar")}</div>
      <div class="table-responsive"><table class="table table-hover tabla-reservas"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th class="text-center">Check-in</th><th class="text-center">Salida esperada</th><th class="text-center">Huéspedes</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const lista = Q.e.reservas.filter((r) => r.estado === "En curso").filter((r) => coincideReserva(r, texto)).sort((a, b) => (a.salida > b.salida ? 1 : -1));
    $("#filas").innerHTML = lista.length ? lista.map((r) => {
      const es = Q.estadiaDe(r.id);
      const etiqueta = r.salida < hoy ? '<span class="badge text-bg-danger ms-1">Vencida</span>' : r.salida === hoy ? '<span class="badge text-bg-warning ms-1">Hoy</span>' : "";
      return `<tr><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${fechaHora(es && es.checkIn)}</td>
        <td>${Fecha.texto(r.salida)}${etiqueta}</td><td class="text-center">${r.cantHuespedes}</td><td class="text-end"><a class="btn btn-sm btn-primary" href="#/checkout/${r.id}">Check-out</a></td></tr>`;
    }).join("") : `<tr><td colspan="7"><div class="vacio"><i class="bi bi-door-open"></i>No hay estadías en curso${texto ? " que coincidan con la búsqueda" : ""}.</div></td></tr>`;
  };
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

/* ===================================================================== P7 */
V.checkoutEstadia = (id, params) => {
  const vuelta = (params && params.get("volver")) || "/checkout";
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  const es = Q.estadiaDe(r.id);
  if (r.estado !== "En curso" || !es) {
    vista().innerHTML = encabezado("Check-out", "", ["P7", "Check-out de estadía"], volver(vuelta)) +
      `<div class="alert alert-info">La reserva N.º ${r.nro} no tiene una estadía en curso.</div>`;
    return;
  }
  const cargos = [];
  const pagos = [];
  const saldoReserva = Q.saldoReserva(r);
  const totalCargos = () => cargos.reduce((s, c) => s + c.monto * c.cantidad, 0);
  const aPagar = () => saldoReserva + totalCargos();

  const render = () => {
    vista().innerHTML = encabezado(`Check-out · reserva N.º ${r.nro} ${estadoBadge(r.estado)}`, "", ["P7", "Check-out de estadía"]) + `
    <div class="row g-3"><div class="col-lg-8">
      ${tarjetasReserva(r)}
      <div class="card mb-3"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-plus-circle me-2"></i>Cargos adicionales</span>
        <button class="btn btn-sm btn-outline-primary" id="nuevo-cargo"><i class="bi bi-plus-lg me-1"></i>Nuevo cargo adicional</button></div><div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-end">
          <div class="flex-grow-1" style="min-width: 220px"><label class="form-label">Cargo</label><select class="form-select" id="cargo"><option value="">Seleccioná un cargo…</option>
            ${Q.e.cargos.map((c) => `<option value="${c.id}">${esc(c.nombre)} — ${$$(c.monto)}</option>`).join("")}</select></div>
          <div style="width: 100px"><label class="form-label">Cantidad</label><input type="number" min="1" value="1" class="form-control" id="cargo-cant"></div>
          <button class="btn btn-outline-primary" id="agregar-cargo"><i class="bi bi-plus-lg me-1"></i>Agregar cargo</button>
        </div>
        ${cargos.length ? `<table class="table table-sm mt-3 mb-0"><thead><tr><th>Cargo adicional</th><th class="text-center">Cantidad</th><th class="text-end">Monto</th><th></th></tr></thead>
          <tbody>${cargos.map((c, i) => `<tr><td>${esc(c.nombre)}</td><td>${c.cantidad}</td><td>${$$(c.monto * c.cantidad)}</td><td class="text-end">${tachito(`data-q="${i}"`)}</td></tr>`).join("")}</tbody></table>`
          : ""}
      </div></div>
      ${aPagar() > 0 ? `<div id="panel-pago"></div>` : ""}
    </div>
    <div class="col-lg-4"><div class="card resumen-reserva resumen-fijo"><div class="card-header"><i class="bi bi-receipt me-2"></i>Importes</div><div class="card-body">
      ${lineaImporte("Total de la reserva", $$(r.total))}
      ${lineaImporte("Pagado", $$(Q.pagado(r.pagos)))}
      ${lineaImporte("Saldo de la reserva", $$(saldoReserva), { clase: saldoReserva > 0 ? "saldo-pend" : "" })}
      ${lineaImporte("Cargos adicionales", $$(totalCargos()))}
      <div class="resumen-final"><span>Total a pagar</span><span>${$$(aPagar())}</span></div>
      <div class="pt-3">
        <div class="small text-suave mb-2" id="motivo"></div>
        <button class="btn btn-primary btn-lg w-100" id="finalizar"><i class="bi bi-box-arrow-right me-1"></i>Finalizar check-out</button>
        <a href="#${vuelta}" class="btn btn-light w-100 mt-2">Cancelar</a>
      </div>
    </div></div></div>
    </div>`;
    const actualizar = () => {
      const saldo = Math.max(0, aPagar() - Q.pagado(pagos));
      $("#finalizar").disabled = saldo > 0;
      $("#motivo").textContent = saldo > 0 ? "Se habilita cuando el saldo es cero." : "Se emitirá la factura y se enviará al correo del huésped.";
    };
    if (aPagar() > 0) new PanelPago($("#panel-pago"), { total: aPagar(), pagos, alCambiar: actualizar });
    actualizar();
    ajustarResumenFijo();
    $("#agregar-cargo").onclick = () => {
      const c = Q.e.cargos.find((x) => x.id === $("#cargo").value);
      limpiarErrores(vista());
      if (!c) return marcarError($("#cargo"), "Seleccioná un cargo adicional.");
      const n = Math.max(1, Number($("#cargo-cant").value) || 1);
      if (Q.pagado(pagos) > 0) { toast("Quitá los pagos cargados antes de modificar los cargos.", "warning"); return; }
      cargos.push({ nombre: c.nombre, monto: c.monto, cantidad: n });
      render();
    };
    $all("[data-q]").forEach((b) => (b.onclick = () => {
      if (Q.pagado(pagos) > 0) { toast("Quitá los pagos cargados antes de modificar los cargos.", "warning"); return; }
      cargos.splice(Number(b.dataset.q), 1); render();
    }));
    $("#nuevo-cargo").onclick = async () => { const c = await modalNuevoCargo(); if (c) { render(); $("#cargo").value = c.id; } };
    $("#finalizar").onclick = async () => {
      const ok = await confirmar("Finalizar check-out", `Se registrará la salida de <b>${huespedTxt(r.titularId)}</b>, las habitaciones pasarán a <b>en limpieza</b> y se emitirá la factura de la estadía.`);
      if (!ok) return;
      es.checkOut = Fecha.ahora();
      es.cargos = cargos;
      es.pagos = limpiarPagos(pagos);
      r.estado = "Finalizada";
      r.habitaciones.forEach((hid) => (Q.hab(hid).estado = "En limpieza"));
      const noches = Fecha.noches(r.llegada, r.salida);
      const items = r.habitaciones.map((hid) => {
        const h = Q.hab(hid), t = Q.tipo(h.tipoId);
        return { descripcion: `Alojamiento por noche, Hab. ${h.numero} (${t.nombre})`, cantidad: noches, precioUnitario: t.precio, subtotal: t.precio * noches };
      });
      const d = Q.descuento(r.descuentoId);
      if (r.descuentoMonto) items.push({ descripcion: `Descuento ${d ? d.nombre + " (" + d.porcentaje + " %)" : ""}`, cantidad: 1, precioUnitario: -r.descuentoMonto, subtotal: -r.descuentoMonto });
      cargos.forEach((c) => items.push({ descripcion: `Cargo adicional: ${c.nombre}`, cantidad: c.cantidad, precioUnitario: c.monto, subtotal: c.monto * c.cantidad }));
      const f = emitirFactura(r.titularId, items, { tipo: "Estadía", id: r.id });
      es.facturaId = f.id;
      Store.guardar();
      App.actualizarEventos();
      toast(`Check-out registrado. Factura B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")} autorizada por ARCA y ${enviadoA(Q.huesped(r.titularId))}.`);
      ir(vuelta);
      verFactura(f.id);
    };
  };
  render();
};

/* ==================================================================== P17 */
V.ventas = (params) => {
  const lista = [
    { id: "ventas", texto: "Ventas", icono: '<i class="bi bi-bag"></i>' },
    ...(App.rol() === "Administrador" ? [{ id: "productos", texto: "Productos", icono: '<i class="bi bi-box-seam"></i>' }] : []),
  ];
  if (params && params.get("tab") === "productos" && lista.length > 1) return V.productos(lista);
  let texto = "";
  vista().innerHTML = encabezado("Ventas", "", ["P17", "Inicio ventas"]) + pestanias("/ventas", lista, "ventas",
    `<a href="#/ventas/nueva" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva venta</a>`) + `
    <div class="card"><div class="card-body border-bottom">${buscador("Buscar")}</div>
      <div class="table-responsive"><table class="table table-hover"><thead><tr><th>N.º</th><th class="text-center">Fecha y hora</th><th>Huésped</th><th>Productos vendidos</th><th class="text-end">Total</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const lista = [...Q.e.ventas].reverse().filter((v) => { const g = Q.huesped(v.huespedId); return coincide(texto, v.nro, g.nombre, g.nroDoc); });
    $("#filas").innerHTML = lista.length ? lista.map((v) => `<tr class="click" data-id="${v.id}"><td>${v.nro}</td><td>${fechaHora(v.fecha)}</td><td>${huespedVentaTxt(v)}</td>
      <td>${v.items.map((i) => `${esc(i.nombre)} (${i.cantidad})`).join(", ")}</td><td class="text-end">${$$(v.total)}</td>
      <td class="text-end"><button class="btn btn-sm btn-light">Ver detalle</button></td></tr>`).join("")
      : `<tr><td colspan="6"><div class="vacio"><i class="bi bi-bag"></i>No hay ventas que coincidan.</div></td></tr>`;
    $all("#filas tr.click").forEach((tr) => (tr.onclick = () => ir(`/ventas/${tr.dataset.id}`)));
  };
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

/* ==================================================================== P18 */
V.ventaDetalle = (id) => {
  const v = Q.venta(id);
  if (!v) return V.noEncontrado();
  const f = v.facturaId ? Q.factura(v.facturaId) : null;
  vista().innerHTML = encabezado(`Venta N.º ${v.nro}`, "", ["P18", "Detalle de venta"], volver("/ventas")) + `
    <div class="row g-3"><div class="col-lg-8">
      <div class="card mb-3"><div class="card-header"><i class="bi bi-basket me-2"></i>Productos vendidos</div><div class="table-responsive"><table class="table mb-0">
        <thead><tr><th>Producto</th><th class="text-center">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th></tr></thead>
        <tbody>${v.items.map((i) => { const p = Q.producto(i.productoId);
          return `<tr><td>${esc(i.nombre)}${p ? `<div class="small text-suave">${esc(p.marca)}</div>` : ""}</td><td>${i.cantidad}</td><td>${$$(i.precio)}</td><td>${$$(i.precio * i.cantidad)}</td></tr>`; }).join("")}</tbody>
        <tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">${$$(v.total)}</th></tr></tfoot></table></div></div>
      <div class="card"><div class="card-header"><i class="bi bi-cash-coin me-2"></i>Pagos</div><div class="table-responsive"><table class="table mb-0">
        <thead><tr><th class="text-center">Fecha</th><th>Medio de pago</th><th>Código de transacción</th><th class="text-end">Monto</th></tr></thead>
        <tbody>${v.pagos.map((p) => `<tr><td>${Fecha.texto(p.fecha)}</td><td>${esc(p.medio)}</td><td class="text-suave">${detallePago(p) || "—"}</td><td>${$$(p.monto)}</td></tr>`).join("")}</tbody></table></div></div>
    </div>
    <div class="col-lg-4"><div class="card resumen-reserva"><div class="card-header"><i class="bi bi-receipt me-2"></i>Datos de la venta</div><div class="card-body">
      <dl class="datos mb-0">
        <dt>Fecha y hora</dt><dd>${Fecha.textoHora(v.fecha)}</dd>
        <dt>Huésped</dt><dd>${huespedVentaTxt(v)}</dd>
        <dt>Registrada por</dt><dd>${usuarioTxt(v.usuarioId)}</dd>
        <dt>Factura</dt><dd>${f ? `B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")}` : "—"}</dd>
      </dl>
      <div class="resumen-final"><span>Total</span><span>${$$(v.total)}</span></div>
      ${f ? `<button class="btn btn-outline-primary w-100 mt-3" id="ver-factura"><i class="bi bi-receipt me-1"></i>Ver factura</button>` : ""}
    </div></div></div>
    </div>`;
  if ($("#ver-factura")) $("#ver-factura").onclick = () => verFactura(v.facturaId);
};

/* ===================================================================== P8 */
V.ventaNueva = () => {
  const w = { huespedId: "", items: [], pagos: [] };
  const total = () => w.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const render = () => {
    // todos los huéspedes en una sola lista; a los alojados se les agrega su habitación
    const huespedes = [...Q.e.huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const enCarrito = (pid) => w.items.filter((i) => i.productoId === pid).reduce((s, i) => s + i.cantidad, 0);
    vista().innerHTML = encabezado("Nueva venta", "", ["P8", "Nueva venta"]) + `
    <div class="row g-3"><div class="col-lg-8">
    <div class="card mb-3"><div class="card-header"><i class="bi bi-person me-2"></i>Huésped</div><div class="card-body">
      <label class="form-label obligatorio">Huésped que realiza la compra</label>
      <select class="form-select" id="huesped"><option value="">Seleccioná un huésped…</option>
        ${huespedes.map((g) => { const r = Q.huespedAlojado(g.id);
          return `<option value="${g.id}" ${g.id === w.huespedId ? "selected" : ""}>${esc(g.nombre)} — ${esc(g.tipoDoc)} ${esc(g.nroDoc)}${r ? ` — ${Q.habTexto(r)}` : ""}</option>`; }).join("")}
      </select></div></div>
    <div class="card mb-3"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-basket me-2"></i>Productos</span>
      <button class="btn btn-sm btn-outline-primary" id="nuevo-prod"><i class="bi bi-plus-lg me-1"></i>Nuevo producto</button></div><div class="card-body">
      <div class="d-flex flex-wrap gap-2 align-items-end">
        <div style="flex: 1 1 220px; min-width: 0"><label class="form-label">Producto</label><select class="form-select" id="prod"><option value="">Seleccioná un producto…</option>${Q.e.productos.filter((p) => p.activo !== false).map((p) => {
          const disp = p.stock - enCarrito(p.id);
          return `<option value="${p.id}" ${disp <= 0 ? "disabled" : ""}>${esc(p.nombre)} · ${esc(p.marca)} — ${$$(p.precio)} (stock: ${disp})</option>`; }).join("")}</select></div>
        <div style="width: 100px"><label class="form-label">Cantidad</label><input type="number" min="1" value="1" class="form-control" id="cant"></div>
        <button class="btn btn-outline-primary" id="agregar"><i class="bi bi-plus-lg me-1"></i>Agregar producto</button>
      </div>
      ${w.items.length ? `<table class="table table-sm mt-3 mb-0"><thead><tr><th>Producto</th><th class="text-center">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th><th></th></tr></thead>
        <tbody>${w.items.map((i, k) => `<tr><td>${esc(i.nombre)}</td><td>${i.cantidad}</td><td>${$$(i.precio)}</td><td>${$$(i.precio * i.cantidad)}</td>
        <td class="text-end">${tachito(`data-q="${k}"`)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="small text-suave mt-3">Todavía no agregaste productos.</div>`}
    </div></div>
    ${total() > 0 ? `<div id="panel-pago" class="mb-3"></div>` : ""}
    </div>
    <!-- el resumen queda a la derecha y acompaña al bajar la página -->
    <div class="col-lg-4"><div class="card resumen-reserva resumen-fijo"><div class="card-header"><i class="bi bi-receipt me-2"></i>Importes</div><div class="card-body">
      ${lineaImporte("Total de la venta", $$(total()))}
      ${lineaImporte("Pagado", $$(0), { id: "v-pagado" })}
      <div class="resumen-final"><span>Saldo</span><span id="v-saldo">${$$(total())}</span></div>
      <div class="pt-3">
        <div class="small text-suave mb-2" id="motivo"></div>
        <button class="btn btn-primary btn-lg w-100" id="registrar"><i class="bi bi-check2-circle me-1"></i>Registrar venta</button>
        <a href="#/ventas" class="btn btn-light w-100 mt-2">Cancelar</a>
      </div>
    </div></div></div>
    </div>`;
    ajustarResumenFijo();
    const actualizar = () => {
      const saldo = total() - Q.pagado(w.pagos);
      $("#v-pagado").textContent = $$(Q.pagado(w.pagos));
      $("#v-saldo").textContent = $$(Math.max(0, saldo));
      const motivo = !w.huespedId ? "Seleccioná el huésped." : !w.items.length ? "Agregá al menos un producto." : saldo > 0 ? "Se habilita cuando el saldo es cero." : "";
      $("#registrar").disabled = !!motivo;
      $("#motivo").textContent = motivo;
    };
    if (total() > 0) new PanelPago($("#panel-pago"), { total: total(), pagos: w.pagos, alCambiar: actualizar });
    actualizar();
    $("#huesped").onchange = (ev) => { w.huespedId = ev.target.value; actualizar(); };
    const bloquearSiPago = () => { if (Q.pagado(w.pagos) > 0) { toast("Quitá los pagos cargados antes de modificar los productos.", "warning"); return true; } return false; };
    $("#agregar").onclick = () => {
      if (bloquearSiPago()) return;
      const p = Q.producto($("#prod").value);
      limpiarErrores(vista());
      if (!p) return marcarError($("#prod"), "Seleccioná un producto.");
      const n = Math.max(1, Number($("#cant").value) || 1);
      const disp = p.stock - enCarrito(p.id);
      if (n > disp) { marcarError($("#cant"), `Stock insuficiente: quedan ${disp}.`); return; }
      const ex = w.items.find((i) => i.productoId === p.id);
      if (ex) ex.cantidad += n; else w.items.push({ productoId: p.id, nombre: p.nombre, cantidad: n, precio: p.precio });
      render();
    };
    $all("[data-q]").forEach((b) => (b.onclick = () => { if (bloquearSiPago()) return; w.items.splice(Number(b.dataset.q), 1); render(); }));
    $("#nuevo-prod").onclick = async () => { const p = await modalProducto(); if (p) { render(); $("#prod").value = p.id; } };
    $("#registrar").onclick = () => {
      w.items.forEach((i) => (Q.producto(i.productoId).stock -= i.cantidad));
      const nro = Q.e.seq.venta++;
      const v = { id: "V" + nro, nro, fecha: Fecha.ahora(), usuarioId: usuarioActualId(), huespedId: w.huespedId, items: w.items, total: total(), pagos: limpiarPagos(w.pagos), facturaId: "" };
      const f = emitirFactura(w.huespedId, w.items.map((i) => ({ descripcion: i.nombre, cantidad: i.cantidad, precioUnitario: i.precio, subtotal: i.precio * i.cantidad })), { tipo: "Venta", id: v.id });
      v.facturaId = f.id;
      Q.e.ventas.push(v);
      Store.guardar();
      App.actualizarEventos();
      toast(`Venta N.º ${nro} registrada. Factura B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")} autorizada por ARCA y ${enviadoA(Q.huesped(w.huespedId))}.`);
      ir("/ventas");
      verFactura(f.id);
    };
  };
  render();
};

/* ====================================== pantallas visibles, no incluidas */
V.habitaciones = (params) => {
  const admin = App.rol() === "Administrador";
  const lista = [
    { id: "habitaciones", texto: "Habitaciones", icono: '<i class="bi bi-door-open"></i>' },
    ...(admin ? [
      { id: "tipos", texto: "Tipos de habitación", icono: '<i class="bi bi-grid"></i>' },
      { id: "servicios", texto: "Servicios", icono: '<i class="bi bi-wifi"></i>' },
      { id: "camas", texto: "Tipos de cama", icono: icono("cama") },
    ] : []),
  ];
  const tab = lista.some((p) => p.id === (params && params.get("tab"))) ? params.get("tab") : "habitaciones";
  const alta = (texto) => (admin ? `<button class="btn btn-primary" data-no="${texto}"><i class="bi bi-plus-lg me-1"></i>${texto}</button>` : "");
  const modificar = (que) => `<td class="text-end"><button class="btn btn-sm btn-editar" data-no="${que}">Modificar</button></td>`;
  let tabla = "", boton = "";
  if (tab === "habitaciones") {
    boton = alta("Nueva habitación");
    tabla = `<thead><tr><th>Habitación</th><th>Tipo</th><th class="text-end">Precio por noche</th><th class="text-center">Estado</th><th>Bloqueo</th><th></th></tr></thead><tbody>
    ${Q.e.habitaciones.map((h) => { const t = Q.tipo(h.tipoId); return `<tr><td><b>Hab. ${h.numero}</b></td><td>${t.nombre}</td><td>${$$(t.precio)}</td><td>${estadoBadge(h.bloqueo && h.bloqueo.desde <= T() && T() <= h.bloqueo.hasta ? "Bloqueada" : h.estado)}</td>
      <td>${h.bloqueo ? `${Fecha.texto(h.bloqueo.desde)} al ${Fecha.texto(h.bloqueo.hasta)}<div class="text-suave">${esc(h.bloqueo.motivo || "")}</div>` : '<span class="text-suave">—</span>'}</td>
      <td class="text-end text-nowrap">${h.estado === "En limpieza" ? `<button class="btn btn-sm btn-warning" data-limpia="${h.id}">Registrar limpieza</button>` : ""}
        ${admin ? `<button class="btn btn-sm btn-editar" data-no="Modificar habitación">Modificar</button>` : ""}</td></tr>`; }).join("")}</tbody>`;
  } else if (tab === "tipos") {
    boton = alta("Nuevo tipo de habitación");
    tabla = `<thead><tr><th>Tipo</th><th class="text-center">Capacidad</th><th>Camas</th><th>Servicios</th><th class="text-end">Precio por noche</th><th></th></tr></thead><tbody>
      ${Q.e.tiposHab.map((t) => `<tr><td><b>${t.nombre}</b></td><td>${t.capacidad}</td><td>${t.camas}</td><td>${t.servicios.join(", ")}</td><td>${$$(t.precio)}</td>
        ${modificar("Modificar tipo de habitación")}</tr>`).join("")}</tbody>`;
  } else if (tab === "servicios") {
    boton = alta("Nuevo servicio");
    const servicios = [...new Set(Q.e.tiposHab.flatMap((t) => t.servicios))];
    tabla = `<thead><tr><th>Servicio</th><th>Tipos de habitación que lo incluyen</th><th></th></tr></thead><tbody>
      ${servicios.map((sv) => `<tr><td><b>${esc(sv)}</b></td><td>${Q.e.tiposHab.filter((t) => t.servicios.includes(sv)).map((t) => t.nombre).join(", ")}</td>
        ${modificar("Modificar servicio")}</tr>`).join("")}</tbody>`;
  } else {
    boton = alta("Nuevo tipo de cama");
    tabla = `<thead><tr><th>Tipo de cama</th><th class="text-center">Plazas</th><th></th></tr></thead><tbody>
      ${Q.e.tiposCama.map((c) => `<tr><td><b>${esc(c.nombre)}</b></td><td>${c.plazas}</td>${modificar("Modificar tipo de cama")}</tr>`).join("")}</tbody>`;
  }
  vista().innerHTML = encabezado("Habitaciones", "", ["P19", "Inicio habitaciones"]) + pestanias("/habitaciones", lista, tab, boton) + `
    <div class="card"><div class="table-responsive"><table class="table">${tabla}</table></div></div>`;
  $all("[data-limpia]").forEach((b) => (b.onclick = () => registrarLimpieza(b.dataset.limpia, () => V.habitaciones(params))));
  App.enlazarNoIncluidos();
};

V.huespedes = () => {
  const admin = App.rol() === "Administrador";
  let texto = "";
  vista().innerHTML = encabezado("Huéspedes", "", ["P27", "Inicio huéspedes"],
    `<button class="btn btn-primary" id="nuevo"><i class="bi bi-person-plus me-1"></i>Nuevo huésped</button>`) + `
    <div class="card"><div class="card-body border-bottom">${buscador("Buscar")}</div>
    <div class="table-responsive"><table class="table"><thead><tr><th>Huésped</th><th>Documento</th><th>Email</th><th>Teléfono</th><th>Preferencias</th><th></th></tr></thead><tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const lista = [...Q.e.huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre)).filter((g) => coincide(texto, g.nombre, g.nroDoc));
    $("#filas").innerHTML = lista.map((g) => `<tr><td><b>${esc(g.nombre)}</b>${Q.huespedAlojado(g.id) ? ' <span class="badge text-bg-success">Alojado</span>' : ""}</td><td>${esc(g.tipoDoc)} ${esc(g.nroDoc)}</td>
      <td>${esc(g.email) || '<span class="text-suave">—</span>'}</td><td>${esc(g.telefono)}</td><td>${esc(g.preferencias) || '<span class="text-suave">—</span>'}</td>
      <td class="text-end text-nowrap"><a class="btn btn-sm btn-light" href="#/huespedes/${g.id}">Historial</a><button class="btn btn-sm btn-editar" data-no="Modificar huésped">Modificar</button>
      ${admin ? `<button class="btn btn-sm btn-eliminar" data-no="Dar de baja huésped">Dar de baja</button>` : ""}</td></tr>`).join("")
      || `<tr><td colspan="6"><div class="vacio">No hay huéspedes que coincidan.</div></td></tr>`;
    App.enlazarNoIncluidos();
  };
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  $("#nuevo").onclick = async () => { if (await modalNuevoHuesped()) pintar(); };
  pintar();
};

V.huespedHistorial = (id) => {
  const g = Q.huesped(id);
  if (!g) return V.noEncontrado();
  const reservas = Q.e.reservas.filter((r) => r.titularId === id && ["En curso", "Finalizada"].includes(r.estado)).sort((a, b) => (a.llegada > b.llegada ? 1 : -1));
  const gasto = (r) => {
    const es = Q.estadiaDe(r.id);
    const cargos = es ? es.cargos.reduce((s, c) => s + c.monto * c.cantidad, 0) : 0;
    const ventas = Q.e.ventas.filter((v) => v.huespedId === id && v.fecha.slice(0, 10) >= r.llegada && v.fecha.slice(0, 10) <= r.salida).reduce((s, v) => s + v.total, 0);
    return r.total + cargos + ventas;
  };
  const totalHist = reservas.reduce((s, r) => s + gasto(r), 0);
  vista().innerHTML = encabezado(esc(g.nombre), `${esc(g.tipoDoc)} ${esc(g.nroDoc)} · ${esc(g.email)} · ${esc(g.telefono)}`, ["P30", "Historial de estadías"], volver("/huespedes")) + `
    ${g.preferencias ? `<div class="alert alert-light border"><b>Preferencias:</b> ${esc(g.preferencias)}</div>` : ""}
    <div class="card"><div class="card-header">Historial de estadías</div><div class="table-responsive"><table class="table"><thead><tr><th>Reserva</th><th>Habitaciones</th><th class="text-center">Check-in</th><th class="text-center">Check-out</th><th class="text-center">Huéspedes</th><th class="text-center">Noches</th><th class="text-end">Total gastado</th></tr></thead>
    <tbody>${reservas.map((r) => { const es = Q.estadiaDe(r.id); return `<tr><td><a href="#/reservas/${r.id}">N.º ${r.nro}</a></td><td>${Q.habTexto(r)}</td><td>${fechaHora(es && es.checkIn)}</td>
      <td>${es && es.checkOut ? fechaHora(es.checkOut) : estadoBadge("En curso")}</td><td class="text-center">${r.cantHuespedes}</td><td>${Fecha.noches(r.llegada, r.salida)}</td><td class="text-end">${$$(gasto(r))}</td></tr>`; }).join("")
      || `<tr><td colspan="7"><div class="vacio">Todavía no tiene estadías registradas.</div></td></tr>`}</tbody>
    <tfoot><tr><th colspan="6" class="text-end">Total histórico gastado</th><th class="text-end">${$$(totalHist)}</th></tr></tfoot></table></div></div>`;
};

V.productos = (lista) => {
  vista().innerHTML = encabezado("Ventas", "", ["P9", "Inicio productos"]) + pestanias("/ventas", lista, "productos",
    `<button class="btn btn-primary" id="nuevo"><i class="bi bi-plus-lg me-1"></i>Nuevo producto</button>`) + `
    <div class="card"><div class="table-responsive"><table class="table"><thead><tr><th>Producto</th><th>Marca</th><th class="text-end">Precio</th><th class="text-center">Stock</th><th></th></tr></thead><tbody>
    ${Q.e.productos.filter((p) => p.activo !== false).map((p) => `<tr><td><b>${esc(p.nombre)}</b>${p.descripcion ? `<div class="small text-suave">${esc(p.descripcion)}</div>` : ""}</td><td>${esc(p.marca)}</td><td class="text-end">${$$(p.precio)}</td>
      <td class="text-center">${p.stock}</td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-editar btn-icono" data-mod-prod="${p.id}" title="Modificar" aria-label="Modificar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-eliminar btn-icono" data-baja-prod="${p.id}" title="Dar de baja" aria-label="Dar de baja"><i class="bi bi-slash-circle"></i></button></td></tr>`).join("")}
    </tbody></table></div></div>`;
  $("#nuevo").onclick = async () => { if (await modalProducto()) V.productos(lista); };
  $all("[data-mod-prod]").forEach((b) => (b.onclick = async () => { if (await modalProducto(Q.producto(b.dataset.modProd))) V.productos(lista); }));
  $all("[data-baja-prod]").forEach((b) => (b.onclick = async () => { if (await modalBajaProducto(Q.producto(b.dataset.bajaProd))) V.productos(lista); }));
};

V.reportes = () => {
  vista().innerHTML = encabezado("Reportes", "", ["P32", "Inicio reportes"]) + `
    <div class="card no-proto"><div class="card-body"><div class="row g-3 align-items-end">
      <div class="col-md-5"><label class="form-label">Reporte</label><select class="form-select"><option>Ocupación de habitaciones</option><option>Ventas de productos</option>
        <option>Ingresos por reservas</option><option>Ingresos totales diarios y mensuales</option></select></div>
      <div class="col-md-2"><label class="form-label">Desde</label><input type="date" class="form-control" value="${Fecha.sumar(T(), -30)}"></div>
      <div class="col-md-2"><label class="form-label">Hasta</label><input type="date" class="form-control" value="${T()}"></div>
      <div class="col-md-3 d-flex gap-2"><button class="btn btn-primary flex-fill" data-no="Generar reporte">Generar reporte</button><button class="btn btn-light" data-no="Exportar PDF" title="Exportar PDF"><i class="bi bi-file-earmark-pdf"></i></button></div>
    </div><div class="vacio border rounded mt-4"><i class="bi bi-bar-chart-line"></i>Aquí se mostraría el reporte generado, con el formato de su bosquejo de salida.</div></div></div>`;
  App.enlazarNoIncluidos();
};

V.configuracion = () => {
  const secciones = ["Usuarios", "Medios de pago", "Descuentos", "Cargos adicionales", "Tipos de documento", "Datos del hotel"];
  let actual = "Usuarios";
  const contenido = () => {
    const e = Q.e;
    const tabla = (cols, filas, boton) => `<div class="d-flex justify-content-between align-items-center mb-3"><h5 class="mb-0">${actual}</h5>${boton ? `<button class="btn btn-primary btn-sm" data-no="${boton}"><i class="bi bi-plus-lg me-1"></i>${boton}</button>` : ""}</div>
      <div class="table-responsive"><table class="table"><thead><tr>${cols.map((c) => `<th${c.endsWith(" %") || c === "Porcentaje" ? ' class="text-center"' : c === "Monto" ? ' class="text-end"' : ""}>${c}</th>`).join("")}<th></th></tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-editar" data-no="Modificar">Modificar</button><button class="btn btn-sm btn-eliminar" data-no="Dar de baja">Dar de baja</button></td></tr>`).join("")}</tbody></table></div>`;
    if (actual === "Usuarios") return tabla(["Nombre", "Rol", "Email"], e.usuarios.map((u) => [esc(u.nombre), esc(u.rol), esc(u.email)]), "Nuevo usuario")
      + `<div class="small text-suave mt-2"><i class="bi bi-info-circle me-1"></i>Los roles son fijos: Administrador y Recepcionista.</div>`;
    if (actual === "Medios de pago") return tabla(["Medio de pago"], e.mediosPago.map((m) => [m]), "Nuevo medio de pago");
    if (actual === "Descuentos") return tabla(["Nombre", "Porcentaje"], e.descuentos.map((d) => [esc(d.nombre), d.porcentaje + " %"]), "Nuevo descuento");
    if (actual === "Cargos adicionales") return tabla(["Nombre", "Monto"], e.cargos.map((c) => [esc(c.nombre), $$(c.monto)]), "Nuevo cargo adicional");
    if (actual === "Tipos de documento") return tabla(["Tipo de documento"], e.tiposDoc.map((t) => [t]), "Nuevo tipo de documento");
    const h = e.hotel;
    return `<h5 class="mb-3">Datos del hotel ${codigoP("P39", "Datos del hotel")}</h5><div class="row g-3" style="max-width:640px">
      ${[["Nombre", h.nombre], ["Razón social", h.razonSocial], ["CUIT", h.cuit], ["Domicilio", h.domicilio], ["Teléfono", h.telefono], ["Email", h.email]]
        .map(([l, v]) => `<div class="col-md-6"><label class="form-label">${l}</label><input class="form-control" value="${esc(v)}"></div>`).join("")}
      <div class="col-12"><button class="btn btn-primary" data-no="Guardar datos del hotel">Guardar cambios</button>
      <span class="small text-suave ms-2">Estos datos se muestran en las facturas.</span></div></div>`;
  };
  const render = () => {
    vista().innerHTML = encabezado("Configuración", "", ["P33", "Inicio configuración"]) + `
      <div class="row g-3"><div class="col-md-3"><div class="list-group">${secciones.map((s) => `<button class="list-group-item list-group-item-action ${s === actual ? "active" : ""}" data-s="${s}">${s}</button>`).join("")}</div></div>
      <div class="col-md-9"><div class="card"><div class="card-body">${contenido()}</div></div></div></div>`;
    $all("[data-s]").forEach((b) => (b.onclick = () => { actual = b.dataset.s; render(); }));
    App.enlazarNoIncluidos();
  };
  render();
};

V.noEncontrado = () => {
  vista().innerHTML = `<div class="vacio mt-5"><i class="bi bi-question-circle"></i>No se encontró lo que buscabas.<div class="mt-3"><a href="#/inicio" class="btn btn-primary">Ir al inicio</a></div></div>`;
};

V.moduloNoIncluido = () => {
  vista().innerHTML = `<div class="vacio mt-5"><i class="bi bi-puzzle"></i>Módulo no incluido en el prototipo.<div class="mt-3"><a href="#/inicio" class="btn btn-primary">Ir al inicio</a></div></div>`;
};

V.sinPermiso = () => {
  vista().innerHTML = `<div class="vacio mt-5"><i class="bi bi-shield-lock"></i>Tu rol no tiene acceso a este módulo.<div class="mt-3"><a href="#/inicio" class="btn btn-primary">Ir al inicio</a></div></div>`;
};
