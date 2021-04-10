// require dotenv as soon as possible
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');

//These configuration should be done strictly in this order only
const session = require("express-session");
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')

const app = express();

// const bcrypt = require('bcrypt')

// brcrypt configuration
// const saltRounds = 10;


const port = 3000;
app.set('view engine', 'ejs');
// const md5 = require("md5")
// const encrypt = require("mongoose-encryption")

app.use(bodyParser.urlencoded({
  extended: true
}));

// Place app.use() for session beneath the app.use for other ones and before mongoose.connect
app.use(session({
  secret: 'asdf',
  resave: false,
  saveUninitialized: true,
}))
// Cookies are lost if server is restarted.
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("user", userSchema)

// Using mongoose-encryption 
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

// Simplified Passport/Passport-Local Configuration
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render("home");
});

app.get('/login', function (req, res) {
  res.render("login");
});

app.get('/register', function (req, res) {
  res.render("register");
});
app.get('/logout', function (req, res) {
  req.logout(); // this also comes from passport.js docs
  res.redirect('/');
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render('secrets');
  } else {
    res.redirect("/login");
  }
});

app.post("/register", function (req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (!err) {
      console.log('Successfully registered the user.');
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets")
      })
    } else {
      console.log(err);
      res.redirect("/register")
    }
  })

  /*
  Using bcrypt

  bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    const newUser = new User({
      email: req.body.username,
      password: hash,
    });
    newUser.save(function (err) {
      if (!err) {
        console.log('Successfully registered the user.')
        res.render("secrets")
      } else {
        console.log(err);
      }
    });

  })*/

});

app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password,
  })

  req.login(user, function (err) {
    if (!err) {
      console.log('Successfully logged in');
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets")
      })
    } else {
      console.log(err);
    }
  }) // this method comes from passport documentation

  /*
  Using bcrypt
  
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email:username}, function(err, foundUser){
    if (!err) {
        if(foundUser){
          bcrypt.compare(password, foundUser.password, function (err, result) {
            // result == true

            if(result===true){
              res.render("secrets")
            }
          });
        }
    } else {
      console.log(err);
    }
  });
  */
});

app.listen(port, function () {
  console.log('Example app listening on port')
})

/*
Using md5 function only

const newUser = new User({
  email: req.body.username,
  password: md5(req.body.password),
});

*/