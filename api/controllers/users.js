const User = require("../models/usersSchema");
const DummyUser = require("../models/dummyUser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const sanitize = require('mongo-sanitize');
const hbs = require('nodemailer-express-handlebars');
const path = require("path");

const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    secureConnection: false,
    secure: false,
    tls: {
        ciphers:'SSLv3'
    },
        auth:
        {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

transporter.use('compile', hbs({
        viewEngine: {
            extName: ".hbs",
            partialsDir: path.resolve("./views/"),
            defaultLayout: false,
        },
        viewPath: path.resolve("./views/"),
        extName: ".hbs"
}));

exports.get_user_by_username = (req, res, next) =>
{
    const token = sanitize(req.params.token);
    let own = false;

    if(token)
    {
        const tokenUserId = jwt.decode(token).username;

        if (tokenUserId === sanitize(req.params.username))
        {
            own = true;
        }
    }

    User.findOne({username: sanitize(req.params.username)})
        .select('_id username userProfilePic watchlistArr createdAt')
        .then(result =>
        {
            if(result === null)
            {
                return res.status(404).json(
                    {
                        error: "User not found"
                    })
            }

            res.status(200).json(
                {
                    user: result,
                    own: own
                });
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                });
        });
}

exports.get_logged_in_user = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    User.findById(userId)
        .select("_id username email password userProfilePic")
        .then(result =>
        {
            res.status(200).json(result);
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                });
        });
}

exports.get_all_users = (req, res, next) =>
{
    User.find()
        .then(result =>
        {
            res.status(200).json(
                {
                    Users: result
                });
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                });
        });
}

