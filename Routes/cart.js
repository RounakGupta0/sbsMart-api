const express = require('express')
const Router = express.Router()
const Cart = require('../models//Cart')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Products = require('../models/Products')


Router.post('/addToCart/:productId', async (req, res) => {
    try {
        try{
            const token = req.headers.authorization.split(" ")[1]
            const tokenData = jwt.verify(token, process.env.SEC_KEY)
        }catch(err){
            return res.status(401).json({
                msg: 'please login to access cart and other features'
            })
        }

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

                if (existingProduct.quantity >= product.stock) {
                    return res.status(500).json({
                        msg: 'not is stock'
                    })
                }

                if (existingProduct.quantity >= 5) {
                    return res.status(400).json({
                        msg: 'max items reached to add in a cart'
                    })
                }

                existingProduct.quantity += 1
                savedData = await cart.save()

            }

            else {

                cart.products.push({
                    productId: req.params.productId,
                    quantity: 1
                })

                savedData = await cart.save()
            }
        }
        const populatedCart = await Cart.findById(savedData._id)
            .populate('products.productId', 'images')

        res.status(200).json({
            msg: 'product added to cart',
            data: populatedCart
        })

    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.delete('/removeFromCart/:productId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const cart = await Cart.findOne({ userId: tokenData.userId })
        if (!cart) {
            return res.status(404).json({
                msg: "couldn't find the requested cart plaease try again"
            })
        }
        // if (product.stock < 1) {
        //     return res.status(404).json({
        //         msg: 'product is not in stock please check back later'
        //     })
        // }
        const FindProduct = cart.products.find(i => i.productId.toString() === req.params.productId)
        if (!FindProduct) {
            return res.status(500).json({
                msg: 'Item not found in cart'
            })
        }
        else if (FindProduct.quantity > 1) {
            FindProduct.quantity -= 1
        }
        else if (FindProduct.quantity <= 1) {
            cart.products = cart.products.filter(i => i.productId.toString() !== req.params.productId)
        }

        const savedData = await cart.save()

        const populatedCart = await Cart.findById(savedData._id)
            .populate('products.productId', 'images')
        
        res.status(200).json({
            msg: 'item removed from cart successfully',
            data: populatedCart
        })

        res.status(200).json({
            msg: 'item removed from cart successfully',
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

Router.patch('/editQuantity/:productId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const cart = await Cart.findOne({ userId: tokenData.userId })
        if (!cart) {
            return res.status(404).json({
                msg: 'cart not found'
            })
        }

        const product = await Products.findById(req.params.productId)
        if (!product) {
            return res.status(500).json({
                msg: 'product not found'
            })
        }
        //console.log(cart)
        const cartProduct = cart.products.find(i => i.productId.toString() === req.params.productId)
        if (!cartProduct) {
            return res.status(500).json({
                msg: 'product not found'
            })
        }
        else {
            if (Number(req.body.quantity) > product.stock) {
                return res.status(500).json({
                    msg: `sorry we only got ${product.stock} of such items in the stock `
                })
            }

            if (Number(req.body.quantity) > 5 || Number(req.body.quantity) < 1) {
                return res.status(500).json({
                    msg: 'please enter a valid quantity (not more then 5)'
                })
            }

            if(cartProduct.quantity == req.body.quantity)
            {
                console.log('hi')
                return res.status(400).json({
                    msg :'u are sending the same quantity again'
                })
            }

            cartProduct.quantity = req.body.quantity
        }
        const addedCart = await cart.save()

        const pCart = await Cart.findById(addedCart._id).populate('products.productId','images')
        console.log(pCart)

        res.status(200).json({
            msg: 'item added to cart successsfully',
            cart: pCart
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.get('/whole-cart', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const cart = await Cart.findOne({ userId: tokenData.userId }).select('products').populate('products.productId','images name')
        if (!cart) {
            return res.status(404).json({
                msg: 'nothing in cart start adding products to continue shopping'
            })
        }

        cart.products.forEach(item => {
            item.productId.images = item.productId.images[0]
        })


        res.status(200).json({
            cart: cart
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