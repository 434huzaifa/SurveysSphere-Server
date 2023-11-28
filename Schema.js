const mongo =require("mongoose")
const humanizeErrors = require('mongoose-error-humanizer')
const userSechema=new mongo.Schema({
    name:String,
    email:{
        type:String,
        unique:true,
        lowercase:true
    },
    image:{
        type:String,
        default:null
    },
    role:String,
},{
    timestamps:true
})
userSechema.post("save",humanizeErrors)
userSechema.post("update",humanizeErrors)
 const MyUser=mongo.model("MyUser",userSechema)

const commentSchema=new mongo.Schema({
    user:{
        type:mongo.Types.ObjectId,
        ref:"MyUser"
    },
    text:String,
    survey:{
        type:mongo.Types.ObjectId,
        ref:"Survey"
    },
},{
    timestamps:true
})
commentSchema.post("save",async function(doc) {
    let survey=await Survey.findById(doc.survey)
    survey.totalcomment+=1
    survey.comment.push(doc._id)
    survey.save()

})
commentSchema.post("save",humanizeErrors)
commentSchema.post("update",humanizeErrors)

const Comment=mongo.model("Comment",commentSchema)

const surveySchema=new mongo.Schema({
    title:String,
    description:String,
    like:{
        type:Number,
        default:0
    },
    dislike:{
        type:Number,
        default:0
    },
    totalvote:{
        type:Number,
        default:0
    },
    totalcomment:{
        type:Number,
        default:0
    },
    category:String,
    createdby:{
        type:mongo.Types.ObjectId,
        ref:"MyUser"
    },
    comment:{
        type:[mongo.Types.ObjectId],
        default:[],
        ref:"Comment"
    },
    questions:{
        type:[String],
        default:[]
    },
    expire:{
        type:Date,
        default:()=>Date.now()
    }
},{
    timestamps:true
})
surveySchema.index({title:1,category:1})
surveySchema.pre("save",function(next) {
    this.like=parseInt(this.like)
    this.dislike=parseInt(this.dislike)
    next()
})
surveySchema.post("save",humanizeErrors)
surveySchema.post("update",humanizeErrors)

const Survey=mongo.model("Survey",surveySchema)

const voteSchema=new mongo.Schema({
    user:{
        type:mongo.Types.ObjectId,
        ref:"MyUser"
    },
    options:{
        type:[Boolean],
        default:null,
    },
    like:{
        type:Boolean,
        default:null
    },
    survey:{
        type:mongo.Types.ObjectId,
        ref:"Survey"
    },

},{
    timestamps:true
})
voteSchema.post("save",async function (doc) {
    let survey=await Survey.findById(doc.survey)
    let like=await Vote.where("like").equals(true).where("survey").equals(doc.survey).countDocuments()
    let dislike=await Vote.where("like").equals(false).where("survey").equals(doc.survey).countDocuments()
    let votes=await Vote.where({
        $expr: { $gt: [{ $size: '$options' }, 0] }
      }).where("survey").equals(doc.survey).countDocuments()
    survey.like=like
    survey.dislike=dislike
    survey.totalvote=votes
    survey.save()
    
})
voteSchema.statics.isExist= function (surveyid,userid) {
    return  this.where("user").equals(userid).where("survey").equals(surveyid).limit(1)
}

voteSchema.post("save",humanizeErrors)
voteSchema.post("update",humanizeErrors)
const Vote=mongo.model("Vote",voteSchema)

reportSchema=mongo.Schema({
    survey:{
        type:mongo.Types.ObjectId,
        ref:"Survey"
    },
    user:{
        type:mongo.Types.ObjectId,
        ref:"MyUser"
    },
})

module.exports={
    Vote:Vote,
    Survey:Survey,
    Comment:Comment,
    MyUser:MyUser,
}
