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

        res.status(200).json({
            data: newUser
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
            token: token
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