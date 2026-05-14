const express = require('express')
const Router = express.Router()
const Order = require('../models/Order')
const Cart = require('../models/Cart')
const jwt = require('jsonwebtoken')
const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})


Router.post('/placeOrder',async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const cart = await Cart.findOne({userId : tokenData.userId})
        console.log(cart)
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error : err
        })
    }
})


module.exports = Router