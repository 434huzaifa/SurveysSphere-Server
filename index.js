require('dotenv').config();
const express = require('express')
const cors = require('cors');
const jwt = require("jsonwebtoken")
const cookie_pares = require("cookie-parser")
const mongoose = require('mongoose');
const cc = require("node-console-colors");
const moment = require("moment")
const stripe = require("stripe")(process.env.SK)
const fs = require('fs');
const { Vote, Survey, Comment, MyUser, Payment } = require('./Schema');

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
    if (!token) {
        req.user = undefined
    }
    jwt.verify(token, process.env.TOKEN, (error, decoded) => {
        req.user = decoded
    })
    next()
}


async function run() {
    try {
        app.post('/pro', logger, isThisToken, async (req, res) => {
            let data=req.body
            data.user=req.user.userid
            const user = await MyUser.findById(req.user.userid)
            if (user && user.role != "Pro") {
                user.role = "Pro"
                user.save()
                const payment=await Payment.create(data)
                console.log("🔥 ~ file: index.js ~ line 67 ~ payment", payment)
                res.send({ msg: "Congratulitons! We are happy to have you as pro user" })
            } else {
                res.sendStatus(403)
            }
        })
        app.get("/payintent", logger, isThisToken, async (req, res) => {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 1000,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        app.get('/surveychart', logger, async (req, res) => {
            const survey = req.query.id
            const votes = await Vote.where("survey").equals(survey).lean()
            let data = new Array()
            data.push(new Array("Options", "True", "False"))
            if (votes.length != 0) {

                for (let index = 0; index < votes[0].options.length; index++) {
                    data.push(new Array(`Q${index + 1}`, 0, 0))
                }
                for (const iterator of votes) {
                    for (let index = 0; index < iterator.options.length; index++) {
                        const element = iterator.options[index];
                        if (element != null) {
                            if (element) {
                                data[index + 1][1] += 1
                            } else {
                                data[index + 1][2] += 1
                            }
                        }

                    }
                }
            }
            res.send(data)


        })
        app.post('/vote', logger, isThisToken, async (req, res) => {
            const data = req.body
            let vote = await Vote.isExist(data.survey, req.user.userid);
            data.options = []
            for (let index = 0; index < parseInt(data.qsize); index++) {
                const element = data[String(index)]
                if (element == "false") {
                    data.options.push(false)
                } else {
                    data.options.push(true)
                }
                delete data[String(index)]
            }
            delete data.qsize
            data.user = req.user.userid
            if (vote.length == 0) {
                let vote_entry = await Vote.create(data)
                res.status(201).send(vote_entry)
            } else {
                vote = vote[0]
                vote.options = data.options
                vote.save()
                res.status(200).send({ msg: "Updated" })
            }
        })
        app.get('/huazifatest', logger, async (req, res) => {
            let exp = moment().add(1, 'd').toDate()
            console.log(exp);
            const alldata = await Survey.find()
            for (const iterator of alldata) {
                iterator.expire = exp
                iterator.save()
            }
            // const filePath = 'G:/OneDrive - MSFT/Huzaifa/CODE/19_11_test/data.json';
            // fs.readFile(filePath, 'utf8', async (err, data) => {
            //     if (err) {
            //       console.error('Error reading JSON file:', err);
            //       res.status(500).send('Internal Server Error');
            //       return;
            //     }

            //     const jsonData = JSON.parse(data);
            //     let count=0
            //     for (const iterator of jsonData) {
            //         let randomUser = await MyUser.aggregate([{ $sample: { size: 1 } }]);
            //         iterator.createdby=randomUser._id
            //         await Survey.create(iterator)
            //         count++
            //     }
            //     res.json({count});
            //   });
            res.send({ msg: "good luck" })
        })
        app.get("/getallsurvey", logger, async (req, res) => {
            console.log(req.query);
            let result = null
            if (Object.keys(req.query).length != 0 && req.query?.category) {
                let cate = req.query.category.split(",")
                let query = Survey.where("category").in(cate)
                if (req.query.keyword != '') {
                    query.where("title").regex(new RegExp(req.query.keyword, 'i'))
                }
                query.sort(`${req.query.asc == "true" ? "totalvote" : "-totalvote"}`).select("-createdby -category -comment -questions")
                console.log(query.getFilter());
                console.log(query.getOptions());
                let searchresult = await query.exec()
                console.log(searchresult.length);
                res.send(searchresult)
            } else {
                let result = await Survey.find().sort(`${req.query.asc == "true" ? "totalvote" : "-totalvote"}`).select("-createdby -category -comment -questions")
                res.send(result)
            }

        })
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
                res.status(200).send({ msg: "Updated" })
            }

        })
        app.post("/setcomment", logger, isThisToken, async (req, res) => {
            const data = req.body
            data.user = req.user.userid
            const result = await Comment.create(data)
            res.status(201).send(result)

        })
        app.get("/getcomment", logger, async (req, res) => {
            const id = req.query.id
            const comments = await Comment.where("survey").equals(id).populate({
                path: "user",
                select: "name image -_id"
            }).select("user text -_id").lean()
            res.send(comments)
        })
        app.get("/getsurvey", logger, isMightToken, async (req, res) => {
            const id = req.query.id
            console.log(id);
            const result = await Survey.findById(id).populate("createdby").lean() // lean makes it normal object or array. otherwise it will be a mongoose object. Object and Mongoose Object are not same
            let isLike = 0
            let options = null
            if (req.user == undefined) {
                isLike = 0
            } else {
                let vote = await Vote.isExist(id, req.user.userid);
                if (vote.length == 0) {
                    isLike = 0

                } else {
                    vote = vote[0]
                    if (vote.options.length != 0) {
                        options = vote.options
                    }
                    if (vote.like) {
                        isLike = 1
                    } else if (vote.like == null) {
                        isLike = 0
                    }
                    else {
                        isLike = 2
                    }
                }
            }
            result.isLike = isLike
            result.options = options
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
            data.expire = moment(data.expire, "MMMM DD, YYYY").toDate()
            data.createdby = req.user.userid
            data.question = []
            for (let index = 0; index < parseInt(data.qsize); index++) {
                const element = data[`q${index}`]
                data.question.push(element)
                delete data[`q${index}`]
            }
            delete data.qsize
            let result = await Survey.create(data)
            res.status(201).send(result)
            // res.status(201).send({msg:"msg"})
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
