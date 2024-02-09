const mongoose = require("mongoose");

const forgotPasswordSchema = new mongoose.Schema({
    userToken:{
        type:String,
        required:true,
    },
    jwtToken:{
        type:String,
        // required:true,
    },
})

const forgotPassword = mongoose.model("forgotPassword", forgotPasswordSchema);

module.exports = forgotPassword;