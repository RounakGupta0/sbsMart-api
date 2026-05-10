require('dotenv').config();
const express = require('express')
const Router = express.Router()
const Product = require('../models/Products')
const cloudinary = require('cloudinary').v2
const jwt = require('jsonwebtoken')

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})


Router.post('/add-product', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token, process.env.SEC_KEY)

        if (tokenData.email != process.env.ADMIN_EMAIL) {
            return res.status(500).json({
                warning: 'you dont have permisson to perform this operation'
            })
        }
        // console.log('hello')
        // const imageCount = req.files.images.length
        // console.log(imageCount)

        const newimage = []

        for (let i of req.files.images) {   // forEach wait nhi krta upload krne ka to for.. of use kr rha mai

            const uploadedimages = await cloudinary.uploader.upload(i.tempFilePath)

            newimage.push({
                imageUrl: uploadedimages.secure_url,
                imageId: uploadedimages.public_id
            })

            //console.log(newimage)
        }

        // console.log('hellooooooooooooooo')
        // console.log(newimage)


        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            brand: req.body.brand,
            description: req.body.description,
            category: req.body.category,
            stock: req.body.stock,
            images: newimage
        })

        await product.save()

        res.status(200).json({
            msg: 'product added successfully',
            data: product
        })

    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.get('/all-products',async(req,res)=>{
    try 
    {
        const product = await Product.find().select("name images")
        res.status(200).json({
            products : product
        })
    }
    catch (err)
    {
        console.log(err)
        res.status(500).json({
            error : err
        })    
    }
})

Router.get('/byCategory/:category',async(req,res)=>{
    try
    {
        const product = await Product.find({category : req.params.category}).select('name images')
        console.log(product)
        if(product.length == 0)
        {
            return res.status(500).json({
                msg : 'no products found for the matching category'
            })
        }

        res.status(200).json({
            products : product
        })
    }
    catch(err)
    {
        console.log(err)
        res.status(500).json({
            error : err
        })
    }
})

Router.get('/byName/:name',async(req,res)=>{
    try
    {
        const product = await Product.find({name : req.params.name}).select('name images')
        if (product.length == 0)
        {
            return res.status(500).json({
                msg : 'no products found for the matching name'
            })
        }
        res.status(200).json({
            products : product
        })
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