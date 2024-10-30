const mongoose = require ('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
username:{type:String,required:true},
email :{type:String, required:true, unique:true, match: [/.+\@.+\..+/, 'Please enter a valid email address']},
password:{type:String, required:true,minlength:[6, 'password must contain atleast 6 character']}
});

const User = mongoose.model('User',userSchema);
module.exports=User;
