const Rating = require("../models/ratingSchema");
const User = require("../models/usersSchema");
const sanitize = require("mongo-sanitize");
const mongoose = require("mongoose");

exports.get_object_rating = (req, res, next) =>
{
    const watchObjId = sanitize(req.params.watchObjId);

    Rating.findOne({$and:[{watchObjId: Number(watchObjId), mediaType: sanitize(req.params.mediaType)}]})
        .then(result =>
        {
            if(result === null)
            {
                const rating = Rating(
                    {
                        _id: new mongoose.Types.ObjectId(),
                        watchObjId: watchObjId,
                        mediaType: sanitize(req.params.mediaType),
                        rating: 0
                    });

                rating.save()
                    .catch(err =>
                    {
                        return res.status(500).json(
                            {
                                error: err.message
                            })
                    })

            }

            User.find({"watchlistArr.watchObject.id": Number(watchObjId)},
                {watchlistArr: {$elemMatch: {"watchObject.id": Number(watchObjId)}}})
                .then(result =>
                {
                    const allRatings = result.map(re => re.watchlistArr.map(wa => wa.score).filter(Number)).filter(e => e.length).map(Number);
                    let totalRating = allRatings.reduce((total, currentValue) => total + currentValue, 0) / allRatings.length;

                    if(isNaN(totalRating)) totalRating = 0;

                    Rating.findOneAndUpdate({$and:[{watchObjId: Number(watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                        $set: {rating: totalRating}
                    }, {new: true})
                        .then(result =>
                        {
                            res.status(200).json(result);
                        })
                        .catch(err =>
                        {
                            res.status(500).json(
                                {
                                    error: err.message
                                })
                        })

                })
                .catch(err =>
                {
                    res.status(500).json(
                        {
                            error: err.message
                        });
                });

        })
        .catch(err =>
        {
           res.status(500).json(
               {
                  error: err.message
               });
        });
};