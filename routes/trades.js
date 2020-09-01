var express = require('express');
var tradeRouter = express.Router();
var Trades = require('../models/trade');
var chalk = require('chalk');
var utils = require('../helpers/utils');
var Holdings = require('../models/holding');
const e = require('express');
// tradeRouter.route('/')
//   .get((req, res, next) => {
//     res.statusCode = 405;
//     res.end('GET operation is not supported on /trades');
//   })
//   .post((req, res, next) => {
//     Trades.findOne({'ticker': req.body.ticker})
//     .then((trade)=> {
//       if(trade) {
//         res.statusCode = 403;
//         res.end('Trade with this ticker already exist. Use PUT to (update / buy / sell) the trade.')
//       }
//       else {
//         const req_body = req.body;
//         req_body.operation = 'buy';
//         req_body.numSharesBought = req.body.numShares;
//         Trades.create(req_body)
//         .then((trade) => {
//           res.statusCode = 200;
//           res.end(`Trade ${req_body.ticker} created successfully !!`);
//           console.log(chalk.green(`Trade ${req_body.ticker} created successfully !!`));
//         },(err) => {
//           res.statusCode = 403;
//           res.json({
//             message: err.message,
//             error: err
//           });
//         })
//         .catch((err) => {
//           res.statusCode = 403;
//           res.json({
//             message: err.message,
//             error: err
//           });
//         })
//       }
//     },(err)=> {
//         res.statusCode = 403;
//         res.json({
//           message: err.message,
//           error: err
//         });
//     })
//     .catch((err) => {
//       res.statusCode = 403;
//       res.json({
//         message: err.message,
//         error: err
//       });
//     })
//   })
   
//   .put((req, res, next) => {
//     res.statusCode = 405;
//     res.end('PUT operation not supported on /trades');
//   })
//   .delete((req, res, next) => {
//     res.statusCode = 405;
//     res.end('DELETE operation not supported on /trades');
//   })

tradeRouter.route('/')
  .get((req, res, next) => {
    res.statusCode = 405;
    res.end('GET operation not supported on /trades/'+req.params.tradeID);
  })
  .post((req, res, next) => {
    const tradeObj = req.body;
    const Ticker = req.params.tradeID;

    if (!tradeObj.operation) {
      res.statusCode = 403;
      res.end('Operation must be defined in PUT /trade endpoint. (buy or sell)');
    }
    if (tradeObj.operation == 'buy') {
      // Trades.findOne({'ticker': Ticker })
      // .then((trade) => {
        // if(!trade){
        //   res.statusCode = 403;
        //   res.end(`Add a trade of ${Ticker} before buying it. Using POST /trades..!`);
        // }
        // else {
          console.log('Trying to buy shares of'+Ticker);
          const tradeObj = req.body;

          tradeObj.numSharesBought = tradeObj.numShares;
          tradeObj.operation = "buy";

          Trades.create(tradeObj)
          .then((trade) => {
            
            //res.end(`${trade.numShares} shares of ${trade.ticker} baught successfully !!`);
            console.log(chalk.green(`${trade.numShares} shares of ${trade.ticker} baught successfully !!`));
            
            Holdings.findOne({'ticker': tradeObj.ticker})
            .then((holding)=> {
              
              if(!holding) {
                holding = {
                  "ticker" : tradeObj.ticker,
                  "numShares":tradeObj.numShares
                }
                Holdings.create(holding)
                .then((holding)=>{console.log("Holding Created")})
                .catch((err)=> {})
              }
              else {
                holding.numShares = (tradeObj.numShares + holding.numShares);
              }
              holding.save((err) => {
                if(err)
                {
                  res.statusCode = 402;
                  res.json({
                  message: err.message,
                  error: err
                  })
                }
                else {
                  //res.statusCode = 200;
                  console.log("Holdings Created.")
                }
              });

              },(err) => {
                  console.log("Error while searching Holding");
                  res.statusCode = 402;
                  res.json({
                  message: err.message,
                  error: err
                  })
              })
              .catch((err)=> {
                console.log("Error while searching Holding in catch");
                res.statusCode = 402;
                res.json({
                message: err.message,
                error: err
                })
              }); 
            
              res.statusCode = 200;
              res.json({
                message : `${trade.numShares} shares of ${trade.ticker} baught successfully..!`,
                Trade : {
                  "ticker":trade.ticker,
                  "numShares":trade.numSharesBought,
                  "buyPrice":trade.buyPrice
                } 
              });

            },err=> {

            })
            .catch((err) => {
              res.statusCode = 402;
              res.json({
              message: err.message,
              error: err
              })
            });

          }
    
    else if (tradeObj.operation == 'sell') {
        
      Trades.find({'ticker': Ticker })
      .then((trade) => {
        if(!trade || trade.length==0){
          res.statusCode = 403;
          res.end(`Add a trade of ${Ticker} before selling it. Use POST /trades..!`);
        }
        else {

        }
      
          // const tradeDict = {
          //   "ticker": Ticker,
          //   "buyPrice": tradeObj.buyPrice,
          //   "numShares": tradeObj.numShares,
          //   "cName": tradeObj.cName,
          //   "operation":tradeObj.operation
          // }
          // Trades.create(tradeDict)
          //   .then((trade) => {
          //     res.statusCode = 200;
          //     res.end(`${tradeDict.numShares} of ${tradeDict.ticker} baught sucessfully`);
          //     console.log(chalk.green(`Trade ${tradeDict.ticker} baught successfully !!`));
          //   }, (err) => {
          //     res.statusCode = 403;
          //     res.json({
          //       message: err.message,
          //       error: err
          //     });
          //   })
          //   .catch((err) => {
          //     res.statusCode = 403;
          //     res.json({
          //       message: err.message,
          //       error: err
          //     });
          //   })
        });
      }
    
        else {
          console.log('Trying to buy more shares of'+Ticker);

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
    /*}
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
*/
module.exports = tradeRouter;
