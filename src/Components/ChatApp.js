import EmojiPicker from 'emoji-picker-react';
import React, { useEffect, useState } from 'react';
import Kuzzle from '../services/Kuzzle';
import "../tesla.css";



function ChatApp() {

    const [userName, setUserName] = useState('')
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [connected, setConnected] = useState(false)

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    const [timer, setTimer] = useState(120)

    useEffect(() => {

        let interval = null;

        const startTimer = async () => {

            interval = setInterval(() => {
                setTimer(timer => timer - 1)
            }
                , 1000);

        }
        startTimer()
        if (timer === 0) {
            clearInterval(interval)
            setTimer(60)
            startTimer()
            deleteAllMessages()
        }

        return () => clearInterval(interval);
    }, [timer]);



    // useEffect(() => {
    //     if (Notification && Notification.permission !== 'granted')
    //         Notification.requestPermission();
    // }, []);


    // useEffect(() => {
    //     if (Notification && Notification.permission === 'granted') {
    //         document.addEventListener('visibilitychange', function () {
    //             if (document.visibilityState === 'hidden') {
    //                 if (messages.length > 0) {
    //                     let lastMessage = messages[messages.length - 1]
    //                     new Notification(lastMessage._source.userName + ': ' + lastMessage._source.text);
    //                 }
    //             }
    //         });
    //     }

    // }, [messages]);


    const connect = async (e) => {
        e.preventDefault()
        if (userName === "") {
            return
        }

        await Kuzzle.connect();

        if (!await Kuzzle.index.exists('chat')) {
            await Kuzzle.index.create('chat');
            await Kuzzle.collection.create('chat', 'messages');
        }

        fetchMessages().then(() => {
            subscribeToMessages();
        });

        setConnected(true)
    }

    const fetchMessages = async () => {
        const results = await Kuzzle.document.search(
            'chat',
            'messages',
            {
                sort: {
                    '_kuzzle_info.createdAt': 'desc'
                },
            },
        );


        setMessages(results.hits);
    }

    const subscribeToMessages = async () => {
        return Kuzzle.realtime.subscribe(
            'chat',
            'messages',
            {},
            notification => {
                setMessages(messages => {

                    let messagesArr = [...messages].sort((a, b) => {
                        return a._source.timestamp - b._source.timestamp
                    })

                    return [...messagesArr, notification.result]
                });
            }
        );
    }

    const sendMessage = async (e) => {

        console.log('message sent')
        e.preventDefault()

        if (newMessage === "") {
            return
        }

        await Kuzzle.document.create(
            'chat',
            'messages',
            {
                text: newMessage,
                userName: userName,
                timestamp: Date.now(),
            },
        );

        setNewMessage('');

        return
    }


    const handleChange = event => {
        const { value } = event.target;
        setNewMessage(value);
    };

    // console.log(messages);

    const deleteAllMessages = async () => {


        await Kuzzle.document.deleteByQuery(
            'chat',
            'messages',
            {
                query: {
                    match_all: {}
                }
            }
        );

        setMessages([])
        // setConnected(false)
        // window.location.reload()
    }

    // deleteAllMessages()


    const getUserName = () => {
        return <>
            <div className="chat-app">
                <div className="chat-header">
                    <h1>Private Chat</h1>
                </div>
                <div className="chat-body">
                    <div className="chat-form">
                        <form onSubmit={connect}>
                            <h2>Enter Your Name:</h2>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Naam Likh Idhar"
                            />
                            <button type="submit">Start Chatting</button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    }


    const getMessages = () => {

        //reverse the message list 
        return <>
            {messages.map((message, index) => (
                <li key={index} class="message-item">
                    <div class="message-info">
                        <span class="message-username">{message._source.userName}: </span>
                    </div>
                    <div class="message-text">{message._source.text}</div>
                </li>
            ))}
        </>

    }


    const getChat = () => {
        return <>
            <div
                class="messages-container"

            >
                <form onSubmit={sendMessage}>
                    <div class="messages-header">
                        <h1>Welcome to the Chat Room</h1>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '50px',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: timer > 10 ? 'green' : 'red',
                        }}

                    >
                        <p>all messages will delete in {timer}s</p>
                    </div>


                    <div class="messages-list-container"
                        style={{
                            overflow: "auto",
                            maxHeight: window.innerHeight - 300,
                        }}
                    >
                        <ul class="message-list">
                            {getMessages()}
                        </ul>
                    </div>
                    <div class="message-form-container">
                        <div class="message-form">
                            <input
                                autoFocus
                                type="text" value={newMessage} onChange={handleChange} placeholder="Type your message here" />

                            <button
                                type='button'
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <span role="img" aria-label="emoji">😀</span>
                            </button>


                            <button type="submit">Send</button>
                        </div>
                    </div>
                    {/* 
                    <div class="message-form-container">
                        <div class="message-form">
                            <button onClick={deleteAllMessages} type="submit">delete messages</button>
                        </div>
                    </div> */}

                </form>
                {showEmojiPicker &&
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '50px',
                            right: '50px',
                        }}
                    >
                        <EmojiPicker
                            onEmojiClick={(event, emojiObject) => {
                                setNewMessage(newMessage + event?.emoji)
                            }
                            }
                        />
                    </div >
                }
            </div>

        </>
    }

    // console.log(messages);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                height: '100vh',
            }}
        >

            {!connected ? getUserName() : getChat()}

        </div>
    );
}

export default ChatApp;
