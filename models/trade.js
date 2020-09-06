const mongoose = require("mongoose");

const tradeScehma = new mongoose.Schema({
    ticker : {
        type : String,
        required : true 
    },
    buyPrice : {
        type : Number,
        min:0,
        required : function() {
                    return this.operation == 'buy';
                    }   
    },
    numShares : {
        type : Number,
        required : true,
        min : 1,
        validate : {
            validator : Number.isInteger,
            message   : 'numShares must be an integer value. {VALUE} is not an integer.'
          }
    },
    numSharesBought:{
        type : Number,
    },
    cName : {
        type : String 
    },
    operation: {
        type : String,
        enum : ['buy','sell'],
    }
},{
    timestamps : true
});

var trades = mongoose.model('trade',tradeScehma);
module.exports = trades;

