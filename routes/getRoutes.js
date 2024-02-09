const router = require('express').Router()


router.get('/resetPassword/:token' , (req , res)=>{
    res.send("This is get route working");
})

router.get('/')

module.exports  = router