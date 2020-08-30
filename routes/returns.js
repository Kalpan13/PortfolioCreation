var express = require('express');
var returnRouter = express.Router();
var Trade = require('../models/trade');
var utils = require('../helpers/utils');

returnRouter.route('/')
.get((req,res,next) => {
    var query = Trade.find({}).select('-_id ticker avgBuyPrice numShares');
    query.exec((err,trades) => {
        if(err)
        {
           //console.log("Error while fetching trades "+err);
        //    res.statusCode=403;
        //    res.end("Error while fetching results from DB");
            next(err);
        }
        else {
            if(!trades)
            {
                res.statusCode = 403;
                res.end("No trades found");
            }
            else{
                res.statusCode=200;
                res.json({returns :utils.calculateReturns(trades) });
            }
            
        }
    })
})

module.exports=returnRouter;