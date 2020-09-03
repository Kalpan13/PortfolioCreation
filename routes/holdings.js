var express = require('express');
var holdingRouter = express.Router();
var Holdings = require('../models/holding');
var Trades = require('../models/trade');
holdingRouter.route('/')
.get((req,res,next) => {

    var query = Holdings.find({}).select('-_id ticker numShares');
    
    Holdings.find({},(err,holds) => {
        if(err)
        {
           res.statusCode=403;
           res.end("Error while fetching results from DB");
        }
        else {
            var holdingList = findHolidng(holds);
            
                console.log(holdingList);
                res.statusCode=200;
                res.json({
                    message : "Success",
                    holdings : holdingList
                    });
            }
        })
    })

function findHolidng(holds) {
    var holdingList =[];
    for(var i=0;i<holds.length;i++)
                {    
                     Trades.find({'ticker':holds[i].ticker,operation:"buy"})
                     .then((trades) => {   
                            
                            var avgBuyPrice = 0;
                            var totalShares = 0;
                            for(var j=0;j<trades.length;j++)
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
                            holdingList = holdingList.push(holdObj);
                            console.log(holdingList);
                        });
                    
                   // console.log(holds[i].numShares);
               //     holdingList.push(holdObj);
                  //  console.log(holdingList);
                // },(err)=> {
                //     res.statusCode = 402;
                //     res.json({
                //     message: err.message,
                //     error: err
                //     });
                // })
                // .catch((err)=> {
                //     res.statusCode = 402;
                //     res.json({
                //     message: err.message,
                //     error: err
                //     });
                // });
                }
            return holdingList;
}
module.exports=holdingRouter;