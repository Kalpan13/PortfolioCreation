const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema({
    ticker : {
        type : String,
        required : true 
    },
    avgBuyPrice : {
        type : Number,
        min:0
    },
    numShares : {
        type : Number,
        required : true,
        min : 1
    },
},{
    timestamps : true
});

var holdings = mongoose.model('holdings',holdingSchema);
module.exports = holdings;

