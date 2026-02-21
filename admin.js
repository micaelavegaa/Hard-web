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

const CLAVE_MAESTRA = "alanmiguel2020";

// --- VARIABLES GLOBALES PARA RECORTE ---
let cropper;
let croppedBlob = null; 

// --- SEGURIDAD: CONTROL DE ACCESO ---
window.verificarAcceso = () => {
    const pass = document.getElementById('admin-password-input').value;
    if (pass === CLAVE_MAESTRA) {
        sessionStorage.setItem('admin_auth', 'true');
        document.getElementById('admin-login-overlay').style.display = 'none';
        document.getElementById('admin-protected-content').style.display = 'block';
    } else {
        alert("Clave incorrecta.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
        document.getElementById('admin-login-overlay').style.display = 'none';
        document.getElementById('admin-protected-content').style.display = 'block';
    }
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

// --- BUSCADOR ---
document.getElementById('admin-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#admin-tbody tr');
    rows.forEach(row => {
        const name = row.querySelector('td').innerText.toLowerCase();
        row.style.display = name.includes(term) ? '' : 'none';
    });
});

// --- LÓGICA STOCK ---
window.toggleStockInput = () => {
    const type = document.getElementById('p-stock-type').value;
    const input = document.getElementById('p-stock-value');
    if (type === "Infinito") {
        input.style.visibility = "hidden";
        input.required = false;
        input.value = "";
    } else {
        input.style.visibility = "visible";
        input.required = true;
    }
};

// --- MODAL PRINCIPAL ---
document.getElementById('btn-open-modal').onclick = () => document.getElementById('modal-container').style.display = 'flex';
const cerrar = () => {
    document.getElementById('modal-container').style.display = 'none';
    croppedBlob = null; // Limpiamos la imagen al cerrar
};
document.getElementById('btn-close-modal').onclick = cerrar;
document.getElementById('btn-cancel').onclick = cerrar;

// --- LÓGICA DE RECORTE (CROPPER) ---
document.getElementById('p-image').addEventListener('change', function(e) {
    if (e.target.files && e.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('cropper-container').style.display = 'flex';
            const img = document.getElementById('image-to-crop');
            img.src = event.target.result;

            if (cropper) cropper.destroy();
            cropper = new Cropper(img, {
                aspectRatio: 1, // Cuadrado perfecto
                viewMode: 1,
                autoCropArea: 1
            });
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

window.cancelarRecorte = () => {
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('p-image').value = "";
};

window.finalizarRecorte = () => {
    const canvas = cropper.getCroppedCanvas({ width: 600, height: 600 });
    canvas.toBlob((blob) => {
        croppedBlob = blob;
        document.getElementById('cropper-container').style.display = 'none';
        alert("¡Imagen lista!");
    }, 'image/jpeg');
};

// --- LISTADO REAL-TIME ---
onSnapshot(collection(db, "productos"), (snap) => {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = "";
    document.getElementById('total-products').innerText = `${snap.size} productos`;
    snap.forEach(d => {
        const p = d.data();
        tbody.innerHTML += `
            <tr>
                <td><div style="display:flex;align-items:center;gap:10px;"><img src="${p.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"><strong>${p.nombre}</strong></div></td>
                <td class="text-center"><span style="color:#2E7D32;font-weight:600;">${p.stock}</span></td>
                <td>$ ${parseFloat(p.precio).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td class="text-right"><button onclick="borrar('${d.id}')" class="btn-del">🗑️</button></td>
            </tr>`;
    });
});

// --- GUARDAR PRODUCTO (CON IMAGEN RECORTADA) ---
document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!croppedBlob) {
        alert("Miki, por favor selecciona y recorta la imagen antes de guardar.");
        return;
    }

    const btn = document.getElementById('btn-save');
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        // Usamos el BLOB recortado en lugar del archivo original
        formData.append("image", croppedBlob, "producto.jpg");
        
        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY_IMGBB}`, { method: "POST", body: formData });
        const resData = await resp.json();
        
        const type = document.getElementById('p-stock-type').value;
        const val = document.getElementById('p-stock-value').value;

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('p-name').value,
            precio: parseFloat(document.getElementById('p-price').value),
            stock: type === "Infinito" ? "∞" : val,
            imagen: resData.data.url,
            fecha: new Date()
        });

        alert("¡Guardado exitoso!");
        cerrar();
        e.target.reset();
        croppedBlob = null; 
    } catch (err) { 
        alert("Error al subir."); 
        console.error(err);
    } finally { 
        btn.innerText = "Guardar Producto"; 
        btn.disabled = false; 
    }
});

// --- BORRAR ---
window.borrar = (id) => { if(confirm("¿Eliminar?")) deleteDoc(doc(db, "productos", id)); };

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
