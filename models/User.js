const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    imageUrl: {
        type: String,
        default: ''
    },

    imageId: {
        type: String,
        default: ''
    },

    favourites: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],

}, {
    timestamps: true
})


module.exports = mongoose.model('User',userSchema)