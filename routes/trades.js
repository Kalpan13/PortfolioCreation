var express = require("express");
var tradeRouter = express.Router();
var Trades = require("../models/trade");
var chalk = require("chalk");
var utils = require("../helpers/utils");
var Holdings = require("../models/holding");

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
        res.statusCode = 200;
        res.json({
          trades: trades
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

      utils.createTrade(tradeObj,(err,trade)=> 
      {
        if(err)
        {
          res.statusCode = 402;
          res.json({
            message: err.message,
            error: err,
          });
          return;
        }
        // Adding No. of Shares in Holdings
        Holdings.findOne({ ticker: tradeObj.ticker })
          .then((holding) => 
            {
              if (!holding) {
                // If holding corresponding to the trade's ticker doesn't exist : Create new
                holding = {
                  ticker: tradeObj.ticker,
                  numShares: tradeObj.numShares,
                };                   
                utils.createHolding(holding,(err,newHolding)=> {
                  if(err)
                  {
                    res.end("Could not create Holding");
                    return;
                  }
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
            },(err) => {
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
              return;
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
          });
    }
    
    else if (tradeObj.operation == "sell") {
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
  })
  .delete((req,res,next)=> {
    console.log("Deleting");
    Trades.collection.drop();
    Holdings.collection.drop();
    res.end("Deleted All");
  });
  

tradeRouter.route("/:tradeID")
  .get((req, res, next) => {
    const tradeID = req.params.tradeID;

    Trades.findById(tradeID)
      .select('_id ticker numShares buyPrice operation createdAt')
      .then((trade) => {
        res.statusCode = 200;
        res.json(trade);
      }, (err) => { })
      .catch((err) => {

      })
  })
  .put((req, res, next) => {
    const tradeID = req.params.tradeID;
    const updateObj = req.body;

    console.log("PUT request received");

    Trades.findById(tradeID)
      .then((trade) => {
        if (trade) {
          
          /*
             3 changes possible 

             1. Change in Ticker
             2. Change in Number of Shares
             3. Change in Operation

             Only 1 at a time is supprted as of now. 

          */
          
          const updateTicker = updateObj.ticker;
          const updateNumShares = updateObj.numShares;
          const updateOperation = updateObj.operation;
          if((!updateTicker) && (updateNumShares) && (!updateOperation))
            {
              if (trade.operation == 'buy') {

                // For operation buy : update the trade
                if (updateObj.numShares > 0) {
                  var oldShares = trade.numShares;
                  trade.numShares = updateObj.numShares;
                  trade.numSharesBought = trade.numShares;
                  var newShares = updateObj.numShares - oldShares;
                  console.log(`Adding ${newShares} in holdings`);
                  
                  // Updating Holdings
                  Holdings.findOneAndUpdate({ ticker: updateObj.ticker }, { $inc: { numShares: newShares } }, { new: true })
                    .then((holding) => {                    
                      trade.save((err) => {
                        if (err) {
                          res.statusCode = 403;
                          res.end("Error while saving the trade");
                          return;
                        }
                        res.statusCode=200;
                        res.json(trade);
                        return;
                      })
                    }, (err) => {
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
                }
                else {
                  res.statusCode=403;
                  res.end("Number of shares should be more than 0 for updating");
                }
              }
              else if (trade.operation == 'sell') {
                console.log("Selling Update");
                if (updateObj.numShares > 0) {
                  var oldShares = trade.numShares;
                  trade.numShares = updateObj.numShares;
                  var newShares = oldShares - updateObj.numShares;
                  console.log(`Removing ${newShares} in holdings`);
                
                  // Checking and Updating Holds
                  Holdings.find({ ticker: trade.ticker})
                    .then((holding) => {
                      if(holding)
                      {
                        var updatedShares = holding.numShares + newShares;
                        if(updatedShares>=0)
                        {
                          holding.numShares = updatedShares;
                          if(holding.numShares==0)
                          {
                            Holdings.findOneAndDelete({ticker:trade.ticker})
                            .then((holdDel)=>{
                              console.log("Hold Deleted");
                            })
                            .catch((err)=> {
                              res.statusCode = 403;
                              res.json({
                                message: err.message,
                                error: err,
                              });
                              return;
                            });
                          }
                          else {
                          holding.save((err)=>{
                            if(err)
                              {
                                res.statusCode = 403;
                                res.json({
                                  message: err.message,
                                  error: err,
                                });
                              }
                              else{
                               console.log("Holding Updated Successfully"); 
                               trade.numShares = updateObj.numShares;
                               trade.save((err)=>{
                                 if(err)
                                 {
                                  res.statusCode = 403;
                                  
                                 }
                                 else{
                                   res.statusCode=200;
                                   res.end("Trade updated successfully");
                                 }
                               })
                              }
                            })
                          }
                        }
                        else {
                          res.statusCode=403;
                          res.end(`Only ${holding.numShares} of ${holding.ticker} can be sold..`);
                          return;
                        }
                      }     
                },(err)=> {
                  res.json({
                    message: err.message,
                    error: err,
                  });
                  return;
                })
                .catch((err)=> {
                  res.json({
                    message: err.message,
                    error: err,
                  });
                  return;
                })
              }
              else {
                res.statusCode=403;
                res.end("Number of shares should be more than 0 for updating");
              }
            }
          }
      
        //   else if((updateTicker) && (!updateNumShares) && (!updateOperation))  
              
        //   Holdings.find(())
        //     }
            
        //   }
        // }
        // else {
        //   res.end("No Trade found");
        // }
      }
    })
  })
  .delete((req, res, next) => {
    const tradeID = req.params.tradeID;

    Trades.findByIdAndRemove(tradeID)
      .then((trade) => {
        if (trade) {
          res.statusCode = 200;
          res.end(`Trade with tradeID ${tradeID} removed successfully..!`);
        }
        else {
          res.statusCode = 200;
          res.end(`No trade Trade present with tradeID ${tradeID}.!`);
        }
      }, (err) => {
        res.statusCode = 403;
        res.json({
          message: err.message,
          error: err,
        });
      })
      .catch((err) => {
        res.statusCode = 403;
        res.json({
          message: err.message,
          error: err,
        });
      });
  });



module.exports = tradeRouter;
