const express = require('express');
const app = express();
/*const morgan = require('morgan');*/
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const userRoutes = require('./api/routes/user');
const commentsRoutes = require('./api/routes/comments');
const ratingRoutes = require('./api/routes/rating');

mongoose.connect('mongodb+srv://Connor:'+process.env.MANGO_DB_PASS+'@online-cinema.z2yeylw.mongodb.net/mywathclist-db?retryWrites=true&w=majority');

app.use((req, res,  next) =>
{
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if(req.method === 'OPTIONS')
    {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
        return res.status(200).json({});
    }
    next();
});

/*app.use(morgan('dev'));*/
app.use('/usersProfilePics', express.static('usersProfilePics'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json({}));

app.use('/user', userRoutes);
app.use('/comments', commentsRoutes);
app.use('/rating', ratingRoutes);

app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) =>
{
    res.status(error.status || 500);
    res.json({
        error: error.message
    });
});

module.exports = app;