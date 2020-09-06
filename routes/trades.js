var express = require("express");
var tradeRouter = express.Router();
var Trades = require("../models/trade");
var chalk = require("chalk");
var utils = require("../helpers/utils");
var Holdings = require("../models/holding");


tradeRouter.route("/")
  .get((req, res, next) => {

    //Endpoint for fetching all the trades
    Trades.find(({}))
      .select('_id ticker numShares buyPrice operation')
      .then((trades) => {
        res.statusCode = 200;
        res.json({
          trades: trades
        });
      },(err)=> {
          res.statusCode = 402;
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
      })
  })
  .post((req, res, next) => {

    //Endpoint for Creating a new trade
    var tradeObj = req.body;
    if (!tradeObj.operation) {
      res.statusCode = 402;
      res.end(
        "Operation must be defined in POST /trade endpoint. (buy or sell)"
      );
    }
    // Trade Buying Operation
    if (tradeObj.operation == "buy") {
      
      // Creting tradeObj for insertion in Database
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
          // Update Holdings corresponding to new trade

          utils.updateHolding(tradeObj,(err,holdingUpdated)=> {
            if(err)
            {     
              console.log("Error while updaing holding for tradeID:"+trade._id);
              res.statusCode=402;
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
    // Trade Selling Operation  
    else if (tradeObj.operation == "sell") {
      // Check if holding exists
      Holdings.findOne({ ticker: tradeObj.ticker }).then((holding) => {
        if (!holding) {
          // holding not present : Sell operation can not performed
          res.statusCode = 402;
          res.end(
            `Add a trade of "${tradeObj.ticker}" before selling it. Use POST /trades..!`
          );
        } 
        else {
          // Holding present, shares to be sold > available shares
          if (holding.numShares - tradeObj.numShares < 0) {
            res.statusCode = 402;
            res.end(
              `Only ${holding.numShares} of ${tradeObj.ticker} shares can be sold..!`
            );
          } 
          else  
          {
            if (holding.numShares - tradeObj.numShares == 0) {
            // Holding present, shares to be sold == available shares : remove holding
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
            // Holding present, shares to be sold < available shares : update holding
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
            // Create a new Trade 
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
      res.statusCode = 402;
      res.end("Option must be 'buy' or 'sell'");
    }
  })

  .delete((req,res,next)=> {
    // Endpoint to delete all the trades and reset Database
  
    Trades.collection.drop();
    Holdings.collection.drop();
    res.end("Deleted All");
  });
  

tradeRouter.route("/:tradeID")
  .get((req, res, next) => {
    // Endpoint to get trade details with given tradeID
    const tradeID = req.params.tradeID;

    Trades.findById(tradeID)
      .select('_id ticker numShares buyPrice operation createdAt')
      .then((trade) => {
        res.statusCode = 200;
        res.json(trade);
      }, (err) => { 
        res.statusCode = 402;
        res.json({
          message: "No Trade found with given tradeID",
          error: err,
        });
      })
      .catch((err) => {
        res.statusCode = 402;
        res.json({
          message: "No Trade found with given tradeID",
          error: err,
        });
      })
  })
  .put((req, res, next) => {

    // Endpoint for updating the trade 
    const tradeID = req.params.tradeID;
    const updateObj = req.body;

    Trades.findById(tradeID)
      .then((trade) => {
        
        if(!trade)
        {
          res.statusCode=402;
          res.end("No trade found with given tradeID :"+tradeID);
        }
        else{
           /*
             3 changes possible 

             1. Change in Ticker :ticker : "ABC"
             2. Change in Number of Shares : numShares : 5
             3. Change in Operation : operation : "buy"/"sell"

             Only 1 at a time is supprted as of now. 
          */

          // TODO : 2 or more changes simultaneously
          const updateTicker = updateObj.ticker;
          const updateNumShares = updateObj.numShares;
          const updateOperation = updateObj.operation;

          // Change number of shares
          if((!updateTicker) && (updateNumShares) && (!updateOperation))
            {
              // Update number of shares for buy
              if (trade.operation == 'buy') 
              {
                //  For operation buy : update the trade
                if (updateObj.numShares > 0) {
                  var oldShares = trade.numShares;
                  trade.numShares = updateObj.numShares;
                  trade.numSharesBought = trade.numShares;
                  var newShares = updateObj.numShares - oldShares;
                  
                  // Updating Holdings buy performing increment / decrement 
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
                      res.statusCode = 402;
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
                 // Update number of shares for buy

                if (updateObj.numShares > 0) {
                  var oldShares = trade.numShares;
                  trade.numShares = updateObj.numShares;
                  var newShares = oldShares - updateObj.numShares;
                
                  // Checking and Updating Holds
                  Holdings.find({ ticker: trade.ticker})
                    .then((holding) => {
                      if(holding)
                      {
                        var updatedShares = holding.numShares + newShares;
                        // If available shares in hold are more than to_be_sold share : perform update
                        if(updatedShares>=0)
                        {
                          holding.numShares = updatedShares;
                          if(holding.numShares==0)
                          {
                            // If final no. of shares ==0 : Remove hold and Save Trade

                            Holdings.findOneAndDelete({ticker:trade.ticker})
                            .then((holdDel)=>{
                              console.log("Hold Deleted for :"+trade.ticker);
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
                              });
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
                          // If final no. of shares > 0 : Update and Save hold and Save Trade
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
                               console.log("Holding Updated Successfully:"+holding.ticker); 
                               trade.numShares = updateObj.numShares;
                                
                              // Save final trade 
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
                               });
                              }
                            })
                          }
                        }
                        else {
                          res.statusCode=402;
                          res.end(`Only ${holding.numShares} of ${holding.ticker} can be sold..`);
                          return;
                        }
                      }     
                  },(err)=> {
                    res.statusCode=402;
                    res.json({
                      message: err.message,
                      error: err,
                    });
                    return;
                  })
                .catch((err)=> {
                  res.statusCode=403;
                  res.json({
                    message: err.message,
                    error: err,
                  });
                  return;
                })
              }
              else {
                res.statusCode=402;
                res.end("Number of shares should be more than 0 for updating");
              }
            }
          }
      
          else if((!updateTicker) && (!updateNumShares) && (updateOperation)) 
          { 
            // Change in trade operation
            
            if(updateOperation=='buy')
            { 
              // Changing sell operation to buy

              if(trade.operation=='sell')
              {

                // For updating sell operation to buy , numShares will be removed and numShares will be bought.
                // Hence, total 2*numShares will be added in holdings. 

                if(!updateObj.buyPrice)
                {
                  res.statusCode=403;
                  res.end("buyPrice must be specified for Operation : buy");
                }
                else 
                {
                  // Update and Save trade

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
                    
                    // Update Holdings : Increment
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
                // For updating buy operation to sell , numShares will be removed and numShares will be sold.
                // Hence, total 2*numShares should be present in holdings. 

                var sharesSell = 2*trade.numShares;
                utils.checkShares(sharesSell,trade.ticker,(err,possible,maxShares,holding)=>{
                  if(err)
                  {
                    res.statusCode=402;
                    res.json(({
                        message : err.message,
                        error : err
                      }));
                      return;
                  }
                  else if(possible)
                  {
                    // Update possible. (based on the aforementioned condition)

                    holding.numShares = holding.numShares - sharesSell;
                    if(holding.numShares==0)
                    {
                      // If resulting numShares==0 : remove holding and save trade
                      Holdings.findOneAndDelete({ticker:holding.ticker})
                      .then((holding)=>{

                        console.log("Holding removed for trade :"+holding.ticker);
                        trade.operation='sell';
                        trade.save((err)=>{
                          if(err)
                          {
                            res.statusCode=402;
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
                      // If resulting numShares>0 : update holding and save trade
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
                  { //Update not possible.
                    res.statusCode=402;
                    res.end(`Only ${maxShares} of given ticker can be sold`);
                  }
                });
              }
            }
            else{
              res.statusCode=402;
              res.end("Operation should either buy or sell");
            }
          }
          else if((updateTicker) && (!updateNumShares) && (!updateOperation))
          {
            // Change in ticker 
            const oldTicker = trade.ticker;
            const newTicker = updateTicker;
            if(trade.operation=='buy')
            {
              // For trade operation = buy, numShares will be removed from old ticker and added to new ticker hold.
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
                  // Checking if removing numShares from old ticker is possible or not. 

                  holding.numShares = holding.numShares - trade.numShares;
                  if(holding.numShares==0)
                  {
                    // If resulting numShares==0 : remove holding of old ticker

                    Holdings.findOneAndDelete({ticker:holding.ticker})
                    .then((holding)=>{
                      console.log("Holding removed of "+trade);
                    },(err)=>{
                      res.statusCode=402;
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
                    // If resulting numShares>0 : Update holding of old ticker
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
                  // Creating tradeObj for addition in new Ticker
                  var newTradeObj = {
                    ticker : newTicker,
                    numShares : trade.numShares,
                  }
                  if(updateObj.buyPrice)
                    newTradeObj.buyPrice = updateObj.buyPrice;
                  else
                    newTradeObj.buyPrice = trade.buyPrice;
                  //Update the holding of new Ticker

                  utils.updateHolding(newTradeObj,(err,newHolding)=>{
                    if(err)
                    {
                      res.statusCode=402;
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
  
              // Check if sell can be performed 
              // For trade operation = sell, numShares will be added to old ticker and removed from new ticker hold.
             
              utils.checkShares(trade.numShares,newTicker,(err,possible,maxShares,holding)=>{
                // Checking if numShares can be removed from new Ticker
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
                  // if resulting numShares ==0 : remove holding of new Ticker amd update trade
                  holding.numShares = holding.numShares - trade.numShares;
                  if(holding.numShares==0)
                  {
                    Holdings.findOneAndDelete({ticker:holding.ticker})
                    .then((holding)=>{
                      console.log("Holding removed for "+holding.tradeID);
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
                        console.log("Holding Updated for "+holding.tradeID);
                      }
                    });  
                  }
                  // Creating tradeObj for inserting into old Ticker
                  // numShares will be added to old Ticker. Hence, it requires buyPrice

                  var newTradeObj = {
                    ticker : trade.ticker,
                    numShares : trade.numShares,
                  }
                  if(updateObj.buyPrice)
                    newTradeObj.buyPrice = updateObj.buyPrice;
                  else
                    {
                      res.statusCode=402;
                      res.end("This will buy the shares of old ticker and sell the shares of new one.Hence, buyPrice must be specified for the old ticker. ")
                    }
                  // Update the holding of old Ticker
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
                     console.log("Holding updated for "+ newTradeObj.ticker); 
                     trade.ticker = newTicker;
                     // Save updated trade
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
          else{
            res.statusCode=402;
            res.end("Provide only 1 of 3 possible update options");
            return; 
          } 
        }
    },(err)=>{
      res.statusCode=402;
      res.json(({
        message : "No Trade found with given tradeID",
        error : err
      }));
    })
    .catch((err)=> {
      res.statusCode=403;
      res.json(({
        message : "No Trade found with given tradeID",
        error : err
      }));
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
