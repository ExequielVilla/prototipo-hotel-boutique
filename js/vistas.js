/* ==========================================================================
   Pantallas del prototipo. Implementadas: inicio, reservas, check-in,
   check-out y ventas (circuitos principales). El resto se muestra, pero sus
   acciones avisan que no están incluidas en el prototipo.
   ========================================================================== */

const V = {};
const vista = () => $("#vista");
const ir = (ruta) => { location.hash = ruta; };
const T = () => Fecha.hoy();

function encabezado(titulo, sub, cod, acciones = "") {
  return `<div class="encabezado"><div><h1>${titulo}${cod ? codigoP(cod[0], cod[1]) : ""}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
    <div class="d-flex gap-2 flex-wrap justify-content-end">${acciones}</div></div>`;
}
const volver = (ruta, texto = "Volver") => `<a href="#${ruta}" class="btn btn-light"><i class="bi bi-arrow-left me-1"></i>${texto}</a>`;
const huespedTxt = (id) => { const g = Q.huesped(id); return g ? esc(g.nombre) : "—"; };
const nochesTxt = (r) => { const n = Fecha.noches(r.llegada, r.salida); return `${n} noche${n === 1 ? "" : "s"}`; };

function bloqueDatosReserva(r, { conEstado = true } = {}) {
  const g = Q.huesped(r.titularId);
  const es = Q.estadiaDe(r.id);
  return `<div class="card mb-3"><div class="card-header"><i class="bi bi-journal-text me-2"></i>Datos de la reserva N.º ${r.nro}</div>
    <div class="card-body"><div class="row">
      <div class="col-md-6"><dl class="datos mb-0">
        <dt>Titular</dt><dd><a href="#/huespedes/${g.id}">${esc(g.nombre)}</a> · ${esc(g.tipoDoc)} ${esc(g.nroDoc)}<br><small class="text-suave">${esc(g.email)} · ${esc(g.telefono)}</small></dd>
        <dt>${es ? "Check-in" : "Llegada prevista"} / salida prevista</dt><dd>${es ? Fecha.textoHora(es.checkIn) : Fecha.texto(r.llegada)} → ${Fecha.texto(r.salida)} <span class="text-suave">(${nochesTxt(r)})</span></dd>
      </dl></div>
      <div class="col-md-6"><dl class="datos mb-0">
        <dt>Habitaciones</dt><dd>${Q.habTexto(r)}</dd>
        <dt>Huéspedes</dt><dd>${r.cantHuespedes}${conEstado ? ` &nbsp;·&nbsp; Estado: ${estadoBadge(r.estado)}` : ""}</dd>
      </dl></div>
    </div>
    ${g.preferencias ? `<div class="alert alert-light border small mb-0 py-2"><i class="bi bi-star me-1"></i><b>Preferencias:</b> ${esc(g.preferencias)}</div>` : ""}
    </div></div>`;
}

/* ===================================================================== P0 */
V.inicio = () => {
  const hoy = T();
  const e = Q.e;
  const llegadas = e.reservas.filter((r) => ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida);
  const salidas = e.reservas.filter((r) => r.estado === "En curso" && r.salida <= hoy);
  const ocupadas = e.habitaciones.filter((h) => h.estado === "Ocupada").length;
  const pendientes = e.reservas.filter((r) => r.estado === "Pendiente");
  const kpi = (icono, color, valor, etiqueta) => `<div class="col-6 col-lg-3"><div class="card kpi"><div class="card-body d-flex align-items-center gap-3">
    <div class="icono" style="background:${color}1a;color:${color}"><i class="bi bi-${icono}"></i></div>
    <div><div class="valor">${valor}</div><div class="etiqueta">${etiqueta}</div></div></div></div></div>`;

  const tiles = e.habitaciones.map((h) => {
    const t = Q.tipo(h.tipoId);
    const bloqHoy = h.bloqueo && h.bloqueo.desde <= hoy && hoy <= h.bloqueo.hasta;
    const r = Q.reservaHoy(h.id);
    let nota = "";
    if (bloqHoy) nota = `<i class="bi bi-lock me-1"></i>Bloqueada hasta el ${Fecha.texto(h.bloqueo.hasta).slice(0, 5)}`;
    else if (r && r.estado === "En curso") nota = `${esc(Q.huesped(r.titularId).nombre)}${r.salida <= hoy ? ' · <b class="text-danger">Check-out hoy</b>' : ""}`;
    else if (r && r.llegada <= hoy) nota = `<b class="text-primary">Check-in hoy</b> · ${esc(Q.huesped(r.titularId).nombre)}`;
    else if (h.bloqueo && h.bloqueo.desde > hoy) nota = `<span class="text-suave"><i class="bi bi-lock me-1"></i>Bloqueo desde el ${Fecha.texto(h.bloqueo.desde).slice(0, 5)}</span>`;
    const estadoVisible = bloqHoy ? "Bloqueada" : h.estado;
    const destino = r ? `#/reservas/${r.id}` : "";
    return `<div class="hab ${h.estado.replace(/ /g, "-")} ${bloqHoy ? "bloqueada" : ""}" ${destino ? `role="button" onclick="location.hash='${destino}'"` : ""}>
      <div class="d-flex justify-content-between align-items-start"><span class="num">Hab. ${h.numero}</span>${estadoBadge(estadoVisible)}</div>
      <div class="tipo">${t.nombre} · ${t.capacidad} pers.</div><div class="nota">${nota}</div></div>`;
  }).join("");

  const fila = (r, accion) => `<tr><td><a href="#/reservas/${r.id}">N.º ${r.nro}</a></td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${estadoBadge(r.estado)}</td>
    <td class="text-end">${accion}</td></tr>`;

  vista().innerHTML = encabezado("Inicio", `${Fecha.textoLargo(hoy)}`, ["P0", "Menú principal"],
    `<a href="#/reservas/nueva" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva reserva</a>`) + `
    <div class="row g-3 mb-4">
      ${kpi("door-closed", "#d64545", `${ocupadas}/${e.habitaciones.length}`, "Habitaciones ocupadas")}
      ${kpi("box-arrow-in-right", "#1b4fb5", llegadas.length, "Llegadas de hoy")}
      ${kpi("box-arrow-right", "#a35b00", salidas.length, "Salidas de hoy")}
      ${kpi("hourglass-split", "#6b7484", pendientes.length, "Reservas pendientes de pago")}
    </div>
    <div class="card mb-4"><div class="card-header d-flex justify-content-between"><span><i class="bi bi-grid-3x3-gap me-2"></i>Estado de las habitaciones hoy</span>
      <small class="text-suave fw-normal">Hacé clic en una habitación ocupada o con llegada para ver su reserva</small></div>
      <div class="card-body"><div class="habs">${tiles}</div></div></div>
    <div class="row g-3">
      <div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-box-arrow-in-right me-2"></i>Llegadas de hoy</div>
        ${llegadas.length ? `<div class="table-responsive"><table class="table"><tbody>${llegadas.map((r) => fila(r, `<a class="btn btn-sm btn-primary" href="#/checkin/${r.id}">Check-in</a>`)).join("")}</tbody></table></div>`
          : `<div class="vacio"><i class="bi bi-calendar-check"></i>No hay llegadas pendientes para hoy.</div>`}</div></div>
      <div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-box-arrow-right me-2"></i>Salidas de hoy</div>
        ${salidas.length ? `<div class="table-responsive"><table class="table"><tbody>${salidas.map((r) => fila(r, `<a class="btn btn-sm btn-outline-primary" href="#/checkout/${r.id}">Check-out</a>`)).join("")}</tbody></table></div>`
          : `<div class="vacio"><i class="bi bi-calendar-check"></i>No hay salidas pendientes para hoy.</div>`}</div></div>
    </div>`;
};

