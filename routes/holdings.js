var express = require('express');
var holdingRouter = express.Router();
var Holdings = require('../models/holding');
var Trades = require('../models/trade');
var utils = require('../helpers/utils');

holdingRouter.route('/')

.get((req,res,next) => {

    utils.getHoldings((err,holds)=> {
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