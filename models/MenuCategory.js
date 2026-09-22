const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    id: Number,
    name: String,
    description: String,
    basePrice: Number,
    image: String,
    kitchenGuide: String,
    adicionales: [{
        name: String,
        price: Number,
        type: { type: String, default: 'checkbox' },
    }],
    active: { type: Boolean, default: true }
});

const menuSubcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    items: [menuItemSchema],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
});

const categoryScheduleSchema = new mongoose.Schema({
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, default: '24h' },
    close: { type: String, default: '24h' }
}, { _id: false });

const menuCategorySchema = new mongoose.Schema({
    category: String,
    items: [menuItemSchema],
    subcategories: [menuSubcategorySchema],
    schedule: [categoryScheduleSchema],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Mch_MenuCategory', menuCategorySchema);
