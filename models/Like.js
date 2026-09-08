const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    ips: [{ type: String }]
});

module.exports = mongoose.model('Mch_MenuLike', LikeSchema);
