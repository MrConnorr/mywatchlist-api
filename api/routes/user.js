const express = require('express');
const router = express.Router();
const multer = require('multer');
const checkAuth = require('../middleware/check-auth');
const UserController = require('../controllers/users');

const storage = multer.diskStorage({
    destination: function (req, file, cb)
    {
        cb(null, './usersProfilePics/');
    },
    filename: function (req, file, cb)
    {
        const username = req.headers.authorization ? jwt.decode(req.headers.authorization.split(' ')[1]).username : req.body.username;

/*        cb(null, username + "-profilePic" + "." + file.originalname.split('.')[1]);*/
        cb(null, username + "-profilePic" + ".png");
    }
});

const upload = multer({storage: storage});

// Getting user by username
router.get('/one/:username/:token?', UserController.get_user_by_username);

//Get All users
router.get('/all/', UserController.get_all_users);

// Getting logged in user data
router.get('/', checkAuth, UserController.get_logged_in_user);

// Check if the username available
router.get('/check/:username', UserController.check_if_username_available);

// Getting email by username
router.get('/getEmail/:username', UserController.get_email_by_username);

// Change user password/profile picture by user id
router.patch('/:toChange', checkAuth, upload.single('userProfilePic'), UserController.change_user_pass_or_pic);

//Delete user
router.delete('/', checkAuth, UserController.delete_user);

// User Sign Up
router.post('/signup', upload.single('userProfilePic'), UserController.user_signup);

//User login
router.post('/login', UserController.user_login);

//User resend verification email
router.post('/verifyResend', UserController.verify_resend);

//User verify
router.post('/verify/:token', UserController.verify);

router.patch('/verify/changeEmail', UserController.change_verification_email)

//User send forgot password email
router.post('/forgotPassword', UserController.forgot_password_email);

//User forgot password
router.patch('/forgotPassword/:token', UserController.forgot_password);

router.get('/checkToken/:token', UserController.check_jwt_token);

//Add object to User watchlist array
router.post('/watchlist', checkAuth, UserController.add_object_to_watchlist);

// Delete object from User watchlist
router.delete('/watchlist/:watchObjId', checkAuth, UserController.delete_object_from_watchlist);

// Getting one object from user watchlist
router.get("/watchlist/:watchObjId", checkAuth, UserController.check_watch_obj_exists_in_user_watchlist);

// Adding review to object in user watchlist
router.patch("/review/:watchObjId", checkAuth, UserController.change_review_to_object_in_watchlist);


//Development codes.

/*const User = require("../models/usersSchema");

router.delete('/deleteAll', (req, res)=>
{
    User.remove().then(result =>
    {
        res.status(200).json(
            {
                result: result
            });
    })
})

const DummyUser = require("../models/dummyUser");
const jwt = require("jsonwebtoken");
router.get('/all/dummyUsers', (req, res) =>
{
    DummyUser.find()
        .then(result =>
        {
            res.status(200).json(result)
        })
})

router.delete('/all/dummyUsers', (req, res) =>
{
    DummyUser.remove()
        .then(result =>
        {
            res.status(200).json(result)
        })
})*/


module.exports = router;