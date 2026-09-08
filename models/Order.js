const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientAddress: { type: String, required: true },
    shortId: { type: String, unique: true },
    items: [{
        name: String,
        quantity: Number,
        price: Number,
        instructions: String,
        adicionales: [{
            name: String,
            price: Number,
            id_product: Number,
            id_companie: Number,
            id_point: Number
        }]
    }],
    subtotal: Number,
    shippingCost: Number,
    total: Number,
    paymentMethod: String,
    cashAmount: Number,
    transferAmount: Number,
    comments: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mch_MenuOrder', OrderSchema);
