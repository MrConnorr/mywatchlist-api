const Comment = require("../models/commentsSchema");
const User = require("../models/usersSchema");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const sanitize = require("mongo-sanitize");

exports.get_comments_of_watchObj_by_id = (req, res, next) =>
{
    Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]})
        .then( result =>
        {
            Comment.aggregate([{$match: {_id: Number(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
                {$match: {"commentsArr.deleted": true}}])
                .then(result2 =>
                {
                    const deletedCommentsId = result2.map(res => res.commentsArr.id);

                    console.log(deletedCommentsId);

                    deletedCommentsId.map(id =>
                        Comment.aggregate([{$match: {_id: Number(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
                            {$match: {"commentsArr.replyTo.commentId": mongoose.Types.ObjectId(id)}}])
                            .then(result3 =>
                            {
                                if(result3.length === 0)
                                {
                                    deletedCommentsId.map(id =>
                                        Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                                            $pull: {commentsArr: {id: mongoose.Types.ObjectId(id)}}
                                        }, {new: true}, (err, docs) =>
                                        {
                                            if (err)
                                            {
                                                return res.status(500).json(
                                                    {
                                                        error: err
                                                    });
                                            }
                                        })
                                    )
                                }
                            })
                    )
                });


            if(result === null)
            {
                const comment = new Comment(
                    {
                        _id: sanitize(req.params.watchObjId),
                        commentsArr: [],
                        mediaType: sanitize(req.params.mediaType)
                    });
                return comment.save()
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
                    });
            }

            res.status(200).json(result);

        })
}

exports.post_user_comment_into_watchObj = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]})
        .then( result =>
            {
                arrayWithoutReplies = result.commentsArr.filter(comment => !comment.replyTo);

                User.findById(userId)
                    .select("_id username")
                    .then(user =>
                    {
                        Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]}, {
                            $push: {commentsArr: {id: new mongoose.Types.ObjectId(),
                                    comment: sanitize(req.body.comment),
                                    createdBy: user,
                                    createdDate: new Date().toISOString(),
                                    likes: [],}}
                        },{new: true})
                            .then(result => res.status(200).json(result))
                            .catch(err => res.status(500).json(
                                {
                                    error: err.message
                                }));
                    })
                    .catch(err =>
                    {
                        res.status(500).json(
                            {
                                error: err.message
                            })
                    });

            }
        );
}

exports.delete_user_comment_by_id = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},
      {
          commentsArr: {$elemMatch: {id: mongoose.Types.ObjectId(req.params.commentId)}}
      })
      .then(result =>
      {
          if (result.commentsArr.length > 0)
          {
              Comment.aggregate([{$match: {_id: Number(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
                  {$match: {"commentsArr.replyTo.commentId": mongoose.Types.ObjectId(req.params.commentId)}}])
                  .then(result2 =>
                  {
                      console.log(result2.length);
                      if (result.commentsArr[0].createdBy._id.equals(userId))
                      {
                          if(result2.length > 0)
                          {
                              Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                                  $set: {"commentsArr.$[w].comment": "Comment deleted.","commentsArr.$[w].createdBy._id": null, "commentsArr.$[w].createdBy.username": "User", "commentsArr.$[w].deleted": true},
                              }, {arrayFilters: [{"w.id": mongoose.Types.ObjectId(req.params.commentId)}], new: true})
                                  .then(result =>
                                  {
                                      return res.status(200).json(result)
                                  })
                                  .catch(err =>
                                  {
                                      return res.status(200).json({
                                          error: err.message
                                      })
                                  })
                          }else
                          {
                              Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                                  $pull: {commentsArr: {id: mongoose.Types.ObjectId(req.params.commentId)}}
                              }, {new: true}, (err, docs) =>
                              {
                                  if (err)
                                  {
                                      return res.status(500).json(
                                          {
                                              error: err
                                          });
                                  }
                                  else
                                  {
                                      return res.status(200).json(docs);
                                  }
                              });
                          }

                      } else
                      {
                          res.status(500).json(
                              {
                                  error: "This is not your comment, stop it!"
                              });
                      }
                  })
          } else
          {
              res.status(404).json(
                  {
                      error: "comment not found"
                  });
          }
      })
};


