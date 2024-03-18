const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors');
const path = require('path')
const uuid = require('uuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const multer = require('multer');
const WebSocket = require('ws');
const cron = require('node-cron');
const {OpenAI} = require('openai');
const axios = require('axios');
require('dotenv').config();
process.env.OPENAI_API_KEY = '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';
const fs = require('fs');
const { emitWarning, allowedNodeEnvironmentFlags } = require('process');
const { request } = require('http');

const app = express()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json())


app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081'], // Allow requests from these origins
}));

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log(`Received message => ${message}`);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});




const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const uploads = multer({ storage: storage }); 


app.use(express.urlencoded({extended: true }));

const databasePath = path.join(__dirname, 'myDB.db')

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    const port = process.env.PORT || 8080;

    server.listen(port, () =>
      console.log(`Server Running at ${port}`),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// authentication middleware function
function authenticateToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.json({error: 'Invalid JWT Token'})
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.json({error: 'Invalid JWT Token'})
      } else {
        next()
      }
    })
  }
}

const mediaFilePhotos = async(details) => {
  const profilePhotoPath = path.join(__dirname, 'uploads', details.profile_photo);
    const readProfilePhoto = () => {
      return new Promise((resolve, reject) => {
        fs.readFile(profilePhotoPath, (error, data) => {
          if (error) {
            console.error('Error reading profile photo:', error);
            reject(error);
          } else {
            // Resolve with the file data
            resolve(data);
          }
        });
      });
    };
    const profilePhotoData = await readProfilePhoto();
    const profilePhotoBlob = Buffer.from(profilePhotoData).toString('base64')
    const profileDetailsPhoto = {...details, profilePhotoBlob}
    return profileDetailsPhoto
}

const mediaFilesPosts = async(details) => {
  const postPath = path.join(__dirname, 'uploads/posts', details.post_path);
    const readProfilePhoto = () => {
      return new Promise((resolve, reject) => {
        fs.readFile(postPath, (error, data) => {
          if (error) {
            console.error('Error reading profile photo:', error);
            reject(error);
          } else {
            // Resolve with the file data
            resolve(data);
          }
        });
      });
    };
    const postFileData = await readProfilePhoto();
    const postFile = Buffer.from(postFileData).toString('base64')
    const postDetails = {...details, postFile}
    return postDetails
}

//User

app.post('/registration/', async (request, response) => {
  const {firstName, lastName, emailId, phoneNumber, password, dateOfBirth, gender} = request.body;

  const checkingPhoneNUmberQuary = `SELECT * FROM users WHERE phone_number = '${phoneNumber}';`
  const checkingPhoneNUmber = await database.get(checkingPhoneNUmberQuary)
  const checkingEmailIdQuary = `SELECT * FROM users WHERE email_id = '${emailId}';`
  const checkingEmailId = await database.get(checkingEmailIdQuary)
  if (checkingEmailId !== undefined){
    response.status(400)
    response.send({error: "Email Already exits"})
  } else if (checkingPhoneNUmber !== undefined) {
    response.status(400)
    response.send({error: "Mobile Number Already exits"})
  } else if (checkingEmailId === undefined && checkingPhoneNUmber === undefined){
    let dateOfBrithInString = dateOfBirth.toString()
    const id = uuid.v4();
    bcrypt.hash(password, 10, async(error, hashedPassword) => {
      if (error) {
          response.json(error)
      } else {
          const addingUserDetailsQuary = `INSERT INTO
                                      users (id, first_name, last_name, email_id, phone_number, password, date_of_birth, gender)
                                    VALUES ('${id}', '${firstName}', '${lastName}', '${emailId}', '${phoneNumber}', '${hashedPassword}', '${dateOfBrithInString}', '${gender}');`
          const payload = {
            username: emailId,
          }
          const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
          await database.run(addingUserDetailsQuary);   
          response.status(200);
          response.send({jwtToken, id})                 
      }
    })
  }  
})

app.get('/profile/upload/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM users WHERE id='${userId}';`
  const userDetails = await database.get(gettingFirstNameQueary);
  if (userDetails !== undefined){
    response.json({userDetails: userDetails});
  }  
})

app.get('/user/additional/details/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM user_additional_details WHERE user_id='${userId}';`
  const userDetails = await database.get(gettingFirstNameQueary);
  if (userDetails !== undefined){
    response.json({userDetails: userDetails});
  }  
})

