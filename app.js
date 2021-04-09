// require dotenv as soon as possible
require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const app = express();
const _ = require('lodash')
const bcrypt = require('bcrypt')

// brcrypt configuration
const saltRounds = 10;


const port = 3000;
app.set('view engine', 'ejs');
// const md5 = require("md5")
// const encrypt = require("mongoose-encryption")

app.use(bodyParser.urlencoded({
  extended: true
}));
mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
})

// Using mongoose-encryption 
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });


const User = mongoose.model("user", userSchema)

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

app.post("/register", function (req, res) {
  
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

  })
  
});

app.post("/login", function(req,res){
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