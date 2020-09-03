var express = require("express");
var tradeRouter = express.Router();
var Trades = require("../models/trade");
var chalk = require("chalk");
var utils = require("../helpers/utils");
var Holdings = require("../models/holding");
const e = require("express");
const trades = require("../models/trade");
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

tradeRouter.route("/")
  .get((req, res, next) => {
    Trades.find(({}))
    .select('_id ticker numShares buyPrice operation')
    .then((trades) => {
      res.statusCode=200;
      res.json({
        trades : trades
      });
    })
    .catch((err) => {

    })
  })

  .post((req, res, next) => {
    const Ticker = req.params.tradeID;

    const tradeObj = req.body;
    if (!tradeObj.operation) {
      res.statusCode = 403;
      res.end(
        "Operation must be defined in POST /trade endpoint. (buy or sell)"
      );
    }
    if (tradeObj.operation == "buy") {
      console.log("Trying to buy shares of" + Ticker);

      // Creting tradeObj for insertion in DB
      tradeObj.numSharesBought = tradeObj.numShares;
      tradeObj.operation = "buy";

      Trades.create(tradeObj)
        .then(
          (trade) => {
            console.log(
              chalk.green(
                `${trade.numShares} shares of ${trade.ticker} baught successfully !!`
              )
            );

            // Adding No. of Shares in Holdings
            Holdings.findOne({ ticker: tradeObj.ticker })
              .then(
                (holding) => {
                  if (!holding) {
                    // If holding corresponding to the trade's ticker doesn't exist : Create new

                    holding = {
                      ticker: tradeObj.ticker,
                      numShares: tradeObj.numShares,
                    };
                    Holdings.create(holding)
                      .then((newHolding) => {
                        console.log(`Holding Created for ${tradeObj.ticker}`);
                      })
                      .catch((err) => {
                        res.statusCode = 402;
                        res.json({
                          message: err.message,
                          error: err,
                        });
                      });
                  } else {
                    // If holding corresponding to the trade's ticker exist : Update no. shares

                    holding.numShares = tradeObj.numShares + holding.numShares;
                    holding.save((err) => {
                      if (err) {
                        res.statusCode = 402;
                        res.json({
                          message: err.message,
                          error: err,
                        });
                      } else {
                        console.log(`Holdings Updated for ${tradeObj.ticker}`);
                      }
                    });
                  }
                },
                (err) => {
                  console.log("Error while searching Holding");
                  res.statusCode = 402;
                  res.json({
                    message: err.message,
                    error: err,
                  });
                }
              )
              .catch((err) => {
                console.log("Error while searching Holding in catch");
                res.statusCode = 402;
                res.json({
                  message: err.message,
                  error: err,
                });
              });
            // Successful Holing and Trade Creation
            res.statusCode = 200;
            res.json({
              message: `${trade.numShares} shares of ${trade.ticker} baught successfully..!`,
              Trade: {
                ticker: trade.ticker,
                numShares: trade.numSharesBought,
                buyPrice: trade.buyPrice,
              },
            });
          },
          (err) => {
            res.statusCode = 402;
            res.json({
              message: err.message,
              error: err,
            });
          }
        )
        .catch((err) => {
          res.statusCode = 402;
          res.json({
            message: err.message,
            error: err,
          });
        });
    } else if (tradeObj.operation == "sell") {
      Holdings.findOne({ ticker: tradeObj.ticker }).then((holding) => {
        if (!holding) {
          // holding not present
          res.statusCode = 403;
          res.end(
            `Add a trade of "${tradeObj.ticker}" before selling it. Use POST /trades..!`
          );
        } else {
          // Holding present, shares to sell > bought shares
          if (holding.numShares - tradeObj.numShares < 0) {
            res.statusCode = 403;
            res.end(
              `Only ${holding.numShares} of ${tradeObj.ticker} shares can be sold..!`
            );
          } else if (holding.numShares - tradeObj.numShares == 0) {

            // Holding present, shares to sell == bought shares : remove holding
            Holdings.deleteOne({ ticker: tradeObj.ticker })
              .then((deleted) => {})
              .catch((err) => {
                res.statusCode = 402;
                res.json({
                  message: err.message,
                  error: err,
                });
              });
          } else {
            // Holding present, shares to sell < bought shares : Update holding
            holding.numShares = holding.numShares - tradeObj.numShares;
            holding.save((err) => {
              if (err) {
                console.log(err);
                res.statusCode = 403;
                res.json({
                  message: err.message,
                  error: err,
                });
              } else {
                console.log(`Holding of ${tradeObj.ticker} updated successfully..!`);
              }
            });
          }
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
        
        // Insert Sell trade into DB
        const sellObj = {
          ticker: tradeObj.ticker,
          numShares: tradeObj.numShares,
          operation: tradeObj.operation,
        };
        Trades.create(sellObj)
          .then(
            (trade) => {
              res.statusCode = 200;
              res.send(
                `${trade.numShares} shares of ${tradeObj.ticker} sold successfully..!`
              );
            },
            (err) => {
              res.statusCode = 403;
              res.json({
                message: err.message,
                error: err,
              });
            }
          )
          .catch((err) => {
            res.statusCode = 403;
            res.json({
              message: err.message,
              error: err,
            });
          });
      });
    } else {
      res.statusCode = 403;
      res.end("Option must be 'buy' or 'sell'");
    }
  });

tradeRouter.route("/:tradeID")
.get((req,res,next) => {
  

  Trades.findById(tradeID)
  .select('_id ticker numShares buyPrice operation createdAt')
  .then((trade) => {
    res.statusCode = 200;
    res.json(trade);
  },(err)=> {})
  .catch((err) => {

  })
})
.put((req,res,next) => {
	const tradeID = req.params.tradeID;
	const updateObj = req.body;

	//if(('ticker' in updateObj) && ('numShares' in updateObj )
	Trades.findById(tradeID)
	.then((trade)=> {
		for(key in updateObj)
		{
			if(key=='ticker')
			{
				if(trade[key]!=updateObj[key])
				{
					console.log("TIcker not matching");
				}	
			}
		}
	})

})
module.exports = tradeRouter;
