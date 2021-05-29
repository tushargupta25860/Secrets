//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const bodyParser = require('body-parser');
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy  =     require('passport-facebook').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const prompt = require('prompt-sync')({sigint: true});

const app = express();

var message;


app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const client = mongoose.connect("mongodb+srv://tushar-gupt:Tusha_78165@cluster0.mwrzr.mongodb.net/open?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret:   [
    String
  ]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
User.findById(id,function(err,user){
  done(err,user);
});
});

//needed to change the gogle url and also the google oauth url
passport.use(new GoogleStrategy({
    clientID: "443014414802-7cmhqr6qn8ciu7ng9len7knj83et4ulo.apps.googleusercontent.com",
    clientSecret: "ZgTB6je9v5a1JOMb5ce20n3L",
    callbackURL: "https://pacific-plateau-50955.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: 1184911205314020,
    clientSecret: "5722a38ede787162ff934ea48e254a59 ",
    callbackURL: "https://pacific-plateau-50955.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// 118203930730252195049

app.get('/', function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google",{scope : ['profile',"email"]})
);

app.get("/auth/google/secrets",
passport.authenticate("google",{failureRedirect : "login"}),
function(req, res){
  res.redirect('/secrets');
}
);

app.get('/auth/facebook', passport.authenticate('facebook',{scope:['semail']}));


app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {failureRedirect: 'login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/login', function(req, res) {
  res.render("login");
});



app.get("/submit",function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("login");
  }
});


app.post("/submit",async function(req, res){
  const submittedrequest = req.body.secret;
  // if(req.isAuthenticated()){
  //   req.user.secret = req.secret;
  //   res.redirect("secrets");
  // }else{
  //   res.redirect("login");
  // }
  await User.findById(req.user.id, function(err,foundUser){
    if(!err){
      if(foundUser){
        foundUser.secret.push(submittedrequest);
        foundUser.save(function(err){
          if(err){
            console.log(err);
          }else{
            res.redirect("secrets");
          }
        });
      }
    }else{
      console.log(err);
    }
  });
});

app.get('/register', function(req, res) {
  res.render("register");
});

app.get("/secrets", async function(req, res) {
  // const submittedrequest = req.body.secret;
  await User.find({"secret": {$ne: null}}, function(err,foundUser){
    if(err){
    console.log(err);
    }else{
      if(foundUser){
        res.render("secrets",{foo: foundUser});
      }
    }
  });
});



app.post("/edit",function(req,res){
       res.render("edit",{foo: req.body.checkbox});
});

app.post("/edited",async function(req, res){
  const oldtag = req.body.hid;
  await  User.updateOne(
    { _id: req.user.id },
    { $pull: { secret: oldtag } }
  ,function(err){
    if(err){
      console.log(err)
    }
  });
  const submittedrequest = req.body.secret;
  await User.findById(req.user.id, function(err,foundUser){
    if(!err){
      if(foundUser){
        foundUser.secret.push(submittedrequest);
        foundUser.save(function(err){
          if(err){
            console.log(err);
          }else{
            res.redirect("profile");
          }
        });
      }
    }else{
      console.log(err);
    }
});
});
app.post("/register", async function(req, res) {

await  User.findOne({ username: req.body.username}, async function(err,foundUser){
    if(err){

    }else if(foundUser){
          res.send("user is already found");
    }else{
      await User.register({
        username: req.body.username
      }, req.body.password, function(err, user) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets");
          });
        }
      });
    }
  });
});

app.post("/delete", async function(req, res){
  console.log(req.body.checkbox);
  if(req.isAuthenticated()){
  await  User.updateOne(
    { _id: req.user.id },
    { $pull: { secret: req.body.checkbox } }
  ,function(err){
    if(err){
      console.log(err)
    }else{
      res.redirect("/profile");
    }
  });
}else{
  res.redirect("/login");
}
   // res.redirect("/profile");
});

app.get("/profile", async function(req, res){
  if(req.isAuthenticated()){
    await User.findById(req.user.id, function(err, foundUser){
       if(err){
           console.log(err);
       }else{
         if(foundUser)
        res.render("profile",{user: foundUser.secret});
    }
    });
  }else{
    res.redirect("/login");
  }
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect("/");
});


app.post("/login", function(req, res) {
  const newUser = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(newUser, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
