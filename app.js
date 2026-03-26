import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const WHATSAPP = "5493764326681";

// Carrito con persistencia (localStorage)
let cart = JSON.parse(localStorage.getItem('hard_cart_v2')) || [];

// --- 1. MOTOR DE BÚSQUEDA INTELIGENTE ---
// Busca por nombre visible y por barcode oculto
document.getElementById('main-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.p-card');
    cards.forEach(card => {
        const name = card.querySelector('h3').innerText.toLowerCase();
        const barcode = card.dataset.barcode ? card.dataset.barcode.toLowerCase() : "";
        
        // Si el término coincide con el nombre O el código, se muestra
        if (name.includes(term) || barcode.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// --- 2. CARGA DE PRODUCTOS DESDE FIREBASE ---
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    const snap = await getDocs(collection(db, "productos"));
    grid.innerHTML = "";
    
    snap.forEach(doc => {
        const p = doc.data();
        // Guardamos el barcode en 'data-barcode' para que el buscador lo encuentre, pero no se muestra al usuario
        grid.innerHTML += `
            <div class="p-card" data-barcode="${p.barcode || ''}">
                <img src="${p.imagen}" alt="${p.nombre}">
                <div class="p-info">
                    <h3>${p.nombre}</h3>
                    <p class="stock">Disponibilidad: ${p.stock}</p>
                    <p class="price">$ ${p.precio.toLocaleString('es-AR')}</p>
                    <button class="btn-buy" onclick="addToCart('${doc.id}', '${p.nombre}', ${p.precio}, '${p.imagen}')">
                        Agregar al carrito 👜
                    </button>
                </div>
            </div>
        `;
    });
    updateCartUI(); 
}

// --- 3. LÓGICA DEL CARRITO (SIDEBAR) ---
window.addToCart = (id, name, price, img) => {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({id, name, price, img, qty: 1});
    }
    saveAndRefresh();
    showToast(name, price, img); // Notificación tipo Toast
};

window.changeQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) return removeFromCart(id);
        saveAndRefresh();
    }
};

window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    saveAndRefresh();
};

function saveAndRefresh() {
    localStorage.setItem('hard_cart_v2', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.innerText = totalCount;
    renderSidebar();
}

// --- 4. RENDERIZADO DEL SIDEBAR ---
window.toggleCartModal = () => {
    const modal = document.getElementById('cart-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
};

function renderSidebar() {
    const list = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total-price');
    let total = 0;
    
    if (!list) return; // Seguridad por si el elemento no existe en el DOM
    list.innerHTML = cart.length === 0 ? '<p class="empty-msg">Tu carrito está vacío</p>' : '';

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        list.innerHTML += `
            <div class="side-cart-item">
                <img src="${item.img}" class="side-item-img">
                <div class="side-item-details">
                    <h4>${item.name}</h4>
                    <button onclick="removeFromCart('${item.id}')" class="btn-delete-item">Eliminar</button>
                    <div class="qty-selector">
                        <button onclick="changeQty('${item.id}', -1)" class="qty-btn">-</button>
                        <input type="text" class="qty-input" value="${item.qty}" readonly>
                        <button onclick="changeQty('${item.id}', 1)" class="qty-btn">+</button>
                    </div>
                </div>
                <div class="side-item-price">$ ${itemTotal.toLocaleString('es-AR')}</div>
            </div>
        `;
    });

    if (subtotalEl) subtotalEl.innerText = `$ ${total.toLocaleString('es-AR')}`;
    if (totalEl) totalEl.innerText = `$ ${total.toLocaleString('es-AR')}`;
}

// --- 5. NOTIFICACIÓN TOAST (CORREGIDA PARA ABRIR EL CARRITO) ---
function showToast(name, price, img) {
    const toast = document.getElementById('toast-notification');
    const body = document.getElementById('toast-body');
    if (!toast || !body) return;

    // Inyectamos el contenido
    body.innerHTML = `
        <img src="${img}" class="toast-img">
        <div class="toast-info">
            <h4>${name}</h4>
            <p>1 x $ ${price.toLocaleString('es-AR')}</p>
            <span class="toast-success">✓ Agregado al carrito</span>
        </div>
    `;

    // CAMBIO CLAVE: Cambiamos showSection por toggleCartModal
    toast.style.cursor = 'pointer';
    toast.onclick = () => {
        window.toggleCartModal(); // Abre el sidebar del carrito
        window.hideToast();       // Oculta la notificación
    };

    toast.style.display = 'block';
    
    // Temporizador para que desaparezca solo
    setTimeout(window.hideToast, 3500); 
}

window.hideToast = () => {
    const toast = document.getElementById('toast-notification');
    if (toast) toast.style.display = 'none';
};

// --- 6. ENVÍO A WHATSAPP ---
document.getElementById('btn-whatsapp').onclick = () => {
    if (cart.length === 0) return alert("El carrito está vacío.");
    
    let message = "Hola HARD! Quiero realizar este pedido:\n¿Cuál es el costo de envío?\n";
    let grandTotal = 0;
    
    cart.forEach(i => {
        const sub = i.price * i.qty;
        message += `• (${i.qty}) ${i.name} - $${sub.toLocaleString('es-AR')}\n`;
        grandTotal += sub;
    });
    
    message += `\n*Total: $${grandTotal.toLocaleString('es-AR')}*`;
    
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`);

    // Limpieza tras enviar pedido
    cart = [];
    saveAndRefresh();
    toggleCartModal();
};

// --- MODALES DE INFO Y CONTACTO ---
window.toggleInfoModal = () => {
    const modal = document.getElementById('info-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
};

window.toggleContactModal = () => {
    const modal = document.getElementById('contact-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
};

// Carga inicial
loadProducts();
