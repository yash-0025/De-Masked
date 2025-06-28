const express = require("express");
const http = require('http');
const {Server} = require("socket.io");
const dotenv = require('dotenv')

dotenv.config();
const cors = require('cors');


const app = express();
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const userSockets = {};

const userFriendsMap = {};

io.on('connection', (socket) => {
    console.log(`User connected :: ${socket.id}`);

    socket.on('registerUser', (walletAddress) => {
        userSockets[walletAddress.toLowerCase()] = socket.id;
        console.log(`Registered User ${walletAddress} with socket ID ${socket.id}`);
    });

    socket.on('updateFriendsList', (data) => {
        const userAddressLower = data.userAddress.toLowerCase();

        userFriendsMap[userAddressLower] = data.friends.map(addr => addr.toLowerCase());
        console.log(`Updated Friends list for ${userAddressLower}: ${userFriendsMap[userAddressLower].length} friends`);
    })


    socket.on('sendMessage', (msg) => {
        console.log('Messsage Receiver ::', msg);

        const senderAddressLower = msg.sender.toLowerCase();
        const receiverAddressLower = msg.receiver.toLowerCase();

        const senderFriends = userFriendsMap[senderAddressLower];
        const receiverFriends = userFriendsMap[receiverAddressLower];


        if(!senderFriends || !receiverFriends) {
            console.warn(`Users not found in friends map. Blocking message :: Sender=${senderAddressLower} , Receiver=${receiverAddressLower}`)
            return;
        }

        const isFriends = senderFriends.includes(receiverAddressLower) && receiverFriends.includes(senderAddressLower);

        if(!isFriends) {
            console.warn(`Users are not friends!!`)
            return;
        }

        if(userSockets[senderAddressLower]){
            io.to(userSockets[senderAddressLower]).emit('privateMessage', msg);
        } else {
            console.warn(`Sender socket not found !!`)
        }

        if(userSockets[receiverAddressLower]){
            io.to(userSockets[receiverAddressLower]).emit('privateMessage', msg);
        } else {
            console.warn(`Receiver socket not found!!`);
        }
    })

    
    socket.on('disconnect', () => {
        console.log(`User disconnected ::  ${socket.id}`);
        for(const address in userSockets) {
            delete userSockets[address];
            console.log(`Unregistered socket for user ${address}`)
            break
        }
    })
})




const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server is up and running on port :: ${PORT}`)
})