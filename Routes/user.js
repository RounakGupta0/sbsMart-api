const express = require('express')
const Router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')
const cloudinary = require('cloudinary').v2
const jwt = require('jsonwebtoken')

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})

Router.post('/signup', async (req, res) => {
    try {
        const user = await User.find({ email: req.body.email })
        if (user.length > 0) {
            return res.status(500).json({
                msg: 'email already registered'
            })
        }

        const hash = await bcrypt.hash(req.body.password, 10)

        const uploadedImage = await cloudinary.uploader.upload(req.files.image.tempFilePath)

        const newUser = new User({
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            password: hash,
            imageUrl: uploadedImage.secure_url,
            imageId: uploadedImage.public_id
        })

        await newUser.save()
        const result = {
            fullName : newUser.fullName,
            email : newUser.email,
            phone : newUser.phone,
            imageUrl : uploadedImage.secure_url,
            imageId : uploadedImage.public_id
        }

        res.status(200).json({
            data: result,
            msg : ' new user added'
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})


Router.post('/login', async (req, res) => {
    try {
        const user = await User.find({ email: req.body.email })
        if (user.length != 1) {
            return res.status(500).json({
                msg: 'email not registered'
            })
        }

        const isMatch = await bcrypt.compare(req.body.password, user[0].password)
        if (!isMatch) {
            return res.status(500).json({
                msg: 'not authorized'
            })
        }

        const token = jwt.sign({
            userId: user[0]._id,
            email: user[0].email,
            phone: user[0].phone
        },
            process.env.SEC_KEY,
            {
                expiresIn: '10d'
            })

        res.status(200).json({
            token: token,
            fullName : user[0].fullName,
            email : user[0].email,
            phone: user[0].phone,
            imageId : user[0].imageId,
            imageUrl : user[0].imageUrl
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        })
    }
})

Router.delete('/:id',async(req,res)=>{
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

        const user = await User.findById(req.params.id)
        if (!user)
        {
            return res.status(404).json({
                msg : ' no user found'
            })
        }

        await cloudinary.uploader.destroy(user.imageId)
        await User.findByIdAndDelete(req.params.id)

        res.status(200).json({
            msg : 'user removed successfully'
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


module.exports = Router