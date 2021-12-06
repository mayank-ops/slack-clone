import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import Pusher from "pusher"
import mongoData from "./mongoData.js"

// app config
const app = express();
const port = process.env.PORT || 8000;
const pusher = new Pusher({
    appId: "1312053",
    key: "83a9269d53efd71b9741",
    secret: "3578d7e4b08f034898d2",
    cluster: "ap2",
    useTLS: true
});

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public/build"));

// db config
const db_link = "mongodb+srv://admin:YH1zCeUOQzslTFHk@cluster0.sf4do.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose.connect(db_link)
    .then(() => { console.log("db connected") })
    .catch((err) => console.log(err.message))

const db = mongoose.connection;
db.once('open', () =>
{
    console.log("db connection made");
    const changeStream = db.collection("conversations").watch();
    changeStream.on('change', (change) =>
    {
        if (change.operationType === 'insert') {
            pusher.trigger('channels', 'newChannel', {
                "change": change
            })
        }
        else if (change.operationType === 'update') {
            pusher.trigger('conversation', 'newMessage', {
                'change': change.updateDescription.updatedFields
            })
        }
        else {
            console.log('error handling pusher');
        }
    })
})

// api routes
app.post("/new/channel", async (req, res) =>
{
    try {
        const dbData = req.body;
        const channel = await mongoData.create(dbData);
        if (channel) {
            res.status(201).json(dbData);
        }
        else {
            res.status(500).json({ message: "unable to create new channel..!!" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
})

app.post("/new/message", async (req, res) =>
{
    const id = req.query.id;
    const newMsg = req.body;
    const result = await mongoData.findOneAndUpdate({ _id: id }, { $push: { conversation: newMsg } });
    if (result) {
        res.status(201).json(result);
    }
    else {
        res.status(500).json({ message: "cannot post msg" });
    }
})

app.get("/get/channelList", async (req, res) =>
{
    try {
        const data = await mongoData.find();
        if (data) {
            const channels = [];
            data.map((channel) =>
            {
                const channelInfo = {
                    id: channel._id,
                    name: channel.channelName
                }
                channels.push(channelInfo);
            })
            res.status(200).json(channels);
        }
        else {
            res.status(500).json({ message: "no channels found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
})

app.get("/get/conversation", async (req, res) =>
{
    try {
        const id = req.query.id;
        const data = await mongoData.findById(id);
        if (data) {
            res.status(200).json(data);
        }
        else {
            res.status(500).json({ message: "user's chat not found" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
})

// listen
app.listen(port, () =>
{
    console.log(`server listening localhost:${port}`);
})