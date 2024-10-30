const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const todoSchema = new Schema({
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    createdDate: { type: Date, default: Date.now },
    updatedDate: { type: Date }
  });

const projectSchema = new Schema({
    title: { type: String, required: true },
    createdDate: { type: Date, default: Date.now },
    todos: [todoSchema] 
  });
  
  const Project = mongoose.model('Project', projectSchema);
  module.exports = Project;