app.get('/user/details/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM user_additional_details inner join users on user_additional_details.user_id = users.id WHERE user_id NOT LIKE '${userId}' AND user_id NOT IN (
                                      SELECT request_sent_to FROM friend_request_table where request_sent_by = '${userId}') AND user_id NOT IN (
                                        SELECT request_sent_by FROM friend_request_table where request_sent_to = '${userId}')
                                        AND user_id NOT IN (
                                          SELECT followings FROM followers_table where followers = '${userId}');`
  const userDetails = await database.all(gettingFirstNameQueary);
  let suggestedUsers = []
  for (let each of userDetails) {
    const eachUser = await mediaFilePhotos(each)
    suggestedUsers.push(eachUser)
  }
  if (userDetails !== undefined){
    response.json({userDetails: suggestedUsers});
  }  
})

app.get('/profile/photo/stream/:filename', (request, response) => {
  const filename = request.params.filename;
  if (filename !== undefined || filename !== null) {
  const filePath = path.join(__dirname, 'uploads/', filename);

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    response.writeHead(206, headers);
    file.pipe(response);
  } else {
    const headers = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };

    response.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(response);
  }
  }
});

app.get('/posts/stream/:filename', (request, response) => {
  const filename = request.params.filename;
  const filePath = path.join(__dirname, 'uploads/posts', filename);

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    response.writeHead(206, headers);
    file.pipe(response);
  } else {
    const headers = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };

    response.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(response);
  }
});

app.get('/posts/get/', authenticateToken, async(request, response) => {
  try {
    const gettingPostsQuery = `SELECT * FROM posts INNER JOIN user_additional_details ON posts.user_id = user_additional_details.user_id 
                                ORDER BY time_data_of_post DESC;`
    const postsDetailsAll = await database.all(gettingPostsQuery)
    if (postsDetailsAll !== undefined) {
      response.json({postsDetails: postsDetailsAll});
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/user/posts/:selectedId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.selectedId
    const gettingPostOfUserQuery = `SELECT * FROM posts INNER JOIN user_additional_details ON posts.user_id = user_additional_details.user_id
                                    WHERE posts.user_id = '${userId}' ORDER BY time_data_of_post DESC;`
    const postDetails = await database.all(gettingPostOfUserQuery)
    response.status(200).json({postDetails: postDetails})
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/messaged/users/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId
    const gettingMessagedUserQuery = `SELECT * FROM messaged_users INNER JOIN user_additional_details
                                      ON messaged_users.messaged_user_id = user_additional_details.user_id WHERE main_user= '${userId}';`
    const messagedUser = await database.all(gettingMessagedUserQuery);
    response.status(200).json({messagedUsers: messagedUser})
    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/chat/details/:userId/:messagedId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId
    const messageId = request.params.messagedId
    const gettingMessagesQuery = `SELECT * FROM messages WHERE ((message_sent_by = '${userId}' AND message_sent_too = '${messageId}')
                                  OR (message_sent_by = '${messageId}' AND message_sent_too = '${userId}')) AND messages.message_id 
                                  NOT IN (SELECT message_id FROM messages_delete WHERE deleted_by = '${userId}');`
    const chatDetails = await database.all(gettingMessagesQuery)
    response.status(200).json({chatDetails: chatDetails})
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/likes/count/:postId/:userId', authenticateToken, async(request, response) => {
  try {
    const postId = request.params.postId;
    const userId = request.params.userId;
    const gettingLikesCountquery = `SELECT count(user_id) as likesCount FROM likes WHERE post_id = '${postId}';`
    const postLikesCount = await database.get(gettingLikesCountquery)
    const gettingLikedUsersQuery = `SELECT user_id FROM likes WHERE post_id = '${postId}' AND user_id = '${userId}';`
    const postLikedusers = await database.get(gettingLikedUsersQuery)
    let isPostLiked
    if (postLikedusers !== undefined) {
      isPostLiked = true
    }
    else {
      isPostLiked = false
    }
    response.status(200).json({postLikesCount: postLikesCount.likesCount, isPostLiked: isPostLiked});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/comments/count/:postId/', authenticateToken, async(request, response) => {
  try {
    const postId = request.params.postId;
    const gettingCommentCountquery = `SELECT count(comment_id) as commentCount FROM comments WHERE post_id = '${postId}';`
    const postCommentsCount = await database.get(gettingCommentCountquery)    
    response.status(200).json({postCommentsCount: postCommentsCount.commentCount});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/comments/:postId', authenticateToken, async(request, response) => {
  try {
    const postId = request.params.postId
    const gettingCommentsQuery = `SELECT * FROM comments INNER JOIN user_additional_details
                                  ON comments.user_id = user_additional_details.user_id WHERE post_id = '${postId}';`
    const postComments = await database.all(gettingCommentsQuery)
    response.status(200).json({postComments: postComments});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/profile/details/:userId', async(request, response) => {
  try {
    const userId = request.params.userId;
    const gettingCurrentUserDetailsQuery = `SELECT * FROM user_additional_details inner join users on user_additional_details.user_id = users.id WHERE user_id = '${userId}';`
    const profileDetails = await database.get(gettingCurrentUserDetailsQuery)
    const gettingFollowesQuery = `select count(followers) as followersCount from followers_table where followings = '${userId}';`
    const followersCount = await database.get(gettingFollowesQuery)
    const gettingFollowingsQuery = `select count(followings) as followingsCount from followers_table where followers = '${userId}';`
    const followingsCount = await database.get(gettingFollowingsQuery)
    const gettingPostsCountQuery = `SELECT count(post_id) as postsCount from posts WHERE user_id = '${userId}';`
    const postsCount = await database.get(gettingPostsCountQuery)
    /*const profilePhotoPath = path.join(__dirname, 'uploads', profileDetails.profile_photo);
    const readProfilePhoto = () => {
      return new Promise((resolve, reject) => {
        fs.readFile(profilePhotoPath, (error, data) => {
          if (error) {
            console.error('Error reading profile photo:', error);
            reject(error);
          } else {
            // Resolve with the file data
            resolve(data);
          }
        });
      });
    };
    const profilePhotoData = await readProfilePhoto();
    const profilePhotoBlob = Buffer.from(profilePhotoData).toString('base64') */
    const  userDetails= {...profileDetails, ...followersCount, ...followingsCount, ...postsCount}
    response.status(200).json({ userDetails: userDetails});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/post/messages/', authenticateToken, async(request, response) => {
  try {
    const {messageSentBy, messageSentToo, messageContent, messageType, messagedTime} = request.body
    const gettingMessagedUserQuery = `SELECT * FROM messaged_users WHERE main_user = '${messageSentBy}' AND messaged_user_id = '${messageSentToo}';`
    const isMessagedUserPresent = await database.get(gettingMessagedUserQuery)
    const gettingMessagedUserQuery2 = `SELECT * FROM messaged_users WHERE main_user = '${messageSentToo}' AND messaged_user_id = '${messageSentBy}';`
    const isMessagedUserPresent2 = await database.get(gettingMessagedUserQuery2)
    let addingMessagedUserQuery
    if (isMessagedUserPresent === undefined && isMessagedUserPresent2 === undefined) {
      addingMessagedUserQuery = `INSERT INTO messaged_users(messaged_user_table_id, main_user, messaged_user_id, last_message, last_message_time)
                                        VALUES ('${uuid.v4()}', '${messageSentBy}', '${messageSentToo}', '${messageContent}', '${messagedTime}'),
                                        ('${uuid.v4()}', '${messageSentToo}', '${messageSentBy}', '${messageContent}', '${messagedTime}');`
    }else {
      addingMessagedUserQuery = `UPDATE messaged_users
                                  SET last_message = '${messageContent}', last_message_time= '${messagedTime}'
                                  WHERE (main_user = '${messageSentBy}' AND messaged_user_id = '${messageSentToo}')
                                    OR (main_user = '${messageSentToo}' AND messaged_user_id = '${messageSentBy}');`
    }
    await database.run(addingMessagedUserQuery);
    const addingMessagesQuery = `INSERT INTO messages (message_id, message_sent_by, message_sent_too, message_content, message_type, message_sent_time)
                                      VALUES ('${uuid.v4()}', '${messageSentBy}', '${messageSentToo}', '${messageContent}', '${messageType}', '${messagedTime}');`
    await database.run(addingMessagesQuery)
    const gettingChatDetailsQuery = `SELECT * FROM messages WHERE message_sent_by = '${messageSentBy}' AND message_sent_too = '${messageSentToo}'
                                ORDER BY message_sent_time DESC LIMIT 1;`
    const newMessageDetails = await database.get(gettingChatDetailsQuery)
    response.status(200).json({message: 'Upload Success'})

    const newMessage = {
      type: 'newMessage',
      payload: { ...newMessageDetails },
    };

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newMessage));
      }
    });
    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/add/deleted/message/', authenticateToken, async(request, response) => {
  try {
    const {messageId, messageDeletedBy} = request.body
    const addingDeletedMessageQuery = `INsERT INTO messages_delete (message_delete_table_id, message_id, deleted_by)
                                        VALUES ('${uuid.v4()}', '${messageId}', '${messageDeletedBy}');`
    await database.run(addingDeletedMessageQuery)    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})


app.post('/post/likes/', authenticateToken, async(request, response) => {
  try {
    const {userId, postId, likedTime} = request.body
    const addingLikeQuery = `INSERT INTO likes (like_id, post_id, user_id, time_of_like)
                              Values ('${uuid.v4()}', '${postId}', '${userId}', '${likedTime}');`
    await database.run(addingLikeQuery)
    response.status(200).json({ message: 'Upload Success'});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/add/comment/', authenticateToken, async(request, response) => {
  try {
    const {userId, postId, commentContent, commentedTime} = request.body
    const addingCommentQuery = `INSERT INTO comments (comment_id, post_id, user_id, comment_content, time_of_comment)
                                  Values('${uuid.v4()}', '${postId}', '${userId}', '${commentContent}', '${commentedTime}');`
                                  
    await database.run(addingCommentQuery);
    response.status(200).json({message: 'Upload Success'})
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})


app.post('/user/additional/details/', authenticateToken, uploads.single('file'), async(request, response) =>  {
  try {
    const {userId, username, bio, relationshipStatus } = request.body;
    const profilePhotoPath = request.file.filename;
    const addingAdditionalDetailesQueary = `INSERT INTO 
                                              user_additional_details(id, user_id, username, bio, relationship_status, profile_photo)
                                           VALUES ('${uuid.v4()}', '${userId}', '${username}', "${bio}", '${relationshipStatus}', '${profilePhotoPath}');`
    await database.run(addingAdditionalDetailesQueary);
    response.status(200).json({ message: 'Upload Success'});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  } 
})

const storagePosts = multer.diskStorage({
  destination: 'uploads/posts',
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const uploadPosts = multer({ storage: storagePosts });

app.post('/posts/users/', uploadPosts.single('postFile'), authenticateToken, async(request, response) => {
  try {
    const {userId, caption, hashTags,postSecurity, postedTime} = request.body
    const postPath = request.file.filename;
    const addingPostQuery = `INSERT INTO 
                                posts(post_id, user_id, post_path, caption, hash_tags, post_security, time_data_of_post)
                            VALUES ('${uuid.v4()}', '${userId}', '${postPath}', '${caption}', ${JSON.stringify(hashTags)}, '${postSecurity}', '${postedTime}');`
    await database.run(addingPostQuery);
    response.status(200).json({ message: 'Upload Success'});    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/friend/request/', authenticateToken, async (request, response) => {
  try {
    const { requestSentBy, requestSentTo, utcTime } = request.body;
    const addingFriendRequestQuery = `INSERT INTO
                                      friend_request_table(friend_request_table_id, request_sent_by, request_sent_to, time_date)
                                    VALUES ('${uuid.v4()}', '${requestSentBy}', '${requestSentTo}', '${utcTime}');`;
    await database.run(addingFriendRequestQuery);
    const gettingRequestOfUserQuery = `SELECT * FROM friend_request_table 
                                                INNER JOIN user_additional_details
                                                ON friend_request_table.request_sent_by = user_additional_details.user_id
                                                WHERE friend_request_table.request_sent_to = '${requestSentTo}' AND friend_request_table.request_sent_by= '${requestSentBy}';`
    const latestRequest = await database.get(gettingRequestOfUserQuery)
    console.log(latestRequest)
    response.status(200).json({ message: 'Upload Success' });

    // Emit WebSocket message for new friend request
    const newFriendRequest = {
      type: 'newFriendRequest',
      payload: { requestSentBy, requestSentTo, utcTime },
    };

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newFriendRequest));
      }
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/delete/friend/request/', authenticateToken, async(request, response) => {
  try {
    const {requestSentBy, requestSentTo} = request.body
    const deletingFriendRequestQuery = `DELETE from friend_request_table where request_sent_by='${requestSentBy}' AND request_sent_to = '${requestSentTo}';`
    await database.run(deletingFriendRequestQuery);
    response.status(200).json({ message: 'Deleted Success'});

    const newFriendRequest = {
      type: 'newFriendRequest',
      payload: { requestSentBy, requestSentTo },
    };
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newFriendRequest));
      }
    });
    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/following/followers/user/', authenticateToken, async(request, response) => {
  try {
    const {follower, following} = request.body;
    const addingFollowerQuery = `INSERT INTO followers_table ( id, followers, followings )
                                  VALUES ('${uuid.v4()}', '${follower}', '${following}')`
    await database.run(addingFollowerQuery);
    const deletingFriendRequestQuery = `DELETE from friend_request_table where request_sent_by='${follower}' AND request_sent_to = '${following}';`
    await database.run(deletingFriendRequestQuery);
    response.status(200).json({ message: 'Upload Success' });
    
    const newFriendRequest = {
      type: 'newFriend',
      payload: { follower, following },
    };
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newFriendRequest));
      }
    });
    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/add/notification', authenticateToken, async(request, response) => {
  try {
    const {notificationBy, notificationToo, notificationType, postId, notificationText, notificationTime} = request.body
    const addingNotificationQuery = `INSERT INTO notifications(notification_id, notification_by, notification_too, post_id, notification_type, notification_text, notification_time)
                                      VALUES ('${uuid.v4()}', '${notificationBy}', '${notificationToo}', '${postId}', '${notificationType}', '${notificationText}', '${notificationTime}');`
    await database.run(addingNotificationQuery)
    response.status(200).json({message: 'Uploaded Success'})    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('user/followers/following/count/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId;
    const gettingFollowesQuery = `select count(followers) as followersCount from followers_table where followings = '${userId}';`
    const followersCount = await database.all(gettingFollowesQuery)
    const gettingFollowingsQuery = `select count(followings) as followingsCount from followers_table where followers = '${userId}';`
    const followingsCount = await database.all(gettingFollowingsQuery)
    const counts = {...followersCount, ...followingsCount}
    response.status(200).json({FollowersCounts: counts})
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }

})

app.get('/get/status/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId;
    const gettingStatusQuery = `SELECT GROUP_CONCAT(video_path) AS all_video_paths, status_id, user_additional_details.* FROM status_of_users INNER JOIN
                                  user_additional_details ON status_of_users.user_id = user_additional_details.user_id;`
    const statusDetails = await database.all(gettingStatusQuery)
    if (statusDetails !== undefined) {
      response.status(200).json({statusDetails: statusDetails})
    }    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/get/notifications/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId
    const gettingNotificationsQuery = `SELECT * FROM notifications INNER JOIN user_additional_details 
                                        ON notifications.notification_by = user_additional_details.user_id WHERE
                                        notifications.notification_too = '${userId}';`
    const notificationDetails = await database.all(gettingNotificationsQuery)
    response.status(200).json({notificationDetails: notificationDetails})
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/user/followers/details/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId
    const gettingFollowersQuery = `SELECT * FROM (followers_table INNER JOIN user_additional_details
                                      ON followers_table.followers = user_additional_details.user_id) as t INNER JOIN 
                                      users ON t.user_id = users.id
                                      WHERE followers_table.followings = '${userId}';`
    const gettingFollowingsQuery = `SELECT followings FROM followers_table where followers = '${userId}'`
    const followings = await database.all(gettingFollowingsQuery)
    const followers = await database.all(gettingFollowersQuery)
    let followersDetails = []
    for (let each of followers) {
      const eachUser = await mediaFilePhotos(each)
      followersDetails.push(eachUser)
    }
    response.status(200).json({followers: followersDetails, followings: followings})    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/user/following/details/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId;
    const gettingFollowingsQuery = `SELECT * FROM (followers_table INNER JOIN user_additional_details
                                      ON followers_table.followings = user_additional_details.user_id) as t INNER JOIN 
                                      users ON t.user_id = users.id
                                      WHERE followers_table.followers = '${userId}';`
    const following = await database.all(gettingFollowingsQuery)
    let followingUsers = []
    for (let each of following) {
      const eachUser = await mediaFilePhotos(each)
      followingUsers.push(eachUser)
    }
    response.status(200).json({following: followingUsers})   
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/requests/user/:userId', authenticateToken, async(request, response) => {
  try {
    const userId = request.params.userId
    const gettingRequestOfUserQuery = `SELECT * FROM friend_request_table 
                                                INNER JOIN user_additional_details
                                                ON friend_request_table.request_sent_by = user_additional_details.user_id
                                                WHERE friend_request_table.request_sent_to = '${userId}';`
    const gettingRequests = await database.all(gettingRequestOfUserQuery)
    let requestedUsers = []
    for (let each of gettingRequests) {
      const eachUser = await mediaFilePhotos(each)
      requestedUsers.push(eachUser)
    }
    response.status(200).json({requests: requestedUsers})
    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM users WHERE email_id = '${username}';`
  const databaseUser = await database.get(selectUserQuery)
  if (databaseUser === undefined) {
    response.status(400)
    response.send({error: "Invalid User"})
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password,
    )
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      const id = databaseUser.id
      response.send({jwtToken, id})
    } else {
      response.status(400)
      response.send({error: 'Invalid password'})
    }
  }
})

