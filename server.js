require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Multer (Image Upload) ─────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── DB Pool ──────────────────────────────────────────────────────────────────
let db;
async function initDB() {
    // Create DB if not exists
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conn.end();

    db = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10
    });

    // Create tables
    await db.query("DROP TABLE IF EXISTS users");
    await db.query("DROP TABLE IF EXISTS table_bookings");
    await db.query("DROP TABLE IF EXISTS room_bookings");

    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','user') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    try {
        await db.query("ALTER TABLE users ADD COLUMN profile_pic VARCHAR(255) DEFAULT 'images/default_avatar.svg'");
        await db.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(100) DEFAULT ''");
        await db.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50) DEFAULT ''");
        await db.query("ALTER TABLE users ADD COLUMN address VARCHAR(500) DEFAULT ''");
    } catch(e) {} // Ignore if existing

    await db.query(`
        CREATE TABLE IF NOT EXISTS food_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category ENUM('starters','main','desserts') NOT NULL,
            price INT NOT NULL,
            image VARCHAR(600) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            username VARCHAR(100),
            items JSON NOT NULL,
            total INT NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'card',
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS table_bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            username VARCHAR(100),
            guests INT NOT NULL,
            booking_date DATE NOT NULL,
            booking_time TIME NOT NULL,
            special_req VARCHAR(500),
            payment_method VARCHAR(50) DEFAULT 'card',
            status VARCHAR(50) DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS room_bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            username VARCHAR(100),
            event_type VARCHAR(100) NOT NULL,
            room_name VARCHAR(100),
            guests INT NOT NULL,
            booking_date DATE NOT NULL,
            booking_time TIME NOT NULL,
            special_req VARCHAR(500),
            payment_method VARCHAR(50) DEFAULT 'card',
            status VARCHAR(50) DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed admin user
    const [admins] = await db.query("SELECT id FROM users WHERE username='RaghavaP'");
    if (admins.length === 0) {
        const hashed = await bcrypt.hash('RaghavaP', 10);
        await db.query("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')", ['RaghavaP', 'raghava.p@gmail.com', hashed]);
        console.log('✅ Admin user provisioned.');
    }

    // Seed demo food items
    const [foods] = await db.query("SELECT id FROM food_items LIMIT 1");
    if (foods.length === 0) {
        const demoItems = [
            ['Garlic Bread', 'starters', 120, 'images/garlicbread.jpg'],
            ['Tomato Soup', 'starters', 150, 'images/soup.jpg'],
            ['Paneer Tikka', 'starters', 220, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=60'],
            ['Cheese Pizza', 'main', 350, 'images/pizza.jpg'],
            ['White Sauce Pasta', 'main', 300, 'images/pasta.jpg'],
            ['Grilled Salmon', 'main', 550, 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=500&q=60'],
            ['Chocolate Ice Cream', 'desserts', 180, 'images/icecream.jpg'],
            ['Red Velvet Cake', 'desserts', 250, 'images/cake.jpg'],
        ];
        for (const [name, category, price, image] of demoItems) {
            await db.query("INSERT INTO food_items (name, category, price, image) VALUES (?,?,?,?)", [name, category, price, image]);
        }
        console.log('✅ Demo food items seeded.');
    }

    console.log('✅ Database initialized.');
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dishdeck_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    next();
};
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.json({ success: false, message: 'Fill all fields' });

        const [existing] = await db.query('SELECT id FROM users WHERE username=? OR email=?', [username, email]);
        if (existing.length > 0) return res.json({ success: false, message: 'username is incorrect or password is incorrect' });

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.query("INSERT INTO users (username, email, password, role) VALUES (?,?,?,'user')", [username, email, hashed]);
        const user = { id: result.insertId, username, email, role: 'user', profile_pic: 'images/default_avatar.svg', full_name: '', phone: '', address: '' };
        req.session.user = user;
        res.json({ success: true, user });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE username=? AND email=?', [username, email]);
        if (rows.length === 0) return res.json({ success: false, message: 'username is incorrect or password is incorrect' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: 'username is incorrect or password is incorrect' });

        const sessionUser = { id: user.id, username: user.username, email: user.email, role: user.role, profile_pic: user.profile_pic, full_name: user.full_name, phone: user.phone, address: user.address };
        req.session.user = sessionUser;
        res.json({ success: true, user: sessionUser });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', async (req, res) => {
    if (req.session.user) {
        try {
            const [rows] = await db.query('SELECT id, username, email, role, profile_pic, full_name, phone, address FROM users WHERE id=?', [req.session.user.id]);
            if (rows.length > 0) {
                req.session.user = rows[0];
                return res.json({ success: true, user: rows[0] });
            }
        } catch (e) {
            console.error(e);
        }
    }
    res.json({ success: false });
});

// ─── USER PROFILE ROUTES ──────────────────────────────────────────────────────
app.post('/api/user/profile', requireAuth, upload.single('profile_pic'), async (req, res) => {
    try {
        const { full_name, phone, address } = req.body;
        let updateQuery = 'UPDATE users SET full_name=?, phone=?, address=?';
        let queryParams = [full_name || '', phone || '', address || ''];

        if (req.file) {
            const imageUrl = '/uploads/' + req.file.filename;
            updateQuery += ', profile_pic=?';
            queryParams.push(imageUrl);
        }
        
        updateQuery += ' WHERE id=?';
        queryParams.push(req.session.user.id);
        
        await db.query(updateQuery, queryParams);
        const [rows] = await db.query('SELECT id, username, email, role, profile_pic, full_name, phone, address FROM users WHERE id=?', [req.session.user.id]);
        req.session.user = rows[0];
        res.json({ success: true, user: rows[0] });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.get('/api/user/orders', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.session.user.id]);
        res.json({ success: true, orders: rows });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

// ─── FOOD ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/food', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM food_items ORDER BY created_at DESC');
    res.json({ success: true, items: rows });
});

app.post('/api/food', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, category, price } = req.body;
        let imageUrl = req.body.imageUrl || '';

        if (req.file) {
            imageUrl = '/uploads/' + req.file.filename;
        }

        if (!name || !category || !price || !imageUrl) {
            return res.json({ success: false, message: 'All fields required' });
        }

        const [result] = await db.query(
            'INSERT INTO food_items (name, category, price, image) VALUES (?,?,?,?)',
            [name, category, parseInt(price), imageUrl]
        );
        const [rows] = await db.query('SELECT * FROM food_items WHERE id=?', [result.insertId]);
        res.json({ success: true, item: rows[0] });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/food/:id', requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT image FROM food_items WHERE id=?', [req.params.id]);
        if (rows.length > 0 && rows[0].image.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, 'public', rows[0].image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await db.query('DELETE FROM food_items WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/orders', requireAuth, async (req, res) => {
    try {
        const { items, total, payment_method } = req.body;
        const user = req.session.user;
        await db.query(
            'INSERT INTO orders (user_id, username, items, total, payment_method) VALUES (?,?,?,?,?)',
            [user.id, user.username, JSON.stringify(items), total, payment_method || 'card']
        );
        res.json({ success: true, message: payment_method === 'cod' ? 'Order placed! Pay on delivery.' : 'Payment successful! Order placed.' });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.get('/api/orders', requireAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ success: true, orders: rows });
});

// ─── TABLE BOOKING ROUTES ─────────────────────────────────────────────────────
app.post('/api/bookings/table', requireAuth, async (req, res) => {
    try {
        const { guests, booking_date, booking_time, special_req, payment_method } = req.body;
        const user = req.session.user;
        if (!guests || !booking_date || !booking_time) {
            return res.json({ success: false, message: 'Please fill all required fields' });
        }
        await db.query(
            'INSERT INTO table_bookings (user_id, username, guests, booking_date, booking_time, special_req, payment_method) VALUES (?,?,?,?,?,?,?)',
            [user.id, user.username, guests, booking_date, booking_time, special_req || '', payment_method || 'card']
        );
        res.json({ success: true, message: `Table booked for ${guests} guests on ${booking_date} at ${booking_time}! Payment via ${payment_method || 'card'}.` });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.get('/api/bookings/table', requireAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM table_bookings ORDER BY created_at DESC');
    res.json({ success: true, bookings: rows });
});

// ─── ROOM BOOKING ROUTES ──────────────────────────────────────────────────────
app.post('/api/bookings/room', requireAuth, async (req, res) => {
    try {
        const { event_type, room_name, guests, booking_date, booking_time, special_req, payment_method } = req.body;
        const user = req.session.user;
        if (!event_type || !guests || !booking_date || !booking_time) {
            return res.json({ success: false, message: 'Please fill all required fields' });
        }
        await db.query(
            'INSERT INTO room_bookings (user_id, username, event_type, room_name, guests, booking_date, booking_time, special_req, payment_method) VALUES (?,?,?,?,?,?,?,?,?)',
            [user.id, user.username, event_type, room_name || '', guests, booking_date, booking_time, special_req || '', payment_method || 'card']
        );
        res.json({ success: true, message: `${event_type} room booked for ${guests} guests on ${booking_date}! Payment via ${payment_method || 'card'}.` });
    } catch (e) {
        console.error(e);
        res.json({ success: false, message: 'Server error' });
    }
});

app.get('/api/bookings/room', requireAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM room_bookings ORDER BY created_at DESC');
    res.json({ success: true, bookings: rows });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🍽️  DishDeck Server running at http://localhost:${PORT}\n`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
});
