const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const userRoutes = require('./Routes/user')
const productRoutes = require('./Routes/product')
const cartRoutes = require('./Routes/cart')
const orderRoutes = require('./Routes/order')


const ConnectwithDatabase = async()=>{
    try
    {
        await mongoose.connect()
        console.log('Connected With database')
    }
    catch(err)
    {
        console.log('something is wrong')
        console.log(err)
    }
}

ConnectwithDatabase()


app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use('/user',userRoutes)
app.use('/product',productRoutes)
app.use('/cart',cartRoutes)
app.use('/order',orderRoutes)


module.exports = app