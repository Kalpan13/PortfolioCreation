var express = require('express');
var holdingRouter = express.Router();
var Holdings = require('../models/holding');
var Trades = require('../models/trade');
holdingRouter.route('/')
.get((req,res,next) => {

    
    Holdings.find({},(err,holds) => {
        if(err)
        {
           res.statusCode=403;
           res.end("Error while fetching results from DB");
        }
        else {           
                findHolidngs(holds,(err,holdList) =>{
                    if(!err)
                    {
                        res.statusCode=200;
                        res.json({
                        "holdings":holdList
                        });
                    }                    
                });
            }
        })
    });


async function findHolidngs(holds, callback) 
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

                    
             
module.exports=holdingRouter;