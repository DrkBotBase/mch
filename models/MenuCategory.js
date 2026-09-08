const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    id: Number,
    name: String,
    description: String,
    basePrice: Number,
    image: String,
    kitchenGuide: String,
    externalMapping: {
        id_product: Number,
        name_product: String,
        valor: Number,
        id_companie: Number,
        id_point: Number,
        additions: [{
            id_product: Number,
            name_product: String,
            valor: Number
        }]
    },
    adicionales: [{
        name: String,
        price: Number,
        type: { type: String, default: 'checkbox' },
        id_product: Number,
        id_companie: Number,
        id_point: Number
    }],
    active: { type: Boolean, default: true }
});

const menuCategorySchema = new mongoose.Schema({
    category: String,
    items: [menuItemSchema],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Mch_MenuCategory', menuCategorySchema);
