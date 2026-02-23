import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIMMPlxITTKniHB-XCjt0OMHnV_j9MIJs",
    authDomain: "hard-web-3bab8.firebaseapp.com",
    projectId: "hard-web-3bab8",
    storageBucket: "hard-web-3bab8.firebasestorage.app",
    messagingSenderId: "165904646260",
    appId: "1:165904646260:web:88788e2b51ad3ad4af1121"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const API_KEY_IMGBB = "53b1440dc07ac33983ca315f13a661e9";

// Estados globales
let editId = null;
let cropper = null;
let croppedBlob = null;

// Referencias constantes
const adminForm = document.getElementById('admin-form');
const modalContainer = document.getElementById('modal-container');
const tbody = document.getElementById('admin-tbody');

// --- SEGURIDAD: LOGIN ---
document.getElementById('btn-login-submit').addEventListener('click', () => {
    const pass = document.getElementById('admin-password-input').value;
    if (pass === "alanmiguel2020") {
        sessionStorage.setItem('admin_auth', 'true');
        location.reload();
    } else { alert("Clave incorrecta."); }
});

if (sessionStorage.getItem('admin_auth') === 'true') {
    document.getElementById('admin-login-overlay').style.display = 'none';
    document.getElementById('admin-protected-content').style.display = 'block';
}

// --- LÓGICA DE INTERFAZ (STOCK) ---
// Esta función asegura que el cuadrito se vea o se oculte correctamente
const syncStockUI = () => {
    const type = document.getElementById('p-stock-type').value;
    const valInput = document.getElementById('p-stock-value');
    const isInf = type === "Infinito";
    
    valInput.style.visibility = isInf ? "hidden" : "visible";
    valInput.required = !isInf;
};

// --- MANEJO DE MODAL ---
const cerrarModal = () => {
    modalContainer.style.display = 'none';
    adminForm.reset();
    editId = null;
    croppedBlob = null;
};

document.getElementById('btn-open-modal').addEventListener('click', () => {
    editId = null;
    adminForm.reset();
    
    // Forzamos la vista correcta al abrir para "Nuevo"
    syncStockUI(); 
    
    document.getElementById('modal-title').innerText = "Nuevo Producto";
    document.getElementById('img-status').innerText = "La imagen es obligatoria.";
    modalContainer.style.display = 'flex';
});

document.getElementById('btn-close-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancel').addEventListener('click', cerrarModal);

// Escuchador para cambios manuales en el selector de stock
document.getElementById('p-stock-type').addEventListener('change', syncStockUI);


