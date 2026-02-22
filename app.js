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

// --- 1. MOTOR DE BÚSQUEDA ---
document.getElementById('main-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.p-card');
    cards.forEach(card => {
        const name = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = name.includes(term) ? 'block' : 'none';
    });
});

// --- 2. CARGA DE PRODUCTOS DESDE FIREBASE ---
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    const snap = await getDocs(collection(db, "productos"));
    grid.innerHTML = "";
    
    snap.forEach(doc => {
        const p = doc.data();
        grid.innerHTML += `
            <div class="p-card">
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
    document.getElementById('cart-count').innerText = totalCount;
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

    subtotalEl.innerText = `$ ${total.toLocaleString('es-AR')}`;
    totalEl.innerText = `$ ${total.toLocaleString('es-AR')}`;
}

// --- 5. NOTIFICACIÓN TOAST ---
function showToast(name, price, img) {
    const toast = document.getElementById('toast-notification');
    const body = document.getElementById('toast-body');
    body.innerHTML = `
        <img src="${img}" class="toast-img">
        <div class="toast-info">
            <h4>${name}</h4>
            <p>1 x $ ${price.toLocaleString('es-AR')}</p>
            <span class="toast-success">✓ Agregado al carrito</span>
        </div>
    `;
    toast.style.display = 'block';
    setTimeout(hideToast, 3500); 
}

window.hideToast = () => {
    document.getElementById('toast-notification').style.display = 'none';
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
};

loadProducts();
//información
window.toggleInfoModal = () => {
    const modal = document.getElementById('info-modal');
    // Si está cerrado lo abre, si está abierto lo cierra
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
};
//contacto
window.toggleContactModal = () => {
    const modal = document.getElementById('contact-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'flex' : 'none';
};

