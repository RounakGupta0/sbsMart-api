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
        const imageCount = req.files.images.length
        // console.log(imageCount)
        if (imageCount<2 || imageCount > 10)
        {
            return res.status(500).json({
                msg : 'upload minimum 2 image and maximum 10 images'
            })
        }
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


Router.get('/:productId',async(req,res)=>{
    try
    {
        const product = await Product.findById(req.params.productId)
        res.status(200).json({
            product :product
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



Router.put('/update/:productId',async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token,process.env.SEC_KEY)
        
        if (tokenData.email != process.env.ADMIN_EMAIL)
        {
            return res.status(500).json({
                warning : 'you dont have permisson to perform this operation'
            })
        }

        const product = await Product.findById(req.params.productId)
        if (!product)
        {
            return res.status(404).json({
                msg :' no product found'
            })
        }

        // for (let i of product.images)
        // {
        //     // console.log(i.imageId)
        //     await cloudinary.uploader.destroy(i.imageId)
        // }
        
        const newproduct = {
            name : req.body.name,
            price : req.body.price,
            brand : req.body.brand,
            description : req.body.description,
            images : product.images,
            stock : req.body.stock,
            category : req.body.category,
            likeCount : product.likeCount,
            likedBy : product.likedBy,
        }

        const updatedData = await Product.findByIdAndUpdate(req.params.productId,newproduct,{ new : true })
        res.status(200).json({
            msg : 'updated successfully',
            data : updatedData
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

Router.delete('/:productId',async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token,process.env.SEC_KEY)
        
        if (tokenData.email != process.env.ADMIN_EMAIL)
        {
            return res.status(500).json({
                warning : 'you dont have permisson to perform this operation'
            })
        }

        const product = await Product.findById(req.params.productId)
        if (!product)
        {
            return res.status(500).json({
                msg : 'no product found'
            })
        }

        for (let i of product.images)
        {
            const deleted = await cloudinary.uploader.destroy(i.imageId)
            if (deleted.result != 'ok')
            {

                return res.status(500).json({
                    msg : 'something went wrong pls try again later'
                })
            }

        }

        await Product.findByIdAndDelete(req.params.productId)
        // console.log(deletedProduct)

        res.status(200).json({
            msg : 'product deleted successfully'
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

Router.patch('/stockadd/:productId',async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token,process.env.SEC_KEY)
        
        if (tokenData.email != process.env.ADMIN_EMAIL)
        {
            return res.status(500).json({
                warning : 'you dont have permisson to perform this operation'
            })
        }

        const product = await Product.findById(req.params.productId)

        const stock = {
            stock : Number(req.body.stock) + product.stock
        }

        const updatedData = await Product.findByIdAndUpdate(req.params.productId,stock,{new : true})
        //console.log(updatedData)

        res.status(200).json({
            msg : 'stock updated successfully',
            data : updatedData
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

Router.patch('/priceChange/:productId',async(req,res)=>{
    try
    {
        const token = req.headers.authorization.split(" ")[1]
        const tokenData = jwt.verify(token,process.env.SEC_KEY)
        
        if (tokenData.email != process.env.ADMIN_EMAIL)
        {
            return res.status(500).json({
                warning : 'you dont have permisson to perform this operation'
            })
        }

        const product = await Product.findById(req.params.productId)
        if (!product)
        {
            return res.status(500).json({
                msg : 'no product found'
            })
        }

        const price = {
            price : req.body.price
        }

        const updatedPrice = await Product.findByIdAndUpdate(req.params.productId,price,{new : true})

        res.status(200).json({
            msg : 'price updated successfully',
            data : updatedPrice
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