exports.check_if_username_available = (req, res, next) =>
{
    User.find({username: sanitize(req.params.username)})
        .then(result =>
        {

            if(result.length === 1)
            {
                return res.status(200).json(
                    {
                        available: false
                    })
            }

            DummyUser.find({username: sanitize(req.params.username)})
                .then(result =>
                {
                    if(result !== null)
                    {
                        return res.status(200).json(
                            {
                                available: result.length !== 1
                            });
                    }

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
}

exports.forgot_password_email = (req, res, next) =>
{
    if(!sanitize(req.body.user))
    {
        return res.status(422).json(
            {
                error: "Username or email is required"
            });
    }

    User.findOne({$or : [{email: sanitize(req.body.user)}, {username: sanitize(req.body.user)}]})
        .select('_id email')
        .then(result =>
        {
            if (result === null)
            {
                return res.status(200).json({error: "If your username/email matches an existing account we will send a password reset email within a few minutes."});
            }

            const verificationToken = jwt.sign({id: result._id}, process.env.JWT_KEY, {expiresIn: "30min"});
            const url = `https://sprightly-snickerdoodle-9a02ca.netlify.app/forgotPassword/${verificationToken}`;

            transporter.sendMail(
                {
                    from: 'Connor from My Watch List <mywatchlistonline@outlook.com>',
                    to: result.email,
                    subject: "Password reset",
                    template: 'index',
                    context:
                    {
                        url: url,
                        title: "Password reset.",
                        text: "Someone requested password reset for the following account. To reset password click the button below.",
                        buttonText: "Reset My Password"
                    }
                })
                .then(() =>
                {
                    res.status(200).json(
                        {
                            message: "If your username/email matches an existing account we will send a password reset email within a few minutes."
                        })
                })
                .catch(err =>
                {
                    res.status(500).json(
                        {
                            error: err.message
                        });
                    console.log(err)
                });
        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                });
    });
}

exports.forgot_password = (req, res, next) =>
{
    if(!req.params.token)
    {
        return res.status(422).json(
            {
                error: "Missing token"
            });
    }

    let tokenVerification = null;
    try
    {
        tokenVerification = jwt.verify(req.params.token, process.env.JWT_KEY);
    }
    catch (err)
    {
        return res.status(500).json(
            {
                error: err.message
            });
    }
    finally
    {
        bcrypt.hash(sanitize(req.body.newPassword), 10, (err, hash) =>
        {
            if(err)
            {
                return res.status(500).json({
                    error: err.message
                });
            } else
            {
                User.findByIdAndUpdate(tokenVerification.id,
                    {
                        $set: {password: hash}
                    }, {new: true})
                    .then(result =>
                    {
                        console.log(result)
                        res.status(200).json(
                            {
                                updatedUser: result
                            });

                        transporter.sendMail(
                            {
                                from: 'Connor from My Watch List <mywatchlistonline@outlook.com>',
                                to: result.email,
                                subject: "Password reset successfully.",
                                template: 'index',
                                context:
                                    {
                                        title: "Password reset successfully.",
                                        text: "Password has been reset successfully for the following account.",
                                        displayStyle: "none"
                                    }
                            }).catch(err =>
                        {
                            console.log(err)
                        });

                    })
                    .catch(err =>
                    {
                        res.status(500).json({
                            error: err.message
                        });
                    });
            }
        });
    }
}

exports.check_jwt_token = (req, res, next) =>
{
    if(!req.params.token)
    {
        return res.status(422).json(
            {
                error: "Missing token"
            });
    }

    let tokenVerification = null;
    try
    {
        tokenVerification = jwt.verify(req.params.token, process.env.JWT_KEY);
    }
    catch (err)
    {
        return res.status(500).json(
            {
                error: err.message
            });
    }
    finally
    {
        res.status(200).json("Valid");
    }
}


exports.change_user_pass_or_pic =  (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    if(sanitize(req.params.toChange) === "password")
    {
        User.findById(userId)
            .select('password')
            .then(result =>
            {
                bcrypt.compare(sanitize(req.body.currentPassword), result.password, (err, result) =>
                {
                    if (err)
                    {
                        return res.status(422).json(
                            {
                                error: "Current password is required"
                            });
                    }

                    if (!result)
                    {
                        return res.status(401).json(
                            {
                                error: "Current password is incorrect"
                            })
                    }

                    bcrypt.hash(sanitize(req.body.newPassword), 10, (err, hash) =>
                    {
                        if(err)
                        {
                            return res.status(500).json({
                                error: err.message
                            });
                        } else
                        {
                            User.findByIdAndUpdate(userId,
                                {
                                    $set: {password: hash}
                                }, {new: true})
                                .then(result =>
                                {
                                    res.status(200).json(
                                        {
                                            updatedUser: result
                                        });

                                    transporter.sendMail(
                                        {
                                            from: 'Connor from My Watch List <mywatchlistonline@outlook.com>',
                                            to: result.email,
                                            subject: "Password changed successfully.",
                                            template: 'index',
                                            context:
                                                {
                                                    title: "Password changed successfully.",
                                                    text: "Password has been changed successfully for the following account.",
                                                    displayStyle: "none"
                                                }
                                        }).catch(err =>
                                    {
                                        console.log(err)
                                    });

                                })
                                .catch(err =>
                                {
                                    res.status(500).json({
                                        error: err.message
                                    });
                                });
                        }
                    });

                })
            })
    } else if(sanitize(req.params.toChange) === "profilePic")
    {
        User.findByIdAndUpdate(userId,
            {
                $set: {userProfilePic: req.file.path.replace("\\","/")}
            }, {new:true})
            .then(result =>
            {
                res.status(200).json(
                    {
                        updatedUser: result
                    });
            })
            .catch(err =>
            {
                res.status(500).json(
                    {
                        error: err.message
                    });
            });
    }
}

exports.delete_user = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;
    console.log(req.body);

    User.findById(userId)
        .select('password')
        .then(result =>
        {
            bcrypt.compare(sanitize(req.body.password), result.password, (err, result) =>
            {
                if (err)
                {
                    return res.status(422).json(
                        {
                            error: "Password is required"
                        });
                }

                if (!result)
                {
                    return res.status(401).json(
                        {
                            error: "Incorrect password"
                        })
                }

                User.findByIdAndDelete(userId)
                    .then(res.status(200).json("User was deleted"))
                    .catch(err => {
                        res.status(500).json(
                            {
                                error: err.message
                            });
                    });

            })
        })
}

exports.user_signup = (req, res, next) =>
{
    if (sanitize(req.body.password) === "") return res.status(409).json({ error: "Password must be provided" });

    User.find({$or : [{email: sanitize(req.body.email)}, {username: sanitize(req.body.username)}]})
        .then(user =>
        {
            if (user.length >= 1)
            {
                return res.status(409).json(
                    {
                        error: "The email/username is already in use."
                    });
            }

            DummyUser.find({$or : [{email: sanitize(req.body.email)}, {username: sanitize(req.body.username)}]})
                .then(user =>
                {
                    if (user.length >= 1)
                    {
                        return res.status(409).json(
                            {
                                error: "The email/username is already in use."
                            });
                    }

                    bcrypt.hash(sanitize(req.body.password), 10, (err, hash) =>
                    {
                        if(err)
                        {
                            return res.status(500).json({
                                error: err.message
                            });
                        } else
                        {
                            const dummyUser = new DummyUser({
                                _id: new mongoose.Types.ObjectId(),
                                username: sanitize(req.body.username),
                                email: sanitize(req.body.email),
                                password: hash,
                                userProfilePic: req.file !== undefined ? req.file.path.replace("\\","/") : "usersProfilePics/default.jpg",
                            });

                            dummyUser.save()
                                .then(result =>
                                {
                                    res.status(201).json(
                                        {
                                            message: 'User Created',
                                            createdUser: result
                                        })
                                })
                                .catch(err =>
                                {
                                    res.status(500).json(
                                        {
                                            error: err.message
                                        })
                                });
                            const verificationToken = jwt.sign({user: dummyUser}, process.env.JWT_KEY, {expiresIn: "30min"});
                            const url = `https://sprightly-snickerdoodle-9a02ca.netlify.app/verification/${verificationToken}`;

                            transporter.sendMail(
                                {
                                    from: 'Connor from My Watch List <mywatchlistonline@outlook.com>',
                                    to: sanitize(req.body.email),
                                    subject: "Verify your account",
                                    template: 'index',
                                    context:
                                    {
                                        url: url,
                                        title: "Welcome!",
                                        text: "Please verify your email address by clicking the button below.",
                                        buttonText: "Verify My Email"
                                    }
                                }).catch(err =>
                            {
                                console.log(err)
                            });
                        }
                    });

                });
        });
}

exports.verify_resend = (req, res, next) =>
{
    if(!sanitize(req.body.email))
    {
        return res.status(422).json(
            {
                error: "Email is required"
            });
    }
        User.findOne({email: sanitize(req.body.email)})
            .then(result =>
            {
                if (result !== null)
                {
                    return res.status(409).json(
                        {
                            error: "User already verified"
                        })
                }

                DummyUser.findOne({email: sanitize(req.body.email)})
                    .then(result =>
                    {
                        if (result === null)
                        {
                            return res.status(404).json(
                                {
                                    error: "User not found"
                                })
                        }

                        const verificationToken = jwt.sign({user: result}, process.env.JWT_KEY, {expiresIn: "30min"});
                        const url = `https://sprightly-snickerdoodle-9a02ca.netlify.app/verification/${verificationToken}`;

                        transporter.sendMail(
                            {
                                from: 'Connor from My Watch List <mywatchlistonline@outlook.com>',
                                to: sanitize(req.body.email),
                                subject: "Verify your account",
                                template: 'index',
                                context:
                                {
                                    url: url,
                                    title: "Welcome!",
                                    text: "Please verify your email address by clicking the button below.",
                                    buttonText: "Verify My Email"
                                }
                            })
                            .then(() =>
                            {
                                const dummyUser = new DummyUser({
                                    _id: result._id,
                                    username: result.username,
                                    email: result.email,
                                    password: result.password,
                                    userProfilePic: result.userProfilePic,
                                });

                                dummyUser.save()
                                    .catch(err =>
                                    {
                                        res.status(500).json(
                                            {
                                                error: err.message
                                            })
                                    });

                                DummyUser.findByIdAndRemove(result._id)
                                    .catch(err =>
                                    {
                                        res.status(500).json(
                                            {
                                                error: err.message
                                            })
                                    })

                                return res.status(200).json(
                                    {
                                        message: `Verification email has been resent to ${req.body.email}`
                                    })
                            })
                            .catch(err =>
                            {
                                res.status(500).json(
                                    {
                                        error: err.message
                                    });
                                console.log(err)
                            });
                    })
            })
}

exports.verify = (req, res, next) =>
{
    if(!req.params.token)
    {
        return res.status(422).json(
            {
               error: "Missing token"
            });
    }

    let tokenVerification = null;
    try
    {
       tokenVerification = jwt.verify(req.params.token, process.env.JWT_KEY);
    }
    catch (err)
    {
        return res.status(500).json(
            {
                error: err.message
            });
    }
    finally
    {
        const userData = jwt.decode(req.params.token);

        User.find({email: userData.user.email})
            .then(result =>
            {
                if (result.length !== 0)
                {
                    return res.status(409).json(
                        {
                            message: "User already verified",
                        })
                }

                const user = new User({
                    _id: new mongoose.Types.ObjectId(),
                    username: userData.user.username,
                    email: userData.user.email,
                    password: userData.user.password,
                    userProfilePic: userData.user.userProfilePic,
                    watchlistArr: [] //id: new mongoose.Types.ObjectId(), watchlist: req.body.watchlistArr
                });

                user.save()
                    .then(result => {
                        res.status(201).json(
                            {
                                message: 'User Created',
                                createdUser: result
                            })
                    })
                    .catch(err => {
                        res.status(500).json(
                            {
                                error: err.message
                            })
                    });

                DummyUser.findByIdAndRemove(userData.user._id)
                    .catch(err => {
                        res.status(500).json(
                            {
                                error: err.message
                            })
                    })
            })
    }
}

exports.user_login = (req, res, next) =>
{
    if(!sanitize(req.body.user))
    {
        return res.status(401).json({error: "Username or email is required"});
    }

    DummyUser.findOne({$or : [{email: sanitize(req.body.user)}, {username: sanitize(req.body.user)}]})
        .then(result =>
        {
            if (result !== null)
            {
                return res.status(302).json(
                    {
                        verifyError: "Please verify your email address"
                    });
            }

            User.findOne({$or : [{email: sanitize(req.body.user)}, {username: sanitize(req.body.user)}]})
                .then(user =>
                {

                    if(user === null)
                    {
                        return res.status(401).json({error: "Incorrect username or password"});
                    }

                    bcrypt.compare(sanitize(req.body.password), user.password, (err, result) =>
                    {
                        if (err)
                        {
                            return res.status(401).json({error: "Please enter your password"});
                        }

                        if (!result)
                        {

                            return res.status(401).json({error: "Incorrect username or password"});
                        }

                        const token = jwt.sign(
                            {
                                email: user.email,
                                userId: user._id,
                                username: user.username
                            },
                            process.env.JWT_KEY,
                            {expiresIn: req.body.rememberMe ? "365 days" : "1h"});

                        return res.status(200).json(
                            {
                                message: "Auth successful",
                                username: user.username,
                                token: token
                            });
                    })
                })
                .catch(err =>
                {
                    res.status(500).json({
                        error: err.message
                    })
                })

        })
}

exports.add_object_to_watchlist = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;
    const id = new mongoose.Types.ObjectId();

    User.findByIdAndUpdate(userId, {
        $push: {watchlistArr: {id: id, watchObject: req.body.watchObject,
                watchStatus: "Plan to watch", score: null, review: ""}}
    },{new: true},function (err, docs)
    {
        if (err)
        {
            res.status(500).json(
                {
                    error: err
                });
        }
        else
        {
            res.status(200).json(
                {
                    updatedUser: docs,
                    id: id,
                    message: "Successfully added to watchlist"
                });
        }
    });
}

