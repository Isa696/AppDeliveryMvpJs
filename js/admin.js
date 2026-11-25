import "./index.js";
import { cargarMenu, guardarMenu, escaparHTML } from "./menuData.js";
import { supabase } from "../backend/supabaseClient.js";
import { getMenuData } from "./menuData.js";



let menu = [];

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const productForm = document.getElementById("product-form");
const categoryForm = document.getElementById("category-form");
const productCategory = document.getElementById("product-category");
const productList = document.getElementById("product-list");
const categoryList = document.getElementById("category-list");

async function mostrarPanelAdmin(estaAutenticado) {
  loginPanel.hidden = estaAutenticado;
  adminPanel.hidden = !estaAutenticado;
  if (estaAutenticado) {
    try {
      menu = await getMenuData();
    } catch (error) {
      console.error("Error al cargar menú desde Supabase:", error);
      menu = cargarMenu();
    }
    dibujarPanel();
  }
}

loginForm.addEventListener("submit", async evento => {
  evento.preventDefault();
  loginMessage.textContent = "";

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const boton = loginForm.querySelector('button[type="submit"]');

  boton.disabled = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginMessage.textContent = "Email o contraseña incorrectos.";
      return;
    }

    loginForm.reset();
  } catch (error) {
    console.error("Error de inicio de sesión:", error);
    loginMessage.textContent = "No se pudo conectar. Intentá nuevamente.";
  } finally {
    boton.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    alert("No se pudo cerrar la sesión. Intentá nuevamente.");
  }
});

categoryForm.addEventListener("submit", async evento => {
  evento.preventDefault();
  const idCatActual = document.getElementById("category-id").value;
  const nombre = document.getElementById("category-name").value.trim();
  const subtitulo = document.getElementById("category-subtitle").value.trim();
  if (!nombre) return;

  try {
    if (idCatActual) {
      // ACTUALIZAR categoría existente en Supabase
      const { error } = await supabase
        .from("categories")
        .update({ categoria: nombre, subtitulo })
        .eq("idCatTable", Number(idCatActual));

      if (error) throw error;
      alert("¡Categoría actualizada con éxito en Supabase!");
    } else {
      // CREAR nueva categoría en Supabase
      const { error } = await supabase
        .from("categories")
        .insert([{ categoria: nombre, subtitulo }]);

      if (error) throw error;
      alert("¡Categoría creada con éxito en Supabase!");
    }

    
    limpiarFormularioCategoria();
    menu = await getMenuData();
    dibujarPanel();
  } catch (error) {
    console.error("Error al procesar categoría:", error.message);
    alert("No se pudo guardar la categoría en la base de datos.");
  }
});

// --- GUARDAR O ACTUALIZAR PRODUCTO ---
productForm.addEventListener("submit", async evento => {
  evento.preventDefault();
  const idActual = document.getElementById("product-id").value; // Si tiene valor, estamos editando
  const indiceCategoriaElegida = Number(productCategory.value);
  const categoriaSeleccionada = menu[indiceCategoriaElegida];
  
  if (!categoriaSeleccionada) {
    alert("Seleccioná una categoría válida.");
    return;
  }

  const nombre = document.getElementById("product-name").value.trim();
  const descripcion = document.getElementById("product-description").value.trim();
  const precio = Number(document.getElementById("product-price").value);
  const imagen = document.getElementById("product-image").value.trim() || "https://via.placeholder.com/50";

  if (!nombre || !Number.isFinite(precio) || precio < 0) {
    alert("Completá el nombre y un precio válido.");
    return;
  }

  try {
    if (idActual) {
      // 1. ACTUALIZAR producto existente en Supabase
      const { error } = await supabase
        .from("Menu")
        .update({
          idCat: categoriaSeleccionada.idCatTable,
          nombre: nombre,
          descripcion: descripcion,
          precio: precio,
          imagen: imagen
        })
        .eq("id", Number(idActual));

      if (error) throw error;
      alert("¡Producto actualizado con éxito en Supabase!");
    } else {
      // 2. CREAR nuevo producto en Supabase
      const { error } = await supabase
        .from("Menu")
        .insert([
          {
            idCat: categoriaSeleccionada.idCatTable, 
            nombre: nombre,
            descripcion: descripcion,
            precio: precio,
            imagen: imagen
          }
        ]);

      if (error) throw error;
      alert("¡Producto guardado con éxito en Supabase!");
    }
// Actualizar el producto si ya estaba agregado al carrito.
const carrito = JSON.parse(
  localStorage.getItem("carrito_olivia") || "{}"
);

if (idActual && carrito[idActual]) {
  carrito[idActual] = {
    ...carrito[idActual],
    nombre,
    descripcion,
    precio,
    imagen
  };

  localStorage.setItem("carrito_olivia", JSON.stringify(carrito));
  window.dispatchEvent(new Event("carritoActualizado"));
}
    limpiarFormularioProducto();
    menu = await getMenuData();
    dibujarPanel();
    guardarMenu(menu);
  } catch (error) {
    console.error("Error al guardar/actualizar producto:", error.message);
    alert("Hubo un error al procesar el producto en Supabase.");
  }
});

