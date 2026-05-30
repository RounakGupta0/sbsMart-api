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
        let tokenData;

        const token = req.headers.authorization.split(" ")[1]
        tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        const cart = await Cart.findOne({ userId: tokenData.userId }).select('products').populate('products.productId')
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

        const uploadedFile = await cloudinary.uploader.upload(req.files.payment.tempFilePath)


        let total = 0
        let orderedProducts = []
        let orderedQuantity
        let orderedProductId = []
        for (let i of cart.products) {
            let stockQuantity
            const product = i.productId
            if (!product) {
                // return res.status(500).json({
                //     msg: `${i.productId.name} not found or something went wrong`
                // })
                continue
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
                price: product.price,
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

        const populatedOrder = await Order.findById(neworder._id).populate('orderedProducts.productId', 'images')


        res.status(200).json({
            msg: 'order placed',
            order: populatedOrder
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
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        const orders = await Order.find({
            userId: tokenData.userId
        }).populate('orderedProducts.productId')

        //console.log(orders)
        let data = []

        for (let order of orders) {

            let images = []
            let productId = []

            for (let item of order.orderedProducts) {

                // const products = await Product.findById(item.productId)

                //console.log(item)

                if (!item.productId) {
                    item.productId = {}
                }
                // images.push(product ? product.images[0] : null)
                // images.push(product ? product._id : null)
                images.push({
                    product: item.productId.images[0],
                    productId: item.productId._id,
                })
                //console.log(images)
            }

            data.push({
                // productId : images._id,
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
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.get('/single/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        const order = await Order.findById(req.params.orderId).populate('orderedProducts.productId')
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
        for (let item of order.orderedProducts) {
            let images = []

            // const products = await Product.findById(item.productId)

            //console.log(item)

            if (!item.productId) {
                item.productId = {}
            }
            // images.push(product ? product.images[0] : null)
            // images.push(product ? product._id : null)
            images.push({
                product: item.productId.images[0],
                productId: item.productId._id,
            })
            data.push({
                image: images,
                quantity: item.quantity,
                price: item.price
            })
        }

        const neworder = {
            data,
            orderId: order._id,
            userId: order.userId,
            status: order.status,
            total: order.total,
            orderedAddress: order.orderedAddress,
            createdAt: order.createdAt
        }

        if (tokenData.email == process.env.ADMIN_EMAIL) {
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
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }

        const order = await Order.findById(req.params.orderId).populate('orderedProducts.productId')
        if (!order) {
            return res.status(404).json({
                msg: 'order nor found'
            })
        }

        if (order.status == "cancelled") {
            return res.status(400).json({
                msg: 'order is cancelled cannot perform such action'
            })
        }

        if (order.status != "pending") {
            return res.status(400).json({
                msg: 'cannot perform such operations'
            })
        }


        const result = await Order.findByIdAndUpdate(req.params.orderId, {status: "confirmed"}, { new: true })

        let data = []
        for (let item of order.orderedProducts) {
            let images = []

            if (!item.productId) {
                item.productId = {}
            }

            images.push({
                product: item.productId.images[0],
                productId: item.productId._id,
            })
            
            data.push({
                image: images,
                quantity: item.quantity,
                price: item.price
            })
        }

        const neworder = {
            data,
            orderId: order._id,
            userId: order.userId,
            total: order.total,
            status: result.status,
            orderedAddress: order.orderedAddress,
            createdAt: order.createdAt
        }

        res.status(200).json({
            msg: 'order confirmed',
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

Router.get('/byStatus/:category', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }
        const orders = await Order.find({
            status: req.params.category
        }).populate('orderedProducts.productId')

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
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.patch('/cancelOrder/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        const order = await Order.findById(req.params.orderId).populate('orderedProducts.productId')
        if (!order) {
            return res.status(404).json({
                msg: 'order not found'
            })
        }

        if (order.status == "cancelled") {
            return res.status(400).json({
                msg: 'this order is already cancellled'
            })
        }

        if (order.status == "shipped" || order.status == "delivered") {
            return res.status(400).json({
                msg: `cannot cancel order when its already ${order.status}`
            })
        }

        if (order.userId != tokenData.userId && tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(400).json({
                msg: 'access denied'
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

        await Product.findByIdAndUpdate(p.productId, {
                stock: product.stock + p.quantity
            }, { new: true })
        }

        const status = {
            status: "cancelled"
        }

        const result = await Order.findByIdAndUpdate(req.params.orderId, status, { new: true })

        const neworder = {
            data,
            orderId: order._id,
            userId: order.userId,
            total: order.total,
            status: result.status,
            orderedAddress: order.orderedAddress,
            createdAt: order.createdAt
        }

        if (tokenData.email == process.env.ADMIN_EMAIL) {
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

Router.patch('/shipOrder/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }

        const order = await Order.findById(req.params.orderId)
        if (!order) {
            return res.status(404).json({
                msg: 'order nor found'
            })
        }

        if (order.status == "cancelled") {
            return res.status(400).json({
                msg: 'cannot perform this operation'
            })
        }

        if (order.status != "confirmed") {
            return res.status(400).json({
                msg: 'the order isnt confirmed yet'
            })
        }


        const status = {
            status: "shipped"
        }

        const result = await Order.findByIdAndUpdate(req.params.orderId, status, { new: true })

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
            total: order.total,
            status: result.status,
            orderedAddress: order.orderedAddress,
            createdAt: order.createdAt
        }

        res.status(200).json({
            msg: 'order shipped',
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

Router.patch('/deleiverOrder/:orderId', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.user_SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }

        const order = await Order.findById(req.params.orderId)
        if (!order) {
            return res.status(404).json({
                msg: 'order nor found'
            })
        }

        if (order.status == "cancelled") {
            return res.status(400).json({
                msg: 'cannot perform this operation'
            })
        }

        if (order.status != "shipped") {
            return res.status(400).json({
                msg: 'order isnt shipped yet to peroform the operation'
            })
        }

        const status = {
            status: "delivered"
        }

        const result = await Order.findByIdAndUpdate(req.params.orderId, status, { new: true })

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
            total: order.total,
            status: result.status,
            orderedAddress: order.orderedAddress,
            createdAt: order.createdAt
        }

        res.status(200).json({
            msg: 'order deleivered',
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

module.exports = Router