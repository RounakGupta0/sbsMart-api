const mongoose = require('mongoose')

const productSchema = mongoose.Schema({
    name: {
        type : String,
        required : true,
        maxlength : 50
    },

    price : {
        type: Number,
        required : true
    },

    brand : {
        type : String,
        required : true
    },

    description : {
        type : String,
        default : '',
        maxlength : 200
    },
    
    category : {
        type : String,
        enum : ['Fashion', 'Electronics' , 'Mobiles', 'Sports','others'],
        required : true,
    },

    images : [
        {
            imageUrl :{type : String},
            imageId : {type : String}
        }
    ],

    likeCount : {
        type : Number,
        default : 0
    },

    likedBy : [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
    }],

    stock : {
        type : Number,
        default : 0
    },
    
},{
    timestamps: true // createdAt & updatedAt
})