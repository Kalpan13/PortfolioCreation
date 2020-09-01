const constants = require('./constanst');

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
    for(i=0;i<trades.length;i++)
    {
        returns+=((constants.CURRENT_PRICE - trades[i].avgBuyPrice)*trades[i].numShares);
    }
    return returns;

}

module.exports = {
    calculateAvgPrice : calculateAvgPrice,
    calculateReturns : calculateReturns
}