document.getElementById("cancel-edit-button").addEventListener("click", limpiarFormularioProducto);

function dibujarPanel() {
  dibujarSelectorCategorias();
  dibujarCategorias();
  dibujarProductos();
  
  // Guarda una copia actualizada en localStorage por si index.js la lee de ahí
  guardarMenu(menu); 
  // Le avisa a index.js que vuelva a dibujar la vista previa de "Menú actual"
  window.dispatchEvent(new Event("menuActualizado")); 
}

function dibujarSelectorCategorias() {
  const optionsHtml = menu.map((categoria, indice) =>
    `<option value="${indice}">${escaparHTML(categoria.categoria)}</option>`
  ).join("");

  productCategory.innerHTML = optionsHtml;
  
  const massCategorySelect = document.getElementById("mass-category");
  if (massCategorySelect) {
    massCategorySelect.innerHTML = optionsHtml;
  }
}

function dibujarCategorias() {
  categoryList.innerHTML = menu.map((categoria) => `
    <li>
      <span>${escaparHTML(categoria.categoria)}</span>
      <span class="category-actions">
        <button type="button" data-edit-category="${categoria.idCatTable}" class="small-button secondary-button">Editar</button>
        <button type="button" data-delete-category="${categoria.idCatTable}" class="small-button danger-button">Eliminar</button>
      </span>
    </li>
  `).join("") || "<li>Todavía no hay categorías.</li>";
}

// Escuchamos clics en Editar y Eliminar de las categorías
categoryList.addEventListener("click", async evento => {
  const botonEditar = evento.target.closest("[data-edit-category]");

  if (botonEditar) editarCategoria(Number(botonEditar.dataset.editCategory));
});

// Carga los datos de la categoría en el formulario para editarla
function editarCategoria(idCatTable) {
  const categoriaEncontrada = menu.find(c => c.idCatTable === idCatTable);
  if (!categoriaEncontrada) return;

  document.getElementById("category-id").value = categoriaEncontrada.idCatTable;
  document.getElementById("category-name").value = categoriaEncontrada.categoria;
  document.getElementById("category-subtitle").value =
  categoriaEncontrada.subtitulo ?? "";
  
  document.getElementById("category-submit-btn").textContent = "Actualizar categoría";
  document.getElementById("cancel-category-edit").hidden = false;
  document.getElementById("category-name").focus();
}

const cancelCategoryEditBtn = document.getElementById("cancel-category-edit");
if (cancelCategoryEditBtn) {
  cancelCategoryEditBtn.addEventListener("click", limpiarFormularioCategoria);
}

function limpiarFormularioCategoria() {
  categoryForm.reset();
  document.getElementById("category-id").value = "";
  document.getElementById("category-submit-btn").textContent = "Agregar categoría";
  document.getElementById("cancel-category-edit").hidden = true;
}

// Dibujamos los productos con los botones de Editar y Eliminar
function dibujarProductos() {
  const productos = menu.flatMap((categoria, indiceCategoria) =>
    categoria.platos.map(plato => ({ ...plato, nombreCategoria: categoria.categoria, indiceCategoria }))
  );

  productList.innerHTML = productos.map(plato => `
    <article class="managed-product">
      <div>
        <h4>${escaparHTML(plato.nombre)}</h4>
        <p>${escaparHTML(plato.nombreCategoria)} · $${Number(plato.precio).toLocaleString("es-AR")}</p>
        <p>${escaparHTML(plato.descripcion)}</p>
      </div>
      <div class="product-actions">
        <button type="button" class="admin-button secondary-button" data-edit-product="${plato.id}">Editar</button>
        <button type="button" class="admin-button danger-button" data-delete-product="${plato.id}">Eliminar</button>
      </div>
    </article>
  `).join("") || "<p>Todavía no hay productos en el menú.</p>";
}

// Escuchamos clics en Editar y Eliminar de los productos
productList.addEventListener("click", async evento => {
  const botonEditar = evento.target.closest("[data-edit-product]");
  const botonEliminar = evento.target.closest("[data-delete-product]");

  if (botonEditar) editarProducto(Number(botonEditar.dataset.editProduct));
  if (botonEliminar) eliminarProducto(Number(botonEliminar.dataset.deleteProduct));
});

