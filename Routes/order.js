const express = require('express')
const Router = express.Router()
const Order = require('../models/Order')
const Cart = require('../models/Cart')
const User = require('../models/User')
const Product = require('../models/Products')
const jwt = require('jsonwebtoken')
//const cloudinary = require('cloudinary').v2

// cloudinary.config({
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.API_KEY,
//     api_secret: process.env.API_SECRET
// })


Router.post('/placeOrder', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const cart = await Cart.findOne({ userId: tokenData.userId }).select('products')
        if (!cart) {
            return res.status(500).json({
                msg: 'cart not found'
            })
        }

        if (!req.files || !req.files.payment) {
            return res.status(500).json({
                msg: 'payment pending'
            })
        }

        let total = 0
        let orderedProducts = []
        let orderedQuantity
        let orderedProductId = []
        for (let i of cart.products) {
            let stockQuantity
            const product = await Product.findById(i.productId)
            if (!product){
                return res.status(500).json({
                    msg : 'product not found or something went wrong'
                })
            }

            orderedQuantity = i.quantity
            stockQuantity = product.stock

            if (orderedQuantity > stockQuantity) {
                return res.status(400).json({
                    msg: `we only got ${stockQuantity} in stock`
                })
            }

            total += orderedQuantity * product.price

            orderedProducts.push({
                productId: i.productId,
                quantity: orderedQuantity,
                price: product.price
            })
            
            orderedProductId.push({
                product,
                quantity : i.quantity
            })
        }

        for ( let i of orderedProductId)
        {
            i.product.stock -= i.quantity
            await i.product.save()
        }

        const order = new Order({
            userId: tokenData.userId,
            orderedProducts,
            total,
            orderedAddress: req.body.address,
            isPaid : true
        })

        await order.save()
        await Cart.findByIdAndDelete(cart._id)

        res.status(200).json({
            msg: 'order placed'
        })


    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})


module.exports = Router