const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new Schema({
  username: { type: String, required: true },
  description: String,
  duration: Number,
  date: String // Can this be date?
  // _id: String
});

const userSchema = new Schema({
  username: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const createAndSaveUser = (newUsername, done) => {
  let newUser = new User({ username: newUsername});
  
  newUser.save((err, data) => {
    if(err) return console.error(err);
    done(null, data);
  });
};

const createAndSaveExercise = (userId, desc, dur, date, done) => {
  User.findById(userId, (err, user) => {
    if(err) return console.error(err);
    
    let newExerData = new Exercise({
      username: user.username,
      description: desc,
      duration: dur,
      date: date
    });

    newExerData.save((err, data) => {
      if(err) return console.error(err);
      done(null, data);
    });
  });
};

const findAllUsers = (done) => {
  User.find((err, data) => {
    if(err) return console.error(err);
    done(null, data);
  }).select({username: 1, _id: 1});
}

const getAllLogs = (userId, from, to, limit, done) => {
  User.findById(userId, (err, user) => {
    if(err) return console.error(err);
    
    Exercise.find({ username: user.username }, { username: 0, _id: 0, __v: 0 }, (err, data) => {
      if(err) return console.error(err);

      console.log("Initial logs: ", data);
      
      let newData = {};
      newData.username = user.username;
      newData._id = userId;
      
      if(from != null) {
        let fromMilliSeconds = new Date(from);

        data = data.filter((el) => {
          return new Date(el.date) >= fromMilliSeconds;
        });
      }

      if(to !== null) {
        let toMilliSeconds = new Date(to);
        
        data = data.filter((el) => {
          return new Date(el.date) <= toMilliSeconds;
        });
      }

      if(limit !== null) {
        data = data.slice(0, limit);
      }
      
      newData.count = data.length;
      newData.log = data;
      
      done(null, newData);
    });
  });
}

app.post("/api/users", (req, res, done) => {
  createAndSaveUser(req.body.username, (err, data) => {
    res.json({
      "username": data.username,
      "_id": data._id 
    });

    done(null, data);
  });
});

app.post("/api/users/:_id/exercises", (req, res, done) => {
  createAndSaveExercise(req.params._id, req.body.description, req.body.duration, req.body.date? new Date(req.body.date).toDateString(): new Date().toDateString(), (err, data) => {
    if(err) return console.error(err);
    
    res.json({
      "_id": req.params._id,
      "username": data.username,
      "date": data.date,
      "duration": data.duration,
      "description": data.description
    });

    done(null, data);
  });
});

app.get("/api/users", (req, res, done) => {
  findAllUsers((err, data) => {
    if(err) return console.error(err);
    res.send(data);

    done(null, data);
  });
});

app.get("/api/users/:_id/logs", (req, res, done) => {
  getAllLogs(req.params._id, req.query.from || null, req.query.to || null, req.query.limit || null, (err, data) => {
    if(err) return console.log(err);
    console.log("The logs final: ", data);

    res.json(data);

    done(null, data);
  })
});
  
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})