const mongoose = require("mongoose");

const tradeScehma = new mongoose.Schema({
    ticker : {
        type : String,
        required : true 
    },
    buyPrice : {
        type : Number,
        min:0
    },
    numShares : {
        type : Number,
        required : true,
        min : 1
    },
    numSharesBought:{
        type : Number,
    },
    cName : {
        type : String 
    },
    operation: {
        type : String,
        enum : ['buy','sell']
    }
},{
    timestamps : true
});

var trades = mongoose.model('trade',tradeScehma);
module.exports = trades;

