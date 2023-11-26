require('dotenv').config();
const express = require('express')
const cors = require('cors');
const jwt = require("jsonwebtoken")
const cookie_pares = require("cookie-parser")
const mongoose = require('mongoose');
const cc = require("node-console-colors");
const { Vote, Survey, Comment, MyUser } = require('./Schema');

const app = express()
const port = process.env.PORT || 5353
app.use(cookie_pares())
app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@saaddb.bmj48ga.mongodb.net/SurveySphere?retryWrites=true&w=majority`
mongoose.connect(uri)

async function logger(req, res, next) {
    let date = new Date()
    console.log(cc.set("fg_yellow", date.toLocaleString("en-US"), cc.set("fg_purple", req.method), cc.set("fg_cyan", req.url)));
    next()
}
const isThisToken = async (req, res, next) => {
    const token = req?.cookies?.huzaifa;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    jwt.verify(token, process.env.TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: "Unauthorized" })
        }
        req.user = decoded
        next()
    })
}
const isMightToken = async (req, res, next) => {
    const token = req?.cookies?.huzaifa;
    jwt.verify(token, process.env.TOKEN, (error, decoded) => {
    req.user = decoded
    next()
    })
}

async function run() {
    try {
        app.post('/changelike', logger, isThisToken, async (req, res) => {
            let data = req.body
            let vote = await Vote.isExist(data.survey, req.user.userid);
            if (vote.length == 0) {
                if (data.value == 1) {
                    data.like = true
                } else {
                    data.like = false
                }
                data.user = req.user.userid
                let vote_entry = await Vote.create(data)
                res.status(201).send(vote_entry)
            } else {
                vote = vote[0]
                if (data.value == 1) {
                    vote.like = true
                } else {
                    vote.like = false
                }
                vote.save()

            }
            res.send({ msg: "hello" })

        })
        app.get("/getsurvey", logger,isMightToken, async (req, res) => {
            const id = req.query.id
            const result = await Survey.findById(id).populate("createdby").lean() // lean makes it normal object or array. otherwise it will be immutable
            let isLike=0
            if (req.user == undefined) {
                isLike = 0
            } else {
                let vote = await Vote.isExist(id, req.user.userid);
                if (vote.length == 0) {
                    isLike = 1
                } else {
                    vote = vote[0]
                if (vote.like) {
                    isLike = 1
                } else {
                    isLike = 2
                }
                }
            }
            result.isLike=isLike
            res.send(result)
        })
        app.post('/insertuser', logger, async (req, res) => {
            const data = req.body
            try {
                const result = await MyUser.create(data)
                res.status(201).send(result)
            } catch (e) {
                console.log(`The Error is:${e.message}`);
                res.status(500).send(`${e.message}`)
            }
        })
        app.get('/getrole', logger, async (req, res) => {
            try {
                const user = await MyUser.findOne({ email: req.query.mail })
                if (user) {
                    res.send(user.role)
                } else {
                    res.status(401).send("unauthorized")
                }
            } catch (error) {
                console.log(`The Error is:${e.message}`);
            }

        })
        app.post("/insertsurvey", logger, isThisToken, async (req, res) => {
            let data = req.body
            data.createdby = req.user.userid
            let result = await Survey.create(data)
            res.status(201).send(result)
        })
        app.get("/latestsurvey", logger, async (req, res) => {
            let result = await Survey.find().limit(6)
            res.status(200).send(result)
        })
        app.post('/jsonwebtoken', logger, async (req, res) => {
            const user = req.body
            const userid = await MyUser.findOne({ email: user.email })
            user.userid = userid._id
            const token = jwt.sign(user, process.env.TOKEN, { expiresIn: '1h' })
            res.cookie('huzaifa', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
            }).send({ success: true })
        })
        app.post('/logout', logger, isThisToken, async (req, res) => {
            res.clearCookie('huzaifa', { maxAge: 0, sameSite: "none", secure: true, httpOnly: true }).send({ success: true })
        })
    } catch (e) {
        console.log(`The Error is:${e.message}`);
    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => { res.send("Backend Running") });
app.listen(port, () => { console.log(`Server Started at ${port}`) });
