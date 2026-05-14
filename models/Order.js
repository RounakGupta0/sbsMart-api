const mongoose = require('mongoose')

const orderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    orderedProducts: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 1
            },

            price: {
                type: Number,
                required: true
            }
        }
    ],

    total: {
        type: Number,
        required: true,
        min : 0
    },

    isPaid: {
        type: Boolean,
        default: false,
        required : true
    },

    orderedAddress: {
        type: String,
        required: true
    }

}, { timestamps: true })


module.exports = mongoose.model('Order',orderSchema)