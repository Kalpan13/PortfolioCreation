var express = require('express');
var tradeRouter = express.Router();
var Trades = require('../models/trade');
var chalk = require('chalk');
var utils = require('../helpers/utils');

tradeRouter.route('/')
  .get((req, res, next) => {
    res.statusCode = 405;
    res.end('GET operation not supported on /trades');
  })

  .post((req, res, next) => {
    Trades.findOne({ 'ticker': req.body.ticker }, (err, trade) => {
      if (trade) {
        res.statusCode = 403;
        res.end('Trade with this ticker already exist. Use PUT to update the trade.')
      }
      else {
        Trades.create(req.body)
          .then((trade) => {
            res.statusCode = 200;
            res.end('Trade created sucessfully');
            console.log(chalk.green(`Trade ${req.body.ticker} created successfully !!`));
          }, (err) => {
            res.statusCode = 403;
            res.json({
              message: err.message,
              error: err
            });
          })
          .catch((err) => {
            res.statusCode = 403;
            res.json({
              message: err.message,
              error: err
            });
          })
        }
    })
  });

tradeRouter.route('/:tradeID')
  .put((req, res, next) => {

    const tradeObj = req.body;
    const Ticker = req.params.tradeID;

    if (!tradeObj.operation) {
      res.statusCode = 403;
      res.end('Operation must be defined in PUT /trade endpoint. (buy, sell, change)');
    }
    if (tradeObj.operation == 'buy') {
      Trades.findOne({ 'ticker': Ticker }, (err, trade) => {

        if (err) {
          res.statusCode = 403;
          res.json({
            message: err.message,
            error: err
          });
        }
        else if (!trade) {

          const tradeDict = {
            "ticker": Ticker,
            "avgBuyPrice": tradeObj.buyPrice,
            "numShares": tradeObj.numShares,
            "cName": tradeObj.cName
          }
          Trades.create(tradeDict)
            .then((trade) => {
              res.statusCode = 200;
              res.end('Trade baught sucessfully');
              console.log(chalk.green(`Trade ${tradeDict.ticker} baught successfully !!`));
            }, (err) => {
              res.statusCode = 403;
              res.json({
                message: err.message,
                error: err
              });
            })
            .catch((err) => {
              res.statusCode = 403;
              res.json({
                message: err.message,
                error: err
              });
            })
        }
        else {
          console.log('---> Trying to buy shares');

          const oldShares = trade.numShares;
          const avgBuyPrice = trade.avgBuyPrice;
          const buyShares = tradeObj.numShares;
          const buyPrice = tradeObj.buyPrice;

          const newTrade = utils.calculateAvgPrice(oldShares, avgBuyPrice, buyShares, buyPrice);
          trade.avgBuyPrice = newTrade.newAvgBuyPrice;
          trade.numShares = newTrade.newShares;

          trade.save((err) => {
            if (err) {
              console.log(err);
              res.statusCode = 403;
              res.end(err);
            }
            else {
              res.statusCode = 200;
              res.send(`${buyShares} Shares of ${Ticker} baught successfully..!!`);
            }
          });  
        }
      })
    }
    if (tradeObj.operation == 'sell') {
      
      Trades.findOne({ 'ticker': Ticker }, (err, trade) => {
        if (err) {
          res.statusCode = 403;
          res.json({
            message: err.message,
            error: err
          });
        }
        else if (!trade) {
          res.statusCode = 403;
          res.end(`No Trade present of given ticker : ${Ticker}`);
        }
        else {
          const sellShares = tradeObj.sellShares;
          var newShares = trade.numShares - sellShares; 
          if(newShares<0)
          {
            res.statusCode = 403;
            res.end(`You can't sell more than : ${trade.numShares}`);
          }
          else if(newShares==0)
          {
            Trades.findOneAndRemove({ 'ticker': Ticker }, (err, trade) => {
              if (err || !trade) {
                res.statusCode = 403;
                res.end("Error while Deleting. Please check the Ticker");
              }
              else {
                res.statusCode = 200;
                res.end(`${Ticker} sold successfully!`);
              }
            })
          }
          else{
            trade.numShares = newShares;

            trade.save((err) => {
              if (err) {
                console.log(err);
                res.statusCode = 403;
                res.end(err);
              }
              else {
                res.statusCode = 200;
                res.send(`${sellShares} Shares of ${Ticker} sold successfully..!!`);
              }
            }); 
          }
        }
      })
    }
  })
  .delete((req, res, next) => {
    const Ticker = req.params.tradeID;

    Trades.findOneAndRemove({ 'ticker': Ticker }, (err, trade) => {
      if (err || !trade) {
        res.statusCode = 403;
        res.end("Error while Deleting. Please check the Ticker");
      }
      else {
        res.statusCode = 200;
        res.end(`${Ticker} deleted successfully!`);
      }
    })
  });

module.exports = tradeRouter;
