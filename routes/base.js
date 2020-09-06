var express = require('express');
var indexRouter = express.Router();

indexRouter.route('/')
.get((req,res,next) => {
    res.redirect('./api-docs');
});
           
module.exports=indexRouter;