/* ==================================================================== P13 */
V.reservas = () => {
  const filtros = ["Todas", "Pendiente", "Confirmada", "En curso", "Finalizada", "Cancelada"];
  let filtro = sessionStorage.getItem("filtroReservas") || "Todas";
  let texto = "";
  vista().innerHTML = encabezado("Reservas", "Todas las reservas del hotel, de cualquier canal.", ["P13", "Inicio reservas"],
    `<a href="#/reservas/nueva" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva reserva</a>`) + `
    <div class="card"><div class="card-body d-flex flex-wrap gap-2 align-items-center border-bottom">
      <div class="btn-group flex-wrap" id="filtros">${filtros.map((f) => `<button class="btn btn-sm btn-outline-secondary" data-f="${f}">${f}</button>`).join("")}</div>
      <div class="ms-auto" style="min-width:260px"><div class="input-group input-group-sm"><span class="input-group-text"><i class="bi bi-search"></i></span>
        <input class="form-control" id="buscar" placeholder="Buscar por titular, documento o N.º"></div></div>
    </div><div class="table-responsive"><table class="table table-hover"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th>Llegada</th><th>Salida</th><th>Origen</th>
      <th>Estado</th><th class="text-end">Total</th><th class="text-end">Saldo</th><th></th></tr></thead><tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    $all("#filtros button").forEach((b) => b.classList.toggle("active", b.dataset.f === filtro));
    const t = texto.toLowerCase();
    const lista = Q.e.reservas.filter((r) => (filtro === "Todas" || r.estado === filtro)).filter((r) => {
      if (!t) return true;
      const g = Q.huesped(r.titularId);
      return String(r.nro).includes(t) || g.nombre.toLowerCase().includes(t) || g.nroDoc.toLowerCase().replace(/\D/g, "").includes(t.replace(/\D/g, "") || "~");
    }).sort((a, b) => (b.llegada > a.llegada ? 1 : -1));
    $("#filas").innerHTML = lista.length ? lista.map((r) => {
      const s = Q.saldoReserva(r);
      return `<tr class="click" data-id="${r.id}"><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td class="small">${Q.habTexto(r)}</td><td>${Fecha.texto(r.llegada)}</td><td>${Fecha.texto(r.salida)}</td>
        <td class="small text-suave">${esc(r.origen)}</td><td>${estadoBadge(r.estado)}</td><td class="text-end">${$$(r.total)}</td>
        <td class="text-end ${s > 0 && Q.activa(r) ? "saldo-pend fw-semibold" : "text-suave"}">${Q.activa(r) ? $$(s) : "—"}</td>
        <td class="text-end text-nowrap">${r.estado === "Pendiente" ? `<button class="btn btn-sm btn-light" data-mod="${r.id}" title="Modificar"><i class="bi bi-pencil"></i></button>` : ""}
          ${["Pendiente", "Confirmada"].includes(r.estado) ? `<button class="btn btn-sm btn-light text-danger" data-cancel="${r.id}" title="Cancelar reserva"><i class="bi bi-x-circle"></i></button>` : ""}</td></tr>`;
    }).join("") : `<tr><td colspan="10"><div class="vacio"><i class="bi bi-inbox"></i>No hay reservas que coincidan.</div></td></tr>`;
    $all("#filas tr.click").forEach((tr) => (tr.onclick = (ev) => { if (!ev.target.closest("button")) ir(`/reservas/${tr.dataset.id}`); }));
    $all("[data-mod]").forEach((b) => (b.onclick = () => noIncluido("Modificar reserva")));
    $all("[data-cancel]").forEach((b) => (b.onclick = () => cancelarReserva(b.dataset.cancel, pintar)));
  };
  $all("#filtros button").forEach((b) => (b.onclick = () => { filtro = b.dataset.f; sessionStorage.setItem("filtroReservas", filtro); pintar(); }));
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

async function cancelarReserva(id, despues) {
  const r = Q.reserva(id);
  const pagado = Q.pagado(r.pagos);
  const ok = await confirmar(`Cancelar reserva N.º ${r.nro}`,
    `Se cancelará la reserva de <b>${huespedTxt(r.titularId)}</b> del ${Fecha.texto(r.llegada)} al ${Fecha.texto(r.salida)} (${Q.habTexto(r)}).
     Se liberará la disponibilidad en las OTAs y se notificará al huésped por correo.
     ${pagado > 0 ? `<br><br><i class="bi bi-info-circle me-1"></i>La reserva tiene pagos por <b>${$$(pagado)}</b>, que deberán reintegrarse según la política de cancelación.` : ""}`,
    { boton: "Confirmar cancelación", clase: "btn-danger" });
  if (!ok) return;
  r.estado = "Cancelada";
  registrarEvento("OTA", `Disponibilidad liberada en Booking y Expedia (reserva N.º ${r.nro} cancelada: ${Q.habTexto(r)}).`);
  registrarEvento("Correo", `Aviso de cancelación de la reserva N.º ${r.nro} enviado a ${Q.huesped(r.titularId).email}.`);
  Store.guardar();
  App.actualizarEventos();
  toast(`Reserva N.º ${r.nro} cancelada.`, "warning");
  despues();
}

/* ============================================================ P1 y P2 */
V.reservaNueva = (params) => {
  const walkin = params.get("walkin") === "1";
  const w = { paso: 1, llegada: T(), salida: Fecha.sumar(T(), 1), cant: 2, buscado: false, sel: {}, titularId: "", descuentoId: "", pagos: [], walkin };

  const subtotal = () => Object.entries(w.sel).reduce((s, [tid, n]) => s + Q.tipo(tid).precio * n * Fecha.noches(w.llegada, w.salida), 0);
  const descMonto = () => { const d = Q.descuento(w.descuentoId); return d ? Math.round(subtotal() * d.porcentaje / 100) : 0; };
  const total = () => subtotal() - descMonto();
  const capacidad = () => Object.entries(w.sel).reduce((s, [tid, n]) => s + Q.tipo(tid).capacidad * n, 0);

  const pasos = () => `<div class="pasos">
    <div class="paso ${w.paso === 1 ? "activo" : "hecho"}"><span class="n">${w.paso > 1 ? '<i class="bi bi-check"></i>' : 1}</span>Datos de la reserva</div><div class="sep"></div>
    <div class="paso ${w.paso === 2 ? "activo" : ""}"><span class="n">2</span>Confirmación y pago</div></div>`;

  const paso1 = () => {
    const libres = w.buscado ? Q.libresPorTipo(w.llegada, w.salida) : null;
    const noches = Fecha.noches(w.llegada, w.salida);
    const titulares = [...Q.e.huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre));
    vista().innerHTML = encabezado(walkin ? "Check-in sin reserva" : "Nueva reserva",
      walkin ? "El huésped llega sin reserva: se registra la reserva y se continúa con el check-in." : "Buscá disponibilidad, elegí las habitaciones y el titular.",
      ["P1", "Nueva reserva"], volver(walkin ? "/checkin" : "/reservas", "Cancelar")) + pasos() + `
    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card mb-3"><div class="card-header"><i class="bi bi-calendar-range me-2"></i>Fechas y huéspedes</div><div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-sm-4"><label class="form-label obligatorio">Llegada</label><input type="date" class="form-control" id="llegada" value="${w.llegada}" min="${T()}" ${walkin ? "disabled" : ""}></div>
            <div class="col-sm-4"><label class="form-label obligatorio">Salida</label><input type="date" class="form-control" id="salida" value="${w.salida}" min="${Fecha.sumar(w.llegada, 1)}"></div>
            <div class="col-sm-2"><label class="form-label obligatorio">Huéspedes</label><input type="number" class="form-control" id="cant" min="1" max="12" value="${w.cant}"></div>
            <div class="col-sm-2"><button class="btn btn-outline-primary w-100" id="buscar"><i class="bi bi-search"></i> Buscar</button></div>
          </div>
          <div class="small text-suave mt-2">${noches > 0 ? `${noches} noche${noches === 1 ? "" : "s"}` : ""}</div>
        </div></div>

        <div class="card mb-3"><div class="card-header"><i class="bi bi-door-open me-2"></i>Tipos de habitación disponibles</div>
          ${!w.buscado ? `<div class="vacio"><i class="bi bi-search"></i>Indicá las fechas y presioná <b>Buscar</b> para ver la disponibilidad.</div>` : `
          <div class="table-responsive"><table class="table"><thead><tr><th>Tipo</th><th>Capacidad</th><th>Precio por noche</th><th>Disponibles</th><th style="width:120px">Cantidad</th><th></th></tr></thead><tbody>
          ${Q.e.tiposHab.map((t) => {
            const disp = libres[t.id].length - (w.sel[t.id] || 0);
            return `<tr><td><b>${t.nombre}</b><div class="small text-suave">${t.camas} · ${t.servicios.slice(0, 3).join(", ")}</div></td><td>${t.capacidad} pers.</td><td>${$$(t.precio)}</td>
              <td>${disp > 0 ? `<span class="text-success fw-semibold">${disp}</span>` : '<span class="text-danger">Sin disponibilidad</span>'}</td>
              <td><input type="number" class="form-control form-control-sm" min="1" max="${disp}" value="1" data-cant="${t.id}" ${disp > 0 ? "" : "disabled"}></td>
              <td><button class="btn btn-sm btn-outline-primary" data-agregar="${t.id}" ${disp > 0 ? "" : "disabled"}>Agregar</button></td></tr>`;
          }).join("")}</tbody></table></div>`}
        </div>

        <div class="card mb-3"><div class="card-header"><i class="bi bi-list-check me-2"></i>Habitaciones a reservar</div>
          ${Object.keys(w.sel).length ? `<div class="table-responsive"><table class="table"><thead><tr><th>Tipo</th><th>Cantidad</th><th>Noches</th><th class="text-end">Subtotal</th><th></th></tr></thead><tbody>
          ${Object.entries(w.sel).map(([tid, n]) => `<tr><td>${Q.tipo(tid).nombre}</td><td>${n}</td><td>${noches}</td><td class="text-end">${$$(Q.tipo(tid).precio * n * noches)}</td>
            <td class="text-end"><button class="btn btn-sm btn-link text-danger" data-quitar="${tid}">Quitar</button></td></tr>`).join("")}</tbody></table></div>`
          : `<div class="vacio py-3">Todavía no agregaste habitaciones.</div>`}
        </div>

        <div class="card"><div class="card-header"><i class="bi bi-person me-2"></i>Titular de la reserva</div><div class="card-body">
          <div class="d-flex gap-2"><select class="form-select" id="titular"><option value="">Seleccioná un huésped…</option>
            ${titulares.map((g) => `<option value="${g.id}" ${g.id === w.titularId ? "selected" : ""}>${esc(g.nombre)} — ${esc(g.tipoDoc)} ${esc(g.nroDoc)}</option>`).join("")}</select>
            <button class="btn btn-outline-primary text-nowrap" id="nuevo-huesped"><i class="bi bi-person-plus me-1"></i>Nuevo huésped</button></div>
          <div id="nota-titular" class="small mt-2"></div>
        </div></div>
      </div>

      <div class="col-lg-4"><div class="card position-sticky" style="top:76px"><div class="card-header"><i class="bi bi-receipt me-2"></i>Resumen</div><div class="card-body">
        <div class="resumen-linea"><span>Subtotal</span><span>${$$(subtotal())}</span></div>
        <label class="form-label mt-2">Descuento</label>
        <select class="form-select form-select-sm" id="descuento"><option value="">Sin descuento</option>
          ${Q.e.descuentos.map((d) => `<option value="${d.id}" ${d.id === w.descuentoId ? "selected" : ""}>${esc(d.nombre)} (${d.porcentaje} %)</option>`).join("")}</select>
        <div class="resumen-linea mt-2"><span>Descuento</span><span>− ${$$(descMonto())}</span></div>
        <div class="resumen-linea total"><span>Total</span><span>${$$(total())}</span></div>
        ${Object.keys(w.sel).length ? `<div class="small mt-2 ${capacidad() < w.cant ? "text-danger" : "text-suave"}"><i class="bi bi-people me-1"></i>Capacidad: ${capacidad()} de ${w.cant} huéspedes</div>` : ""}
        <div id="err-paso1" class="text-danger small mt-2"></div>
        <button class="btn btn-primary w-100 mt-3" id="continuar">Continuar <i class="bi bi-arrow-right ms-1"></i></button>
      </div></div></div>
    </div>`;

    const notaTitular = () => {
      const n = $("#nota-titular");
      if (!w.titularId) { n.innerHTML = ""; return; }
      const g = Q.huesped(w.titularId);
      n.innerHTML = `<span class="text-suave">${esc(g.email)} · ${esc(g.telefono)}</span>${g.preferencias ? `<br><i class="bi bi-star me-1"></i>${esc(g.preferencias)}` : ""}
        ${Q.esRecurrente(g.id) ? `<br><span class="text-success"><i class="bi bi-award me-1"></i>Huésped recurrente: se propone el descuento de fidelidad (5 %).</span>` : ""}`;
    };
    notaTitular();
    const cambiarFechas = () => {
      const lleg = $("#llegada").value, sal = $("#salida").value;
      w.llegada = lleg; w.salida = sal; w.cant = Number($("#cant").value) || 1;
      if (w.buscado || Object.keys(w.sel).length) { w.buscado = false; w.sel = {}; }
      paso1();
    };
    $("#llegada").onchange = () => { if ($("#salida").value <= $("#llegada").value) $("#salida").value = Fecha.sumar($("#llegada").value, 1); cambiarFechas(); };
    $("#salida").onchange = cambiarFechas;
    $("#cant").onchange = () => { w.cant = Number($("#cant").value) || 1; paso1(); };
    $("#buscar").onclick = () => {
      w.llegada = $("#llegada").value; w.salida = $("#salida").value; w.cant = Number($("#cant").value) || 1;
      if (!w.llegada || !w.salida || w.salida <= w.llegada) { toast("La fecha de salida debe ser posterior a la de llegada.", "danger"); return; }
      if (w.llegada < T()) { toast("La fecha de llegada no puede ser anterior a hoy.", "danger"); return; }
      w.buscado = true; w.sel = {}; paso1();
      registrarEvento("OTA", `Consulta de disponibilidad del ${Fecha.texto(w.llegada)} al ${Fecha.texto(w.salida)} sincronizada con Booking y Expedia.`);
      App.actualizarEventos();
    };
    $all("[data-agregar]").forEach((b) => (b.onclick = () => {
      const tid = b.dataset.agregar;
      const n = Number($(`[data-cant="${tid}"]`).value) || 1;
      const disp = Q.libresPorTipo(w.llegada, w.salida)[tid].length - (w.sel[tid] || 0);
      if (n > disp) { toast(`Solo hay ${disp} habitación(es) ${Q.tipo(tid).nombre} disponible(s).`, "danger"); return; }
      w.sel[tid] = (w.sel[tid] || 0) + n; paso1();
    }));
    $all("[data-quitar]").forEach((b) => (b.onclick = () => { delete w.sel[b.dataset.quitar]; paso1(); }));
    $("#titular").onchange = (ev) => {
      w.titularId = ev.target.value;
      if (w.titularId && Q.esRecurrente(w.titularId) && !w.descuentoId) w.descuentoId = "D1";
      paso1();
    };
    $("#nuevo-huesped").onclick = async () => { const g = await modalNuevoHuesped(); if (g) { w.titularId = g.id; paso1(); } };
    $("#descuento").onchange = (ev) => { w.descuentoId = ev.target.value; paso1(); };
    $("#continuar").onclick = () => {
      const err = $("#err-paso1");
      if (!Object.keys(w.sel).length) return (err.textContent = "Agregá al menos una habitación.");
      if (capacidad() < w.cant) return (err.textContent = `La capacidad de las habitaciones (${capacidad()}) no alcanza para ${w.cant} huéspedes.`);
      if (!w.titularId) return (err.textContent = "Seleccioná el titular de la reserva.");
      w.paso = 2; paso2();
    };
  };

  const asignar = () => {
    const libres = Q.libresPorTipo(w.llegada, w.salida);
    return Object.entries(w.sel).flatMap(([tid, n]) => libres[tid].slice(0, n).map((h) => h.id));
  };

  const paso2 = () => {
    const habs = asignar();
    const g = Q.huesped(w.titularId);
    const d = Q.descuento(w.descuentoId);
    vista().innerHTML = encabezado(walkin ? "Check-in sin reserva" : "Nueva reserva", "Revisá los datos, cargá los pagos y registrá la reserva.", ["P2", "Confirmar reserva"]) + pasos() + `
    <div class="row g-3">
      <div class="col-lg-5"><div class="card"><div class="card-header"><i class="bi bi-journal-text me-2"></i>Datos de la reserva</div><div class="card-body">
        <dl class="datos">
          <dt>Titular</dt><dd>${esc(g.nombre)} · ${esc(g.tipoDoc)} ${esc(g.nroDoc)}</dd>
          <dt>Llegada / salida prevista</dt><dd>${Fecha.texto(w.llegada)} → ${Fecha.texto(w.salida)} (${Fecha.noches(w.llegada, w.salida)} noches)</dd>
          <dt>Habitaciones asignadas</dt><dd>${habs.map((id) => { const h = Q.hab(id); return `Hab. ${h.numero} (${Q.tipo(h.tipoId).nombre})`; }).join(", ")}</dd>
          <dt>Huéspedes</dt><dd>${w.cant}</dd>
        </dl>
        <div class="resumen-linea"><span>Subtotal</span><span>${$$(subtotal())}</span></div>
        <div class="resumen-linea"><span>Descuento${d ? ` ${esc(d.nombre)} (${d.porcentaje} %)` : ""}</span><span>− ${$$(descMonto())}</span></div>
        <div class="resumen-linea total"><span>Total de la reserva</span><span>${$$(total())}</span></div>
      </div></div></div>
      <div class="col-lg-7"><div id="panel-pago"></div>
        <div class="d-flex flex-wrap gap-2 justify-content-end mt-3">
          <button class="btn btn-light me-auto" id="volver"><i class="bi bi-arrow-left me-1"></i>Volver</button>
          ${walkin ? "" : `<button class="btn btn-outline-secondary" id="sin-pago">Registrar sin pago <small class="d-block" style="font-size:11px">se abona en el check-in</small></button>`}
          <button class="btn btn-primary" id="confirmar">Confirmar reserva</button>
        </div>
        ${walkin ? `<div class="small text-suave text-end mt-2">En el check-in sin reserva el pago se realiza en el momento.</div>` : ""}
      </div>
    </div>`;
    const actualizarBotones = () => {
      const saldo = Math.max(0, total() - Q.pagado(w.pagos));
      $("#confirmar").disabled = saldo > 0;
      $("#confirmar").title = saldo > 0 ? "Se habilita cuando el saldo es cero" : "";
      const sp = $("#sin-pago");
      if (sp) {
        sp.firstChild.textContent = w.pagos.length ? "Registrar con saldo pendiente " : "Registrar sin pago ";
        sp.disabled = saldo === 0;
      }
    };
    new PanelPago($("#panel-pago"), { total: total(), pagos: w.pagos, alCambiar: actualizarBotones });
    actualizarBotones();
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
        origen: walkin ? "Recepción (sin reserva)" : "Recepción", creada: Fecha.ahora(), pagos: limpiarPagos(w.pagos),
      };
      Q.e.reservas.push(r);
      registrarEvento("OTA", `Disponibilidad actualizada en Booking y Expedia (reserva N.º ${nro}: ${Q.habTexto(r)}).`);
      registrarEvento("Correo", estado === "Confirmada"
        ? `Confirmación de la reserva N.º ${nro} enviada a ${g.email}.`
        : `Detalle de la reserva N.º ${nro} (pendiente de pago) enviado a ${g.email}.`);
      Store.guardar();
      App.actualizarEventos();
      toast(`Reserva N.º ${nro} registrada como <b>${estado.toLowerCase()}</b>.`);
      ir(walkin ? `/checkin/${r.id}` : `/reservas/${r.id}`);
    };
    $("#confirmar").onclick = () => registrar("Confirmada");
    if ($("#sin-pago")) $("#sin-pago").onclick = () => registrar("Pendiente");
  };

  paso1();
};

/* ==================================================================== P14 */
V.reservaDetalle = (id) => {
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  const es = Q.estadiaDe(r.id);
  const hoy = T();
  const d = Q.descuento(r.descuentoId);
  const saldo = Q.saldoReserva(r);
  const puedeCheckin = ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida;
  const acciones = [
    volver("/reservas"),
    r.estado === "Pendiente" ? `<button class="btn btn-light" id="modificar"><i class="bi bi-pencil me-1"></i>Modificar</button>` : "",
    ["Pendiente", "Confirmada"].includes(r.estado) ? `<button class="btn btn-outline-danger" id="cancelar"><i class="bi bi-x-circle me-1"></i>Cancelar reserva</button>` : "",
    puedeCheckin ? `<a class="btn btn-primary" href="#/checkin/${r.id}"><i class="bi bi-box-arrow-in-right me-1"></i>Hacer check-in</a>` : "",
    r.estado === "En curso" ? `<a class="btn btn-primary" href="#/checkout/${r.id}"><i class="bi bi-box-arrow-right me-1"></i>Hacer check-out</a>` : "",
  ].join("");
  const pagosTodos = [...r.pagos, ...(es ? es.pagos : [])];
  vista().innerHTML = encabezado(`Reserva N.º ${r.nro} ${estadoBadge(r.estado)}`, `Origen: ${esc(r.origen)} · registrada el ${Fecha.textoHora(r.creada)}`, ["P14", "Detalle de reserva"], acciones) + `
    <div class="row g-3"><div class="col-lg-7">${bloqueDatosReserva(r, { conEstado: false })}
      ${es ? `<div class="card mb-3"><div class="card-header"><i class="bi bi-house-door me-2"></i>Estadía</div><div class="card-body"><dl class="datos mb-0 row">
        <div class="col-sm-6"><dt>Check-in</dt><dd>${Fecha.textoHora(es.checkIn)}</dd></div><div class="col-sm-6"><dt>Check-out</dt><dd>${es.checkOut ? Fecha.textoHora(es.checkOut) : "—"}</dd></div>
        <div class="col-12"><dt>Acompañantes</dt><dd>${es.acompanantes.length ? es.acompanantes.map((a) => `${esc(a.nombre)} (${esc(a.doc)})`).join(", ") : "—"}</dd></div>
        ${es.cargos.length ? `<div class="col-12"><dt>Cargos adicionales</dt><dd>${es.cargos.map((c) => `${esc(c.nombre)} × ${c.cantidad}: ${$$(c.monto * c.cantidad)}`).join(" · ")}</dd></div>` : ""}
        ${es.facturaId ? `<div class="col-12"><button class="btn btn-sm btn-outline-primary" id="ver-factura"><i class="bi bi-receipt me-1"></i>Ver factura</button></div>` : ""}
      </dl></div></div>` : ""}
    </div><div class="col-lg-5"><div class="card"><div class="card-header"><i class="bi bi-cash-coin me-2"></i>Importes y pagos</div><div class="card-body">
      <div class="resumen-linea"><span>Subtotal</span><span>${$$(r.subtotal)}</span></div>
      <div class="resumen-linea"><span>Descuento${d ? ` ${esc(d.nombre)} (${d.porcentaje} %)` : ""}</span><span>− ${$$(r.descuentoMonto)}</span></div>
      <div class="resumen-linea total"><span>Total de la reserva</span><span>${$$(r.total)}</span></div>
      <div class="resumen-linea"><span>Saldo</span><span class="fw-bold ${saldo > 0 ? "saldo-pend" : "saldo-ok"}">${$$(saldo)}</span></div>
      <hr><div class="fw-semibold mb-2">Pagos</div>
      ${pagosTodos.length ? `<table class="table table-sm"><tbody>${pagosTodos.map((p) => `<tr><td>${Fecha.texto(p.fecha)}</td><td>${esc(p.medio)}<div class="small text-suave">${esc(p.codigo || "")}</div></td><td class="text-end">${$$(p.monto)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="text-suave small">Sin pagos registrados.${r.estado === "Pendiente" ? " Se abona en el check-in." : ""}</div>`}
    </div></div></div></div>`;
  if ($("#modificar")) $("#modificar").onclick = () => noIncluido("Modificar reserva");
  if ($("#cancelar")) $("#cancelar").onclick = () => cancelarReserva(r.id, () => V.reservaDetalle(id));
  if ($("#ver-factura")) $("#ver-factura").onclick = () => verFactura(es.facturaId);
};

/* ===================================================================== P4 */
V.checkin = () => {
  const hoy = T();
  let texto = "";
  vista().innerHTML = encabezado("Check-in", "Reservas cuyo período incluye el día de hoy.", ["P4", "Inicio check-in"],
    `<a href="#/reservas/nueva?walkin=1" class="btn btn-outline-primary"><i class="bi bi-person-walking me-1"></i>Check-in sin reserva</a>`) + `
    <div class="card mb-4"><div class="card-body border-bottom"><div class="input-group" style="max-width:380px"><span class="input-group-text"><i class="bi bi-search"></i></span>
      <input class="form-control" id="buscar" placeholder="Buscar por nombre o N.º de documento"></div></div>
      <div class="table-responsive"><table class="table table-hover"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th>Llegada</th><th>Salida</th><th>Huéspedes</th><th class="text-end">Saldo</th><th>Estado</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>
    <div class="card"><div class="card-header"><i class="bi bi-calendar-week me-2"></i>Próximas llegadas (7 días)</div><div class="table-responsive"><table class="table"><tbody id="proximas"></tbody></table></div></div>`;
  const pintar = () => {
    const t = texto.toLowerCase();
    const lista = Q.e.reservas.filter((r) => ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada <= hoy && hoy < r.salida).filter((r) => {
      const g = Q.huesped(r.titularId);
      return !t || g.nombre.toLowerCase().includes(t) || g.nroDoc.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "~");
    });
    $("#filas").innerHTML = lista.length ? lista.map((r) => {
      const s = Q.saldoReserva(r);
      return `<tr><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${Fecha.texto(r.llegada)}</td><td>${Fecha.texto(r.salida)}</td><td>${r.cantHuespedes}</td>
        <td class="text-end ${s > 0 ? "saldo-pend fw-semibold" : "saldo-ok"}">${$$(s)}</td><td>${estadoBadge(r.estado)}</td>
        <td class="text-end"><a class="btn btn-sm btn-primary" href="#/checkin/${r.id}">Check-in</a></td></tr>`;
    }).join("") : `<tr><td colspan="9"><div class="vacio"><i class="bi bi-calendar-check"></i>No hay check-ins pendientes${t ? " que coincidan con la búsqueda" : " para hoy"}.</div></td></tr>`;
  };
  const prox = Q.e.reservas.filter((r) => ["Pendiente", "Confirmada"].includes(r.estado) && r.llegada > hoy && r.llegada <= Fecha.sumar(hoy, 7)).sort((a, b) => (a.llegada > b.llegada ? 1 : -1));
  $("#proximas").innerHTML = prox.length ? prox.map((r) => `<tr><td>${Fecha.texto(r.llegada)}</td><td><a href="#/reservas/${r.id}">N.º ${r.nro}</a></td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${estadoBadge(r.estado)}</td></tr>`).join("")
    : `<tr><td><div class="vacio py-3">No hay llegadas en los próximos 7 días.</div></td></tr>`;
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

/* ===================================================================== P5 */
V.checkinReserva = (id) => {
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  if (!["Pendiente", "Confirmada"].includes(r.estado)) {
    vista().innerHTML = encabezado("Check-in", "", ["P5", "Check-in de reserva"], volver("/checkin")) +
      `<div class="alert alert-info">La reserva N.º ${r.nro} está <b>${r.estado.toLowerCase()}</b>: no corresponde hacer el check-in.</div>`;
    return;
  }
  const pagos = [];
  const acomp = [];
  const saldoInicial = Q.saldoReserva(r);
  const render = () => {
    const sucias = r.habitaciones.map(Q.hab).filter((h) => h.estado === "En limpieza");
    vista().innerHTML = encabezado(`Check-in · reserva N.º ${r.nro}`, "Verificá la identidad del titular, registrá a los acompañantes y, si corresponde, el pago.", ["P5", "Check-in de reserva"], volver("/checkin", "Cancelar")) + `
    <div class="row g-3"><div class="col-lg-6">
      ${bloqueDatosReserva(r)}
      ${sucias.length ? `<div class="alert alert-warning d-flex align-items-center gap-2"><i class="bi bi-exclamation-triangle"></i><div class="flex-fill">
        ${sucias.map((h) => `Hab. ${h.numero}`).join(", ")} todavía figura <b>en limpieza</b>.</div>
        <button class="btn btn-sm btn-warning" id="limpia">Registrar limpieza</button></div>` : ""}
      <div class="card"><div class="card-header"><i class="bi bi-people me-2"></i>Huéspedes que ingresan</div><div class="card-body">
        <div class="mb-2"><i class="bi bi-person-check me-1 text-success"></i><b>${huespedTxt(r.titularId)}</b> <span class="text-suave">(titular)</span></div>
        ${acomp.map((a, i) => `<div class="d-flex justify-content-between border-top py-2"><span><i class="bi bi-person me-1"></i>${esc(a.nombre)} <span class="text-suave">· ${esc(a.doc)}</span></span>
          <button class="btn btn-sm btn-link text-danger p-0" data-q="${i}">Quitar</button></div>`).join("")}
        ${acomp.length < r.cantHuespedes - 1 ? `<div class="row g-2 mt-1 border-top pt-3">
          <div class="col-md-6"><input class="form-control form-control-sm" id="a-nombre" placeholder="Apellido y nombre del acompañante"></div>
          <div class="col-md-4"><input class="form-control form-control-sm" id="a-doc" placeholder="Tipo y N.º de documento"></div>
          <div class="col-md-2"><button class="btn btn-sm btn-outline-primary w-100" id="a-agregar">Agregar</button></div></div>
          <div class="small text-suave mt-2">Faltan ${r.cantHuespedes - 1 - acomp.length} acompañante(s) según la reserva.</div>` : `<div class="small text-success mt-2"><i class="bi bi-check2 me-1"></i>Se registraron todos los huéspedes de la reserva.</div>`}
      </div></div>
    </div><div class="col-lg-6">
      ${saldoInicial > 0 ? `<div class="alert alert-warning py-2"><i class="bi bi-hourglass-split me-1"></i>La reserva está <b>pendiente de pago</b>: el saldo se abona antes de ingresar.</div><div id="panel-pago"></div>`
        : `<div class="alert alert-success"><i class="bi bi-check-circle me-1"></i>La reserva ya está paga (${$$(r.total)}).</div>`}
      <div class="d-flex justify-content-end mt-3"><button class="btn btn-primary btn-lg" id="confirmar"><i class="bi bi-box-arrow-in-right me-1"></i>Confirmar check-in</button></div>
      <div class="small text-suave text-end mt-1" id="motivo"></div>
    </div></div>`;
    const actualizar = () => {
      const saldo = Math.max(0, saldoInicial - Q.pagado(pagos));
      const motivo = sucias.length ? "Primero registrá la limpieza de la habitación." : saldo > 0 ? "Se habilita cuando el saldo es cero." : "";
      $("#confirmar").disabled = !!motivo;
      $("#motivo").textContent = motivo;
    };
    if (saldoInicial > 0) new PanelPago($("#panel-pago"), { total: saldoInicial, pagos, alCambiar: actualizar });
    actualizar();
    if ($("#limpia")) $("#limpia").onclick = () => { sucias.forEach((h) => (h.estado = "Disponible")); Store.guardar(); toast("Limpieza registrada."); render(); };
    $all("[data-q]").forEach((b) => (b.onclick = () => { acomp.splice(Number(b.dataset.q), 1); render(); }));
    if ($("#a-agregar")) $("#a-agregar").onclick = () => {
      const n = $("#a-nombre"), dd = $("#a-doc");
      limpiarErrores(vista());
      if (!n.value.trim()) return marcarError(n, "Ingresá el nombre.");
      if (!dd.value.trim()) return marcarError(dd, "Ingresá el documento.");
      acomp.push({ nombre: n.value.trim(), doc: dd.value.trim() });
      render();
    };
    $("#confirmar").onclick = () => {
      r.pagos.push(...limpiarPagos(pagos));
      r.estado = "En curso";
      Q.e.estadias.push({ id: "E" + r.nro, reservaId: r.id, checkIn: Fecha.ahora(), checkOut: "", acompanantes: [...acomp], cargos: [], pagos: [], facturaId: "" });
      r.habitaciones.forEach((hid) => (Q.hab(hid).estado = "Ocupada"));
      Store.guardar();
      toast(`Check-in registrado. ${esc(Q.huesped(r.titularId).nombre)} ingresó a ${Q.habTexto(r)}.`);
      ir("/checkin");
    };
  };
  render();
};

/* ===================================================================== P6 */
V.checkout = () => {
  const hoy = T();
  let texto = "";
  vista().innerHTML = encabezado("Check-out", "Estadías en curso, ordenadas por la salida prevista más cercana.", ["P6", "Inicio check-out"]) + `
    <div class="card"><div class="card-body border-bottom"><div class="input-group" style="max-width:380px"><span class="input-group-text"><i class="bi bi-search"></i></span>
      <input class="form-control" id="buscar" placeholder="Buscar por nombre o N.º de documento"></div></div>
      <div class="table-responsive"><table class="table table-hover"><thead><tr><th>N.º</th><th>Titular</th><th>Habitaciones</th><th>Check-in</th><th>Salida prevista</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const t = texto.toLowerCase();
    const lista = Q.e.reservas.filter((r) => r.estado === "En curso").filter((r) => {
      const g = Q.huesped(r.titularId);
      return !t || g.nombre.toLowerCase().includes(t) || g.nroDoc.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "~");
    }).sort((a, b) => (a.salida > b.salida ? 1 : -1));
    $("#filas").innerHTML = lista.length ? lista.map((r) => {
      const es = Q.estadiaDe(r.id);
      const etiqueta = r.salida < hoy ? '<span class="badge text-bg-danger ms-1">Vencida</span>' : r.salida === hoy ? '<span class="badge text-bg-warning ms-1">Hoy</span>' : "";
      return `<tr><td>${r.nro}</td><td>${huespedTxt(r.titularId)}</td><td>${Q.habTexto(r)}</td><td>${es ? Fecha.textoHora(es.checkIn) : "—"}</td>
        <td>${Fecha.texto(r.salida)}${etiqueta}</td><td class="text-end"><a class="btn btn-sm btn-primary" href="#/checkout/${r.id}">Check-out</a></td></tr>`;
    }).join("") : `<tr><td colspan="6"><div class="vacio"><i class="bi bi-door-open"></i>No hay estadías en curso${t ? " que coincidan con la búsqueda" : ""}.</div></td></tr>`;
  };
  $("#buscar").oninput = (ev) => { texto = ev.target.value.trim(); pintar(); };
  pintar();
};

/* ===================================================================== P7 */
V.checkoutEstadia = (id) => {
  const r = Q.reserva(id);
  if (!r) return V.noEncontrado();
  const es = Q.estadiaDe(r.id);
  if (r.estado !== "En curso" || !es) {
    vista().innerHTML = encabezado("Check-out", "", ["P7", "Check-out de estadía"], volver("/checkout")) +
      `<div class="alert alert-info">La reserva N.º ${r.nro} no tiene una estadía en curso.</div>`;
    return;
  }
  const cargos = [];
  const pagos = [];
  const saldoReserva = Q.saldoReserva(r);
  const totalCargos = () => cargos.reduce((s, c) => s + c.monto * c.cantidad, 0);
  const aPagar = () => saldoReserva + totalCargos();
  let panel = null;

  const render = () => {
    vista().innerHTML = encabezado(`Check-out · reserva N.º ${r.nro}`, "Aplicá los cargos adicionales, cobrá el saldo y finalizá la estadía.", ["P7", "Check-out de estadía"], volver("/checkout", "Cancelar")) + `
    <div class="row g-3"><div class="col-lg-6">
      ${bloqueDatosReserva(r)}
      <div class="card"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-plus-circle me-2"></i>Cargos adicionales</span>
        <button class="btn btn-sm btn-outline-primary" id="nuevo-cargo"><i class="bi bi-plus-lg me-1"></i>Nuevo cargo adicional</button></div><div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-7"><label class="form-label">Cargo</label><select class="form-select" id="cargo">${Q.e.cargos.map((c) => `<option value="${c.id}">${esc(c.nombre)} — ${$$(c.monto)}</option>`).join("")}</select></div>
          <div class="col-md-2"><label class="form-label">Cant.</label><input type="number" min="1" value="1" class="form-control" id="cargo-cant"></div>
          <div class="col-md-3"><button class="btn btn-outline-primary w-100" id="agregar-cargo">Agregar cargo</button></div>
        </div>
        ${cargos.length ? `<table class="table table-sm mt-3"><tbody>${cargos.map((c, i) => `<tr><td>${esc(c.nombre)}</td><td>× ${c.cantidad}</td><td class="text-end">${$$(c.monto * c.cantidad)}</td>
          <td class="text-end"><button class="btn btn-sm btn-link text-danger p-0" data-q="${i}">Quitar</button></td></tr>`).join("")}</tbody></table>`
          : `<div class="small text-suave mt-3">Sin cargos adicionales. Si el personal de limpieza informó algún daño o servicio extra, cargalo acá.</div>`}
      </div></div>
    </div><div class="col-lg-6">
      <div class="card mb-3"><div class="card-header"><i class="bi bi-receipt me-2"></i>Resumen de la estadía</div><div class="card-body">
        <div class="resumen-linea"><span>Total de la reserva</span><span>${$$(r.total)}</span></div>
        <div class="resumen-linea text-suave"><span>Ya abonado</span><span>− ${$$(Q.pagado(r.pagos))}</span></div>
        <div class="resumen-linea"><span>Cargos adicionales</span><span>${$$(totalCargos())}</span></div>
        <div class="resumen-linea total"><span>Total a pagar</span><span>${$$(aPagar())}</span></div>
      </div></div>
      ${aPagar() > 0 ? `<div id="panel-pago"></div>` : `<div class="alert alert-success"><i class="bi bi-check-circle me-1"></i>No hay saldo pendiente.</div>`}
      <div class="d-flex justify-content-end mt-3"><button class="btn btn-primary btn-lg" id="finalizar"><i class="bi bi-box-arrow-right me-1"></i>Finalizar check-out</button></div>
      <div class="small text-suave text-end mt-1" id="motivo"></div>
    </div></div>`;
    const actualizar = () => {
      const saldo = Math.max(0, aPagar() - Q.pagado(pagos));
      $("#finalizar").disabled = saldo > 0;
      $("#motivo").textContent = saldo > 0 ? "Se habilita cuando el saldo es cero." : "Se emitirá la factura y se enviará al correo del huésped.";
    };
    if (aPagar() > 0) panel = new PanelPago($("#panel-pago"), { total: aPagar(), pagos, alCambiar: actualizar });
    actualizar();
    $("#agregar-cargo").onclick = () => {
      const c = Q.e.cargos.find((x) => x.id === $("#cargo").value);
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
        return { descripcion: `Alojamiento Hab. ${h.numero} (${t.nombre}), ${noches} noche${noches === 1 ? "" : "s"}`, cantidad: noches, precioUnitario: t.precio, subtotal: t.precio * noches };
      });
      const d = Q.descuento(r.descuentoId);
      if (r.descuentoMonto) items.push({ descripcion: `Descuento ${d ? d.nombre + " (" + d.porcentaje + " %)" : ""}`, cantidad: 1, precioUnitario: -r.descuentoMonto, subtotal: -r.descuentoMonto });
      cargos.forEach((c) => items.push({ descripcion: `Cargo adicional: ${c.nombre}`, cantidad: c.cantidad, precioUnitario: c.monto, subtotal: c.monto * c.cantidad }));
      const f = emitirFactura(r.titularId, items, { tipo: "Estadía", id: r.id });
      es.facturaId = f.id;
      Store.guardar();
      App.actualizarEventos();
      toast(`Check-out registrado. Factura B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")} emitida.`);
      ir("/checkout");
      verFactura(f.id);
    };
  };
  render();
};

