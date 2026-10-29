/* ==========================================================================
   Navegación, roles y estructura general
   ========================================================================== */

const MODULOS = [
  { id: "inicio", texto: "Inicio", icono: "house", roles: ["Administrador", "Recepcionista"] },
  { seccion: "Operación diaria" },
  { id: "reservas", texto: "Reservas", icono: "calendar2-week", roles: ["Administrador", "Recepcionista"] },
  { id: "checkin", texto: "Check-in", icono: "box-arrow-in-right", roles: ["Administrador", "Recepcionista"] },
  { id: "checkout", texto: "Check-out", icono: "box-arrow-right", roles: ["Administrador", "Recepcionista"] },
  { id: "ventas", texto: "Ventas", icono: "bag", roles: ["Administrador", "Recepcionista"] },
  { seccion: "Gestión" },
  { id: "habitaciones", texto: "Habitaciones", icono: "door-open", roles: ["Administrador", "Recepcionista"] },
  { id: "huespedes", texto: "Huéspedes", icono: "people", roles: ["Administrador", "Recepcionista"] },
  { id: "productos", texto: "Productos", icono: "box-seam", roles: ["Administrador"] },
  { id: "reportes", texto: "Reportes", icono: "bar-chart-line", roles: ["Administrador"] },
  { id: "configuracion", texto: "Configuración", icono: "gear", roles: ["Administrador"] },
];

const RUTAS = [
  [/^\/inicio$/, "inicio", () => V.inicio()],
  [/^\/reservas$/, "reservas", () => V.reservas()],
  [/^\/reservas\/nueva$/, "reservas", (m, p) => V.reservaNueva(p)],
  [/^\/reservas\/(\w+)$/, "reservas", (m) => V.reservaDetalle(m[1])],
  [/^\/checkin$/, "checkin", () => V.checkin()],
  [/^\/checkin\/(\w+)$/, "checkin", (m) => V.checkinReserva(m[1])],
  [/^\/checkout$/, "checkout", () => V.checkout()],
  [/^\/checkout\/(\w+)$/, "checkout", (m) => V.checkoutEstadia(m[1])],
  [/^\/ventas$/, "ventas", () => V.ventas()],
  [/^\/ventas\/nueva$/, "ventas", () => V.ventaNueva()],
  [/^\/ventas\/(\w+)$/, "ventas", (m) => V.ventaDetalle(m[1])],
  [/^\/habitaciones$/, "habitaciones", () => V.habitaciones()],
  [/^\/huespedes$/, "huespedes", () => V.huespedes()],
  [/^\/huespedes\/(\w+)$/, "huespedes", (m) => V.huespedHistorial(m[1])],
  [/^\/productos$/, "productos", () => V.productos()],
  [/^\/reportes$/, "reportes", () => V.reportes()],
  [/^\/configuracion$/, "configuracion", () => V.configuracion()],
];

const USUARIO_DEMO = { Administrador: "Fernández, Carla", Recepcionista: "Martínez, Sofía" };

