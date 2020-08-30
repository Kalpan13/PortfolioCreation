var express = require('express');
var holdingRouter = express.Router();
var Trade = require('../models/trade');

holdingRouter.route('/')
.get((req,res,next) => {
    var query = Trade.find({}).select('-_id ticker avgBuyPrice numShares');
    query.exec((err,trades) => {
        if(err)
        {
           //console.log("Error while fetching trades "+err);
           res.statusCode=403;
           res.end("Error while fetching results from DB");
        }
        else {
            console.log("Found some holdings");
            console.log("Found Trades");
            res.statusCode=200;
            res.json(trades);
        }
    })
})

module.exports=holdingRouter;