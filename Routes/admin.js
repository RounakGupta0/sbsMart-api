const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require("express");
const Router = express.Router();

Router.post("/signup", async (req, res) => {
    try{
        const admins = await Admin.find({ email: req.body.email });

    if (admins.length > 0) {
        return res.status(500).json({
            error: "Admin already registered...."
        });
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    const newAdmin = new Admin({
        name: req.body.name,
        email: req.body.email,
        password: hash
    });
    const data = await newAdmin.save();
    res.status(200).json({
        newAdmin: data
    });
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({
            error: err.message
        });
    }
});

Router.post('/login', async (req, res) => {

    try {
        const email = req.body.email;
        const password = req.body.password;
        if (!email || !password) {

            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const admins = await Admin.find({ email: email });

        if (admins.length == 0) {
            return res.status(400).json({
                error: "Admin not found"
                    });
        }
        const checkPassword = await bcrypt.compare(
            password,
            admins[0].password
        );
        if (!checkPassword) {
            return res.status(400).json({
                error: "Invalid password"
            });
        }
        const token = await jwt.sign(
            {
                _id: admins[0]._id,
                email: admins[0].email
            },
            "ak47",
            {
                expiresIn: "7d"
            }
        );
        res.status(200).json({
            message: "Login successful",
            token: token,
            admin: admins[0]
        });

    }
    catch (err) {

        console.log(err);
        res.status(500).json({
            error: err
        });
    }
});

module.exports = Router




