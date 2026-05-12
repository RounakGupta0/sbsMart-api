const express = require('express')
const Router = express.Router()
const Cart = require('../models//Cart')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Products = require('../models/Products')


Router.post('/addToCart/:productId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const user = await User.findById(tokenData.userId)
        if (!user) {
            return res.status(500).json({
                msg: 'please login to access cart and other features'
            })
        }

        const product = await Products.findById(req.params.productId)
        if (!product) {
            return res.status(500).json({
                msg: 'no such product found'
            })
        }

        if (product.stock < 1) {
            return res.status(404).json({
                msg: 'product is not in stock please check back later'
            })
        }

        const cart = await Cart.findOne({ userId: tokenData.userId })

        let savedData 
        if (!cart) {
            const newcart = new Cart({
                userId: tokenData.userId,
                products: [{
                    productId: req.params.productId,
                    quantity: 1
                }]
            })
            savedData = await newcart.save()
        }
        else {
            const existingProduct =
                cart.products.find(
                    i =>
                        i.productId.toString() ===
                        req.params.productId
                )


            if (existingProduct) {

                existingProduct.quantity += 1
                savedData = await cart.save()

            }

            else {
                cart.products.push(
                    {
                        productId: req.params.productId,
                        quantity: 1
                    })
                savedData = await cart.save()
            }
        }

        res.status(200).json({
            msg: 'product added to cart',
            data: savedData
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