const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    endpoint: { type: String, required: true },
    keys: {
        p256dh: String,
        auth: String
    },
    deviceId: { type: String, unique: true, sparse: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mch_MenuSubscription', subscriptionSchema);