exports.delete_object_from_watchlist = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    User.findByIdAndUpdate(userId, {
        $pull: {watchlistArr: {id: mongoose.Types.ObjectId(req.params.watchObjId)}}
    },{new: true},function (err, docs)
    {
        if (err)
        {
            res.status(500).json(
                {
                    error: err
                });
        } else
        {
            res.status(200).json(
                {
                    updatedUser: docs,
                    message: "Successfully removed from watchlist"
                });
        }
    });
}

exports.check_watch_obj_exists_in_user_watchlist = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    User.findById(userId,{
        watchlistArr: {$elemMatch: {"watchObject.id": sanitize(Number(req.params.watchObjId))}}
    })
        .then(result =>
        {
            if (result.watchlistArr.length > 0)
            {
               return res.status(200).json({
                    exists: true,
                    id: result.watchlistArr.map(watchObj => watchObj.id)
                })
            }

            res.status(200).json({
                exists: false,
                id: null
            })

        })
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message
                })
        })
}

exports.change_review_to_object_in_watchlist = (req, res, next) =>
{
    const userId = jwt.decode(req.headers.authorization.split(' ')[1]).userId;

    User.findByIdAndUpdate(userId,{
        $set: {"watchlistArr.$[w].watchStatus": sanitize(req.body.watchStatus), "watchlistArr.$[w].score": sanitize(req.body.score), "watchlistArr.$[w].review": sanitize(req.body.review)},
    }, {arrayFilters: [{"w.id": mongoose.Types.ObjectId(req.params.watchObjId)}], new: true})
        .then(result =>
        {
            res.status(200).json(result)
        })
        .catch(err =>
        {
            res.status(200).json({
                error: err.message
            })
        })
}

exports.get_email_by_username = (req, res, next) =>
{
    DummyUser.findOne({username: sanitize(req.params.username)})
        .select('email')
        .then(result => {
            res.status(200).json(
                {
                    email: result.email
                })
        })
        .catch(err => {
            res.status(500).json(
                {
                    error: err.message
                })
        })
}

exports.change_verification_email = (req, res, next) =>
{
    DummyUser.findOne({email: sanitize(req.body.email)})
        .select('_id email password')
        .then(user =>
        {
            bcrypt.compare(sanitize(req.body.password), user.password, (err, result) =>
            {
                if (err)
                {
                    return res.status(422).json(
                        {
                            error: "Password is required"
                        });
                }

                if (!result)
                {
                    return res.status(401).json(
                        {
                            error: "Incorrect password"
                        })
                }

                DummyUser.findByIdAndUpdate(user._id,
                    {
                        $set: {email: sanitize(req.body.newEmail)}
                    }, {new: true})
                    .then(result =>
                    {
                        res.status(200).json(result.email);
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
        .catch(err =>
        {
            res.status(500).json(
                {
                    error: err.message,
                })
        })
}