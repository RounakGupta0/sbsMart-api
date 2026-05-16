const express = require('express')
const Router = express.Router()
const Order = require('../models/Order')
const Cart = require('../models/Cart')
const User = require('../models/User')
const Product = require('../models/Products')
const jwt = require('jsonwebtoken')
const cloudinary = require('cloudinary').v2

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})


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
            if (!product) {
                return res.status(500).json({
                    msg: 'product not found or something went wrong'
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
                quantity: i.quantity
            })
        }

        for (let i of orderedProductId) {
            i.product.stock -= i.quantity
            await i.product.save()
        }

        const uploadedFile = await cloudinary.uploader.upload(req.files.payment.tempFilePath)


        const order = new Order({
            userId: tokenData.userId,
            orderedProducts,
            total,
            orderedAddress: req.body.address,
            paymentProofUrl: uploadedFile.secure_url,
            paymentProofId: uploadedFile.public_id
        })

        const neworder = await order.save()
        await Cart.findByIdAndDelete(cart._id)

        res.status(200).json({
            msg: 'order placed',
            order: neworder
        })


    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.get('/allOrdersByUser', async (req, res) => {
    try {

        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const orders = await Order.find({
            userId: tokenData.userId
        })

        let data = []

        for (let order of orders) {

            let images = []

            for (let item of order.orderedProducts) {

                const product = await Product.findById(item.productId)

                images.push(product ? product.images[0] : null)
            }

            data.push({
                images: images,
                status: order.status,
                orderId: order._id
            })
        }

        res.status(200).json({
            data: data
        })

    }
    catch (err) {

        res.status(500).json({
            error: err
        })
    }
})

Router.get('/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        const order = await Order.findById(req.params.orderId)
        if (!order) {
            return res.status(500).json({
                msg: 'order not found'
            })
        }

        if (order.userId != tokenData.userId && tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                msg: 'not authorized'
            })
        }

        let data = []
        for (let p of order.orderedProducts) {
            const product = await Product.findById(p.productId)
            data.push({
                image: product ? product.images[0] : null,
                quantity: p.quantity,
                price: p.price
            })
        }

        const neworder = {
            data,
            orderId: order._id,
            userId: order.userId,
            status: order.status,
            total: order.total,
            orderedAddress: order.address,
            createdAt: order.createdAt
        }

        if (tokenData.email == process.env.ADMIN_EMAIL)
        {
            neworder.paymentProofUrl = order.paymentProofUrl
            neworder.paymentProofId = order.paymentProofId
        }

        res.status(200).json(neworder)

    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.patch('/confirmOrder/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }

        const order = Order.findById(req.params.orderId)
        if (!order)
        {
            return res.status(404).json({
                msg : 'order nor found'
            })
        }

        const status = {
            status : "confirmed"
        }

        await Order.findByIdAndUpdate(req.params.orderId,status,{new : true})

        res.status(200).json({
            msg : 'order confirmed',
            order : order
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