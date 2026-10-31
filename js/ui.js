/* ==========================================================================
   Componentes de interfaz reutilizables
   ========================================================================== */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $all = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

function estadoBadge(estado) {
  return `<span class="estado ${esc(estado).replace(/ /g, "-")}">${esc(estado)}</span>`;
}

/* referencia a la pantalla de la tesis (P0, P1, ...), para trazabilidad */
function codigoP(cod) {
  return `<span class="codigo-p">[${esc(cod)}]</span>`;
}

function toast(msg, tipo = "success") {
  const iconos = { success: "check-circle-fill", info: "info-circle-fill", warning: "exclamation-triangle-fill", danger: "x-circle-fill" };
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${tipo} border-0`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi bi-${iconos[tipo]} me-2"></i>${msg}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  $("#toasts").appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 4500 });
  el.addEventListener("hidden.bs.toast", () => el.remove());
  t.show();
}

/* tablas: cada celda toma la alineación del encabezado de su columna
   (texto a la izquierda; fechas, cantidades y estados centrados; importes y acciones a la derecha) */
function alinearColumnas(raiz) {
  $all("table", raiz).forEach((tabla) => {
    const fila = tabla.tHead && tabla.tHead.rows[tabla.tHead.rows.length - 1];
    if (!fila) return;
    const alin = [...fila.cells].map((th) => ["text-center", "text-end"].find((c) => th.classList.contains(c)));
    [...tabla.tBodies, tabla.tFoot].filter(Boolean).forEach((sec) => [...sec.rows].forEach((tr) => {
      let col = 0;
      [...tr.cells].forEach((td) => {
        const tiene = ["text-start", "text-center", "text-end"].some((c) => td.classList.contains(c));
        if (td.colSpan === 1 && !tiene && alin[col]) td.classList.add(alin[col]);
        col += td.colSpan;
      });
    }));
  });
}
new MutationObserver(() => { alinearColumnas($("#vista")); alinearColumnas($("#modales")); })
  .observe(document.documentElement, { childList: true, subtree: true });

/* íconos que no tiene Bootstrap Icons */
const ICONOS = {
  cama: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  limpieza: '<path d="M12 2v9"/><rect x="8" y="11" width="8" height="3" rx="1"/><path d="M8 14 5 22h14l-3-8"/><path d="M10 17.5 9.5 22M14 17.5l.5 4.5"/>',
};
function icono(nombre) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}

/* acciones que forman parte del diseño pero no del prototipo */
function noIncluido() {
  toast("Funcionalidad no incluida en el prototipo.", "info");
}
function moduloNoIncluido() {
  toast("Módulo no incluido en el prototipo.", "info");
}

function abrirModal({ titulo, cuerpo, pie = "", tamano = "", alAbrir, alCerrar }) {
  const el = document.createElement("div");
  el.className = "modal fade";
  el.tabIndex = -1;
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${tamano}"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title">${titulo}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">${cuerpo}</div>${pie ? `<div class="modal-footer">${pie}</div>` : ""}</div></div>`;
  $("#modales").appendChild(el);
  const m = new bootstrap.Modal(el);
  el.addEventListener("hidden.bs.modal", () => { el.remove(); if (alCerrar) alCerrar(); });
  if (alAbrir) el.addEventListener("shown.bs.modal", () => alAbrir(el, m));
  m.show();
  return { el, m };
}

function confirmar(titulo, texto, { boton = "Confirmar", clase = "btn-primary" } = {}) {
  return new Promise((ok) => {
    let respuesta = false;
    const { el, m } = abrirModal({
      titulo, cuerpo: `<p class="mb-0">${texto}</p>`,
      pie: `<button class="btn btn-light" data-bs-dismiss="modal">Volver</button><button class="btn ${clase}" id="btn-si">${boton}</button>`,
      alCerrar: () => ok(respuesta),
    });
    $("#btn-si", el).onclick = () => { respuesta = true; m.hide(); };
  });
}

