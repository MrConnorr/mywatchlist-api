const mongoose = require('mongoose');
const currentDate = new Date();

const dummyUserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: {type: String, required: true, unique: true},
    email: {type: String,
        required: true,
        unique: true,
        match: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/},
    password: {type: String, required: true},
    userProfilePic: {type: String, default: '/usersProfilePics/default.jpg'},
    createdAt: {type: Date, default: Date.now, expires: '30min'}
});

/*console.log(dummyUserSchema.indexes())

const test = mongoose.model('DummyUser', dummyUserSchema);

test.collection.createIndex({createdAt: 1}, {expireAfterSeconds: 0})
    .then(r => console.log(r))
    .catch(err => console.log(err));

test.collection.dropIndex('createdAt_1', function(err, result) {
    if (err) {
        console.log('Error in dropping index!', err);
    }
});*/

module.exports = mongoose.model('DummyUser', dummyUserSchema);