// Función para cargar los datos del producto en el formulario y activar el modo edición
function editarProducto(id) {
  let platoEncontrado = null;
  let idCatActual = null;

  for (const categoria of menu) {
    const plato = categoria.platos.find(p => p.id === id);
    if (plato) {
      platoEncontrado = plato;
      idCatActual = categoria.idCatTable;
      break;
    }
  }

  if (!platoEncontrado) return;

  // Llenamos los inputs con la información actual del producto
  document.getElementById("product-id").value = platoEncontrado.id;
  
  const indiceCategoria = menu.findIndex(c => c.idCatTable === idCatActual);
  if (indiceCategoria !== -1) {
    productCategory.value = indiceCategoria;
  }

  document.getElementById("product-name").value = platoEncontrado.nombre;
  document.getElementById("product-description").value = platoEncontrado.descripcion;
  document.getElementById("product-price").value = platoEncontrado.precio;
  document.getElementById("product-image").value = platoEncontrado.imagen.startsWith("https://via.placeholder.com") ? "" : platoEncontrado.imagen;
  
  // Cambiamos el título y mostramos el botón de cancelar
  document.getElementById("product-form-title").textContent = "Editar producto";
  document.getElementById("cancel-edit-button").hidden = false;
  document.getElementById("product-name").focus();
}

async function eliminarProducto(id) {
  if (!confirm("¿Querés eliminar este producto de la base de datos?")) return;

  try {
    const { error } = await supabase.from("Menu").delete().eq("id", id);
    if (error) throw error;

    const carrito = JSON.parse(
      localStorage.getItem("carrito_olivia") || "{}"
    );

    delete carrito[id];

    localStorage.setItem("carrito_olivia", JSON.stringify(carrito));
    window.dispatchEvent(new Event("carritoActualizado"));

    menu = await getMenuData();
    dibujarPanel();
  } catch (error) {
    console.error("Error al eliminar producto:", error.message);
    alert("No se pudo eliminar el producto.");
  }
}

categoryList.addEventListener("click", async evento => {
  const botonEliminar = evento.target.closest("[data-delete-category]");
  if (!botonEliminar) return;

  const idCatTable = Number(botonEliminar.dataset.deleteCategory);
  const categoriaEncontrada = menu.find(c => c.idCatTable === idCatTable);

  if (categoriaEncontrada && categoriaEncontrada.platos.length > 0) {
    alert("Primero eliminá los productos de esta categoría.");
    return;
  }

  if (!confirm("¿Querés eliminar esta categoría?")) return;

  try {
    const { error } = await supabase.from("categories").delete().eq("idCatTable", idCatTable);
    if (error) throw error;

    menu = await getMenuData();
    dibujarPanel();
  } catch (error) {
    console.error("Error al eliminar categoría:", error.message);
    alert("No se pudo eliminar la categoría.");
  }
});

function limpiarFormularioProducto() {
  productForm.reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-form-title").textContent = "Agregar producto";
  document.getElementById("cancel-edit-button").hidden = true;
}

supabase.auth.onAuthStateChange((_evento, session) => {
  setTimeout(() => {
    mostrarPanelAdmin(Boolean(session));
  }, 0);
});

// --- ACTUALIZACIÓN MASIVA DE PRECIOS POR CATEGORÍA ---
const massPriceForm = document.getElementById("mass-price-form");
const massCategorySelect = document.getElementById("mass-category");

if (massPriceForm) {
  massPriceForm.addEventListener("submit", async evento => {
    evento.preventDefault();
    const indiceCat = Number(massCategorySelect.value);
    const categoriaSeleccionada = menu[indiceCat];
    const nuevoPrecio = Number(document.getElementById("mass-price").value);

    if (!categoriaSeleccionada || !Number.isFinite(nuevoPrecio) || nuevoPrecio < 0) {
      alert("Seleccioná una categoría y un precio válido.");
      return;
    }

    if (!confirm(`¿Estás seguro de cambiar el precio de TODOS los productos de "${categoriaSeleccionada.categoria}" a $${nuevoPrecio.toLocaleString("es-AR")}?`)) {
      return;
    }

    try {
      // Actualiza masivamente en Supabase todos los registros que coincidan con idCat
      const { error } = await supabase
        .from("Menu")
        .update({ precio: nuevoPrecio })
        .eq("idCat", categoriaSeleccionada.idCatTable);

      if (error) throw error;

      const carrito = JSON.parse(
        localStorage.getItem("carrito_olivia") || "{}"
      );

      for (const producto of categoriaSeleccionada.platos) {
        if (carrito[producto.id]) {
          carrito[producto.id].precio = nuevoPrecio;
        }
      }

      localStorage.setItem("carrito_olivia", JSON.stringify(carrito));
      window.dispatchEvent(new Event("carritoActualizado"));
      
      alert(`¡Se actualizaron todos los precios de "${categoriaSeleccionada.categoria}" con éxito!`);
      massPriceForm.reset();

      // Recargamos el menú desde Supabase para reflejar los cambios
      menu = await getMenuData();
      dibujarPanel();
      guardarMenu(menu);
    } catch (error) {
      console.error("Error al actualizar precios por categoría:", error.message);
      alert("Hubo un error al actualizar los precios masivamente.");
    }
  });
}