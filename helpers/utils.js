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
        console.log(chalk.green(`${trade.numShares} shares of ${trade.ticker} baught successfully !!`));
        callback(undefined,trade);
    },(err)=> {
        callback(err,undefined);
    })
    .catch((err)=> {
        callback(err,undefined);
    })   
}

module.exports = {
    calculateAvgPrice : calculateAvgPrice,
    calculateReturns : calculateReturns,
    getHoldings:getHoldings,
    findTrades: findTrades,
    createHolding : createHolding,
    createTrade : createTrade
}