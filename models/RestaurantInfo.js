const mongoose = require('mongoose');

const restaurantInfoSchema = new mongoose.Schema({
    config: {
        nombre: { type: String, default: 'MJFOOD' },
        direccion: { type: String, default: 'Solo Domicilios' },
        telefonoWhatsApp: { type: String, default: '573046793853' },
        logoUrl: { type: String, default: 'https://back.vinapp.co//store/1000x500245093-2025-08-06-16-47-12.webp' },
        extension: { type: String, default: 'mjfood' },
        orden: { type: String, default: '900' },
        color: {
            text: { type: String, default: '#1a1c21' },
            primary: { type: String, default: '#e21c1b' },
            bg: { type: String, default: '#edebe4' },
            light: { type: String, default: '#dbd7c5' },
            dark: { type: String, default: '#cac7b5' }
        },
        taxRate: { type: Number, default: 0 }
    },
    schedule: [
        {
            day: Number,
            open: String,
            close: String
        }
    ],
    shippingZones: [
        {
            name: String,
            price: Number
        }
    ],
    paymentInfo: {
        transfer: {
            bankName: String,
            accountType: String,
            accountNumber: String,
            accountHolder: String
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Mch_MenuRestaurantInfo', restaurantInfoSchema);
