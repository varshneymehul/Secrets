// require dotenv as soon as possible
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

//These configuration should be done strictly in this order only
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

const port = 3000;
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Place app.use() for session beneath the app.use for other ones and before mongoose.connect
app.use(
  session({
    secret: "first secret",
    resave: false,
    saveUninitialized: true,
  })
);
// Cookies are lost if server is restarted.
app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(process.env.DB_LINK)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, // here we are also registering the google ID into our database to later verify if the user is already registered in the website or not and if he is then log them in
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

// Simplified Passport/Passport-Local Configuration
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  if (user && user.doc) {
    // Google login returns user.doc
    done(null, user.doc._id.toString());
  } else if (user && user._id) {
    // Local strategy returns user directly
    done(null, user._id.toString());
  } else {
    done(new Error("Invalid user object"));
  }
});
passport.deserializeUser(function (id, done) {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      console.log(err);
    });
});

// Put google strategy after session initialization and serialize and deserialize user
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (request, accessToken, refreshToken, profile, done) {
      // console.log(profile);
      User.findOrCreate({
        googleId: profile.id,
      })
        .then((user) => {
          return done(null, user);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  )
);

app.use(express.static("public"));

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile"],
  })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    User.find({
      secret: {
        $ne: null,
      },
    })
      .then(function (foundUsers) {
        if (foundUsers) {
          res.render("secrets", {
            usersWithSecrets: foundUsers,
          });
        }
      })
      .catch(function (err) {
        console.log(err);
      });
  } else {
    res.redirect("/login");
  }
});
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  User.findById({
    _id: req.user._id,
  })
    .then(function (foundUser) {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save().then(() => {
          res.redirect("/secrets");
        });
      }
    })
    .catch(function (err) {
      console.log(err);
      res.redirect("/register");
    });
});

app.post("/register", function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password
  )
    .then(function (user) {
      console.log("Successfully registered the user.");
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    })
    .catch(function (err) {
      console.log(err);
      res.redirect("/register");
    });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (!err) {
      console.log("Successfully logged in");
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    } else {
      console.log(err);
    }
  }); // this method comes from passport documentation
});

app.listen(port, function () {
  console.log("Example app listening on port");
});
