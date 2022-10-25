const express = require('express');
const router = express.Router();
const RatingController = require('../controllers/rating');

router.get('/:mediaType/:watchObjId', RatingController.get_object_rating);

//Development codes.

/*const Rating = require("../models/ratingSchema");

router.get('/', (req, res) =>
{
    Rating.find()
        .then(result => res.status(200).json(result))
});

router.delete('/', (req, res) =>
{
    Rating.remove()
        .then(result => res.status(200).json(result))
})*/

module.exports = router;