function marcarError(input, msg) {
  input.classList.add("is-invalid");
  let fb = input.parentElement.querySelector(".invalid-feedback");
  if (!fb) { fb = document.createElement("div"); fb.className = "invalid-feedback"; input.parentElement.appendChild(fb); }
  fb.textContent = msg;
}
function limpiarErrores(raiz) { $all(".is-invalid", raiz).forEach((i) => i.classList.remove("is-invalid")); }

/* medios de pago del prototipo */
const MEDIO = { efectivo: "Efectivo", transferencia: "Transferencia / link de pago", tarjeta: "Tarjeta" };

/* ------------------------------------------------------------ panel de pago
   CU 4: se invoca desde la reserva, el check-in, el check-out y la venta.
   pagos es un arreglo que se modifica en el lugar.                         */
class PanelPago {
  constructor(contenedor, { total, pagos, alCambiar }) {
    this.c = contenedor;
    this.total = total;
    this.pagos = pagos;
    this.alCambiar = alCambiar || (() => {});
    this.manual = false;
    this.render();
  }
  get pagado() { return Q.pagado(this.pagos); }
  get saldo() { return Math.max(0, this.total - this.pagado); }
  setTotal(t) { this.total = t; this.render(); }
  render() {
    const s = this.saldo;
    this.c.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="bi bi-credit-card me-2"></i>Pago ${codigoP("P3", "Panel de pago")}</span>
          <span class="small text-suave">Total a pagar: <b class="text-dark">${$$(this.total)}</b></span>
        </div>
        <div class="card-body">
          ${s > 0 ? `
          <div class="row g-2 align-items-end">
            <div class="col-sm-5"><label class="form-label">Medio de pago</label>
              <select class="form-select" id="pp-medio">${Q.e.mediosPago.map((m) => `<option>${m}</option>`).join("")}</select></div>
            <div class="col-sm-4"><label class="form-label">Monto a abonar</label>
              <div class="input-group"><span class="input-group-text">$</span><input type="number" min="1" class="form-control" id="pp-monto" value="${s}"></div></div>
            <div class="col-sm-3" data-lugar="${MEDIO.efectivo}"></div>
          </div>
          <div id="pp-transf" class="row g-2 mt-1 align-items-end d-none">
            <div class="col-sm-9"><label class="form-label">N.º de operación</label><input class="form-control" id="pp-op" placeholder="Figura en el comprobante de la transferencia o del link de pago"></div>
            <div class="col-sm-3" data-lugar="${MEDIO.transferencia}"></div>
          </div>
          <div id="pp-tarjeta" class="mt-2 d-none">
            <div class="posnet" id="pp-posnet-caja">
              <i class="bi bi-credit-card-2-front"></i>
              <div class="flex-fill"><b>Posnet</b><div class="small text-suave">Se envía el monto al Posnet; el huésped pasa o acerca la tarjeta y, si se lo pide, ingresa su PIN.</div></div>
              <button class="btn btn-primary text-nowrap" id="pp-posnet">Cobrar con Posnet</button>
            </div>
            <button class="btn btn-link btn-sm px-0 mt-1" id="pp-manual">${this.manual ? "Ocultar carga manual" : "Posnet sin conexión: cargar el N.º de autorización del cupón"}</button>
            <div class="row g-2 align-items-end ${this.manual ? "" : "d-none"}">
              <div class="col-sm-9"><label class="form-label">N.º de autorización (figura en el cupón del Posnet)</label><input class="form-control" id="pp-aut" inputmode="numeric" maxlength="12"></div>
              <div class="col-sm-3" data-lugar="${MEDIO.tarjeta}"></div>
            </div>
          </div>
          <button class="btn btn-outline-primary w-100" id="pp-agregar"><i class="bi bi-plus-lg me-1"></i>Agregar pago</button>
          <hr>` : ""}
          ${this.pagos.length ? `
          <table class="table table-sm">
            <thead><tr><th>Medio de pago</th><th>Código de transacción</th><th class="text-end">Monto</th><th></th></tr></thead>
            <tbody>${this.pagos.map((p, i) => `<tr><td>${esc(p.medio)}</td><td class="text-suave">${esc(p.codigo) || "—"}</td>
              <td class="text-end">${$$(p.monto)}</td><td class="text-end">${p.nuevo ? `<button class="btn btn-sm btn-link text-danger p-0" data-quitar="${i}" title="Quitar"><i class="bi bi-trash"></i></button>` : ""}</td></tr>`).join("")}</tbody>
          </table>` : `<div class="text-suave small mb-2">Todavía no se cargaron pagos.</div>`}
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="text-suave">Saldo pendiente</span>
            <span class="fs-5 fw-bold ${s > 0 ? "saldo-pend" : "saldo-ok"}">${s > 0 ? $$(s) : '<i class="bi bi-check-circle me-1"></i>$ 0'}</span>
          </div>
        </div>
      </div>`;
    if (s > 0) this.enlazar();
    $all("[data-quitar]", this.c).forEach((b) => (b.onclick = () => { this.pagos.splice(Number(b.dataset.quitar), 1); this.render(); this.alCambiar(); }));
  }
  enlazar() {
    const medio = $("#pp-medio", this.c);
    if (this.medio) medio.value = this.medio;
    const cambiarMedio = () => {
      const m = (this.medio = medio.value);
      $("#pp-transf", this.c).classList.toggle("d-none", m !== MEDIO.transferencia);
      $("#pp-tarjeta", this.c).classList.toggle("d-none", m !== MEDIO.tarjeta);
      // 'Agregar pago' va al final de la última fila de datos del medio elegido;
      // con tarjeta, el pago lo registra el Posnet (salvo la carga manual del cupón)
      const btn = $("#pp-agregar", this.c);
      $(`[data-lugar="${m}"]`, this.c).appendChild(btn);
      btn.classList.toggle("d-none", m === MEDIO.tarjeta && !this.manual);
    };
    medio.onchange = cambiarMedio;
    $("#pp-aut", this.c).oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, ""); };
    $("#pp-manual", this.c).onclick = () => { this.manual = !this.manual; this.render(); };
    $("#pp-posnet", this.c).onclick = () => this.cobrarConPosnet();
    $("#pp-agregar", this.c).onclick = () => this.agregar();
    cambiarMedio();
  }
  /* CU 4, paso 6: el monto debe ser positivo y no superar el saldo pendiente */
  montoValido() {
    limpiarErrores(this.c);
    const input = $("#pp-monto", this.c);
    const monto = Number(input.value);
    if (!(monto > 0) || monto > this.saldo) { marcarError(input, "El monto debe ser positivo y no superar el saldo pendiente."); return 0; }
    return monto;
  }
  registrar(medio, monto, codigo) {
    this.pagos.push({ id: Store.nuevoId("PG"), fecha: Fecha.ahora(), medio, monto, codigo, nuevo: true });
    this.render();
    this.alCambiar();
  }
  agregar() {
    const medio = $("#pp-medio", this.c).value;
    const monto = this.montoValido();
    if (!monto) return;
    let codigo = "";
    if (medio === MEDIO.transferencia) {
      const op = $("#pp-op", this.c);
      if (op.value.trim().length < 4) return marcarError(op, "Ingresá el número de operación del comprobante.");
      codigo = op.value.trim();
    }
    if (medio === MEDIO.tarjeta) {
      const aut = $("#pp-aut", this.c);
      if (aut.value.length < 4) return marcarError(aut, "Ingresá el número de autorización del cupón.");
      codigo = aut.value;
    }
    this.registrar(medio, monto, codigo);
    toast(`Pago de ${$$(monto)} registrado (${medio.toLowerCase()}).`);
  }
  /* simulación del Posnet integrado: recibe el monto, el huésped pasa la tarjeta
     y devuelve el resultado con el número de autorización */
  cobrarConPosnet() {
    const monto = this.montoValido();
    if (!monto) return;
    $("#pp-medio", this.c).disabled = true;
    $("#pp-monto", this.c).disabled = true;
    $("#pp-manual", this.c).disabled = true;
    $("#pp-posnet-caja", this.c).innerHTML = `<span class="spinner-border text-primary" role="status"></span>
      <div class="flex-fill"><b>Esperando la tarjeta en el Posnet…</b><div class="small text-suave">Monto enviado: ${$$(monto)}. El huésped pasa o acerca la tarjeta.</div></div>`;
    setTimeout(() => {
      const tarjeta = ["Visa crédito", "Visa débito", "Mastercard crédito", "Maestro débito"][Math.floor(Math.random() * 4)];
      const ultimos = String(Math.floor(1000 + Math.random() * 9000));
      const autorizacion = String(Math.floor(100000 + Math.random() * 900000));
      this.registrar(MEDIO.tarjeta, monto, autorizacion);
      toast(`Pago aprobado por el Posnet (${tarjeta} •••• ${ultimos}). N.º de autorización: <b>${autorizacion}</b>`);
    }, 2000);
  }
}

const limpiarPagos = (pagos) => pagos.map(({ nuevo, ...p }) => p);
/* código de transacción del pago: n.º de operación (transferencia o link de pago) o
   n.º de autorización del Posnet (tarjeta); el efectivo no tiene */
const detallePago = (p) => esc(p.codigo || "");

/* ------------------------------------------------------- alta de huésped
   CU 13 (pantalla P28). Devuelve el huésped creado o null.                */
function modalNuevoHuesped() {
  return new Promise((ok) => {
    let creado = null;
    const { el, m } = abrirModal({
      titulo: `Nuevo huésped ${codigoP("P28", "Nuevo huésped")}`,
      tamano: "modal-lg",
      cuerpo: `<form id="f-huesped" class="row g-3" novalidate>
        <div class="col-md-8"><label class="form-label obligatorio">Apellido y nombre</label><input class="form-control" name="nombre" placeholder="Apellido, Nombres"></div>
        <div class="col-md-4"><label class="form-label obligatorio">Tipo de documento</label><select class="form-select" name="tipoDoc">${Q.e.tiposDoc.map((t) => `<option>${t}</option>`).join("")}</select></div>
        <div class="col-md-4"><label class="form-label obligatorio">N.º de documento</label><input class="form-control" name="nroDoc"></div>
        <div class="col-md-5"><label class="form-label">Email</label><input class="form-control" name="email" type="email" placeholder="Opcional"></div>
        <div class="col-md-3"><label class="form-label">Teléfono</label><input class="form-control" name="telefono"></div>
        <div class="col-12"><label class="form-label">Preferencias</label><textarea class="form-control" name="preferencias" rows="2" placeholder="Ej.: planta baja, cama matrimonial, sin almohadas de pluma…"></textarea></div>
      </form>`,
      pie: `<button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="btn-guardar-h">Guardar</button>`,
      alCerrar: () => ok(creado),
    });
    $("#btn-guardar-h", el).onclick = () => {
      const f = $("#f-huesped", el);
      limpiarErrores(f);
      const v = Object.fromEntries(new FormData(f));
      let valido = true;
      if (!v.nombre.trim()) { marcarError(f.nombre, "Ingresá el apellido y el nombre."); valido = false; }
      const doc = v.nroDoc.trim();
      if (!doc) { marcarError(f.nroDoc, "Ingresá el número de documento."); valido = false; }
      else if (Q.e.huespedes.some((g) => g.nroDoc.replace(/\D/g, "") === doc.replace(/\D/g, "") && g.tipoDoc === v.tipoDoc)) {
        marcarError(f.nroDoc, "El número de documento ingresado ya existe."); valido = false;
      }
      // el email es opcional (un acompañante, por ejemplo un menor, puede no tenerlo)
      const email = v.email.trim();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) { marcarError(f.email, "Ingresá un email válido."); valido = false; }
      else if (email && Q.e.huespedes.some((g) => g.email && g.email.toLowerCase() === email.toLowerCase())) { marcarError(f.email, "El email ingresado ya existe."); valido = false; }
      if (!valido) return;
      creado = { id: Store.nuevoId("G"), nombre: v.nombre.trim(), tipoDoc: v.tipoDoc, nroDoc: doc, email: v.email.trim(), telefono: v.telefono.trim(), preferencias: v.preferencias.trim() };
      Q.e.huespedes.push(creado);
      Store.guardar();
      toast(`Huésped <b>${esc(creado.nombre)}</b> registrado.`);
      m.hide();
    };
  });
}

/* ------------------------------------------- alta y modificación de producto
   CU 10 y CU 11 (pantallas P10 y P11): el mismo formulario, vacío en el alta y
   con los datos actuales en la modificación. 'Nueva marca' abre en el mismo
   cuadro el registro de la marca (CU 30, pantalla P31) y vuelve al producto. */
function modalProducto(producto = null) {
  return new Promise((ok) => {
    let creado = null;
    const p0 = producto || { marca: "", nombre: "", precio: "", stock: 0, descripcion: "" };
    const tituloProducto = producto ? `Modificar producto ${codigoP("P11")}` : `Nuevo producto ${codigoP("P10")}`;
    const textoGuardar = producto ? "Guardar cambios" : "Guardar";
    const tituloMarca = `Nueva marca ${codigoP("P31", "Nueva marca")}`;
    const opciones = (sel) => [...Q.e.marcas].sort((a, b) => a.localeCompare(b)).map((x) => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
    const { el, m } = abrirModal({
      titulo: tituloProducto,
      cuerpo: `<form id="f-prod" class="row g-3" novalidate>
        <div class="col-12"><label class="form-label obligatorio">Marca</label>
          <div class="d-flex gap-2"><div class="flex-fill"><select class="form-select" name="marca">${opciones(p0.marca)}</select></div>
            <button type="button" class="btn btn-outline-primary text-nowrap" id="btn-nueva-marca"><i class="bi bi-plus-lg me-1"></i>Nueva marca</button></div></div>
        <div class="col-12"><label class="form-label obligatorio">Nombre comercial</label><input class="form-control" name="nombre" value="${esc(p0.nombre)}"></div>
        <div class="col-6"><label class="form-label obligatorio">Precio</label><div class="input-group"><span class="input-group-text">$</span><input class="form-control" type="number" min="1" name="precio" value="${p0.precio}"></div></div>
        <div class="col-6"><label class="form-label obligatorio">Stock</label><input class="form-control" type="number" min="0" name="stock" value="${p0.stock}"></div>
        <div class="col-12"><label class="form-label">Descripción</label><textarea class="form-control" name="descripcion" rows="2">${esc(p0.descripcion || "")}</textarea></div>
      </form>
      <form id="f-marca" class="row g-3 d-none" novalidate>
        <div class="col-12"><label class="form-label obligatorio">Nombre de la marca</label><input class="form-control" name="marca"></div>
      </form>`,
      pie: `<button class="btn btn-light" id="btn-cancelar-p">Cancelar</button><button class="btn btn-primary" id="btn-guardar-p">${textoGuardar}</button>`,
      alCerrar: () => ok(creado),
    });
    const fp = $("#f-prod", el), fm = $("#f-marca", el);
    let enMarca = false;
    const mostrar = (marca) => {
      enMarca = marca;
      fp.classList.toggle("d-none", marca);
      fm.classList.toggle("d-none", !marca);
      $(".modal-title", el).innerHTML = marca ? tituloMarca : tituloProducto;
      $("#btn-guardar-p", el).textContent = marca ? "Guardar" : textoGuardar;
      if (marca) { limpiarErrores(fm); fm.marca.value = ""; fm.marca.focus(); }
    };
    const guardarMarca = () => {
      limpiarErrores(fm);
      const nombre = fm.marca.value.trim();
      if (!nombre) return marcarError(fm.marca, "Ingresá el nombre de la marca.");
      if (Q.e.marcas.some((x) => normalizar(x) === normalizar(nombre))) return marcarError(fm.marca, "La marca ya existe.");
      Q.e.marcas.push(nombre);
      Store.guardar();
      toast(`Marca <b>${esc(nombre)}</b> registrada.`);
      fp.marca.innerHTML = opciones(nombre);
      mostrar(false);
    };
    const guardarProducto = () => {
      limpiarErrores(fp);
      const marca = fp.marca.value, nombre = fp.nombre.value.trim();
      const precio = Number(fp.precio.value), stock = fp.stock.value === "" ? NaN : Number(fp.stock.value);
      let valido = true;
      if (!nombre) { marcarError(fp.nombre, "Ingresá el nombre comercial."); valido = false; }
      else if (Q.e.productos.some((p) => p !== producto && p.activo !== false && p.marca === marca && normalizar(p.nombre) === normalizar(nombre))) { marcarError(fp.nombre, "El producto ya existe."); valido = false; }
      if (!(precio > 0)) { marcarError(fp.precio, "El precio debe ser positivo."); valido = false; }
      if (!(stock >= 0)) { marcarError(fp.stock, "El stock no puede ser un valor negativo."); valido = false; }
      if (!valido) return;
      const datos = { nombre, marca, precio, stock, descripcion: fp.descripcion.value.trim() };
      if (producto) {
        creado = Object.assign(producto, datos);
        toast(`Producto <b>${esc(nombre)}</b> actualizado.`);
      } else {
        creado = { id: Store.nuevoId("PR"), ...datos };
        Q.e.productos.push(creado);
        toast(`Producto <b>${esc(nombre)}</b> registrado.`);
      }
      Store.guardar();
      m.hide();
    };
    fp.onsubmit = fm.onsubmit = (e) => { e.preventDefault(); enMarca ? guardarMarca() : guardarProducto(); };
    $("#btn-nueva-marca", el).onclick = () => mostrar(true);
    $("#btn-cancelar-p", el).onclick = () => (enMarca ? mostrar(false) : m.hide());
    $("#btn-guardar-p", el).onclick = () => (enMarca ? guardarMarca() : guardarProducto());
  });
}

/* ------------------------------------------------------ baja de producto
   CU de baja (pantalla P12): muestra los datos sin poder cambiarlos; el
   producto no se borra, queda deshabilitado y deja de mostrarse en las listas. */
function modalBajaProducto(p) {
  return new Promise((ok) => {
    let baja = false;
    const { el, m } = abrirModal({
      titulo: `Baja de producto ${codigoP("P12")}`,
      cuerpo: `<dl class="datos datos-grilla mb-0">
          <div><dt>Marca</dt><dd>${esc(p.marca)}</dd></div>
          <div><dt>Nombre comercial</dt><dd>${esc(p.nombre)}</dd></div>
          <div><dt>Precio</dt><dd>${$$(p.precio)}</dd></div>
          <div><dt>Stock</dt><dd>${p.stock}</dd></div>
          <div class="ancho"><dt>Descripción</dt><dd>${esc(p.descripcion) || "—"}</dd></div>
        </dl>
        <div class="alert alert-warning small mb-0 mt-2"><i class="bi bi-exclamation-triangle me-1"></i>¿Confirmás la baja? El producto deja de mostrarse en las listas y no se puede vender; sus ventas anteriores se conservan.</div>`,
      pie: `<button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-danger" id="btn-baja">Dar de baja</button>`,
      alCerrar: () => ok(baja),
    });
    $("#btn-baja", el).onclick = () => {
      p.activo = false;
      Store.guardar();
      toast(`Producto <b>${esc(p.nombre)}</b> dado de baja.`, "warning");
      baja = true;
      m.hide();
    };
  });
}

