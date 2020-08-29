const mongoose = require("mongoose");

const tradeScehma = new mongoose.Schema({
    ticker : {
        type : String,
        required : true 
    },
    buyPrice : {
        type : Number,
        required : true,
        min:0
    },
    numShares : {
        type : Number,
        required : true,
        min : 1
    },
    cName : {
        type : String 
    },
    operation: {
        type : String,
        enum : ['buy','sell','change']
    }
},{
    timestamps : true
});

var trades = mongoose.model('trade',tradeScehma);
module.exports = trades;

