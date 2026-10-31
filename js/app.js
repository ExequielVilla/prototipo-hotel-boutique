/* ==========================================================================
   Navegación, roles y estructura general
   ========================================================================== */

/* configuración del prototipo: lo que se muestra y lo que queda desactivado.
   Para reactivar algo alcanza con cambiar estos valores. */
const PROTOTIPO = {
  selectorDeRol: false,          // selector "Vista demo: Administrador / Recepcionista" de la barra superior
  rol: "Administrador",          // rol con el que se usa el prototipo cuando no hay selector
  // módulos que se ven en el menú pero muestran "Módulo no incluido en el prototipo"
  modulosNoIncluidos: ["habitaciones", "huespedes", "reportes", "configuracion"],
};
const incluido = (modulo) => !PROTOTIPO.modulosNoIncluidos.includes(modulo);

const MODULOS = [
  { id: "inicio", texto: "Inicio", icono: "house", roles: ["Administrador", "Recepcionista"] },
  { seccion: "Módulos" },
  { id: "reservas", texto: "Reservas", icono: "calendar2-week", roles: ["Administrador", "Recepcionista"] },
  { id: "checkin", texto: "Check-in", icono: "box-arrow-in-right", roles: ["Administrador", "Recepcionista"] },
  { id: "checkout", texto: "Check-out", icono: "box-arrow-right", roles: ["Administrador", "Recepcionista"] },
  { id: "ventas", texto: "Ventas", icono: "bag", roles: ["Administrador", "Recepcionista"] },
  { id: "habitaciones", texto: "Habitaciones", icono: "door-open", roles: ["Administrador", "Recepcionista"] },
  { id: "huespedes", texto: "Huéspedes", icono: "people", roles: ["Administrador", "Recepcionista"] },
  { id: "reportes", texto: "Reportes", icono: "bar-chart-line", roles: ["Administrador"] },
  { id: "configuracion", texto: "Configuración", icono: "gear", roles: ["Administrador"] },
];

/* cada vista recibe los parámetros de la ruta; "volver" indica la pantalla
   desde la que se llegó (por ejemplo, el inicio), a la que se regresa */
const RUTAS = [
  [/^\/inicio$/, "inicio", () => V.inicio()],
  [/^\/reservas$/, "reservas", () => V.reservas()],
  [/^\/reservas\/nueva$/, "reservas", (m, p) => V.reservaNueva(p)],
  [/^\/reservas\/(\w+)$/, "reservas", (m, p) => V.reservaDetalle(m[1], p)],
  [/^\/reservas\/(\w+)\/modificar$/, "reservas", (m, p) => V.reservaModificar(m[1], p)],
  [/^\/checkin$/, "checkin", () => V.checkin()],
  [/^\/checkin\/(\w+)$/, "checkin", (m, p) => V.checkinReserva(m[1], p)],
  [/^\/checkout$/, "checkout", () => V.checkout()],
  [/^\/checkout\/(\w+)$/, "checkout", (m, p) => V.checkoutEstadia(m[1], p)],
  [/^\/ventas$/, "ventas", (m, p) => V.ventas(p)],
  [/^\/ventas\/nueva$/, "ventas", () => V.ventaNueva()],
  [/^\/ventas\/(\w+)$/, "ventas", (m) => V.ventaDetalle(m[1])],
  [/^\/habitaciones$/, "habitaciones", (m, p) => V.habitaciones(p)],
  [/^\/huespedes$/, "huespedes", () => V.huespedes()],
  [/^\/huespedes\/(\w+)$/, "huespedes", (m) => V.huespedHistorial(m[1])],
  [/^\/productos$/, "ventas", () => ir("/ventas?tab=productos")],
  [/^\/reportes$/, "reportes", () => V.reportes()],
  [/^\/configuracion$/, "configuracion", () => V.configuracion()],
];

const USUARIO_DEMO = { Administrador: "Castillo, Roberto", Recepcionista: "Rojas, Diego Andrés" };

const App = {
  rol: () => Store.estado.rol,
  permitido: (modulo) => (MODULOS.find((m) => m.id === modulo) || { roles: [] }).roles.includes(App.rol()),

  iniciar() {
    Store.cargar();
    if (PROTOTIPO.selectorDeRol) $all("#switch-rol button").forEach((b) => (b.onclick = () => App.cambiarRol(b.dataset.rol)));
    else { $("#demo").remove(); Store.estado.rol = PROTOTIPO.rol; }
    // cualquier enlace a un módulo no incluido avisa en lugar de navegar
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#/"]');
      if (a && !incluido(a.getAttribute("href").slice(2).split(/[/?]/)[0])) { e.preventDefault(); App.cerrarMenu(); moduloNoIncluido(); }
    }, true);
    $("#lnk-salir").onclick = (e) => { e.preventDefault(); noIncluido(); };
    $("#lnk-reiniciar").onclick = async (e) => {
      e.preventDefault();
      App.cerrarMenu();
      if (await confirmar("Reiniciar datos de ejemplo", "Se borrarán las reservas, ventas y demás datos cargados durante la prueba, y se volverá al estado inicial.", { boton: "Reiniciar", clase: "btn-danger" })) {
        Store.reiniciar(); toast("Se restauraron los datos de ejemplo."); App.navegar();
      }
    };
    $("#btn-menu").onclick = () => $("#sidebar").classList.toggle("abierta");
    $("#fondo-menu").onclick = () => App.cerrarMenu();
    $("#nav").onclick = (e) => { if (e.target.closest("a")) App.cerrarMenu(); };
    window.addEventListener("hashchange", () => App.navegar());
    App.pintarUsuario();
    if (!location.hash) location.hash = "#/inicio"; else App.navegar();
  },

  cerrarMenu() { $("#sidebar").classList.remove("abierta"); },

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
      : `<a href="#/${m.id}" class="${m.id === actual ? "activo" : ""} ${incluido(m.id) ? "" : "no-incluido"}"><i class="bi bi-${m.icono}"></i>${m.texto}</a>`).join("");
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
    App.cerrarMenu();
    $("#titulo-pagina").innerHTML = "";
    for (const [re, modulo, fn] of RUTAS) {
      const m = re.exec(ruta || "/inicio");
      if (m) {
        App.pintarUsuario();
        if (!incluido(modulo)) return V.moduloNoIncluido();
        if (!App.permitido(modulo)) return V.sinPermiso();
        window.scrollTo(0, 0);
        try { fn(m, params); } catch (err) { console.error(err); vista().innerHTML = `<div class="alert alert-danger">Ocurrió un error inesperado en el prototipo: ${esc(err.message)}</div>`; }
        return;
      }
    }
    V.noEncontrado();
  },

  enlazarNoIncluidos() {
    $all("[data-no]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); noIncluido(); }));
  },

  // las integraciones simuladas se informan en los mensajes de cada operación
  actualizarEventos() {},
};

document.addEventListener("DOMContentLoaded", () => App.iniciar());
