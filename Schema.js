const mongo =require("mongoose")
const humanizeErrors = require('mongoose-error-humanizer')
const userSechema=new mongo.Schema({
    name:String,
    email:{
        type:String,
        unique:true,
        lowercase:true
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
    text:String
},{
    timestamps:true
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
    category:String,
    createdby:{
        type:mongo.Types.ObjectId,
        ref:"MyUser"
    },
    comment:{
        type:[mongo.Types.ObjectId],
        default:[],
        ref:"Comment"
    }
},{
    timestamps:true
})

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
    option:Boolean,
    survey:{
        type:mongo.Types.ObjectId,
        ref:"Survey"
    }
},{
    timestamps:true
})
voteSchema.post("save",humanizeErrors)
voteSchema.post("update",humanizeErrors)
 const Vote=mongo.model("Vote",voteSchema)

module.exports={
    Vote:Vote,
    Survey:Survey,
    Comment:Comment,
    MyUser:MyUser,
}
