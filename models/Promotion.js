const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true },
    image: { type: String, required: true },
    externalMapping: {
        id_product: Number,
        name_product: String,
        valor: Number,
        id_companie: Number,
        id_point: Number
    },
    adicionales: [{
        name: String,
        price: Number,
        type: { type: String, default: 'checkbox' },
        id_product: Number,
        id_companie: Number,
        id_point: Number
    }],
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, index: { expires: 0 } },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mch_MenuPromotion', promotionSchema);
