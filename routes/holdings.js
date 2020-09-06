var express = require('express');
var holdingRouter = express.Router();
var Holdings = require('../models/holding');
var Trades = require('../models/trade');
var utils = require('../helpers/utils');

holdingRouter.route('/')

.get((req,res,next) => {
    // fetch holdings
    utils.getHoldings((err,holds)=> {
        // fetch corresponding trades
        
        utils.findTrades(holds,(err,holdList) =>{
            if(!err)
            {
                res.statusCode=200;
                res.json({
                "holdings":holdList
                });
            }
            else {
                res.statusCode=403;
                res.json({
                    message: err.message,
                    error: err
                });
            }                    
        });
    });
});
           
module.exports=holdingRouter;