const App = {
  rol: () => Store.estado.rol,
  permitido: (modulo) => (MODULOS.find((m) => m.id === modulo) || { roles: [] }).roles.includes(App.rol()),

  iniciar() {
    Store.cargar();
    $("#fecha-hoy").textContent = Fecha.textoLargo(Fecha.hoy());
    $all("#switch-rol button").forEach((b) => (b.onclick = () => App.cambiarRol(b.dataset.rol)));
    $("#btn-eventos").onclick = () => App.abrirEventos();
    $("#lnk-salir").onclick = (e) => { e.preventDefault(); noIncluido("Cerrar sesión"); };
    $("#lnk-acerca").onclick = (e) => { e.preventDefault(); App.acerca(); };
    $("#lnk-reiniciar").onclick = async (e) => {
      e.preventDefault();
      if (await confirmar("Reiniciar datos de ejemplo", "Se borrarán las reservas, ventas y demás datos cargados durante la prueba, y se volverá al estado inicial.", { boton: "Reiniciar", clase: "btn-danger" })) {
        Store.reiniciar(); App.actualizarEventos(); toast("Se restauraron los datos de ejemplo."); App.navegar();
      }
    };
    $("#btn-menu").onclick = () => $("#sidebar").classList.toggle("abierta");
    window.addEventListener("hashchange", () => App.navegar());
    App.pintarUsuario();
    App.actualizarEventos();
    if (!location.hash) location.hash = "#/inicio"; else App.navegar();
    if (!sessionStorage.getItem("bienvenida")) { sessionStorage.setItem("bienvenida", "1"); App.acerca(); }
  },

  pintarUsuario() {
    const rol = App.rol();
    const nombre = USUARIO_DEMO[rol];
    $("#usuario-nombre").textContent = nombre;
    $("#usuario-rol").textContent = rol;
    $("#avatar").textContent = nombre.split(", ").reverse().map((x) => x[0]).join("");
    $all("#switch-rol button").forEach((b) => {
      const activo = b.dataset.rol === rol;
      b.className = `btn btn-sm ${activo ? "btn-dark" : "btn-light"}`;
    });
    const actual = (location.hash.slice(1).split("/")[1] || "inicio").split("?")[0];
    $("#nav").innerHTML = MODULOS.filter((m) => m.seccion || m.roles.includes(rol)).map((m) => m.seccion
      ? `<div class="seccion">${m.seccion}</div>`
      : `<a href="#/${m.id}" class="${m.id === actual ? "activo" : ""}"><i class="bi bi-${m.icono}"></i>${m.texto}</a>`).join("");
  },

  cambiarRol(rol) {
    Store.estado.rol = rol;
    Store.guardar();
    App.pintarUsuario();
    toast(`Vista de <b>${rol.toLowerCase()}</b>: el menú muestra solo los módulos de ese rol.`, "info");
    App.navegar();
  },

  navegar() {
    const [ruta, query] = location.hash.slice(1).split("?");
    const params = new URLSearchParams(query || "");
    $("#sidebar").classList.remove("abierta");
    for (const [re, modulo, fn] of RUTAS) {
      const m = re.exec(ruta || "/inicio");
      if (m) {
        App.pintarUsuario();
        if (!App.permitido(modulo)) return V.sinPermiso();
        window.scrollTo(0, 0);
        try { fn(m, params); } catch (err) { console.error(err); vista().innerHTML = `<div class="alert alert-danger">Ocurrió un error inesperado en el prototipo: ${esc(err.message)}</div>`; }
        return;
      }
    }
    V.noEncontrado();
  },

  enlazarNoIncluidos() {
    $all("[data-no]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); noIncluido(b.dataset.no); }));
  },

  actualizarEventos() {
    const e = Store.estado;
    const nuevos = Math.max(0, e.eventos.length - (e.eventosVistos || 0));
    const c = $("#contador-eventos");
    c.textContent = nuevos;
    c.style.display = nuevos ? "" : "none";
  },

  abrirEventos() {
    const e = Store.estado;
    const iconos = { OTA: "globe2", ARCA: "receipt", Correo: "envelope" };
    $("#lista-eventos").innerHTML = e.eventos.length ? e.eventos.map((ev, i) => `<div class="evento ${ev.sistema}${i < e.eventos.length - (e.eventosVistos || 0) ? " fw-semibold" : ""}">
      <div><i class="bi bi-${iconos[ev.sistema] || "dot"} me-1"></i>${esc(ev.mensaje)}</div>
      <div class="meta">${ev.sistema} · ${Fecha.textoHora(ev.fecha)}</div></div>`).join("") : `<div class="vacio">Sin eventos.</div>`;
    e.eventosVistos = e.eventos.length;
    Store.guardar();
    App.actualizarEventos();
    bootstrap.Offcanvas.getOrCreateInstance($("#panel-eventos")).show();
  },

  acerca() {
    abrirModal({
      titulo: "Prototipo funcional — Sistema de gestión para un hotel boutique",
      tamano: "modal-lg",
      cuerpo: `<p>Este prototipo acompaña el informe del Seminario de Sistemas <i>“Análisis y Diseño de un Sistema de Gestión para un Hotel Boutique”</i> (Proceso Unificado). Permite recorrer los circuitos principales del sistema diseñado:</p>
        <ul>
          <li><b>Reservas:</b> búsqueda de disponibilidad, alta de huéspedes, descuentos, pago (efectivo, tarjeta o transferencia, combinables) y registro como confirmada o pendiente de pago; detalle y cancelación.</li>
          <li><b>Check-in:</b> con reserva o sin reserva, cobro del saldo pendiente y registro de los acompañantes.</li>
          <li><b>Check-out:</b> cargos adicionales, cobro, emisión de la factura y paso de las habitaciones a limpieza.</li>
          <li><b>Ventas:</b> venta de productos con control de stock y emisión de la factura.</li>
        </ul>
        <p class="mb-2"><b>Para tener en cuenta:</b></p>
        <ul class="small">
          <li>El resto de los módulos se muestra para dar una idea del sistema completo, pero sus acciones no están incluidas en el prototipo.</li>
          <li>Las integraciones con las OTAs (Booking y Expedia), ARCA (factura electrónica) y el correo se <b>simulan</b>: lo que se enviaría se ve en la campana <i class="bi bi-bell"></i>. Las facturas no tienen validez fiscal.</li>
          <li>El selector <b>Administrador / Recepcionista</b> es solo para la demostración: en el sistema real cada usuario ingresa con su cuenta.</li>
          <li>Los datos son ficticios y se guardan en este navegador. Se pueden restaurar con <i>Reiniciar datos de ejemplo</i>, en el menú lateral.</li>
          <li>Para probar el pago con tarjeta podés usar el número de prueba <code>4509 9535 6623 3704</code>, cualquier titular y un vencimiento futuro.</li>
          <li>Los códigos <span class="codigo-p">P1</span>, <span class="codigo-p">P2</span>, … indican a qué pantalla del diseño estático de la interfaz corresponde cada pantalla.</li>
        </ul>`,
      pie: `<button class="btn btn-primary" data-bs-dismiss="modal">Comenzar</button>`,
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.iniciar());
