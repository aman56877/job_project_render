const validator = require("validator");
const User = require("../models/users");
const ForgotPassword = require("../models/forgotPassword");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
// const specificDateTime = require("moment-timezone");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const jwtSecretKey = process.env.JWT_SECRET_KEY;







exports.registerUser = async (req, res) => {
    try {

        // const date = new Date();
        const { name, email, number, password } = req.body;
        const requiredFields = ['name', 'email', 'number', 'password'];
        const token = uuidv4();
        const saltRounds = 10;
        // const createdAt = specificDateTime(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        // const updatedAt = specificDateTime(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        const errors = [];

        requiredFields.forEach(field => {
            if (!req.body[field]) {
                errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} field is required`);
            }
        });

        if (!validator.isEmail(email)) {
            errors.push("Please enter correct email address");
        }
        if (number.length < 10 || number.length > 12) {
            errors.push("Number should range between 10 to 12");
        }
        if (password.length < 8) {
            errors.push("Password should be greater than 8 characters");
        }
        if (!validator.isStrongPassword(password)) {
            errors.push("Plase enter a strong password");
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            errors.push("This email is already registered");
        }
        if (errors.length > 0) {
            res.status(400).json({ error: errors[0] });
            return;
        } else {

            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = new User({
                name,
                email,
                number,
                password: hashedPassword,
                token,
                // createdAt: createdAt,
                // updatedAt: updatedAt,
            });

            const newUserSave = await newUser.save();
            if (newUserSave) {
                const sanitizedUser = newUserSave.toObject();

                delete sanitizedUser.password;

                res.status(200).json({ message: "User has been saved", user: sanitizedUser });
            }
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error });
    }
}


exports.login = async (req, res) => {
    const { email, password } = req.body;
    const requiredFields = ['email', 'password'];
    const errors = [];

    requiredFields.forEach(field => {
        if (!req.body[field]) {
            errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} field is required`);
        }
    });

    if (!validator.isEmail(email)) {
        errors.push("Please enter a valid email");
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors: errors[0] });
    }

    const user = await User.findOne({ email });
    if (user) {
        const matchPassword = await bcrypt.compare(password, user.password);
        if (matchPassword) {
            res.status(200).json({ message: "User successfully logged in", user: user });
        } else {
            res.status(400).json({ message: "Wrong Password" });
        }
    } else {
        res.status(400).json({ message: "This email is not registered with us" });
    }
}

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const errors = [];

        if (!email) {
            errors.push("Email field is required");
        }
        if (!validator.isEmail(email)) {
            errors.push("Please enter a valid email");
        }

        const user = await User.findOne({ email });

        if (!user) {
            errors.push("This email is not registered with us");
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        } else {
            const payLoad = {
                userToken: user.token,
                userEmail: user.email,
            };

            const transporter = nodemailer.createTransport({
                service: process.env.SERVICE,
                auth: {
                    user: process.env.USER,
                    pass: process.env.PASSWORD
                },
            });

            const jwtToken = jwt.sign(payLoad, jwtSecretKey, { expiresIn: '30m' });

            const mailOptions = {
                from: process.env.FROM,
                to: email,
                subject: "Password Reset Link",
                text: `Click on the following link to reset the password. This link will only work once and will be valid for only 30 minutes.\
            http://localhost:3000/resetPassword/${jwtToken}`
            }

            transporter.sendMail(mailOptions, async (error, info) => {
                if (error) {
                    res.status(400).json({ error });
                } else {
                    const userInFP = await ForgotPassword.findOne({ userToken: user.token });
                    if (userInFP) {
                        userInFP.jwtToken = jwtToken;
                        const updatedUserInFP = await userInFP.save();
                        if (updatedUserInFP) {
                            return res.status(200).json({ info, message: "Mail has been sent successfully" });
                        }
                    } else {
                        const jwtinDB = new ForgotPassword({
                            userToken: user.token,
                            jwtToken: jwtToken
                        });
                        const jwtinDBSave = await jwtinDB.save();
                        if (jwtinDBSave) {
                            return res.status(200).json({ info, message: "Mail has been sent successfully" });
                        }
                    }
                }
            })
        }
    } catch (error) {
        res.status(500).json({error});
    }

}


exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const token = req.params.token;
        const saltRounds = 10;

        const errors = [];

        if (!password) {
            errors.push("Please enter the password");
        }
        if (!confirmPassword) {
            errors.push("Please enter the confirm Password");
        }
        if (password !== confirmPassword) {
            errors.push("Password and confirm password should be same");
        }
        if (!validator.isStrongPassword(password)) {
            errors.push("Please enter a strong password");
        }
        if (password.length < 8) {
            errors.push("Password should be atleast 8 characters");
        }
        if (!token) {
            errors.push("Invalid link");
        }

        const decodedToken = jwt.verify(token, jwtSecretKey);
        const currentTime = Math.floor(Date.now() / 1000);


        const user = await User.findOne({ token: decodedToken.userToken });
        const forgotPasswordUser = await ForgotPassword.findOne({ userToken: decodedToken.userToken });

        if (forgotPasswordUser && forgotPasswordUser.jwtToken === null) {
            errors.push("This link has already been used once.");
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0] });
        }

        if (user && forgotPasswordUser) {

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            forgotPasswordUser.jwtToken = null;
            const updateUser = await forgotPasswordUser.save();
            user.password = hashedPassword
            const updatePassword = await user.save();

            if (updatePassword && updateUser) {
                return res.status(200).json({ updatePassword, message: "Password has been sccessfully updated" });
            } else {
                return res.status(400).json({ message: "Password has not been updated" });
            }
        } else {
            res.status(400).json({ message: "Internal Server Error" });
        }
    } catch (error) {
        if(error.name === "TokenExpiredError"){
            res.status(400).json({message:"This link has been expired"});
        }
    }
}