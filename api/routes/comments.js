const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const CommentsController = require('../controllers/comments');

router.get('/:mediaType/:watchObjId', CommentsController.get_comments_of_watchObj_by_id);

router.post('/:mediaType/:watchObjId', checkAuth, CommentsController.post_user_comment_into_watchObj);

router.delete('/:mediaType/:watchObjId/:commentId', checkAuth, CommentsController.delete_user_comment_by_id);

router.post('/:mediaType/:watchObjId/:commentId', checkAuth, CommentsController.post_user_reply);

router.post('/like/:mediaType/:watchObjId/:commentId', checkAuth, CommentsController.like_comment);

router.delete('/like/:mediaType/:watchObjId/:commentId', checkAuth, CommentsController.unlike_comment);

router.get('/userComments/:mediaType/:watchObjId', checkAuth, CommentsController.get_user_comments_of_watchObj);

router.get('/userLikes/:mediaType/:watchObjId', checkAuth, CommentsController.get_user_likes_of_watchObj_comments);


//Development codes.

/*
const Comment = require("../models/commentsSchema");

router.get('/', (req, res)=>
{
    Comment.find().then(result =>
    {
        res.status(200).json(
            {
               result: result
            });
    })
})

router.delete('/', (req, res)=>
{
    Comment.remove().then(result =>
    {
        res.status(200).json(
            {
                result: result
            });
    })
})*/

module.exports = router;