// DishDeck API Client — calls real Express backend
// All pages use window.api.* (same interface as before)

const API_BASE = 'http://localhost:3000';

window.api = {
    // ── AUTH ──────────────────────────────────────────────────────────────────
    async login(username, email, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        return res.json();
    },

    async register(username, email, password) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        return res.json();
    },

    async logout() {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    },

    async me() {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        return res.json();
    },

    // ── FOOD ──────────────────────────────────────────────────────────────────
    async getFoodItems() {
        const res = await fetch(`${API_BASE}/api/food`, { credentials: 'include' });
        const data = await res.json();
        return data.items || [];
    },

    async addFoodItem(formData) {
        const res = await fetch(`${API_BASE}/api/food`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        return res.json();
    },

    async deleteFoodItem(id) {
        const res = await fetch(`${API_BASE}/api/food/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return res.json();
    },

    // ── ORDERS ────────────────────────────────────────────────────────────────
    async placeOrder(items, total, payment_method) {
        const res = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ items, total, payment_method })
        });
        return res.json();
    },

    async getOrders() {
        const res = await fetch(`${API_BASE}/api/orders`, { credentials: 'include' });
        return res.json();
    },

    // ── TABLE BOOKINGS ────────────────────────────────────────────────────────
    async bookTable(data) {
        const res = await fetch(`${API_BASE}/api/bookings/table`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getTableBookings() {
        const res = await fetch(`${API_BASE}/api/bookings/table`, { credentials: 'include' });
        return res.json();
    },

    // ── ROOM BOOKINGS ─────────────────────────────────────────────────────────
    async bookRoom(data) {
        const res = await fetch(`${API_BASE}/api/bookings/room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getRoomBookings() {
        const res = await fetch(`${API_BASE}/api/bookings/room`, { credentials: 'include' });
        return res.json();
    }
};
