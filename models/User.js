const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    lastOrderAt: { type: Date, default: Date.now },
    orderCount: { type: Number, default: 1 },
    totalSpent: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mch_MenuUser', userSchema);
