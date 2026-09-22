require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key-123_mjfood',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/mjfood',
        ttl: 7 * 24 * 60 * 60
    }),
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mjfood')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const Order = require('./models/Order');
const Like = require('./models/Like');
const Counter = require('./models/Counter');
const Promotion = require('./models/Promotion');
const RestaurantInfo = require('./models/RestaurantInfo');
const MenuCategory = require('./models/MenuCategory');
const Subscription = require('./models/Subscription');
const User = require('./models/User');
const webpush = require('web-push');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mjfood-menu',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
    },
});

const upload = multer({ storage: storage });

function getAllMenuItems(categories) {
    return categories.flatMap(cat => [
        ...(cat.items || []),
        ...(cat.subcategories || []).flatMap(subcategory => subcategory.items || [])
    ]);
}

webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function seedDefaultData() {
    try {
        const infoCount = await RestaurantInfo.countDocuments();
        if (infoCount === 0) {
            const defaultInfo = new RestaurantInfo({
                config: {
                    nombre: "MJFOOD",
                    direccion: "Solo Domicilios",
                    telefonoWhatsApp: "573046793853",
                    logoUrl: "",
                    extension: "mjfood",
                    orden: "900",
                    color: {
                      text: "#1a1c21",
                      primary: "#e21c1b",
                      bg: "#edebe4",
                      light: "#dbd7c5",
                      dark: "#cac7b5"
                    },
                    taxRate: 0
                },
                schedule: [
                    {day: 0, open: "10:00", close: "17:00"},
                    {day: 1, open: "10:00", close: "17:00"},
                    {day: 2, open: "10:00", close: "17:00"},
                    {day: 3, open: "10:00", close: "17:00"},
                    {day: 4, open: "10:00", close: "17:00"},
                    {day: 5, open: "10:00", close: "17:00"},
                    {day: 6, open: "10:00", close: "17:00"}
                ],
                shippingZones: [
                    {name: "La Playa", price: 3000},
                    {name: "Villa Campestre", price: 4000},
                    {name: "Ciudad Mayorquin", price: 7000}
                ],
                paymentInfo: {
                    transfer: {
                        bankName: "Nequi/Llave",
                        accountType: "Nequi/Llave",
                        accountNumber: "3046793853",
                        accountHolder: "Mar*** Jim***"
                    }
                }
            });
            await defaultInfo.save();
        }

        const categoryCount = await MenuCategory.countDocuments();
        if (categoryCount === 0) {
            const defaultMenu = [
                {
                    category: "⭐ Combos Imperdibles (Súper Ahorro)",
                    order: 1,
                    items: [
                        { id: 101, name: "Product Example", description: "test product", basePrice: 0, image: "", kitchenGuide: "" }
                    ]
                }
            ];
            await MenuCategory.insertMany(defaultMenu);
        }
    } catch (err) {
        console.error('Error seeding data:', err);
    }
}
seedDefaultData();

app.get('/manifest.json', (req, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(__dirname, 'public/manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/sw.js'));
});

app.get('/ping', (req, res) => {
  res.send('Pong');
});

app.get('/', async (req, res) => {
    try {
        const likeData = await Like.findOne({ restaurantId: 'mjfood' });
        const likes = likeData ? likeData.count : 0;
        const now = new Date();
        const dbPromotions = await Promotion.find({ 
            active: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: now } }
            ]
        });
        
        const restaurantInfo = await RestaurantInfo.findOne();
        const menuCategories = await MenuCategory.find({ active: true }).sort('order');
        
        const restaurantData = {
            config: restaurantInfo.config,
            schedule: restaurantInfo.schedule,
            shippingZones: restaurantInfo.shippingZones,
            paymentInfo: restaurantInfo.paymentInfo,
            menu: menuCategories.map(cat => ({
                category: cat.category,
                items: cat.items.filter(item => item.active),
                schedule: cat.schedule || [],
                subcategories: (cat.subcategories || [])
                    .filter(subcategory => subcategory.active)
                    .sort((a, b) => a.order - b.order)
                    .map(subcategory => ({
                        name: subcategory.name,
                        items: (subcategory.items || []).filter(item => item.active)
                    }))
            }))
        };

        let meta = {
            title: restaurantInfo.config.nombre,
            description: "Comida China y almuerzos ejecutivos.",
            image: restaurantInfo.config.logoUrl || ""
        };

        const productId = req.query.item;
        if (productId) {
            let foundItem = null;
            foundItem = getAllMenuItems(menuCategories).find(i => String(i.id) === productId);

            if (!foundItem && dbPromotions) {
                foundItem = dbPromotions.find(p => String(p._id) === productId || String(p.itemId) === productId);
            }

            if (foundItem) {
                meta.title = `${foundItem.name} | ${restaurantInfo.config.nombre}`;
                meta.description = foundItem.description || meta.description;
                if (foundItem.image) {
                    meta.image = foundItem.image;
                }
            }
        }

        res.render('index', { 
            likes, 
            dbPromotions, 
            restaurantData,
            meta,
            vapidPublicKey: process.env.VAPID_PUBLIC_KEY
        });
    } catch (error) {
        console.error(error);
        const meta = {
            title: "MJFOOD",
            description: "Menú digital.",
            image: ""
        };
        res.render('index', { 
            likes: 0, 
            dbPromotions: [], 
            restaurantData: null,
            meta,
            vapidPublicKey: process.env.VAPID_PUBLIC_KEY
        });
    }
});

