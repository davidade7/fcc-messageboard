const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let threadId
  
  test('Test 1 >> Creating a new thread: POST request to /api/threads/{board}', function(done) {
    // Setup
    let input = { board: "test", text: "Hello, World!", delete_password: "password" };
    
    // Test
    chai.request(server)
      // .keepOpen()
      .post('/api/threads/test')
      .send(input)
      .end(function (err, res) {
        assert.equal(res.status, 200)
        // Don't know what to assert here, because there only a redirect to the board
        done();
      })
  });

  test('Test 2 >> Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    // Test
    chai.request(server)
      // .keepOpen()
      .get('/api/threads/test')

      .end(function (err, res) {
        assert.equal(res.status, 200)
        assert.isArray(res.body);
        assert.isBelow(res.body.length, 11);
        assert.isObject(res.body[0]);
        assert.property(res.body[0], 'text');
        assert.property(res.body[0], '_id');
        assert.property(res.body[0], 'created_on');
        assert.property(res.body[0], 'bumped_on');
        assert.property(res.body[0], 'replycount');
        assert.property(res.body[0], 'replies');
        assert.isArray(res.body[0].replies);
        assert.isBelow(res.body[0].replies.length, 4);
        threadId = res.body[0]._id
        done();
      })
  });

  test('Test 3 >> Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
    // Setup
    let input = { board: "test", thread_id: threadId, delete_password: "wrongpassword" };
    
    // Test
    chai.request(server)
      // .keepOpen()
      .delete('/api/threads/test')
      .send(input)
      .end(function (err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'incorrect password')
        done();
      })
  });

  test('Test 5 >> Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    // Setup
    let input = { board: "test", thread_id: threadId, reported: true };
    
    // Test
    chai.request(server)
      // .keepOpen()
      .put('/api/threads/test')
      .send(input)
      .end(function (err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'reported')
        done();
      })
  });

  test('Test 4 >> Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an valid delete_password', function(done) {
    // Setup
    let input = { board: "test", thread_id: threadId, delete_password: "password" };
    
    // Test
    chai.request(server)
      // .keepOpen()
      .delete('/api/threads/test')
      .send(input)
      .end(function (err, res) {
        assert.equal(res.status, 200)
        assert.equal(res.text, 'success')
        done();
      })
  });

  
});