/* --------------------------------------------------- alta de cargo adicional
   CU 25 (pantalla P37).                                                   */
function modalNuevoCargo() {
  return new Promise((ok) => {
    let creado = null;
    const { el, m } = abrirModal({
      titulo: `Nuevo cargo adicional ${codigoP("P37", "Nuevo cargo adicional")}`,
      cuerpo: `<form id="f-cargo" class="row g-3" novalidate>
        <div class="col-12"><label class="form-label obligatorio">Nombre</label><input class="form-control" name="nombre" placeholder="Ej.: Toalla dañada"></div>
        <div class="col-6"><label class="form-label obligatorio">Monto</label><div class="input-group"><span class="input-group-text">$</span><input class="form-control" type="number" min="1" name="monto"></div></div>
      </form>`,
      pie: `<button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="btn-guardar-c">Guardar</button>`,
      alCerrar: () => ok(creado),
    });
    const f = $("#f-cargo", el);
    $("#btn-guardar-c", el).onclick = () => {
      limpiarErrores(f);
      let valido = true;
      if (!f.nombre.value.trim()) { marcarError(f.nombre, "Ingresá el nombre."); valido = false; }
      else if (Q.e.cargos.some((c) => normalizar(c.nombre) === normalizar(f.nombre.value.trim()))) { marcarError(f.nombre, "El cargo adicional ya existe."); valido = false; }
      if (!(Number(f.monto.value) > 0)) { marcarError(f.monto, "Ingresá un monto válido."); valido = false; }
      if (!valido) return;
      creado = { id: Store.nuevoId("C"), nombre: f.nombre.value.trim(), monto: Number(f.monto.value) };
      Q.e.cargos.push(creado);
      Store.guardar();
      toast(`Cargo adicional <b>${esc(creado.nombre)}</b> registrado.`);
      m.hide();
    };
  });
}