app.get('/login', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.session.authenticated) {
        return res.redirect('/admin');
    }
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (username === adminUser && password === adminPass) {
        req.session.authenticated = true;
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.render('login', { error: 'Error de servidor' });
            }
            res.redirect('/admin');
        });
    } else {
        res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/admin', isAuthenticated, async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const restaurantInfo = await RestaurantInfo.findOne();
    const categories = await MenuCategory.find().sort('order');
    res.render('admin', { restaurantInfo, categories });
});

app.post('/api/upload', isAuthenticated, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
        }
        res.json({ success: true, url: req.file.path });
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        res.status(500).json({ success: false, message: 'Error al subir la imagen' });
    }
});

app.get('/api/promotions', async (req, res) => {
    try {
        const now = new Date();
        let query = {
            active: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: now } }
            ]
        };

        if (req.session.authenticated) {
            query = {};
        }

        const promotions = await Promotion.find(query);
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching promotions' });
    }
});

app.post('/api/promotions', isAuthenticated, async (req, res) => {
    try {
        const promoData = { ...req.body };
        
        if (promoData.duration && parseInt(promoData.duration) > 0) {
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(promoData.duration));
            promoData.expiresAt = expiresAt;
        }

        const newPromo = new Promotion(promoData);
        await newPromo.save();
        res.status(201).json(newPromo);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating promotion' });
    }
});

app.put('/api/promotions/:id', isAuthenticated, async (req, res) => {
    try {
        const promoData = { ...req.body };
        
        if (promoData.duration && parseInt(promoData.duration) > 0) {
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(promoData.duration));
            promoData.expiresAt = expiresAt;
        } else if (promoData.duration === null) {
            promoData.$unset = { expiresAt: 1 };
            delete promoData.expiresAt;
        }

        const updatedPromo = await Promotion.findByIdAndUpdate(req.params.id, promoData, { new: true });
        res.json(updatedPromo);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating promotion' });
    }
});

app.delete('/api/promotions/:id', isAuthenticated, async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Promotion deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting promotion' });
    }
});
app.get('/api/restaurant-info', async (req, res) => {
    const info = await RestaurantInfo.findOne();
    res.json(info);
});

app.post('/api/restaurant-info', isAuthenticated, async (req, res) => {
    try {
        await RestaurantInfo.findOneAndUpdate({}, req.body, { upsert: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/menu-categories', async (req, res) => {
    const categories = await MenuCategory.find().sort('order');
    res.json(categories);
});

app.post('/api/menu-categories', isAuthenticated, async (req, res) => {
    try {
        const newCategory = new MenuCategory(req.body);
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.put('/api/menu-categories/:id', isAuthenticated, async (req, res) => {
    try {
        await MenuCategory.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/menu-categories/:id', isAuthenticated, async (req, res) => {
    try {
        await MenuCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/admin/orders', isAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/admin/clients', isAuthenticated, async (req, res) => {
    try {
        const allowedSortFields = ['orderCount', 'totalSpent', 'lastOrderAt', 'name', 'phone'];
        const sortField = allowedSortFields.includes(req.query.sort) ? req.query.sort : 'lastOrderAt';
        const sortDirection = req.query.direction === 'asc' ? 1 : -1;
        const users = await User.find().sort({ [sortField]: sortDirection });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ success: false });
    }
});

app.put('/api/admin/clients/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        if (!name || !phone || !address) {
            return res.status(400).json({ success: false, message: 'Nombre, teléfono y dirección son obligatorios' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { name: String(name).trim(), phone: String(phone).trim(), address: String(address).trim() } },
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error updating client:', error);
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'El teléfono ya pertenece a otro cliente' });
        res.status(500).json({ success: false, message: 'Error al actualizar el cliente' });
    }
});


app.put('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const { status, shippingCost } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false });

        const updateData = {};
        if (status) updateData.status = status;
        if (shippingCost !== undefined) {
            updateData.shippingCost = parseFloat(shippingCost);
            updateData.total = order.subtotal + parseFloat(shippingCost);
        }

        await Order.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        let { deviceId, endpoint, keys } = req.body;
        
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            console.error('Invalid subscription received:', req.body);
            return res.status(400).json({ success: false, message: 'Invalid subscription data' });
        }

        endpoint = endpoint.trim();
        keys.p256dh = keys.p256dh.trim();
        keys.auth = keys.auth.trim();

        const filter = deviceId ? { deviceId } : { endpoint };
        const update = {
            endpoint,
            keys: {
                p256dh: keys.p256dh,
                auth: keys.auth
            },
            deviceId
        };

        const result = await Subscription.findOneAndUpdate(
            filter,
            update,
            { upsert: true, new: true }
        );
        
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ success: false });
    }
});

