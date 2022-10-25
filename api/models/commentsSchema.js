const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    _id: {type: Number, required: true},
    commentsArr: {
        type: Array,
        id: mongoose.Schema.Types.ObjectId,
        comment: String,
        createdBy: Object,
        createdDate: String,
        likes: [],
        required: true},
        mediaType: {type: String, required: true}
});

module.exports = mongoose.model('Comment', commentSchema);