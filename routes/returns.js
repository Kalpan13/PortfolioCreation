var express = require('express');
var returnRouter = express.Router();
var Trade = require('../models/trade');
var utils = require('../helpers/utils');

returnRouter.route('/')
.get((req,res,next) => {
   // Fetching holdings
    utils.getHoldings((err,holds)=> {
        // Fetch corresponding trades
        utils.findTrades(holds,(err,holdList) =>{
            if(!err) {
                // Calculate Returns
                var returns = utils.calculateReturns(holdList);
                res.statusCode = 200;
                res.json({
                    returns :returns
                });
            }
            else {
                res.statusCode = 402;
                res.json({
                    message: err.message,
                    error: err
                });
            }                    
        });
    });
    
});

module.exports=returnRouter;