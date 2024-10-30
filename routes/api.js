var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const User = require('../models/userModel');
const Project = require('../models/projectModel');



//common response structure
const commonResponse = (success, data, message) => {
  return {
    success: success,
    data: data || null,
    message: message
  };
};
//end......!

router.post('/signup',(req,res)=>{
    const {username, email, password}=req.body;

    const user = new User({username, email, password});
    const validationError = user.validateSync();
 
    if (validationError) {
      const message = Object.values(validationError.errors)[0].message;
      return res.status(400).json(commonResponse(false,null,message));
    }

    User.findOne({email})
    .then(existingUser=>{
        if(existingUser){
            return res.status(400).json(commonResponse(false,null,'Email already taken'));
        }
        return bcrypt.hash(password, 10);
    })
    .then(hashedPassword =>{
        const newUser = new User({username, email, password: hashedPassword});
        return newUser.save();
    })
    .then(()=> {
         return res.status(200).json(commonResponse(true,null,'Account created successfully'));
    })
    .catch(error =>{
         return res.status(500).json(commonResponse(false,null,'Internal server Error'));
    });
});

// for generating  secret key

const defaultSecretKey = crypto.randomBytes(32).toString('hex');

router.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    User.findOne({ email })
      .then(user => {
        if (!user) {
          return res.status(400).json(commonResponse(false,null,'This email id is not registered'));
        }
      
        bcrypt.compare(password, user.password).then(isMatch => {
            if (!isMatch) {
              return res.status(400).json(commonResponse(false,null,'Email id or password is incorrect'));
            }

            const secret = process.env.JWT_SECRET || defaultSecretKey;
  
            const token = jwt.sign(
              { userId: user._id },
              secret, 
              { expiresIn: '1h' }
            );
            const serializedData ={
              token:token,
            }

            return res.status(200).json(commonResponse(true, serializedData,'Successfully Logged In'));
          });
      })
      .catch(error => {
        return res.status(500).json(commonResponse(false,null,'Internal Server Error'));
      });
  });


//Middleware to check authorization
const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    const token = authorizationHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    const secret = process.env.JWT_SECRET || defaultSecretKey;

    const decoded = jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(401).json(commonResponse(false,null,'Invalid token'));
      }
      return decoded;
    });
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
};

router.get('/projects',authenticate, async (req, res) => {
  const projects = await Project.find();
  res.status(201).json(commonResponse(true,projects,'Successfully found'));
});

router.post('/projects',authenticate, async (req, res) => {
  const { title } = req.body;
  const project = new Project({ title });
  await project.save();
  res.status(201).json(commonResponse(true,null,'Successfully created new project'));
});

router.get('/projects/:id',authenticate, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json(commonResponse(false,null,'Project not found'));
  res.status(201).json(commonResponse(true,project,'Successfully found'));
});


router.put('/projects/:id',authenticate, async (req, res) => {
  const { title } = req.body;
  const project = await Project.findByIdAndUpdate(req.params.id, { title }, { new: true });
  res.status(201).json(commonResponse(true,null,'Successfully updated'));
});

router.post('/projects/:id/todos',authenticate, async (req, res) => {
  const project = await Project.findById(req.params.id);
  const { description } = req.body;
  project.todos.push({ description });
  await project.save();
  res.status(201).json(commonResponse(true,null,'Successfully todo created'));
});


router.put('/projects/:projectId/todos/:todoId',authenticate, async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  const todo = project.todos.id(req.params.todoId);
  todo.description = req.body.description || todo.description;
  todo.updatedDate = Date.now();
  await project.save();
  res.status(201).json(commonResponse(true,null,'Successfully todo updated'));
});

router.delete('/projects/:projectId/todos/:todoId',authenticate, async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  const todoId = req.params.todoId;
  project.todos = project.todos.filter(entry=>
    entry._id.toString()!==todoId.toString()
  );
  await project.save();
  res.status(201).json(commonResponse(true,null,'Successfully todo deleted'));
});

router.put('/projects/:projectId/todostatus/:todoId',authenticate, async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  const todo = project.todos.id(req.params.todoId);
  todo.status = req.body.status;
  await project.save();
  res.status(201).json(commonResponse(true,null,'Successfully status updated'));
});


module.exports = router;

