const express = require('express')
const Router = express.Router()
const Product = require('../models/Products')
const router = express.Router();
const jwt = require('jsonwebtoken')
const cloudinary = require('cloudinary').v2
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})

// ADD PRODUCT API
router.post("/add-product", async (req, res) => {
  try {

    //token check
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token Missing",
      });
    }
    let tokenData;
    // Bearer token
    try{
      const token = authHeader.split(" ")[1];

      tokenData = jwt.verify(
        token,
        process.env.admin_SEC_KEY
      );
  }   catch(err){
    return res.status(401).json({
      success: false,
      message: "Invalid ADMIN",
    });
  }

    // only admin can add product
    // if (tokenData.role !== "Admin") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only Admin Can Add Product",
    //   });
    // }


    //get data
    const {
      name,
      price,
      category,
      brand,
      description,
    } = req.body;


    //fill all fields check
    if (!name || !price || !category || !brand) {
      return res.status(400).json({
        success: false,
        message: "Please Fill All Required Fields",
      });
    }

    // image check
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Product Image Required",
      });
    }


    //image upload to cloudinary
    const uploadedImage = await cloudinary.uploader.upload(
      req.files.image.tempFilePath
    );


   // create product
    const product = await Product.create({
      name,
      price,
      category,
      brand,
      description,

      imageUrl: uploadedImage.secure_url,
      imageId: uploadedImage.public_id,

      addedBy: tokenData._id,
    });


  // send response
    res.status(201).json({
      success: true,
      message: "Product Added Successfully",
      product,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

