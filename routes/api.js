'use strict';

// required modules
require('dotenv').config()
const mongoose = require('mongoose')

// Connection to mongoose
mongoose.connect(process.env['MONGO_URI'])
  .then(() => console.log("Connected to DB"))
  .catch(console.error);;


// Schema for the books
const { Reply } = require('../models/replySchema');
const { Thread } = require('../models/threadSchema');
const Board = require('../models/boardSchema');


module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      try {
        // Check if board exists
        const board = req.params.board ? req.params.board : req.body.board;
        const boardExists = await Board.findOne({ board: board });

        // Create new Board if it doesn't exist
        if (!boardExists) {
          console.log("Creating new board")
          const newBoard = new Board({
            board: board
          })
          newBoard.save()
        }
        
        // Create new thread
        const newThread = new Thread({
          text: req.body.text,
          delete_password: req.body.delete_password
        })
        await newThread.save()

        // Get the thread id
        const threadId = newThread._id;

        // Add thread to the board
        let query = { board: board }
        let updateBoard = await Board.findOneAndUpdate(
          query,
          { $push: { threads: threadId } }
        )
        await updateBoard.save()

        // Redirect to the board
        res.redirect(`/b/${board}/`)
      } 
      catch (error) {
        console.log("post thread error >>>", error)
      }
    })
    .get(async (req, res) => {
      try {
        // get board name from the request
        const board = req.params.board;

        // find the board and its threads
        const boardThreads = await Board.findOne({ board: board })
        const threadIds = boardThreads.threads;

        // find latest 10 threads in the board and sort by date
        const threads = await Thread.find({ _id: { $in: threadIds } })
          .sort({ bumped_on: -1 }) 
          .limit(10); 

        // find latest 3 replies for each thread
        const threadsWithReplies = await Promise.all(threads.map(async thread => {
          const replies = await Reply.find({ thread_id: thread._id })
            .sort({ created_on: -1 })
            .limit(3)
            .lean();

          // Remove reported and delete_password fields from replies
          const sanitizedReplies = replies.map(reply => {
            delete reply.reported;
            delete reply.delete_password;
            return reply;
          }); 

          // Remove reported and delete_password fields from threads 
          thread.replies = sanitizedReplies;
            delete thread.reported;
            delete thread.delete_password;
            return thread;
        }));

        res.json(threadsWithReplies);
      } 
      catch (error) {
        console.log("get threads error:", error)
      }
    })
    .delete(async (req, res) => {
      try{
        const board = req.params.board;
        const { thread_id, delete_password } = req.body;
        const thread = await Thread.findOne({ _id: thread_id});
        
        // If thread not found
        if (!thread) {
          res.send("thread not found")
          return
        }
        
        // Check if password is correct
        if (thread.delete_password !== delete_password) {
          // Password is incorrect
          res.send("incorrect password")
          return
        } else {
          // Password is correct
          res.send("success")
          // Delete the thread
          await Thread.deleteOne({ _id: thread_id })
          // Delete the thread from the board
          await Board.updateOne({ board: board }, { $pull: { threads: thread_id } })
        }
      }
      catch(error){
        console.log("delete thread error:", error)
      }
    })

    .put(async (req, res) => {
      try{
        const { thread_id } = req.body;
        const thread = await Thread.findOneAndUpdate({ _id: thread_id }, { reported: true });

        // If thread not found
        if (!thread) {
          return res.send("thread not found")
        } 
        // If thread is found and reported
        else {
          return res.send("reported")
        }
      } 
      catch (error) {
        console.log("put thread error:", error)
      }
    })

    app.route('/api/replies/:board')
      .post(async (req, res) => {
        try {
          const board = req.params.board;
          const { thread_id, text, delete_password } = req.body;
          
          // Find the thread
          const thread = await Thread.findOne({ _id: thread_id });
          if (!thread) {
            return res.send("thread not found")
          }

          // Create new reply
          const newReply = new Reply({
            text: text,
            delete_password: delete_password
          })
          await newReply.save()

          // Update the thread
          const updateThread = await Thread.findOneAndUpdate({ _id: thread_id }, { bumped_on: new Date(), $push: { replies: newReply._id } })
          await updateThread.save()
          
        
          // Redirect to the thread
          res.redirect(`/b/${board}/${thread_id}`)
        }
        catch (error) {
          console.log("post reply error:", error)
        }
      })

      .get(async (req, res) => {
        try {
          const thread_id = req.query.thread_id;
          
          // Find the thread
          const thread = await Thread.findOne({ _id: thread_id });
          
          // If thread not found
          if (!thread) {
            return res.send("thread not found")
          }

          // List of reply ids
          const repliesIds = thread.replies;

          // Find the replies
          const replies = await Reply.find({ _id: { $in: repliesIds } })
          .sort({ created_on: -1 })
          .lean();

          const threadWithReplies = {
            // add thread details
            ...thread.toObject(),
            // add sanitized replies
            replies: replies.map(reply => {
              const { reported, delete_password, ...sanitizedReply } = reply;
              return sanitizedReply;
            })
          }

          // Remove reported and delete_password fields from thread
          delete threadWithReplies.reported;
          delete threadWithReplies.delete_password;

          res.json(threadWithReplies);
        }
        catch (error) {
          console.log("get replies error:", error)
        }
      })
      .delete(async (req, res) => {
        try { 
          const { thread_id, reply_id, delete_password } = req.body;
          
          // Find the thread
          const thread = await Thread.findOne({ _id: thread_id });
          if (!thread) {
            return res.send("thread not found")
          }

          // Find the reply
          const reply = await Reply.findOne({ _id: reply_id });
          if (!reply) {
            return res.send("reply not found")
          }

          // Check if reply is in thread
          if (!thread.replies.includes(reply_id)) {
            return res.send("reply not in thread")
          }

          // Check if password is correct
          if (reply.delete_password !== delete_password) {
            return res.send("incorrect password")
          } else {
            // Password is correct
            await Reply.findOneAndUpdate({ _id: reply_id }, { text: "[deleted]" })
            return res.send("success")
          }

        }
        catch (error) {
          console.log("delete reply error:", error)
        }
      })
      .put(async (req, res) => {
        try {
          const { thread_id, reply_id } = req.body;

          // Find the thread
          const thread = await Thread.findOne({ _id: thread_id });
          if (!thread) {
            return res.send("thread not found")
          }
          // Find the reply
          const reply = await Reply.findOne({ _id: reply_id });
          if (!reply) {
            return res.send("reply not found")
          }
          // Check if reply is in thread
          if (!thread.replies.includes(reply_id)) {
            return res.send("reply not in thread")
          }

          // Update the reply
          const updatedReply = await Reply.findOneAndUpdate({ _id: reply_id }, { reported: true })
          updatedReply.save()
          
          return res.send("reported")

        } 
        catch (error) {
          console.log("put reply error:", error)
        }

      })
};
