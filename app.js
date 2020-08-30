var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var swaggerUI = require('swagger-ui-express');
var swaggerJsDoc = require('swagger-jsdoc');
var mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config();

var usersRouter = require('./routes/users');
var tradesRouter = require('./routes/trades');
var holdingRouter = require('./routes/holdings');
var returnRouter = require('./routes/returns');
const port = process.env.PORT || 5000;
const MONGO_URI=process.env.MONGO_URI;

const swaggerOptions = {
  swaggerDefinition : {
    info : {
      version : "1.0.0",
      title : "API Doc for Portfolio creation",
      description : "This document contains all the APIs documentation for the project",
    contact : {
      name : "Kalpan Tumdi",
      email : "kalpantumdi@gmail.com"
    },
    servers : ['http://localhost:5000']
  }
},
  apis : ["app.js"]
};

// const parser = new SwaggerParser()
// const apiDescription = await parser.validate('my-api.yml')
// const connect = swaggerRoutes(api, apiDescription)


//const swaggerDocs = swaggerJsDoc(swaggerOptions);
var app = express();

// // view engine setup
//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

mongoose.connect(MONGO_URI, { useNewUrlParser:true , useUnifiedTopology: true })
    .then(()=> console.log('MongoDB connected'))
    .catch((err) => console.log(err));

app.use(express.urlencoded( {extended : false}));
//app.use("/api-docs/", swaggerUI.serve,swaggerUI.setup(swaggerDocs));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// //app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/trades',tradesRouter);
app.use('/holdings',holdingRouter);
app.use('/returns',returnRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
 // res.render('error');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});