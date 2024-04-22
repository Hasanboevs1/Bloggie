
const express = require('express')
const ghttp = require('express-graphql')

const {schema} = require('.')

const formatError = error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack,
    path: error.path
})

const port = process.env.PORT || 5000

express()
.use(ghttp({schema, graphiql: true, formatError}))
.listen(port, () => {
    console.log(`server started at port:${port}`)
})
