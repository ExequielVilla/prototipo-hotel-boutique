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
function codigoP(cod, nombre) {
  return `<span class="codigo-p" title="Corresponde a la pantalla ${esc(cod)} del diseño (${esc(nombre)})">${esc(cod)}</span>`;
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

/* acciones que forman parte del diseño pero no del prototipo */
function noIncluido(accion) {
  toast(`${accion ? "<b>" + esc(accion) + "</b>: " : ""}esta función forma parte del diseño del sistema, pero no está incluida en el prototipo.`, "info");
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

/* ------------------------------------------------------------ panel de pago
   CU 4: se invoca desde la reserva, el check-in, el check-out y la venta.
   pagos es un arreglo que se modifica en el lugar.                         */
class PanelPago {
  constructor(contenedor, { total, pagos, alCambiar }) {
    this.c = contenedor;
    this.total = total;
    this.pagos = pagos;
    this.alCambiar = alCambiar || (() => {});
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
            <div class="col-md-4"><label class="form-label">Medio de pago</label>
              <select class="form-select" id="pp-medio">${Q.e.mediosPago.map((m) => `<option>${m}</option>`).join("")}</select></div>
            <div class="col-md-3"><label class="form-label" id="pp-lbl-monto">Monto a abonar</label>
              <div class="input-group"><span class="input-group-text">$</span><input type="number" min="1" class="form-control" id="pp-monto" value="${s}"></div></div>
            <div class="col-md-5" id="pp-extra"></div>
          </div>
          <div id="pp-tarjeta" class="row g-2 mt-1 d-none">
            <div class="col-md-5"><label class="form-label">Número de tarjeta</label><input class="form-control" id="pp-num" placeholder="4509 9535 6623 3704" inputmode="numeric" maxlength="19"></div>
            <div class="col-md-4"><label class="form-label">Titular</label><input class="form-control" id="pp-titular" placeholder="Como figura en la tarjeta"></div>
            <div class="col-md-3"><label class="form-label">Vencimiento</label><input class="form-control" id="pp-vto" placeholder="MM/AA" maxlength="5"></div>
          </div>
          <div id="pp-transf" class="row g-2 mt-1 d-none">
            <div class="col-md-6"><label class="form-label">N.º de comprobante de la transferencia</label><input class="form-control" id="pp-comp" placeholder="Ej.: 000498877120"></div>
          </div>
          <div class="d-flex justify-content-end mt-3"><button class="btn btn-outline-primary" id="pp-agregar"><i class="bi bi-plus-lg me-1"></i>Agregar pago</button></div>
          <hr>` : ""}
          ${this.pagos.length ? `
          <table class="table table-sm">
            <thead><tr><th>Medio de pago</th><th>Código</th><th class="text-end">Monto</th><th></th></tr></thead>
            <tbody>${this.pagos.map((p, i) => `<tr><td>${esc(p.medio)}</td><td class="text-suave">${esc(p.codigo || "—")}</td>
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
    const cambiarMedio = () => {
      const m = medio.value;
      $("#pp-tarjeta", this.c).classList.toggle("d-none", !m.startsWith("Tarjeta"));
      $("#pp-transf", this.c).classList.toggle("d-none", m !== "Transferencia");
      $("#pp-lbl-monto", this.c).textContent = m === "Efectivo" ? "Monto recibido" : "Monto a abonar";
      $("#pp-extra", this.c).innerHTML = m === "Tarjeta de crédito"
        ? `<label class="form-label">Cuotas</label><select class="form-select" id="pp-cuotas"><option>1 cuota</option><option>3 cuotas sin interés</option><option>6 cuotas sin interés</option></select>`
        : m === "Efectivo" ? `<div class="small text-suave pb-2" id="pp-vuelto"></div>` : "";
      actualizarVuelto();
    };
    const actualizarVuelto = () => {
      const v = $("#pp-vuelto", this.c);
      if (!v) return;
      const recibido = Number($("#pp-monto", this.c).value) || 0;
      v.innerHTML = recibido > this.saldo ? `Vuelto a entregar: <b>${$$(recibido - this.saldo)}</b>` : "";
    };
    medio.onchange = cambiarMedio;
    $("#pp-monto", this.c).oninput = actualizarVuelto;
    $("#pp-num", this.c).oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); };
    $("#pp-vto", this.c).oninput = (e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2); e.target.value = v; };
    $("#pp-agregar", this.c).onclick = () => this.agregar();
    cambiarMedio();
  }
  agregar() {
    limpiarErrores(this.c);
    const medio = $("#pp-medio", this.c).value;
    const montoIn = $("#pp-monto", this.c);
    let monto = Number(montoIn.value);
    if (!monto || monto <= 0) return marcarError(montoIn, "Ingresá un monto mayor a cero.");
    let codigo = "";
    let vuelto = 0;
    if (medio === "Efectivo") {
      vuelto = Math.max(0, monto - this.saldo);
      monto = Math.min(monto, this.saldo);
    } else {
      if (monto > this.saldo) return marcarError(montoIn, `El monto no puede superar el saldo (${$$(this.saldo)}).`);
      if (medio.startsWith("Tarjeta")) {
        const num = $("#pp-num", this.c), tit = $("#pp-titular", this.c), vto = $("#pp-vto", this.c);
        let ok = true;
        if (!luhn(num.value.replace(/\s/g, ""))) { marcarError(num, "El número de tarjeta no es válido."); ok = false; }
        if (!tit.value.trim()) { marcarError(tit, "Ingresá el titular."); ok = false; }
        if (!vencimientoValido(vto.value)) { marcarError(vto, "Vencimiento inválido o tarjeta vencida."); ok = false; }
        if (!ok) return;
        codigo = String(Math.floor(100000 + Math.random() * 900000));
      }
      if (medio === "Transferencia") {
        const comp = $("#pp-comp", this.c);
        if (comp.value.trim().length < 6) return marcarError(comp, "Ingresá el número de comprobante.");
        codigo = comp.value.trim();
      }
    }
    const btn = $("#pp-agregar", this.c);
    const finalizar = () => {
      this.pagos.push({ id: Store.nuevoId("PG"), fecha: Fecha.ahora(), medio, monto, codigo, nuevo: true });
      this.render();
      this.alCambiar();
      toast(medio.startsWith("Tarjeta") ? `Pago aprobado. Código de autorización: <b>${codigo}</b>`
        : `Pago de ${$$(monto)} registrado.${vuelto ? ` Vuelto a entregar: <b>${$$(vuelto)}</b>.` : ""}`);
    };
    if (medio.startsWith("Tarjeta")) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Procesando…`;
      setTimeout(finalizar, 900);
    } else finalizar();
  }
}

function luhn(num) {
  if (!/^\d{13,19}$/.test(num)) return false;
  let s = 0, dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    s += d; dbl = !dbl;
  }
  return s % 10 === 0;
}
function vencimientoValido(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mes = Number(m[1]), anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const hoy = new Date();
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
}
const limpiarPagos = (pagos) => pagos.map(({ nuevo, ...p }) => p);

/* ------------------------------------------------------- alta de huésped
   CU 13 (pantalla P28). Devuelve el huésped creado o null.                */
function modalNuevoHuesped() {
  return new Promise((ok) => {
    let creado = null;
    const { el, m } = abrirModal({
      titulo: `Nuevo huésped ${codigoP("P28", "Nuevo huésped")}`,
      tamano: "modal-lg",
      cuerpo: `<form id="f-huesped" class="row g-3" novalidate>
        <div class="col-md-8"><label class="form-label obligatorio">Apellido y nombre</label><input class="form-control" name="nombre" placeholder="Apellido, Nombre"></div>
        <div class="col-md-4"><label class="form-label obligatorio">Tipo de documento</label><select class="form-select" name="tipoDoc">${Q.e.tiposDoc.map((t) => `<option>${t}</option>`).join("")}</select></div>
        <div class="col-md-4"><label class="form-label obligatorio">N.º de documento</label><input class="form-control" name="nroDoc"></div>
        <div class="col-md-5"><label class="form-label obligatorio">Email</label><input class="form-control" name="email" type="email"></div>
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
      if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) { marcarError(f.email, "Ingresá un email válido."); valido = false; }
      if (!valido) return;
      creado = { id: Store.nuevoId("G"), nombre: v.nombre.trim(), tipoDoc: v.tipoDoc, nroDoc: doc, email: v.email.trim(), telefono: v.telefono.trim(), preferencias: v.preferencias.trim() };
      Q.e.huespedes.push(creado);
      Store.guardar();
      toast(`Huésped <b>${esc(creado.nombre)}</b> registrado.`);
      m.hide();
    };
  });
}

/* ------------------------------------------------------ alta de producto
   CU 10 (pantalla P10), con la marca del CU 30.                          */
function modalNuevoProducto() {
  return new Promise((ok) => {
    let creado = null;
    const marcas = [...new Set(Q.e.productos.map((p) => p.marca))].sort();
    const { el, m } = abrirModal({
      titulo: `Nuevo producto ${codigoP("P10", "Nuevo producto")}`,
      cuerpo: `<form id="f-prod" class="row g-3" novalidate>
        <div class="col-12"><label class="form-label obligatorio">Marca</label>
          <div class="input-group"><select class="form-select" name="marca">${marcas.map((x) => `<option>${esc(x)}</option>`).join("")}<option value="__nueva">+ Nueva marca…</option></select></div>
          <input class="form-control mt-2 d-none" name="marcaNueva" placeholder="Nombre de la nueva marca"></div>
        <div class="col-12"><label class="form-label obligatorio">Nombre comercial</label><input class="form-control" name="nombre"></div>
        <div class="col-6"><label class="form-label obligatorio">Precio</label><div class="input-group"><span class="input-group-text">$</span><input class="form-control" type="number" min="1" name="precio"></div></div>
        <div class="col-6"><label class="form-label obligatorio">Stock</label><input class="form-control" type="number" min="0" name="stock" value="0"></div>
      </form>`,
      pie: `<button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="btn-guardar-p">Guardar</button>`,
      alCerrar: () => ok(creado),
    });
    const f = $("#f-prod", el);
    f.marca.onchange = () => f.marcaNueva.classList.toggle("d-none", f.marca.value !== "__nueva");
    $("#btn-guardar-p", el).onclick = () => {
      limpiarErrores(f);
      const marca = f.marca.value === "__nueva" ? f.marcaNueva.value.trim() : f.marca.value;
      let valido = true;
      if (!marca) { marcarError(f.marcaNueva, "Ingresá la marca."); valido = false; }
      if (!f.nombre.value.trim()) { marcarError(f.nombre, "Ingresá el nombre."); valido = false; }
      if (!(Number(f.precio.value) > 0)) { marcarError(f.precio, "Ingresá un precio válido."); valido = false; }
      if (!(Number(f.stock.value) >= 0)) { marcarError(f.stock, "Ingresá el stock."); valido = false; }
      if (!valido) return;
      creado = { id: Store.nuevoId("PR"), nombre: f.nombre.value.trim(), marca, precio: Number(f.precio.value), stock: Number(f.stock.value) };
      Q.e.productos.push(creado);
      Store.guardar();
      toast(`Producto <b>${esc(creado.nombre)}</b> registrado.`);
      m.hide();
    };
  });
}

/* --------------------------------------------------- alta de cargo adicional
   CU 25 (pantalla P38).                                                   */
function modalNuevoCargo() {
  return new Promise((ok) => {
    let creado = null;
    const { el, m } = abrirModal({
      titulo: `Nuevo cargo adicional ${codigoP("P38", "Nuevo cargo adicional")}`,
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
      <table><thead><tr><th>Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio unit.</th><th class="text-end">Subtotal</th></tr></thead>
      <tbody>${f.items.map((i) => `<tr><td>${esc(i.descripcion)}</td><td class="text-end">${i.cantidad}</td><td class="text-end">${$$(i.precioUnitario)}</td><td class="text-end">${$$(i.subtotal)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">${$$(f.total)}</th></tr></tfoot></table>
      <div class="cae"><span><b>CAE:</b> ${esc(f.cae)}</span><span><b>Vto. CAE:</b> ${Fecha.texto(f.vtoCae)}</span></div>
      <div class="marca-agua">Comprobante de demostración generado por el prototipo — sin validez fiscal.</div>
    </div>`,
    pie: `<span class="me-auto small text-suave"><i class="bi bi-envelope-check me-1"></i>Enviada a ${esc(g ? g.email : "")}</span>
      <button class="btn btn-light" onclick="window.print()"><i class="bi bi-printer me-1"></i>Imprimir</button>
      <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>`,
  });
}
