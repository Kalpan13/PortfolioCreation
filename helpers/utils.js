const constants = require('./constanst');
var Holdings = require('../models/holding');
var Trades = require('../models/trade');

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
            calculateHolding(trades, (err,holdObjs)=> {
                if(!err)
                {
                    holdingList.push(holdObjs);
                }
            });
        }
        callback(null,holdingList);
}    
      
function calculateHolding(trades, callback) {
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
        "numShares" : totalShares,
        "avgBuyPrice" : avgBuyPrice
    };
    callback(null, holdObj);
}

module.exports = {
    calculateAvgPrice : calculateAvgPrice,
    calculateReturns : calculateReturns,
    getHoldings:getHoldings,
    findTrades: findTrades
}