/* ==================================================================== P17 */
V.ventas = () => {
  let texto = "";
  vista().innerHTML = encabezado("Ventas", "Ventas de productos regionales y del minibar.", ["P17", "Inicio ventas"],
    `<a href="#/ventas/nueva" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nueva venta</a>`) + `
    <div class="card"><div class="card-body border-bottom"><div class="input-group" style="max-width:380px"><span class="input-group-text"><i class="bi bi-search"></i></span>
      <input class="form-control" id="buscar" placeholder="Buscar por huésped o N.º de venta"></div></div>
      <div class="table-responsive"><table class="table table-hover"><thead><tr><th>N.º</th><th>Fecha y hora</th><th>Huésped</th><th>Productos vendidos</th><th class="text-end">Total</th><th></th></tr></thead>
      <tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const t = texto.toLowerCase();
    const lista = [...Q.e.ventas].reverse().filter((v) => !t || String(v.nro).includes(t) || Q.huesped(v.huespedId).nombre.toLowerCase().includes(t));
    $("#filas").innerHTML = lista.length ? lista.map((v) => `<tr class="click" data-id="${v.id}"><td>${v.nro}</td><td>${Fecha.textoHora(v.fecha)}</td><td>${huespedTxt(v.huespedId)}</td>
      <td class="small">${v.items.map((i) => `${esc(i.nombre)} (${i.cantidad})`).join(", ")}</td><td class="text-end">${$$(v.total)}</td>
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
  vista().innerHTML = encabezado(`Venta N.º ${v.nro}`, `${Fecha.textoHora(v.fecha)}`, ["P18", "Detalle de venta"],
    volver("/ventas") + (v.facturaId ? `<button class="btn btn-outline-primary" id="ver-factura"><i class="bi bi-receipt me-1"></i>Ver factura</button>` : "")) + `
    <div class="row g-3"><div class="col-lg-7"><div class="card"><div class="card-header">Productos vendidos</div><div class="table-responsive"><table class="table">
      <thead><tr><th>Producto</th><th class="text-end">Cantidad</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th></tr></thead>
      <tbody>${v.items.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="text-end">${i.cantidad}</td><td class="text-end">${$$(i.precio)}</td><td class="text-end">${$$(i.precio * i.cantidad)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">${$$(v.total)}</th></tr></tfoot></table></div></div></div>
    <div class="col-lg-5"><div class="card mb-3"><div class="card-body"><dl class="datos mb-0"><dt>Huésped</dt><dd>${huespedTxt(v.huespedId)}</dd>
      <dt>Factura</dt><dd>${v.facturaId ? (() => { const f = Q.factura(v.facturaId); return `B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")}`; })() : "—"}</dd></dl></div></div>
      <div class="card"><div class="card-header">Pagos</div><table class="table table-sm mb-0"><tbody>${v.pagos.map((p) => `<tr><td>${esc(p.medio)}<div class="small text-suave">${esc(p.codigo || "")}</div></td><td class="text-end">${$$(p.monto)}</td></tr>`).join("")}</tbody></table></div>
    </div></div>`;
  if ($("#ver-factura")) $("#ver-factura").onclick = () => verFactura(v.facturaId);
};

/* ===================================================================== P8 */
V.ventaNueva = () => {
  const w = { huespedId: "", items: [], pagos: [] };
  const total = () => w.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  let panel = null;
  const render = () => {
    const alojados = Q.e.reservas.filter((r) => r.estado === "En curso").map((r) => r.titularId);
    const resto = Q.e.huespedes.filter((g) => !alojados.includes(g.id)).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const enCarrito = (pid) => w.items.filter((i) => i.productoId === pid).reduce((s, i) => s + i.cantidad, 0);
    vista().innerHTML = encabezado("Nueva venta", "Registrá la venta de productos a un huésped.", ["P8", "Nueva venta"], volver("/ventas", "Cancelar")) + `
    <div class="row g-3"><div class="col-lg-7">
      <div class="card mb-3"><div class="card-header"><i class="bi bi-person me-2"></i>Huésped</div><div class="card-body">
        <select class="form-select" id="huesped"><option value="">Seleccioná el huésped que realiza la compra…</option>
          <optgroup label="Alojados actualmente">${alojados.map((gid) => { const g = Q.huesped(gid), r = Q.huespedAlojado(gid);
            return `<option value="${gid}" ${gid === w.huespedId ? "selected" : ""}>${esc(g.nombre)} — ${Q.habTexto(r)}</option>`; }).join("")}</optgroup>
          <optgroup label="Otros huéspedes">${resto.map((g) => `<option value="${g.id}" ${g.id === w.huespedId ? "selected" : ""}>${esc(g.nombre)} — ${esc(g.tipoDoc)} ${esc(g.nroDoc)}</option>`).join("")}</optgroup>
        </select></div></div>
      <div class="card"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-basket me-2"></i>Productos</span>
        <button class="btn btn-sm btn-outline-primary" id="nuevo-prod"><i class="bi bi-plus-lg me-1"></i>Nuevo producto</button></div><div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-7"><label class="form-label">Producto</label><select class="form-select" id="prod">${Q.e.productos.map((p) => {
            const disp = p.stock - enCarrito(p.id);
            return `<option value="${p.id}" ${disp <= 0 ? "disabled" : ""}>${esc(p.nombre)} · ${esc(p.marca)} — ${$$(p.precio)} (stock: ${disp})</option>`; }).join("")}</select></div>
          <div class="col-md-2"><label class="form-label">Cant.</label><input type="number" min="1" value="1" class="form-control" id="cant"></div>
          <div class="col-md-3"><button class="btn btn-outline-primary w-100" id="agregar">Agregar producto</button></div>
        </div>
        ${w.items.length ? `<table class="table table-sm mt-3"><thead><tr><th>Producto</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th><th></th></tr></thead>
          <tbody>${w.items.map((i, k) => `<tr><td>${esc(i.nombre)}</td><td class="text-end">${i.cantidad}</td><td class="text-end">${$$(i.precio)}</td><td class="text-end">${$$(i.precio * i.cantidad)}</td>
          <td class="text-end"><button class="btn btn-sm btn-link text-danger p-0" data-q="${k}">Quitar</button></td></tr>`).join("")}</tbody>
          <tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">${$$(total())}</th><th></th></tr></tfoot></table>`
          : `<div class="small text-suave mt-3">Todavía no agregaste productos.</div>`}
      </div></div>
    </div><div class="col-lg-5">
      ${total() > 0 ? `<div id="panel-pago"></div>` : `<div class="card"><div class="card-body text-suave"><i class="bi bi-credit-card me-2"></i>El pago se habilita al agregar productos.</div></div>`}
      <div class="d-flex justify-content-end mt-3"><button class="btn btn-primary btn-lg" id="registrar"><i class="bi bi-check2-circle me-1"></i>Registrar venta</button></div>
      <div class="small text-suave text-end mt-1" id="motivo"></div>
    </div></div>`;
    const actualizar = () => {
      const saldo = total() - Q.pagado(w.pagos);
      const motivo = !w.huespedId ? "Seleccioná el huésped." : !w.items.length ? "Agregá al menos un producto." : saldo > 0 ? "Se habilita cuando el saldo es cero." : "";
      $("#registrar").disabled = !!motivo;
      $("#motivo").textContent = motivo;
    };
    if (total() > 0) panel = new PanelPago($("#panel-pago"), { total: total(), pagos: w.pagos, alCambiar: actualizar });
    actualizar();
    $("#huesped").onchange = (ev) => { w.huespedId = ev.target.value; actualizar(); };
    const bloquearSiPago = () => { if (Q.pagado(w.pagos) > 0) { toast("Quitá los pagos cargados antes de modificar los productos.", "warning"); return true; } return false; };
    $("#agregar").onclick = () => {
      if (bloquearSiPago()) return;
      const p = Q.producto($("#prod").value);
      const n = Math.max(1, Number($("#cant").value) || 1);
      const disp = p.stock - enCarrito(p.id);
      if (n > disp) { marcarError($("#cant"), `Stock insuficiente: quedan ${disp}.`); return; }
      const ex = w.items.find((i) => i.productoId === p.id);
      if (ex) ex.cantidad += n; else w.items.push({ productoId: p.id, nombre: p.nombre, cantidad: n, precio: p.precio });
      render();
    };
    $all("[data-q]").forEach((b) => (b.onclick = () => { if (bloquearSiPago()) return; w.items.splice(Number(b.dataset.q), 1); render(); }));
    $("#nuevo-prod").onclick = async () => { const p = await modalNuevoProducto(); if (p) { render(); $("#prod").value = p.id; } };
    $("#registrar").onclick = () => {
      w.items.forEach((i) => (Q.producto(i.productoId).stock -= i.cantidad));
      const nro = Q.e.seq.venta++;
      const v = { id: "V" + nro, nro, fecha: Fecha.ahora(), huespedId: w.huespedId, items: w.items, total: total(), pagos: limpiarPagos(w.pagos), facturaId: "" };
      const f = emitirFactura(w.huespedId, w.items.map((i) => ({ descripcion: i.nombre, cantidad: i.cantidad, precioUnitario: i.precio, subtotal: i.precio * i.cantidad })), { tipo: "Venta", id: v.id });
      v.facturaId = f.id;
      Q.e.ventas.push(v);
      Store.guardar();
      App.actualizarEventos();
      toast(`Venta N.º ${nro} registrada. Factura B ${f.puntoVenta}-${String(f.numero).padStart(8, "0")} emitida.`);
      ir("/ventas");
      verFactura(f.id);
    };
  };
  render();
};

/* ====================================== pantallas visibles, no incluidas */
V.habitaciones = () => {
  const admin = App.rol() === "Administrador";
  const hoy = T();
  vista().innerHTML = encabezado("Habitaciones", admin ? "Habitaciones, tipos de habitación, camas y servicios." : "Estado de las habitaciones y registro de limpieza.", ["P19", "Inicio habitaciones"],
    admin ? `<button class="btn btn-outline-primary" data-no="Nuevo tipo de habitación"><i class="bi bi-plus-lg me-1"></i>Nuevo tipo</button>
      <button class="btn btn-primary" data-no="Nueva habitación"><i class="bi bi-plus-lg me-1"></i>Nueva habitación</button>` : "") + `
    <div class="card mb-4"><div class="table-responsive"><table class="table"><thead><tr><th>Habitación</th><th>Tipo</th><th>Precio por noche</th><th>Estado</th><th>Bloqueo</th><th></th></tr></thead><tbody>
    ${Q.e.habitaciones.map((h) => { const t = Q.tipo(h.tipoId); return `<tr><td><b>Hab. ${h.numero}</b></td><td>${t.nombre}</td><td>${$$(t.precio)}</td><td>${estadoBadge(h.estado)}</td>
      <td class="small">${h.bloqueo ? `${Fecha.texto(h.bloqueo.desde)} al ${Fecha.texto(h.bloqueo.hasta)}<div class="text-suave">${esc(h.bloqueo.motivo || "")}</div>` : '<span class="text-suave">—</span>'}</td>
      <td class="text-end text-nowrap">${h.estado === "En limpieza" ? `<button class="btn btn-sm btn-warning" data-limpia="${h.id}">Registrar limpieza</button>` : ""}
        ${admin ? `<button class="btn btn-sm btn-light" data-no="Modificar habitación">Modificar</button><button class="btn btn-sm btn-light text-danger" data-no="Dar de baja habitación">Dar de baja</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div></div>
    ${admin ? `<div class="card"><div class="card-header">Tipos de habitación</div><div class="table-responsive"><table class="table"><thead><tr><th>Tipo</th><th>Capacidad</th><th>Camas</th><th>Servicios</th><th>Precio</th><th></th></tr></thead><tbody>
      ${Q.e.tiposHab.map((t) => `<tr><td><b>${t.nombre}</b></td><td>${t.capacidad}</td><td>${t.camas}</td><td class="small">${t.servicios.join(", ")}</td><td>${$$(t.precio)}</td>
        <td class="text-end"><button class="btn btn-sm btn-light" data-no="Modificar tipo de habitación">Modificar</button></td></tr>`).join("")}</tbody></table></div></div>` : ""}`;
  $all("[data-limpia]").forEach((b) => (b.onclick = async () => {
    const h = Q.hab(b.dataset.limpia);
    const ok = await confirmar("Registrar limpieza", `¿Confirmás que la limpieza de la <b>Hab. ${h.numero}</b> fue realizada? Pasará a estado <b>disponible</b>.`, { boton: "Confirmar limpieza" });
    if (!ok) return;
    h.estado = "Disponible"; Store.guardar(); toast(`Limpieza de la Hab. ${h.numero} registrada.`); V.habitaciones();
  }));
  App.enlazarNoIncluidos();
};

V.huespedes = () => {
  const admin = App.rol() === "Administrador";
  let texto = "";
  vista().innerHTML = encabezado("Huéspedes", "Datos, preferencias e historial de cada huésped.", ["P27", "Inicio huéspedes"],
    `<button class="btn btn-primary" id="nuevo"><i class="bi bi-person-plus me-1"></i>Nuevo huésped</button>`) + `
    <div class="card"><div class="card-body border-bottom"><div class="input-group" style="max-width:380px"><span class="input-group-text"><i class="bi bi-search"></i></span>
      <input class="form-control" id="buscar" placeholder="Buscar por nombre o N.º de documento"></div></div>
    <div class="table-responsive"><table class="table"><thead><tr><th>Huésped</th><th>Documento</th><th>Email</th><th>Teléfono</th><th>Preferencias</th><th></th></tr></thead><tbody id="filas"></tbody></table></div></div>`;
  const pintar = () => {
    const t = texto.toLowerCase();
    const lista = [...Q.e.huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre)).filter((g) => !t || g.nombre.toLowerCase().includes(t) || g.nroDoc.toLowerCase().includes(t));
    $("#filas").innerHTML = lista.map((g) => `<tr><td><b>${esc(g.nombre)}</b>${Q.huespedAlojado(g.id) ? ' <span class="badge text-bg-success">Alojado</span>' : ""}</td><td>${esc(g.tipoDoc)} ${esc(g.nroDoc)}</td>
      <td>${esc(g.email)}</td><td>${esc(g.telefono)}</td><td class="small">${esc(g.preferencias) || '<span class="text-suave">—</span>'}</td>
      <td class="text-end text-nowrap"><a class="btn btn-sm btn-light" href="#/huespedes/${g.id}">Historial</a><button class="btn btn-sm btn-light" data-no="Modificar huésped">Modificar</button>
      ${admin ? `<button class="btn btn-sm btn-light text-danger" data-no="Dar de baja huésped">Dar de baja</button>` : ""}</td></tr>`).join("")
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
    ${g.preferencias ? `<div class="alert alert-light border"><i class="bi bi-star me-1"></i><b>Preferencias:</b> ${esc(g.preferencias)}</div>` : ""}
    <div class="card"><div class="card-header">Historial de estadías</div><div class="table-responsive"><table class="table"><thead><tr><th>Reserva</th><th>Check-in</th><th>Check-out</th><th>Huéspedes</th><th>Habitaciones</th><th>Noches</th><th class="text-end">Total gastado</th></tr></thead>
    <tbody>${reservas.map((r) => { const es = Q.estadiaDe(r.id); return `<tr><td><a href="#/reservas/${r.id}">N.º ${r.nro}</a></td><td>${es ? Fecha.texto(es.checkIn) : Fecha.texto(r.llegada)}</td>
      <td>${es && es.checkOut ? Fecha.texto(es.checkOut) : estadoBadge("En curso")}</td><td>${r.cantHuespedes}</td><td class="small">${Q.habTexto(r)}</td><td>${Fecha.noches(r.llegada, r.salida)}</td><td class="text-end">${$$(gasto(r))}</td></tr>`; }).join("")
      || `<tr><td colspan="7"><div class="vacio">Todavía no tiene estadías registradas.</div></td></tr>`}</tbody>
    <tfoot><tr><th colspan="6" class="text-end">Total histórico gastado</th><th class="text-end">${$$(totalHist)}</th></tr></tfoot></table></div></div>`;
};

V.productos = () => {
  vista().innerHTML = encabezado("Productos", "Catálogo de productos regionales y del minibar.", ["P9", "Inicio productos"],
    `<button class="btn btn-primary" id="nuevo"><i class="bi bi-plus-lg me-1"></i>Nuevo producto</button>`) + `
    <div class="card"><div class="table-responsive"><table class="table"><thead><tr><th>Producto</th><th>Marca</th><th class="text-end">Precio</th><th class="text-end">Stock</th><th></th></tr></thead><tbody>
    ${Q.e.productos.map((p) => `<tr><td><b>${esc(p.nombre)}</b></td><td>${esc(p.marca)}</td><td class="text-end">${$$(p.precio)}</td>
      <td class="text-end">${p.stock}${p.stock <= 3 ? ' <span class="badge text-bg-warning">Stock bajo</span>' : ""}</td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-light" data-no="Modificar producto">Modificar</button><button class="btn btn-sm btn-light text-danger" data-no="Dar de baja producto">Dar de baja</button></td></tr>`).join("")}
    </tbody></table></div></div>`;
  $("#nuevo").onclick = async () => { if (await modalNuevoProducto()) V.productos(); };
  App.enlazarNoIncluidos();
};

V.reportes = () => {
  vista().innerHTML = encabezado("Reportes", "Informes para la toma de decisiones.", ["P32", "Inicio reportes"]) + `
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
      <div class="table-responsive"><table class="table"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}<th></th></tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-light" data-no="Modificar">Modificar</button><button class="btn btn-sm btn-light text-danger" data-no="Dar de baja">Dar de baja</button></td></tr>`).join("")}</tbody></table></div>`;
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
    vista().innerHTML = encabezado("Configuración", "Usuarios, catálogos y datos del hotel.", ["P34", "Inicio configuración"]) + `
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

V.sinPermiso = () => {
  vista().innerHTML = `<div class="vacio mt-5"><i class="bi bi-shield-lock"></i>Tu rol no tiene acceso a este módulo.<div class="mt-3"><a href="#/inicio" class="btn btn-primary">Ir al inicio</a></div></div>`;
};
