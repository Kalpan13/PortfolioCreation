var express = require('express');
var holdingRouter = express.Router();
var Holding = require('../models/holding');

holdingRouter.route('/')
.get((req,res,next) => {
    var query = Holding.find({}).select('-_id ticker avgBuyPrice numShares');
    query.exec((err,holds) => {
        if(err)
        {
           res.statusCode=403;
           res.end("Error while fetching results from DB");
        }
        else {
            console.log("Found holds");
            res.statusCode=200;
            res.json(holds);
        }
    })
})

module.exports=holdingRouter;