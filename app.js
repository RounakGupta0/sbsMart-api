require('dotenv').config();
const dns =require('dns')
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const userRoutes = require('./Routes/user')
const productRoutes = require('./Routes/product')
const cartRoutes = require('./Routes/cart')
const orderRoutes = require('./Routes/order')
const fileupload = require('express-fileupload')


dns.setServers(["1.1.1.1", "8.8.8.8"]);


const ConnectwithDatabase = async()=>{
    try
    {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log('Connected With database')
    }
    catch(err)
    {
        console.log('something is wrong')
        console.log(err)
    }
}

ConnectwithDatabase()


app.use(fileupload({
    useTempFiles:true,
    tempFileDir:'/tmp/'
}))

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use('/user',userRoutes)
app.use('/product',productRoutes)
app.use('/cart',cartRoutes)
app.use('/order',orderRoutes)


module.exports = app