app.delete('/delete/like/:postId/:userId', authenticateToken, async(request, response) => {
  try {
    const postId = request.params.postId
    const userId = request.params.userId
    const deleteLikeQuery = `DELETE FROM likes WHERE post_id = '${postId}' AND user_id = '${userId}';`
    await database.run(deleteLikeQuery)
    response.status(200).json({message: 'Unliked Post'})    
  } catch (error) {
    response.status(400)
    response.send({error: 'Invalid password'})
  }
})

const storageStatus = multer.diskStorage({
  destination: 'uploads/status',
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const uploadStatus = multer({ storage: storageStatus });


app.post('/status/upload/', authenticateToken, uploadStatus.single('statusFile'), async(req, res) => {
  try {
    const { userId, caption, startTime, endTime, timeOfStatus } = req.body;
    const statusPath = req.file ? req.file.filename : null;
  
    await database.run(`INSERT INTO status_of_users (status_id, user_id, video_path, caption, start_time, end_time, time_date) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`, [uuid.v4(), userId, statusPath, caption, startTime, endTime, timeOfStatus], (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload status' });
      } else {
        res.status(200).json({ message: 'Status uploaded successfully' });
      }
    });    
  } catch (error) {
    response.status(400)
    response.send({error: 'Invalid password'})
  }
});

cron.schedule('*/1 * * * *', async () => {
  try {
    const currentTimeUTC = new Date();
    const twentyFourHoursAgo = new Date(currentTimeUTC);
    twentyFourHoursAgo.setHours(currentTimeUTC.getHours() - 24);
    const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();


    const rows = await database.all(`SELECT status_id, video_path FROM status_of_users WHERE time_date < '${twentyFourHoursAgoISO}'`);
    if (rows.length === 0) {
      console.log('No expired status records found.');
      return;
    }

    console.log(`Found ${rows.length} expired status records.`);
    
    for (const row of rows) {
      // Delete status record from database
      await database.run(`DELETE FROM status_of_users WHERE status_id = ?`, [row.status_id]);

      // Delete associated file from server
      if (row.video_path) {
        const filePath = `./uploads/status/${row.video_path}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file '${filePath}':`, err);
          } else {
            console.log(`Deleted file: ${filePath}`);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error deleting expired status records:', error);
  }
});

app.post('/ai/bot/', async (req, res) => {
  try {
    const { message } = req.body;
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      temperature: 0.7
    };
    
    axios.post('https://api.openai.com/v1/chat/completions', requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      }
    })
    .then(response => {
      console.log('Response:', response.data.choices[0].message);
      res.status(200).json({response: response.data.choices[0].message})
    })
    .catch(error => {
      console.error('Error:', error.response);
    });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'An error occurred while generating text' });
  }
});
/*app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state;`
  const statesArray = await database.all(getStatesQuery)
  response.send(
    statesArray.map(eachState =>
      convertStateDbObjectToResponseObject(eachState),
    ),
  )
})

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT 
      *
    FROM 
      state 
    WHERE 
      state_id = ${stateId};`
  const state = await database.get(getStateQuery)
  response.send(convertStateDbObjectToResponseObject(state))
})

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictsQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};`
    const district = await database.get(getDistrictsQuery)
    response.send(convertDistrictDbObjectToResponseObject(district))
  },
)

app.post('/districts/', authenticateToken, async (request, response) => {
  const {stateId, districtName, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `
  INSERT INTO
    district (state_id, district_name, cases, cured, active, deaths)
  VALUES
    (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`
  await database.run(postDistrictQuery)
  response.send('District Successfully Added')
})

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId} 
  `
    await database.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrictQuery = `
  UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active}, 
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
  `

    await database.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`
    const stats = await database.get(getStateStatsQuery)
    response.send({
      totalCases: stats['SUM(cases)'],
      totalCured: stats['SUM(cured)'],
      totalActive: stats['SUM(active)'],
      totalDeaths: stats['SUM(deaths)'],
    })
  },
)*/

module.exports = app
