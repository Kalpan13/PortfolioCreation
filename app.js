var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var swaggerUi = require('swagger-ui-express'),
    swaggerDocument = require('./swagger/swagger.json');


var mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config();

var tradesRouter = require('./routes/trades');
var holdingRouter = require('./routes/holdings');
var returnRouter = require('./routes/returns');
var indexRouter = require('./routes/base');
const port = process.env.PORT || 5000;
const MONGO_URI=process.env.MONGO_URI;




var app = express();

app.set('view engine', 'jade');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
mongoose.connect(String(MONGO_URI), { useNewUrlParser:true , useUnifiedTopology: true,  useFindAndModify: false  })
    .then(()=> console.log('MongoDB connected'))
    .catch((err) => console.log(err));

app.use(express.urlencoded( {extended : false}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/',indexRouter);
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
 
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});