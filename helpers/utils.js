const constants = require('./constanst');
var Holdings = require('../models/holding');
var Trades = require('../models/trade');
var chalk = require('chalk');   
function calculateAvgPrice(oldShares,oldPrice, newShares, newPrice)
{
    var newSharesCount = oldShares + newShares;
    var avgBuyPrice = ((oldPrice * oldShares)+(newShares*newPrice))/newSharesCount;
    return {
        newAvgBuyPrice:avgBuyPrice,
        newShares:newSharesCount
    }
}

function calculateReturns(trades)
{
    var returns = 0;
    for(let i=0;i<trades.length;i++)
    {
        returns+=((constants.CURRENT_PRICE - trades[i].avgBuyPrice)*trades[i].numShares);
        console.log(returns);
    }
    return returns;

}
async function getHoldings(callback)
{
    Holdings.find({},(err,holds) => {
        if(err) {
            callback(err,undefined);
        }
        else {           
            callback(null,holds);
        }   
    });
}
async function findTrades(holds, callback) 
{   
        var holdingList = [];
        for(let i=0;i<holds.length;i++)
         {    
            var trades = await Trades.find({'ticker':holds[i].ticker,operation:"buy"})
            calculateHolding(trades,holds[i].numShares, (err,holdObjs)=> {
                if(!err)
                {
                    holdingList.push(holdObjs);
                }
            });
        }
        callback(null,holdingList);
}    
      
function calculateHolding(trades,currentHolds, callback) {
    var avgBuyPrice = 0;
    var totalShares = 0;
    for(let j=0;j<trades.length;j++)
    {   
        var buyPrice = trades[j].buyPrice;
        var numSharesBought = trades[j].numSharesBought;
        avgBuyPrice += (buyPrice * numSharesBought);
        totalShares +=numSharesBought;
    }
    avgBuyPrice = (avgBuyPrice / totalShares);
    
    var holdObj = {
        "ticker" : trades[0].ticker,
        "numShares" : currentHolds,
        "avgBuyPrice" : avgBuyPrice
    };
    callback(null, holdObj);
}

function createHolding(holding,callback)
{
    Holdings.create(holding)
    .then((newHolding) => {
        console.log(`Holding Created for ${newHolding.ticker}`);
        callback(undefined,newHolding);

    },(err)=> {
        callback(err,undefined);
    })
    .catch((err) => {
        callback(err,undefined);
    });     
}
function createTrade(tradeObj,callback)
{   
    Trades.create(tradeObj)
    .then((trade)=> {
        callback(undefined,trade);
    },(err)=> {
        callback(err,undefined);
    })
    .catch((err)=> {
        callback(err,undefined);
    })   
}

function updateHolding(tradeObj,callback)
{
    Holdings.findOne({ ticker: tradeObj.ticker })
        .then((holding) => {
            if (!holding) {
            // If holding corresponding to the trade's ticker doesn't exist : Create new
                holding = {
                    ticker: tradeObj.ticker,
                    numShares: tradeObj.numShares,
                };                   
                createHolding(holding,(err,newHolding)=> {
                    if(err)
                    {
                        callback(err,null);
                    }
                    else {
                        callback(null,null);
                    }
                });
            } 
            else {
                // If holding corresponding to the trade's ticker exist : Update no. shares
                holding.numShares = tradeObj.numShares + holding.numShares;
                holding.save((err) => {
                    if (err) {
                        callback(err,null);
                    } else {
                        console.log(`Holdings Updated for ${tradeObj.ticker}`);
                        callback(null,null);
                    }
                });
            }
        },(err) => {
                console.log("Error while searching Holding");     
                callback(err,null);
            }
        )
        .catch((err) => {
            console.log("Error while searching Holding in catch");
            callback(err,null);     
        });
}
function checkShares(sharesSell,ticker,callback) 
{
    Holdings.findOne({ticker : ticker})
    .then((holding)=> {
        if(!holding)
        {
            callback("No Holdings Found",null,null,null);
        }
        else{
            if(holding.numShares>=sharesSell)
                callback(null,true,holding.numShares,holding);
            else
                callback(null,false,holding.numShares,holding);    
        }
    },(err)=> {
        callback(err,null,null,null);
    })
    .catch((err)=> {
        callback(err,null,null,null);
    })
}
module.exports = {
    calculateAvgPrice : calculateAvgPrice,
    calculateReturns : calculateReturns,
    getHoldings:getHoldings,
    findTrades: findTrades,
    createHolding : createHolding,
    createTrade : createTrade,
    updateHolding : updateHolding,
    checkShares : checkShares
}