exports.post_user_reply = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;
    let commentIndex;
    let properCommentId;

    let cleanCommentId;
    let cleanCommentIndex;
    let nextCleanCommentId;
    let nextCleanCommentIndex;

    Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]})
        .then(result =>
        {
            Comment.aggregate([{$match: {_id: Number(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
                {$match: {"commentsArr.replyTo.commentId": mongoose.Types.ObjectId(req.params.commentId)}}])
                .then(result2 =>
                {
                    Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},
                        {commentsArr: {$elemMatch: {id: mongoose.Types.ObjectId(req.params.commentId)}}})
                        .then( result3 =>
                        {
                            console.log(result3)

                            if(result3.commentsArr[0].replyTo)
                            {
                                properCommentId = result.commentsArr[result.commentsArr.length - 1].id;
                                console.log("first if")
                            } else if(result.commentsArr[result.commentsArr.length - 2])
                            {
                                cleanCommentId = result.commentsArr.filter(comment => !comment.replyTo);

                                cleanCommentIndex = cleanCommentId.findIndex(comment =>
                                {
                                    return comment.id.equals(req.params.commentId)
                                });

                                nextCleanCommentId = cleanCommentId[cleanCommentIndex];

                                nextCleanCommentIndex = result.commentsArr.findIndex(comment =>
                                {
                                    return comment.id.equals(nextCleanCommentId.id)
                                });

                                properCommentId = result.commentsArr[result.commentsArr.length - 1].replyTo ? result.commentsArr[result.commentsArr.length - 1].id : result.commentsArr[nextCleanCommentIndex - 1].id
                                console.log("second if")
                            } else
                            {
                                properCommentId = result2.map(res => res.commentsArr.id);
                                console.log("else")
                            }

                            commentIndex = result.commentsArr.findIndex(comment =>
                            {
                                return comment.id.equals(result2.length > 0 ? properCommentId.length > 1 ? properCommentId[properCommentId.length - 1].toString() : properCommentId.toString() : req.params.commentId);
                            });

                            Comment.findOne({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},
                                {commentsArr: {$elemMatch: {id: mongoose.Types.ObjectId(req.params.commentId)}}})
                                .then( result =>
                                {
                                    User.findById(userId)
                                        .select("_id username")
                                        .then(user =>
                                        {
                                            {console.log(commentIndex)}

                                            Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                                                $push: {commentsArr: {
                                                        $each: [{
                                                            id: new mongoose.Types.ObjectId(),
                                                            comment: sanitize(req.body.comment),
                                                            createdBy: user,
                                                            createdDate: new Date().toISOString(),
                                                            replyTo: {
                                                                userId: result.commentsArr[0].createdBy._id,
                                                                username: result.commentsArr[0].createdBy.username,
                                                                commentId: result.commentsArr[0].id
                                                            },
                                                            likes: [],
                                                            replyToReply: result3.commentsArr[0].replyTo ? true : false
                                                        }],
                                                        $position: commentIndex+1
                                                    }
                                                }
                                            },{new: true})
                                                .then(result =>
                                                {
                                                    res.status(201).json(result);
                                                    nextCleanCommentId = undefined;
                                                }).catch(err =>
                                            {
                                                res.status(500).json(
                                                    {
                                                        error: err.message
                                                    })
                                            });

                                        })
                                        .catch(err =>
                                        {
                                            res.status(500).json(
                                                {
                                                    error: err.message
                                                })
                                        });
                                })
                        })
                })
        })
};

exports.like_comment = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    User.findById(userId)
        .select('_id username')
        .then(result =>
        {
            Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
                    $push: {"commentsArr.$[w].likes": {userId: result._id, username: result.username, userProfilePic: result.userProfilePic}}
                }, {arrayFilters: [{"w.id": mongoose.Types.ObjectId(req.params.commentId)}], new: true})
                .select({ commentsArr: {$elemMatch: {id: mongoose.Types.ObjectId(req.params.commentId)}}})
                .then(result =>
                {
                    const arrayOfLikes = [].concat.apply([], result.commentsArr.map(comment => comment.likes));

                    res.status(200).json(arrayOfLikes);
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
        })
};

exports.unlike_comment = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    Comment.findOneAndUpdate({$and:[{_id: sanitize(req.params.watchObjId), mediaType: sanitize(req.params.mediaType)}]},{
        $pull: {"commentsArr.$[w].likes": {userId: mongoose.Types.ObjectId(userId)}}},
        {arrayFilters: [{"w.id": mongoose.Types.ObjectId(req.params.commentId)}], new: true})
        .select({ commentsArr: {$elemMatch: {id: mongoose.Types.ObjectId(req.params.commentId)}}})
        .then(result =>
        {
            const arrayOfLikes = result.commentsArr.map(comment => comment.likes);
            const arrayOfLikesFlatten = [].concat.apply([], arrayOfLikes);

            res.status(200).json(arrayOfLikesFlatten);
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                })
        })
};

exports.get_user_comments_of_watchObj = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    const watchObjId = sanitize(req.params.watchObjId);

    Comment.aggregate([{$match: {_id: Number(watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
        {$match: {"commentsArr.createdBy._id": mongoose.Types.ObjectId(userId)}}])
        .then(comments =>
        {
            res.status(200).json(
                {
                    comments: comments.map(comment => (
                        {
                            commentId: comment.commentsArr.id
                        }))
                })
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                   error: err.message
                });
        })
};

exports.get_user_likes_of_watchObj_comments = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    const watchObjId = sanitize(req.params.watchObjId);

    Comment.aggregate([{$match: {_id: Number(watchObjId), mediaType: sanitize(req.params.mediaType)}}, {$unwind: "$commentsArr"},
        {$match: {"commentsArr.likes.userId": mongoose.Types.ObjectId(userId)}}])
        .then(likes =>
        {
            res.status(200).json(
                {
                    likes: likes.map(like => (
                        {
                            commentId: like.commentsArr.id
                        }))
                })
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                });
        })
};