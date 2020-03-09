const express = require('express');
const router = express.Router()
const Joi = require('joi')
const passport = require('passport')

const User = require('../models/user')
const { forwardAuthenticated } = require('../config/auth');

//validation schema

const userSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    password: Joi.string().regex(/^[a-zA-Z0-9]{6,30}$/).required(),
    confirmationPassword: Joi.any().valid(Joi.ref('password')).required()
})

router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

router.route('/register', forwardAuthenticated)
    .get((req, res) => {
        res.render('register')

    })
    .post(async (req, res, next) => {
        try {
            console.log(req.body);
            const result = Joi.validate(req.body, userSchema)
            if (result.error) {
                req.flash('error', 'Data entered is not valid. Please try again.')
                res.redirect('/users/register')
                return
            }

            const user = await User.findOne({ 'email': result.value.email })
            if (user) {
                req.flash('error', 'Email is already in use.')
                res.redirect('/users/register')
                return
            }

            const hash = await User.hashPassword(result.value.password)

            delete result.value.confirmationPassword
            result.value.password = hash

            const newUser = await new User(result.value)
            await newUser.save()

            req.flash('success', 'Registration successfully, go ahead and login.')
            res.redirect('/users/login')

        } catch(error) {
            next(error)
        }
    })

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

module.exports = router