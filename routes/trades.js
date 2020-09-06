var express = require("express");
var tradeRouter = express.Router();
var Trades = require("../models/trade");
var chalk = require("chalk");
var utils = require("../helpers/utils");
var Holdings = require("../models/holding");


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
    
    var tradeObj = req.body;
    if (!tradeObj.operation) {
      res.statusCode = 403;
      res.end(
        "Operation must be defined in POST /trade endpoint. (buy or sell)"
      );
    }
    if (tradeObj.operation == "buy") {
      console.log("Trying to buy shares of" + tradeObj.ticker);

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
        else 
        {
          utils.updateHolding(tradeObj,(err,holdingUpdated)=> {
            if(err)
            {     
              console.log("Error while updaing holding");
              res.statusCode=403;
              res.json({
                message:err.message,
                error : err
              });
              return;
            }
            else {        
              res.statusCode=200;
              res.json({
                message : `Trade created successfully`,
                trade : trade
              });
              return;
            }
          });
        }
      })
    }  
    else if (tradeObj.operation == "sell") {
      Holdings.findOne({ ticker: tradeObj.ticker }).then((holding) => {
        if (!holding) {
          // holding not present
          res.statusCode = 403;
          res.end(
            `Add a trade of "${tradeObj.ticker}" before selling it. Use POST /trades..!`
          );
        } 
        else {
          // Holding present, shares to sell > available shares
          if (holding.numShares - tradeObj.numShares < 0) {
            res.statusCode = 403;
            res.end(
              `Only ${holding.numShares} of ${tradeObj.ticker} shares can be sold..!`
            );
          } 
          else  
          {
            if (holding.numShares - tradeObj.numShares == 0) {
            // Holding present, shares to sell == available shares : remove holding
              Holdings.deleteOne({ ticker: tradeObj.ticker })
                .then((deleted) => {})
                .catch((err) => {
                  res.statusCode = 402;
                  res.json({
                    message: err.message,
                    error: err,
                  });
                });
            } 
            else {
            // Holding present, shares to sell < available shares : update holding
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
            var sellObj = {
              ticker: tradeObj.ticker,
              numShares: tradeObj.numShares,
              operation: tradeObj.operation,
            };
            
            utils.createTrade(sellObj,(err,trade)=> 
            {
              if(err)
              { 
                res.statusCode = 403;
                res.json({
                  message: err.message,
                  error: err,
                });
                return;
              }
              else 
              {
                res.statusCode=200;
                res.json({
                  message : "Trade created successfully..!",
                  trade : trade
                });

              }
            });
          }
        }
      })
    } 
    else {
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
        
        if(!trade)
        {
          res.statusCode=403;
          res.end("No trade found with given tradeID :"+tradeID);
        }
        else{
           /*
             3 changes possible 

             1. Change in Ticker
             2. Change in Number of Shares
             3. Change in Operation

             Only 1 at a time is supprted as of now. 
          */

          // TODO : 2 or 3 changes simultaneously
          const updateTicker = updateObj.ticker;
          const updateNumShares = updateObj.numShares;
          const updateOperation = updateObj.operation;
          if((!updateTicker) && (updateNumShares) && (!updateOperation))
            {
              // Update number of shares
              if (trade.operation == 'buy') 
              {
                //  For operation buy : update the trade
                if (updateObj.numShares > 0) {
                  var oldShares = trade.numShares;
                  trade.numShares = updateObj.numShares;
                  trade.numSharesBought = trade.numShares;
                  var newShares = updateObj.numShares - oldShares;
                  console.log(`Adding ${newShares} in holdings`);
                  
                  // Updating Holdings
                  Holdings.findOneAndUpdate({ ticker: trade.ticker }, { $inc: { numShares: newShares } }, { new: true })
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
                                  res.json({
                                    message: err.message,
                                    error: err,
                                  });
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
      
          else if((!updateTicker) && (!updateNumShares) && (updateOperation)) 
          {
            if(updateOperation=='buy')
            {
              if(trade.operation=='sell')
              {
                if(!updateObj.buyPrice)
                {
                  res.statusCode=403;
                  res.end("buyPrice must be specified for Operation : buy");
                }
                else 
                {
                  trade.operation='buy';
                  trade.buyPrice = updateObj.buyPrice;
                  trade.save((err)=> {
                    if(err)
                    {
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                      return;
                    }
                    var oldShares = trade.numShares;
                    var newShares = 2*oldShares;

                    Holdings.findOneAndUpdate({ ticker: trade.ticker }, { $inc: { numShares: newShares } }, { new: true })
                    .then((holding)=>{
                    if(holding)
                    {
                      res.statusCode=200;
                      res.json(trade);
                    }
                  },(err)=> {
                      res.statusCode=403;
                      res.json(({
                          message : err.message,
                          error : err
                        }));
                        return;
                  })
                  .catch((err)=> {
                    res.statusCode=403;
                    res.json(({
                        message : err.message,
                        error : err
                      }));
                      return;
                    })
                  });
                }
              }
            }
            else if(updateOperation=='sell')
            {
              if(trade.operation=='buy')
              {
                var sharesSell = 2*trade.numShares;
                utils.checkShares(sharesSell,trade.ticker,(err,possible,maxShares,holding)=>{
                  if(err)
                  {
                    res.statusCode=403;
                    res.json(({
                        message : err.message,
                        error : err
                      }));
                      return;
                  }
                  else if(possible)
                  {
                    holding.numShares = holding.numShares - sharesSell;
                    if(holding.numShares==0)
                    {
                      Holdings.findOneAndDelete({ticker:holding.ticker})
                      .then((holding)=>{
                        console.log("Holding removed");
                        trade.save((err)=>{
                          if(err)
                          {
                            res.statusCode=403;
                            res.json({
                              message : err.message,
                              error : err
                            });
                          }
                          else
                          {
                            res.statusCode=200;
                            res.json(trade);
                          }
                        });
                      },(err)=>{
                        res.statusCode=403;
                        res.json(({
                          message : err.message,
                          error : err
                        }));
                      })
                      .catch((err)=> {
                        res.statusCode=403;
                        res.json(({
                          message : err.message,
                          error : err
                        }));
                      })
                    }
                    else{
                      holding.save((err)=> {
                        if(err)
                        {
                          res.statusCode=403;
                          res.json({
                            message : err.message,
                            error : err
                          });
                        return;
                        }
                        else
                        {
                          console.log("Holding Updated");
                          trade.operation='sell';
                          trade.save((err)=>{
                            if(err)
                            {
                              res.statusCode=403;
                              res.json({
                                message : err.message,
                                error : err
                              });
                            }
                            else
                            {
                              res.statusCode=200;
                              res.json(trade);
                            }
                          })
                        }
                      });  
                    }
                  }
                  else if(!possible)
                  {
                    res.statusCode=403;
                    res.end(`Only ${maxShares} of given ticker can be sold`);
                  }
                });
              }
            }
            else{
              res.statusCode=403;
              res.end("Operation should either buy or sell");
            }
          }
          else if((updateTicker) && (!updateNumShares) && (!updateOperation))
          {
            const oldTicker = trade.ticker;
            const newTicker = updateTicker;
            if(trade.operation=='buy')
            {
              
              utils.checkShares(trade.numShares,trade.ticker,(err,possible,maxShares,holding)=>{
                if(err)
                {
                  res.statusCode=403;
                  res.json(({
                      message : err.message,
                      error : err
                    }));
                    return;
                }
                else if(possible)
                {
                  holding.numShares = holding.numShares - trade.numShares;
                  if(holding.numShares==0)
                  {
                    Holdings.findOneAndDelete({ticker:holding.ticker})
                    .then((holding)=>{
                      console.log("Holding removed");
                    },(err)=>{
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    })
                    .catch((err)=> {
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    })
                  }
                  else
                  {
                    holding.save((err)=> {
                      if(err)
                      {
                        res.statusCode=403;
                        res.json(({
                          message : err.message,
                          error : err
                        }));
                      return;
                      }
                      else
                      {
                        
                        console.log("Holding Updated");
                      }
                    });  
                  }
                  var newTradeObj = {
                    ticker : newTicker,
                    numShares : trade.numShares,
                  }
                  if(updateObj.buyPrice)
                    newTradeObj.buyPrice = updateObj.buyPrice;
                  else
                    newTradeObj.buyPrice = trade.buyPrice;

                  utils.updateHolding(newTradeObj,(err,newHolding)=>{
                    if(err)
                    {
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    }
                    else
                    {
                     console.log("Holding updated"); 
                     trade.ticker = newTicker;
                     trade.save((err)=>{
                       if(err)
                       {
                        res.statusCode=403;
                        res.json({
                          message : err.message,
                          error : err
                        });
                       }
                       else{
                         res.statusCode=200;
                         res.json(trade);
                       }
                     })
                    }
                  });
                }
                else if(!possible)
                {
                  res.statusCode=403;
                  res.end(`Only ${maxShares} of given ticker are remaining. Hence, this trade can't be updated`);
                }
              }); 
            }
            else if(trade.operation=='sell')
            {
              var oldTradeObj = {
                ticker : trade.ticker,
                numShares : trade.numShares
              }

              utils.checkShares(trade.numShares,newTicker,(err,possible,maxShares,holding)=>{
                if(err)
                {
                  res.statusCode=403;
                  res.json(({
                    message : err.message,
                    error : err
                  }));
                }
                else if(possible)
                {
                  holding.numShares = holding.numShares - trade.numShares;
                  if(holding.numShares==0)
                  {
                    Holdings.findOneAndDelete({ticker:holding.ticker})
                    .then((holding)=>{
                      console.log("Holding removed");
                    },(err)=>{
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    })
                    .catch((err)=> {
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    })
                  }
                  else
                  {
                    holding.save((err)=> {
                      if(err)
                      {
                        res.statusCode=403;
                        res.json(({
                          message : err.message,
                          error : err
                        }));
                      return;
                      }
                      else
                      {
                        console.log("Holding Updated");
                      }
                    });  
                  }
                  var newTradeObj = {
                    ticker : trade.ticker,
                    numShares : trade.numShares,
                  }
                  if(updateObj.buyPrice)
                    newTradeObj.buyPrice = updateObj.buyPrice;
                  else
                    {
                      res.statusCode=403;
                      res.end("This will buy the shares of old ticker and sell the shares of new one.Hence, buyPrice must be specified for the old ticker. ")
                    }

                  utils.updateHolding(newTradeObj,(err,newHolding)=>{
                    if(err)
                    {
                      res.statusCode=403;
                      res.json(({
                        message : err.message,
                        error : err
                      }));
                    }
                    else
                    {
                     console.log("Holding updated"); 
                     trade.ticker = newTicker;
                     trade.save((err)=>{
                       if(err)
                       {
                        res.statusCode=403;
                        res.json(({
                          message : err.message,
                          error : err
                        }));
                       }
                       else
                       {
                         res.statusCode=200;
                         res.json(trade);
                       }
                     })
                    }
                  });
                }
                else if(!possible)
                {
                  res.statusCode=403;
                  res.end(`Only ${maxShares} of given ticker are remaining. Hence, this trade can't be updated`);
                }
              });
            }
          } 
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
