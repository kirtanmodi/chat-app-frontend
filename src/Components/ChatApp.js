import EmojiPicker from 'emoji-picker-react';
import React, { useEffect, useState } from 'react';
import Kuzzle from '../services/Kuzzle';
import "../tesla.css";
import ReactGiphySearchbox from 'react-giphy-searchbox'



function ChatApp() {

    const apiKey = process.env.REACT_APP_GIPHY_API_KEY;

    const [userName, setUserName] = useState('')
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [connected, setConnected] = useState(false)

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showGiphy, setShowGiphy] = useState(false)


    useEffect(() => {
        if (Notification && Notification.permission !== 'granted')
            Notification.requestPermission();
    }, []);


    useEffect(() => {

        if (messages.length > 0 && window.document.visibilityState === 'hidden') {
            let lastMessage = messages[messages.length - 1]
            new Notification(lastMessage._source.userName + ': ' + lastMessage._source.text);
        }

    }, [messages]);


    // Kuzzle functions

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

    const sendMessage = async (e, url = null) => {


        if (url) {
            return await Kuzzle.document.create(
                'chat',
                'messages',
                {
                    text: url,
                    userName: userName,
                    timestamp: Date.now(),
                },
            );
        }

        if (newMessage === "") {
            return
        }

        console.log('message sent')
        e.preventDefault()

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
    }



    // giphy functions

    function isValidHttpUrl(string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }



    // components

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
        return <>
            {messages.map((message, index) => {
                return <li key={index} className="message-item">
                    <div className="message-info">
                        <span className="message-username">{message._source.userName}: </span>
                    </div>

                    <div>
                        {isValidHttpUrl(message._source.text) ?
                            <img
                                className="message-image"
                                src={message._source.text}
                                alt="message"
                            />
                            :
                            <div className="message-text">{message._source.text}</div>
                        }
                    </div>

                </li>
            }
            )}
        </>

    }


    const getChat = () => {
        return <>
            <div
                className="messages-container"
            >
                <form onSubmit={sendMessage}>
                    <div className="messages-header">
                        <h1>Welcome to the Chat Room</h1>
                    </div>


                    <div className="messages-list-container"
                        style={{
                            overflow: "auto",
                            maxHeight: window.innerHeight - 300,
                        }}
                    >
                        <ul className="message-list">
                            {getMessages()}
                        </ul>
                    </div>
                    <div className="message-form-container">
                        <div className="message-form">
                            <input
                                autoFocus
                                type="text" value={newMessage} onChange={handleChange} placeholder="Type your message here" />

                            {/* emoji button */}
                            <button
                                type='button'
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <span role="img" aria-label="emoji">😀</span>
                            </button>

                            {/* giphy button */}
                            <button
                                type='button'
                                onClick={() => setShowGiphy(!showGiphy)}
                            >
                                <span role="img" aria-label="giphy">🐱</span>
                            </button>


                            <button type="submit">Send</button>
                        </div>
                    </div>

                    <div className="message-form-container">
                        <div className="message-form">
                            <button onClick={deleteAllMessages} type="submit">delete messages</button>
                        </div>
                    </div>

                </form>

                {
                    showGiphy &&
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '50px',
                            right: '50px',
                        }}
                    >

                        <ReactGiphySearchbox
                            apiKey={apiKey} // Required: get your on https://developers.giphy.com
                            onSelect={item => {
                                sendMessage(null, item?.images.downsized.url)
                            }}
                        />


                    </div>
                }


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
