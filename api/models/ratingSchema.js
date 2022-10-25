const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema({
        _id: mongoose.Schema.Types.ObjectId,
        watchObjId: {type: Number, required: true},
        mediaType: {type: String, required: true},
        rating: {type: Number, default: 0}
    });

module.exports = mongoose.model('Rating', ratingSchema);