/* ------------------------------------------------------------- factura */
function verFactura(facturaId) {
  const f = Q.factura(facturaId);
  if (!f) return;
  const h = Q.e.hotel;
  const g = Q.huesped(f.huespedId);
  const nro = `${f.puntoVenta}-${String(f.numero).padStart(8, "0")}`;
  abrirModal({
    titulo: `Factura B ${nro}`,
    tamano: "modal-lg",
    cuerpo: `<div class="factura imprimible">
      <div class="cab">
        <div><div class="fw-bold fs-6">${esc(h.nombre)}</div><div>${esc(h.razonSocial)}</div><div>${esc(h.domicilio)}</div>
          <div>Tel. ${esc(h.telefono)} · ${esc(h.email)}</div><div>IVA Responsable Inscripto</div></div>
        <div class="letra">B<small>Cód. 006</small></div>
        <div><div class="fw-bold fs-6">FACTURA</div><div>N.º ${nro}</div><div>Fecha: ${Fecha.textoHora(f.fecha)}</div><div>CUIT: ${esc(h.cuit)}</div></div>
      </div>
      <div class="mt-2"><b>Cliente:</b> ${esc(g ? g.nombre : "Consumidor final")} — ${esc(g ? g.tipoDoc + " " + g.nroDoc : "")} · Consumidor final</div>
      <table><thead><tr><th>Descripción</th><th class="text-center">Cant.</th><th class="text-end">Precio unit.</th><th class="text-end">Subtotal</th></tr></thead>
      <tbody>${f.items.map((i) => `<tr><td>${esc(i.descripcion)}</td><td class="text-center">${i.cantidad}</td><td class="text-end">${$$(i.precioUnitario)}</td><td class="text-end">${$$(i.subtotal)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">${$$(f.total)}</th></tr></tfoot></table>
      <div class="cae"><span><b>CAE:</b> ${esc(f.cae)}</span><span><b>Vto. CAE:</b> ${Fecha.texto(f.vtoCae)}</span></div>
      <div class="marca-agua">Comprobante de demostración para el prototipo.</div>
    </div>`,
    pie: `<span class="me-auto small text-suave">${g && g.email ? `<i class="bi bi-envelope-check me-1"></i>Enviada a ${esc(g.email)}` : `<i class="bi bi-envelope-slash me-1"></i>No enviada: el huésped no tiene email`}</span>
      <button class="btn btn-light" onclick="window.print()"><i class="bi bi-printer me-1"></i>Imprimir</button>
      <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>`,
  });
}
