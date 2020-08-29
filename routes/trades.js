var express = require('express');
var tradeRouter = express.Router();
var Trades = require('../models/trade');
var chalk = require('chalk');


tradeRouter.route('/')
.get((req, res, next) => {
  res.statusCode = 405;
  res.end('GET operation not supported on /trades');
})

.post((req,res,next) => {
  Trades.findOne({'ticker':req.body.ticker}, (err,trade) => {
    if(trade)
    {
      res.statusCode = 403;
      res.end('Trade with this ticker already exist. Use PUT to update the trade.')
    }
    else {
      Trades.create(req.body)
      .then((trade) => {
        res.statusCode = 200;
        res.end('Trade created sucessfully');
        console.log(chalk.green(`Trade ${req.body.ticker} created successfully !!`));
      },(err) => {
        res.statusCode = 403;
        res.json(err);
      })
      .catch((err) => {
        res.statusCode = 403;
        res.json(err);
      })
    }
  })
});

tradeRouter.route('/:tradeID')
.put((req, res, next) => {

  const tradeObj = req.body;
  const Ticker = req.params.tradeID;
  
  if (!tradeObj.operation)
  {
    res.statusCode = 403;
    res.end('Operation must be defined in PUT /trade endpoint. (buy, sell, change)');
  }
  if(tradeObj.operation =='buy')
  { 
    Trades.findOne({'ticker':Ticker}, (err,trade) => {
      
      if(err)
      {
        res.statusCode = 403;
        res.end(err);
      }
      if(!trade)
      {
        
        const tradeDict = {
          "ticker" : Ticker,
          "buyPrice" : req.body.buyPrice,
          "numShares" : req.body.numShares,
          "cName" : req.body.cName 
        }
        req.body["ticker"] = Ticker;
        delete req.body["operation"]
        Trades.create(req.body)
        .then((trade) => {
          res.statusCode = 200;
          res.end('Trade baught sucessfully');
          console.log(chalk.green(`Trade ${req.body.ticker} baught successfully !!`));
        },(err) => {
          res.statusCode = 403;
          res.json(err);
        })
        .catch((err) => {
          res.statusCode = 403;
          res.json(err);
        })
      }
      if(trade)
      { 
        
        const oldShares = trade.numShares;
        const avgBuyPrice = trade.buyPrice;
        const buyShares = req.body.numShares;
        const buyPrice = req.body.buyPrice;

        const newShares = (buyShares+oldShares);
        const newAvgBuyPrice = ((avgBuyPrice*oldShares) + (buyPrice*buyShares))/newShares;
        
        console.log('---> Trying to buy shares of '+newAvgBuyPrice);

        trade.buyPrice = newAvgBuyPrice;
        trade.numShares = newShares;

        trade.save((err) => {
          if(err) {
              console.log(err);
              res.statusCode=403;
              res.end(err);
          }
      });
      res.statusCode=200;
      res.send(`${buyShares} Shares of ${Ticker} baught successfully..!!`);
      }
    })
  }// Trades.findOneAndUpdate(tradeFilter,req.body,{ new: true, upsert: true }, (err,trade) => {
  //   if(err)
  //   {
  //     res.statusCode = 403;
  //     res.json(err);
  //   }
  //   else {
  //       res.statusCode = 200;
  //       res.end('Trade updated sucessfully');
  //       console.log(chalk.green(`Trade ${req.body.ticker} updated successfully !!`));
  //   }
  // })

})
.delete((req, res, next) => {
  const Ticker = req.params.tradeID;

  Trades.findOneAndRemove({'ticker':Ticker}, (err,trade) => {
    if(err || !trade)
    {
      res.statusCode = 403;
      res.end("Error while Deleting. Please check the Ticker");
    }
    else{
      res.statusCode = 200;
      res.end(`${Ticker} deleted successfully!`);
    }
  })
});

module.exports = tradeRouter;