// --- LISTADO Y ACCIONES (DELEGACIÓN) ---
onSnapshot(collection(db, "productos"), (snap) => {
    tbody.innerHTML = "";
    document.getElementById('total-products').innerText = `${snap.size} productos`;
    snap.forEach(d => {
        const p = d.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="table-prod-info"><img src="${p.imagen}" class="thumb-admin"><strong>${p.nombre}</strong></div></td>
            <td><span class="stock-tag">${p.stock}</span></td>
            <td>$ ${parseFloat(p.precio).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td style="text-align: right;">
                <button class="btn-edit-item" data-id="${d.id}" data-nombre="${p.nombre}" data-precio="${p.precio}" data-stock="${p.stock}" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                <button class="btn-del" data-id="${d.id}" style="margin-left:10px; background:none; border:none; cursor:pointer;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

tbody.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-item');
    const btnDel = e.target.closest('.btn-del');

    if (btnEdit) {
        const d = btnEdit.dataset;
        editId = d.id;
        document.getElementById('p-name').value = d.nombre;
        document.getElementById('p-price').value = d.precio;
        
        // Verificamos si es infinito para setear el selector
        const isInf = d.stock === "∞";
        document.getElementById('p-stock-type').value = isInf ? "Infinito" : "Manual";
        document.getElementById('p-stock-value').value = isInf ? "" : d.stock;
        
        // Sincronizamos la UI para que aparezca/desaparezca el input
        syncStockUI();

        document.getElementById('modal-title').innerText = "Editar Producto";
        document.getElementById('img-status').innerText = "Opcional (deja vacío para mantener la actual).";
        modalContainer.style.display = 'flex';
    }

    if (btnDel) {
        if (confirm("¿Borrar repuesto?")) deleteDoc(doc(db, "productos", btnDel.dataset.id));
    }
});

// --- LÓGICA CROPPER ---
document.getElementById('p-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('cropper-container').style.display = 'flex';
            const img = document.getElementById('image-to-crop');
            img.src = ev.target.result;
            if (cropper) cropper.destroy();
            cropper = new Cropper(img, { aspectRatio: 1, viewMode: 1 });
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-crop-done').addEventListener('click', () => {
    cropper.getCroppedCanvas({ width: 600, height: 600 }).toBlob((blob) => {
        croppedBlob = blob;
        document.getElementById('cropper-container').style.display = 'none';
        alert("Imagen procesada.");
    }, 'image/jpeg');
});

document.getElementById('btn-crop-cancel').addEventListener('click', () => {
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('p-image').value = "";
});

// --- GUARDAR / ACTUALIZAR ---
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        let imageUrl = null;
        if (croppedBlob) {
            const fd = new FormData();
            fd.append("image", croppedBlob, "p.jpg");
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY_IMGBB}`, { method: "POST", body: fd });
            const json = await res.json();
            imageUrl = json.data.url;
        }

        const type = document.getElementById('p-stock-type').value;
        const val = document.getElementById('p-stock-value').value;
        const data = {
            nombre: document.getElementById('p-name').value,
            precio: parseFloat(document.getElementById('p-price').value),
            stock: type === "Infinito" ? "∞" : val
        };

        if (imageUrl) data.imagen = imageUrl;

        if (editId) {
            await updateDoc(doc(db, "productos", editId), data);
            alert("Actualizado!");
        } else {
            if (!imageUrl) throw new Error("Falta la imagen");
            await addDoc(collection(db, "productos"), data);
            alert("Guardado!");
        }
        cerrarModal();
    } catch (err) { alert(err.message); }
    finally { btn.innerText = "Guardar Producto"; btn.disabled = false; }
});

// --- BUSCADOR ---
document.getElementById('admin-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
});


// --- MENÚ CONFIGURACIÓN ---
window.toggleConfigMenu = () => {
    const menu = document.getElementById('config-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('config-menu');
    const btn = document.querySelector('button[onclick="toggleConfigMenu()"]');
    if (menu && !menu.contains(e.target) && e.target !== btn) {
        menu.style.display = 'none';
    }
});

// --- ACTUALIZACIÓN MASIVA ---
window.actualizarPreciosMasivo = async (accion) => {
    const inputPorcentaje = document.getElementById('porcentajeCambio');
    const porcentaje = parseFloat(inputPorcentaje.value);
    
    if (isNaN(porcentaje) || porcentaje <= 0) {
        alert("Ingresá un número mayor a 0.");
        return;
    }

    if (!confirm(`¿Confirmas ${accion === 'subir' ? 'AUMENTAR' : 'BAJAR'} los precios un ${porcentaje}%?`)) return;

    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const promesas = querySnapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            const precioViejo = parseFloat(data.precio);
            let nuevoPrecio = accion === 'subir' ? precioViejo * (1 + (porcentaje / 100)) : precioViejo * (1 - (porcentaje / 100));

            const docRef = doc(db, "productos", docSnapshot.id);
            return updateDoc(docRef, { precio: parseFloat(nuevoPrecio.toFixed(2)) });
        });

        await Promise.all(promesas);
        alert("Precios actualizados.");
        inputPorcentaje.value = "";
        window.toggleConfigMenu();
    } catch (error) {
        alert("Error al actualizar.");
        console.error(error);
    }
};