app.post('/api/notifications/send', isAuthenticated, async (req, res) => {
    const { title, body, url, image } = req.body;
    const payload = JSON.stringify({
        title: title || 'Novedades en MJFOOD',
        body: body || '¡Revisa nuestro nuevo menú!',
        icon: 'https://res.cloudinary.com/ddyhmqsas/image/upload/v1788964377/mjfood-menu/mndvl6llul4vryotbaa6.png',
        image: image || null,
        data: { url: url || '/' }
    });

    try {
        const subscriptions = await Subscription.find();
        
        const notifications = subscriptions.map(sub => {
            if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
                console.warn(`Skipping invalid subscription: ${sub._id}`);
                return Promise.resolve();
            }

            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.keys.p256dh,
                    auth: sub.keys.auth
                }
            };

            const options = {
                vapidDetails: {
                    subject: process.env.VAPID_EMAIL || 'mailto:admin@example.com',
                    publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
                    privateKey: process.env.VAPID_PRIVATE_KEY.trim()
                }
            };

            return webpush.sendNotification(pushSubscription, payload, options)
                .then(() => console.log('Notification sent'))
                .catch(error => {
                    console.error(`Error sending to ${sub.endpoint}:`, {
                        statusCode: error.statusCode,
                        message: error.message,
                        body: error.body,
                        endpoint: sub.endpoint
                    });
                    
                    if (error.statusCode === 410 || error.statusCode === 404) {
                      return Subscription.deleteOne({ _id: sub._id });
                    }
                });
        });

        await Promise.all(notifications);
        res.json({ success: true, count: subscriptions.length });
    } catch (error) {
        console.error('Error processing notifications:', error);
        res.status(500).json({ success: false });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { clientName, clientPhone, clientAddress, items, total, comments } = req.body;

        if (clientPhone) {
            const orderTotal = total || 0;
            await User.findOneAndUpdate(
                { phone: clientPhone },
                { 
                    $setOnInsert: { 
                        name: clientName, 
                        address: clientAddress 
                    },
                    $inc: { 
                        orderCount: 1,
                        totalSpent: orderTotal
                    },
                    lastOrderAt: new Date()
                },
                { upsert: true, returnDocument: 'after' }
            );
        }

        const counter = await Counter.findOneAndUpdate(
            { id: 'orderId' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
        );

        const shortId = `mc${counter.seq}`;
        const newOrder = new Order({ ...req.body, shortId });
        await newOrder.save();

        res.status(201).json({ success: true, message: 'Order saved', orderId: newOrder._id, shortId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error saving order' });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const queryId = req.params.id;
        let order;

        if (queryId.startsWith('mc')) {
            order = await Order.findOne({ shortId: queryId });
        } else {
            if (mongoose.Types.ObjectId.isValid(queryId)) {
                order = await Order.findById(queryId);
            }
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error retrieving order' });
    }
});

app.post('/api/like', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        let likeData = await Like.findOne({ restaurantId: 'mjfood' });
        
        if (!likeData) {
            likeData = new Like({ restaurantId: 'mjfood', count: 1, ips: [ip] });
            await likeData.save();
            return res.json({ success: true, count: likeData.count });
        }

        if (likeData.ips.includes(ip)) {
            return res.status(400).json({ success: false, message: 'Ya has dado like desde esta conexión' });
        }

        likeData.count += 1;
        likeData.ips.push(ip);
        await likeData.save();
        
        res.json({ success: true, count: likeData.count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error updating likes' });
    }
});

app.listen(PORT, () => {
    console.log(`Server on port:${PORT}`);
});
